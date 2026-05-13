## 1. OpenSpec 与数据结构

- [x] 1.1 新建 `floating-message-wall` 变更并用中文记录 proposal、任务和验收场景
- [x] 1.2 新增 D1 migration，创建 `wall_messages` 表和必要索引
- [x] 1.3 在 `wrangler.toml` 中声明 `WALL_DB` 绑定占位配置

## 2. 前台留言墙

- [x] 2.1 将 `/gallery/` 改为“路过的人”页面并隐藏传统标题、页脚和聊天组件
- [x] 2.2 基于用户提供样式新增作用域化毛玻璃留言墙 CSS
- [x] 2.3 新增留言墙前端 JS，实现列表加载、滚动分页、弹窗提交和错误提示
- [x] 2.4 桌面端保留第一屏漂浮散落感，后续留言可向下滚动延伸
- [x] 2.5 移动端降级为可读的瀑布/单列布局，取消大幅旋转

## 3. Worker API

- [x] 3.1 保留原聊天代理能力，并按路径新增留言墙路由
- [x] 3.2 实现 `GET /api/wall/messages`，只返回可见留言和分页 cursor
- [x] 3.3 实现 `POST /api/wall/messages`，校验纯文本、长度、HTML、外链、敏感词和重复提交
- [x] 3.4 实现北京时间自然日全站最多 100 条提交限制
- [x] 3.5 实现隐藏管理接口：查看全部、隐藏、恢复、删除

## 4. 后台管理

- [x] 4.1 新增隐藏页面 `/wall-admin/`
- [x] 4.2 管理页通过 `WALL_ADMIN_TOKEN` 调用 Worker 管理接口
- [x] 4.3 管理页展示内容、状态、提交时间、IP、User-Agent、Referer，并提供隐藏/恢复/删除操作

## 5. 验证

- [x] 5.1 执行 `hugo --gc --minify`
- [x] 5.2 执行 Worker 语法校验
- [x] 5.3 本地浏览器检查桌面端与移动端关键视觉

## 6. 服务器本地 SQLite + Node API 调整

- [x] 6.1 将方案从 Cloudflare D1 调整为服务器本地 SQLite + Node API，并更新中文 proposal
- [x] 6.2 新增 `server/wall-api.mjs`，使用 SQLite 保存留言并实现公开/管理接口
- [x] 6.3 新增 systemd 服务文件和 Nginx `/api/wall/` 反代示例
- [x] 6.4 调整 `/gallery/` 与 `/wall-admin/` 默认使用同域 API，不再自动指向 Worker
- [x] 6.5 本地验证 Node API：正常提交、非法内容、隐藏/恢复/删除、每日上限
- [x] 6.6 重新执行 `hugo --gc --minify`
- [x] 6.7 部署到 `43.135.48.207`：安装运行环境、启动服务、配置 Nginx、验证线上接口
