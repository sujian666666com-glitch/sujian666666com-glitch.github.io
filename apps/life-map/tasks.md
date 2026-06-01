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
