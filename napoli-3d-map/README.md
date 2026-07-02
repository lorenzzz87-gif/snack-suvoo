# Napoli 3D — 那不勒斯中心城区自由探索地图

在浏览器中以 3D 方式自由探索那不勒斯老城（Centro Storico）：1.2 万余栋真实建筑体块、
海湾与 Vomero 山地地形、5 个金色高亮地标，支持轨道视角与第一人称街景漫游（含建筑碰撞）。

**完全自包含**：矢量数据与地形瓦片全部随应用分发，构建后是纯静态站点，无需任何外部
地图服务或 API key，可离线运行。

## 运行

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm run build      # 构建到 dist/
npx serve dist     # 或任何静态服务器伺服 dist/
```

## 操作

| 模式 | 操作 |
|---|---|
| 🛰 轨道 | 拖拽平移 · 右键/Ctrl+拖拽旋转 · 滚轮缩放 · 移动端双指缩放旋转 |
| 🚶 漫游 | W/S 前进后退 · A/D 平移 · ←/→ 转向 · 拖拽画面看四周 · Shift 奔跑 |

- 底部书签一键飞往 5 个地标：新堡、主教座堂、翁贝托一世长廊、蛋堡、圣卡洛剧院
- 点击地标名牌或金色建筑弹出中/英/意三语简介
- 右上角切换白天 / 日落光照
- 低性能设备自动关闭 3D 地形保流畅（轻量模式）

## 技术

- [MapLibre GL JS](https://maplibre.org/) v5：矢量渲染、fill-extrusion 3D 建筑、raster-dem 地形
- Vite 构建；无框架依赖
- 漫游相机：`calculateCameraOptionsFromTo` 将视点精确置于地面上方 1.7m，视线落点取
  地形表面交点；建筑碰撞为空间网格 + 射线法点在多边形判定
- 自动化验收：`tests/gate*.mjs`（Playwright，详见 `plan.md` 与 `checklog.md` 的
  分阶段检查门与修复回环记录）

## 数据来源与许可（署名）

- **建筑 / 道路 / 水域 / 绿地**：[Overture Maps Foundation](https://overturemaps.org/)
  （含 © [OpenStreetMap](https://www.openstreetmap.org/copyright) 贡献者数据，
  遵循 [ODbL](https://opendatacommons.org/licenses/odbl/) 许可）。
  数据快照：Overture release `2026-06-17.0`，范围 `14.225,40.820 – 14.278,40.862`。
- **地形 DEM**：Terrain Tiles（terrarium 编码），由 Mapzen 制作、托管于
  [AWS Open Data](https://registry.opendata.aws/terrain-tiles/)。
  含 SRTM（NASA/USGS）等公开数据源。

重新拉取/更新数据：

```bash
python3 scripts/fetch_overture.py buildings building "14.225,40.820,14.278,40.862" public/data/buildings_raw.geojson
python3 scripts/fetch_overture.py transportation segment "14.225,40.820,14.278,40.862" public/data/roads_raw.geojson
python3 scripts/fetch_overture.py base water "14.19,40.78,14.31,40.89" public/data/water_raw.geojson
python3 scripts/fetch_overture.py base land_use "14.225,40.820,14.278,40.862" public/data/landuse_raw.geojson
python3 scripts/prep_data.py
python3 scripts/fetch_dem.py
```

## 部署

`dist/` 为纯静态产物，可直接部署到 Netlify / GitHub Pages / 任意静态托管：

```bash
npm run build
# Netlify: 拖拽 dist/ 到 app.netlify.com/drop，或
npx netlify-cli deploy --prod --dir=dist
```
