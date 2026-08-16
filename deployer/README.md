# MonitorFlare deployer — 一键部署服务

让用户在你的网站上点击"用 Cloudflare 授权部署",自动完成整个部署流程:

1. 用户点击 `/deploy` 页的 **Deploy with Cloudflare** → 跳转 Cloudflare OAuth 授权页
2. 用户登录 CF 并同意权限 → 回调 deployer
3. deployer 自动执行:
   - 创建 D1 数据库
   - 部署 Worker(含 D1 binding、cron、管理密钥)
   - 创建 Pages 项目 + 上传前端
   - 设置环境变量
4. 显示成功页:状态页 URL + 管理后台 URL + 管理员密钥

## 一次性准备

### 1. 注册 Cloudflare OAuth 应用
Cloudflare Dashboard → **Manage Account → OAuth clients → Create client**
- Grant type: **Authorization Code**
- Redirect URL: `https://你的部署域名/api/deploy/callback`
- Scopes:按页面显示的 API 权限名选择,至少包含 Workers Scripts / D1 / Cloudflare Pages 的编辑权限
- 保存 Client ID / Client Secret(只显示一次)

### 2. 创建资源
```bash
npx wrangler kv namespace create monitorflare-deploy-state
npx wrangler r2 bucket create monitorflare-artifacts
npx wrangler d1 create monitorflare-deployer-db   # 可选,当前用 KV 存记录
```

### 3. 配置
复制 `wrangler.example.toml` 为 `wrangler.toml`,填入:
- `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET`
- `OAUTH_SCOPE`(与注册时选择的 scopes 一致)
- `REDIRECT_URI`(与 OAuth 应用注册的回调完全一致)
- `STATE_SECRET`(随机长字符串)
- KV / R2 的 id / bucket_name

### 4. 构建产物并部署
```bash
# 打包 worker bundle + 前端 dist → R2
bash build-artifacts.sh

# 部署 deployer Worker
npx wrangler deploy
```

### 5. 前端启用 OAuth 按钮
构建前端时配置环境变量:
```
VITE_DEPLOY_API_URL=https://你的部署域名   # 显示"用 Cloudflare 授权部署"主按钮
VITE_DEPLOY_GITHUB_URL=https://deploy.workers.cloudflare.com/?url=你的GitHub仓库
```
然后把前端部署到 `monitorflare.csr.plus`(Cloudflare Pages + 自定义域名)。

## API

| 路由 | 说明 |
|---|---|
| `GET /deploy/start` | 生成 state,重定向到 Cloudflare 授权页 |
| `GET /deploy/callback` | 授权回调,换 token 并自动部署 |
| `GET /deploy/status/:id` | 查询部署状态(JSON) |

## 目录结构
```
deployer/
├── src/index.ts          # deployer Worker(OAuth + 部署逻辑)
├── wrangler.example.toml # 配置模板
├── build-artifacts.sh    # 打包 worker bundle + 前端 dist → R2
└── artifacts/            # 构建产物(自动生成)
```
