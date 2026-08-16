# MonitorFlare

> 零服务器成本的网站监控 + 公开状态页,全部运行在 Cloudflare 免费额度内。
> 基于 [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor)(MIT)分发的增强版。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

**README Languages**: English | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

---

## ✨ Features

### Monitoring
- **HTTP / HTTPS** — GET/POST, custom headers, request body, keyword validation
- **DNS** — record existence & value checks (A / AAAA / CNAME / MX / TXT / NS) via DoH
- **TCP Port** — port reachability via Workers TCP Socket API
- **SSL certificate & domain expiry** detection (crt.sh + rdap.org)
- **Error rate threshold** alerts, **consecutive-failure** alert escalation
- Configurable check intervals, pause/resume, tags, drag-sort

### Notifications (9 channels)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / generic Webhook
- **Email with 5 providers**: Resend · SendGrid · Mailgun · Postmark · AWS SES
- Per-channel enable/disable, test message, secret masking

### Status Page
- Public status page with tag groups, incident timeline, scheduled maintenance
- **Subscribe by email** to incident updates, **RSS/Atom feed**
- Custom branding: logo, title, description, themes (dark/light)
- **PWA**: installable, offline-ready

### Internationalization
- **9 languages**: English · 简体中文 · 繁體中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- Configurable timezone for all timestamps & alerts

### Platform
- **One-click deploy** via Deploy to Cloudflare button — no CLI needed
- **Auto-initialization**: D1 schema created automatically on first request
- **One-click sign-in**: Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **Open API**: `GET /api/status`, `GET /feed.xml`, inbound webhooks
- **Backup & restore** (JSON export, optional R2 daily backup)
- API keys for third-party integrations

---

## 🚀 Quick Deploy

### Option A: One-click (recommended)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. Click the button, sign in to Cloudflare
2. Set `ADMIN_API_KEY` (your admin password) when prompted
3. Deploy — the Worker auto-creates the D1 database schema on first visit
4. Open the Pages URL (frontend) → status page is live

### Option A+: One-click via Cloudflare OAuth (`/deploy` page)

The frontend ships with a **`/deploy` landing page** (e.g. `https://monitorflare.csr.plus/deploy`).
It offers two deployment paths:

- **Deploy via GitHub** — the official Deploy to Cloudflare button above.
- **Deploy with Cloudflare (OAuth)** — full zero-config flow: user authorizes once,
  the `deployer/` service auto-creates the D1 database, deploys the Worker and Pages,
  and configures everything. See [`deployer/README`](deployer/README.md) for setup
  (register an OAuth client, run `build-artifacts.sh`, deploy the deployer Worker).

### Option B: GitHub Actions

Fork this repo, then add secrets:

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

Push to `main` → both Worker and Pages deploy automatically.

### Option C: Local / manual

```bash
# 1. Worker
cd worker
npm install
cp wrangler.example.toml wrangler.toml   # fill in database_id & vars
npx wrangler d1 create monitorflare-db     # if not created yet
npx wrangler d1 execute monitorflare-db --remote --file=schema.sql
npx wrangler deploy

# 2. Frontend
cd ../frontend
npm install
cp .env.example .env                      # set WORKER_URL if needed
npm run build
npx wrangler pages deploy dist --project-name=monitorflare
```

> 💡 Manual schema execution is optional — the Worker auto-initializes on first request.

---

## 📦 Architecture

```
Browser / PWA ──► Cloudflare Pages (Vue 3 + i18n + PWA)
                    │  /api/* proxied via _worker.js
                    ▼
              Cloudflare Worker (Hono)
                    │  cron: every minute
                    ▼
              D1 (monitors / logs / incidents / settings / channels / subscriptions / api_keys)
              R2 (optional daily backups)
```

- **Zero server cost** — all within Cloudflare free tier
- Single repo, two modes: self-hosted open source & future hosted SaaS

---

## 🛠 Development

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 License

MIT — see [LICENSE](LICENSE). Upstream: [nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).
