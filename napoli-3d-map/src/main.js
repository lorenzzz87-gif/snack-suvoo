import './style.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { buildStyle } from './basemap.js';
import { INITIAL_VIEW, MAX_BOUNDS } from './config.js';

const statusEl = document.getElementById('loading-status');
const barEl = document.getElementById('progress-bar');
const retryBtn = document.getElementById('retry-btn');
const loadingEl = document.getElementById('loading');

function setProgress(pct, text) {
  barEl.style.width = `${pct}%`;
  if (text) statusEl.textContent = text;
}

function showRetry(msg) {
  statusEl.textContent = msg;
  retryBtn.hidden = false;
}

retryBtn.addEventListener('click', () => window.location.reload());

async function boot() {
  setProgress(15, '正在加载地图数据…');

  const map = new maplibregl.Map({
    container: 'map',
    style: buildStyle(),
    center: INITIAL_VIEW.center,
    zoom: INITIAL_VIEW.zoom,
    pitch: INITIAL_VIEW.pitch,
    bearing: INITIAL_VIEW.bearing,
    maxBounds: MAX_BOUNDS,
    minZoom: 12,
    maxZoom: 22.5, // 漫游模式相机距离目标仅 40m，需要高 zoom 上限

    maxPitch: 85,
    attributionControl: { compact: true },
    hash: false,
  });
  window.__map = map; // 供自动化 Gate 检查使用

  map.addControl(
    new maplibregl.NavigationControl({ visualizePitch: true }),
    'top-right'
  );

  // 数据源加载失败（GeoJSON 404 等）视为致命错误 → 重试 UI
  let fatal = false;
  map.on('error', (e) => {
    const msg = e?.error?.message || '';
    // DEM 瓦片偶发失败可容忍，仅统计
    if (/data\/(water|roads|landuse|buildings)/.test(e?.source?.data || '') || /Failed to fetch/.test(msg)) {
      window.__tileErrors = (window.__tileErrors || 0) + 1;
    }
    if (/data\//.test(String(e?.source?.data)) && !fatal) {
      fatal = true;
      showRetry('地图数据加载失败，请检查网络');
    }
  });

  // 等样式与首屏数据就绪；DEM 瓦片慢/失败不阻塞进入（有兜底超时）
  await new Promise((resolve) => {
    map.once('load', resolve);
    const poll = setInterval(() => {
      if (map.isStyleLoaded()) { clearInterval(poll); resolve(); }
    }, 500);
    setTimeout(() => { clearInterval(poll); resolve(); }, 15000);
  });
  setProgress(70, '正在渲染场景…');

  await new Promise((resolve) => {
    if (map.areTilesLoaded()) return resolve();
    const check = () => {
      if (map.areTilesLoaded()) {
        map.off('idle', check);
        resolve();
      }
    };
    map.on('idle', check);
    setTimeout(resolve, 8000);
  });

  const { initApp } = await import('./app.js');
  await initApp(map);

  setProgress(100, '就绪');
  loadingEl.classList.add('hidden');
  window.__ready = true;
}

boot().catch((err) => {
  console.warn('boot failed', err);
  showRetry('初始化失败，请重试');
});
