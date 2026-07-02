// Gate 4：自由探索控制
// 1) 轨道模式：滚轮缩放 / 右键拖拽旋转后相机确实变化
// 2) 漫游模式：按 W 前进有位移，视点高度 ≈ 1.7m（相机高度 - 地形高程，独立测算）
// 3) 碰撞：朝建筑持续前进，最终位置不在任何建筑外环内（测试端独立点在多边形判定）
// 4) 书签：点击每个地标按钮后相机与目标距离 < 200m
// 5) 移动端视口：HUD 可见不越界，双指缩放手势可用
import { readFileSync } from 'node:fs';
import { launchBrowser } from './launch.mjs';

const url = process.argv[2] || 'http://localhost:5173';
const browser = await launchBrowser();
const checks = {};

// ---------- 桌面 ----------
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__ready === true, { timeout: 40000 });
await page.waitForFunction(() => !!window.__controls, { timeout: 20000 });

// 1) 轨道手势
const before = await page.evaluate(() => ({
  zoom: window.__map.getZoom(),
  bearing: window.__map.getBearing(),
}));
// 滚轮缩放；性能看护降级瞬间的 map.stop() 可能吞掉本次缩放动画，最多重试 3 次
for (let i = 0; i < 3; i++) {
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(500);
  await page.waitForFunction(() => !window.__map.isMoving(), { timeout: 15000, polling: 500 });
  const z = await page.evaluate(() => window.__map.getZoom());
  if (Math.abs(z - before.zoom) > 0.05) break;
}
// 右键拖拽旋转；个别渲染时机下手势可能未被拾取，最多重试 3 次
for (let i = 0; i < 3; i++) {
  await page.mouse.move(640, 400);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(780, 360, { steps: 10 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => window.__map.getBearing());
  if (Math.abs(b - 18) > 1) break; // 初始 bearing 18
}
const after = await page.evaluate(() => ({
  zoom: window.__map.getZoom(),
  bearing: window.__map.getBearing(),
}));
checks.orbitZoomChanged = Math.abs(after.zoom - before.zoom) > 0.05;
checks.orbitRotateChanged = Math.abs(after.bearing - before.bearing) > 1;

// 2) 漫游：W 前进 3 秒
await page.click('#mode-walk');
await page.waitForFunction(() => window.__mode === 'walk' && window.__walk, { timeout: 15000 });
const startPos = await page.evaluate(() => ({ ...window.__walk }));
await page.keyboard.down('KeyW');
await page.waitForTimeout(3000);
await page.keyboard.up('KeyW');
const endPos = await page.evaluate(() => ({ ...window.__walk }));
const movedM = Math.hypot(
  (endPos.lng - startPos.lng) * 111320 * Math.cos((endPos.lat * Math.PI) / 180),
  (endPos.lat - startPos.lat) * 111320
);
checks.walkMoved = movedM > 0.05;

// 视高：由公开状态（center/zoom/pitch/视口）三角学反算相机海拔，减去相机脚下地形高程
const eye = await page.evaluate(() => {
  const map = window.__map;
  const c = map.getCenter();
  const zoom = map.getZoom();
  const pitch = (map.getPitch() * Math.PI) / 180;
  const bearing = (map.getBearing() * Math.PI) / 180;
  const hPx = map.getContainer().clientHeight;
  const fovDeg = map.getVerticalFieldOfView ? map.getVerticalFieldOfView() : 36.87;
  const camDistPx = (0.5 * hPx) / Math.tan(((fovDeg / 2) * Math.PI) / 180);
  const mpp = (Math.cos((c.lat * Math.PI) / 180) * 40075016.686) / (512 * 2 ** zoom);
  const camDistM = camDistPx * mpp;
  const elevC = map.queryTerrainElevation?.(c) ?? 0;
  const camAlt = (elevC || 0) + camDistM * Math.cos(pitch);
  // 相机地面投影：从 center 沿 bearing 反向退 camDistM*sin(pitch)
  const back = camDistM * Math.sin(pitch);
  const dLat = (-back * Math.cos(bearing)) / 111320;
  const dLng = (-back * Math.sin(bearing)) / (111320 * Math.cos((c.lat * Math.PI) / 180));
  const camGround = { lng: c.lng + dLng, lat: c.lat + dLat };
  const elevCam = map.queryTerrainElevation?.(camGround) ?? 0;
  return { agl: camAlt - (elevCam || 0) };
});
checks.eyeAGL = +eye.agl.toFixed(2);
checks.eyeHeight = Math.abs(eye.agl - 1.7) < 0.5;

// 3) 碰撞：传送到新堡西侧，朝东（bearing 90）持续推进 600 步 x 0.1s（跑步 5m/s → 300m）
const finalPos = await page.evaluate(() => {
  const { walk } = window.__controls;
  walk.teleport([14.2500, 40.8386], 90);
  walk.keys.add('KeyW');
  walk.keys.add('ShiftLeft');
  for (let i = 0; i < 600; i++) walk.step(0.1);
  walk.keys.clear();
  return { lng: walk.pos.lng, lat: walk.pos.lat };
});
// 测试端独立点在多边形判定
const fc = JSON.parse(readFileSync(new URL('../public/data/buildings.geojson', import.meta.url)));
function pip(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
let insideAny = false;
for (const f of fc.features) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates]
    : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [];
  for (const poly of polys) {
    if (pip(finalPos.lng, finalPos.lat, poly[0])) { insideAny = true; break; }
  }
  if (insideAny) break;
}
const pushedM = (finalPos.lng - 14.25) * 111320 * Math.cos((40.8386 * Math.PI) / 180);
checks.collisionHeld = !insideAny && pushedM > 10; // 确实前进了，且没穿进建筑

// 4) 书签（轨道模式）
await page.click('#mode-orbit');
await page.waitForFunction(() => window.__mode === 'orbit', { timeout: 10000 });
const landmarks = await page.evaluate(() =>
  [...document.querySelectorAll('.bookmark-btn')].map((b) => b.dataset.landmark)
);
checks.bookmarkCount = landmarks.length === 5;
checks.bookmarks = {};
for (const id of landmarks) {
  await page.click(`.bookmark-btn[data-landmark="${id}"]`);
  await page.waitForTimeout(300);
  try {
    await page.waitForFunction(() => !window.__map.isMoving(), { timeout: 20000, polling: 500 });
  } catch {
    const st = await page.evaluate(() => ({
      mode: window.__mode,
      moving: window.__map.isMoving(),
      zoom: window.__map.getZoom(),
      fps: window.__fps,
    }));
    console.error(`STUCK on ${id}:`, JSON.stringify(st));
    throw new Error(`flyTo stuck on ${id}`);
  }
  const dist = await page.evaluate((lmId) => {
    const map = window.__map;
    const { LANDMARKS } = window.__cfg;
    const lm = LANDMARKS.find((l) => l.id === lmId);
    const c = map.getCenter();
    return Math.hypot(
      (c.lng - lm.lngLat[0]) * 111320 * Math.cos((c.lat * Math.PI) / 180),
      (c.lat - lm.lngLat[1]) * 111320
    );
  }, id);
  checks.bookmarks[id] = +dist.toFixed(0);
}
checks.bookmarksNear = Object.values(checks.bookmarks).every((d) => d < 200);
await page.close();

// ---------- 移动端视口 ----------
const mob = await browser.newPage({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
  isMobile: true,
});
await mob.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await mob.waitForFunction(() => window.__ready === true, { timeout: 40000 });
await mob.waitForFunction(() => !!window.__controls, { timeout: 20000 });
const mobHud = await mob.evaluate(() => {
  const inVp = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.left >= 0 && r.top >= 0 && r.right <= 375 && r.bottom <= 667;
  };
  return {
    modeSwitch: inVp(document.querySelector('.mode-switch')),
    bookmarks: inVp(document.getElementById('bookmarks')),
    pinchEnabled: window.__map.touchZoomRotate.isEnabled(),
  };
});
checks.mobileHud = mobHud.modeSwitch && mobHud.bookmarks;
checks.mobilePinch = mobHud.pinchEnabled;
await mob.close();

console.log(JSON.stringify(checks, null, 2));
const pass =
  checks.orbitZoomChanged && checks.orbitRotateChanged &&
  checks.walkMoved && checks.eyeHeight &&
  checks.collisionHeld &&
  checks.bookmarkCount && checks.bookmarksNear &&
  checks.mobileHud && checks.mobilePinch;
console.log(pass ? 'GATE4=PASS' : 'GATE4=FAIL');
await browser.close();
process.exit(pass ? 0 : 1);
