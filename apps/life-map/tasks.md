# Life Map 子应用任务

- [x] 搭建独立 Next.js App Router 子应用，不迁移 Hugo 主站。
- [x] 实现密码校验 API，密码来自 `LIFE_MAP_PASSWORD`。
- [x] 实现服务端签名 access token，并用受保护 API 返回地图数据。
- [x] 将真实人生节点数据放在 `server-only` 数据模块，避免客户端直接 import。
- [x] 实现 LifeMap 组件：地图、筛选、详情面板、时间轴、图例、导出 PNG。
- [x] 补充 Nginx 与 systemd 部署示例。
- [x] 完成 `npm install`、`npm run lint`、`npm run typecheck`、`npm run build` 验收。
- [x] 使用本地 `next start` 验证密码错误、密码正确、未授权数据访问和授权数据访问。

备注：

- 现象 / 缺陷：原博客是 Hugo 静态站，不能直接满足 Next.js App Router 和服务端 Route Handler 的访问控制需求。
- 正确期望行为：Life Map 作为独立 Next 子应用运行，通过 Nginx 挂载到 `/about/life-map`，真实履历数据只在服务端读取。
- 本次修复方式：新增 `apps/life-map` 子应用，使用服务端密码校验和签名 token 保护 `/api/life-map/data`，客户端只在解锁后拉取地图数据。

## LifeMap v2：暖色手账式人物关系闯关地图

- [x] 新增 OpenSpec 变更 `enhance-life-map-v2`，用中文记录目标、范围、场景和验收标准。
- [x] 扩展数据类型和服务端数据，增加 `person` 节点、双模式布局、称谓化人物清单和 `youth-love` 青春支线。
- [x] 将默认地图改为“人物关系”，并增加“闯关路线”手账书签切换。
- [x] 实现点击人物后高亮相关关卡、Boss、觉醒点和目标；点击“她”后聚焦完整青春支线。
- [x] 将页面、地图、节点、边线、筛选、图例、时间轴和详情面板重绘为暖色手账纸感。
- [x] 详情面板支持人物、关卡、Boss、觉醒点、青春支线的差异化字段。
- [x] 保持真实数据只在 `data/life-map-data.server.ts`，客户端解锁后仍通过 `/api/life-map/data` 拉取。
- [x] 完成 `npm run lint`、`npm run typecheck`、`npm run build` 验收。
- [x] 验证未授权数据访问 401、错误密码 401、正确密码可读取受保护数据。
- [x] 搜索 `.next/static`，确认青春支线、地点、示例密码和开发 token 关键词未进入客户端静态 bundle。
- [x] 使用浏览器检查 1280 / 768 / 414 / 375 / 320 宽度无横向溢出，并验证点击奶奶、点击她和青春支线可见。

备注：

- 现象 / 缺陷：原 LifeMap 是深色科技图谱，人物关系权重不足，“她”没有作为贯穿高中到大学分手阶段的重要青春支线完整呈现。
- 正确期望行为：LifeMap 应像一本暖色手绘人生冒险手账，默认呈现人物关系，路线模式展示成长闯关路径，“她”作为高权重人物和完整青春支线存在。
- 本次修复方式：在不改变密码验证、服务端数据保护和部署路径的前提下，扩展数据结构、重写地图布局和视觉层，并补充交互高亮、详情面板和多宽度验收。

## LifeMap v3：密度与叙事节奏改造

- [x] 新增 OpenSpec 变更 `enhance-life-map-density`，记录减密度、分层展示与手账详情目标。
- [x] 新增 `lib/life-map-display.ts`，前端推导 mapLabel、displayTier、shellKind。
- [x] 拆分 LifeMapNode 分形组件：人物贴纸、关卡标记、青春小路、Boss 旗帜、城堡、ghost 节点。
- [x] 默认分层：青春支线 side_quest 为 ghost，点击「她」聚焦完整小路并 fitView 框选。
- [x] 批量调整 `modePosition` 坐标，拉开家庭/成长/青春支线区域间距。
- [x] 重写 LifeMapPanel 为手账页：JournalHeader、StickyNote、StoryPath、BossStickers、PaperChipList。
- [x] Canvas minZoom / fitView / 高度适配更大画布。
- [x] 完成 `npm run lint`、`npm run typecheck`、`npm run build` 验收。

备注：

- 现象 / 缺陷：v2 虽已是暖色手账，但所有节点仍共用密集矩形卡片，地图像表格；详情面板 DetailGrid 仍有强字段表感。
- 正确期望行为：地图节点可扫读、有呼吸区与主次层级；详情像手账页；点击「她」后青春支线成为独立剧情小路。
- 本次修复方式：仅改展示层与 modePosition 坐标，不改 API 契约与 server-only 数据保护；消费已有 visualKind / importance 字段驱动分形渲染与分层。
