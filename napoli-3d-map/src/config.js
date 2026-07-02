// 那不勒斯中心城区配置
export const DATA_BBOX = [14.225, 40.82, 14.278, 40.862];

// 可视范围包围盒（略大于数据范围，含那不勒斯湾）
export const MAX_BOUNDS = [
  [14.195, 40.785],
  [14.305, 40.888],
];

export const INITIAL_VIEW = {
  center: [14.2488, 40.834],
  zoom: 14.6,
  pitch: 62,
  bearing: 18,
};

export const WALK_EYE_HEIGHT = 1.7; // 街景漫游视点高度（米）

export const LANDMARKS = [
  {
    id: 'castel-nuovo',
    lngLat: [14.2528, 40.8386],
    name: { zh: '新堡（安茹城堡）', en: 'Castel Nuovo', it: 'Castel Nuovo (Maschio Angioino)' },
    zoom: 16.8,
    desc: {
      zh: '始建于 1279 年的中世纪城堡，扼守那不勒斯港口，白色凯旋门是阿拉贡王朝的杰作。',
      en: 'A medieval castle built in 1279 guarding the port, famed for its white triumphal arch of the Aragonese kings.',
      it: 'Castello medievale del 1279 a guardia del porto, celebre per l’arco trionfale aragonese.',
    },
  },
  {
    id: 'duomo',
    lngLat: [14.2597, 40.8524],
    name: { zh: '那不勒斯主教座堂', en: 'Naples Cathedral (Duomo)', it: 'Duomo di Napoli' },
    zoom: 17,
    desc: {
      zh: '供奉圣雅纳略的哥特式主教座堂，每年"圣血液化"奇迹仪式在此举行。',
      en: 'Gothic cathedral of San Gennaro, home of the famous blood-liquefaction miracle ceremony.',
      it: 'Cattedrale gotica di San Gennaro, sede del miracolo della liquefazione del sangue.',
    },
  },
  {
    id: 'galleria-umberto',
    lngLat: [14.2494, 40.8387],
    name: { zh: '翁贝托一世长廊', en: 'Galleria Umberto I', it: 'Galleria Umberto I' },
    zoom: 17,
    desc: {
      zh: '1890 年落成的玻璃穹顶购物长廊，新艺术风格的城市客厅。',
      en: 'A glass-domed shopping arcade completed in 1890, the city’s elegant Art Nouveau salon.',
      it: 'Galleria commerciale con cupola in vetro del 1890, salotto liberty della città.',
    },
  },
  {
    id: 'castel-dellovo',
    lngLat: [14.2475, 40.8282],
    name: { zh: '蛋堡', en: 'Castel dell’Ovo', it: 'Castel dell’Ovo' },
    zoom: 16.5,
    desc: {
      zh: '那不勒斯最古老的城堡，坐落于海中小岛，传说维吉尔在地基里藏了一枚魔法蛋。',
      en: 'The oldest castle in Naples, set on a small island — legend says Virgil hid a magic egg in its foundations.',
      it: 'Il castello più antico di Napoli, su un isolotto: la leggenda narra dell’uovo magico di Virgilio.',
    },
  },
  {
    id: 'teatro-san-carlo',
    lngLat: [14.2497, 40.8376],
    name: { zh: '圣卡洛剧院', en: 'Teatro di San Carlo', it: 'Teatro di San Carlo' },
    zoom: 17.2,
    desc: {
      zh: '1737 年启用，欧洲现存最古老的持续运营歌剧院。',
      en: 'Opened in 1737, the oldest continuously active opera house in Europe.',
      it: 'Inaugurato nel 1737, il teatro d’opera attivo più antico d’Europa.',
    },
  },
];
