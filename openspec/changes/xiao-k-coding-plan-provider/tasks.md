## 1. OpenSpec 与配置收敛

- [x] 1.1 创建中文 proposal、design、spec 和任务清单
- [x] 1.2 将小 k 默认模型和模型列表收敛到 Coding Plan GLM 模型

## 2. Coding Plan 聊天代理

- [x] 2.1 移除 `BIGMODEL_BASE_URL + /chat/completions` 半成品分流
- [x] 2.2 实现 OpenAI 风格请求到 Anthropic `/v1/messages` 的转换
- [x] 2.3 实现 Anthropic 非流式响应到 OpenAI 风格 JSON 的转换
- [x] 2.4 实现 Anthropic 流式 SSE 到现有前端可解析 SSE 的转换
- [x] 2.5 保持 CORS、限流、请求校验、健康检查和错误转发行为

## 3. RAG embedding 切换

- [x] 3.1 更新 `scripts/build-rag.mjs`，默认使用 BigModel `embedding-3`
- [x] 3.2 更新 `server/chat-api.mjs`，查询向量使用与索引一致的 BigModel embedding
- [x] 3.3 避免复用旧 DashScope 或维度不一致的索引向量

## 4. 部署文档与验证

- [x] 4.1 更新 `server/my-blog-chat.service` 和 `server/README.md`
- [x] 4.2 执行 `node --check server/chat-api.mjs`、`node --check static/chat-ui.js`
- [x] 4.3 执行 OpenSpec validate
- [x] 4.4 执行 `npm run build:rag` 的无 key 安全降级验证
- [x] 4.5 执行 `hugo --gc --minify`
