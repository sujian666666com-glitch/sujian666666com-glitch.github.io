## Context

小 k 前端当前通过 Hugo partial 注入页面，实际聊天请求统一 POST 到 `https://sujian.online/api/chat`。该路径由 VPS Nginx 反代到本机 Node 服务 `server/chat-api.mjs`，因此模型密钥和上游协议转换都应放在服务器侧完成。

用户给出的 Coding Plan 配置使用 `ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic` 和 `ANTHROPIC_AUTH_TOKEN`，这对应 Anthropic Messages 协议，而不是 OpenAI `chat/completions` 协议。现有半成品 BigModel 分流仍拼接 `/chat/completions`，需要收敛为 Anthropic 适配器。

## Decisions

### D1: 前端契约保持不变

前端继续发送 `{ model, messages, stream, enable_rag }` 到 `/api/chat`。服务器负责把 `messages` 中的 system 消息抽出为 Anthropic `system`，把 user/assistant 消息传给 `messages`，并设置 `max_tokens`、`stream`。

这样可以复用现有小 k UI、流式解析、兼容模式和错误提示，避免把协议细节泄漏到静态前端。

### D2: 服务器统一输出 OpenAI 风格响应

非流式 Anthropic 响应转换成：

```json
{
  "choices": [
    { "message": { "role": "assistant", "content": "..." } }
  ]
}
```

流式 Anthropic SSE 按事件转换成现有前端可解析的 `data: {"choices":[{"delta":{"content":"..."}}]}`，结束时发送 `data: [DONE]`。若上游输出 thinking/reasoning 字段，服务器尽量映射到 `reasoning_content`，但本次不把思考展示作为必备验收。

### D3: API key 只来自服务器环境变量

聊天上游 key 使用 `BIGMODEL_API_KEY`，并兼容 `ANTHROPIC_AUTH_TOKEN`。RAG embedding 默认复用同一个 key，也允许未来通过环境变量拆分。仓库内只保存环境变量名称和默认非敏感 base URL。

### D4: RAG 统一 BigModel embedding

`scripts/build-rag.mjs` 和 `server/chat-api.mjs` 使用同一组 embedding 配置：默认 `BIGMODEL_EMBEDDING_BASE_URL=https://open.bigmodel.cn/api/paas/v4`、`RAG_EMBEDDING_MODEL=embedding-3`、`RAG_EMBEDDING_DIMENSIONS=1024`。索引文件写入这些元数据，查询时优先读取索引元数据，确保维度和模型一致。

旧索引如果不是 BigModel embedding 或维度不一致，不复用旧向量，重新生成，避免检索质量漂移。

## Risks

- Coding Plan key 若未开通对应模型，`/api/chat` 会返回上游错误；前端按现有错误展示处理。
- 旧 `static/rag-vectors.json` 使用 DashScope 向量，本次切换后需要带 `BIGMODEL_API_KEY` 重新构建，否则 RAG 会被跳过或质量不稳定。
- Anthropic SSE 事件类型比 OpenAI 更细，本次只映射文本增量和基础错误，复杂 tool_use 不进入范围。
