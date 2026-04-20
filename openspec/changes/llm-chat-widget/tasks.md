## 1. 项目配置与基础设施

- [x] 1.1 规范化 `.env` 文件格式为标准 KEY=VALUE，新增 CHAT_PROXY_URL、CHAT_DEFAULT_MODEL 配置项
- [x] 1.2 在 `.gitignore` 中添加 `openspec/changes/*/.runs/` 排除规则和 `.env` 排除规则
- [x] 1.3 创建 `data/chat.yaml` 配置文件，定义模型列表（id + label）和默认模型

## 2. API 代理层（Cloudflare Worker）

- [x] 2.1 创建 `static/chat-worker.js`，实现基础代理：接收 POST 请求，注入 API Key，转发到 DashScope，支持 SSE 流式响应
- [x] 2.2 在 Worker 中实现 CORS 处理（OPTIONS 预检 + POST 响应头）
- [x] 2.3 在 Worker 中实现请求体校验（必需字段 messages、model）和模型白名单校验
- [x] 2.4 在 Worker 中实现基于 IP 的速率限制（默认 30 req/min）
- [x] 2.5 SSE 转发增加周期性 `: keep-alive` 注释帧与 `no-transform` / `X-Accel-Buffering` 响应头，缓解长连接被 RST（尤其思考模式长时间无 token）
- [x] 2.6 支持请求体 `stream: false`，上游单次 JSON 返回，供弱网/非流式降级

## 3. 前端聊天组件 — 样式

- [x] 3.1 创建 `assets/css/extended/chat-widget.css`，实现浮窗气泡、聊天面板、消息气泡、输入框的完整样式
- [x] 3.2 实现响应式布局：桌面端固定宽度浮窗，移动端全屏面板
- [x] 3.3 Agent 消息行：左侧渐变圆形头像 + 浅灰气泡；用户消息行右侧头像 + 深色气泡；头像文案可在 `data/chat.yaml` 配置

## 4. 前端聊天组件 — 核心逻辑

- [x] 4.1 创建 `layouts/partials/chat-widget.html`，实现聊天组件 HTML 结构和核心 JS 逻辑
- [x] 4.2 实现消息发送、SSE 流式接收与打字机效果渲染
- [x] 4.3 实现对话历史 localStorage 持久化（保存/恢复/清除），设置 100 条上限
- [x] 4.4 实现模型选择下拉框，从 Hugo data 读取模型列表并渲染
- [x] 4.5 实现思考模式开关，控制请求 enable_thinking 参数，解析并展示思考过程
- [x] 4.6 「兼容」开关与自动重试：流式失败时尝试非流式；支持 `proxyFallbackURL` / `data-proxy-fallback` 第二代理地址

## 5. Hugo 集成

- [x] 5.1 在 `layouts/partials/extend_footer.html` 中引入 chat-widget partial
- [x] 5.2 在 `hugo.yaml` 中添加 chat 相关 params（proxyURL 从环境变量读取）
- [x] 5.3 `params.chat.proxyFallbackURL` / `HUGO_CHAT_PROXY_FALLBACK_URL` 备用 Worker 地址

## 6. 验证与文档

- [x] 6.1 本地 Hugo 构建验证，确认组件正确渲染且无 JS 错误
- [x] 6.2 编写 Worker 部署说明（README 或内联注释）

## 备注：2026-04-19 chat 网络失败提示修正

- 现象：浏览器访问 `*.workers.dev` 时可能直接报 `Failed to fetch`，用户只能看到笼统提示，难以判断是流式链路失败还是 Worker 域名不可达。
- 正确期望行为：聊天面板应明确提示当前代理地址、`workers.dev` 域名风险、`兼容` 开关用途，以及 `proxyFallbackURL` 的配置动作。
- 本次修复方式：前端在网络失败兜底文案中加入域名类型判断与更具体的配置指引，同时在 `hugo.yaml` 补充备用域名说明，避免误判为纯前端逻辑故障。
