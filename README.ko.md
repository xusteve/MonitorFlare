# MonitorFlare

> 서버 비용 제로 웹사이트 모니터링 + 공개 상태 페이지, 모두 Cloudflare 무료 티어에서 실행됩니다.
> [Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor)(MIT) 기반으로 배포되는 강화판입니다.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)
<a href="https://uptime.csr.plus/"><img src="https://monitorflare.csr.plus/uptime-badge.png" height="28" alt="Uptime Status"></a>

**README 언어**: [English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | 한국어 | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

---

## ✨ 기능

### 모니터링
- **HTTP / HTTPS** — GET/POST, 사용자 지정 헤더, 요청 본문, 키워드 검증
- **DNS** — DoH를 통한 레코드 존재 및 값 확인(A / AAAA / CNAME / MX / TXT / NS)
- **TCP 포트** — Workers TCP Socket API를 통한 포트 도달 가능성
- **SSL 인증서 및 도메인 만료** 감지(crt.sh + rdap.org)
- **오류율 임계값** 알림, **연속 실패** 알림 에스컬레이션
- 체크 간격 설정, 일시 중지/재개, 태그, 드래그 정렬
- **Shields.io 스타일 모니터 유형 배지** — 모니터 이름 옆에 SSL / HTTP / HTTPS / DNS / TCP 유형 표시, 호버 시 초록색(전역 CSS 공유, 상태 카드와 상세 페이지 공용)
- **원클릭 SSL 심층 검사** — 모니터 URL 옆 깃발 아이콘으로 `csr.plus/check?domain=...` SSL 분석으로 이동(SSL 만료 추적 활성화 시 표시)

### 알림(9개 채널)
- DingTalk / WeCom / Feishu / Telegram / Slack / Discord / ntfy / 일반 Webhook
- **5개 이메일 제공업체**:Resend · SendGrid · Mailgun · Postmark · AWS SES
- 채널별 활성화/비활성화, 테스트 메시지, 시크릿 마스킹

### 상태 페이지
- 태그 그룹, 인시던트 타임라인, 예정된 점검을 지원하는 공개 상태 페이지
- 인시던트 업데이트 **이메일 구독**, **RSS/Atom 피드**
- 커스텀 브랜딩:로고, 제목, 설명, 테마(다크/라이트)
- **PWA**:설치 가능, 오프라인 지원
- **모니터 상세 페이지**(`/monitor/:id`) — 상태 헤더, 가동률 4칸(24h/7d/30d/90d), 90일 가동률 바, 지연 추세(24h/7d/30d), 최근 50개 점검 로그(실패 강조), 관련 이벤트, 30초 자동 새로고침
- **비공개 상태 페이지** — 공개 또는 비밀번호 보호(SHA-256)+ 7일 잠금 해제 토큰; 모든 공개 엔드포인트 보호(`401 status_page_locked`), 비밀번호 변경 시 전체 로그아웃, 푸터에 "접근 종료" 버튼. 기본 공개, 제로 설정 호환

### 국제화
- **8개 언어**:English · 中文 · 日本語 · 한국어 · Deutsch · Français · Italiano · Español
- 모든 타임스탬프와 알림의 시간대 설정 가능

### 플랫폼
- **원클릭 배포**:Deploy to Cloudflare 버튼, CLI 불필요
- **자동 초기화**:첫 요청 시 D1 스키마 자동 생성
- **원클릭 로그인**:Admin API key · Email magic link · Google · GitHub · Cloudflare Access
- **공개 API**:`GET /api/status`, `GET /feed.xml`, `GET /monitors/public/:id`(`?range`/`?limit`), 인바운드 webhooks; 공개 모니터 데이터에 `check_ssl`/`check_domain` 포함
- **백업 및 복원**(JSON 내보내기, 선택적 R2 일일 백업)
- 서드파티 통합용 API keys

---

## 🚀 빠른 배포

### 옵션 A:원클릭(권장)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xusteve/MonitorFlare)

1. 버튼을 클릭하고 Cloudflare에 로그인
2. 프롬프트에 따라 `ADMIN_API_KEY`(관리자 비밀번호)를 설정
3. 배포 — Worker가 첫 방문 시 D1 데이터베이스 스키마를 자동 생성
4. Pages URL(프론트엔드) 열기 → 상태 페이지 활성화

### 옵션 B:GitHub Actions

이 저장소를 Fork한 후 secrets를 추가하세요:

| Secret | Required | Description |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token (Workers/Pages/D1 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | Cloudflare account ID |
| `D1_DATABASE_ID` | ✅ | D1 database ID |
| `ADMIN_API_KEY` | ✅ | Admin password |
| `MAGIC_LINK_SECRET` | optional | Magic link signing key |
| `VITE_CF_ANALYTICS_TOKEN` | optional | Cloudflare Web Analytics |

Vars: `ALLOWED_ORIGIN`, `SESSION_TTL_HOURS`, `BASE_URL`, `VITE_FOOTER_AUTHOR`, `VITE_FOOTER_URL`

`main`에 푸시 → Worker와 Pages가 자동으로 배포됩니다.

### 옵션 C:로컬 / 수동

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

> 💡 수동 스키마 실행은 선택 사항입니다 — Worker가 첫 요청 시 자동 초기화됩니다.

---

## 📦 아키텍처

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

- **서버 비용 제로** — 모두 Cloudflare 무료 티어 내
- 단일 저장소, 두 가지 모드:셀프 호스팅 오픈소스 & 향후 호스팅 SaaS

---

## 🛠 개발

```bash
# Worker (backend)
cd worker && npm run dev          # http://127.0.0.1:8787

# Frontend
cd frontend && npm run dev        # http://localhost:5173 (proxies /api → 8787)
```

## 📄 라이선스

MIT — [LICENSE](LICENSE) 참조. 업스트림:[nianshu2022/Uptime-Monitor](https://github.com/nianshu2022/Uptime-Monitor)(MIT).
