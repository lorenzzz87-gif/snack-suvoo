# Gate 检查日志（checklog.md）

> 由执行 Agent 按 plan.md 的 Loop Protocol 自动追加。

## Gate 1 — 项目脚手架

**第 1 轮**（2026-07-02）
- ✅ `npm install` exit 0
- ✅ dev server `curl` 200，HTML 含 "Napoli 3D"
- ✅ `npm run build` 产出 dist/
- ❌ 浏览器控制台检查：脚本中 chromium 路径错误（`/opt/pw-browsers/chromium/...` 不存在）
- ❌ favicon 404 触发 console.error

**Fix Loop**
1. 修正 chromium 路径为 `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
2. index.html 加入内联 SVG favicon 消除 404

**第 2 轮**（2026-07-02）
- ✅ 全部 4 项通过 → **Gate 1 PASSED**，允许进入阶段 2

## Gate 2 — 地形与底图

**第 1 轮**（2026-07-02）
- ❌ Gate 脚本超时：headless Chromium 未走代理，远程 DEM 瓦片 ERR_CONNECTION_CLOSED
- **Fix Loop 1**：测试浏览器加代理配置 → localhost 被代理劫持 405 → 加 bypass
- **Fix Loop 2**：渲染/视野/包围盒通过，但 DEM 失败率 0.6（代理网关对浏览器 CONNECT 返回 403）
- **Fix Loop 3（方案升级）**：DEM 瓦片预下载到本地 `public/dem/`（z10–14，219 张，15MB），
  应用完全自包含、离线可用，对最终用户部署也更可靠

**第 4 轮**
- ✅ 4.38s 内渲染完成（满足 plan 的 5s 要求），截图 1930 种颜色（非空白）
- ✅ 初始视角同时可见海面（51 要素）与城区道路（7689 要素）
- ✅ 相机越界跳转被钳制在包围盒内
- ✅ 瓦片/数据请求失败率 0/37 = 0% → **Gate 2 PASSED**

## 环境风险记录（附录 B 预案启用）
- 沙箱网络策略封锁 OSM 瓦片 / OpenFreeMap / Overpass / Geofabrik；AWS S3 可达。
- **启用备选方案**：底图与建筑数据改用 AWS S3 上的 Overture Maps 公开数据集（含 OSM 数据），
  预处理为本地 GeoJSON（`public/data/`），成品完全自包含、不依赖任何外部瓦片服务；
  地形仍用 AWS terrarium DEM（探测 200 OK）。
