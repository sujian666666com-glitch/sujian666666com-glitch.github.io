## ADDED Requirements

### Requirement: SiliconFlow RAG 向量构建

系统 SHALL 使用 SiliconFlow embedding 构建小 k 的 RAG 向量索引，并在索引文件中记录 provider、模型、base URL 和维度。

#### Scenario: 使用 SiliconFlow key 构建索引

- **WHEN** 运行 `npm run build:rag` 且环境变量中存在 `SILICONFLOW_API_KEY`
- **THEN** 构建脚本调用 `RAG_EMBEDDING_BASE_URL` 下的 `/embeddings`
- **AND** 默认 provider 为 `siliconflow`
- **AND** 默认模型为 `Qwen/Qwen3-Embedding-0.6B`
- **AND** 默认维度为 `1024`
- **AND** `static/rag-vectors.json` 记录对应 embedding 元数据和非空 chunks

#### Scenario: 缺少 key 时安全降级

- **WHEN** 构建环境没有 SiliconFlow 或兼容迁移 key
- **THEN** 构建脚本写入空 RAG 索引并退出 0
- **AND** 不在输出文件或日志中泄露密钥

### Requirement: SiliconFlow RAG 查询

系统 SHALL 使用与索引一致的 SiliconFlow embedding 配置生成用户问题向量，再进行相似度检索。

#### Scenario: 查询向量与索引一致

- **WHEN** `/api/chat` 启用 RAG 且索引中有 chunks
- **THEN** VPS 服务读取索引中的 embedding provider、模型、base URL 和维度
- **AND** 使用 SiliconFlow embedding API 生成用户问题向量
- **AND** 将 Top-K 博文片段拼入 system 上下文

#### Scenario: RAG 查询失败

- **WHEN** embedding 查询失败或索引不可用
- **THEN** VPS 服务记录警告并继续普通聊天
- **AND** 不因 RAG 失败中断 `/api/chat`
