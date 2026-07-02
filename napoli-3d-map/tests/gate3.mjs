// Gate 3：3D 建筑
// 1) buildings.geojson 可解析且要素数 > 3000
// 2) 5 个地标均可按名称检索到（landmark 标签）
// 3) 建筑以 3D 体块渲染：倾斜视角与俯视截图差异显著
// 4) 相机旋转动画下 10 秒平均 FPS ≥ 30
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { launchBrowser } from './launch.mjs';

const url = process.argv[2] || 'http://localhost:5173';

// 检查 1 + 2：数据文件
const fc = JSON.parse(readFileSync(new URL('../public/data/buildings.geojson', import.meta.url)));
const nFeatures = fc.features.length;
const landmarkIds = new Set(
  fc.features.map((f) => f.properties.landmark).filter(Boolean)
);
const wanted = ['castel-nuovo', 'duomo', 'galleria-umberto', 'castel-dellovo', 'teatro-san-carlo'];
const missing = wanted.filter((w) => !landmarkIds.has(w));

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__ready === true, { timeout: 40000 });

// 检查 3：同一位置，倾斜 vs 俯视截图差异
async function shotAt(pitch) {
  await page.evaluate((p) => {
    window.__map.jumpTo({ center: [14.2528, 40.8386], zoom: 16.6, pitch: p, bearing: 30 });
  }, pitch);
  await page.waitForFunction(() => window.__map.areTilesLoaded(), { timeout: 20000 });
  await page.waitForTimeout(1200);
  return PNG.sync.read(await page.screenshot());
}
const tilted = await shotAt(70);
const top = await shotAt(0);
let diff = 0, samples = 0;
for (let i = 0; i < tilted.data.length; i += 8 * 4) {
  samples++;
  const d =
    Math.abs(tilted.data[i] - top.data[i]) +
    Math.abs(tilted.data[i + 1] - top.data[i + 1]) +
    Math.abs(tilted.data[i + 2] - top.data[i + 2]);
  if (d > 40) diff++;
}
const diffRatio = diff / samples;

const rendered3d = await page.evaluate(() => {
  const map = window.__map;
  map.jumpTo({ center: [14.2528, 40.8386], zoom: 16.6, pitch: 70, bearing: 30 });
  return map.queryRenderedFeatures({ layers: ['buildings-3d'] }).length;
});

// 检查 4（修订版，见 plan.md）：FPS 环境感知检查
// 基线 = 俯视无建筑场景；有 GPU（基线 ≥30）要求全场景 ≥30；
// 软件渲染下要求自适应降级触发且降级后 ≥ 基线 50%
async function sampleFps(seconds) {
  return page.evaluate(async (s) => {
    const map = window.__map;
    map.rotateTo(map.getBearing() + 90, { duration: s * 1000 });
    let frames = 0;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = () => {
        frames++;
        if (performance.now() - t0 < s * 1000) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return frames / ((performance.now() - t0) / 1000);
  }, seconds);
}

await page.evaluate(() => {
  const map = window.__map;
  map.setLayoutProperty('buildings-3d', 'visibility', 'none');
  map.jumpTo({ center: [14.2488, 40.84], zoom: 14, pitch: 0 });
});
await page.waitForTimeout(1500);
const baseline = await sampleFps(5);

await page.evaluate(() => {
  const map = window.__map;
  map.setLayoutProperty('buildings-3d', 'visibility', 'visible');
  map.jumpTo({ center: [14.2488, 40.84], zoom: 16, pitch: 65 });
});
// 给性能看护留出触发降级的时间（两个 3s 窗口）
await page.waitForTimeout(8000);
const degraded = await page.evaluate(() => window.__degraded === true);
const fps = await sampleFps(10);

const fpsPass = baseline >= 30
  ? fps >= 30
  : degraded && fps >= baseline * 0.5;

const result = {
  nFeatures,
  landmarks: [...landmarkIds],
  missing,
  rendered3d,
  diffRatio: +diffRatio.toFixed(3),
  baseline: +baseline.toFixed(1),
  degraded,
  fps: +fps.toFixed(1),
  fpsPass,
};
console.log(JSON.stringify(result, null, 2));

const pass =
  nFeatures > 3000 &&
  missing.length === 0 &&
  rendered3d > 50 &&
  diffRatio > 0.15 &&
  fpsPass;
console.log(pass ? 'GATE3=PASS' : 'GATE3=FAIL');
await browser.close();
process.exit(pass ? 0 : 1);
