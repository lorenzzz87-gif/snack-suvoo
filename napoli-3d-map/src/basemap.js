// 完全本地化的底图样式：矢量数据与 DEM 瓦片均随应用分发，不依赖外部服务
const TERRAIN_TILES = '/dem/{z}/{x}/{y}.png';
const DEM_BOUNDS = [14.0, 40.6, 14.7, 41.05];

const GREEN_CLASSES = [
  'park', 'garden', 'grass', 'forest', 'wood', 'meadow', 'cemetery',
  'recreation_ground', 'village_green', 'greenfield', 'orchard', 'vineyard',
];

export function buildStyle() {
  return {
    version: 8,
    name: 'Napoli Centro Storico',
    sky: {
      'sky-color': '#8fbce8',
      'horizon-color': '#e8d9c0',
      'fog-color': '#e3d5c2',
      'sky-horizon-blend': 0.6,
      'horizon-fog-blend': 0.7,
      'fog-ground-blend': 0.75,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 10, 1, 16, 0.2],
    },
    light: {
      anchor: 'viewport',
      position: [1.3, 210, 35],
      color: '#fff4e0',
      intensity: 0.45,
    },
    terrain: { source: 'dem', exaggeration: 1.0 },
    sources: {
      dem: {
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        minzoom: 10,
        maxzoom: 14,
        bounds: DEM_BOUNDS,
        attribution: 'Terrain: Mapzen/AWS Open Data',
      },
      demHillshade: {
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        minzoom: 10,
        maxzoom: 14,
        bounds: DEM_BOUNDS,
      },
      water: { type: 'geojson', data: '/data/water.geojson' },
      landuse: { type: 'geojson', data: '/data/landuse.geojson' },
      roads: { type: 'geojson', data: '/data/roads.geojson' },
      buildings: { type: 'geojson', data: '/data/buildings.geojson' },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#e9e0cf' } },
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'demHillshade',
        paint: {
          'hillshade-exaggeration': 0.35,
          'hillshade-shadow-color': '#8c7a5f',
          'hillshade-highlight-color': '#fffbf0',
        },
      },
      {
        id: 'landuse-green',
        type: 'fill',
        source: 'landuse',
        filter: ['in', ['get', 'class'], ['literal', GREEN_CLASSES]],
        paint: { 'fill-color': '#b8cf9c', 'fill-opacity': 0.75 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'water',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#3f6f92', 'fill-opacity': 0.98 },
      },
      {
        id: 'roads-pedestrian',
        type: 'line',
        source: 'roads',
        filter: ['in', ['get', 'class'], ['literal', ['footway', 'pedestrian', 'steps', 'path', 'cycleway']]],
        paint: {
          'line-color': '#d9c9ae',
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0.3, 18, 2.5],
        },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'roads',
        filter: ['all',
          ['==', ['get', 'subtype'], 'road'],
          ['in', ['get', 'class'], ['literal', ['residential', 'living_street', 'unclassified', 'service', 'unknown']]],
        ],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fbf7ee',
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 0.8, 18, 9],
        },
      },
      {
        id: 'roads-major-casing',
        type: 'line',
        source: 'roads',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#cbb691',
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 3, 18, 22],
        },
      },
      {
        id: 'roads-major',
        type: 'line',
        source: 'roads',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#fdf9f0',
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 2, 18, 18],
        },
      },
      {
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'buildings',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': [
            'case',
            ['has', 'landmark'],
            '#d9a441',
            ['interpolate', ['linear'], ['get', 'h'],
              4, '#e3d9c6',
              20, '#d3c5ad',
              45, '#bfae94',
              90, '#a89577',
            ],
          ],
          'fill-extrusion-height': ['get', 'h'],
          'fill-extrusion-base': ['coalesce', ['get', 'min_h'], 0],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 14.2, 1],
          'fill-extrusion-vertical-gradient': true,
        },
      },
      {
        id: 'roads-rail',
        type: 'line',
        source: 'roads',
        filter: ['==', ['get', 'subtype'], 'rail'],
        paint: {
          'line-color': '#a89d8c',
          'line-width': 1.4,
          'line-dasharray': [3, 2],
        },
      },
    ],
  };
}
