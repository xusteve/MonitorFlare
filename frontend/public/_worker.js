/**
 * Cloudflare Pages Advanced Mode — _worker.js
 *
 * 处理所有请求：
 *  - /api/* → 代理到后端 Worker（WORKER_URL 环境变量）
 *  - 其他   → 服务静态资源和 SPA 路由
 *
 * 在 Cloudflare Pages → Settings → Environment variables 中设置：
 *   WORKER_URL = https://uptime-worker.<your-account-id>.workers.dev
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = buildCorsHeaders(request, env);

    // OPTIONS 预检请求直接放行
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 代理 /api/* → Worker
    if (url.pathname.startsWith('/api/')) {
      const workerUrl = env.WORKER_URL;
      if (!workerUrl) {
        return new Response(
          JSON.stringify({ error: 'WORKER_URL environment variable is not set' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // /api/monitors/public → /monitors/public
      const targetPath = url.pathname.slice(4);
      const targetUrl = `${workerUrl.replace(/\/$/, '')}${targetPath}${url.search}`;

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      });

      const response = await fetch(proxyRequest);

      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        newHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    // 其他路径 → 服务静态资源（SPA fallback）
    const assetResponse = await env.ASSETS.fetch(request);

    // 如果静态资源不存在（404），返回 index.html 让 Vue Router 处理
    if (assetResponse.status === 404) {
      const indexUrl = new URL('/', url.origin);
      return env.ASSETS.fetch(new Request(indexUrl, request));
    }

    return assetResponse;
  },
};

function buildCorsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.length === 0
    ? (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ? origin : '')
    : (origin && allowed.includes(origin) ? origin : allowed[0]);

  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin;
  return headers;
}
