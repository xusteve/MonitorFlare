// ============================================================
// MonitorFlare — Cloudflare Worker 主入口
// 基于 Uptime-Monitor(MIT)分发的增强版
// ============================================================
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, CheckResult, Incident, Monitor, NotificationChannel, Subscription } from './types';
import { performCheck, updateDomainCertInfo } from './checks';
import { sendToChannel, CHANNEL_TYPES, EMAIL_PROVIDERS } from './channels';
import { buildAlertMessage, isSupportedLang, type Lang } from './i18n';
import { ensureInitialized, getSetting, getSettingsMap } from './init';
import {
  createSessionToken, createOAuthState, verifyOAuthState, verifySessionToken,
  verifyAdminCredential, verifyMagicLinkToken, createMagicLinkToken,
  verifyCfAccessToken, verifyApiKey, hashApiKey,
  createStatusToken, verifyStatusToken, hashStatusPassword,
} from './auth';
import {
  getAllowedOrigins, isLocalOrigin, getAuthSecret, isValidEmail,
  maskChannelConfig, formatTimeInTz, randomToken, base64UrlEncode, hmacSha256, safeEqual,
} from './utils';

const MONITOR_COLUMNS = `
  id, name, url, type, config, method, request_headers, request_body, interval, status,
  retry_count, last_check, keyword, user_agent, tags, domain_expiry, cert_expiry,
  check_info_status, paused, check_ssl, check_domain, alert_silence_uptime,
  alert_silence_ssl, alert_silence_domain, alert_error_rate, alert_after_failures,
  last_alert_uptime, last_alert_ssl, last_alert_domain, sort_order, created_at
`;

// ============================================================
// Hono 应用
// ============================================================
const app = new Hono<{ Bindings: Bindings }>();

app.use('/*', cors({
  origin: (origin, c) => {
    const allowed = getAllowedOrigins(c.env);
    if (allowed.length === 0) return origin && isLocalOrigin(origin) ? origin : '';
    if (!origin) return allowed[0];
    return allowed.includes(origin) ? origin : '';
  },
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// 鉴权中间件
const PUBLIC_PATHS = [
  '/auth/', '/monitors/public', '/api/status', '/feed.xml', '/api/subscribe', '/api/unsubscribe', '/webhooks/',
];
const PROTECTED_PREFIXES = ['/monitors', '/notification-channels', '/incidents', '/settings', '/test-alert', '/health', '/api-keys', '/backup'];

// 私密模式下需锁定的公开接口(前缀匹配)
const STATUS_LOCK_PATHS = [
  '/monitors/public', '/incidents', '/settings', '/feed.xml', '/api/status', '/status', '/api/subscribe', '/api/unsubscribe',
];
// 私密模式下始终放行(登录/管理认证)
const STATUS_LOCK_EXEMPT = ['/status/login', '/api/status/login', '/auth/', '/webhooks/'];

app.use('/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return await next();
  const path = c.req.path;

  // 初始化自检(幂等,首次访问自动建表)
  await ensureInitialized(c.env);

  // 私密模式:锁定状态页公开接口
  const visibility = await getSetting(c.env, 'status_page_visibility');
  if (visibility === 'private'
    && !STATUS_LOCK_EXEMPT.some(p => path.startsWith(p))
    && STATUS_LOCK_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
    const authHeader = c.req.header('Authorization');
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : '';
    if (token) {
      const pwHash = await getSetting(c.env, 'status_page_password');
      if (pwHash && (await verifyStatusToken(c.env, token, pwHash) || await verifySessionToken(c.env, token))) {
        return await next();
      }
    }
    return c.json({ error: 'status_page_locked' }, 401);
  }

  // 公开路由豁免
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) return await next();
  if (path === '/incidents' && c.req.method === 'GET') return await next();
  if (path === '/settings' && c.req.method === 'GET') return await next();
  if (path === '/monitors/public/details') return await next();

  const needsAuth = PROTECTED_PREFIXES.some(r => path.startsWith(r));
  if (!needsAuth) return await next();

  // 1) Cloudflare Access JWT
  const cfJwt = c.req.header('Cf-Access-Jwt-Assertion');
  if (cfJwt && await verifyCfAccessToken(c.env, cfJwt)) return await next();

  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401);
  const token = authHeader.replace(/^Bearer\s+/i, '');

  // 2) 会话 token
  if (await verifySessionToken(c.env, token)) return await next();
  // 3) 管理员凭据(兼容上游)
  if (await verifyAdminCredential(c.env, token)) return await next();
  // 4) 第三方 API 密钥
  if (await verifyApiKey(c.env, token)) return await next();

  if (!getAuthSecret(c.env)) return c.json({ error: 'Admin auth is not configured' }, 503);
  return c.json({ error: 'Unauthorized: Invalid credentials' }, 401);
});

// ============================================================
// 认证路由
// ============================================================
app.post('/auth/login', async (c) => {
  try {
    const body = await c.req.json<{ password?: string }>();
    if (!body.password) return c.json({ error: 'Password is required' }, 400);
    if (!getAuthSecret(c.env)) return c.json({ error: 'Admin auth is not configured' }, 503);
    if (!await verifyAdminCredential(c.env, body.password)) return c.json({ error: 'Invalid password' }, 401);
    return c.json(await createSessionToken(c.env));
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// Magic Link:发起
app.post('/auth/magic-link', async (c) => {
  try {
    const body = await c.req.json<{ email?: string }>();
    const email = (body.email || '').trim();
    if (!isValidEmail(email)) return c.json({ error: 'Valid email is required' }, 400);
    // 始终返回成功(防枚举)
    try {
      const token = await createMagicLinkToken(c.env, email);
      const base = (c.env.BASE_URL || '').replace(/\/$/, '');
      const link = `${base}/#/magic?token=${encodeURIComponent(token)}`;
      const emailCfg = await getEmailConfigForLogin(c.env);
      if (emailCfg) {
        const html = `<p>Click <a href="${link}">here</a> to sign in. This link expires in 10 minutes.</p>`;
        await sendLoginEmail(c.env, emailCfg, email, 'Sign in to MonitorFlare', html);
      } else {
        console.warn('No email channel configured for magic link delivery');
      }
    } catch (e) {
      console.error('Magic link error:', e);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ success: true });
  }
});

// Magic Link:验证
app.get('/auth/magic-link/verify', async (c) => {
  try {
    const token = c.req.query('token') || '';
    const email = await verifyMagicLinkToken(c.env, token);
    if (!email) return c.json({ error: 'Invalid or expired link' }, 401);
    return c.json(await createSessionToken(c.env));
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// OAuth 发起
app.get('/auth/oauth/:provider', async (c) => {
  const provider = c.req.param('provider');
  const state = await createOAuthState(c.env);
  const base = (c.env.BASE_URL || '').replace(/\/$/, '');
  const redirectUri = `${base}/api/auth/oauth/callback/${provider}`;
  try {
    if (provider === 'google' && c.env.GOOGLE_CLIENT_ID) {
      const params = new URLSearchParams({
        client_id: c.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri,
        response_type: 'code', scope: 'openid email profile', state,
      });
      return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }
    if (provider === 'github' && c.env.GITHUB_CLIENT_ID) {
      const params = new URLSearchParams({
        client_id: c.env.GITHUB_CLIENT_ID, redirect_uri: redirectUri, scope: 'read:user user:email', state,
      });
      return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
    }
    return c.json({ error: 'Unsupported provider or not configured' }, 400);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// OAuth 回调
app.get('/api/auth/oauth/callback/:provider', async (c) => {
  const provider = c.req.param('provider');
  const code = c.req.query('code') || '';
  const state = c.req.query('state') || '';
  if (!await verifyOAuthState(c.env, state)) return c.json({ error: 'Invalid state' }, 401);
  if (!code) return c.json({ error: 'Missing code' }, 400);
  const base = (c.env.BASE_URL || '').replace(/\/$/, '');
  const redirectUri = `${base}/api/auth/oauth/callback/${provider}`;
  try {
    let email = '';
    if (provider === 'google') {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: c.env.GOOGLE_CLIENT_ID || '', client_secret: c.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: redirectUri, grant_type: 'authorization_code',
        }).toString(),
      });
      if (!tokenRes.ok) return c.json({ error: 'OAuth token exchange failed' }, 401);
      const tokenData = await tokenRes.json<{ access_token?: string }>();
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const user = await userRes.json<{ email?: string }>();
        email = user.email || '';
      }
    } else if (provider === 'github') {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ code, client_id: c.env.GITHUB_CLIENT_ID, client_secret: c.env.GITHUB_CLIENT_SECRET, redirect_uri: redirectUri }),
      });
      if (!tokenRes.ok) return c.json({ error: 'OAuth token exchange failed' }, 401);
      const tokenData = await tokenRes.json<{ access_token?: string }>();
      const userRes = await fetch('https://api.github.com/user', {
        headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'MonitorFlare' },
      });
      if (userRes.ok) {
        const user = await userRes.json<{ email?: string; login?: string }>();
        email = user.email || `${user.login}@users.noreply.github.com`;
      }
    }
    if (!email) return c.json({ error: 'Could not retrieve email' }, 401);
    // 签发会话,重定向回前端
    const session = await createSessionToken(c.env);
    const frontUrl = (c.env.ALLOWED_ORIGIN || '').split(',')[0] || base;
    return c.redirect(`${frontUrl}/#/admin?token=${encodeURIComponent(session.token)}`);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 监控 CRUD
// ============================================================
app.get('/monitors', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`SELECT ${MONITOR_COLUMNS} FROM monitors ORDER BY sort_order ASC, created_at ASC`).all<Monitor>();
    return c.json(results);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.get('/monitors/public', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, name, url, type, status, last_check, cert_expiry, domain_expiry, paused, tags, check_ssl FROM monitors ORDER BY sort_order ASC, created_at ASC'
    ).all();
    return c.json(results);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// 公开详情:含延迟、可用率、90 天历史
app.get('/monitors/public/details', async (c) => {
  try {
    const { results: monitors } = await c.env.DB.prepare(
      'SELECT id, name, url, type, status, last_check, cert_expiry, domain_expiry, paused, tags, check_ssl FROM monitors ORDER BY sort_order ASC, created_at ASC'
    ).all();
    if (!monitors || monitors.length === 0) return c.json({ monitors: [] });

    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_uptime (
      monitor_id INTEGER NOT NULL, date TEXT NOT NULL,
      total_checks INTEGER DEFAULT 0, successful_checks INTEGER DEFAULT 0,
      avg_latency INTEGER DEFAULT 0, PRIMARY KEY (monitor_id, date)
    )`).run();

    const cnt = await c.env.DB.prepare('SELECT COUNT(*) as c FROM daily_uptime').first<{ c: number }>();
    if (cnt && cnt.c === 0) {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO daily_uptime (monitor_id, date, total_checks, successful_checks, avg_latency)
        SELECT monitor_id, date(created_at), COUNT(*), SUM(CASE WHEN is_fail=0 THEN 1 ELSE 0 END),
               COALESCE(CAST(AVG(CASE WHEN is_fail=0 THEN latency END) AS INTEGER), 0)
        FROM logs
        WHERE created_at >= date('now','-90 days') AND created_at < date('now')
        GROUP BY monitor_id, date(created_at)
      `).run();
    }

    const { results: dailyRows } = await c.env.DB.prepare(
      "SELECT monitor_id, date, total_checks, successful_checks FROM daily_uptime WHERE date >= date('now','-90 days') ORDER BY monitor_id, date"
    ).all();
    const { results: liveRows } = await c.env.DB.prepare(`
      SELECT monitor_id,
        SUM(CASE WHEN created_at >= datetime('now','-24 hours') THEN 1 ELSE 0 END) as t24,
        SUM(CASE WHEN created_at >= datetime('now','-24 hours') AND is_fail=0 THEN 1 ELSE 0 END) as s24,
        SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) as t7,
        SUM(CASE WHEN created_at >= datetime('now','-7 days') AND is_fail=0 THEN 1 ELSE 0 END) as s7,
        COUNT(*) as t30, SUM(CASE WHEN is_fail=0 THEN 1 ELSE 0 END) as s30
      FROM logs WHERE created_at >= datetime('now','-30 days') GROUP BY monitor_id
    `).all();
    const { results: latRows } = await c.env.DB.prepare(
      'SELECT monitor_id, latency FROM logs WHERE is_fail=0 ORDER BY created_at DESC LIMIT 200'
    ).all();

    type DS = { date: string; up: number; total: number };
    const dMap = new Map<number, DS[]>();
    for (const r of dailyRows || []) {
      const id = r.monitor_id as number;
      if (!dMap.has(id)) dMap.set(id, []);
      dMap.get(id)!.push({ date: r.date as string, up: r.successful_checks as number, total: r.total_checks as number });
    }
    const sMap = new Map<number, Record<string, number>>();
    for (const r of liveRows || []) sMap.set(r.monitor_id as number, r as Record<string, number>);
    const lMap = new Map<number, number[]>();
    for (const r of latRows || []) {
      const id = r.monitor_id as number;
      if (!lMap.has(id)) lMap.set(id, []);
      const a = lMap.get(id)!;
      if (a.length < 24) a.push(r.latency as number);
    }
    for (const [, a] of lMap) a.reverse();

    const pct = (t?: number, s?: number) => t && t > 0 ? Number(((s! / t) * 100).toFixed(1)) : null;
    const enriched = monitors.map(m => {
      const id = m.id as number, s = sMap.get(id), lat = lMap.get(id) || [];
      return { ...m, latency: lat.length > 0 ? lat[lat.length - 1] : null,
        uptime_24h: pct(s?.t24, s?.s24), uptime_7d: pct(s?.t7, s?.s7), uptime_30d: pct(s?.t30, s?.s30),
        daily_stats: dMap.get(id) || [], recent_latencies: lat };
    });
    return c.json({ monitors: enriched });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// 单监控公开详情:基础信息 + uptime + 90 天历史 + 日志 + 事件
// 支持 ?range=24h|7d|30d(延迟序列,默认 24h)与 ?limit=(日志条数,默认 50,上限 200)
app.get('/monitors/public/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'Invalid monitor id' }, 400);

    const monitor = await c.env.DB.prepare(
      'SELECT id, name, url, type, status, last_check, cert_expiry, domain_expiry, paused, tags, check_ssl, method, interval, keyword, created_at FROM monitors WHERE id = ?'
    ).bind(id).first();
    if (!monitor) return c.json({ error: 'Monitor not found' }, 404);

    await c.env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_uptime (
      monitor_id INTEGER NOT NULL, date TEXT NOT NULL,
      total_checks INTEGER DEFAULT 0, successful_checks INTEGER DEFAULT 0,
      avg_latency INTEGER DEFAULT 0, PRIMARY KEY (monitor_id, date)
    )`).run();

    const cnt = await c.env.DB.prepare('SELECT COUNT(*) as c FROM daily_uptime').first<{ c: number }>();
    if (cnt && cnt.c === 0) {
      await c.env.DB.prepare(`
        INSERT OR IGNORE INTO daily_uptime (monitor_id, date, total_checks, successful_checks, avg_latency)
        SELECT monitor_id, date(created_at), COUNT(*), SUM(CASE WHEN is_fail=0 THEN 1 ELSE 0 END),
               COALESCE(CAST(AVG(CASE WHEN is_fail=0 THEN latency END) AS INTEGER), 0)
        FROM logs
        WHERE created_at >= date('now','-90 days') AND created_at < date('now')
        GROUP BY monitor_id, date(created_at)
      `).run();
    }

    const { results: dailyRows } = await c.env.DB.prepare(
      'SELECT date, total_checks, successful_checks FROM daily_uptime WHERE monitor_id = ? AND date >= date(\'now\',\'-90 days\') ORDER BY date'
    ).bind(id).all();

    const upt = await c.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN created_at >= datetime('now','-24 hours') THEN 1 ELSE 0 END) as t24,
        SUM(CASE WHEN created_at >= datetime('now','-24 hours') AND is_fail=0 THEN 1 ELSE 0 END) as s24,
        SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) as t7,
        SUM(CASE WHEN created_at >= datetime('now','-7 days') AND is_fail=0 THEN 1 ELSE 0 END) as s7,
        SUM(CASE WHEN created_at >= datetime('now','-30 days') THEN 1 ELSE 0 END) as t30,
        SUM(CASE WHEN created_at >= datetime('now','-30 days') AND is_fail=0 THEN 1 ELSE 0 END) as s30
      FROM logs WHERE monitor_id = ? AND created_at >= datetime('now','-30 days')
    `).bind(id).first();

    const d90 = await c.env.DB.prepare(
      "SELECT SUM(total_checks) as t, SUM(successful_checks) as s FROM daily_uptime WHERE monitor_id = ? AND date >= date('now','-90 days') AND date < date('now')"
    ).bind(id).first();
    const today = await c.env.DB.prepare(
      "SELECT COUNT(*) as t, SUM(CASE WHEN is_fail=0 THEN 1 ELSE 0 END) as s FROM logs WHERE monitor_id = ? AND created_at >= date('now')"
    ).bind(id).first();

    const pct = (t?: number, s?: number) => t && t > 0 ? Number(((s! / t) * 100).toFixed(1)) : null;
    const t90 = ((d90?.t as number) || 0) + ((today?.t as number) || 0);
    const s90 = ((d90?.s as number) || 0) + ((today?.s as number) || 0);

    const range = (c.req.query('range') || '24h');
    const hours = range === '7d' ? 168 : range === '30d' ? 720 : 24;
    const maxPts = range === '7d' ? 1000 : range === '30d' ? 1500 : 288;
    const { results: rawSeries } = await c.env.DB.prepare(
      'SELECT created_at, latency FROM logs WHERE monitor_id = ? AND is_fail = 0 AND created_at >= datetime(\'now\', ?) ORDER BY created_at ASC'
    ).bind(id, `-${hours} hours`).all();
    const step = rawSeries && rawSeries.length > maxPts ? Math.ceil(rawSeries.length / maxPts) : 1;
    const latencySeries: { created_at: string; latency: number }[] = [];
    if (rawSeries) {
      for (let i = 0; i < rawSeries.length; i += step) {
        latencySeries.push({ created_at: rawSeries[i].created_at as string, latency: rawSeries[i].latency as number });
      }
    }

    const limit = Math.min(Math.max(Number(c.req.query('limit') || 50), 1), 200);
    const { results: logs } = await c.env.DB.prepare(
      'SELECT id, created_at, status_code, latency, is_fail, reason FROM logs WHERE monitor_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(id, limit).all();

    const { results: allIncidents } = await c.env.DB.prepare(
      'SELECT * FROM incidents ORDER BY created_at DESC LIMIT 200'
    ).all<Incident>();
    const incidents = (allIncidents || []).filter(inc => {
      if (!inc.affected_monitors) return false;
      return inc.affected_monitors.split(',').map(x => x.trim()).filter(Boolean).includes(String(id));
    });

    const enriched = {
      ...monitor,
      latency: latencySeries.length > 0 ? latencySeries[latencySeries.length - 1].latency : null,
      uptime_24h: pct(upt?.t24 as number, upt?.s24 as number),
      uptime_7d: pct(upt?.t7 as number, upt?.s7 as number),
      uptime_30d: pct(upt?.t30 as number, upt?.s30 as number),
      uptime_90d: pct(t90, s90),
      daily_stats: (dailyRows || []).map(r => ({ date: r.date as string, up: r.successful_checks as number, total: r.total_checks as number })),
    };

    return c.json({ monitor: enriched, logs: logs || [], latency_series: latencySeries, incidents });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/monitors', async (c) => {
  try {
    const body = await c.req.json<Partial<Monitor>>();
    const { name, url, interval, keyword, user_agent, tags, request_headers, request_body } = body;
    if (!name || !url) return c.json({ error: 'Missing name or url' }, 400);
    const type = (['dns', 'port'].includes(body.type || '') ? body.type : 'http') as Monitor['type'];
    const method = (body.method || 'GET').toUpperCase();
    const config = body.config || null;
    const alertAfterFailures = Number(body.alert_after_failures) > 0 ? Number(body.alert_after_failures) : 1;

    const result = await c.env.DB.prepare(
      `INSERT INTO monitors (name, url, type, config, method, interval, keyword, user_agent, tags, request_headers, request_body, alert_after_failures)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      name, url, type, config, method,
      interval || 300, keyword || null, user_agent || null, tags || null,
      request_headers || null, request_body || null, alertAfterFailures
    ).run();

    const newId = result.meta.last_row_id as number;
    if (type === 'http' && (body.check_ssl !== 0 || body.check_domain !== 0)) {
      c.executionCtx.waitUntil((async () => {
        try {
          await c.env.DB.prepare('UPDATE monitors SET check_info_status = ? WHERE id = ?')
            .bind(new Date().toISOString(), newId).run();
          const { results } = await c.env.DB.prepare(`SELECT ${MONITOR_COLUMNS} FROM monitors WHERE id = ?`)
            .bind(newId).all<Monitor>();
          if (results[0]) await updateDomainCertInfo(c.env, results[0]);
        } catch (err) { console.error('Initial cert check failed:', err); }
      })());
    }
    return c.json({ success: true, id: newId }, 201);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.delete('/monitors/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM logs WHERE monitor_id = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM monitors WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.patch('/monitors/:id/config', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<Partial<Monitor>>();
    const fields: string[] = [];
    const values: unknown[] = [];
    const simpleMap: [string, keyof Monitor][] = [
      ['name', 'name'], ['url', 'url'], ['method', 'method'], ['interval', 'interval'],
      ['keyword', 'keyword'], ['user_agent', 'user_agent'], ['tags', 'tags'],
      ['request_headers', 'request_headers'], ['request_body', 'request_body'],
      ['check_ssl', 'check_ssl'], ['check_domain', 'check_domain'],
      ['alert_silence_uptime', 'alert_silence_uptime'], ['alert_silence_ssl', 'alert_silence_ssl'],
      ['alert_silence_domain', 'alert_silence_domain'], ['alert_error_rate', 'alert_error_rate'],
      ['alert_after_failures', 'alert_after_failures'], ['paused', 'paused'],
    ];
    for (const [dbField, key] of simpleMap) {
      const v = body[key];
      if (v !== undefined && v !== null) { fields.push(`${dbField} = ?`); values.push(v); }
    }
    if (body.type !== undefined && ['http', 'dns', 'port'].includes(body.type)) {
      fields.push('type = ?'); values.push(body.type);
    }
    if (body.config !== undefined && body.config !== null) {
      fields.push('config = ?'); values.push(typeof body.config === 'string' ? body.config : JSON.stringify(body.config));
    }
    if (fields.length === 0) return c.json({ error: 'No valid fields' }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE monitors SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/monitors/:id/check', async (c) => {
  const id = c.req.param('id');
  try {
    const monitor = await c.env.DB.prepare(`SELECT ${MONITOR_COLUMNS} FROM monitors WHERE id = ?`)
      .bind(id).first<Monitor>();
    if (!monitor) return c.json({ error: 'Monitor not found' }, 404);
    const result = await performCheck(monitor, c.env);
    return c.json(result);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.patch('/monitors/:id/pause', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<{ paused?: number }>();
    await c.env.DB.prepare('UPDATE monitors SET paused = ?, status = ? WHERE id = ?')
      .bind(body.paused ? 1 : 0, body.paused ? 'PAUSED' : 'UP', id).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.get('/monitors/:id/logs', async (c) => {
  const id = c.req.param('id');
  try {
    const limit = Math.min(Math.max(Number(c.req.query('limit')) || 50, 1), 500);
    const { results } = await c.env.DB.prepare(
      'SELECT id, monitor_id, status_code, latency, is_fail, reason, created_at FROM logs WHERE monitor_id = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(id, limit).all();
    return c.json(results);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.get('/monitors/:id/stats', async (c) => {
  const id = c.req.param('id');
  try {
    const row = await c.env.DB.prepare(`
      SELECT
        SUM(CASE WHEN created_at >= datetime('now','-24 hours') THEN 1 ELSE 0 END) as t24,
        SUM(CASE WHEN created_at >= datetime('now','-24 hours') AND is_fail=0 THEN 1 ELSE 0 END) as s24,
        SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) as t7,
        SUM(CASE WHEN created_at >= datetime('now','-7 days') AND is_fail=0 THEN 1 ELSE 0 END) as s7,
        COUNT(*) as t30, SUM(CASE WHEN is_fail=0 THEN 1 ELSE 0 END) as s30,
        AVG(CASE WHEN is_fail=0 THEN latency END) as avg_latency
      FROM logs WHERE monitor_id = ? AND created_at >= datetime('now','-30 days')
    `).bind(id).first<{ t24: number; s24: number; t7: number; s7: number; t30: number; s30: number; avg_latency: number }>();
    const pct = (t?: number, s?: number) => t && t > 0 ? Number(((s! / t) * 100).toFixed(1)) : null;
    return c.json({
      uptime_24h: pct(row?.t24, row?.s24),
      uptime_7d: pct(row?.t7, row?.s7),
      uptime_30d: pct(row?.t30, row?.s30),
      avg_latency: row?.avg_latency ? Math.round(row.avg_latency) : null,
    });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/monitors/batch', async (c) => {
  try {
    const body = await c.req.json<{ ids: number[]; action: 'pause' | 'resume' | 'delete' }>();
    if (!Array.isArray(body.ids) || body.ids.length === 0) return c.json({ error: 'ids is required' }, 400);
    const placeholders = body.ids.map(() => '?').join(',');
    if (body.action === 'delete') {
      await c.env.DB.prepare(`DELETE FROM logs WHERE monitor_id IN (${placeholders})`).bind(...body.ids).run();
      await c.env.DB.prepare(`DELETE FROM monitors WHERE id IN (${placeholders})`).bind(...body.ids).run();
    } else if (body.action === 'pause' || body.action === 'resume') {
      const paused = body.action === 'pause' ? 1 : 0;
      await c.env.DB.prepare(`UPDATE monitors SET paused = ?, status = ? WHERE id IN (${placeholders})`)
        .bind(paused, paused ? 'PAUSED' : 'UP', ...body.ids).run();
    } else {
      return c.json({ error: 'Invalid action' }, 400);
    }
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.put('/monitors/reorder', async (c) => {
  try {
    const body = await c.req.json<{ ids: number[] }>();
    if (!Array.isArray(body.ids)) return c.json({ error: 'ids is required' }, 400);
    const stmt = c.env.DB.prepare('UPDATE monitors SET sort_order = ? WHERE id = ?');
    await c.env.DB.batch(body.ids.map((id, idx) => stmt.bind(idx, id)));
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 事件公告
// ============================================================
app.get('/incidents', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM incidents WHERE status = 'active' ORDER BY created_at DESC"
    ).all<Incident>();
    return c.json(results || []);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.get('/incidents/all', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM incidents ORDER BY created_at DESC LIMIT 100'
    ).all<Incident>();
    return c.json(results || []);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/incidents', async (c) => {
  try {
    const body = await c.req.json<{ title: string; description?: string; severity?: string; type?: string; scheduled_start?: string; scheduled_end?: string; affected_monitors?: string }>();
    if (!body.title) return c.json({ error: 'Missing title' }, 400);
    const severity = ['info', 'warning', 'critical'].includes(body.severity || '') ? body.severity : 'info';
    const type = body.type === 'maintenance' ? 'maintenance' : 'incident';
    const scheduledStart = type === 'maintenance' ? body.scheduled_start : null;
    const scheduledEnd = type === 'maintenance' ? body.scheduled_end : null;
    if (type === 'maintenance' && (!scheduledStart || !scheduledEnd || scheduledEnd <= scheduledStart)) {
      return c.json({ error: 'Invalid maintenance window' }, 400);
    }
    const now = new Date().toISOString();
    const result = await c.env.DB.prepare(
      'INSERT INTO incidents (title, description, severity, status, type, scheduled_start, scheduled_end, affected_monitors, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(body.title, body.description || null, severity, 'active', type, scheduledStart, scheduledEnd, body.affected_monitors || null, now, now).run();
    // 通知订阅者
    await notifySubscribers(c.env, body.title, body.description || '', 'incident');
    return c.json({ success: true, id: result.meta.last_row_id }, 201);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.patch('/incidents/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<{ title?: string; description?: string; severity?: string; status?: string; affected_monitors?: string }>();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
    if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
    if (body.severity !== undefined) { fields.push('severity = ?'); values.push(body.severity); }
    if (body.affected_monitors !== undefined) { fields.push('affected_monitors = ?'); values.push(body.affected_monitors); }
    if (body.status !== undefined && ['active', 'resolved'].includes(body.status)) {
      fields.push('status = ?'); values.push(body.status);
      fields.push('resolved_at = ?'); values.push(body.status === 'resolved' ? new Date().toISOString() : null);
    }
    if (fields.length === 0) return c.json({ error: 'No valid fields' }, 400);
    fields.push('updated_at = ?'); values.push(new Date().toISOString());
    values.push(id);
    await c.env.DB.prepare(`UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.delete('/incidents/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM incidents WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 设置
// ============================================================
app.get('/settings', async (c) => {
  try {
    return c.json(await getSettingsMap(c.env));
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.put('/settings', async (c) => {
  try {
    const body = await c.req.json<Record<string, string>>();
    const stmt = c.env.DB.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at');
    const now = new Date().toISOString();
    await c.env.DB.batch(Object.entries(body).map(([k, v]) => stmt.bind(k, String(v), now)));
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.get('/health', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT 1 as ok').first();
    return c.json({ status: 'ok', db: !!row, ok: !!row });
  } catch (e: unknown) {
    return c.json({ status: 'error', db: false, ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 通知渠道
// ============================================================
app.get('/notification-channels', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM notification_channels ORDER BY created_at DESC').all<NotificationChannel>();
    return c.json((results || []).map(ch => maskChannelConfig(ch) as unknown as NotificationChannel));
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/notification-channels', async (c) => {
  try {
    const body = await c.req.json<{ type: string; name: string; config: Record<string, unknown>; enabled?: number }>();
    if (!body.type || !body.name || !body.config) return c.json({ error: 'Missing required fields' }, 400);
    if (!(CHANNEL_TYPES as readonly string[]).includes(body.type)) {
      return c.json({ error: `Invalid type. Valid: ${CHANNEL_TYPES.join(', ')}` }, 400);
    }
    // 校验 email 类型必须带 provider
    if (body.type === 'email') {
      const provider = String(body.config.provider || 'resend');
      if (!(EMAIL_PROVIDERS as readonly string[]).includes(provider)) {
        return c.json({ error: `Invalid email provider. Valid: ${EMAIL_PROVIDERS.join(', ')}` }, 400);
      }
    }
    await c.env.DB.prepare('INSERT INTO notification_channels (type, name, enabled, config) VALUES (?, ?, ?, ?)')
      .bind(body.type, body.name, body.enabled ?? 1, JSON.stringify(body.config)).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.patch('/notification-channels/:id', async (c) => {
  const id = c.req.param('id');
  try {
    const body = await c.req.json<{ name?: string; enabled?: number; config?: Record<string, unknown> }>();
    const fields: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
    if (body.enabled !== undefined) { fields.push('enabled = ?'); values.push(body.enabled); }
    if (body.config !== undefined && Object.keys(body.config).length > 0) {
      const existing = await c.env.DB.prepare('SELECT config FROM notification_channels WHERE id = ?')
        .bind(id).first<{ config: string }>();
      let mergedConfig: Record<string, unknown> = {};
      if (existing?.config) { try { mergedConfig = JSON.parse(existing.config) as Record<string, unknown>; } catch { /* ignore */ } }
      for (const [k, v] of Object.entries(body.config)) {
        if (v !== '' && v !== null && v !== undefined) mergedConfig[k] = v;
      }
      fields.push('config = ?'); values.push(JSON.stringify(mergedConfig));
    }
    if (fields.length === 0) return c.json({ error: 'No valid fields' }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE notification_channels SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.delete('/notification-channels/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM notification_channels WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/notification-channels/:id/test', async (c) => {
  const id = c.req.param('id');
  try {
    const channel = await c.env.DB.prepare('SELECT * FROM notification_channels WHERE id = ?').bind(id).first<NotificationChannel>();
    if (!channel) return c.json({ error: 'Channel not found' }, 404);
    const lang = isSupportedLang(await getSetting(c.env, 'language'));
    const tz = await getSetting(c.env, 'timezone') || 'UTC';
    const msg = buildAlertMessage(
      { name: 'Test Monitor', url: 'https://example.com' }, 'DOWN',
      'This is a test message to verify your notification channel.', formatTimeInTz(new Date(), tz), lang,
    );
    const sent = await sendToChannel(channel, msg, c.env);
    return c.json({ success: sent });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/test-alert', async (c) => {
  try {
    const lang = isSupportedLang(await getSetting(c.env, 'language'));
    const tz = await getSetting(c.env, 'timezone') || 'UTC';
    const msg = buildAlertMessage(
      { name: 'Test Monitor', url: 'https://example.com' }, 'DOWN',
      'This is a test message to verify your notification channels.', formatTimeInTz(new Date(), tz), lang,
    );
    const sent = await sendAlertToAllChannels(c.env, msg);
    return c.json({ success: sent });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// API 密钥管理
// ============================================================
app.get('/api-keys', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT id, name, created_at, last_used_at FROM api_keys ORDER BY created_at DESC').all();
    return c.json(results || []);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/api-keys', async (c) => {
  try {
    const body = await c.req.json<{ name?: string }>();
    if (!body.name) return c.json({ error: 'Name is required' }, 400);
    const rawKey = `ut_${randomToken(24)}`;
    const hash = await hashApiKey(rawKey);
    await c.env.DB.prepare('INSERT INTO api_keys (name, key_hash) VALUES (?, ?)').bind(body.name, hash).run();
    return c.json({ success: true, key: rawKey }, 201); // 仅此一次展示明文
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.delete('/api-keys/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await c.env.DB.prepare('DELETE FROM api_keys WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 备份 / 恢复
// ============================================================
app.get('/backup', async (c) => {
  try {
    const tables = ['monitors', 'logs', 'incidents', 'settings', 'notification_channels', 'subscriptions'];
    const dump: Record<string, unknown[]> = {};
    for (const t of tables) {
      const { results } = await c.env.DB.prepare(`SELECT * FROM ${t}`).all();
      dump[t] = results || [];
    }
    const payload = JSON.stringify({ app: 'MonitorFlare', version: 1, exported_at: new Date().toISOString(), data: dump });
    return c.body(payload, 200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="monitorflare-backup.json"' });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/backup/restore', async (c) => {
  try {
    const body = await c.req.json<{ data?: Record<string, unknown[]> }>();
    const data = body?.data;
    if (!data || !Array.isArray(data.monitors)) return c.json({ error: 'Invalid backup format' }, 400);
    // 清空并恢复
    for (const t of ['logs', 'monitors', 'incidents', 'settings', 'notification_channels', 'subscriptions']) {
      await c.env.DB.prepare(`DELETE FROM ${t}`).run();
    }
    if (Array.isArray(data.settings)) {
      const stmt = c.env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      await c.env.DB.batch((data.settings as { key: string; value: string }[]).map(s => stmt.bind(s.key, s.value)));
    }
    if (Array.isArray(data.monitors)) {
      const cols = Object.keys((data.monitors[0] as Record<string, unknown>) || {}).filter(k => k !== 'id');
      for (const m of data.monitors as Record<string, unknown>[]) {
        const placeholders = cols.map(() => '?').join(',');
        await c.env.DB.prepare(`INSERT INTO monitors (${cols.join(',')}) VALUES (${placeholders})`)
          .bind(...cols.map(k => m[k] ?? null)).run();
      }
    }
    return c.json({ success: true, restored: data.monitors.length });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 公开 API + RSS + 订阅
// 注意:经 Pages _worker.js 代理后 /api 前缀会被剥掉,
// 因此公开路由同时注册带 /api 前缀(直连 Worker)和不带前缀(经 Pages 访问)两个版本。
// ============================================================
const statusHandler = async (c) => {
  try {
    const { results: monitors } = await c.env.DB.prepare(
      'SELECT id, name, url, type, status, last_check, paused, tags FROM monitors ORDER BY sort_order ASC'
    ).all();
    const ids = (monitors || []).map(m => m.id as number);
    const statsMap: Record<number, { uptime_7d: number | null; uptime_30d: number | null; latency: number | null }> = {};
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const { results: stats } = await c.env.DB.prepare(`
        SELECT monitor_id,
          SUM(CASE WHEN created_at >= datetime('now','-7 days') THEN 1 ELSE 0 END) as t7,
          SUM(CASE WHEN created_at >= datetime('now','-7 days') AND is_fail=0 THEN 1 ELSE 0 END) as s7,
          COUNT(*) as t30, SUM(CASE WHEN is_fail=0 THEN 1 ELSE 0 END) as s30
        FROM logs WHERE monitor_id IN (${placeholders}) AND created_at >= datetime('now','-30 days') GROUP BY monitor_id
      `).bind(...ids).all();
      const { results: latRows } = await c.env.DB.prepare(
        `SELECT monitor_id, latency FROM logs WHERE is_fail=0 AND monitor_id IN (${placeholders}) ORDER BY created_at DESC LIMIT ${ids.length * 5}`
      ).bind(...ids).all();
      const latMap = new Map<number, number[]>();
      for (const r of latRows || []) {
        const id = r.monitor_id as number;
        if (!latMap.has(id)) latMap.set(id, []);
        if (latMap.get(id)!.length < 3) latMap.get(id)!.push(r.latency as number);
      }
      for (const s of stats || []) {
        const t7 = s.t7 as number, s7 = s.s7 as number, t30 = s.t30 as number, s30 = s.s30 as number;
        statsMap[s.monitor_id as number] = {
          uptime_7d: t7 > 0 ? Number(((s7 / t7) * 100).toFixed(1)) : null,
          uptime_30d: t30 > 0 ? Number(((s30 / t30) * 100).toFixed(1)) : null,
          latency: latMap.get(s.monitor_id as number)?.[0] ?? null,
        };
      }
    }
    const { results: incidents } = await c.env.DB.prepare(
      "SELECT id, title, severity, status, type, created_at, resolved_at FROM incidents WHERE status = 'active' ORDER BY created_at DESC"
    ).all();
    const out = (monitors || []).map(m => ({
      id: m.id, name: m.name, url: m.url, type: m.type, status: m.status,
      paused: m.paused, tags: m.tags, last_check: m.last_check,
      ...(statsMap[m.id as number] || { uptime_7d: null, uptime_30d: null, latency: null }),
    }));
    return c.json({ generated_at: new Date().toISOString(), monitors: out, incidents: incidents || [] });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
};

// 双注册:直连 Worker(/api/status)与经 Pages 代理(/status)
app.get('/api/status', statusHandler);
app.get('/status', statusHandler);

// 状态页登录(私密模式):密码换 token
const statusLoginHandler = async (c) => {
  try {
    const body = await c.req.json<{ password?: string }>().catch((): { password?: string } => ({}));
    if (!body.password) return c.json({ error: 'Password is required' }, 400);
    const storedHash = await getSetting(c.env, 'status_page_password');
    if (!storedHash) return c.json({ error: 'status_page_not_configured' }, 503);
    const inputHash = await hashStatusPassword(body.password);
    if (!await safeEqual(inputHash, storedHash)) return c.json({ error: 'invalid_password' }, 401);
    const token = await createStatusToken(c.env, storedHash);
    return c.json(token);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
};
app.post('/api/status/login', statusLoginHandler);
app.post('/status/login', statusLoginHandler);

app.get('/feed.xml', async (c) => {
  try {
    const settings = await getSettingsMap(c.env);
    const siteTitle = settings.site_title || 'MonitorFlare';
    const siteDesc = settings.site_description || 'Status updates';
    const base = (c.env.BASE_URL || '').replace(/\/$/, '');
    const { results: incidents } = await c.env.DB.prepare(
      'SELECT * FROM incidents ORDER BY created_at DESC LIMIT 20'
    ).all<Incident>();
    const items = (incidents || []).map(i => {
      const link = `${base}/#/incident/${i.id}`;
      const pubDate = new Date(i.created_at.replace(' ', 'T') + 'Z').toUTCString();
      return `  <item>
    <title>${escapeXml(i.title)} [${i.status}]</title>
    <link>${link}</link>
    <guid>${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <description>${escapeXml(i.description || i.title)}</description>
  </item>`;
    }).join('\n');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <description>${escapeXml(siteDesc)}</description>
    <link>${base}</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
    return c.body(xml, 200, { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'no-store' });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/api/subscribe', async (c) => {
  try {
    const body = await c.req.json<{ email?: string }>();
    const email = (body.email || '').trim();
    if (!isValidEmail(email)) return c.json({ error: 'Valid email is required' }, 400);
    const token = randomToken(16);
    await c.env.DB.prepare('INSERT INTO subscriptions (email, token) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET token = excluded.token')
      .bind(email, token).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

app.post('/api/unsubscribe', async (c) => {
  try {
    const body = await c.req.json<{ token?: string }>();
    if (!body.token) return c.json({ error: 'Token is required' }, 400);
    await c.env.DB.prepare('DELETE FROM subscriptions WHERE token = ?').bind(body.token).run();
    return c.json({ success: true });
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 入站 Webhook(外部系统推送事件)
// ============================================================
app.post('/webhooks/:token', async (c) => {
  const token = c.req.param('token');
  try {
    const row = await c.env.DB.prepare("SELECT value FROM settings WHERE key = 'inbound_webhook_token'").first<{ value: string }>();
    const expected = row?.value || '';
    if (!expected || !await safeCompare(token, expected)) return c.json({ error: 'Invalid token' }, 401);
    const body = await c.req.json<{ title?: string; description?: string; severity?: string }>().catch(() => null);
    if (!body?.title) return c.json({ error: 'title is required' }, 400);
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'INSERT INTO incidents (title, description, severity, status, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(body.title, body.description || null, body.severity || 'info', 'active', 'incident', now, now).run();
    await notifySubscribers(c.env, body.title, body.description || '', 'webhook');
    return c.json({ success: true }, 201);
  } catch (e: unknown) {
    return c.json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

// ============================================================
// 调度(定时任务)
// ============================================================
async function checkSites(env: Bindings) {
  console.log('Starting scheduled check...');
  const now = Date.now();
  const { results } = await env.DB.prepare(`
    SELECT ${MONITOR_COLUMNS} FROM monitors
  `).all<Monitor>();
  const tasks = results.map(async (monitor) => {
    if (monitor.paused === 1) return;
    if (isTimeToCheck(monitor, now)) await performMonitorCheck(monitor, env);
  });
  await Promise.all(tasks);
}

function isTimeToCheck(monitor: Monitor, now: number): boolean {
  if (monitor.status === 'RETRYING') return true;
  const lastCheck = monitor.last_check ? new Date(monitor.last_check).getTime() : 0;
  const intervalMs = (monitor.interval || 300) * 1000;
  return now - lastCheck >= intervalMs;
}

async function performMonitorCheck(monitor: Monitor, env: Bindings) {
  const result: CheckResult = await performCheck(monitor, env);

  // 写日志
  await env.DB.prepare('INSERT INTO logs (monitor_id, status_code, latency, is_fail, reason) VALUES (?, ?, ?, ?, ?)')
    .bind(monitor.id, result.statusCode, result.latency, result.ok ? 0 : 1, result.reason || null).run();

  // 刷新 HTTP 监控的证书/域名信息(24h)
  if (monitor.type === 'http') {
    const lastInfoCheck = monitor.check_info_status ? new Date(monitor.check_info_status).getTime() : 0;
    if (Date.now() - lastInfoCheck > 86400000) {
      env.DB.prepare('UPDATE monitors SET check_info_status = ? WHERE id = ?')
        .bind(new Date().toISOString(), monitor.id).run()
        .then(() => updateDomainCertInfo(env, monitor)).catch(console.error);
    }
  }

  // 状态机: 连续失败计数 → 告警
  const afterFailures = Math.max(1, monitor.alert_after_failures || 1);
  const lang = isSupportedLang(await getSetting(env, 'language'));
  const tz = await getSetting(env, 'timezone') || 'UTC';

  if (!result.ok) {
    const newRetry = (monitor.retry_count || 0) + 1;
    if (newRetry >= afterFailures && monitor.status === 'UP') {
      await env.DB.prepare('UPDATE monitors SET status = ?, retry_count = ?, last_check = ? WHERE id = ?')
        .bind('DOWN', 0, new Date().toISOString(), monitor.id).run();
      await sendUptimeAlert(env, monitor, 'DOWN', result.reason, lang, tz);
    } else {
      await env.DB.prepare('UPDATE monitors SET status = ?, retry_count = ?, last_check = ? WHERE id = ?')
        .bind('RETRYING', newRetry, new Date().toISOString(), monitor.id).run();
    }
  } else {
    if (monitor.status === 'DOWN' || monitor.status === 'RETRYING') {
      await env.DB.prepare('UPDATE monitors SET status = ?, retry_count = ?, last_check = ? WHERE id = ?')
        .bind('UP', 0, new Date().toISOString(), monitor.id).run();
      await sendUptimeAlert(env, monitor, 'UP', result.reason || `Response time: ${result.latency}ms`, lang, tz);
    } else {
      await env.DB.prepare('UPDATE monitors SET last_check = ? WHERE id = ?')
        .bind(new Date().toISOString(), monitor.id).run();
    }
  }

  // 错误率告警(过去 5 分钟)
  if (monitor.alert_error_rate > 0) {
    await checkErrorRate(env, monitor, lang, tz);
  }
}

async function sendUptimeAlert(env: Bindings, monitor: Monitor, type: 'DOWN' | 'UP', detail: string, lang: Lang, tz: string) {
  const silenceH = monitor.alert_silence_uptime || 24;
  const lastAlert = monitor.last_alert_uptime ? new Date(monitor.last_alert_uptime).getTime() : 0;
  if (type === 'DOWN' && Date.now() - lastAlert < silenceH * 3_600_000) return;
  const msg = buildAlertMessage({ name: monitor.name, url: monitor.url }, type, detail, formatTimeInTz(new Date(), tz), lang);
  await sendAlertToAllChannels(env, msg);
  await env.DB.prepare('UPDATE monitors SET last_alert_uptime = ? WHERE id = ?')
    .bind(new Date().toISOString(), monitor.id).run();
}

async function checkErrorRate(env: Bindings, monitor: Monitor, lang: Lang, tz: string) {
  const row = await env.DB.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN is_fail=1 THEN 1 ELSE 0 END) as fails
    FROM logs WHERE monitor_id = ? AND created_at >= datetime('now','-5 minutes')
  `).bind(monitor.id).first<{ total: number; fails: number }>();
  const total = row?.total || 0;
  const fails = row?.fails || 0;
  if (total >= 5 && fails / total >= monitor.alert_error_rate / 100) {
    const lastAlert = monitor.last_alert_uptime ? new Date(monitor.last_alert_uptime).getTime() : 0;
    if (Date.now() - lastAlert > 3600_000) { // 错误率告警 1 小时静默
      const detail = `Error rate ${((fails / total) * 100).toFixed(1)}% in last 5 minutes (threshold ${monitor.alert_error_rate}%)`;
      const msg = buildAlertMessage({ name: monitor.name, url: monitor.url }, 'DOWN', detail, formatTimeInTz(new Date(), tz), lang);
      await sendAlertToAllChannels(env, msg);
      await env.DB.prepare('UPDATE monitors SET last_alert_uptime = ? WHERE id = ?')
        .bind(new Date().toISOString(), monitor.id).run();
    }
  }
}

async function sendAlertToAllChannels(env: Bindings, msg: ReturnType<typeof buildAlertMessage>): Promise<boolean> {
  try {
    const { results } = await env.DB.prepare('SELECT * FROM notification_channels WHERE enabled = 1').all<NotificationChannel>();
    if (results && results.length > 0) {
      const tasks = results.map(ch => sendToChannel(ch, msg, env));
      const outcomes = await Promise.allSettled(tasks);
      return outcomes.some(o => o.status === 'fulfilled' && o.value === true);
    }
  } catch (e) { console.error('Failed to read notification channels from DB:', e); }

  if (env.DINGTALK_ACCESS_TOKEN && env.DINGTALK_SECRET) {
    const fallbackChannel: NotificationChannel = {
      id: 0, type: 'dingtalk', name: 'ENV DingTalk', enabled: 1,
      config: JSON.stringify({ access_token: env.DINGTALK_ACCESS_TOKEN, secret: env.DINGTALK_SECRET }),
      created_at: '',
    };
    return sendToChannel(fallbackChannel, msg, env);
  }
  console.warn('No notification channels configured.');
  return false;
}

// 证书 / 域名到期告警(每 2 小时)
async function checkExpiryAlerts(env: Bindings) {
  const lang = isSupportedLang(await getSetting(env, 'language'));
  const tz = await getSetting(env, 'timezone') || 'UTC';
  const { results } = await env.DB.prepare(`
    SELECT ${MONITOR_COLUMNS} FROM monitors WHERE paused = 0 AND type = 'http' AND (check_ssl = 1 OR check_domain = 1)
  `).all<Monitor>();
  for (const monitor of results || []) {
    const now = Date.now();
    const dayMs = 86_400_000;
    // SSL
    if (monitor.check_ssl && monitor.cert_expiry) {
      const exp = new Date(monitor.cert_expiry).getTime();
      const daysLeft = Math.floor((exp - now) / dayMs);
      const lastAlert = monitor.last_alert_ssl ? new Date(monitor.last_alert_ssl).getTime() : 0;
      if (daysLeft <= (monitor.alert_silence_ssl || 24) && now - lastAlert > dayMs) {
        const msg = buildAlertMessage({ name: monitor.name, url: monitor.url }, 'DOWN',
          `SSL certificate expires in ${daysLeft} days (${monitor.cert_expiry})`, formatTimeInTz(new Date(), tz), lang);
        await sendAlertToAllChannels(env, msg);
        await env.DB.prepare('UPDATE monitors SET last_alert_ssl = ? WHERE id = ?')
          .bind(new Date().toISOString(), monitor.id).run();
      }
    }
    // Domain
    if (monitor.check_domain && monitor.domain_expiry) {
      const exp = new Date(monitor.domain_expiry).getTime();
      const daysLeft = Math.floor((exp - now) / dayMs);
      const lastAlert = monitor.last_alert_domain ? new Date(monitor.last_alert_domain).getTime() : 0;
      if (daysLeft <= (monitor.alert_silence_domain || 24) && now - lastAlert > dayMs) {
        const msg = buildAlertMessage({ name: monitor.name, url: monitor.url }, 'DOWN',
          `Domain expires in ${daysLeft} days (${monitor.domain_expiry})`, formatTimeInTz(new Date(), tz), lang);
        await sendAlertToAllChannels(env, msg);
        await env.DB.prepare('UPDATE monitors SET last_alert_domain = ? WHERE id = ?')
          .bind(new Date().toISOString(), monitor.id).run();
      }
    }
  }
}

// 日志清理 + 每日聚合
async function cleanupAndAggregate(env: Bindings) {
  // 清理 90 天前的日志
  await env.DB.prepare("DELETE FROM logs WHERE created_at < datetime('now','-90 days')").run();
  // 每日聚合
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_uptime (
    monitor_id INTEGER NOT NULL, date TEXT NOT NULL,
    total_checks INTEGER DEFAULT 0, successful_checks INTEGER DEFAULT 0,
    avg_latency INTEGER DEFAULT 0, PRIMARY KEY (monitor_id, date)
  )`).run();
  await env.DB.prepare(`
    INSERT OR REPLACE INTO daily_uptime (monitor_id, date, total_checks, successful_checks, avg_latency)
    SELECT monitor_id, date(created_at), COUNT(*), SUM(CASE WHEN is_fail=0 THEN 1 ELSE 0 END),
           COALESCE(CAST(AVG(CASE WHEN is_fail=0 THEN latency END) AS INTEGER), 0)
    FROM logs
    WHERE created_at >= date('now','-1 day')
    GROUP BY monitor_id, date(created_at)
  `).run();
  // 备份到 R2(如配置)
  if (env.R2) {
    try {
      const tables = ['monitors', 'logs', 'incidents', 'settings', 'notification_channels', 'subscriptions'];
      const dump: Record<string, unknown[]> = {};
      for (const t of tables) {
        const { results } = await env.DB.prepare(`SELECT * FROM ${t}`).all();
        dump[t] = results || [];
      }
      const key = `backups/${new Date().toISOString().slice(0, 10)}.json`;
      await env.R2.put(key, JSON.stringify(dump));
    } catch (e) { console.error('R2 backup failed:', e); }
  }
}

async function runScheduledTasks(env: Bindings) {
  await ensureInitialized(env);
  const tasks: Promise<void>[] = [checkSites(env)];
  const hour = new Date().getUTCHours();
  if (hour === 2) {
    tasks.push(cleanupAndAggregate(env));
    tasks.push(checkExpiryAlerts(env));
  }
  await Promise.all(tasks);
}

// ============================================================
// 订阅者通知
// ============================================================
async function notifySubscribers(env: Bindings, title: string, description: string, _source: string) {
  try {
    const { results } = await env.DB.prepare('SELECT email FROM subscriptions').all<Subscription>();
    if (!results || results.length === 0) return;
    const emailCfg = await getEmailConfigForLogin(env);
    if (!emailCfg) return;
    const html = `<p><strong>${escapeXml(title)}</strong></p><p>${escapeXml(description)}</p>`;
    for (const sub of results) {
      await sendLoginEmail(env, emailCfg, sub.email, `[${(await getSetting(env, 'site_title')) || 'MonitorFlare'}] ${title}`, html).catch(console.error);
    }
  } catch (e) { console.error('notifySubscribers failed:', e); }
}

// ============================================================
// 邮件工具(登录链接 / 订阅通知共用)
// ============================================================
async function getEmailConfigForLogin(env: Bindings): Promise<{ channel: NotificationChannel } | null> {
  const { results } = await env.DB.prepare("SELECT * FROM notification_channels WHERE type = 'email' AND enabled = 1 ORDER BY created_at DESC LIMIT 1").all<NotificationChannel>();
  if (!results || results.length === 0) return null;
  return { channel: results[0] };
}

async function sendLoginEmail(env: Bindings, cfg: { channel: NotificationChannel }, to: string, subject: string, html: string): Promise<boolean> {
  const msg = buildAlertMessage({ name: '', url: '' }, 'UP', '', new Date().toISOString(), 'en');
  const channel = cfg.channel;
  const config = (() => { try { return JSON.parse(channel.config) as Record<string, string>; } catch { return {}; } })();
  // 构造一个自定义消息来复用 sendToChannel
  const customMsg = { ...msg, title: subject, detail: html, statusText: '', monitorName: '', monitorUrl: '' };
  const cfgWithTo = { ...config, to_email: to };
  const fakeChannel: NotificationChannel = { ...channel, config: JSON.stringify(cfgWithTo) };
  return sendToChannel(fakeChannel, customMsg, env);
}

// ============================================================
// 工具
// ============================================================
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function safeCompare(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const digestA = await crypto.subtle.digest('SHA-256', encoder.encode(a));
  const digestB = await crypto.subtle.digest('SHA-256', encoder.encode(b));
  const bufA = new Uint8Array(digestA), bufB = new Uint8Array(digestB);
  let diff = bufA.length ^ bufB.length;
  for (let i = 0; i < Math.max(bufA.length, bufB.length); i++) diff |= (bufA[i] || 0) ^ (bufB[i] || 0);
  return diff === 0;
}

// ============================================================
// 导出
// ============================================================
export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledTasks(env));
  },
};
