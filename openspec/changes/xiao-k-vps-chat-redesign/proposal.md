## 为什么

当前小 k 聊天面板头部控件过多，模型选择、思考、RAG、兼容等开关挤在一行，视觉上显得拥挤。聊天代理仍默认指向 Cloudflare Worker，不符合本次希望将 key 放在 `43.135.48.207` VPS 环境变量中的部署方式。

## 改动内容

- 将小 k 聊天代理迁到 VPS Node 服务，前端请求 `https://sujian.online/api/chat`。
- DashScope key 仅写入服务器环境变量，不进入仓库、前端和构建产物。
- 小 k 面板改成浅色可爱风格，头部只保留头像、名称、在线状态、清空和关闭。
- 隐藏模型、RAG、思考和兼容控件，保留默认模型与 RAG 行为。
- 点击小 k 浮动头像、头部头像或消息头像时显示资料卡。

## 范围

- 新增 VPS 本地聊天 API 服务与 systemd/Nginx 配置示例。
- 调整聊天组件 HTML、JS 和 CSS。
- 更新聊天代理地址配置和部署说明。

## 不做什么

- 不删除原 Cloudflare Worker 源码。
- 不做复杂设置弹层。
- 不新增独立资料页面路由。

## 影响

- 小 k 默认聊天链路切换为 `sujian.online` VPS。
- 服务器需配置 `/etc/my-blog-chat.env`，否则聊天 API 会返回缺少 API key。
