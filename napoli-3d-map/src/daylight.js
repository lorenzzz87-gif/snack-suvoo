// 地中海日照 / 日落色调切换
const MODES = {
  day: {
    light: { anchor: 'viewport', position: [1.3, 210, 35], color: '#fff4e0', intensity: 0.45 },
    sky: {
      'sky-color': '#8fbce8',
      'horizon-color': '#e8d9c0',
      'fog-color': '#e3d5c2',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.75,
    },
    water: '#3f6f92',
    background: '#e9e0cf',
  },
  sunset: {
    light: { anchor: 'viewport', position: [1.3, 250, 15], color: '#ffc98a', intensity: 0.55 },
    sky: {
      'sky-color': '#4a5f8a',
      'horizon-color': '#f2a65e',
      'fog-color': '#e8b98a',
      'sky-horizon-blend': 0.5,
      'horizon-fog-blend': 0.6,
      'fog-ground-blend': 0.7,
    },
    water: '#3a5a80',
    background: '#e3d3bd',
  },
};

let current = 'day';

export function toggleDaylight(map) {
  current = current === 'day' ? 'sunset' : 'day';
  const m = MODES[current];
  map.setLight(m.light);
  map.setSky(m.sky);
  map.setPaintProperty('water', 'fill-color', m.water);
  map.setPaintProperty('background', 'background-color', m.background);
  window.__daylight = current;
  return current;
}
