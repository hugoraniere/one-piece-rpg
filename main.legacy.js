// ============================================================================
// BASE DE MOVIMENTAÇÃO — protótipo pra testar o personagem andando no chão.
//
// Personagem real (assets/characters/), fundo verde já removido — ver
// tools/remove_chroma_key.py. Idle completo nas 4 direções (costas tem 2
// frames que alternam bem devagar, tipo respiração) + caminhada de frente,
// costas e perfil (perfil ainda é uma arte só, espelhada pra virar direita
// /esquerda — idle não espelha mais porque já tem arte própria dos dois
// lados). Falta: corrida, ataque, dano, habilidade, morte, vitória — ver
// CHARACTER_ASSETS_TODO.md pro mapeamento completo.
// ============================================================================

const PLAYER_SPEED = 160; // pixels por segundo
const CHAR_SCALE = 0.65; // escala de exibição — ajuste aqui se o tamanho não bater
const WALK_FRAME_MS = 180; // troca de frame do ciclo de caminhada (2 frames alternando)
const IDLE_FRAME_MS = 650; // troca de frame do idle (bem mais devagar — é só uma respiração sutil)

// Sombra sob os pés — desenhada por código (gradiente radial), não é um
// asset. Assim ela nunca desalinha entre os frames do personagem, e já
// funciona de graça pra qualquer personagem/inimigo futuro.
const SHADOW_OFFSET_Y = 55; // distância dos pés até o centro do personagem, em pixels de tela
const SHADOW_SCALE_X = 1.0;
const SHADOW_SCALE_Y = 0.4;

// O MUNDO é maior que a tela — a câmera acompanha o personagem e o jogo
// mostra só uma janela dele por vez. Aumente esses números pra um mapa maior.
// Reduzido de 3200x2400 pra caber melhor na cena vila+praia (o mapa antigo
// tinha muito mais espaço vazio de terra/água do que a referência usa).
const WORLD_WIDTH = 2560;
const WORLD_HEIGHT = 1920;

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE, // canvas sempre do tamanho do #game-container (janela toda)
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: { preload, create, update },
};

new Phaser.Game(config);

let player; // Sprite com física — a posição/colisão "de verdade"
let shadow; // elipse sob os pés, sincronizada com o player todo frame
let cursors;
let wasd;
let facing = 'down'; // 'up' | 'down' | 'left' | 'right'
let walkTimer = 0;
let walkFrameIndex = 0; // 0 ou 1 — qual frame do par de caminhada está ativo
let idleTimer = 0;
let idleFrameIndex = 0;

// Cada direção tem seu próprio conjunto de idle e caminhada, cada um com
// seu próprio flip — importante porque idle esquerda/direita agora tem
// arte própria dos dois lados (não precisa espelhar), enquanto caminhada
// de perfil ainda é uma arte só, espelhada pro lado esquerdo.
const CHARACTER_FRAMES = {
  down: {
    idle: ['char-idle-front'],
    walk: ['char-walk-front-1', 'char-walk-front-2'],
  },
  up: {
    idle: ['char-idle-back-1', 'char-idle-back-2'],
    walk: ['char-walk-back-1', 'char-walk-back-2', 'char-walk-back-3', 'char-walk-back-4', 'char-walk-back-5'],
  },
  left: {
    idle: ['char-idle-left'],
    idleFlip: false,
    // O sprite sheet "caminhada contra" (gerado pra ser a caminhada da
    // esquerda) saiu com o tronco torcido mais pra um ângulo de costas —
    // espelhar não resolve isso (de costas espelhado continua de costas).
    // Por ora reaproveitamos a arte da direita (essa sim confirmada boa)
    // espelhada por código. Os arquivos char-walk-left-* continuam salvos
    // em assets/characters/ caso valha regenerar essa pose depois.
    walk: ['char-walk-right-1', 'char-walk-right-2', 'char-walk-right-3', 'char-walk-right-4'],
    walkFlip: true,
  },
  right: {
    idle: ['char-idle-right'],
    idleFlip: false,
    walk: ['char-walk-right-1', 'char-walk-right-2', 'char-walk-right-3', 'char-walk-right-4'],
    walkFlip: false,
  },
};

// O chão agora é uma imagem de fundo única (assets/ground/scene_background.png,
// gerada por tools/build_terrain_background.py) em vez de faixas retas
// empilhadas — a fronteira grama/areia/água precisava ser uma curva
// orgânica (medida a partir da referência, ver BEACH_SCENE_ANALYSIS.md),
// e isso não dá pra fazer bem só com tiles retangulares. O sistema de
// PINTURA de terreno do editor continua funcionando por cima dela (por
// exemplo pra adicionar um trecho de terra/caminho pontual depois) — só a
// base deixou de ser as faixas com "flex"/"fixed".
const TILE_SIZE = 120; // ainda usado pelo grid do editor e pela pintura de terreno

// Praça da Vila Semente — baseado no pacote de assets reais em
// assets/village/ (ver VILA_SEMENTE_MAP_SPEC.md original) + assets/water/
// (recortado do Pack07 — ver BEACH_SCENE_ANALYSIS.md). Layout validado
// primeiro num mockup PNG estático (tools/build_scene_mockup.py) usando
// proporções medidas na imagem de referência, e só depois convertido pra
// coordenadas daqui — não são mais números "no olho".
//
// Todo prop usa pivô bottom-center (x,y = onde ele "toca o chão"). Isso é
// o que faz o Y-sorting funcionar direito: comparamos sempre "pé com pé",
// nunca centro-da-imagem com pé (era esse o bug do personagem "afundando"
// no tronco antes).
//
// `collision` é opcional: {width, height} de uma caixa estática centrada
// no pivô, só pra objetos que devem bloquear passagem (casas, poço, cerca).
// `tint`/`rotation` são usados só onde anotado.
//
// Itens marcados PLACEHOLDER reaproveitam um asset existente no lugar de
// algo que não existe em nenhum catálogo ainda (banco de madeira,
// estrela-do-mar, pedrinha solta, machado no toco) — ver seção 4 do
// BEACH_SCENE_ANALYSIS.md pra lista completa do que falta gerar de verdade.
const VILLAGE_PROPS = [
  // --- Borda de floresta (topo da grama) ---
  { key: 'village-tree-ancient', x: 77, y: 144, scale: 1.16 },
  { key: 'village-tree-small', x: 205, y: 182, scale: 1.71 },
  { key: 'village-tree-ancient', x: 358, y: 144, scale: 1.16 },
  { key: 'village-tree-small', x: 563, y: 182, scale: 1.71 },
  { key: 'village-tree-ancient', x: 768, y: 144, scale: 1.16 },
  { key: 'village-tree-ancient', x: 2522, y: 144, scale: 1.16 },
  { key: 'village-tree-small', x: 2406, y: 182, scale: 1.71 },
  { key: 'village-tree-ancient', x: 2266, y: 144, scale: 1.16 },

  // "arbustos" — sem asset dedicado ainda, árvore pequena numa escala mais baixa
  { key: 'village-tree-small', x: 461, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 666, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 1587, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 1792, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 2304, y: 202, scale: 1.0 },
  { key: 'prop-flower', x: 256, y: 221, scale: 0.28 },
  { key: 'prop-flower', x: 870, y: 221, scale: 0.28 },
  { key: 'prop-flower', x: 1690, y: 221, scale: 0.28 },

  // PLACEHOLDER: toco com machado cravado na referência — sem asset de
  // machado em nenhum catálogo, fica só o toco liso.
  { key: 'village-tree-stump', x: 179, y: 298, scale: 0.22 },
  { key: 'village-rock-cluster', x: 128, y: 278, scale: 0.30 },

  // --- Casas, em fileira ---
  { key: 'village-house-straw', x: 397, y: 470, scale: 0.84, collision: { width: 185, height: 48 } },
  { key: 'village-house-red', x: 1075, y: 394, scale: 0.92, collision: { width: 165, height: 48 } },
  { key: 'village-house-blue', x: 1869, y: 451, scale: 0.87, collision: { width: 210, height: 50 } },

  // --- Cerca entre as casas ---
  { key: 'village-fence', x: 742, y: 557, scale: 0.59, collision: { width: 110, height: 20 } },
  { key: 'village-fence', x: 1446, y: 557, scale: 0.59, collision: { width: 110, height: 20 } },

  // --- Barris, caixas, sacos, floreiras perto das portas ---
  { key: 'village-barrel', x: 525, y: 528, scale: 0.39 },
  { key: 'village-lootsack', x: 602, y: 538, scale: 0.07 },
  { key: 'village-crate', x: 1165, y: 451, scale: 0.09 },
  { key: 'village-barrel', x: 1242, y: 461, scale: 0.39 },
  { key: 'village-planter', x: 1741, y: 528, scale: 0.26 },
  { key: 'village-crate', x: 1677, y: 518, scale: 0.09 },
  { key: 'village-clothesline', x: 2048, y: 490, scale: 0.53 },
  { key: 'village-lantern', x: 269, y: 518, scale: 0.66 },
  { key: 'village-lantern', x: 1626, y: 422, scale: 0.66 },

  // --- Praça central: poço, fogueira, quadro de avisos ---
  { key: 'village-well', x: 1395, y: 643, scale: 0.68, collision: { width: 100, height: 40 } },
  { key: 'village-barrel', x: 1318, y: 662, scale: 0.39 },
  { key: 'village-barrel', x: 1472, y: 672, scale: 0.39 },

  { key: 'village-noticeboard', x: 1062, y: 883, scale: 0.79 },
  { key: 'village-lantern', x: 1165, y: 902, scale: 0.66 },
  { key: 'village-barrel', x: 947, y: 912, scale: 0.39 },

  { key: 'village-campfire', x: 1856, y: 797, scale: 0.2 },
  { key: 'village-tree-stump', x: 1702, y: 826, scale: 0.22 },
  { key: 'village-lantern', x: 1984, y: 912, scale: 0.66 },
  // PLACEHOLDER: banco de madeira não existe em nenhum catálogo — usando
  // um pedaço de cerca deitado (sem colisão) como aproximação temporária.
  { key: 'village-fence', x: 1754, y: 845, scale: 0.28 },
  { key: 'village-fence', x: 1958, y: 854, scale: 0.28 },

  { key: 'village-tree-small', x: 947, y: 960, scale: 0.9 },
  { key: 'village-tree-small', x: 1536, y: 960, scale: 0.9 },
  { key: 'village-tree-small', x: 1626, y: 960, scale: 0.9 },
  { key: 'prop-flower', x: 742, y: 970, scale: 0.28 },

  // --- Transição grama→areia: pedras no penhasco esquerdo ---
  { key: 'village-rock-cluster', x: 90, y: 1315, scale: 0.55 },
  { key: 'village-rock-cluster', x: 192, y: 1354, scale: 0.35 },

  // --- Praia ---
  { key: 'prop-log', x: 1024, y: 1450, scale: 0.69 },
  { key: 'water-boat-row', x: 2266, y: 1498, scale: 0.85, rotation: -12 },
  { key: 'prop-log', x: 2163, y: 1526, scale: 0.40 },

  // PLACEHOLDER: estrela-do-mar não existe em nenhum catálogo — flor
  // tingida de laranja só pra marcar "tem um objeto pequeno aqui".
  { key: 'prop-flower', x: 1203, y: 1411, scale: 0.14, tint: 0xeb7828 },

  // PLACEHOLDER: pedrinha solta também não existe — rock-cluster reduzido.
  { key: 'village-rock-cluster', x: 768, y: 1469, scale: 0.09 },
  { key: 'village-rock-cluster', x: 1536, y: 1517, scale: 0.09 },
  { key: 'village-rock-cluster', x: 1818, y: 1565, scale: 0.09 },
  { key: 'village-rock-cluster', x: 614, y: 1536, scale: 0.09 },

  // --- Doca + pedra-d'água (recortados do Pack07) ---
  { key: 'water-dock-pier', x: 154, y: 1795, scale: 1.35 },
  { key: 'water-rock', x: 51, y: 1363, scale: 0.85 },
  { key: 'water-rock', x: 2470, y: 1450, scale: 0.55 },
  { key: 'water-lilypad-flower', x: 768, y: 1824, scale: 0.55 },
  { key: 'water-lilypad-plain', x: 1178, y: 1872, scale: 0.45 },
];

// ============================================================================
// MODO EDITOR — pra montar/ajustar o cenário visualmente, sem depender de
// mim digitando coordenada por coordenada.
//
// Como ativar: clique no botão "Editor" no canto superior esquerdo (ou
// aperte E). Com o editor ligado:
//   clique numa miniatura   escolhe o que colocar (props ou terreno — as
//                           abas em cima da paleta trocam a categoria)
//   clique no mapa          coloca o item escolhido, ou seleciona um já
//                           existente (props); no modo terreno, pinta o
//                           tile (arraste pra pintar vários de uma vez)
//   arrastar (props)        move o objeto selecionado
//   botões − / +            diminui/aumenta o tamanho do selecionado
//   botões ↺ / ↻            gira o selecionado
//   botão 🗑                remove o selecionado
//   botão 📋 Exportar       copia a posição de tudo pro clipboard — cole
//                           de volta no chat comigo
//   WASD/setas              navega a câmera livre pelo mapa
//   roda do mouse           zoom
// ============================================================================

// `defaultScale` de cada item é calculado a partir do tamanho real do
// conteúdo do arquivo (sem a margem transparente) contra uma régua comum:
// o personagem tem ~110px de altura na tela, e cada prop mira uma altura
// plausível relativa a isso (poço ~1,3x personagem, barril ~metade, etc).
// Os arquivos do pacote vieram em resoluções bem diferentes entre si (o
// baú por exemplo tem 700px de conteúdo, a cerca só 111px) — sem isso,
// colocar tudo em escala 1 deixa proporção sem nexo entre os objetos.
const EDITOR_PROP_PALETTE = [
  { key: 'village-house-straw', label: 'Casa de palha', defaultScale: 0.84 },
  { key: 'village-house-red', label: 'Casa vermelha', defaultScale: 0.92 },
  { key: 'village-house-blue', label: 'Casa azul', defaultScale: 0.87 },
  { key: 'village-fence', label: 'Cerca', defaultScale: 0.59 },
  { key: 'village-well', label: 'Poço', defaultScale: 0.68 },
  { key: 'village-campfire', label: 'Fogueira (acesa)', defaultScale: 0.2 },
  { key: 'village-campfire-unlit', label: 'Fogueira (apagada)', defaultScale: 0.2 },
  { key: 'village-campfire-small', label: 'Fogueira (começando)', defaultScale: 0.19 },
  { key: 'village-campfire-embers', label: 'Fogueira (brasas)', defaultScale: 0.16 },
  { key: 'village-noticeboard', label: 'Quadro de avisos', defaultScale: 0.79 },
  { key: 'village-lantern', label: 'Lanterna', defaultScale: 0.66 },
  { key: 'village-barrel', label: 'Barril', defaultScale: 0.39 },
  { key: 'village-crate', label: 'Caixote', defaultScale: 0.09 },
  { key: 'village-lootsack', label: 'Saco de pano', defaultScale: 0.07 },
  { key: 'village-chest-closed', label: 'Baú (fechado)', defaultScale: 0.06 },
  { key: 'village-chest-open', label: 'Baú (aberto)', defaultScale: 0.09 },
  { key: 'village-clothesline', label: 'Varal', defaultScale: 0.53 },
  { key: 'village-planter', label: 'Floreira', defaultScale: 0.26 },
  { key: 'village-tree-small', label: 'Árvore pequena', defaultScale: 1.71 },
  { key: 'village-tree-ancient', label: 'Árvore grande', defaultScale: 1.16 },
  { key: 'village-rock-cluster', label: 'Pedras', defaultScale: 0.3 },
  { key: 'village-tree-stump', label: 'Toco de árvore', defaultScale: 0.22 },
  { key: 'prop-log', label: 'Tronco caído (praia)', defaultScale: 0.69 },
  { key: 'prop-flower', label: 'Flores', defaultScale: 0.28 },

  // Recortados do Pack07 (A Pedra do Sol) — ver BEACH_SCENE_ANALYSIS.md.
  { key: 'water-boat-row', label: 'Barco a remo', defaultScale: 0.85 },
  { key: 'water-dock-pier', label: 'Doca (com escada)', defaultScale: 1.35 },
  { key: 'water-rock', label: 'Pedra de água', defaultScale: 0.85 },
  { key: 'water-lilypad-flower', label: 'Vitória-régia (com flor)', defaultScale: 0.55 },
  { key: 'water-lilypad-plain', label: 'Vitória-régia (lisa)', defaultScale: 0.45 },
  { key: 'water-bridge-wood-arch', label: 'Ponte de madeira (arco)', defaultScale: 0.55 },
  { key: 'water-bridge-wood-straight', label: 'Ponte de madeira (reta)', defaultScale: 0.55 },
  { key: 'water-bridge-stone-arch', label: 'Ponte de pedra (arco)', defaultScale: 0.55 },
  { key: 'water-rope-fence', label: 'Cerca de corda', defaultScale: 0.55 },
];

// Peças de caminho entram como TERRENO, não prop — elas são blocos de chão
// de um tile inteiro (pintam encaixado no grid de 120px), não objetos com
// "pé" que ficam por cima do chão.
const EDITOR_TERRAIN_PALETTE = [
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
  // giramos por código com a tecla R (ver `editorTerrainRotation`) — dá o
  // mesmo resultado pixel a pixel e permite girar antes de pintar.
  { key: 'ground-sand-edge-a', label: 'Praia reta A' },
  { key: 'ground-sand-edge-b', label: 'Praia reta B' },
  { key: 'ground-sand-outer-corner-0', label: 'Canto externo (R gira)' },
  { key: 'ground-sand-inner-corner-0', label: 'Canto interno (R gira)' },
  { key: 'ground-sand-peninsula-0', label: 'Ponta de areia (R gira)' },
];

const EDITOR_GRID_SIZE = 8; // encaixe (snap) ao arrastar/colocar props, em pixels
const EDITOR_THUMB_SIZE = 40;
const EDITOR_THUMB_GAP = 6;
const EDITOR_PANEL_X = 12;

let editorMode = false;
let editorCategory = 'prop'; // 'prop' | 'terrain' — qual paleta está ativa
let editorObjects = []; // props (iniciais ou colocados no editor)
let terrainOverrides = new Map(); // "col,row" -> Image do tile pintado por cima do chão base
let editorSelected = null;
let editorPropIndex = -1; // -1 = nenhuma ferramenta ativa (modo padrão: só selecionar/arrastar)
let editorTerrainIndex = -1;
let editorPanelBounds = { right: 560, bottom: 260 }; // recalculado depois de montar a UI
let editorPainting = false; // botão do mouse pressionado, pintando terreno em arraste
let editorTerrainRotation = 0; // 0/90/180/270 — orientação do "carimbo" de terreno atual
let spaceHeld = false; // barra de espaço pressionada — segurar + arrastar navega o mapa
let spacePanPointer = null; // última posição de tela conhecida enquanto arrastando com espaço
let editorGrid; // Graphics do grid, só visível em modo editor
let editorSelectionBox; // retângulo mostrando o objeto selecionado
let editorGhost; // preview semi-transparente seguindo o mouse
let editorToggleButton;
let editorPanel = []; // todos os elementos de UI do painel (some quando o editor desliga)
let editorAlwaysOnUI = []; // UI fixa na tela mesmo com o editor desligado (ex: botão de ligar)
let editorPaletteHighlight; // quadrado amarelo em volta da miniatura escolhida
let editorPropThumbs = [];
let editorTerrainThumbs = [];
let editorInfoText;
let editorTabPropText;
let editorTabTerrainText;

function preload() {
  this.load.image('scene-background', 'assets/ground/scene_background.png');
  // Altura da linha areia/água por coluna, extraída do PNG acima — usada só
  // pra montar a colisão que impede andar na água (ver buildWaterCollision).
  this.load.json('water-line', 'assets/ground/scene_background_water_line.json');

  // Ainda carregados pra pintura de terreno pontual no editor (touch-up
  // por cima do background), mesmo não sendo mais a base do mapa.
  this.load.image('ground-grass', 'assets/ground/grass.png');
  this.load.image('ground-dirt', 'assets/ground/dirt.png');
  this.load.image('ground-sand', 'assets/ground/sand.png');
  this.load.image('ground-transition-dirt-grass', 'assets/ground/transition_dirt_grass.png');
  this.load.image('ground-transition-sand-grass', 'assets/ground/transition_sand_grass.png');
  this.load.image('ground-water', 'assets/ground/water.png');
  this.load.image('ground-transition-sand-water', 'assets/ground/transition_sand_water.png');
  this.load.image('ground-transition-sand-water-b', 'assets/ground/transition_sand_water_b.png');
  this.load.image('ground-transition-sand-water-c', 'assets/ground/transition_sand_water_c.png');
  this.load.image('ground-transition-sand-water-d', 'assets/ground/transition_sand_water_d.png');
  this.load.image('ground-sand-edge-a', 'assets/ground/sand_edge_a.png');
  this.load.image('ground-sand-edge-b', 'assets/ground/sand_edge_b.png');
  this.load.image('ground-sand-outer-corner-0', 'assets/ground/sand_outer_corner_0.png');
  this.load.image('ground-sand-inner-corner-0', 'assets/ground/sand_inner_corner_0.png');
  this.load.image('ground-sand-peninsula-0', 'assets/ground/sand_peninsula_0.png');

  this.load.image('char-idle-front', 'assets/characters/idle_front.png');
  this.load.image('char-idle-back-1', 'assets/characters/idle_back_1.png');
  this.load.image('char-idle-back-2', 'assets/characters/idle_back_2.png');
  this.load.image('char-idle-left', 'assets/characters/idle_left.png');
  this.load.image('char-idle-right', 'assets/characters/idle_right.png');
  this.load.image('char-walk-front-1', 'assets/characters/walk_front_1.png');
  this.load.image('char-walk-front-2', 'assets/characters/walk_front_2.png');
  this.load.image('char-walk-back-1', 'assets/characters/walk_up_1.png');
  this.load.image('char-walk-back-2', 'assets/characters/walk_up_2.png');
  this.load.image('char-walk-back-3', 'assets/characters/walk_up_3.png');
  this.load.image('char-walk-back-4', 'assets/characters/walk_up_4.png');
  this.load.image('char-walk-back-5', 'assets/characters/walk_up_5.png');
  this.load.image('char-walk-right-1', 'assets/characters/walk_right_1.png');
  this.load.image('char-walk-right-2', 'assets/characters/walk_right_2.png');
  this.load.image('char-walk-right-3', 'assets/characters/walk_right_3.png');
  this.load.image('char-walk-right-4', 'assets/characters/walk_right_4.png');
  this.load.image('char-walk-left-1', 'assets/characters/walk_left_1.png');
  this.load.image('char-walk-left-2', 'assets/characters/walk_left_2.png');
  this.load.image('char-walk-left-3', 'assets/characters/walk_left_3.png');
  this.load.image('char-walk-left-4', 'assets/characters/walk_left_4.png');

  this.load.image('village-house-straw', 'assets/village/house_straw.png');
  this.load.image('village-house-red', 'assets/village/house_red.png');
  this.load.image('village-house-blue', 'assets/village/house_blue.png');
  this.load.image('village-fence', 'assets/village/fence.png');
  this.load.image('village-well', 'assets/village/well.png');
  this.load.image('village-campfire', 'assets/village/campfire.png');
  this.load.image('village-noticeboard', 'assets/village/noticeboard.png');
  this.load.image('village-lantern', 'assets/village/lantern.png');
  this.load.image('village-barrel', 'assets/village/barrel.png');
  this.load.image('village-tree-small', 'assets/village/tree_small.png');
  this.load.image('village-campfire-unlit', 'assets/village/campfire_unlit.png');
  this.load.image('village-campfire-small', 'assets/village/campfire_small.png');
  this.load.image('village-campfire-embers', 'assets/village/campfire_embers.png');
  this.load.image('village-clothesline', 'assets/village/clothesline.png');
  this.load.image('village-planter', 'assets/village/planter.png');
  this.load.image('village-chest-closed', 'assets/village/chest_closed.png');
  this.load.image('village-chest-open', 'assets/village/chest_open.png');
  this.load.image('village-crate', 'assets/village/crate.png');
  this.load.image('village-lootsack', 'assets/village/lootsack.png');
  this.load.image('village-rock-cluster', 'assets/village/rock_cluster.png');
  this.load.image('village-tree-stump', 'assets/village/tree_stump.png');
  this.load.image('prop-log', 'assets/props/log.png');
  this.load.image('prop-flower', 'assets/props/flower.png');
  this.load.image('village-tree-ancient', 'assets/village/tree_ancient.png');
  this.load.image('village-path-straight-h', 'assets/village/path_straight_h.png');
  this.load.image('village-path-straight-v', 'assets/village/path_straight_v.png');
  this.load.image('village-path-corner', 'assets/village/path_corner.png');
  this.load.image('village-path-tjunction', 'assets/village/path_tjunction.png');
  this.load.image('village-path-crossroad', 'assets/village/path_crossroad.png');

  // Recortados do sheet "Pack 07" (A Pedra do Sol, água/pontes) — ver
  // BEACH_SCENE_ANALYSIS.md seção 4. Pontes e cerca de corda ficaram
  // prontas mas não usadas nesta cena (não há rio/vão aqui).
  this.load.image('water-boat-row', 'assets/water/boat_row.png');
  this.load.image('water-dock-pier', 'assets/water/dock_pier.png');
  this.load.image('water-rock', 'assets/water/water_rock.png');
  this.load.image('water-lilypad-flower', 'assets/water/lilypad_flower.png');
  this.load.image('water-lilypad-plain', 'assets/water/lilypad_plain.png');
  this.load.image('water-bridge-wood-arch', 'assets/water/bridge_wood_arch.png');
  this.load.image('water-bridge-wood-straight', 'assets/water/bridge_wood_straight.png');
  this.load.image('water-bridge-stone-arch', 'assets/water/bridge_stone_arch.png');
  this.load.image('water-rope-fence', 'assets/water/rope_fence.png');
}

function create() {
  buildGround(this);
  generateShadowTexture(this);

  shadow = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + SHADOW_OFFSET_Y, 'shadow');
  shadow.setScale(SHADOW_SCALE_X, SHADOW_SCALE_Y);
  shadow.setDepth(-0.5); // acima do chão, abaixo do personagem

  player = this.physics.add.sprite(1280, 1517, 'char-idle-front'); // na praia, na frente do caminho descendo da praça
  player.setScale(CHAR_SCALE);
  // Caixa de colisão pequena perto dos pés, não o corpo inteiro (a imagem
  // tem bastante espaço vazio ao redor do personagem) — ajuste fino depois.
  player.body.setSize(90, 60);
  player.body.setOffset(55, 120);
  player.setCollideWorldBounds(true);

  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Câmera menor que o mundo, seguindo o personagem, sem sair da borda do
  // mapa. O Scale Manager (modo RESIZE) já redimensiona essa câmera sozinho
  // quando a janela muda de tamanho — não precisamos fazer isso na mão.
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  this.cameras.main.startFollow(player, true, 0.1, 0.1);

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys('W,A,S,D');

  buildVillageProps(this);
  buildWaterCollision(this);
  setupEditor(this);
}

// Impede o personagem de andar na água. A "linha d'água" (uma altura em
// pixels por coluna) foi extraída do próprio PNG de fundo por
// tools/build_terrain_background.py — aqui só ladrilhamos uma fileira de
// zonas estáticas invisíveis seguindo essa curva. Cada zona é larga o
// bastante pra não precisar de uma por coluna, mas usa a menor altura
// (mais perto da grama) dentro do seu trecho, senão um pico da curva
// dentro do trecho ficaria sem cobertura.
function buildWaterCollision(scene) {
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

function buildVillageProps(scene) {
  VILLAGE_PROPS.forEach((prop) => {
    const image = createPropImage(scene, prop.key, prop.x, prop.y, prop.scale);
    if (prop.rotation) image.setRotation(Phaser.Math.DegToRad(prop.rotation));
    // `tint` é só pra placeholders temporários (ex.: flor tingida de
    // laranja fazendo às vezes de estrela-do-mar) — ver BEACH_SCENE_ANALYSIS.md.
    if (prop.tint) image.setTint(prop.tint);

    if (prop.collision) {
      const zone = scene.add.zone(prop.x, prop.y - prop.collision.height / 2, prop.collision.width, prop.collision.height);
      scene.physics.add.existing(zone, true); // true = corpo estático (não se move)
      scene.physics.add.collider(player, zone);
    }
  });
}

// Cria a imagem de um prop já pronta pro editor (pivô nos pés, arrastável,
// registrada em editorObjects pra entrar na exportação).
function createPropImage(scene, key, x, y, scale) {
  const image = scene.add.image(x, y, key);
  image.setOrigin(0.5, 1); // pivô nos "pés" do objeto, como o pacote de assets especifica
  image.setScale(scale);
  image.setDepth(y); // mesma régua de Y-sorting do personagem (ver update())
  image.setData('propKey', key);
  image.setInteractive({ draggable: true });
  editorObjects.push(image);
  return image;
}

function setupEditor(scene) {
  // Grid de referência — cobre o mundo inteiro, mas só fica visível em
  // modo editor.
  editorGrid = scene.add.graphics();
  editorGrid.lineStyle(1, 0xffffff, 0.15);
  for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
    editorGrid.lineBetween(x, 0, x, WORLD_HEIGHT);
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
    editorGrid.lineBetween(0, y, WORLD_WIDTH, y);
  }
  editorGrid.setDepth(9000);
  editorGrid.setVisible(false);

  editorSelectionBox = scene.add.rectangle(0, 0, 10, 10).setStrokeStyle(2, 0xffff00, 1);
  editorSelectionBox.setDepth(9998);
  editorSelectionBox.setVisible(false);

  editorGhost = scene.add.image(0, 0, EDITOR_PROP_PALETTE[0].key);
  editorGhost.setAlpha(0.5);
  editorGhost.setOrigin(0.5, 1);
  editorGhost.setDepth(9997);
  editorGhost.setVisible(false);

  // Botão sempre visível (independente do editor estar ligado) — é o que
  // resolve "como eu ativo isso": não depende de saber o atalho de teclado.
  editorToggleButton = makeButton(scene, EDITOR_PANEL_X, 12, '🖌 Editor: OFF', () => toggleEditorMode(scene));
  editorToggleButton.setDepth(10000); // sempre acima do painel
  editorAlwaysOnUI = [editorToggleButton];
  editorAlwaysOnUI.forEach((el) => {
    el.setData('uiBaseX', el.x);
    el.setData('uiBaseY', el.y);
    el.setData('uiBaseScaleX', el.scaleX);
    el.setData('uiBaseScaleY', el.scaleY);
  });

  buildEditorUI(scene);

  // Arrastar objeto selecionado (só props têm física de arraste — terreno
  // é pintado, não arrastado)
  scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
    if (!editorMode || !editorObjects.includes(gameObject) || spaceHeld) return;
    gameObject.x = Math.round(dragX / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    gameObject.y = Math.round(dragY / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    gameObject.setDepth(gameObject.y);
    updateEditorSelectionBox();
    updateEditorInfoText();
  });

  // Clicar num objeto existente = selecionar (em vez de colocar um novo)
  scene.input.on('gameobjectdown', (pointer, gameObject) => {
    if (!editorMode) return;
    if (!editorObjects.includes(gameObject)) return; // botões/miniaturas tratam o próprio clique
    if (spaceHeld) return; // segurando espaço = só navegar, nunca selecionar
    selectEditorObject(gameObject);
  });

  scene.input.on('pointerdown', (pointer) => {
    if (!editorMode) return;

    if (spaceHeld) {
      spacePanPointer = { x: pointer.x, y: pointer.y };
      return; // segurando espaço = arrastar move o mapa, nunca coloca/seleciona
    }

    const hits = scene.input.hitTestPointer(pointer);
    if (hits.length > 0) return; // clique em botão/miniatura/objeto já tratado

    if (editorCategory === 'terrain') {
      if (editorTerrainIndex === -1) return; // nenhuma ferramenta ativa — clicar no chão não faz nada
      editorPainting = true;
      paintTerrainAt(scene, pointer.worldX, pointer.worldY);
    } else if (editorPropIndex === -1) {
      // Nenhuma ferramenta ativa — clique no vazio só desseleciona
      editorSelected = null;
      updateEditorSelectionBox();
      updateEditorInfoText();
    } else {
      const snappedX = Math.round(pointer.worldX / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
      const snappedY = Math.round(pointer.worldY / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
      const paletteItem = EDITOR_PROP_PALETTE[editorPropIndex];
      const image = createPropImage(scene, paletteItem.key, snappedX, snappedY, paletteItem.defaultScale || 1);
      selectEditorObject(image);
    }
  });

  scene.input.on('pointerup', () => {
    editorPainting = false;
    spacePanPointer = null;
  });

  scene.input.on('pointermove', (pointer) => {
    if (!editorMode) return;

    if (spaceHeld && spacePanPointer && pointer.isDown) {
      const cam = scene.cameras.main;
      cam.scrollX -= (pointer.x - spacePanPointer.x) / cam.zoom;
      cam.scrollY -= (pointer.y - spacePanPointer.y) / cam.zoom;
      spacePanPointer = { x: pointer.x, y: pointer.y };
      editorGhost.setVisible(false);
      return;
    }

    updateEditorGhost(scene, pointer);
    if (editorPainting && editorCategory === 'terrain') {
      paintTerrainAt(scene, pointer.worldX, pointer.worldY);
    }
  });

  scene.input.keyboard.on('keydown-E', () => toggleEditorMode(scene));

  const DIGIT_KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'];
  DIGIT_KEY_NAMES.forEach((keyName, i) => {
    scene.input.keyboard.on(`keydown-${keyName}`, () => {
      if (!editorMode || editorCategory !== 'prop' || i >= EDITOR_PROP_PALETTE.length) return;
      editorPropIndex = i;
      refreshEditorPaletteHighlight();
    });
  });

  scene.input.keyboard.on('keydown-DELETE', () => removeSelectedEditorObject());
  scene.input.keyboard.on('keydown-BACKSPACE', () => removeSelectedEditorObject());

  // Várias teclas mapeadas pro mesmo efeito — teclados diferem em qual tecla
  // física corresponde a "+"/"-" sem precisar de Shift.
  ['MINUS', 'NUMPAD_SUBTRACT'].forEach((k) => scene.input.keyboard.on(`keydown-${k}`, () => scaleSelectedEditorObject(-0.1)));
  ['PLUS', 'EQUALS', 'NUMPAD_ADD'].forEach((k) => scene.input.keyboard.on(`keydown-${k}`, () => scaleSelectedEditorObject(0.1)));

  // R gira o objeto selecionado (props) OU, se estiver na aba Terreno com um
  // tipo escolhido, gira o "carimbo" que vai ser pintado a seguir.
  scene.input.keyboard.on('keydown-R', (event) => rotateCurrentSelection(event.shiftKey ? -1 : 1));

  scene.input.keyboard.on('keydown-P', () => exportEditorLayout());

  scene.input.keyboard.on('keydown-SPACE', (event) => {
    if (!editorMode) return;
    event.preventDefault(); // barra de espaço não deve rolar a página
    spaceHeld = true;
  });
  scene.input.keyboard.on('keyup-SPACE', () => {
    spaceHeld = false;
    spacePanPointer = null;
  });

  scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
    if (!editorMode) return;
    const cam = scene.cameras.main;
    const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.3, 2.5);
    cam.setZoom(newZoom);
    applyEditorUIZoom();
  });
}

// Cria um "botão" clicável (texto com fundo) fixo na tela.
function makeButton(scene, x, y, label, onClick) {
  const button = scene.add.text(x, y, label, {
    font: '14px sans-serif',
    color: '#ffffff',
    backgroundColor: '#2a2a2acc',
    padding: { x: 8, y: 6 },
  });
  button.setScrollFactor(0);
  button.setDepth(9999);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerdown', (pointer, x2, y2, event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

// Cria a miniatura clicável de um item de paleta (props ou terreno).
// Sem `key` (null) vira o botão especial "Nenhuma ferramenta".
function makeThumb(scene, x, y, key, onClick) {
  const bg = scene.add.rectangle(x, y, EDITOR_THUMB_SIZE, EDITOR_THUMB_SIZE, 0x000000, 0.5);
  bg.setOrigin(0, 0);
  bg.setScrollFactor(0);
  bg.setDepth(9999);

  const image = key
    ? scene.add.image(x + EDITOR_THUMB_SIZE / 2, y + EDITOR_THUMB_SIZE / 2, key)
    : scene.add.text(x + EDITOR_THUMB_SIZE / 2, y + EDITOR_THUMB_SIZE / 2, '🚫', { font: '18px sans-serif' }).setOrigin(0.5);
  if (key) image.setDisplaySize(EDITOR_THUMB_SIZE - 6, EDITOR_THUMB_SIZE - 6);
  image.setScrollFactor(0);
  image.setDepth(10000);

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', (pointer, lx, ly, event) => {
    event.stopPropagation();
    onClick();
  });

  return { bg, image, x, y };
}

// Organiza uma lista de miniaturas em várias linhas (a lista de props não
// cabe numa linha só). Retorna as miniaturas e a altura total ocupada.
function layoutThumbRow(scene, items, startY, columns, onSelect) {
  const thumbs = [];
  // slot 0 de toda categoria é o botão "nenhuma ferramenta" (modo padrão)
  const noneThumb = makeThumb(scene, EDITOR_PANEL_X, startY, null, () => onSelect(-1));
  thumbs.push(noneThumb);

  items.forEach((item, i) => {
    const slot = i + 1; // +1 por causa do botão "nenhuma" ocupando o slot 0
    const col = slot % columns;
    const row = Math.floor(slot / columns);
    const x = EDITOR_PANEL_X + col * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP);
    const y = startY + row * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP);
    thumbs.push(makeThumb(scene, x, y, item.key, () => onSelect(i)));
  });

  const rows = Math.ceil((items.length + 1) / columns);
  return { thumbs, height: rows * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP) };
}

const EDITOR_PALETTE_COLUMNS = 12;

function buildEditorUI(scene) {
  const rowY = 48;

  editorTabPropText = makeButton(scene, EDITOR_PANEL_X, rowY, 'Props', () => {
    editorCategory = 'prop';
    refreshEditorPaletteVisibility();
  });
  editorTabTerrainText = makeButton(scene, EDITOR_PANEL_X + 70, rowY, 'Terreno', () => {
    editorCategory = 'terrain';
    refreshEditorPaletteVisibility();
  });

  const thumbY = rowY + 34;
  const propLayout = layoutThumbRow(scene, EDITOR_PROP_PALETTE, thumbY, EDITOR_PALETTE_COLUMNS, (i) => {
    editorCategory = 'prop';
    editorPropIndex = i;
    refreshEditorPaletteVisibility();
  });
  const terrainLayout = layoutThumbRow(scene, EDITOR_TERRAIN_PALETTE, thumbY, EDITOR_PALETTE_COLUMNS, (i) => {
    editorCategory = 'terrain';
    editorTerrainIndex = i;
    editorTerrainRotation = 0; // começa do zero a cada troca de peça
    refreshEditorPaletteVisibility();
  });
  editorPropThumbs = propLayout.thumbs;
  editorTerrainThumbs = terrainLayout.thumbs;

  editorPaletteHighlight = scene.add.rectangle(0, 0, EDITOR_THUMB_SIZE, EDITOR_THUMB_SIZE).setStrokeStyle(3, 0xffff00, 1);
  editorPaletteHighlight.setOrigin(0, 0);
  editorPaletteHighlight.setScrollFactor(0);
  editorPaletteHighlight.setDepth(10001);

  const toolbarY = thumbY + Math.max(propLayout.height, terrainLayout.height) + 8;
  const scaleMinusBtn = makeButton(scene, EDITOR_PANEL_X, toolbarY, '−', () => scaleSelectedEditorObject(-0.1));
  const scalePlusBtn = makeButton(scene, EDITOR_PANEL_X + 36, toolbarY, '+', () => scaleSelectedEditorObject(0.1));
  const rotateCcwBtn = makeButton(scene, EDITOR_PANEL_X + 76, toolbarY, '↺', () => rotateCurrentSelection(-1));
  const rotateCwBtn = makeButton(scene, EDITOR_PANEL_X + 112, toolbarY, '↻', () => rotateCurrentSelection(1));
  const deleteBtn = makeButton(scene, EDITOR_PANEL_X + 152, toolbarY, '🗑 Remover', () => removeSelectedEditorObject());
  const exportBtn = makeButton(scene, EDITOR_PANEL_X + 250, toolbarY, '📋 Exportar', () => exportEditorLayout());

  const zoomOutBtn = makeButton(scene, EDITOR_PANEL_X, toolbarY + 34, '🔍−', () => zoomEditorCamera(scene, -0.25));
  const zoomInBtn = makeButton(scene, EDITOR_PANEL_X + 50, toolbarY + 34, '🔍+', () => zoomEditorCamera(scene, 0.25));
  const zoomResetBtn = makeButton(scene, EDITOR_PANEL_X + 100, toolbarY + 34, '100%', () => resetEditorCameraZoom(scene));

  editorInfoText = scene.add.text(EDITOR_PANEL_X, toolbarY + 68, '', {
    font: '13px monospace',
    color: '#ffffff',
    backgroundColor: '#000000cc',
    padding: { x: 8, y: 6 },
  });
  editorInfoText.setScrollFactor(0);
  editorInfoText.setDepth(9999);

  editorPanel = [
    editorTabPropText,
    editorTabTerrainText,
    ...editorPropThumbs.flatMap((t) => [t.bg, t.image]),
    ...editorTerrainThumbs.flatMap((t) => [t.bg, t.image]),
    editorPaletteHighlight,
    scaleMinusBtn,
    scalePlusBtn,
    rotateCcwBtn,
    rotateCwBtn,
    deleteBtn,
    exportBtn,
    zoomOutBtn,
    zoomInBtn,
    zoomResetBtn,
    editorInfoText,
  ];
  editorPanel.forEach((el) => el.setVisible(false));
  // A UI do editor usa setScrollFactor(0) pra não rolar com a câmera, mas
  // isso não impede o zoom da câmera de encolher o próprio desenho dela.
  // Guardamos aqui a posição/escala "de design" (zoom 1) de cada elemento
  // pra poder compensar o zoom depois (ver applyEditorUIZoom).
  editorPanel.forEach((el) => {
    el.setData('uiBaseX', el.x);
    el.setData('uiBaseY', el.y);
    el.setData('uiBaseScaleX', el.scaleX);
    el.setData('uiBaseScaleY', el.scaleY);
  });

  editorPanelBounds = {
    right: EDITOR_PANEL_X + EDITOR_PALETTE_COLUMNS * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP),
    bottom: editorInfoText.y + editorInfoText.height + 8,
  };
}

function zoomEditorCamera(scene, delta) {
  const cam = scene.cameras.main;
  cam.setZoom(Phaser.Math.Clamp(cam.zoom + delta, 0.3, 2.5));
  applyEditorUIZoom();
}

function resetEditorCameraZoom(scene) {
  scene.cameras.main.setZoom(1);
  applyEditorUIZoom();
}

// Contra-escala a UI do editor pelo zoom atual da câmera, pra ela continuar
// com o mesmo tamanho/posição na tela em qualquer nível de zoom do mapa.
function applyEditorUIZoom() {
  const allUI = [...editorPanel, ...editorAlwaysOnUI];
  if (!allUI.length) return;
  const zoom = allUI[0].scene.cameras.main.zoom;
  allUI.forEach((el) => {
    const baseX = el.getData('uiBaseX');
    if (baseX === undefined) return;
    el.x = baseX / zoom;
    el.y = el.getData('uiBaseY') / zoom;
    el.scaleX = el.getData('uiBaseScaleX') / zoom;
    el.scaleY = el.getData('uiBaseScaleY') / zoom;
  });
}

function refreshEditorPaletteVisibility() {
  editorPropThumbs.forEach((t) => {
    t.bg.setVisible(editorCategory === 'prop');
    t.image.setVisible(editorCategory === 'prop');
  });
  editorTerrainThumbs.forEach((t) => {
    t.bg.setVisible(editorCategory === 'terrain');
    t.image.setVisible(editorCategory === 'terrain');
  });
  refreshEditorPaletteHighlight();
  updateEditorInfoText();
}

function refreshEditorPaletteHighlight() {
  const thumbs = editorCategory === 'prop' ? editorPropThumbs : editorTerrainThumbs;
  const index = editorCategory === 'prop' ? editorPropIndex : editorTerrainIndex;
  const thumb = thumbs[index + 1]; // +1 porque o slot 0 é sempre o botão "nenhuma ferramenta"
  if (!thumb) return;
  editorPaletteHighlight.setData('uiBaseX', thumb.x);
  editorPaletteHighlight.setData('uiBaseY', thumb.y);
  applyEditorUIZoom();
  updateEditorInfoText();
}

function updateEditorGhost(scene, pointer) {
  const activeIndex = editorCategory === 'terrain' ? editorTerrainIndex : editorPropIndex;
  if (!editorMode || editorPainting || activeIndex === -1) {
    editorGhost.setVisible(false);
    return;
  }
  // Não mostra o preview em cima do próprio painel de UI (senão fica
  // sobrepondo os botões/miniaturas de forma confusa)
  if (pointer.y < editorPanelBounds.bottom && pointer.x < editorPanelBounds.right) {
    editorGhost.setVisible(false);
    return;
  }
  if (editorCategory === 'terrain') {
    const col = Math.floor(pointer.worldX / TILE_SIZE);
    const row = Math.floor(pointer.worldY / TILE_SIZE);
    editorGhost.setTexture(EDITOR_TERRAIN_PALETTE[editorTerrainIndex].key);
    // Origem no centro (não no canto) — assim girar em 90°/180°/270° mantém
    // o quadrado perfeitamente encaixado na mesma célula do grid.
    editorGhost.setOrigin(0.5, 0.5);
    editorGhost.setDisplaySize(TILE_SIZE, TILE_SIZE);
    editorGhost.setRotation(Phaser.Math.DegToRad(editorTerrainRotation));
    editorGhost.setPosition(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
  } else {
    const paletteItem = EDITOR_PROP_PALETTE[editorPropIndex];
    const snappedX = Math.round(pointer.worldX / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    const snappedY = Math.round(pointer.worldY / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    editorGhost.setTexture(paletteItem.key);
    editorGhost.setOrigin(0.5, 1);
    const tex = scene.textures.get(paletteItem.key).getSourceImage();
    const scale = paletteItem.defaultScale || 1;
    editorGhost.setDisplaySize(tex.width * scale, tex.height * scale);
    editorGhost.setRotation(0);
    editorGhost.setPosition(snappedX, snappedY);
  }
  editorGhost.setVisible(true);
}

function paintTerrainAt(scene, worldX, worldY) {
  const col = Math.floor(worldX / TILE_SIZE);
  const row = Math.floor(worldY / TILE_SIZE);
  if (col < 0 || row < 0 || col * TILE_SIZE >= WORLD_WIDTH || row * TILE_SIZE >= WORLD_HEIGHT) return;

  const cellKey = `${col},${row}`;
  const terrainKey = EDITOR_TERRAIN_PALETTE[editorTerrainIndex].key;

  const existing = terrainOverrides.get(cellKey);
  if (existing) {
    if (existing.texture.key === terrainKey && existing.getData('rotation') === editorTerrainRotation) return; // já é exatamente isso
    existing.destroy();
  }

  // Origem no centro, não no canto — gira em 90°/180°/270° sem sair da célula.
  const tile = scene.add.image(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, terrainKey);
  tile.setOrigin(0.5, 0.5);
  tile.setDisplaySize(TILE_SIZE, TILE_SIZE); // força 1 tile exato mesmo se o arquivo não for 120x120
  tile.setRotation(Phaser.Math.DegToRad(editorTerrainRotation));
  tile.setDepth(-0.99); // acima das faixas de chão, abaixo de sombra/props/personagem
  tile.setData('terrainKey', terrainKey);
  tile.setData('col', col);
  tile.setData('row', row);
  tile.setData('rotation', editorTerrainRotation);
  terrainOverrides.set(cellKey, tile);
}

function toggleEditorMode(scene) {
  editorMode = !editorMode;
  editorGrid.setVisible(editorMode);
  editorToggleButton.setText(editorMode ? '🖌 Editor: ON' : '🖌 Editor: OFF');
  editorPanel.forEach((el) => el.setVisible(editorMode));

  const cam = scene.cameras.main;
  if (editorMode) {
    cam.stopFollow();
    refreshEditorPaletteVisibility();
  } else {
    editorSelectionBox.setVisible(false);
    editorGhost.setVisible(false);
    editorSelected = null;
    editorPainting = false;
    player.body.setVelocity(0, 0);
    cam.setZoom(1);
    cam.startFollow(player, true, 0.1, 0.1);
    applyEditorUIZoom();
  }
}

function selectEditorObject(gameObject) {
  editorSelected = gameObject;
  updateEditorSelectionBox();
  updateEditorInfoText();
}

function updateEditorSelectionBox() {
  if (!editorSelected) {
    editorSelectionBox.setVisible(false);
    return;
  }
  const bounds = editorSelected.getBounds();
  editorSelectionBox.setPosition(bounds.centerX, bounds.centerY);
  editorSelectionBox.setSize(bounds.width, bounds.height);
  editorSelectionBox.setRotation(editorSelected.rotation);
  editorSelectionBox.setVisible(true);
}

function removeSelectedEditorObject() {
  if (!editorMode || !editorSelected) return;
  editorObjects = editorObjects.filter((obj) => obj !== editorSelected);
  editorSelected.destroy();
  editorSelected = null;
  editorSelectionBox.setVisible(false);
  updateEditorInfoText();
}

function scaleSelectedEditorObject(delta) {
  if (!editorMode || !editorSelected) return;
  const newScale = Math.max(0.1, Math.round((editorSelected.scaleX + delta) * 100) / 100);
  editorSelected.setScale(newScale);
  updateEditorSelectionBox();
  updateEditorInfoText();
}

function rotateSelectedEditorObject(deltaDeg) {
  if (!editorMode || !editorSelected) return;
  const newDeg = Phaser.Math.Wrap(Phaser.Math.RadToDeg(editorSelected.rotation) + deltaDeg, 0, 360);
  editorSelected.setRotation(Phaser.Math.DegToRad(newDeg));
  updateEditorSelectionBox();
  updateEditorInfoText();
}

// Usado pelo botão ↺/↻ e pela tecla R: gira o prop selecionado (passo fino,
// 15°) ou, se não há nada selecionado mas a aba Terreno tem um tipo ativo,
// gira o "carimbo" de terreno (passo de 90°, já que essas peças só fazem
// sentido em ângulos retos — são autotiles quadrados).
function rotateCurrentSelection(direction) {
  if (!editorMode) return;
  if (editorSelected) {
    rotateSelectedEditorObject(direction * 15);
  } else if (editorCategory === 'terrain' && editorTerrainIndex !== -1) {
    editorTerrainRotation = Phaser.Math.Wrap(editorTerrainRotation + direction * 90, 0, 360);
    updateEditorInfoText();
  }
}

function updateEditorInfoText() {
  if (!editorMode || !editorInfoText) return;
  const categoryLabel = editorCategory === 'prop' ? 'Props' : 'Terreno';
  const activeIndex = editorCategory === 'prop' ? editorPropIndex : editorTerrainIndex;
  const currentItem =
    activeIndex === -1
      ? { label: 'nenhuma (clique só seleciona/arrasta)' }
      : (editorCategory === 'prop' ? EDITOR_PROP_PALETTE : EDITOR_TERRAIN_PALETTE)[activeIndex];

  const selectedInfo = editorSelected
    ? `Selecionado: ${editorSelected.getData('propKey')} @ (${Math.round(editorSelected.x)}, ${Math.round(
        editorSelected.y
      )})  escala ${editorSelected.scaleX.toFixed(2)}  rotação ${Math.round(Phaser.Math.RadToDeg(editorSelected.rotation))}°`
    : editorCategory === 'terrain' && activeIndex !== -1
      ? `Rotação do carimbo: ${editorTerrainRotation}° (tecla R)`
      : 'Nada selecionado';

  editorInfoText.setText(
    `Categoria: ${categoryLabel}  |  Colocando: ${currentItem.label}\n${selectedInfo}\n` +
      'Clique: colocar/selecionar   Arrastar: mover   Espaço+arrastar: navegar mapa   Roda: zoom'
  );
}

function exportEditorLayout() {
  if (!editorMode) return;
  const props = editorObjects.map((obj) => ({
    key: obj.getData('propKey'),
    x: Math.round(obj.x),
    y: Math.round(obj.y),
    scale: Math.round(obj.scaleX * 100) / 100,
    rotation: Math.round(Phaser.Math.RadToDeg(obj.rotation)) || 0,
  }));
  const terrain = Array.from(terrainOverrides.values()).map((tile) => ({
    key: tile.getData('terrainKey'),
    col: tile.getData('col'),
    row: tile.getData('row'),
    rotation: tile.getData('rotation') || 0,
  }));
  const json = JSON.stringify({ props, terrain }, null, 2);
  console.log('--- LAYOUT EXPORTADO ---\n' + json);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).catch(() => {});
  }

  editorInfoText.setText(
    `Exportado! ${props.length} props + ${terrain.length} tiles de terreno.\n` +
      'Copiado pro clipboard (se o navegador permitiu).\n' +
      'Também impresso no console (F12) — cole no chat comigo.'
  );
}

function generateShadowTexture(scene) {
  // Resolução bem maior que o tamanho de exibição real — precisamos de
  // sobra porque o filtro "linear" (ver abaixo) suaviza a partir dos
  // pixels que já existem; pouca resolução ainda mostraria escada.
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Mais pontos de parada = esmaecimento mais gradual (evita a sensação de
  // "blob com borda"). Opacidade máxima bem mais sutil que antes.
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.22)');
  gradient.addColorStop(0.4, 'rgba(0,0,0,0.16)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.08)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  scene.textures.addCanvas('shadow', canvas);
  // O jogo inteiro usa pixelArt:true (amostragem "nearest", sem suavizar) —
  // ótimo pro personagem e pros tiles, péssimo pra um gradiente, que fica
  // com degraus visíveis em vez de esmaecer suave. Corrige só esta textura.
  scene.textures.get('shadow').setFilter(Phaser.Textures.FilterMode.LINEAR);
}

function buildGround(scene) {
  // Uma imagem só, do tamanho exato do mundo — ver a nota grande lá em
  // cima de TILE_SIZE pra entender por que isso substituiu as faixas.
  const bg = scene.add.image(0, 0, 'scene-background');
  bg.setOrigin(0, 0);
  bg.setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT);
  bg.setDepth(-1); // sempre atrás do personagem/props/terreno pintado
}

const EDITOR_CAMERA_SPEED = 500; // pixels por segundo, navegando o mapa no modo editor

function update(time, delta) {
  if (editorMode) {
    player.body.setVelocity(0, 0);
    updateCharacterVisual(delta, false, facing);

    // WASD/setas viram pan de câmera no editor (o personagem não anda)
    const cam = this.cameras.main;
    const panSpeed = (EDITOR_CAMERA_SPEED * delta) / 1000 / cam.zoom;
    if (cursors.left.isDown || wasd.A.isDown) cam.scrollX -= panSpeed;
    if (cursors.right.isDown || wasd.D.isDown) cam.scrollX += panSpeed;
    if (cursors.up.isDown || wasd.W.isDown) cam.scrollY -= panSpeed;
    if (cursors.down.isDown || wasd.S.isDown) cam.scrollY += panSpeed;
    return;
  }

  const left = cursors.left.isDown || wasd.A.isDown;
  const right = cursors.right.isDown || wasd.D.isDown;
  const up = cursors.up.isDown || wasd.W.isDown;
  const down = cursors.down.isDown || wasd.S.isDown;

  let vx = 0;
  let vy = 0;
  if (left) vx -= 1;
  if (right) vx += 1;
  if (up) vy -= 1;
  if (down) vy += 1;

  // Normaliza diagonal pra não andar mais rápido na diagonal
  if (vx !== 0 && vy !== 0) {
    const norm = Math.SQRT1_2;
    vx *= norm;
    vy *= norm;
  }

  player.body.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
  shadow.setPosition(player.x, player.y + SHADOW_OFFSET_Y);

  // Y-sorting: quem estiver mais "embaixo" na tela desenha por cima.
  // Comparamos pela posição dos PÉS (player.y + offset), não pelo centro
  // do sprite — os props da vila usam pivô nos pés, então essa é a
  // régua comum entre os dois. Comparar centro-com-pé é o que causava o
  // personagem "afundando" nos objetos antes.
  const feetY = player.y + SHADOW_OFFSET_Y;
  player.setDepth(feetY);
  shadow.setDepth(feetY - 1);

  const isMoving = vx !== 0 || vy !== 0;
  if (isMoving) {
    if (Math.abs(vx) > Math.abs(vy)) {
      facing = vx > 0 ? 'right' : 'left';
    } else {
      facing = vy > 0 ? 'down' : 'up';
    }
  }

  updateCharacterVisual(delta, isMoving, facing);
}

function updateCharacterVisual(delta, isMoving, facing) {
  const frameSet = CHARACTER_FRAMES[facing];

  if (!isMoving) {
    walkTimer = 0;
    walkFrameIndex = 0;
    player.setFlipX(!!frameSet.idleFlip);

    if (frameSet.idle.length > 1) {
      idleTimer += delta;
      if (idleTimer >= IDLE_FRAME_MS) {
        idleTimer -= IDLE_FRAME_MS;
        idleFrameIndex = (idleFrameIndex + 1) % frameSet.idle.length;
      }
    } else {
      idleTimer = 0;
      idleFrameIndex = 0;
    }
    player.setTexture(frameSet.idle[idleFrameIndex % frameSet.idle.length]);
    return;
  }

  idleTimer = 0;
  idleFrameIndex = 0;
  player.setFlipX(!!frameSet.walkFlip);

  if (frameSet.walk.length > 1) {
    walkTimer += delta;
    if (walkTimer >= WALK_FRAME_MS) {
      walkTimer -= WALK_FRAME_MS;
      walkFrameIndex = (walkFrameIndex + 1) % frameSet.walk.length;
    }
  } else {
    walkTimer = 0;
    walkFrameIndex = 0;
  }
  // % de novo aqui — se o jogador troca de direção com um índice "alto"
  // (ex: parou no frame 3 de 4 e virou pra uma direção com só 2 frames),
  // sem isso ia tentar ler um frame que não existe nesse array menor.
  player.setTexture(frameSet.walk[walkFrameIndex % frameSet.walk.length]);
}
