# Napoli 中心城区 3D 自由探索地图 — 开发计划（plan.md）

> **执行方式**：本计划由 **Starchild AI Agent** 逐阶段执行。
> **核心规则**：每个阶段末尾都有一个 **检查门（Gate）**。Agent 在进入下一阶段之前，
> **必须**运行该 Gate 的全部检查项；任何一项失败，立即进入 **修复回环（Fix Loop）**，
> 修复后重新运行整个 Gate，直到全部通过才允许推进。**禁止跳过 Gate。**

---

## 0. 项目概述

| 项目 | 内容 |
|---|---|
| 目标 | 在浏览器中呈现那不勒斯（Napoli）中心城区的 3D 地图，用户可自由探索（漫游、旋转、缩放、第一人称视角） |
| 覆盖范围 | Centro Storico（老城区）为核心：Spaccanapoli、Via Toledo、Piazza del Plebiscito、Quartieri Spagnoli、港口区，约 `40.83~40.86°N, 14.23~14.27°E` |
| 技术栈 | Three.js + MapLibre GL JS（矢量底图）+ OpenStreetMap 建筑数据（OSM Buildings / Overpass API），构建工具 Vite，纯前端静态部署 |
| 交付物 | 可静态部署的 Web 应用（`dist/`），支持桌面与移动端 |
| 执行者 | Starchild AI Agent（自动编码、自动运行检查、自动回环修复） |

### 全局循环机制（Loop Protocol）

Starchild AI Agent 对每个阶段执行如下状态机：

```
┌─────────────┐
│  执行阶段 N  │
└──────┬──────┘
       ▼
┌─────────────┐    全部通过     ┌─────────────┐
│  运行 Gate N │ ─────────────▶ │ 进入阶段 N+1 │
└──────┬──────┘                └─────────────┘
       │ 任一项失败
       ▼
┌──────────────────────────────┐
│ Fix Loop：                    │
│ 1. 记录失败项到 checklog.md    │
│ 2. 定位原因并修复              │
│ 3. 回到「运行 Gate N」重新全检  │
│ （同一 Gate 连续失败 ≥3 次 →   │
│   暂停并向用户报告，等待指示）   │
└──────────────────────────────┘
```

- 每次 Gate 运行结果（通过/失败、失败原因、修复动作）追加写入 `napoli-3d-map/checklog.md`。
- 每个阶段通过 Gate 后立即 `git commit`，commit message 注明 `[Gate N passed]`。

---

## 阶段 1：项目脚手架

**入口条件**：无（起始阶段）。

**任务**
1. 在 `napoli-3d-map/` 下用 Vite 初始化 vanilla JS/TS 项目。
2. 安装依赖：`three`、`maplibre-gl`。
3. 建立目录结构：
   ```
   napoli-3d-map/
   ├── index.html
   ├── src/
   │   ├── main.js          # 入口
   │   ├── scene.js         # Three.js 场景
   │   ├── controls.js      # 探索控制
   │   ├── data/            # 数据加载
   │   └── ui/              # HUD、加载提示
   ├── public/
   └── plan.md / checklog.md
   ```
4. 写一个最小页面：全屏 canvas + 天空色背景，标题 "Napoli 3D"。

**✅ Gate 1（必须全部通过才能进入阶段 2）**
- [ ] `npm install` 无报错退出（exit code 0）。
- [ ] `npm run dev` 启动后，`curl http://localhost:5173` 返回 200 且 HTML 含 `Napoli 3D`。
- [ ] `npm run build` 成功产出 `dist/`。
- [ ] 浏览器控制台无未捕获错误（用 Playwright 无头浏览器验证）。

**❌ 失败回环**：修复依赖/配置 → 重跑 Gate 1 全部检查项。

---

## 阶段 2：地形与底图

**入口条件**：Gate 1 已通过并 commit。

**任务**
1. 接入 MapLibre GL，使用免费矢量瓦片（如 OpenFreeMap / demotiles）渲染那不勒斯底图，中心点 `[14.2488, 40.8443]`（Piazza del Plebiscito 附近）。
2. 叠加地形起伏（那不勒斯依山傍海，Vomero 山地不可忽略）：使用免费 DEM（如 AWS terrain tiles）做地形拉伸。
3. 限制可视范围到中心城区包围盒，防止用户飞出区域后迷失。
4. 海面（那不勒斯湾）用简单的蓝色平面/着色器表现。

**✅ Gate 2**
- [ ] 页面加载后 5 秒内底图瓦片渲染完成（Playwright 截图非纯色、非空白）。
- [ ] 相机初始位置能同时看到海岸线与城区。
- [ ] 拖动/缩放不超出包围盒（脚本模拟操作后断言相机坐标在范围内）。
- [ ] 控制台无 4xx/5xx 瓦片请求持续报错（偶发单张失败可接受，失败率 < 5%）。

**❌ 失败回环**：瓦片源不可用 → 更换备用瓦片源；地形异常 → 校验 DEM 解码参数；重跑 Gate 2。

---

## 阶段 3：3D 建筑

**入口条件**：Gate 2 已通过并 commit。

**任务**
1. 通过 Overpass API 拉取中心城区 OSM 建筑轮廓（`building=*`，含 `height` / `building:levels`），缓存为本地 GeoJSON（`public/data/buildings.geojson`），避免运行时依赖 Overpass。
2. 用 MapLibre `fill-extrusion`（或 Three.js 挤出几何体）把建筑拉伸为 3D 体块；无高度数据的按层数 ×3m 估算，兜底 12m。
3. 地标建筑做重点样式（颜色/描边区分）：Castel Nuovo、Duomo di Napoli、Galleria Umberto I、Castel dell'Ovo、Teatro San Carlo。
4. 按视距做 LOD/分块加载，保证性能。

**✅ Gate 3**
- [ ] `buildings.geojson` 存在、可解析、要素数 > 3000（中心城区合理规模）。
- [ ] 5 个地标建筑在 GeoJSON 中均可按名称/OSM id 检索到。
- [ ] 建筑以 3D 体块渲染（倾斜视角截图中建筑有立面，人工规则校验：截图与俯视图差异显著）。
- [ ] 中端设备模拟下帧率 ≥ 30 FPS（Playwright 采样 `requestAnimationFrame` 10 秒平均）。

**❌ 失败回环**：Overpass 超时 → 缩小查询范围分块拉取再合并；帧率不足 → 合并几何体/加大 LOD 距离；重跑 Gate 3。

---

## 阶段 4：自由探索控制

**入口条件**：Gate 3 已通过并 commit。

**任务**
1. 实现两种模式并可切换：
   - **轨道模式**：拖拽旋转、滚轮缩放、右键平移（移动端双指手势）。
   - **街景漫游模式**：WASD/方向键移动 + 鼠标视角，视点高度 1.7m，带简单碰撞（不穿入建筑体块）。
2. 预设视角书签：一键飞到 5 个地标（平滑相机动画）。
3. HUD：当前模式、简易小地图/指北针、操作提示。

**✅ Gate 4**
- [ ] Playwright 模拟键鼠：轨道模式下旋转/缩放后相机矩阵确实变化。
- [ ] 漫游模式下按 W 前进 3 秒，位移 > 0 且视点高度保持 ≈1.7m。
- [ ] 朝建筑方向持续前进，最终位置不在任何建筑轮廓内（碰撞生效）。
- [ ] 点击每个地标书签，2 秒后相机与目标点距离 < 200m。
- [ ] 移动端视口（375×667）下 HUD 不遮挡、双指缩放可用。

**❌ 失败回环**：碰撞失效 → 检查射线检测/包围盒索引；动画异常 → 修补补间逻辑；重跑 Gate 4。

---

## 阶段 5：视觉打磨与信息层

**入口条件**：Gate 4 已通过并 commit。

**任务**
1. 光照：模拟地中海日照的方向光 + 环境光，柔和阴影；可选日落色调切换。
2. 地标 POI 标签（悬浮名牌），点击弹出简介卡片（中/英/意三语文案，静态 JSON）。
3. 加载进度条与失败重试 UI。
4. 性能预算：首屏 JS < 800KB gzip，数据分块懒加载。

**✅ Gate 5**
- [ ] 点击任一 POI，弹出卡片且内容非空；再次点击空白处卡片关闭。
- [ ] Lighthouse（移动端模拟）Performance ≥ 70。
- [ ] 构建产物首屏 JS gzip 体积 < 800KB（脚本断言）。
- [ ] 断网模拟下出现重试 UI 而非白屏。

**❌ 失败回环**：体积超标 → 代码分割/删依赖；分数不足 → 压缩纹理与数据；重跑 Gate 5。

---

## 阶段 6：终检与发布

**入口条件**：Gate 5 已通过并 commit。

**任务**
1. 全量回归：按顺序重跑 **Gate 1 → Gate 5 的所有检查项**（终检就是把之前的循环再走一遍）。
2. 编写 `README.md`：运行方式、数据来源与许可（OSM ODbL 署名）、操作说明。
3. `npm run build` 产出最终 `dist/`，本地 `npx serve dist` 冒烟验证。
4. commit 并 push；如需部署，输出 Netlify/GitHub Pages 部署步骤。

**✅ Gate 6（最终门）**
- [ ] Gate 1~5 全部检查项复测通过（结果记入 checklog.md）。
- [ ] README 包含 OSM 署名与许可说明。
- [ ] `dist/` 静态伺服下完整可用（无 dev server 依赖）。
- [ ] git 工作区干净，所有提交已 push。

**❌ 失败回环**：任一复测失败 → 回退到对应阶段的 Fix Loop，修复后从该阶段的 Gate 重新逐级向后复测。

---

## 附录 A：Starchild AI Agent 执行指令模板

每个阶段按此模板执行：

```
1. 读取 plan.md 中当前阶段的「入口条件」→ 确认上一 Gate 已在 checklog.md 标记通过，否则先回去补。
2. 执行「任务」列表。
3. 逐项运行「Gate」检查（自动化优先：shell 命令 / Playwright 脚本）。
4. 全部 ✅ → 写 checklog.md、git commit "[Gate N passed] ..."、进入下一阶段。
   任一 ❌ → 写 checklog.md（失败项+原因+修复方案）、修复、回到第 3 步。
5. 同一 Gate 连续失败 3 次 → 停止，向用户汇报阻塞点。
```

## 附录 B：风险与备选方案

| 风险 | 备选 |
|---|---|
| Overpass API 限流 | 改用 Geofabrik 意大利 extract 离线裁剪 |
| 免费矢量瓦片源失效 | 备选 OpenFreeMap → MapTiler 免费额度 → 本地 PMTiles |
| 移动端性能不足 | 降级：减小建筑加载半径、关闭阴影 |
| DEM 地形源不可用 | 降级为平面 + 仅建筑 3D（城区核心平坦，可接受） |
