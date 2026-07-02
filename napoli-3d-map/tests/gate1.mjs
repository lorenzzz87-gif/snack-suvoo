// Gate 1：页面加载无未捕获错误，标题含 Napoli 3D
import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://localhost:5173';
export const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

const title = await page.title();
const ok = title.includes('Napoli 3D') && errors.length === 0;
console.log(JSON.stringify({ title, errors }, null, 2));
await browser.close();
process.exit(ok ? 0 : 1);
