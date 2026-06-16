## 1. OpenSpec 收敛

- [x] 1.1 创建 `xiao-k-music-player` change 骨架
- [x] 1.2 将原始草案拆分为 `music-api` 与 `chat-music-player` 两个能力 spec
- [x] 1.3 保留 `docs/superpowers/specs/xiao-k-music-player.md` 作为历史参考，不修改、不删除

## 2. 后端音乐代理

- [x] 2.1 新增 `server/music-api.mjs`
- [x] 2.2 支持 `MUSIC_API_HOST` 和 `MUSIC_API_PORT`，默认监听 `127.0.0.1:8789`
- [x] 2.3 实现 `GET /health`
- [x] 2.4 实现 `GET /api/music/search?q=关键词&limit=10`
- [x] 2.5 实现 `GET /api/music/url?id=歌曲id`
- [x] 2.6 实现 `GET /api/music/song?id=歌曲id`
- [x] 2.7 使用 `MUSIC_API_UPSTREAM` 调用自管音乐上游
- [x] 2.8 增加 CORS 白名单、请求参数限制、标准化错误响应和上游异常降级
- [x] 2.9 增加搜索结果 60 秒缓存和播放 URL 10 分钟进程内缓存，且不缓存错误结果

## 3. 部署配置

- [x] 3.1 新增 `server/my-blog-music.service`
- [x] 3.2 新增 `server/nginx-music-location.conf`
- [x] 3.3 在部署说明中记录 `MUSIC_API_UPSTREAM`、`MUSIC_ALLOWED_ORIGINS`、`MUSIC_API_HOST`、`MUSIC_API_PORT`

## 4. 前端播放器

- [x] 4.1 在聊天 header 的清除按钮左侧增加音乐按钮
- [x] 4.2 在 `.chat-header` 和 `.chat-messages` 之间增加音乐抽屉 DOM
- [x] 4.3 为音乐抽屉补充桌面端和移动端样式，避免挤压输入框
- [x] 4.4 实现歌曲搜索、搜索结果展示和点击加入队列
- [x] 4.5 实现 `<audio>` 播放、暂停、上一首、下一首、音量、进度和时长展示
- [x] 4.6 实现播放队列、当前播放信息和不可播降级提示

## 5. 聊天联动

- [x] 5.1 在 assistant 回复完整结束后解析 `{{play:歌名|歌手}}`
- [x] 5.2 限制一条 assistant 回复最多触发一次播放联动
- [x] 5.3 实现歌名精确且歌手包含的最佳匹配逻辑，失败时回退第一条结果
- [x] 5.4 将原始播放标记替换为播放器提示卡片
- [x] 5.5 避免历史消息重新渲染时重复搜索或自动播放
- [x] 5.6 捕获 `audio.play()` 失败并提示用户点击播放

## 6. Prompt 与建议词

- [x] 6.1 更新 `server/system-prompt.txt`，增加播放标记输出规则
- [x] 6.2 更新 `server/chat-meta.json`，增加音乐相关建议词入口

## 7. 验证

- [x] 7.1 执行 `openspec validate xiao-k-music-player --strict`
- [x] 7.2 执行 `node --check server/music-api.mjs`
- [x] 7.3 执行 `node --check static/chat-ui.js`
- [x] 7.4 执行站点构建命令 `hugo --gc --minify`
- [x] 7.5 浏览器验证手动搜索播放
- [x] 7.6 浏览器验证聊天自动联动
- [x] 7.7 验证上游不可用、歌曲不可播和自动播放失败降级
