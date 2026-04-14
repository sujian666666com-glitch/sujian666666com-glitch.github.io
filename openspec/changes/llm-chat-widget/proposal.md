## Why

博客当前为纯静态内容展示，缺少与读者的互动入口。接入大模型对话能力，可以为访客提供即时交流体验，同时作为博主展示 AI 工程能力的窗口。项目已有 DashScope API 凭据，接入成本极低。

## What Changes

- 新增全局浮窗式聊天组件，在所有页面右下角显示可展开/收起的对话气泡
- 新增轻量 API 代理层（Cloudflare Worker），保护 API Key 不暴露在前端代码中
- 支持流式（SSE）响应，实现打字机效果的消息回复
- 支持"思考模式"开关，默认关闭，用户手动开启
- 支持前端切换模型，默认 qwen3.6-plus，模型列表可配置
- 所有敏感配置（API Key、代理地址）通过 .env 管理，不硬编码
- 对话记录存储在浏览器 localStorage，刷新不丢失

## Capabilities

### New Capabilities
- `chat-widget`: 全局浮窗聊天 UI 组件，包含消息展示、输入框、模型切换、思考模式开关
- `chat-api-proxy`: 轻量 API 代理层，转发请求到 DashScope，保护 API Key
- `chat-config`: 聊天功能配置管理，模型列表、默认模型、API 端点等

### Modified Capabilities
<!-- 无现有 spec 需要修改 -->

## Impact

- **新增文件**: Hugo partial/shortcode、CSS、JS、Cloudflare Worker 脚本
- **修改文件**: `layouts/partials/extend_footer.html`（引入聊天组件）、`hugo.yaml`（菜单/参数）、`.env`（新增代理地址配置）、`.gitignore`（排除 .runs/）
- **外部依赖**: Cloudflare Workers（免费层）用于 API 代理；或降级为 Hugo 构建时注入 API Key（仅限个人使用）
- **无 breaking change**: 不影响现有博客内容和布局
