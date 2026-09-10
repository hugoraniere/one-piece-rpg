import { WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';

// Peças de caminho entram como TERRENO, não prop — elas são blocos de chão
// de um tile inteiro (pintam encaixado no grid de 120px), não objetos com
// "pé" que ficam por cima do chão.
export const EDITOR_TERRAIN_PALETTE = [
  { key: 'ground-dirt', label: 'Terra' },
  { key: 'ground-grass', label: 'Grama' },
  { key: 'ground-sand', label: 'Areia' },
  { key: 'ground-water', label: 'Água' },
  { key: 'ground-transition-dirt-grass', label: 'Transição terra/grama' },
  { key: 'ground-transition-sand-grass', label: 'Transição grama/areia' },
  { key: 'village-path-straight-h', label: 'Caminho reto (h)' },
  { key: 'village-path-straight-v', label: 'Caminho reto (v)' },
  { key: 'village-path-corner', label: 'Caminho (curva)' },
  { key: 'village-path-tjunction', label: 'Caminho (T)' },
  { key: 'village-path-crossroad', label: 'Caminho (cruzamento)' },
  { key: 'ground-transition-sand-water', label: 'Transição areia/água A' },
  { key: 'ground-transition-sand-water-b', label: 'Transição areia/água B' },
  { key: 'ground-transition-sand-water-c', label: 'Transição areia/água C' },
  { key: 'ground-transition-sand-water-d', label: 'Transição areia/água D' },

  // Kit de autotile grama↔areia orgânico — ver GRASS_SAND_TILE_USAGE_GUIDE.md
  // original. Pinte seguindo a lógica do guia: borda reta pra trecho longo,
  // canto externo onde a areia faz uma barriga pra fora, canto interno onde
  // a grama "morde" a areia, península pra terminar um braço estreito. O
  // pacote veio com uma peça pronta por rotação (0/90/180/270); como são só
  // rotações de 90° de uma imagem quadrada, usamos 1 arquivo só por forma e
  // giramos por código com a tecla R (ver editorMode.js); dá o
  // mesmo resultado pixel a pixel e permite girar antes de pintar.
  { key: 'ground-sand-edge-a', label: 'Praia reta A' },
  { key: 'ground-sand-edge-b', label: 'Praia reta B' },
  { key: 'ground-sand-outer-corner-0', label: 'Canto externo (R gira)' },
  { key: 'ground-sand-inner-corner-0', label: 'Canto interno (R gira)' },
  { key: 'ground-sand-peninsula-0', label: 'Ponta de areia (R gira)' },
];

export function preloadGroundAssets(scene) {
  scene.load.image('scene-background', 'assets/ground/scene_background.png');
  // Altura da linha areia/água por coluna, extraída do PNG acima — usada só
  // pra montar a colisão que impede andar na água (ver buildWaterCollision).
  scene.load.json('water-line', 'assets/ground/scene_background_water_line.json');

  // Ainda carregados pra pintura de terreno pontual no editor (touch-up
  // por cima do background), mesmo não sendo mais a base do mapa.
  scene.load.image('ground-grass', 'assets/ground/grass.png');
  scene.load.image('ground-dirt', 'assets/ground/dirt.png');
  scene.load.image('ground-sand', 'assets/ground/sand.png');
  scene.load.image('ground-transition-dirt-grass', 'assets/ground/transition_dirt_grass.png');
  scene.load.image('ground-transition-sand-grass', 'assets/ground/transition_sand_grass.png');
  scene.load.image('ground-water', 'assets/ground/water.png');
  scene.load.image('ground-transition-sand-water', 'assets/ground/transition_sand_water.png');
  scene.load.image('ground-transition-sand-water-b', 'assets/ground/transition_sand_water_b.png');
  scene.load.image('ground-transition-sand-water-c', 'assets/ground/transition_sand_water_c.png');
  scene.load.image('ground-transition-sand-water-d', 'assets/ground/transition_sand_water_d.png');
  scene.load.image('ground-sand-edge-a', 'assets/ground/sand_edge_a.png');
  scene.load.image('ground-sand-edge-b', 'assets/ground/sand_edge_b.png');
  scene.load.image('ground-sand-outer-corner-0', 'assets/ground/sand_outer_corner_0.png');
  scene.load.image('ground-sand-inner-corner-0', 'assets/ground/sand_inner_corner_0.png');
  scene.load.image('ground-sand-peninsula-0', 'assets/ground/sand_peninsula_0.png');
}

export function buildGround(scene) {
  // Uma imagem só, do tamanho exato do mundo — o chão era faixas retas
  // empilhadas antes; a fronteira grama/areia/água precisava ser uma curva
  // orgânica (medida a partir da referência, ver BEACH_SCENE_ANALYSIS.md),
  // e isso não dá pra fazer bem só com tiles retangulares. O sistema de
  // PINTURA de terreno do editor continua funcionando por cima dela.
  const bg = scene.add.image(0, 0, 'scene-background');
  bg.setOrigin(0, 0);
  bg.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
  bg.setDepth(-1); // sempre atrás do personagem/props/terreno pintado
}

// Impede o personagem de andar na água. A "linha d'água" (uma altura em
// pixels por coluna) foi extraída do próprio PNG de fundo por
// tools/build_terrain_background.py — aqui só ladrilhamos uma fileira de
// zonas estáticas invisíveis seguindo essa curva. Cada zona é larga o
// bastante pra não precisar de uma por coluna, mas usa a menor altura
// (mais perto da grama) dentro do seu trecho, senão um pico da curva
// dentro do trecho ficaria sem cobertura.
export function buildWaterCollision(scene, player) {
  const data = scene.cache.json.get('water-line');
  if (!data) return;
  const line = data.line;
  const segmentWidth = 32;
  const depth = 700; // bem mais que suficiente até o fundo do mundo

  for (let x = 0; x < WORLD_WIDTH; x += segmentWidth) {
    const end = Math.min(x + segmentWidth, WORLD_WIDTH);
    let minY = line[x];
    for (let i = x + 1; i < end; i++) {
      if (line[i] < minY) minY = line[i];
    }
    const w = end - x;
    const zone = scene.add.zone(x + w / 2, minY + depth / 2, w, depth);
    scene.physics.add.existing(zone, true);
    scene.physics.add.collider(player, zone);
  }
}

// "Perto o bastante da água pra pescar" — reaproveita a mesma curva de
// buildWaterCollision em vez de mais uma zona física: só compara uma
// posição com a altura da linha d'água na coluna dela.
const FISHING_DISTANCE = 90; // pixels

// Altura (Y) da linha areia/água na coluna de `x` — base pra isNearWater
// (proximidade do jogador) e isWaterPoint (o alvo de um arremesso é água de
// verdade?). `null` se o JSON ainda não carregou.
export function getWaterLineY(scene, x) {
  const data = scene.cache.json.get('water-line');
  if (!data) return null;
  const col = Math.max(0, Math.min(Math.floor(x), data.line.length - 1));
  return data.line[col];
}

export function isNearWater(scene, x, y) {
  const waterY = getWaterLineY(scene, x);
  if (waterY === null) return false;
  return Math.abs(y - waterY) <= FISHING_DISTANCE;
}

// Um ponto de arremesso precisa estar do lado da ÁGUA da linha (Y maior,
// já que o mundo cresce pra baixo), não na areia — pequena tolerância pra
// cliques em cima da própria borda não serem rejeitados por 1px.
export function isWaterPoint(scene, x, y) {
  const waterY = getWaterLineY(scene, x);
  if (waterY === null) return false;
  return y >= waterY - 10;
}
