# MonitorFlare

> 零服务器成本的网站监控 + 公开状态页,全部运行在 Cloudflare 免费额度内。
> 基于 [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor)(MIT)分发的增强版。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourname/monitorflare)

**README 语言**: [English](README.md) | 中文 | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

---

## ✨ 功能

### 监测
- **HTTP / HTTPS** — GET/POST、自定义请求头、请求体、关键词校验
- **DNS** — 通过 DoH 检查记录存在性与取值(A / AAAA / CNAME / MX / TXT / NS)
- **TCP 端口** — 通过 Workers TCP Socket API 检测端口可达性
- **SSL 证书与域名到期**检测(crt.sh + rdap.org)
- **错误率阈值**告警、**连续失败**告警升级
- 可配置检查间隔、暂停/恢复、标签、拖拽排序

### 通知(9 种渠道)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / 通用 Webhook
- **5 家邮件服务商**:Resend · SendGrid · Mailgun · Postmark · AWS SES
- 逐渠道启用/停用、测试消息、密钥掩码

### 状态页
- 公开状态页,支持标签分组、事件时间线、计划维护
- **邮件订阅**事件更新、**RSS/Atom 订阅源**
- 自定义品牌:Logo、标题、描述、主题(深色/浅色)
- **PWA**:可安装、离线可用

### 国际化
- **8 种语言**:English · 中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- 所有时间戳与告警可配置时区

### 平台
- **一键部署**:通过 Deploy to Cloudflare 按钮,无需 CLI
- **自动初始化**:首次请求自动创建 D1 schema
- **一键登录**:Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **开放 API**:`GET /api/status`、`GET /feed.xml`、入站 webhooks
- **备份与恢复**(JSON 导出,可选 R2 每日备份)
- 面向第三方集成的 API keys

---

## 🚀 快速部署

### 方式 A:一键部署(推荐)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourname/monitorflare)

1. 点击按钮,登录 Cloudflare
2. 按提示设置 `ADMIN_API_KEY`(你的管理员密码)
3. 部署 — Worker 会在首次访问时自动创建 D1 数据库 schema
4. 打开 Pages URL(前端)→ 状态页上线

### 方式 B:GitHub Actions

Fork 本仓库,然后添加 secrets:

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

推送到 `main` → Worker 与 Pages 自动部署。

### 方式 C:本地 / 手动

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

> 💡 手动执行 schema 是可选的 — Worker 会在首次请求时自动初始化。

---

## 📦 架构

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

- **零服务器成本** — 全部运行在 Cloudflare 免费额度内
- 单一仓库、两种模式:自托管开源 & 未来的托管 SaaS

---

## 🛠 开发

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 License

MIT — 见 [LICENSE](LICENSE)。上游:[nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor)(MIT)。
