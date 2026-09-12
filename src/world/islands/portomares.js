import { preloadVillageAssets } from '../propRegistry.js';
import { STANDARD_PIER_LAYOUT } from '../ground.js';

// Segunda ilha de verdade — vila portuária (mercado, ferraria, doca maior),
// reaproveitando ao máximo os mesmos assets reais já usados na Vila do
// Mastro Partido (casas, cerca, barril, lanterna...) + os 2 que faltavam no
// catálogo (ferraria e barraca de mercado, ver propRegistry.js) + um barco
// a vela recortado à mão do Pack07 original, só pra esta ilha (ver
// boatSpawn). Fundo próprio (chão + linha d'água) gerado por código, mesma
// técnica/paleta do fundo da ilha 1 (ver VISUAL_STYLE_GUIDE.md) — nenhuma
// pintura de litoral pronta existia pra um segundo lugar ainda.
export const PORTOMARES_PROPS = [
  // --- Borda de grama (fundo do mapa) ---
  { key: 'village-tree-ancient', x: 150, y: 430, scale: 1.16 },
  { key: 'village-tree-small', x: 900, y: 400, scale: 1.71 },
  { key: 'village-tree-ancient', x: 2100, y: 420, scale: 1.16 },
  { key: 'village-tree-small', x: 2450, y: 470, scale: 1.71 },

  // --- Casas ao longo da faixa de areia ---
  { key: 'village-house-straw', x: 450, y: 650, scale: 0.84, collision: { width: 185, height: 48 } },
  { key: 'village-house-blue', x: 2050, y: 680, scale: 0.87, collision: { width: 210, height: 50 } },
  { key: 'village-fence', x: 600, y: 700, scale: 0.59, collision: { width: 110, height: 20 } },
  { key: 'village-fence', x: 2150, y: 760, scale: 0.59, collision: { width: 110, height: 20 } },
  { key: 'village-clothesline', x: 550, y: 730, scale: 0.53 },
  { key: 'village-planter', x: 2000, y: 760, scale: 0.26 },
  { key: 'village-chest-closed', x: 1900, y: 750, scale: 0.06 },

  // --- Ferraria — landmark, um pouco afastada do mercado ---
  { key: 'village-forge', x: 1750, y: 700, scale: 0.42, collision: { width: 220, height: 55 } },
  { key: 'village-barrel', x: 1620, y: 730, scale: 0.39 },
  { key: 'village-crate', x: 1860, y: 725, scale: 0.09 },

  // --- Mercado, perto da entrada da doca ---
  { key: 'village-market-stall', x: 1020, y: 760, scale: 0.3, collision: { width: 140, height: 40 } },
  { key: 'village-market-stall', x: 1150, y: 790, scale: 0.3, collision: { width: 140, height: 40 } },
  { key: 'village-noticeboard', x: 1300, y: 760, scale: 0.79 },
  { key: 'village-lantern', x: 900, y: 700, scale: 0.66 },
  { key: 'village-lantern', x: 1500, y: 700, scale: 0.66 },
  { key: 'village-barrel', x: 1080, y: 820, scale: 0.39 },
  { key: 'village-barrel', x: 1200, y: 830, scale: 0.39 },
  { key: 'village-crate', x: 1250, y: 815, scale: 0.09 },
  { key: 'village-lootsack', x: 1180, y: 840, scale: 0.07 },

  // --- Vegetação/decoração, com menos densidade que a vila (porto é mais
  // construído que verde) ---
  { key: 'village-rock-cluster', x: 300, y: 750, scale: 0.4 },
  { key: 'prop-bush-large', x: 700, y: 650, scale: 0.52 },
  { key: 'prop-bush-flower', x: 1850, y: 700, scale: 0.46 },
  { key: 'prop-flower', x: 1600, y: 650, scale: 0.28 },

  // --- Beira d'água ---
  { key: 'water-rock', x: 1650, y: 1000, scale: 0.7 },
  { key: 'water-lilypad-plain', x: 800, y: 1150, scale: 0.4 },
  { key: 'prop-rock-cluster-water', x: 1900, y: 1180, scale: 0.8 },

  // Barco a vela — mesma posição de boatSpawn logo abaixo, só que como prop
  // visível de verdade (ver islandScene.js#handleGather pro gatilho de G).
  { key: 'water-boat-sail', x: 1600, y: 1150, scale: 0.8 },
];

export const PORTOMARES = {
  id: 'portomares',
  name: 'Portomares',
  worldWidth: 2560,
  worldHeight: 1920,
  spawnPoint: { x: 1260, y: 900 }, // na areia, de frente pro mercado e a doca
  // Ainda não existe um sistema de "explorar pra descobrir" — as duas ilhas
  // já são conhecidas desde o início (fofoca de porto: todo marinheiro sabe
  // que Portomares existe, só falta ter ido lá). Um mecanismo de descoberta
  // de verdade (silhueta desconhecida -> viagem às cegas -> revela) é
  // trabalho futuro, não deste marco.
  discoveredByDefault: true,

  // Personagem e a paleta de terreno/doca do editor já são carregados por
  // IslandScene.preload() (compartilhados) — isto só carrega o que é
  // ESPECÍFICO desta ilha: fundo próprio + os mesmos props de sempre
  // (preloadVillageAssets já inclui ferraria/barraca/barco a vela).
  preloadAssets(scene) {
    scene.load.image('portomares-background', 'assets/ground/portomares_background.png');
    scene.load.json('portomares-water-line', 'assets/ground/portomares_water_line.json');
    preloadVillageAssets(scene);
  },

  ground: { backgroundKey: 'portomares-background' },
  water: { lineKey: 'portomares-water-line' },
  pierDock: {
    colStart: 10, // x mundo: 1200-1560
    rowStart: 8, // y mundo: 960-1320
    layout: STANDARD_PIER_LAYOUT,
  },
  props: PORTOMARES_PROPS,

  // Água de porto movimentado: espécie própria (robalo) e mais chance de
  // lixo que as outras duas ilhas — tráfego de barco de verdade.
  fishing: { fishItemId: 'robalo', junkChance: 0.15 },

  boatSpawn: { x: 1600, y: 1150 },
  monsterSpawn: { x: 2300, y: 500 },

  // Entre as duas barracas de mercado — ver handleSell em islandScene.js.
  // Só Portomares tem isto por enquanto; a Vila e a Floresta não têm
  // mercado, então G nunca cai nesse ramo lá (ver checagem `marketSpawn &&`
  // antes de medir distância).
  marketSpawn: { x: 1085, y: 775 },
};
