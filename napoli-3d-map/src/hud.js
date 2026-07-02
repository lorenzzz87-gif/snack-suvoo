// HUD：标题、模式切换、操作提示、地标书签
import { LANDMARKS } from './config.js';

const HINTS = {
  orbit: '拖拽平移 · 右键/Ctrl+拖拽旋转 · 滚轮缩放<br/>移动端：单指平移 · 双指缩放旋转',
  walk: 'W/S 前进后退 · A/D 平移 · ←/→ 转向<br/>拖拽画面看四周 · Shift 奔跑',
};

export function setupHud(map, controls) {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="hud hud-top-left">
      <div class="hud-title">Napoli 3D<small>那不勒斯中心城区 · Centro Storico</small></div>
      <div class="mode-switch" role="tablist">
        <button id="mode-orbit" class="active" aria-label="轨道模式">🛰 轨道</button>
        <button id="mode-walk" aria-label="漫游模式">🚶 漫游</button>
      </div>
      <div class="hints" id="hints">${HINTS.orbit}</div>
    </div>
    <div class="hud hud-bookmarks" id="bookmarks"></div>
  `;
  document.body.appendChild(root);

  const orbitBtn = root.querySelector('#mode-orbit');
  const walkBtn = root.querySelector('#mode-walk');
  const hints = root.querySelector('#hints');

  orbitBtn.addEventListener('click', () => controls.setMode('orbit'));
  walkBtn.addEventListener('click', () => controls.setMode('walk'));
  document.addEventListener('modechange', (e) => {
    const m = e.detail;
    orbitBtn.classList.toggle('active', m === 'orbit');
    walkBtn.classList.toggle('active', m === 'walk');
    hints.innerHTML = HINTS[m];
  });

  const bm = root.querySelector('#bookmarks');
  for (const lm of LANDMARKS) {
    const btn = document.createElement('button');
    btn.className = 'bookmark-btn';
    btn.dataset.landmark = lm.id;
    btn.textContent = lm.name.zh;
    btn.title = lm.name.it;
    btn.addEventListener('click', () => controls.flyToLandmark(lm));
    bm.appendChild(btn);
  }
}
