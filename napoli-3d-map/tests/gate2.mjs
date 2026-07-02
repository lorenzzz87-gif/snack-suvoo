// Gate 2：底图与地形
// 1) 渲染完成且截图非空白/纯色  2) 初始视角同时可见海面与城区道路
// 3) 相机不能超出包围盒         4) 瓦片/数据请求失败率 < 5%
import { PNG } from 'pngjs';
import { launchBrowser } from './launch.mjs';

const url = process.argv[2] || 'http://localhost:5173';
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

let total = 0, failed = 0;
page.on('response', (r) => {
  const u = r.url();
  if (u.includes('/dem/') || u.includes('/data/')) {
    total++;
    if (r.status() >= 400) failed++;
  }
});
page.on('requestfailed', (r) => {
  const u = r.url();
  if (u.includes('/dem/') || u.includes('/data/')) { total++; failed++; }
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__ready === true, { timeout: 40000 });
const readyMs = Date.now() - t0;
await page.waitForTimeout(1500);

// 检查 1：截图非空白（颜色多样性）
const shot = PNG.sync.read(await page.screenshot());
const colors = new Set();
for (let i = 0; i < shot.data.length; i += 16 * 4) {
  colors.add((shot.data[i] << 16) | (shot.data[i + 1] << 8) | shot.data[i + 2]);
}
const colorCount = colors.size;

// 检查 2：视野内同时有水面和道路要素
const visible = await page.evaluate(() => {
  const map = window.__map;
  const water = map.queryRenderedFeatures({ layers: ['water'] }).length;
  const roads = ['roads-major', 'roads-minor', 'roads-pedestrian']
    .reduce((n, l) => n + map.queryRenderedFeatures({ layers: [l] }).length, 0);
  return { water, roads };
});

// 检查 3：包围盒钳制（尝试跳到罗马方向远处）
const clamped = await page.evaluate(() => {
  const map = window.__map;
  map.jumpTo({ center: [15.8, 41.9], zoom: 14 });
  const c = map.getCenter();
  map.jumpTo({ center: [14.2488, 40.834] });
  return { lng: c.lng, lat: c.lat };
});
const inBounds =
  clamped.lng >= 14.19 && clamped.lng <= 14.31 &&
  clamped.lat >= 40.78 && clamped.lat <= 40.89;

const failRate = total ? failed / total : 0;
const result = {
  readyMs,
  colorCount,
  visible,
  clampedCenter: clamped,
  inBounds,
  requests: { total, failed, failRate: +failRate.toFixed(3) },
};
console.log(JSON.stringify(result, null, 2));

const pass =
  colorCount > 100 &&
  visible.water > 0 &&
  visible.roads > 0 &&
  inBounds &&
  failRate < 0.05;
console.log(pass ? 'GATE2=PASS' : 'GATE2=FAIL');
await browser.close();
process.exit(pass ? 0 : 1);
