import { preloadVillageAssets } from '../propRegistry.js';
import { STANDARD_PIER_LAYOUT } from '../ground.js';

// Quarta ilha — a primeira "escondida" (discoveredByDefault: false, ver
// index.js), pensada pra ser o alvo real do mecanismo de descoberta do
// mapa (ver ui/mapMenu.js: silhueta desconhecida -> viagem às cegas ->
// revela). Só existe porque o mecanismo de descoberta PRECISA de algo de
// verdade pra apontar; não é (ainda) um destino totalmente pronto.
//
// Terreno de propósito NÃO mexido nesta rodada (pedido explícito — o
// terreno pixel art de verdade vai ser desenhado à mão): chão é o tile
// 'ground-dirt' já cadastrado, repetido por todo o mundo via o novo modo
// `kind: 'tiled'` de ground.js — sem curva visível de litoral, só uma
// cor plana de propósito, ao contrário das outras 3 ilhas. A água ainda
// funciona de verdade (colisão, pesca, doca) porque reaproveita a MESMA
// curva de dados da Floresta Sussurro (mesmo arquivo JSON, carregado de
// novo aqui só pra ganhar uma chave de cache própria) — dado de jogo, não
// arte, então não conta como "mexer no terreno". Quando a pixel art
// chegar, troca-se `ground.tileKey` e pronto, sem tocar em mais nada
// desta ilha.
export const PANTANO_RONCO_PROPS = [
  // Poucas árvores, bem espaçadas — pântano é mais aberto que a Floresta
  // Sussurro, não mata fechada.
  { key: 'village-tree-ancient', x: 400, y: 220, scale: 1.16 },
  { key: 'village-tree-small', x: 1300, y: 200, scale: 1.71 },
  { key: 'village-tree-ancient', x: 2100, y: 240, scale: 1.16 },

  // Decadência/apodrecimento — tocos e troncos caídos em maior proporção
  // que árvores em pé, pra ler como pântano, não floresta viva.
  { key: 'village-tree-stump', x: 700, y: 400, scale: 0.22 },
  { key: 'village-tree-stump', x: 1550, y: 440, scale: 0.22 },
  { key: 'village-tree-stump', x: 2250, y: 420, scale: 0.22 },
  { key: 'prop-log', x: 950, y: 480, scale: 0.69, rotation: 20 },
  { key: 'prop-log', x: 1900, y: 500, scale: 0.69, rotation: -15 },

  // Pedras e arbustos esparsos — bem menos densos que a Floresta Sussurro.
  { key: 'village-rock-cluster', x: 550, y: 470, scale: 0.45 },
  { key: 'village-rock-cluster', x: 1750, y: 490, scale: 0.5 },
  { key: 'prop-bush-large', x: 1150, y: 460, scale: 0.55 },
  { key: 'prop-bush-large', x: 2000, y: 470, scale: 0.55 },

  // Beira d'água — reaproveita as mesmas peças de água das outras ilhas.
  { key: 'water-rock', x: 1150, y: 830, scale: 0.7 },
  { key: 'water-lilypad-plain', x: 1400, y: 850, scale: 0.4 },
  { key: 'prop-rock-cluster-water', x: 500, y: 870, scale: 0.75 },

  // Barco a remo, mesma posição do boatSpawn — chegada modesta, igual a
  // Floresta Sussurro (não é porto de verdade, não merece o barco a vela).
  { key: 'water-boat-row', x: 1020, y: 850, scale: 0.85, rotation: 8 },
];

export const PANTANO_RONCO = {
  id: 'pantano-ronco',
  name: 'Pântano Ronco',
  worldWidth: 2560,
  worldHeight: 1920,
  spawnPoint: { x: 750, y: 650 }, // mesma curva d'água da Floresta Sussurro, mesmo ponto relativo
  discoveredByDefault: false, // só aparece no mapa como silhueta, até o jogador zarpar rumo ao desconhecido

  preloadAssets(scene) {
    // Chão placeholder — ver comentário grande no topo do arquivo.
    // 'pantano-ronco-water-line' é o MESMO arquivo de dados da Floresta
    // Sussurro, só carregado sob uma chave própria (cada ilha tem sua
    // própria entrada no cache do Phaser, mesmo quando o conteúdo é
    // idêntico) — reaproveitar a curva já existente evita inventar uma
    // nova (que seria, de novo, "mexer em terreno").
    scene.load.json('pantano-ronco-water-line', 'assets/ground/floresta_sussurro_water_line.json');
    preloadVillageAssets(scene);
  },

  ground: { kind: 'tiled', tileKey: 'ground-dirt' },
  water: { lineKey: 'pantano-ronco-water-line' },
  pierDock: {
    colStart: 5, // x mundo: 600-960 — mesma posição da Floresta Sussurro (mesma curva)
    rowStart: 6, // y mundo: 720-1080
    layout: STANDARD_PIER_LAYOUT,
  },
  props: PANTANO_RONCO_PROPS,

  fishing: { fishItemId: 'peixe', junkChance: 0.1 },

  boatSpawn: { x: 1020, y: 850 },
  monsterSpawn: { x: 1900, y: 300 },
};
