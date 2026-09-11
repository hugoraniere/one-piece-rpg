import { preloadVillageAssets, VILLAGE_PROPS } from '../propRegistry.js';
import { STANDARD_PIER_LAYOUT } from '../ground.js';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../../config.js';

// Doca de madeira saindo da praia pro mar — fileira 1 encosta na areia,
// fileira 3 fecha em água nos 3 lados. Cai bem na última linha do mundo
// desta ilha (worldHeight 1920), então não precisa de peça de fechamento
// por baixo.
const PIER_DOCK = {
  colStart: 15, // x mundo: 1800-2160
  rowStart: 13, // y mundo: 1560-1920
  layout: STANDARD_PIER_LAYOUT,
};

// Ilha inicial do jogo — praia + vila, primeiro lugar que existiu (ver
// mapMenu.js). Único lugar que ainda usa o fundo pintado de uma peça só
// (scene_background.png) + curva de litoral extraída dele; ilhas novas (ver
// portomares.js) fazem o mesmo, cada uma com seu próprio par de arquivos.
export const VILA_DO_MASTRO_PARTIDO = {
  id: 'vila-do-mastro-partido',
  name: 'Vila do Mastro Partido',
  worldWidth: WORLD_WIDTH,
  worldHeight: WORLD_HEIGHT,
  spawnPoint: { x: 1280, y: 1517 }, // na praia, na frente do caminho descendo da praça
  discoveredByDefault: true,

  // Personagem e a paleta de terreno/doca do editor são compartilhados por
  // qualquer ilha — carregados uma vez em IslandScene.preload(), não aqui
  // (ver islandScene.js). Isto só carrega o que é ESPECÍFICO desta ilha.
  preloadAssets(scene) {
    scene.load.image('scene-background', 'assets/ground/scene_background.png');
    scene.load.json('water-line', 'assets/ground/scene_background_water_line.json');
    preloadVillageAssets(scene);
  },

  ground: { backgroundKey: 'scene-background' },
  water: { lineKey: 'water-line' },
  pierDock: PIER_DOCK,
  props: VILLAGE_PROPS,

  // Barco decorativo já existente (ver propRegistry.js) — reaproveitado como
  // ponto de interação de viagem (ver plano, marco 3) até ganhar arte de
  // barco a vela de verdade (marco 6).
  boatSpawn: { x: 2266, y: 1607 },

  // Só um valor provisório — o marco 5 do plano (boneco de treino) é quem
  // decide de verdade onde ele fica; até lá, ninguém lê este campo.
  monsterSpawn: { x: 700, y: 700 },
};
