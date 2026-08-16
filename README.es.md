# MonitorFlare

> Monitoreo de sitios web con costo de servidor cero + página de estado pública, todo dentro del plan gratuito de Cloudflare.
> Versión mejorada distribuida a partir de [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)
[![Uptime Status](https://monitorflare.csr.plus/uptime-badge.png)](https://uptime.csr.plus/)

**Idiomas del README**: [English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | Español

---

## ✨ Funciones

### Monitoreo
- **HTTP / HTTPS** — GET/POST, encabezados personalizados, cuerpo de la solicitud, validación de palabras clave
- **DNS** — verificación de existencia y valor de registros (A / AAAA / CNAME / MX / TXT / NS) vía DoH
- **Puerto TCP** — accesibilidad de puertos mediante la API Workers TCP Socket
- **Detección de caducidad** de certificados SSL y dominios (crt.sh + rdap.org)
- Alertas por **umbral de tasa de error**, **escalado de alertas ante fallos consecutivos**
- Intervalos de verificación configurables, pausa/reanudación, etiquetas, ordenación por arrastre

### Notificaciones (9 canales)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / Webhook genérico
- **Correo electrónico con 5 proveedores**: Resend · SendGrid · Mailgun · Postmark · AWS SES
- Activación/desactivación por canal, mensaje de prueba, enmascaramiento de secretos

### Página de estado
- Página de estado pública con grupos de etiquetas, línea de tiempo de incidentes, mantenimientos programados
- **Suscripción por correo** a actualizaciones de incidentes, **feed RSS/Atom**
- Marca personalizada: logotipo, título, descripción, temas (oscuro/claro)
- **PWA**: instalable, funciona sin conexión

### Internacionalización
- **8 idiomas**: English · 中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- Zona horaria configurable para todas las marcas de tiempo y alertas

### Plataforma
- **Despliegue en un clic** mediante el botón Deploy to Cloudflare — sin necesidad de CLI
- **Inicialización automática**: el esquema D1 se crea automáticamente en la primera solicitud
- **Inicio de sesión en un clic**: Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **API abierta**: `GET /api/status`, `GET /feed.xml`, webhooks entrantes
- **Copia de seguridad y restauración** (exportación JSON, copia diaria opcional en R2)
- API keys para integraciones de terceros

---

## 🚀 Despliegue rápido

### Opción A: Un clic (recomendada)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. Haz clic en el botón e inicia sesión en Cloudflare
2. Configura `ADMIN_API_KEY` (tu contraseña de administrador) cuando se te solicite
3. Despliega — el Worker crea automáticamente el esquema de la base de datos D1 en la primera visita
4. Abre la URL de Pages (frontend) → la página de estado está en línea

### Opción B: GitHub Actions

Haz fork de este repositorio y luego añade los secrets:

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

Haz push a `main` → Worker y Pages se despliegan automáticamente.

### Opción C: Local / manual

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

> 💡 La ejecución manual del esquema es opcional — el Worker se inicializa automáticamente en la primera solicitud.

---

## 📦 Arquitectura

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

- **Costo de servidor cero** — todo dentro del plan gratuito de Cloudflare
- Un solo repositorio, dos modos: open source autohospedado y futuro SaaS alojado

---

## 🛠 Desarrollo

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 Licencia

MIT — consulta [LICENSE](LICENSE). Aguas arriba: [nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor) (MIT).
