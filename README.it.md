# MonitorFlare

> Monitoraggio di siti web a costo server zero + pagina di stato pubblica, tutto nella fascia gratuita di Cloudflare.
> Versione potenziata distribuita a partire da [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)
[![Uptime Status](https://monitorflare.csr.plus/uptime-badge.png)](https://uptime.csr.plus/)

**Lingue del README**: [English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | Italiano | [Español](README.es.md)

---

## ✨ Funzionalità

### Monitoraggio
- **HTTP / HTTPS** — GET/POST, intestazioni personalizzate, corpo della richiesta, validazione delle parole chiave
- **DNS** — verifica di esistenza e valore dei record (A / AAAA / CNAME / MX / TXT / NS) tramite DoH
- **Porta TCP** — raggiungibilità delle porte tramite l'API Workers TCP Socket
- **Rilevamento scadenza** di certificati SSL e domini (crt.sh + rdap.org)
- Avvisi su **soglia di tasso di errore**, **escalation degli avvisi su fallimenti consecutivi**
- Intervalli di controllo configurabili, pausa/ripresa, tag, ordinamento tramite trascinamento

### Notifiche (9 canali)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / Webhook generico
- **E-mail con 5 provider**: Resend · SendGrid · Mailgun · Postmark · AWS SES
- Attivazione/disattivazione per canale, messaggio di prova, mascheramento dei segreti

### Pagina di stato
- Pagina di stato pubblica con gruppi di tag, cronologia degli incidenti, manutenzioni programmate
- **Iscrizione via e-mail** agli aggiornamenti degli incidenti, **feed RSS/Atom**
- Branding personalizzato: logo, titolo, descrizione, temi (scuro/chiaro)
- **PWA**: installabile, utilizzabile offline

### Internazionalizzazione
- **8 lingue**: English · 中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- Fuso orario configurabile per tutti i timestamp e gli avvisi

### Piattaforma
- **Deploy in un clic** tramite il pulsante Deploy to Cloudflare — nessuna CLI necessaria
- **Inizializzazione automatica**: lo schema D1 viene creato automaticamente alla prima richiesta
- **Accesso in un clic**: Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **API aperta**: `GET /api/status`, `GET /feed.xml`, webhook in entrata
- **Backup e ripristino** (esportazione JSON, backup giornaliero R2 opzionale)
- API keys per integrazioni di terze parti

---

## 🚀 Distribuzione rapida

### Opzione A: Un clic (consigliata)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. Fai clic sul pulsante e accedi a Cloudflare
2. Imposta `ADMIN_API_KEY` (la tua password di amministratore) quando richiesto
3. Distribuisci — il Worker crea automaticamente lo schema del database D1 alla prima visita
4. Apri l'URL Pages (frontend) → la pagina di stato è attiva

### Opzione B: GitHub Actions

Fai il fork di questo repository, poi aggiungi i secrets:

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

Esegui il push su `main` → Worker e Pages vengono distribuiti automaticamente.

### Opzione C: Locale / manuale

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

> 💡 L'esecuzione manuale dello schema è facoltativa — il Worker si inizializza automaticamente alla prima richiesta.

---

## 📦 Architettura

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

- **Costo server zero** — tutto nella fascia gratuita di Cloudflare
- Repository unico, due modalità: open source self-hosted & futuro SaaS ospitato

---

## 🛠 Sviluppo

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 Licenza

MIT — vedi [LICENSE](LICENSE). A monte: [nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).
