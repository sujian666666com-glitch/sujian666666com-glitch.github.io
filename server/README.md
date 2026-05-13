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
