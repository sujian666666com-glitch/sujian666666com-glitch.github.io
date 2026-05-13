## 技术设计

### 运行形态

留言墙前台仍由 Hugo 静态页面提供，线上目录为 `/var/www/my-blog`。留言 API 不再部署到 Cloudflare Worker，而是运行在 `43.135.48.207` 本机：

- Node 服务：`/opt/my-blog-wall/wall-api.mjs`
- SQLite 数据库：`/var/lib/my-blog-wall/wall.db`
- systemd 服务：`my-blog-wall.service`
- 本机监听：`127.0.0.1:8787`
- Nginx 反代：`/api/wall/` -> `http://127.0.0.1:8787`

### 数据结构

`wall_messages` 表保存公开展示与后台管理需要的数据：

- `id`：UUID 主键
- `content`：留言正文
- `status`：`visible` 或 `hidden`
- `created_at`：ISO 时间
- `day_key`：北京时间自然日，格式 `YYYY-MM-DD`
- `ip`、`user_agent`、`referer`：后台排查与管理字段

服务启动时自动执行建表和索引初始化，避免部署时遗漏数据库初始化步骤。

### 接口

- `GET /api/wall/messages?limit=48&cursor=...`：返回可见留言和下一页 cursor
- `POST /api/wall/messages`：匿名提交留言
- `GET /api/wall/admin/messages`：管理员查看全部留言
- `PATCH /api/wall/admin/messages/:id/hide`：隐藏留言
- `PATCH /api/wall/admin/messages/:id/show`：恢复留言
- `DELETE /api/wall/admin/messages/:id`：删除留言

后台接口使用 `Authorization: Bearer <WALL_ADMIN_TOKEN>` 校验。前台页面不展示昵称、时间、IP、User-Agent、Referer。

### 校验与限制

提交侧保留 MVP 限制：

- 内容必须为 1–80 字纯文本
- 禁止 HTML、外链和简单敏感词
- 同 IP 一小时内禁止重复提交同一句话
- 全站每天最多 100 条，按北京时间自然日统计

### 部署影响

这次调整让留言墙能力完全落在 `43.135.48.207`，不再要求配置 Cloudflare D1。Cloudflare Worker 仍可继续用于原聊天代理，不作为留言墙线上依赖。
