## 1. VPS 聊天代理

- [x] 1.1 新增 `server/chat-api.mjs`，兼容现有聊天请求体并转发 DashScope
- [x] 1.2 新增 `my-blog-chat.service` 和 Nginx `/api/chat` 反代示例
- [x] 1.3 将前端聊天代理地址改为 `https://sujian.online/api/chat`

## 2. 小 k 界面

- [x] 2.1 简化聊天头部，隐藏模型和高级开关
- [x] 2.2 改为浅色可爱视觉风格
- [x] 2.3 增加小 k 资料卡和头像点击入口
- [x] 2.4 给 `chat-ui.js` 增加版本参数，避免线上浏览器继续使用旧缓存

## 3. 验证与部署

- [x] 3.1 执行 `node --check server/chat-api.mjs`
- [x] 3.2 执行 `node --check static/chat-ui.js`
- [x] 3.3 执行 `hugo --gc --minify`
- [x] 3.4 部署到 `43.135.48.207`，写入 `/etc/my-blog-chat.env` 并启动服务
- [x] 3.5 验证 `https://sujian.online/api/chat` 流式/非流式请求正常
- [x] 3.6 浏览器验证小 k 面板恢复、顶部控件隐藏和资料卡入口
- [x] 3.7 线上故障备注：`https://sujian.online/api/chat` 代理本身可达，但 DashScope 返回 `Arrearage` 欠费/账号状态错误；正确期望是前端展示中文可执行提示，提示处理阿里云 Model Studio 欠费或更换服务器环境变量 `DASHSCOPE_API_KEY`
