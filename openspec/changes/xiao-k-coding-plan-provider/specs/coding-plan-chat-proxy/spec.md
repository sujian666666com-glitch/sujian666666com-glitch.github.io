## ADDED Requirements

### Requirement: Coding Plan 上游代理

系统 SHALL 通过 VPS Node 服务调用智谱 Coding Plan / Claude API 兼容口。浏览器 MUST 只请求 `/api/chat`，不得直接携带或暴露 BigModel API key。

#### Scenario: 使用环境变量调用智谱 Anthropic 兼容口

- **WHEN** 用户在小 k 面板发送消息
- **THEN** 前端向 `https://sujian.online/api/chat` 发送现有聊天请求体
- **AND** VPS 服务从 `BIGMODEL_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN` 读取 key
- **AND** VPS 服务向 `https://open.bigmodel.cn/api/anthropic/v1/messages` 发起上游请求

#### Scenario: 缺少服务器 key

- **WHEN** VPS 环境中没有 `BIGMODEL_API_KEY` 或 `ANTHROPIC_AUTH_TOKEN`
- **THEN** `/api/chat` 返回 HTTP 500 JSON 错误
- **AND** 响应不得包含任何密钥内容

### Requirement: 前端契约兼容

系统 SHALL 保持 `/api/chat` 的前端请求契约不变，并在服务器侧完成 OpenAI 风格消息与 Anthropic Messages 协议之间的转换。

#### Scenario: 非流式请求转换

- **WHEN** 前端发送 `stream: false` 的请求
- **THEN** VPS 服务将 `system` 消息转换为 Anthropic `system`
- **AND** 将 user/assistant 消息转换为 Anthropic `messages`
- **AND** 返回前端现有代码可解析的 OpenAI 风格 `choices[0].message.content`

#### Scenario: 流式请求转换

- **WHEN** 前端发送默认流式请求
- **THEN** VPS 服务请求 Anthropic 上游流式响应
- **AND** 将文本增量转换为 OpenAI 风格 SSE `choices[0].delta.content`
- **AND** 在结束时发送 `data: [DONE]`

### Requirement: 模型白名单

系统 SHALL 只允许 Coding Plan 支持的 GLM 模型通过小 k 代理调用。未知模型 MUST 被拒绝。

#### Scenario: 允许模型

- **WHEN** 请求模型为 `glm-5.1`、`glm-5`、`glm-5-turbo` 或 `glm-4.7`
- **THEN** VPS 服务继续转发请求

#### Scenario: 拒绝未知模型

- **WHEN** 请求模型不在白名单中
- **THEN** VPS 服务返回 HTTP 400 JSON 错误
