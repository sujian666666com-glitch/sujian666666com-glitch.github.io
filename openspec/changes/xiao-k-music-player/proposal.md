## Why

当前小 k 聊天组件只能文字回复，用户即使表达“想听歌”或“推荐音乐”，也无法在聊天面板内触发实际播放。已有草案已经明确首版目标和降级边界，需要迁移为 OpenSpec change，作为后续实现音乐播放器的权威需求来源。

## What Changes

- 新增小 k 音乐播放器首版能力：聊天面板内音乐入口、音乐抽屉、搜索、播放、队列和基础控制。
- 新增独立音乐代理服务能力：健康检查、搜歌、获取播放 URL、获取歌曲详情、标准化响应、缓存和错误降级。
- 新增小 k 回复联动规则：assistant 回复可通过 `{{play:歌名|歌手}}` 标记触发前端搜索并加入播放器。
- 更新后续实现范围：需要调整聊天 HTML/JS/CSS、system prompt、建议词、部署配置和验证流程。
- 不引入登录、收藏、歌词、播放历史持久化、本地曲库、音频流代理或 STT/TTS。

## Capabilities

### New Capabilities

- `music-api`: 定义后端音乐代理服务的健康检查、搜索、播放地址、歌曲详情、缓存和降级行为。
- `chat-music-player`: 定义聊天面板内播放器 UI、播放队列、手动搜索播放、小 k 播放标记联动和前端降级行为。

### Modified Capabilities

<!-- 无已归档主 spec；本次通过新增 delta 描述小 k 音乐播放器首版能力。 -->

## Impact

- 后续实现将影响 `server/music-api.mjs`、`server/my-blog-music.service`、`server/nginx-music-location.conf`。
- 后续实现将影响聊天前端 `layouts/partials/chat-widget.html`、`static/chat-ui.js`、`assets/css/extended/chat-widget.css`。
- 后续实现将影响小 k 行为配置 `server/system-prompt.txt` 和展示配置 `server/chat-meta.json`。
- 新增公开后端接口：`GET /health`、`GET /api/music/search`、`GET /api/music/url`、`GET /api/music/song`。
- 新增配置项：`MUSIC_API_HOST`、`MUSIC_API_PORT`、`MUSIC_API_UPSTREAM`、`MUSIC_ALLOWED_ORIGINS`。
