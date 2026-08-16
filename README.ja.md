# MonitorFlare

> サーバー費用ゼロのWebサイト監視 + 公開ステータスページ。すべて Cloudflare の無料枠内で動作します。
> [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor)(MIT)を基に配布される強化版です。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)
<a href="https://uptime.csr.plus/"><img src="https://monitorflare.csr.plus/uptime-badge.png" height="28" alt="Uptime Status"></a>

**README 言語**: [English](README.md) | [中文](README.zh.md) | 日本語 | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

---

## ✨ 機能

### モニタリング
- **HTTP / HTTPS** — GET/POST、カスタムヘッダー、リクエストボディ、キーワード検証
- **DNS** — DoH 経由でレコードの存在・値チェック(A / AAAA / CNAME / MX / TXT / NS)
- **TCP ポート** — Workers TCP Socket API によるポート到達性チェック
- **SSL 証明書・ドメイン期限**の検出(crt.sh + rdap.org)
- **エラー率しきい値**アラート、**連続失敗**によるアラートエスカレーション
- チェック間隔の設定、一時停止/再開、タグ、ドラッグ並べ替え

### 通知(9 チャンネル)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / 汎用 Webhook
- **5 つのメールプロバイダー**:Resend · SendGrid · Mailgun · Postmark · AWS SES
- チャンネルごとの有効/無効、テストメッセージ、シークレットのマスキング

### ステータスページ
- タググループ、インシデントタイムライン、計画メンテナンスに対応した公開ステータスページ
- インシデント更新の**メール購読**、**RSS/Atom フィード**
- カスタムブランディング:ロゴ、タイトル、説明、テーマ(ダーク/ライト)
- **PWA**:インストール可能、オフライン対応

### 国際化
- **8 言語**:English · 中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- すべてのタイムスタンプとアラートでタイムゾーンを設定可能

### プラットフォーム
- **ワンクリックデプロイ**:Deploy to Cloudflare ボタンで CLI 不要
- **自動初期化**:最初のリクエストで D1 スキーマを自動作成
- **ワンクリックサインイン**:Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **オープン API**:`GET /api/status`、`GET /feed.xml`、受信 Webhook
- **バックアップと復元**(JSON エクスポート、オプションの R2 毎日バックアップ)
- サードパーティ連携用の API keys

---

## 🚀 クイックデプロイ

### オプション A:ワンクリック(推奨)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. ボタンをクリックして Cloudflare にログイン
2. プロンプトに従って `ADMIN_API_KEY`(管理者パスワード)を設定
3. デプロイ — Worker は初回アクセス時に D1 データベーススキーマを自動作成
4. Pages の URL(フロントエンド)を開く → ステータスページが稼働

### オプション B:GitHub Actions

このリポジトリを Fork し、secrets を追加してください:

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

`main` にプッシュ → Worker と Pages が自動デプロイされます。

### オプション C:ローカル / 手動

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

> 💡 手動でのスキーマ実行は任意です — Worker は最初のリクエスト時に自動初期化されます。

---

## 📦 アーキテクチャ

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

- **サーバー費用ゼロ** — すべて Cloudflare の無料枠内
- 単一リポジトリ、2 つのモード:セルフホストのオープンソース & 将来のホスト型 SaaS

---

## 🛠 開発

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 ライセンス

MIT — [LICENSE](LICENSE) を参照。アップストリーム:[nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor)(MIT)。
