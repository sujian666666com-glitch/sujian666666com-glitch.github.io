## ADDED Requirements

### Requirement: 音乐代理健康检查

系统 SHALL 提供独立音乐代理服务健康检查接口，用于本机和部署层验证服务存活。健康检查 MUST 不依赖音乐上游可用性。

#### Scenario: 健康检查成功

- **WHEN** 运维或监控请求 `GET /health`
- **THEN** 音乐代理返回 HTTP 200 JSON 响应
- **AND** 响应表明本地服务处于可用状态

### Requirement: 歌曲搜索

系统 SHALL 通过 `GET /api/music/search?q=关键词&limit=10` 提供歌曲搜索能力，并将上游结果标准化为前端可直接渲染的列表。搜索参数 MUST 做长度和数量限制。

#### Scenario: 搜索返回标准化歌曲列表

- **WHEN** 前端请求 `GET /api/music/search?q=月光&limit=5`
- **THEN** 音乐代理调用配置的音乐上游搜索接口
- **AND** 响应 JSON 包含 `items` 数组
- **AND** 每个歌曲项包含 `id`、`name`、`artists`、`album`、`picUrl` 和 `duration`

#### Scenario: 搜索关键词为空

- **WHEN** 前端请求缺少 `q` 或 `q` 为空白
- **THEN** 音乐代理返回 HTTP 400 JSON 错误
- **AND** 不调用音乐上游

### Requirement: 播放地址获取

系统 SHALL 通过 `GET /api/music/url?id=歌曲id` 获取歌曲播放地址，并返回歌曲是否可播放。无版权、无 URL 或上游无法提供播放地址时，系统 MUST 返回不可播放状态而不是中断聊天功能。

#### Scenario: 获取可播放地址

- **WHEN** 前端请求 `GET /api/music/url?id=123`
- **THEN** 音乐代理调用上游播放地址接口
- **AND** 响应 JSON 包含 `id`、`url` 和 `playable`
- **AND** 当上游返回有效 URL 时 `playable` 为 `true`

#### Scenario: 歌曲不可播放

- **WHEN** 上游返回空 URL、无版权或不可播放状态
- **THEN** 音乐代理返回 JSON 响应且 `playable` 为 `false`
- **AND** 响应不得要求前端重试聊天接口

### Requirement: 歌曲详情获取

系统 SHALL 通过 `GET /api/music/song?id=歌曲id` 提供歌曲详情查询，用于前端补充当前播放信息或队列展示。

#### Scenario: 获取歌曲详情

- **WHEN** 前端请求 `GET /api/music/song?id=123`
- **THEN** 音乐代理调用上游歌曲详情接口
- **AND** 响应包含歌曲名称、歌手、专辑、封面和时长等标准化字段

#### Scenario: 歌曲不存在

- **WHEN** 上游无法找到指定歌曲 id
- **THEN** 音乐代理返回 HTTP 404 或不可用 JSON 错误
- **AND** 错误响应使用稳定的 `error` 字段

### Requirement: 音乐代理降级与缓存

系统 SHALL 对音乐上游异常进行统一错误降级，并对成功的搜索结果和播放 URL 使用进程内短期缓存。错误结果 MUST NOT 被缓存。

#### Scenario: 上游不可用

- **WHEN** 音乐上游请求超时、连接失败或返回不可解析响应
- **THEN** 音乐代理返回 JSON 错误 `{ "error": "music_unavailable" }`
- **AND** 当前聊天接口和聊天历史不受影响

#### Scenario: 成功结果写入缓存

- **WHEN** 歌曲搜索或播放 URL 请求成功
- **THEN** 音乐代理将搜索结果缓存 60 秒
- **AND** 将播放 URL 缓存 10 分钟
- **AND** 缓存只保存在当前进程内

#### Scenario: CORS 白名单控制

- **WHEN** 浏览器从允许的站点来源请求音乐接口
- **THEN** 音乐代理返回允许跨域访问的 CORS 响应头
- **AND** 允许来源由 `MUSIC_ALLOWED_ORIGINS` 配置，默认复用聊天或留言墙白名单
