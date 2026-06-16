## Why

当前小 k 已迁到 VPS `/api/chat`，但服务器代理仍按 DashScope/OpenAI `chat/completions` 形态转发；用户希望改用智谱 Coding Plan / Claude API 兼容口，并且 API key 只通过服务器环境变量注入。若只改 base URL，会把 Anthropic `/v1/messages` 协议误当成 OpenAI 协议，导致线上不可用。

## What Changes

- 将 VPS Node 聊天代理的主上游切换为智谱 Coding Plan / Claude API 兼容口：`https://open.bigmodel.cn/api/anthropic/v1/messages`。
- 保持浏览器侧 `/api/chat` 请求契约不变，由服务器完成 OpenAI 风格请求与 Anthropic Messages 请求之间的转换。
- 将 Anthropic 非流式与流式响应转换回现有前端可解析的 OpenAI 风格 JSON/SSE，避免重写小 k UI。
- API key 只从 VPS 环境变量读取，使用 `BIGMODEL_API_KEY`，兼容 `ANTHROPIC_AUTH_TOKEN`。
- 保留博客 RAG，但将向量构建和查询统一切到 SiliconFlow embedding，避免旧 DashScope/BigModel 向量与新查询向量混用。
- 更新部署文档、systemd 示例和默认模型配置，使小 k 默认使用 Coding Plan 可用的 GLM 模型。

## Capabilities

### New Capabilities

- `coding-plan-chat-proxy`: 小 k VPS 聊天代理通过 Anthropic 兼容协议调用智谱 Coding Plan，并向前端保持原 `/api/chat` 契约。
- `siliconflow-rag-embedding`: 小 k RAG 向量索引与查询统一使用 SiliconFlow embedding 通道。

### Modified Capabilities

<!-- 无已归档主 spec；本次通过新增 delta 描述当前小 k 后端能力。 -->

## Impact

- 影响 `server/chat-api.mjs`、`scripts/build-rag.mjs`、`data/chat.yaml`、`server/my-blog-chat.service`、`server/README.md`、`package.json`。
- 线上 `/etc/my-blog-chat.env` 需要提供 `BIGMODEL_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN` 用于聊天，并提供 `SILICONFLOW_API_KEY` 用于 RAG embedding。
- 前端仍请求 `https://sujian.online/api/chat`，不暴露 key，不直连 BigModel/Coding Plan 端点。
