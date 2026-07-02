// 性能看护：持续采样 FPS，低性能设备自动降级（关闭 3D 地形），
// 保证在无独显/老旧手机上依然可用。
const SAMPLE_MS = 3000;
const DEGRADE_BELOW = 20; // 连续两个窗口低于该 FPS 则降级

export function startPerfWatchdog(map) {
  let frames = 0;
  let windowStart = performance.now();
  let lowWindows = 0;
  let degraded = false;

  // 渲染循环心跳恢复：动画进行中却无渲染帧 → 渲染循环挂起，强制重启
  let renders = 0;
  map.on('render', () => renders++);
  setInterval(() => {
    if (map.isMoving() && renders === 0) {
      try {
        map._frameRequest = null;
        map.triggerRepaint();
      } catch { /* 恢复失败不影响主流程 */ }
    }
    renders = 0;
  }, 2000);

  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - windowStart >= SAMPLE_MS) {
      const fps = frames / ((now - windowStart) / 1000);
      window.__fps = +fps.toFixed(1);
      frames = 0;
      windowStart = now;
      if (!degraded && fps < DEGRADE_BELOW) {
        lowWindows++;
        if (lowWindows >= 2) {
          degraded = true;
          map.stop(); // 先干净地结束进行中的相机动画，避免地形移除瞬间的状态竞态
          map.setTerrain(null);
          map.triggerRepaint();
          window.__degraded = true;
          notify('已切换到轻量模式（关闭 3D 地形）以保证流畅');
        }
      } else if (fps >= DEGRADE_BELOW) {
        lowWindows = 0;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function notify(text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText =
    'position:fixed;top:60px;left:50%;transform:translateX(-50%);z-index:60;' +
    'background:rgba(18,26,40,.92);color:#f2ede4;padding:8px 16px;border-radius:8px;' +
    'font-size:.8rem;pointer-events:none;transition:opacity .5s';
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 4000);
  setTimeout(() => el.remove(), 4600);
}
