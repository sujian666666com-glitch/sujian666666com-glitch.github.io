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

`chat-api.mjs` 是小 k 的 VPS 本地聊天代理。前端只请求 `/api/chat`，不会暴露 key；服务端读取 `/etc/my-blog-chat.env` 中的 `BIGMODEL_API_KEY`（兼容 `ANTHROPIC_AUTH_TOKEN`），通过智谱 Coding Plan / Claude API 兼容口调用 GLM 模型。RAG embedding 单独读取 `SILICONFLOW_API_KEY`。

当前主链路：

- 聊天上游：`BIGMODEL_ANTHROPIC_BASE_URL`，默认 `https://open.bigmodel.cn/api/anthropic`
- 聊天接口：`${BIGMODEL_ANTHROPIC_BASE_URL}/v1/messages`
- RAG 向量上游：`RAG_EMBEDDING_BASE_URL`，默认 `https://api.siliconflow.cn/v1`
- RAG 默认 provider：`siliconflow`
- RAG 默认模型：`Qwen/Qwen3-Embedding-0.6B`
- RAG 默认维度：`1024`
- RAG 构建批量大小：`RAG_EMBEDDING_BATCH_SIZE`，默认 `1`

线上部署位置：

- 服务代码：`/opt/my-blog-chat/chat-api.mjs`
- systemd：`/etc/systemd/system/my-blog-chat.service`
- 环境文件：`/etc/my-blog-chat.env`
- Nginx：在站点 server 块内添加 `server/nginx-chat-location.conf` 中的 `/api/chat` 反代

`/etc/my-blog-chat.env` 示例：

```bash
BIGMODEL_API_KEY=your_zhipu_api_key
SILICONFLOW_API_KEY=your_siliconflow_api_key
# 或使用 Claude Code 同名配置：
# ANTHROPIC_AUTH_TOKEN=your_zhipu_api_key
```

更新 RAG 索引：

```bash
SILICONFLOW_API_KEY=your_siliconflow_api_key npm run build:rag
```

本地语法验证：

```bash
node --check server/chat-api.mjs
```

本地接口验证：

```bash
CHAT_API_PORT=18788 BIGMODEL_API_KEY=your_zhipu_api_key SILICONFLOW_API_KEY=your_siliconflow_api_key node server/chat-api.mjs
curl http://127.0.0.1:18788/health
curl -N http://127.0.0.1:18788/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"model":"glm-5.1","stream":false,"enable_rag":false,"messages":[{"role":"user","content":"你好"}]}'
```

## 小 k 音乐 API

`music-api.mjs` 是小 k 音乐播放器的 VPS 本地代理。前端只请求 `/api/music/*`；服务端再转发到自管 `NeteaseCloudMusicApi` 上游，统一做响应标准化、短期内存缓存和错误降级。音乐服务异常时只影响播放器，不影响 `/api/chat`。

环境变量：

- `MUSIC_API_HOST`：默认 `127.0.0.1`
- `MUSIC_API_PORT`：默认 `8789`
- `MUSIC_API_UPSTREAM`：默认 `http://127.0.0.1:3000`，指向自管 `NeteaseCloudMusicApi`
- `MUSIC_ALLOWED_ORIGINS`：允许访问音乐 API 的站点来源；未配置时复用聊天/留言墙默认白名单

线上部署位置：

- 服务代码：`/opt/my-blog-music/music-api.mjs`
- systemd：`/etc/systemd/system/my-blog-music.service`
- 环境文件：`/etc/my-blog-music.env`
- Nginx：在站点 server 块内添加 `server/nginx-music-location.conf` 中的 `/api/music/` 反代

`/etc/my-blog-music.env` 示例：

```bash
MUSIC_API_UPSTREAM=http://127.0.0.1:3000
MUSIC_ALLOWED_ORIGINS=https://sujian.online,https://www.sujian.online
```

本地语法验证：

```bash
node --check server/music-api.mjs
```

本地接口验证：

```bash
MUSIC_API_PORT=18789 MUSIC_API_UPSTREAM=http://127.0.0.1:3000 node server/music-api.mjs
curl http://127.0.0.1:18789/health
curl 'http://127.0.0.1:18789/api/music/search?q=月光&limit=5'
curl 'http://127.0.0.1:18789/api/music/url?id=有效歌曲id'
```

## 计划追踪热力图 API

`tracker-api.mjs` 是 `/tracker/` 页面的后端，用于记录多个计划（考研、健身等）的每日完成度、备注和贴图，并以 GitHub 风格热力图展示。使用 Node.js 内置 `node:sqlite`，无外部依赖。数据公开只读，写操作需鉴权（密码登录拿 JWT，或用长期 API Token）。

### 环境变量

- `TRACKER_API_HOST`：默认 `127.0.0.1`
- `TRACKER_API_PORT`：默认 `8791`
- `TRACKER_DB_PATH`：默认 `/var/lib/my-blog-tracker/tracker.db`
- `TRACKER_JWT_SECRET`：JWT 签名密钥，必须在 `/etc/my-blog-tracker.env` 中配置
- `TRACKER_PASSWORD_HASH` / `TRACKER_PASSWORD_SALT`：登录密码的 scrypt 校验值，必须配置
- `TRACKER_API_TOKEN`：长期 API Token，给脚本/手机端写入用，可选但推荐
- `TRACKER_JWT_TTL_MS`：JWT 有效期，默认 30 天
- `TRACKER_ALLOWED_ORIGINS`：CORS 白名单，逗号分隔，默认 `sujian.online` 系列

### 线上部署位置

- 服务代码：`/opt/my-blog-tracker/tracker-api.mjs`
- 数据库：`/var/lib/my-blog-tracker/tracker.db`
- systemd：`/etc/systemd/system/my-blog-tracker.service`
- 环境文件：`/etc/my-blog-tracker.env`（`chmod 600`）
- Nginx：在站点 server 块内添加 `server/nginx-tracker-location.conf` 中的 `/api/tracker/` 反代

### 生成密码校验值

```bash
# 1) 生成随机 salt 和密钥
SALT=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))")
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# 2) 把“你的密码”和上面的 salt 代入，生成 hash
HASH=$(node -e "console.log(require('crypto').scryptSync('你的密码','$SALT',64).toString('base64'))")
# 3) 写入 /etc/my-blog-tracker.env
cat >> /etc/my-blog-tracker.env <<EOF
TRACKER_JWT_SECRET=$SECRET
TRACKER_PASSWORD_SALT=$SALT
TRACKER_PASSWORD_HASH=$HASH
TRACKER_API_TOKEN=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
EOF
chmod 600 /etc/my-blog-tracker.env
```

### 本地验证

```bash
mkdir -p tmp
TRACKER_DB_PATH=./tmp/tracker.db \
TRACKER_JWT_SECRET=dev-secret \
TRACKER_PASSWORD_SALT=$(node -e "console.log(require('crypto').randomBytes(16).toString('base64'))") \
TRACKER_PASSWORD_HASH=$(node -e "console.log(require('crypto').scryptSync('devpass',process.env.TRACKER_PASSWORD_SALT,64).toString('base64'))" 2>/dev/null || true) \
TRACKER_API_PORT=18791 \
node server/tracker-api.mjs

curl http://127.0.0.1:18791/health
curl http://127.0.0.1:18791/api/tracker/plans
curl -X POST http://127.0.0.1:18791/api/tracker/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"devpass"}'
```
