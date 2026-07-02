// 探索控制：轨道模式（MapLibre 手势）与街景漫游模式（WASD + 视角拖拽 + 碰撞）
import maplibregl from 'maplibre-gl';
import { WALK_EYE_HEIGHT, INITIAL_VIEW } from './config.js';

const WALK_SPEED = 1.6; // m/s
const RUN_SPEED = 5.0; // m/s（Shift）
const M_PER_DEG_LAT = 111320;

// ---------- 建筑碰撞：简易空间网格 + 射线法点在多边形内 ----------
class CollisionIndex {
  constructor(cellDeg = 0.0006) {
    this.cellDeg = cellDeg;
    this.grid = new Map();
  }

  static async load() {
    const idx = new CollisionIndex();
    const { APP_ROOT } = await import('./basemap.js');
    const fc = await fetch(`${APP_ROOT}data/buildings.geojson`).then((r) => r.json());
    for (const f of fc.features) {
      const polys =
        f.geometry.type === 'Polygon' ? [f.geometry.coordinates]
        : f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates
        : [];
      for (const poly of polys) idx.add(poly[0]); // 只用外环
    }
    return idx;
  }

  key(x, y) { return `${x}|${y}`; }

  add(ring) {
    let xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
    for (const [x, y] of ring) {
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    const c = this.cellDeg;
    for (let gx = Math.floor(xmin / c); gx <= Math.floor(xmax / c); gx++) {
      for (let gy = Math.floor(ymin / c); gy <= Math.floor(ymax / c); gy++) {
        const k = this.key(gx, gy);
        if (!this.grid.has(k)) this.grid.set(k, []);
        this.grid.get(k).push(ring);
      }
    }
  }

  isBlocked(lng, lat) {
    const c = this.cellDeg;
    const rings = this.grid.get(this.key(Math.floor(lng / c), Math.floor(lat / c)));
    if (!rings) return false;
    return rings.some((ring) => pointInRing(lng, lat, ring));
  }
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ---------- 漫游控制器 ----------
class WalkController {
  constructor(map, collision) {
    this.map = map;
    this.collision = collision;
    this.pos = { lng: INITIAL_VIEW.center[0], lat: INITIAL_VIEW.center[1] };
    this.bearing = 0;
    this.pitch = 83; // freeCamera pitch：≈ 平视略向下
    this.keys = new Set();
    this.active = false;
    this._raf = null;
    this._lastT = 0;

    this._onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return;
      this.keys.add(e.code);
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);

    // 拖拽调整视角
    this._dragging = false;
    this._lastXY = null;
    const canvas = map.getCanvas();
    this._onPointerDown = (e) => { this._dragging = true; this._lastXY = [e.clientX, e.clientY]; };
    this._onPointerMove = (e) => {
      if (!this._dragging || !this.active) return;
      const [lx, ly] = this._lastXY;
      this.bearing = (this.bearing + (e.clientX - lx) * 0.25 + 360) % 360;
      this.pitch = Math.min(85, Math.max(55, this.pitch - (e.clientY - ly) * 0.15));
      this._lastXY = [e.clientX, e.clientY];
    };
    this._onPointerUp = () => { this._dragging = false; };
    this._canvas = canvas;
  }

  enter(from) {
    this.active = true;
    const map = this.map;
    if (from) {
      this.pos = { lng: from.lng, lat: from.lat };
      this.bearing = map.getBearing();
    }
    // 起点若在建筑内，向外找最近的可行走点
    if (this.collision.isBlocked(this.pos.lng, this.pos.lat)) {
      for (let r = 0.00005; r < 0.003; r += 0.00005) {
        let found = false;
        for (let a = 0; a < 12; a++) {
          const lng = this.pos.lng + r * Math.cos((a * Math.PI) / 6);
          const lat = this.pos.lat + r * Math.sin((a * Math.PI) / 6);
          if (!this.collision.isBlocked(lng, lat)) {
            this.pos = { lng, lat };
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    for (const h of ['dragPan', 'dragRotate', 'scrollZoom', 'keyboard', 'doubleClickZoom', 'touchZoomRotate', 'touchPitch']) {
      map[h]?.disable?.();
    }
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this._canvas.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    this._lastT = performance.now();
    const loop = (t) => {
      if (!this.active) return;
      this.step((t - this._lastT) / 1000);
      this._lastT = t;
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  exit() {
    this.active = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    for (const h of ['dragPan', 'dragRotate', 'scrollZoom', 'keyboard', 'doubleClickZoom', 'touchZoomRotate', 'touchPitch']) {
      this.map[h]?.enable?.();
    }
  }

  teleport(lngLat, bearing = this.bearing) {
    this.pos = { lng: lngLat[0], lat: lngLat[1] };
    this.bearing = bearing;
    if (this.collision.isBlocked(this.pos.lng, this.pos.lat)) {
      // 落点在建筑内 → enter() 的脱困逻辑
      const wasActive = this.active;
      this.active = true;
      this.enterEscape();
      this.active = wasActive;
    }
  }

  enterEscape() {
    for (let r = 0.00005; r < 0.003; r += 0.00005) {
      for (let a = 0; a < 12; a++) {
        const lng = this.pos.lng + r * Math.cos((a * Math.PI) / 6);
        const lat = this.pos.lat + r * Math.sin((a * Math.PI) / 6);
        if (!this.collision.isBlocked(lng, lat)) {
          this.pos = { lng, lat };
          return;
        }
      }
    }
  }

  step(dt) {
    if (dt <= 0 || dt > 1) dt = 0.016;
    const k = this.keys;
    let fwd = 0, strafe = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
    if (k.has('KeyA')) strafe -= 1;
    if (k.has('KeyD')) strafe += 1;
    if (k.has('ArrowLeft')) this.bearing = (this.bearing - 60 * dt + 360) % 360;
    if (k.has('ArrowRight')) this.bearing = (this.bearing + 60 * dt) % 360;

    if (fwd || strafe) {
      const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED;
      const norm = Math.hypot(fwd, strafe) || 1;
      const meters = (speed * dt) / norm;
      const b = (this.bearing * Math.PI) / 180;
      const dx = (Math.sin(b) * fwd + Math.cos(b) * strafe) * meters;
      const dy = (Math.cos(b) * fwd - Math.sin(b) * strafe) * meters;
      const dLat = dy / M_PER_DEG_LAT;
      const dLng = dx / (M_PER_DEG_LAT * Math.cos((this.pos.lat * Math.PI) / 180));
      const nLng = this.pos.lng + dLng;
      const nLat = this.pos.lat + dLat;
      // 碰撞：整体 → 沿轴滑动 → 停
      if (!this.collision.isBlocked(nLng, nLat)) {
        this.pos = { lng: nLng, lat: nLat };
      } else if (!this.collision.isBlocked(nLng, this.pos.lat)) {
        this.pos = { lng: nLng, lat: this.pos.lat };
      } else if (!this.collision.isBlocked(this.pos.lng, nLat)) {
        this.pos = { lng: this.pos.lng, lat: nLat };
      }
    }

    // 海面/水下 DEM 为负值（海湾水深），行走高程钳到 ≥0
    const elevAt = (lngLat) =>
      Math.max(0, this.map.queryTerrainElevation?.(lngLat) ?? 0);
    const ground = elevAt(this.pos);
    const eye = ground + WALK_EYE_HEIGHT;

    // 视线落点取在地形表面（视线与地面的交点）：MapLibre 的中心点高程
    // 由地形系统自动设为地面高度（jumpTo 忽略 elevation 选项），
    // 只有让目标点贴地，相机才会被精确放在眼睛高度。
    const downAngle = ((90 - this.pitch) * Math.PI) / 180; // 俯角 ≥5°
    const b = (this.bearing * Math.PI) / 180;
    const atDist = (m) => ({
      lng: this.pos.lng + (m * Math.sin(b)) / (M_PER_DEG_LAT * Math.cos((this.pos.lat * Math.PI) / 180)),
      lat: this.pos.lat + (m * Math.cos(b)) / M_PER_DEG_LAT,
    });
    let lookM = WALK_EYE_HEIGHT / Math.tan(downAngle);
    let target = atDist(lookM);
    let tElev = elevAt(target);
    // 一次迭代逼近视线与起伏地形的交点（上坡拉近 / 下坡放远）
    lookM = Math.min(80, Math.max(4, (eye - tElev) / Math.tan(downAngle)));
    target = atDist(lookM);
    tElev = elevAt(target);

    const cam = this.map.calculateCameraOptionsFromTo(
      new maplibregl.LngLat(this.pos.lng, this.pos.lat), eye,
      new maplibregl.LngLat(target.lng, target.lat), tElev
    );
    delete cam.elevation; // jumpTo 忽略该字段，删除以免误导后续状态
    this.map.jumpTo(cam);

    window.__walk = {
      lng: this.pos.lng,
      lat: this.pos.lat,
      bearing: this.bearing,
      ground: ground || 0,
      eyeAGL: WALK_EYE_HEIGHT,
    };
  }
}

// ---------- 模式管理 ----------
export async function setupControls(map) {
  const collision = await CollisionIndex.load();
  const walk = new WalkController(map, collision);
  let mode = 'orbit';

  const api = {
    getMode: () => mode,
    collision,
    walk,
    setMode(next) {
      if (next === mode) return;
      if (next === 'walk') {
        walk.enter(map.getCenter());
        mode = 'walk';
      } else {
        walk.exit();
        mode = 'orbit';
        map.easeTo({
          center: [walk.pos.lng, walk.pos.lat],
          zoom: 16.5,
          pitch: 62,
          bearing: walk.bearing,
          duration: 800,
        });
      }
      window.__mode = mode;
      document.dispatchEvent(new CustomEvent('modechange', { detail: mode }));
    },
    flyToLandmark(lm) {
      if (mode === 'walk') {
        // 漫游模式：瞬移到地标旁
        walk.teleport(lm.lngLat);
        walk.enterEscape();
      } else {
        // 注意：地形开启 + 高倾角时 flyTo 会因逐帧高程重算而不收敛，
        // 用 easeTo + freezeElevation 保证动画稳定结束
        map.easeTo({
          center: lm.lngLat,
          zoom: lm.zoom ?? 16.8,
          pitch: 65,
          bearing: map.getBearing(),
          duration: 1800,
          freezeElevation: true,
          essential: true,
        });
      }
    },
  };

  window.__mode = mode;
  window.__controls = api;
  return api;
}
