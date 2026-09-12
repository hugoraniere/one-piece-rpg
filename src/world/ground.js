import { TILE_SIZE } from '../config.js';

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

  // Kit de doca modular (18 peças, ver tools/reprocess_pier_kit.py) — ao
  // contrário do kit de grama/areia acima, aqui NÃO reduzimos pra "1 peça +
  // gira por código": o grão da madeira é direcional (pranchas horizontais),
  // então girar 90° deixaria o grão errado. Cada direção já vem desenhada
  // certa no próprio pacote.
  { key: 'pier-center', label: 'Doca (centro)' },
  { key: 'pier-edge-n', label: 'Doca (borda N)' },
  { key: 'pier-edge-e', label: 'Doca (borda L)' },
  { key: 'pier-edge-s', label: 'Doca (borda S)' },
  { key: 'pier-edge-w', label: 'Doca (borda O)' },
  { key: 'pier-outer-nw', label: 'Doca (canto ext. NO)' },
  { key: 'pier-outer-ne', label: 'Doca (canto ext. NE)' },
  { key: 'pier-outer-se', label: 'Doca (canto ext. SE)' },
  { key: 'pier-outer-sw', label: 'Doca (canto ext. SO)' },
  { key: 'pier-connect-n', label: 'Doca (conector N)' },
  { key: 'pier-connect-e', label: 'Doca (conector L)' },
  { key: 'pier-connect-s', label: 'Doca (conector S)' },
  { key: 'pier-connect-w', label: 'Doca (conector O)' },
  { key: 'pier-inner-nw', label: 'Doca (canto int. NO)' },
  { key: 'pier-inner-ne', label: 'Doca (canto int. NE)' },
  { key: 'pier-inner-se', label: 'Doca (canto int. SE)' },
  { key: 'pier-inner-sw', label: 'Doca (canto int. SO)' },
  { key: 'pier-t', label: 'Doca (T)' },
];

// Assets COMPARTILHADOS entre qualquer ilha (paleta de pintura do editor +
// kit de doca) — ao contrário do fundo/linha-d'água, que mudam de arquivo a
// cada ilha (ver islandConfig.preloadAssets em world/islands/*.js).
export function preloadTerrainPaletteAssets(scene) {
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

  scene.load.image('pier-center', 'assets/water/pier/pier_center.png');
  scene.load.image('pier-edge-n', 'assets/water/pier/pier_edge_n.png');
  scene.load.image('pier-edge-e', 'assets/water/pier/pier_edge_e.png');
  scene.load.image('pier-edge-s', 'assets/water/pier/pier_edge_s.png');
  scene.load.image('pier-edge-w', 'assets/water/pier/pier_edge_w.png');
  scene.load.image('pier-outer-nw', 'assets/water/pier/pier_outer_nw.png');
  scene.load.image('pier-outer-ne', 'assets/water/pier/pier_outer_ne.png');
  scene.load.image('pier-outer-se', 'assets/water/pier/pier_outer_se.png');
  scene.load.image('pier-outer-sw', 'assets/water/pier/pier_outer_sw.png');
  scene.load.image('pier-connect-n', 'assets/water/pier/pier_connect_n.png');
  scene.load.image('pier-connect-e', 'assets/water/pier/pier_connect_e.png');
  scene.load.image('pier-connect-s', 'assets/water/pier/pier_connect_s.png');
  scene.load.image('pier-connect-w', 'assets/water/pier/pier_connect_w.png');
  scene.load.image('pier-inner-nw', 'assets/water/pier/pier_inner_nw.png');
  scene.load.image('pier-inner-ne', 'assets/water/pier/pier_inner_ne.png');
  scene.load.image('pier-inner-se', 'assets/water/pier/pier_inner_se.png');
  scene.load.image('pier-inner-sw', 'assets/water/pier/pier_inner_sw.png');
  scene.load.image('pier-t', 'assets/water/pier/pier_t.png');
}

// Layout padrão (retângulo 3x3) do kit de doca de 18 peças — reaproveitado
// por qualquer ilha que precise de uma doca simples saindo da praia pro mar
// (ver world/islands/*.js). Fileira 1 é 100% madeira (encosta na terra),
// fileira 2 tem água nos dois lados, fileira 3 fecha em água nos 3 lados.
export const STANDARD_PIER_LAYOUT = [
  ['pier-center', 'pier-center', 'pier-center'],
  ['pier-edge-w', 'pier-center', 'pier-edge-e'],
  ['pier-outer-sw', 'pier-edge-s', 'pier-outer-se'],
];

// Doca de verdade, desenhada à mão com o kit de 18 peças (ver
// tools/reprocess_pier_kit.py) — mesmas peças disponíveis no pincel do
// editor, só que já plantadas no mapa por padrão. `scene.islandConfig.pierDock`
// dá a posição (colStart/rowStart, em tiles) e o layout — cada ilha planta a
// doca onde sua própria curva d'água encosta na terra (ver
// world/islands/*.js).
export function buildPierDock(scene) {
  const { colStart, rowStart, layout } = scene.islandConfig.pierDock;
  layout.forEach((rowKeys, rowOffset) => {
    rowKeys.forEach((key, colOffset) => {
      const col = colStart + colOffset;
      const row = rowStart + rowOffset;
      const tile = scene.add.image(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, key);
      tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
      tile.setDepth(-0.99); // mesma convenção do pincel do editor (ver paintTerrainAt em editorMode.js)
    });
  });
}

// buildWaterCollision (abaixo) bloqueia água em faixas de 32px seguindo a
// curva do mar inteira — sem isso, a doca ficaria visualmente andável mas
// com uma parede invisível por cima, já que o colisor não sabe que ali tem
// madeira em vez de água. A doca sempre ocupa a MESMA largura (em colunas)
// do seu próprio layout — não precisamos de um campo separado só pra isso.
function isUnderDock(pierDock, x) {
  const { colStart, layout } = pierDock;
  return x >= colStart * TILE_SIZE && x < (colStart + layout[0].length) * TILE_SIZE;
}

// Uma imagem só, do tamanho exato do mundo daquela ilha — o chão era faixas
// retas empilhadas antes; a fronteira grama/areia/água precisava ser uma
// curva orgânica, e isso não dá pra fazer bem só com tiles retangulares. O
// sistema de PINTURA de terreno do editor continua funcionando por cima
// dela, em qualquer ilha.
// Duas formas de montar o chão-base, escolhidas por `islandConfig.ground.kind`:
//
//   'image' (padrão, se `kind` não for informado) — uma imagem só, esticada
//   pro tamanho do mundo. É o que as 3 ilhas atuais usam (fundo gerado por
//   código, ver tools/gen_floresta_bg.py) — funciona bem pra uma pintura
//   única de litoral, mas não é o formato certo pra pixel art de verdade
//   (esticar um tile pixelado deforma o pixel).
//
//   'tiled' — repete uma textura pequena (um tile só) por todo o mundo,
//   via TileSprite (primitivo do próprio Phaser pra isso, um único draw
//   call, sem stretch nenhum — cada cópia do tile sai no tamanho nativo em
//   pixels). É o formato certo pro chão em pixel art: um tile de grama
//   (32x32, 64x64, etc.) repetido, e depois a variação/transição de verdade
//   entra por cima como PROPS individuais (bordas, água, caminho), do
//   mesmo jeito que os props de vila já funcionam — não por outro tile
//   embutido no chão-base.
export function buildGround(scene) {
  const ground = scene.islandConfig.ground;
  const { worldWidth, worldHeight } = scene.islandConfig;

  if (ground.kind === 'tiled') {
    const tile = scene.add.tileSprite(0, 0, worldWidth, worldHeight, ground.tileKey);
    tile.setOrigin(0, 0);
    tile.setDepth(-1);
    return;
  }

  const bg = scene.add.image(0, 0, ground.backgroundKey);
  bg.setOrigin(0, 0);
  bg.setDisplaySize(worldWidth, worldHeight);
  bg.setDepth(-1); // sempre atrás do personagem/props/terreno pintado
}

// "Perto o bastante da água pra pescar" (ou pra coletar isca improvisada) —
// cada ilha pode ajustar via islandConfig.water.fishingDistance; a maioria
// não precisa, então isso serve só de valor padrão.
const DEFAULT_FISHING_DISTANCE = 90; // pixels

// Impede o personagem de andar na água. A "linha d'água" (uma altura em
// pixels por coluna, ver islandConfig.water.lineKey) foi extraída do PNG de
// fundo daquela ilha por tools/build_terrain_background.py — aqui só
// ladrilhamos uma fileira de zonas estáticas invisíveis seguindo essa curva.
// Cada zona é larga o bastante pra não precisar de uma por coluna, mas usa a
// menor altura (mais perto da grama) dentro do seu trecho, senão um pico da
// curva dentro do trecho ficaria sem cobertura.
export function buildWaterCollision(scene, player) {
  const { water, pierDock, worldWidth } = scene.islandConfig;
  const data = scene.cache.json.get(water.lineKey);
  if (!data) return;
  const line = data.line;
  const segmentWidth = 32;
  const depth = 700; // bem mais que suficiente até o fundo do mundo

  for (let x = 0; x < worldWidth; x += segmentWidth) {
    if (isUnderDock(pierDock, x)) continue; // ali é madeira andável, não água (ver buildPierDock)
    const end = Math.min(x + segmentWidth, worldWidth);
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

// Altura (Y) da linha areia/água na coluna de `x` — base pra isNearWater
// (proximidade do jogador) e isWaterPoint (o alvo de um arremesso é água de
// verdade?). `null` se o JSON ainda não carregou.
export function getWaterLineY(scene, x) {
  const data = scene.cache.json.get(scene.islandConfig.water.lineKey);
  if (!data) return null;
  const col = Math.max(0, Math.min(Math.floor(x), data.line.length - 1));
  return data.line[col];
}

export function isNearWater(scene, x, y) {
  const waterY = getWaterLineY(scene, x);
  if (waterY === null) return false;
  const fishingDistance = scene.islandConfig.water.fishingDistance ?? DEFAULT_FISHING_DISTANCE;
  return Math.abs(y - waterY) <= fishingDistance;
}

// Um ponto de arremesso precisa estar do lado da ÁGUA da linha (Y maior,
// já que o mundo cresce pra baixo), não na areia — pequena tolerância pra
// cliques em cima da própria borda não serem rejeitados por 1px.
export function isWaterPoint(scene, x, y) {
  const waterY = getWaterLineY(scene, x);
  if (waterY === null) return false;
  return y >= waterY - 10;
}
