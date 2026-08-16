// ============================================================
// MonitorFlare deployer — 一键部署服务
// 用户点击 /deploy/start → Cloudflare OAuth 授权 → 自动创建
// D1 数据库、部署 Worker、部署 Pages 前端,全部在用户账号内。
//
// 前置准备(一次性):
// 1. 在 Cloudflare Dashboard → Manage Account → OAuth clients 创建应用
//    - Grant type: Authorization Code
//    - Redirect URL: {DEPLOY_BASE}/deploy/callback
//    - Scopes: 按注册页实际显示的权限名配置(对应 API token 权限,
//      至少包含 Workers Scripts / D1 / Cloudflare Pages 的编辑权限)
// 2. 用 build-artifacts.sh 打包产物到 R2
// ============================================================
import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  OAUTH_SCOPE: string;
  REDIRECT_URI: string;       // 例如 https://monitorflare.csr.plus/api/deploy/callback
  STATE_SECRET: string;       // state 签名密钥
  KV: KVNamespace;            // state + 部署记录
  ARTIFACTS: R2Bucket;        // 构建产物(worker bundle + frontend dist)
  WORKER_BUNDLE_KEY: string;  // R2 中 worker bundle 的 key,默认 monitorflare/worker.mjs
  FRONTEND_PREFIX: string;    // R2 中前端文件前缀,默认 monitorflare/frontend/
  SCRIPT_NAME: string;        // 部署到用户账号的 Worker/Pages 名,默认 monitorflare
};

const AUTH_URL = 'https://accounts.cloudflare.com/oauth2/authorize';
const TOKEN_URL = 'https://accounts.cloudflare.com/oauth2/token';
const API = 'https://api.cloudflare.com/client/v4';

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

const enc = new TextEncoder();

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function randomId(len = 16): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(data: ArrayBuffer | string): Promise<string> {
  const buf = typeof data === 'string' ? enc.encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- 部署状态记录 ----------
async function saveDeployment(env: Env, id: string, data: Record<string, unknown>): Promise<void> {
  await env.KV.put(`deployment:${id}`, JSON.stringify(data), { expirationTtl: 7 * 86400 });
}

async function getDeployment(env: Env, id: string): Promise<Record<string, unknown> | null> {
  const raw = await env.KV.get(`deployment:${id}`);
  return raw ? JSON.parse(raw) : null;
}

// ============================================================
// 1. 发起授权
// ============================================================
app.get('/deploy/start', async (c) => {
  const state = randomId(24);
  const sig = await hmacHex(c.env.STATE_SECRET, state);
  const fullState = `${state}.${sig}`;
  // 记录发起时间,5 分钟有效
  await c.env.KV.put(`state:${state}`, String(Date.now()), { expirationTtl: 300 });

  const params = new URLSearchParams({
    client_id: c.env.OAUTH_CLIENT_ID,
    redirect_uri: c.env.REDIRECT_URI,
    response_type: 'code',
    scope: c.env.OAUTH_SCOPE,
    state: fullState,
  });
  return c.redirect(`${AUTH_URL}?${params.toString()}`);
});

// ============================================================
// 2. 授权回调 → 换 token → 自动部署
// ============================================================
app.get('/deploy/callback', async (c) => {
  const code = c.req.query('code') || '';
  const state = c.req.query('state') || '';

  // 校验 state
  const dotIdx = state.lastIndexOf('.');
  if (dotIdx <= 0) return c.text('Invalid state', 400);
  const stateId = state.slice(0, dotIdx);
  const sig = state.slice(dotIdx + 1);
  const expected = await hmacHex(c.env.STATE_SECRET, stateId);
  const stateOk = sig === expected && !!(await c.env.KV.get(`state:${stateId}`));
  if (!stateOk) return c.text('Invalid or expired state', 400);
  await c.env.KV.delete(`state:${stateId}`);

  if (!code) return c.text('Missing authorization code', 400);

  const deploymentId = randomId(12);
  await saveDeployment(c.env, deploymentId, { status: 'exchanging', started_at: new Date().toISOString() });

  try {
    // 换 token
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: c.env.OAUTH_CLIENT_ID,
        client_secret: c.env.OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: c.env.REDIRECT_URI,
      }).toString(),
    });
    const tokenData = await tokenRes.json<{ access_token?: string; refresh_token?: string; error?: string }>();
    if (!tokenData.access_token) {
      await saveDeployment(c.env, deploymentId, { status: 'failed', error: `Token exchange failed: ${tokenData.error || tokenRes.status}` });
      return c.text(`Authorization failed: ${tokenData.error || tokenRes.status}`, 400);
    }
    const accessToken = tokenData.access_token;

    await saveDeployment(c.env, deploymentId, { status: 'provisioning', started_at: new Date().toISOString() });

    // 3. 获取账号
    const accountsRes = await fetch(`${API}/accounts`, { headers: { Authorization: `Bearer ${accessToken}` } });
    const accountsData = await accountsRes.json<{ result?: { id: string; name: string }[]; errors?: { message: string }[] }>();
    const account = accountsData.result?.[0];
    if (!account) {
      await saveDeployment(c.env, deploymentId, { status: 'failed', error: `No account: ${accountsData.errors?.[0]?.message || accountsRes.status}` });
      return c.text('No Cloudflare account found. Please make sure you have an account and granted access.', 400);
    }
    const accountId = account.id;

    // 4. 创建 D1 数据库
    const dbName = `${c.env.SCRIPT_NAME}-db`;
    const d1Res = await fetch(`${API}/accounts/${accountId}/d1/database`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: dbName }),
    });
    let d1Id = '';
    const d1Data = await d1Res.json<{ result?: { uuid?: string } }>();
    if (d1Res.ok && d1Data.result?.uuid) {
      d1Id = d1Data.result.uuid;
    } else {
      // 可能已存在,尝试列出查找
      const listRes = await fetch(`${API}/accounts/${accountId}/d1/database?name=${dbName}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const listData = await listRes.json<{ result?: { uuid: string; name: string }[] }>();
      const existing = listData.result?.find(d => d.name === dbName);
      if (existing) d1Id = existing.uuid;
    }
    if (!d1Id) {
      await saveDeployment(c.env, deploymentId, { status: 'failed', error: 'Failed to create D1 database' });
      return c.text('Failed to create D1 database', 500);
    }

    // 5. 部署 Worker
    const adminKey = `ut_${randomId(20)}`;
    const pagesUrl = `https://${c.env.SCRIPT_NAME}.pages.dev`;
    const workerName = `${c.env.SCRIPT_NAME}-worker`;
    const workerOk = await deployWorker(c.env, accessToken, accountId, workerName, d1Id, adminKey, pagesUrl);
    if (!workerOk) {
      await saveDeployment(c.env, deploymentId, { status: 'failed', error: 'Worker deploy failed' });
      return c.text('Worker deployment failed', 500);
    }

    // 6. 部署 Pages(前端)
    const pagesOk = await deployPages(c.env, accessToken, accountId, pagesUrl);
    if (!pagesOk) {
      await saveDeployment(c.env, deploymentId, { status: 'failed', error: 'Pages deploy failed' });
      return c.text('Frontend deployment failed', 500);
    }

    await saveDeployment(c.env, deploymentId, {
      status: 'done', started_at: new Date().toISOString(),
      account_id: accountId, account_name: account.name,
      worker_url: `https://${workerName}.${account.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.workers.dev`,
      pages_url: pagesUrl,
      admin_key: adminKey,
    });

    // 成功页
    return c.html(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deployed — MonitorFlare</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{max-width:520px;width:100%;margin:24px;padding:40px;border-radius:20px;background:#1e293b;border:1px solid #334155;text-align:center}
h1{color:#34d399;margin:0 0 12px}code{background:#0f172a;padding:2px 8px;border-radius:6px;color:#a5f3fc;font-size:14px}
a.btn{display:inline-block;margin-top:16px;padding:12px 28px;border-radius:12px;background:#10b981;color:#fff;text-decoration:none;font-weight:700}
.hint{font-size:13px;color:#94a3b8;margin-top:16px}.key{background:#0f172a;padding:14px;border-radius:10px;font-family:monospace;word-break:break-all;color:#fbbf24}</style></head>
<body><div class="card">
<h1>🎉 Deployed!</h1>
<p>MonitorFlare is live on your Cloudflare account.</p>
<p>Status page: <br><a class="btn" href="${pagesUrl}" target="_blank">${pagesUrl}</a></p>
<p>Admin console: <code>${pagesUrl}/admin</code></p>
<p>Admin key (save it now):</p>
<p class="key">${adminKey}</p>
<p class="hint">First visit auto-creates the database schema. Keep this page safe.</p>
</div></body></html>`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    await saveDeployment(c.env, deploymentId, { status: 'failed', error: msg });
    return c.text(`Deployment failed: ${msg}`, 500);
  }
});

// ============================================================
// 3. 查询部署状态
// ============================================================
app.get('/deploy/status/:id', async (c) => {
  const dep = await getDeployment(c.env, c.req.param('id'));
  if (!dep) return c.json({ error: 'Not found' }, 404);
  return c.json(dep);
});

// ============================================================
// 部署执行函数
// ============================================================

// 上传 Worker(ES module,含 D1 binding + vars + cron)
async function deployWorker(
  env: Env, token: string, accountId: string, scriptName: string,
  d1Id: string, adminKey: string, pagesUrl: string,
): Promise<boolean> {
  try {
    const bundle = await env.ARTIFACTS.get(env.WORKER_BUNDLE_KEY || 'monitorflare/worker.mjs');
    if (!bundle) { console.error('Worker bundle not found in R2'); return false; }
    const bundleText = await bundle.text();
    const moduleName = 'bundle.mjs';

    const metadata = {
      main_module: moduleName,
      compatibility_date: '2024-02-08',
      bindings: [
        { type: 'd1', name: 'DB', id: d1Id },
        { type: 'plain_text', name: 'ADMIN_API_KEY', text: adminKey },
        { type: 'plain_text', name: 'ALLOWED_ORIGIN', text: pagesUrl },
        { type: 'plain_text', name: 'SESSION_TTL_HOURS', text: '12' },
        { type: 'plain_text', name: 'BASE_URL', text: pagesUrl },
      ],
      triggers: { crons: ['* * * * *'] },
    };

    const boundary = `----monitorflare${randomId(8)}`;
    const encoder = new TextEncoder();
    const parts: Uint8Array[] = [];
    const push = (s: string) => parts.push(encoder.encode(s));

    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="metadata"\r\n`);
    push(`Content-Type: application/json\r\n\r\n`);
    push(JSON.stringify(metadata));
    push(`\r\n--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="${moduleName}"; filename="${moduleName}"\r\n`);
    push(`Content-Type: application/javascript+module\r\n\r\n`);
    parts.push(encoder.encode(bundleText));
    push(`\r\n--${boundary}--\r\n`);

    const body = concat(parts);
    const resp = await fetch(`${API}/accounts/${accountId}/workers/scripts/${scriptName}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    if (!resp.ok) {
      console.error('Worker upload failed:', resp.status, await resp.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('deployWorker error:', e);
    return false;
  }
}

// 部署 Pages(创建项目 + 上传前端产物 + 设置环境变量)
async function deployPages(env: Env, token: string, accountId: string, pagesUrl: string): Promise<boolean> {
  try {
    const projectName = env.SCRIPT_NAME;

    // 6a. 创建 Pages 项目(已存在则忽略)
    const createRes = await fetch(`${API}/accounts/${accountId}/pages/projects`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, production_branch: 'main' }),
    });
    if (!createRes.ok && createRes.status !== 409) {
      console.error('Pages project create failed:', createRes.status, await createRes.text());
      // 409 = 已存在,继续
      if (createRes.status !== 409) return false;
    }

    // 6b. 从 R2 列出前端产物并构造 manifest
    const prefix = env.FRONTEND_PREFIX || 'monitorflare/frontend/';
    const listed = await env.ARTIFACTS.list({ prefix });
    if (listed.objects.length === 0) { console.error('No frontend artifacts in R2'); return false; }

    const manifest: Record<string, string> = {};
    const formParts: Uint8Array[] = [];
    const encoder = new TextEncoder();
    const boundary = `----monitorflare${randomId(8)}`;
    const push = (s: string) => formParts.push(encoder.encode(s));

    for (const obj of listed.objects) {
      const key = obj.key;
      const filePath = '/' + key.slice(prefix.length);
      const r2obj = await env.ARTIFACTS.get(key);
      if (!r2obj) continue;
      const content = await r2obj.arrayBuffer();
      manifest[filePath] = await sha256Hex(content);
    }

    push(`--${boundary}\r\n`);
    push(`Content-Disposition: form-data; name="manifest"\r\n`);
    push(`Content-Type: application/json\r\n\r\n`);
    push(JSON.stringify(manifest));
    push(`\r\n`);

    for (const obj of listed.objects) {
      const key = obj.key;
      const filePath = '/' + key.slice(prefix.length);
      const r2obj = await env.ARTIFACTS.get(key);
      if (!r2obj) continue;
      const content = await r2obj.arrayBuffer();
      push(`--${boundary}\r\n`);
      push(`Content-Disposition: form-data; name="${filePath}"; filename="${filePath}"\r\n`);
      push(`Content-Type: application/octet-stream\r\n\r\n`);
      formParts.push(new Uint8Array(content));
      push(`\r\n`);
    }
    push(`--${boundary}--\r\n`);

    const deployRes = await fetch(`${API}/accounts/${accountId}/pages/projects/${projectName}/deployments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: concat(formParts),
    });
    if (!deployRes.ok) {
      console.error('Pages deploy failed:', deployRes.status, await deployRes.text());
      return false;
    }

    // 6c. 设置 Pages 环境变量(WORKER_URL / ALLOWED_ORIGIN)
    const patchRes = await fetch(`${API}/accounts/${accountId}/pages/projects/${projectName}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_configs: {
          production: {
            env_vars: {
              WORKER_URL: { value: pagesUrl.replace(/^https:\/\//, 'https://') },
              ALLOWED_ORIGIN: { value: pagesUrl },
            },
          },
        },
      }),
    });
    if (!patchRes.ok) {
      console.error('Pages env patch failed:', patchRes.status, await patchRes.text());
    }

    return true;
  } catch (e) {
    console.error('deployPages error:', e);
    return false;
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

export default {
  fetch: app.fetch,
};
