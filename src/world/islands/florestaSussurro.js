import { preloadVillageAssets } from '../propRegistry.js';
import { STANDARD_PIER_LAYOUT } from '../ground.js';

// Terceira ilha — floresta densa e antiga, bem mais selvagem que a vila e o
// porto. Mesma técnica de fundo gerado por código das outras duas (ver
// VISUAL_STYLE_GUIDE.md), só que com paleta mais escura/desaturada e uma
// faixa de barro em vez de areia de praia. Nenhum asset novo precisou ser
// gerado — árvore antiga, árvore pequena, toco, tronco caído, pedras e
// arbustos já existiam no catálogo, só usados em densidade bem maior e sem
// nenhuma casa (é mata fechada, não vila).
export const FLORESTA_SUSSURRO_PROPS = [
  // --- Miolo da floresta: árvores densas, bem mais juntas que na vila ---
  { key: 'village-tree-ancient', x: 300, y: 200, scale: 1.16 },
  { key: 'village-tree-ancient', x: 520, y: 260, scale: 1.16 },
  { key: 'village-tree-small', x: 420, y: 320, scale: 1.71 },
  { key: 'village-tree-ancient', x: 900, y: 180, scale: 1.16 },
  { key: 'village-tree-small', x: 1050, y: 260, scale: 1.71 },
  { key: 'village-tree-small', x: 1200, y: 200, scale: 1.71 },
  { key: 'village-tree-ancient', x: 1450, y: 240, scale: 1.16 },
  { key: 'village-tree-ancient', x: 1700, y: 190, scale: 1.16 },
  { key: 'village-tree-small', x: 1850, y: 280, scale: 1.71 },
  { key: 'village-tree-ancient', x: 2050, y: 220, scale: 1.16 },
  { key: 'village-tree-small', x: 2250, y: 260, scale: 1.71 },
  { key: 'village-tree-ancient', x: 2420, y: 200, scale: 1.16 },
  { key: 'village-tree-small', x: 150, y: 350, scale: 1.71 },
  { key: 'village-tree-ancient', x: 1150, y: 420, scale: 1.16 },
  { key: 'village-tree-small', x: 1950, y: 440, scale: 1.71 },

  // --- Tocos, troncos caídos e raízes (R10/R11 do catálogo original) ---
  { key: 'village-tree-stump', x: 650, y: 420, scale: 0.22 },
  { key: 'village-tree-stump', x: 1600, y: 480, scale: 0.22 },
  { key: 'village-tree-stump', x: 2200, y: 460, scale: 0.22 },
  { key: 'prop-log', x: 800, y: 500, scale: 0.69, rotation: 12 },
  { key: 'prop-log', x: 1750, y: 520, scale: 0.69, rotation: -8 },

  // --- Pedras com musgo e arbustos — sub-bosque denso ---
  { key: 'village-rock-cluster', x: 400, y: 480, scale: 0.5 },
  { key: 'village-rock-cluster', x: 1300, y: 500, scale: 0.4 },
  { key: 'village-rock-cluster', x: 2100, y: 500, scale: 0.55 },
  { key: 'prop-bush-large', x: 550, y: 460, scale: 0.6 },
  { key: 'prop-bush-large', x: 1000, y: 440, scale: 0.6 },
  { key: 'prop-bush-flower', x: 1450, y: 460, scale: 0.5 },
  { key: 'prop-bush-large', x: 1900, y: 480, scale: 0.6 },
  { key: 'prop-bush-flower', x: 2350, y: 470, scale: 0.5 },
  { key: 'prop-flower', x: 900, y: 550, scale: 0.28 },
  { key: 'prop-flower', x: 1650, y: 570, scale: 0.28 },

  // --- Beira do rio/lago (barro e água) ---
  { key: 'village-rock-cluster', x: 1100, y: 700, scale: 0.35 },
  { key: 'water-rock', x: 1150, y: 830, scale: 0.7 },
  { key: 'water-lilypad-plain', x: 1400, y: 850, scale: 0.4 },
  { key: 'prop-rock-cluster-water', x: 500, y: 870, scale: 0.75 },

  // Barco a remo — mesma posição do boatSpawn logo abaixo. Um barco simples
  // puxado pra margem de lama combina mais com "chegada selvagem" do que o
  // barco a vela vistoso de Portomares.
  { key: 'water-boat-row', x: 1020, y: 850, scale: 0.85, rotation: 8 },
];

export const FLORESTA_SUSSURRO = {
  id: 'floresta-sussurro',
  name: 'Floresta Sussurro',
  worldWidth: 2560,
  worldHeight: 1920,
  spawnPoint: { x: 750, y: 650 }, // na margem de barro, de frente pra doca
  discoveredByDefault: true,

  preloadAssets(scene) {
    scene.load.image('floresta-sussurro-background', 'assets/ground/floresta_sussurro_background.png');
    scene.load.json('floresta-sussurro-water-line', 'assets/ground/floresta_sussurro_water_line.json');
    preloadVillageAssets(scene);
  },

  ground: { backgroundKey: 'floresta-sussurro-background' },
  water: { lineKey: 'floresta-sussurro-water-line' },
  pierDock: {
    colStart: 5, // x mundo: 600-960
    rowStart: 6, // y mundo: 720-1080
    layout: STANDARD_PIER_LAYOUT,
  },
  props: FLORESTA_SUSSURRO_PROPS,

  // Lago/rio de água doce, isolado — espécie própria (truta) e o menor
  // índice de lixo das três ilhas, água limpa e pouco visitada.
  fishing: { fishItemId: 'truta', junkChance: 0.02 },

  boatSpawn: { x: 1020, y: 850 },
  monsterSpawn: { x: 1800, y: 300 },
};
