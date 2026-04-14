## Context

当前项目是基于 Hugo + PaperMod 主题的个人博客，部署在 GitHub Pages（静态托管）。已有 DashScope API 凭据（OpenAI 兼容格式），支持 qwen3.6-plus 等多个模型。

现有自定义扩展点：
- `layouts/partials/extend_head.html` — 注入 CSS/资源
- `layouts/partials/extend_footer.html` — 注入 JS（已有 Three.js 地球动画）
- `assets/css/extended/` — 自定义 CSS 文件
- `.env` — 配置文件（非标准格式，需规范化）

约束：GitHub Pages 是纯静态托管，无服务端执行能力。API Key 不能暴露在前端。

## Goals / Non-Goals

**Goals:**
- 在所有页面添加全局浮窗聊天组件，支持与大模型实时对话
- 通过独立代理层保护 API Key 安全
- 支持模型切换和思考模式，结构可扩展
- 最小侵入：复用 PaperMod 扩展点，不修改主题源码

**Non-Goals:**
- 不实现用户认证/登录系统
- 不实现对话历史云端同步（仅 localStorage）
- 不实现多轮对话的上下文长度自动裁剪
- 不实现自定义 system prompt 编辑界面
- 不构建完整 SaaS 聊天服务

## Decisions

### D1: API 代理层选择 — Cloudflare Worker

**选择**: 使用 Cloudflare Worker 作为 API 代理

**备选方案**:
- **A) Hugo 构建时注入 API Key**: 最简单但 Key 暴露在 HTML 源码中，不可接受
- **B) 独立后端服务（Node.js/Go）**: 需要额外服务器和运维成本
- **C) Cloudflare Worker**: 免费层每天 10 万次请求，零运维，原生支持 streaming，部署一个 JS 文件即可

**决定理由**: Cloudflare Worker 零成本、零运维、天然支持 SSE streaming，与静态博客架构完美匹配。单文件部署，不增加项目复杂度。

### D2: 前端架构 — 原生 JS + Hugo Partial

**选择**: 纯原生 JavaScript + CSS，通过 Hugo partial 注入

**备选方案**:
- **A) React/Vue 组件**: 需要构建工具链，过度工程
- **B) Web Component**: 浏览器兼容性好但封装过重
- **C) 原生 JS + Hugo Partial**: 零依赖，通过 `extend_footer.html` 注入，与现有 Three.js 模式一致

**决定理由**: 与项目现有模式（extend_footer.html 中的 Three.js）一致，零外部依赖，加载快。

### D3: 流式响应 — Fetch API + ReadableStream

**选择**: 使用 `fetch()` + `ReadableStream` 处理 SSE

**决定理由**: 原生 API，无需 EventSource polyfill。DashScope 返回标准 OpenAI 兼容 SSE 格式（`data: {...}\n\n`），用 TextDecoder 逐行解析即可。

### D4: 配置注入 — Hugo 环境变量 + data 文件

**选择**: 
- 非敏感配置（代理 URL、模型列表、默认模型）通过 Hugo `params` 或 `data/` 文件注入前端
- 敏感配置（API Key）仅存在于 Cloudflare Worker 环境变量中
- `.env` 存放 Hugo 构建时需要的非敏感配置和本地开发用配置

**决定理由**: Hugo 原生支持 `os.Getenv` 和 `data/` 文件，无需额外工具。API Key 物理隔离在代理层。

### D5: 聊天组件文件组织

```
layouts/partials/
  chat-widget.html          # 聊天组件 HTML + JS（Hugo partial）
assets/css/extended/
  chat-widget.css            # 聊天组件样式
static/
  chat-worker.js             # Cloudflare Worker 源码（部署参考）
data/
  chat.yaml                  # 模型列表和非敏感配置
```

通过在 `extend_footer.html` 中加一行 `{{ partial "chat-widget.html" . }}` 引入，对现有代码侵入最小。

### D6: 思考模式实现

DashScope 兼容 OpenAI 格式，思考模式通过在请求体中添加额外参数实现：

```json
{
  "model": "qwen3.6-plus",
  "messages": [...],
  "stream": true,
  "enable_thinking": true
}
```

前端在 SSE 响应中解析 `thinking` 或 `reasoning_content` 字段，渲染为可折叠的思考过程块。

## Risks / Trade-offs

- **[Cloudflare Worker 依赖]** → 如 Worker 不可用，聊天功能完全不可用。缓解：前端检测代理不可达时显示友好提示，不影响博客其他功能。
- **[localStorage 容量]** → 对话历史可能累积过多。缓解：设置历史条数上限（如 100 条），超出后自动清理最旧消息。
- **[API 滥用]** → 公开网站的聊天代理可能被滥用。缓解：Worker 层 rate limiting（30 req/min/IP）+ 可选 Referer 校验。
- **[模型兼容性]** → 不同模型对 thinking 参数支持不一。缓解：前端仅在用户主动开启时发送 thinking 参数，不影响基础聊天。
- **[.env 格式非标准]** → 当前 .env 使用非标准格式（JSON-like）。缓解：规范化为标准 KEY=VALUE 格式。

## Migration Plan

1. 部署 Cloudflare Worker（`static/chat-worker.js` 作为参考源码）
2. 在 Worker 环境变量中配置 `DASHSCOPE_API_KEY` 和 `DASHSCOPE_BASE_URL`
3. 将 Worker URL 写入 `.env` 的 `CHAT_PROXY_URL`
4. Hugo 构建时自动注入配置到前端
5. 回滚：删除 `extend_footer.html` 中的 partial 引用即可完全禁用

## Open Questions

- Cloudflare Worker 是否需要额外的 Referer 校验，还是仅 rate limiting 已足够？（建议：先仅 rate limiting，后续按需加）
