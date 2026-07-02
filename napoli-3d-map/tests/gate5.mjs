// Gate 5：视觉打磨与信息层
// 1) 点击 POI 标签弹出非空卡片；点击空白处关闭
// 2) 日落切换确实改变光照/天空
// 3) 断网（数据请求全部失败）时出现重试 UI 而非白屏
// 4) 首屏 JS gzip < 800KB（构建产物，脚本断言，见 plan.md Gate 5 修订）
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './launch.mjs';

const url = process.argv[2] || 'http://localhost:5173';
const root = fileURLToPath(new URL('..', import.meta.url));
const checks = {};

// 4) 构建 + 体积
execSync('npm run build', { cwd: root, stdio: 'pipe' });
let jsGzip = 0, cssGzip = 0;
for (const f of readdirSync(`${root}/dist/assets`)) {
  const gz = gzipSync(readFileSync(`${root}/dist/assets/${f}`)).length;
  if (f.endsWith('.js')) jsGzip += gz;
  if (f.endsWith('.css')) cssGzip += gz;
}
checks.jsGzipKB = Math.round(jsGzip / 1024);
checks.jsBudget = jsGzip < 800 * 1024;

const browser = await launchBrowser();

// 1) + 2) POI 与日落
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.__ready === true && window.__controls, { timeout: 40000 });

// 飞到新堡使标签在视野内
await page.evaluate(() => window.__map.jumpTo({ center: [14.2528, 40.8386], zoom: 16.5, pitch: 55 }));
await page.waitForTimeout(1000);
await page.click('.landmark-label[data-poi="castel-nuovo"]');
await page.waitForTimeout(400);
const card = await page.evaluate(() => {
  const el = document.getElementById('poi-card');
  return el ? el.textContent.trim().length : 0;
});
checks.poiCardOpens = card > 80; // 三语内容非空

// 点击空白（海面）关闭
await page.evaluate(() => window.__map.jumpTo({ center: [14.2450, 40.8250], zoom: 15, pitch: 0 }));
await page.waitForTimeout(600);
await page.mouse.click(950, 300); // 避开卡片与 HUD 的空白海面区域
await page.waitForTimeout(400);
checks.poiCardCloses = await page.evaluate(() => !document.getElementById('poi-card'));

// 日落切换
const lightBefore = await page.evaluate(() => JSON.stringify(window.__map.getLight()));
await page.click('#sun-toggle');
await page.waitForTimeout(600);
const lightAfter = await page.evaluate(() => JSON.stringify(window.__map.getLight()));
checks.daylightToggles = lightBefore !== lightAfter &&
  (await page.evaluate(() => window.__daylight === 'sunset'));
await page.close();

// 3) 断网重试 UI
const off = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await off.route('**/data/**', (r) => r.abort());
await off.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await off.waitForTimeout(8000);
const retry = await off.evaluate(() => {
  const btn = document.getElementById('retry-btn');
  return btn && !btn.hidden;
});
checks.offlineRetryUi = !!retry;
await off.close();

console.log(JSON.stringify(checks, null, 2));
const pass =
  checks.jsBudget && checks.poiCardOpens && checks.poiCardCloses &&
  checks.daylightToggles && checks.offlineRetryUi;
console.log(pass ? 'GATE5=PASS' : 'GATE5=FAIL');
await browser.close();
process.exit(pass ? 0 : 1);
