// Fix Loop 诊断脚本：观察 boot 过程卡点
import { launchBrowser } from './launch.mjs';

const url = process.argv[2] || 'http://localhost:5173';
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => console.log(`[console.${m.type()}]`, m.text().slice(0, 300)));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('requestfailed', (r) => console.log('[reqfail]', r.url().slice(0, 120), r.failure()?.errorText));
page.on('response', (r) => { if (r.status() >= 400) console.log('[http]', r.status(), r.url().slice(0, 120)); });

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(15000);

const state = await page.evaluate(() => ({
  ready: window.__ready,
  hasMap: !!window.__map,
  loaded: window.__map?.loaded?.(),
  styleLoaded: window.__map?.isStyleLoaded?.(),
  tilesLoaded: window.__map?.areTilesLoaded?.(),
  status: document.getElementById('loading-status')?.textContent,
}));
console.log('STATE', JSON.stringify(state));
await page.screenshot({ path: process.env.SHOT || '/tmp/claude-0/-home-user-snack-suvoo/27be0c0f-d443-5aa3-87eb-0e05f51a1b69/scratchpad/debug.png' });
await browser.close();
