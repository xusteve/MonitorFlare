import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * 条件注入插件 —— 根据环境变量有条件地注入第三方脚本
 */
function conditionalScripts(env) {
  return {
    name: 'conditional-scripts',
    transformIndexHtml(html) {
      const cfToken = env.VITE_CF_ANALYTICS_TOKEN || '';

      html = html.replace(
        '<!-- __CF_ANALYTICS_SCRIPT__ -->',
        cfToken
          ? `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "${cfToken}"}'><\/script>`
          : ''
      );

      html = html.replace(/%VITE_FOOTER_AUTHOR%/g, env.VITE_FOOTER_AUTHOR || 'MonitorFlare');
      html = html.replace(/%VITE_FOOTER_URL%/g, env.VITE_FOOTER_URL || '#');

      return html;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      vue(),
      conditionalScripts(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'MonitorFlare',
          short_name: 'MonitorFlare',
          description: 'Realtime monitoring & status page',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              // 状态页公开数据:离线可看最近快照
              urlPattern: ({ url }) => url.pathname.startsWith('/api/status') || url.pathname.startsWith('/monitors/public'),
              handler: 'NetworkFirst',
              options: { cacheName: 'monitorflare-status', expiration: { maxEntries: 10, maxAgeSeconds: 24 * 3600 } },
            },
          ],
        },
      }),
    ],

    build: {
      rollupOptions: {
        input: './index.html',
      },
    },

    server: {
      proxy: {
        '/api': {
          target: env.VITE_WORKER_URL || 'http://127.0.0.1:8787',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
