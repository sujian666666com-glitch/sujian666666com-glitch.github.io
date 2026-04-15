#!/usr/bin/env bash
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

# 读取 .env 中的密钥
if [ -f .env ]; then
  # shellcheck disable=SC1091
  source <(grep -v '^\s*#' .env | grep DASHSCOPE_API_KEY | sed 's/^/export /')
fi
DASHSCOPE_API_KEY="${DASHSCOPE_API_KEY:?'请设置 DASHSCOPE_API_KEY 环境变量或在 .env 中配置'}"

# 增量构建 RAG 索引
echo "==> 构建 RAG 索引…"
node scripts/build-rag.mjs

# 检查是否有变化
if git diff --quiet static/rag-vectors.json && \
   ! git ls-files --error-unmatch static/rag-vectors.json >/dev/null 2>&1; then
  echo "==> 索引无变化，跳过提交"
  exit 0
fi

if git diff --quiet static/rag-vectors.json; then
  echo "==> 索引无变化，跳过提交"
  exit 0
fi

# 提交并推送
echo "==> 提交更新的索引…"
git add static/rag-vectors.json
git commit -m "chore(rag): update vector index $(date +%Y-%m-%d)"
echo "==> 推送到远端…"
git push origin HEAD
echo "==> 完成"
