## ADDED Requirements

### Requirement: VPS 本地聊天代理

系统 SHALL 通过 `43.135.48.207` 上的 Node 服务处理小 k 聊天请求，并从服务器环境变量读取 DashScope key。前端 MUST NOT 暴露 API key。

#### Scenario: 前端发送聊天请求

- **WHEN** 用户在小 k 面板发送消息
- **THEN** 前端向 `https://sujian.online/api/chat` 发送请求
- **AND** VPS 服务使用环境变量中的 DashScope key 转发上游

### Requirement: 简化小 k 面板头部

系统 SHALL 隐藏模型选择、RAG、思考和兼容控件，头部只展示小 k 身份信息与基础操作。

#### Scenario: 打开聊天面板

- **WHEN** 用户打开小 k 面板
- **THEN** 头部展示头像、名称、在线状态、清空和关闭按钮
- **AND** 不展示拥挤的高级控件

### Requirement: 小 k 资料卡

系统 SHALL 支持点击小 k 头像查看简单拟人资料卡。

#### Scenario: 查看资料

- **WHEN** 用户点击浮动头像、头部头像或助手消息头像
- **THEN** 面板内展示小 k 资料卡
- **AND** 资料卡包含简介、性格标签和能力列表
