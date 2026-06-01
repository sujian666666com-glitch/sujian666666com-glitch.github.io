# Life Map Next 子应用

这是 `Jian の Blog` 的隐藏彩蛋页，独立于 Hugo 主站运行。

## 本地开发

```bash
cd apps/life-map
cp .env.example .env.local
npm install
npm run dev
```

访问：

```text
http://localhost:3000/about/life-map
```

## 环境变量

```env
LIFE_MAP_PASSWORD=041216sjA
LIFE_MAP_TOKEN_SECRET=replace-with-a-long-random-secret
```

`LIFE_MAP_PASSWORD` 是通关密钥。`LIFE_MAP_TOKEN_SECRET` 用于签名前端 sessionStorage 中保存的短期 access token，生产环境必须配置为随机长字符串。

## 线上挂载

Next 服务默认建议监听 `127.0.0.1:8790`，由 Nginx 将以下路径反代到该服务：

- `/about/life-map`
- `/api/life-map/`
- `/_next/`

示例配置见：

- `server/nginx-life-map-location.conf`
- `server/my-blog-life-map.service`

## 数据隐私

真实节点数据位于 `data/life-map-data.server.ts`，并通过 `server-only` 限制为服务端模块。客户端解锁后通过 `/api/life-map/data` 拉取数据，不会直接 import 该数据文件。
