import './style.css';

const statusEl = document.getElementById('loading-status');
const barEl = document.getElementById('progress-bar');

export function setProgress(pct, text) {
  if (barEl) barEl.style.width = `${pct}%`;
  if (statusEl && text) statusEl.textContent = text;
}

setProgress(10, '正在初始化…');

// 阶段 1 最小场景：后续阶段在此挂载地图
async function boot() {
  setProgress(100, '就绪');
  document.getElementById('loading').classList.add('hidden');
}

boot();
