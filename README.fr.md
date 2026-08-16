# MonitorFlare

> Surveillance de sites web à coût serveur nul + page de statut publique, le tout dans l'offre gratuite de Cloudflare.
> Version améliorée distribuée à partir d'[Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

**Langues du README** : [English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | Français | [Italiano](README.it.md) | [Español](README.es.md)

---

## ✨ Fonctionnalités

### Surveillance
- **HTTP / HTTPS** — GET/POST, en-têtes personnalisés, corps de requête, validation par mot-clé
- **DNS** — vérification de l'existence et de la valeur des enregistrements (A / AAAA / CNAME / MX / TXT / NS) via DoH
- **Port TCP** — accessibilité des ports via l'API Workers TCP Socket
- **Détection de l'expiration** des certificats SSL et des domaines (crt.sh + rdap.org)
- Alertes sur **seuil de taux d'erreur**, **escalade des alertes en cas d'échecs consécutifs**
- Intervalles de vérification configurables, pause/reprise, étiquettes, tri par glisser-déposer

### Notifications (9 canaux)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / Webhook générique
- **E-mail avec 5 fournisseurs** : Resend · SendGrid · Mailgun · Postmark · AWS SES
- Activation/désactivation par canal, message de test, masquage des secrets

### Page de statut
- Page de statut publique avec groupes d'étiquettes, chronologie des incidents, maintenances planifiées
- **Abonnement par e-mail** aux mises à jour d'incidents, **flux RSS/Atom**
- Personnalisation : logo, titre, description, thèmes (sombre/clair)
- **PWA** : installable, fonctionne hors ligne

### Internationalisation
- **8 langues** : English · 中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- Fuseau horaire configurable pour tous les horodatages et alertes

### Plateforme
- **Déploiement en un clic** via le bouton Deploy to Cloudflare — pas de CLI nécessaire
- **Initialisation automatique** : le schéma D1 est créé automatiquement à la première requête
- **Connexion en un clic** : Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **API ouverte** : `GET /api/status`, `GET /feed.xml`, webhooks entrants
- **Sauvegarde et restauration** (export JSON, sauvegarde quotidienne R2 optionnelle)
- API keys pour les intégrations tierces

---

## 🚀 Déploiement rapide

### Option A : Un clic (recommandé)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. Cliquez sur le bouton et connectez-vous à Cloudflare
2. Définissez `ADMIN_API_KEY` (votre mot de passe administrateur) lorsque vous y êtes invité
3. Déployez — le Worker crée automatiquement le schéma de la base D1 à la première visite
4. Ouvrez l'URL Pages (frontend) → la page de statut est en ligne

### Option B : GitHub Actions

Forkez ce dépôt, puis ajoutez des secrets :

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

Poussez sur `main` → le Worker et Pages se déploient automatiquement.

### Option C : Local / manuel

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

> 💡 L'exécution manuelle du schéma est facultative — le Worker s'initialise automatiquement à la première requête.

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

- **Coût serveur nul** — le tout dans la gratuité de Cloudflare
- Un seul dépôt, deux modes : open source auto-hébergé & futur SaaS hébergé

---

## 🛠 Développement

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 Licence

MIT — voir [LICENSE](LICENSE). En amont : [nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).
