## ADDED Requirements

### Requirement: 聊天面板音乐入口

系统 SHALL 在小 k 聊天面板 header 中提供音乐按钮，用户可通过该按钮展开或收起聊天面板内的音乐抽屉。音乐入口 MUST 不遮挡清除和关闭等既有基础操作。

#### Scenario: 打开音乐抽屉

- **WHEN** 用户打开聊天面板并点击音乐按钮
- **THEN** 音乐抽屉在 `.chat-header` 和 `.chat-messages` 之间展开
- **AND** 消息区域自动让出可滚动空间

#### Scenario: 移动端展开音乐抽屉

- **WHEN** 用户在移动端视口打开音乐抽屉
- **THEN** 音乐抽屉高度受到限制
- **AND** 输入框仍保持可见且可操作

### Requirement: 手动搜索与播放队列

系统 SHALL 支持用户在音乐抽屉中搜索歌曲、查看结果、点击歌曲加入队列并播放。播放状态 MUST 只保存在当前页面内存中。

#### Scenario: 手动搜索并播放

- **WHEN** 用户在音乐搜索框输入关键词并提交
- **THEN** 前端请求 `/api/music/search`
- **AND** 展示歌曲名、歌手、专辑或封面等搜索结果信息
- **WHEN** 用户点击某首歌曲
- **THEN** 前端请求 `/api/music/url`
- **AND** 将歌曲加入队列并尝试使用 `<audio>` 播放

#### Scenario: 控制当前播放

- **WHEN** 队列中存在歌曲
- **THEN** 音乐抽屉提供播放或暂停、上一首、下一首、音量和进度控制
- **AND** 当前播放信息展示封面、歌名、歌手、进度和时长

#### Scenario: 刷新页面不恢复队列

- **WHEN** 用户刷新页面
- **THEN** 播放队列不从 localStorage 或其他持久化介质恢复
- **AND** 页面不会自动恢复播放

### Requirement: 小 k 播放标记联动

系统 SHALL 支持 assistant 回复中的 `{{play:歌名|歌手}}` 标记，在回复完成后自动搜索歌曲、选择最佳匹配并加入播放器队列。一条 assistant 回复 MUST 最多触发一次播放联动。

#### Scenario: 回复完成后触发播放

- **WHEN** 用户发送“放点适合看博客的轻音乐”
- **AND** assistant 完整回复中包含 `{{play:歌名|歌手}}`
- **THEN** 前端在回复结束后解析该标记
- **AND** 使用 `歌名 歌手` 请求 `/api/music/search`
- **AND** 请求 `/api/music/url` 获取播放地址
- **AND** 将匹配歌曲加入播放器队列并尝试播放

#### Scenario: 搜歌结果最佳匹配

- **WHEN** 播放标记同时包含歌名和歌手
- **THEN** 前端优先选择歌名精确匹配且歌手包含匹配的搜索结果
- **AND** 若没有最佳匹配则使用第一条搜索结果

#### Scenario: 标记安全渲染

- **WHEN** assistant 回复包含播放标记
- **THEN** 前端对标记字段执行长度限制和 HTML 转义
- **AND** 用户界面不直接展示原始 `{{play:...}}`
- **AND** 原始标记被替换为播放器提示卡片

### Requirement: 自动播放失败降级

系统 SHALL 捕获浏览器自动播放拦截、音频 URL 无法播放和歌曲不可播等失败，并在音乐区域展示温和提示。失败 MUST 不影响聊天请求、聊天历史或消息渲染。

#### Scenario: 浏览器拦截自动播放

- **WHEN** 前端调用 `audio.play()` 被浏览器拒绝
- **THEN** 系统保留当前播放队列
- **AND** 展开播放器并提示用户点击播放

#### Scenario: 音乐接口不可用

- **WHEN** `/api/music/search` 或 `/api/music/url` 返回 `music_unavailable`
- **THEN** 音乐抽屉展示音乐暂时不可用提示
- **AND** 当前聊天功能继续可用

#### Scenario: 歌曲不可播

- **WHEN** `/api/music/url` 返回 `playable: false` 或空播放地址
- **THEN** 音乐抽屉提示当前歌曲不可播放
- **AND** 队列中其他歌曲仍可继续尝试播放

### Requirement: 历史消息不重复触发

系统 SHALL 在历史消息重新渲染时避免重复触发音乐搜索或自动播放。历史 assistant 消息中的播放标记只能渲染为提示，不得再次执行联动。

#### Scenario: 刷新后渲染历史消息

- **WHEN** 用户刷新页面或重新打开聊天面板
- **AND** 历史 assistant 消息中曾包含播放标记
- **THEN** 前端只渲染播放器提示卡片
- **AND** 不调用 `/api/music/search`
- **AND** 不自动播放歌曲

### Requirement: 音乐建议词与 system prompt 规则

系统 SHALL 更新小 k 的 system prompt 和建议词，使用户明确要求听音乐、推荐歌曲或放歌时，小 k 可以输出播放标记。普通音乐知识聊天 MUST NOT 自动附加播放标记。

#### Scenario: 用户明确要求听歌

- **WHEN** 用户明确表达想听音乐、让小 k 推荐歌曲或让小 k 放歌
- **THEN** 小 k 回复使用一句话推荐
- **AND** 在回复末尾包含一个 `{{play:歌名|歌手}}` 标记
- **AND** 不承诺歌曲一定已经播放成功

#### Scenario: 普通音乐知识对话

- **WHEN** 用户只是询问音乐知识、歌手背景或歌曲含义
- **THEN** 小 k 正常文字回答
- **AND** 不自动添加播放标记
