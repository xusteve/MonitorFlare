# MonitorFlare

> Website-Überwachung ohne Serverkosten + öffentliche Statusseite – alles im Cloudflare Free-Tarif.
> Verbesserte Version, verteilt auf Basis von [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)
[![Uptime Status](https://monitorflare.csr.plus/uptime-badge.png)](https://uptime.csr.plus/)

**README-Sprachen**: [English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | Deutsch | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

---

## ✨ Funktionen

### Überwachung
- **HTTP / HTTPS** — GET/POST, benutzerdefinierte Header, Request-Body, Schlüsselwortprüfung
- **DNS** — Prüfung auf Existenz und Wert von Records (A / AAAA / CNAME / MX / TXT / NS) per DoH
- **TCP-Port** — Erreichbarkeit von Ports über die Workers TCP Socket API
- **SSL-Zertifikat & Domain-Ablauf** erkennen (crt.sh + rdap.org)
- **Fehlerraten-Schwellwert**-Alarme, **Alarm-Eskalation bei aufeinanderfolgenden Fehlern**
- Konfigurierbare Prüfintervalle, Pause/Fortsetzen, Tags, Drag-Sortierung

### Benachrichtigungen (9 Kanäle)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / generischer Webhook
- **E-Mail mit 5 Anbietern**: Resend · SendGrid · Mailgun · Postmark · AWS SES
- Aktivieren/Deaktivieren pro Kanal, Testnachricht, Maskierung von Secrets

### Statusseite
- Öffentliche Statusseite mit Tag-Gruppen, Incident-Zeitleiste, geplanten Wartungen
- **E-Mail-Abonnement** für Incident-Updates, **RSS/Atom-Feed**
- Eigenes Branding: Logo, Titel, Beschreibung, Themes (dunkel/hell)
- **PWA**: installierbar, offline-fähig

### Internationalisierung
- **8 Sprachen**: English · 中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- Konfigurierbare Zeitzone für alle Zeitstempel und Alarme

### Plattform
- **Ein-Klick-Deployment** über den Deploy-to-Cloudflare-Button – kein CLI nötig
- **Automatische Initialisierung**: D1-Schema wird beim ersten Request automatisch erstellt
- **Ein-Klick-Anmeldung**: Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **Offene API**: `GET /api/status`, `GET /feed.xml`, eingehende Webhooks
- **Backup & Wiederherstellung** (JSON-Export, optionales tägliches R2-Backup)
- API keys für Integrationen von Drittanbietern

---

## 🚀 Schnelles Deployment

### Option A: Ein-Klick (empfohlen)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. Klicke auf den Button und melde dich bei Cloudflare an
2. Setze `ADMIN_API_KEY` (dein Admin-Passwort), wenn du dazu aufgefordert wirst
3. Deployment – der Worker erstellt das D1-Datenbankschema beim ersten Besuch automatisch
4. Öffne die Pages-URL (Frontend) → die Statusseite ist live

### Option B: GitHub Actions

Forke dieses Repository und füge dann Secrets hinzu:

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

Push auf `main` → Worker und Pages werden automatisch deployed.

### Option C: Lokal / manuell

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

> 💡 Die manuelle Schema-Ausführung ist optional – der Worker initialisiert sich beim ersten Request automatisch.

---

## 📦 Architektur

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

- **Keine Serverkosten** – alles im Cloudflare Free-Tarif
- Ein Repository, zwei Modi: selbst gehostete Open Source & zukünftiges gehostetes SaaS

---

## 🛠 Entwicklung

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 Lizenz

MIT – siehe [LICENSE](LICENSE). Upstream: [nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).
