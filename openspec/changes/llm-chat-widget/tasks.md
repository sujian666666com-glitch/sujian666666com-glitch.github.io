## 1. 项目配置与基础设施

- [ ] 1.1 规范化 `.env` 文件格式为标准 KEY=VALUE，新增 CHAT_PROXY_URL、CHAT_DEFAULT_MODEL 配置项
- [ ] 1.2 在 `.gitignore` 中添加 `openspec/changes/*/.runs/` 排除规则和 `.env` 排除规则
- [ ] 1.3 创建 `data/chat.yaml` 配置文件，定义模型列表（id + label）和默认模型

## 2. API 代理层（Cloudflare Worker）

- [ ] 2.1 创建 `static/chat-worker.js`，实现基础代理：接收 POST 请求，注入 API Key，转发到 DashScope，支持 SSE 流式响应
- [ ] 2.2 在 Worker 中实现 CORS 处理（OPTIONS 预检 + POST 响应头）
- [ ] 2.3 在 Worker 中实现请求体校验（必需字段 messages、model）和模型白名单校验
- [ ] 2.4 在 Worker 中实现基于 IP 的速率限制（默认 30 req/min）

## 3. 前端聊天组件 — 样式

- [ ] 3.1 创建 `assets/css/extended/chat-widget.css`，实现浮窗气泡、聊天面板、消息气泡、输入框的完整样式
- [ ] 3.2 实现响应式布局：桌面端固定宽度浮窗，移动端全屏面板

## 4. 前端聊天组件 — 核心逻辑

- [ ] 4.1 创建 `layouts/partials/chat-widget.html`，实现聊天组件 HTML 结构和核心 JS 逻辑
- [ ] 4.2 实现消息发送、SSE 流式接收与打字机效果渲染
- [ ] 4.3 实现对话历史 localStorage 持久化（保存/恢复/清除），设置 100 条上限
- [ ] 4.4 实现模型选择下拉框，从 Hugo data 读取模型列表并渲染
- [ ] 4.5 实现思考模式开关，控制请求 enable_thinking 参数，解析并展示思考过程

## 5. Hugo 集成

- [ ] 5.1 在 `layouts/partials/extend_footer.html` 中引入 chat-widget partial
- [ ] 5.2 在 `hugo.yaml` 中添加 chat 相关 params（proxyURL 从环境变量读取）

## 6. 验证与文档

- [ ] 6.1 本地 Hugo 构建验证，确认组件正确渲染且无 JS 错误
- [ ] 6.2 编写 Worker 部署说明（README 或内联注释）
