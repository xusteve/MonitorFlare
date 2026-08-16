#!/usr/bin/env bash
# ============================================================
# MonitorFlare deployer — 构建产物脚本
# 1. 用 esbuild 打包 worker/src/*.ts → 单文件 bundle
# 2. 复制前端 dist 产物
# 3. 上传到 R2(monitorflare-artifacts)
# 用法: bash build-artifacts.sh
# 前置:worker 与 frontend 依赖已安装;R2 bucket 已创建;
#       wrangler 已登录(或设置 CLOUDFLARE_API_TOKEN/ACCOUNT_ID 环境变量)
# ============================================================
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE_KEY="${WORKER_BUNDLE_KEY:-monitorflare/worker.mjs}"
FRONTEND_PREFIX="${FRONTEND_PREFIX:-monitorflare/frontend/}"
R2_BUCKET="${R2_BUCKET:-monitorflare-artifacts}"

echo "==> [1/3] 打包 Worker bundle(esbuild)"
cd "$ROOT/worker"
npx esbuild src/index.ts \
  --bundle \
  --format=esm \
  --target=es2022 \
  --external:cloudflare:sockets \
  --outfile="$ROOT/deployer/artifacts/worker.mjs" \
  --log-level=warning
echo "    bundle: $(du -h "$ROOT/deployer/artifacts/worker.mjs" | cut -f1)"

echo "==> [2/3] 准备前端产物"
if [ ! -d "$ROOT/frontend/dist" ]; then
  echo "    frontend/dist 不存在,先执行: cd frontend && npm run build"
  exit 1
fi
rm -rf "$ROOT/deployer/artifacts/frontend"
mkdir -p "$ROOT/deployer/artifacts/frontend"
cp -r "$ROOT/frontend/dist/." "$ROOT/deployer/artifacts/frontend/"
echo "    files: $(find "$ROOT/deployer/artifacts/frontend" -type f | wc -l)"

echo "==> [3/3] 上传到 R2: $R2_BUCKET"
cd "$ROOT/deployer"
npx wrangler r2 object put "$R2_BUCKET/$BUNDLE_KEY" --file="artifacts/worker.mjs" --content-type="application/javascript" --content-encoding="gzip" 2>/dev/null \
  || npx wrangler r2 object put "$R2_BUCKET/$BUNDLE_KEY" --file="artifacts/worker.mjs" --content-type="application/javascript"
# 上传前端(压缩为单个 zip 或逐文件;这里逐文件上传,小项目足够)
find artifacts/frontend -type f | while read -r f; do
  rel="${f#artifacts/frontend/}"
  npx wrangler r2 object put "$R2_BUCKET/$FRONTEND_PREFIX$rel" --file="$f" > /dev/null
done
echo "    前端文件已上传($(find artifacts/frontend -type f | wc -l) 个)"

echo "==> 完成。产物已在 R2: $R2_BUCKET"
