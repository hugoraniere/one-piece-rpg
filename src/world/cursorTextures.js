// Desenho do cursor customizado — portado do sistema de cursor do jogo
// "Reino de Aurora" (docs/interface-do-mouse.md e arte/cursor.py daquele
// projeto). Lá a folha nasce de um pipeline Python (PIL) separado do jogo;
// aqui não existe esse pipeline (ver bootScene.js/character/layers.js: todo
// placeholder deste projeto é canvas 2D gerado em runtime), então o mesmo
// desenho — grade de letras, contorno de tinta 1px — é reconstruído direto
// em canvas, no mesmo estilo dos outros geradores de textura do projeto.
//
// Por que o cursor é desenhado dentro do canvas e não é um cursor de CSS:
// ver scenes/cursorScene.js, que é quem de fato usa estas texturas.
//
// Cada estado vira uma textura própria (`cursor-<estado>`), não uma
// spritesheet com índice de frame — mais simples de trocar com
// `setTexture()` e já é o padrão que este projeto usa pra tudo (uma chave
// de textura por variação, ver weapon-sword-front/back/side em
// character/layers.js) em vez de atlas.

const CELL = 16; // grade lógica, mesma unidade do cursor.py original
const SCALE = 2; // ampliação nearest-neighbor pra textura final (32px) — cursor vive em espaço de tela, não é afetado pelo zoom da câmera do mundo
const FINAL = CELL * SCALE;

const COLOR = {
  paper: '#f7f1e3', // corpo do cursor
  gold: '#ffcf4d', // "sobre": a seta inteira acende — mesma leitura de "isto é o escolhido" que o resto de uma UI dourada já usa
  red: '#e5473c', // "bloqueado": o X
  ink: '#2b2018', // contorno de 1px em TUDO — é o que faz o cursor se ler sobre grama, areia e água ao mesmo tempo
  water: '#7ec8e3', // lente do "olhar"
  skin: '#e8b98a', // mão do "pegar"/"pegando"
  blade: '#c4c8d1', // lâmina do "atacar" — mesmo tom de aço de weapon-sword-* em character/layers.js
  hilt: '#4a2c17', // cabo do "atacar" — mesmo couro de weapon-sword-* em character/layers.js
};

function colorFor(ch) {
  switch (ch) {
    case 'O': return COLOR.gold;
    case 'V': return COLOR.red;
    case 'T': return COLOR.ink;
    case 'A': return COLOR.water;
    case 'M': return COLOR.skin;
    case 'L': return COLOR.blade;
    case 'C': return COLOR.hilt;
    case 'P':
    default: return COLOR.paper;
  }
}

// A seta: a diagonal cresce 1px por linha até a linha 7 sem repetir largura
// nenhuma (repetir dá fundo chato, lê como bandeira em vez de seta), e a
// perna esquerda afina até 1px (o degrau que faz ler como seta, não
// triângulo com rabo). Mesma forma exata do cursor.py original.
const SETA = [
  'P.......',
  'PP......',
  'PPP.....',
  'PPPP....',
  'PPPPP...',
  'PPPPPP..',
  'PPPPPPP.',
  'PPPPPPPP',
  'PPPP....',
  'PP.PP...',
  'P...PP..',
  '.....PP.',
];
const SETA_X = 3;
const SETA_Y = 1;

const BOTA = ['.PP..', '.PP..', '.PP..', '.PPP.', 'PPPPP'];
const XIS = ['V...V', '.V.V.', '..V..', '.V.V.', 'V...V'];

const BALAO = [
  '.PPPPPPPP.',
  'PPPPPPPPPP',
  'PPTPPTPPTP',
  'PPPPPPPPPP',
  'PPPPPPPPPP',
  '.PPPPPPPP.',
  '.PPP......',
  '.P........',
];

const OLHO = [
  '..PPPPPP..',
  '.PPPPPPPP.',
  'PPPAAAAPPP',
  'PPPATTAPPP',
  'PPPAAAAPPP',
  '.PPPPPPPP.',
  '..PPPPPP..',
];

const MAO_ABERTA = [
  '.MM.MM.MM.',
  '.MM.MM.MM.',
  'MMMMMMMMMM',
  'MMMMMMMMMM',
  'MMMMMMMMMM',
  '.MMMMMMMM.',
  '..MMMMMM..',
];

const MAO_FECHADA = [
  '..MM.MM...',
  '.MMMMMMMM.',
  'MMMMMMMMMM',
  'MMMMMMMMMM',
  '.MMMMMMMM.',
  '..MMMMMM..',
];

const ESPADA = [
  '......LL',
  '.....LLL',
  '....LLL.',
  '...LLL..',
  '..LLL...',
  '.CLL....',
  'CCC.....',
  'CC......',
];

function makeGridCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = CELL;
  canvas.height = CELL;
  return canvas;
}

function drawRows(ctx, rows, x0, y0) {
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.') continue;
      ctx.fillStyle = colorFor(ch);
      ctx.fillRect(x0 + i, y0 + j, 1, 1);
    }
  });
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Mesma técnica de contorno_alfa do cursor.py: qualquer pixel transparente
// vizinho (4 direções) de um pixel opaco vira tinta. Rodar UMA vez só —
// contornar duas vezes engordaria a silhueta em 2px de escuro.
function applyInkOutline(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const alphaAt = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return data[(y * width + x) * 4 + 3];
  };
  const toPaint = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alphaAt(x, y) !== 0) continue;
      if (alphaAt(x - 1, y) || alphaAt(x + 1, y) || alphaAt(x, y - 1) || alphaAt(x, y + 1)) {
        toPaint.push(x, y);
      }
    }
  }
  const [r, g, b] = hexToRgb(COLOR.ink);
  for (let i = 0; i < toPaint.length; i += 2) {
    const idx = (toPaint[i + 1] * width + toPaint[i]) * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function paintGrid(rows, x0, y0) {
  const canvas = makeGridCanvas();
  drawRows(canvas.getContext('2d'), rows, x0, y0);
  applyInkOutline(canvas);
  return canvas;
}

// Seta + distintivo embaixo (andar/bloqueado) — os dois desenhos entram no
// MESMO canvas antes do contorno rodar uma vez só, senão cada forma ganha
// contorno próprio e a folga de 1px entre elas vira uma segunda silhueta.
function paintSetaComBadge(badgeRows, dx, dy) {
  const canvas = makeGridCanvas();
  const ctx = canvas.getContext('2d');
  drawRows(ctx, SETA, SETA_X, SETA_Y);
  drawRows(ctx, badgeRows, dx, dy);
  applyInkOutline(canvas);
  return canvas;
}

// Símbolo centrado na célula (falar/olhar/pegar/pegando/atacar) — o alvo é
// grande (pessoa, item, baú) e o ponto de pega vira o meio do símbolo, não
// uma ponta de seta.
function paintSymbol(rows) {
  const largura = Math.max(...rows.map((r) => r.length));
  const x0 = Math.floor((CELL - largura) / 2);
  const y0 = Math.floor((CELL - rows.length) / 2);
  return paintGrid(rows, x0, y0);
}

// Anel de clique — único retorno visual de clique que existe no chão, onde
// não há botão pra afundar (ver docs/interface-do-mouse.md do Reino de
// Aurora, seção 1). Três raios crescentes tocados em sequência por
// scenes/cursorScene.js.
function paintRing(radius, thickness = 1) {
  const canvas = makeGridCanvas();
  const ctx = canvas.getContext('2d');
  const c = (CELL - 1) / 2;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const d = Math.hypot(x - c, y - c);
      if (d >= radius - thickness && d <= radius) {
        ctx.fillStyle = COLOR.paper;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  applyInkOutline(canvas);
  return canvas;
}

// Data URL de cada quadro, por chave (ex. "cursor-normal") — usado pelo
// cursor de DOM (ver ui/cursorOverlay.js) em vez da textura de Phaser,
// porque o canvas do jogo NUNCA consegue desenhar por cima de um painel de
// UI (HUD, menu, tooltip): são camadas de DOM separadas, com stacking
// context próprio, e um <div> sempre vence um <canvas> embaixo dele não
// importa o depth interno do Phaser. Populado por generateCursorTextures().
export const CURSOR_DATA_URLS = {};

function registerTexture(scene, key, gridCanvas) {
  const final = document.createElement('canvas');
  final.width = FINAL;
  final.height = FINAL;
  const ctx = final.getContext('2d');
  ctx.imageSmoothingEnabled = false; // ampliação em blocos, não borrada — mesmo espírito de pixelArt:true do config do jogo (ver main.js)
  ctx.drawImage(gridCanvas, 0, 0, CELL, CELL, 0, 0, FINAL, FINAL);
  CURSOR_DATA_URLS[key] = final.toDataURL();
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, final);
}

export const CURSOR_STATES = [
  'normal', 'sobre', 'clique', 'andar', 'bloqueado',
  'falar', 'olhar', 'pegar', 'pegando', 'atacar',
];

// Ponto de pega de cada quadro, já em pixel da textura FINAL (pós-escala).
// Mesma regra do cursor.ts original: isto não é escolha de gosto, é onde o
// clique cai — se divergir do desenho, o clique "mente" sobre onde acerta.
export const CURSOR_HOTSPOTS = {
  normal: { x: SETA_X * SCALE, y: SETA_Y * SCALE },
  sobre: { x: SETA_X * SCALE, y: SETA_Y * SCALE },
  clique: { x: SETA_X * SCALE, y: (SETA_Y + 1) * SCALE },
  andar: { x: SETA_X * SCALE, y: SETA_Y * SCALE },
  bloqueado: { x: SETA_X * SCALE, y: SETA_Y * SCALE },
  falar: { x: 8 * SCALE, y: 8 * SCALE },
  olhar: { x: 8 * SCALE, y: 8 * SCALE },
  pegar: { x: 8 * SCALE, y: 8 * SCALE },
  pegando: { x: 8 * SCALE, y: 8 * SCALE },
  atacar: { x: 8 * SCALE, y: 8 * SCALE },
  anel1: { x: 8 * SCALE, y: 8 * SCALE },
  anel2: { x: 8 * SCALE, y: 8 * SCALE },
  anel3: { x: 8 * SCALE, y: 8 * SCALE },
};

// Roda uma vez só, na BootScene (mesmo padrão de generatePlaceholder* em
// character/layers.js) — textures.addCanvas é global ao jogo, não por cena.
export function generateCursorTextures(scene) {
  registerTexture(scene, 'cursor-normal', paintGrid(SETA, SETA_X, SETA_Y));
  registerTexture(scene, 'cursor-sobre', paintGrid(SETA.map((row) => row.replaceAll('P', 'O')), SETA_X, SETA_Y));
  // seta[:-2]: descarta as duas últimas linhas (a ponta da cauda), desce 1px
  // — silhueta muda, que é a única coisa que se percebe num quadro de ~90ms.
  registerTexture(scene, 'cursor-clique', paintGrid(SETA.slice(0, -2), SETA_X, SETA_Y + 1));
  registerTexture(scene, 'cursor-andar', paintSetaComBadge(BOTA, 10, 10));
  registerTexture(scene, 'cursor-bloqueado', paintSetaComBadge(XIS, 10, 10));
  registerTexture(scene, 'cursor-falar', paintSymbol(BALAO));
  registerTexture(scene, 'cursor-olhar', paintSymbol(OLHO));
  registerTexture(scene, 'cursor-pegar', paintSymbol(MAO_ABERTA));
  registerTexture(scene, 'cursor-pegando', paintSymbol(MAO_FECHADA));
  registerTexture(scene, 'cursor-atacar', paintSymbol(ESPADA));
  registerTexture(scene, 'cursor-anel1', paintRing(3));
  registerTexture(scene, 'cursor-anel2', paintRing(5));
  registerTexture(scene, 'cursor-anel3', paintRing(7));
}
