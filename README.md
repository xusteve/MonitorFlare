# MonitorFlare

> **Zero-cost website monitoring + public status page, running entirely on the Cloudflare free tier.**
> An enhanced fork of [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)
<a href="https://uptime.csr.plus/"><img src="https://monitorflare.csr.plus/uptime-badge.png" height="28" alt="Uptime Status"></a>
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**README Languages**: English | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

MonitorFlare is a self-hosted uptime monitoring platform with a beautiful public status page. It runs **completely free** on Cloudflare Workers, D1, and Pages — no servers, no VPS, no monthly costs.

---

## ✨ Features

### 📡 Monitoring
- **HTTP / HTTPS** — GET / POST / PUT / HEAD, custom headers, request body, keyword validation
- **DNS** — record existence & value checks (A / AAAA / CNAME / MX / TXT / NS) via DoH
- **TCP Port** — port reachability via the Workers TCP Socket API
- **SSL certificate & domain expiry** detection (crt.sh + rdap.org)
- **Error-rate threshold** alerts and **consecutive-failure** escalation
- Configurable check intervals, pause/resume, tags, drag-and-drop sorting
- **Shields.io-style monitor badges** — SSL / HTTP / HTTPS / DNS / TCP types shown next to each monitor name, hover turns green (shared global CSS, reused on status cards & the detail page)
- **One-click SSL deep check** — a flag icon beside each monitor URL opens a full SSL analysis at `csr.plus/check?domain=...` (visible when SSL expiry tracking is enabled)

### 🔔 Notifications (9 channels)
- DingTalk · WeCom (WeChat Work) · Feishu (Lark) · Telegram · Slack · Discord · ntfy · generic Webhook
- **Email with 5 providers**: Resend · SendGrid · Mailgun · Postmark · AWS SES
- Per-channel enable/disable, test messages, secret masking

### 📊 Status Page
- Public status page with tag groups, incident timeline, and scheduled maintenance
- **Subscribe by email** to incident updates + **RSS/Atom feed**
- Custom branding: logo, title, description, dark/light themes
- **PWA** — installable and offline-ready
- **Monitor detail page** (`/monitor/:id`) — status header card, uptime stats (24h / 7d / 30d / 90d), 90-day uptime bar, latency trend chart (24h/7d/30d), latest 50 check logs with failures highlighted, related incidents, auto-refresh every 30s
- **Private status page** — public or password-protected (SHA-256) with a 7-day unlock token; all public endpoints are guarded (`401 status_page_locked`), changing the password signs everyone out, and an "exit access" button in the footer. Defaults to public for zero-config compatibility

### 🌍 Internationalization
- **9 languages**: English · 简体中文 · 繁體中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- Configurable timezone for all timestamps and alert messages

### ⚙️ Platform
- **One-click deploy** via the Deploy to Cloudflare button — no CLI needed
- **Auto-initialization**: D1 schema created on first request
- **Multiple sign-in methods**: admin API key · email magic link · Google · GitHub · Cloudflare Access
- **Open API**: `GET /api/status`, `GET /feed.xml`, `GET /monitors/public/:id` (`?range` / `?limit`), inbound webhooks; public monitor payloads include `check_ssl` / `check_domain`
- **Backup & restore** (JSON export, optional R2 daily backups)
- API keys for third-party integrations

---

## 🚀 Quick Deploy

### Option A: One-click (recommended)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. Click the button and sign in to Cloudflare
2. Set `ADMIN_API_KEY` (your admin password) when prompted
3. Deploy — the Worker auto-creates the D1 database schema on first visit
4. Open the Pages URL → your status page is live

### Option B: GitHub Actions (CI/CD)

Fork this repository and add the following secrets and variables in
`Settings → Secrets and variables → Actions`:

**Secrets**

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers / Pages / D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Your Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID (create one first under Workers & Pages → D1) |
| `ADMIN_API_KEY` | ✅ | Admin password for your dashboard |
| `MAGIC_LINK_SECRET` | optional | Signing key for email magic-link login |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics token |

**Variables**

| Variable | Example |
|---|---|
| `ALLOWED_ORIGIN` | `https://<project>.pages.dev` |
| `SESSION_TTL_HOURS` | `12` |
| `BASE_URL` | `https://<project>.pages.dev` |
| `VITE_FOOTER_AUTHOR` | `MonitorFlare` |
| `VITE_FOOTER_URL` | `https://github.com/xusteve/MonitorFlare` |

Push to `main` → both the Worker and the Pages site deploy automatically.

> ⚠️ Make sure `D1_DATABASE_ID` is filled in **before** the first run — the CI
> script will not backfill it automatically.

### Option C: Local / manual

```bash
# 1. Worker (backend)
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

- **Zero server cost** — everything runs within the Cloudflare free tier
- Single repository, two modes: self-hosted open source & hosted SaaS (future)

---

## 🛠 Development

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

> Requires Node.js ≥ 22.

---

## 📄 License

MIT — see [LICENSE](LICENSE).

Upstream project: [nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).
