// 地标 POI：悬浮名牌 + 点击弹出三语简介卡片
import maplibregl from 'maplibre-gl';
import { LANDMARKS } from './config.js';

let cardEl = null;

function closeCard() {
  cardEl?.remove();
  cardEl = null;
}

function openCard(lm) {
  closeCard();
  cardEl = document.createElement('div');
  cardEl.className = 'poi-card';
  cardEl.id = 'poi-card';
  cardEl.innerHTML = `
    <button class="poi-close" aria-label="关闭">✕</button>
    <h2>${lm.name.zh}</h2>
    <div class="poi-alt">${lm.name.en} · ${lm.name.it}</div>
    <p>🇨🇳 ${lm.desc.zh}</p>
    <p>🇬🇧 ${lm.desc.en}</p>
    <p>🇮🇹 ${lm.desc.it}</p>
  `;
  cardEl.querySelector('.poi-close').addEventListener('click', closeCard);
  document.body.appendChild(cardEl);
}

export function setupPoi(map) {
  for (const lm of LANDMARKS) {
    const el = document.createElement('div');
    el.className = 'landmark-label';
    el.dataset.poi = lm.id;
    el.textContent = lm.name.zh;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openCard(lm);
    });
    new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(lm.lngLat)
      .addTo(map);
  }

  // 点击金色地标建筑也可打开卡片；点击空白处关闭
  map.on('click', (e) => {
    const hits = map.queryRenderedFeatures(e.point, { layers: ['buildings-3d'] });
    const lmId = hits.find((f) => f.properties.landmark)?.properties.landmark;
    if (lmId) {
      const lm = LANDMARKS.find((l) => l.id === lmId);
      if (lm) return openCard(lm);
    }
    closeCard();
  });
}
