# 留言墙本地 API

`wall-api.mjs` 是 `/gallery/` 匿名留言墙的服务器本地 API，使用 Node.js 内置 `node:sqlite` 和 SQLite 文件，不依赖 Cloudflare D1。

## 环境变量

- `WALL_API_HOST`：默认 `127.0.0.1`
- `WALL_API_PORT`：默认 `8787`
- `WALL_DB_PATH`：默认 `/var/lib/my-blog-wall/wall.db`
- `WALL_ADMIN_TOKEN`：后台 `/wall-admin/` 管理口令，必须在 `/etc/my-blog-wall.env` 中配置

## 线上部署位置

- 服务代码：`/opt/my-blog-wall/wall-api.mjs`
- 数据库：`/var/lib/my-blog-wall/wall.db`
- systemd：`/etc/systemd/system/my-blog-wall.service`
- Nginx：在站点 server 块内添加 `server/nginx-wall-location.conf` 中的 `/api/wall/` 反代

## 本地验证

```bash
mkdir -p tmp
WALL_DB_PATH=./tmp/wall.db WALL_ADMIN_TOKEN=dev-token node server/wall-api.mjs
curl http://127.0.0.1:8787/api/wall/messages
```

## 小 k 聊天 API

`chat-api.mjs` 是小 k 的 VPS 本地聊天代理。前端只请求 `/api/chat`，不会暴露 key；服务端读取 `/etc/my-blog-chat.env` 中的 `BIGMODEL_API_KEY`（兼容 `ANTHROPIC_AUTH_TOKEN`），通过智谱 Coding Plan / Claude API 兼容口调用 GLM 模型。

当前主链路：

- 聊天上游：`BIGMODEL_ANTHROPIC_BASE_URL`，默认 `https://open.bigmodel.cn/api/anthropic`
- 聊天接口：`${BIGMODEL_ANTHROPIC_BASE_URL}/v1/messages`
- RAG 向量上游：`BIGMODEL_EMBEDDING_BASE_URL`，默认 `https://open.bigmodel.cn/api/paas/v4`
- RAG 默认模型：`embedding-3`
- RAG 默认维度：`1024`

线上部署位置：

- 服务代码：`/opt/my-blog-chat/chat-api.mjs`
- systemd：`/etc/systemd/system/my-blog-chat.service`
- 环境文件：`/etc/my-blog-chat.env`
- Nginx：在站点 server 块内添加 `server/nginx-chat-location.conf` 中的 `/api/chat` 反代

`/etc/my-blog-chat.env` 示例：

```bash
BIGMODEL_API_KEY=your_zhipu_api_key
# 或使用 Claude Code 同名配置：
# ANTHROPIC_AUTH_TOKEN=your_zhipu_api_key
```

更新 RAG 索引：

```bash
BIGMODEL_API_KEY=your_zhipu_api_key npm run build:rag
```

本地语法验证：

```bash
node --check server/chat-api.mjs
```

本地接口验证：

```bash
CHAT_API_PORT=18788 BIGMODEL_API_KEY=your_zhipu_api_key node server/chat-api.mjs
curl http://127.0.0.1:18788/health
curl -N http://127.0.0.1:18788/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"glm-5.1","stream":false,"enable_rag":false,"messages":[{"role":"user","content":"你好"}]}'
```
