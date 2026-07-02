import { startPerfWatchdog } from './perf.js';
import { setupControls } from './controls.js';
import { setupHud } from './hud.js';
import { LANDMARKS } from './config.js';

window.__cfg = { LANDMARKS };

// 地图加载完成后的应用初始化：性能看护、控制模式、HUD
export async function initApp(map) {
  startPerfWatchdog(map);
  const controls = await setupControls(map);
  setupHud(map, controls);
}
