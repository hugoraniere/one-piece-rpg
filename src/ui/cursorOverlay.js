import { CURSOR_DATA_URLS, CURSOR_HOTSPOTS } from '../world/cursorTextures.js';
import {
  getCursorState, isCursorDimmed, isCursorMouseActive,
  noteCursorPointer, setCursorPressed,
} from '../world/cursor.js';
import { isEditorModeActive } from '../editor/editorMode.js';

// O cursor customizado (pixel art, ver world/cursorTextures.js) desenhado
// como elemento de DOM, não como objeto de Phaser — um <canvas> nunca fica
// por cima de um <div> de UI (HUD, menu, tooltip, hotbar): são camadas
// separadas com stacking context próprio, e o canvas sempre perde pro DOM
// não importa o depth interno do Phaser (achado testando: o cursor sumia
// atrás da caixa "slot vazio" do hotbar). Um <img> com z-index bem alto
// resolve isso de vez, e ainda lê nítido igual pixel art de verdade via
// `image-rendering: pixelated` — a MESMA propriedade que o canvas do jogo
// já usa (ver index.html).
//
// `pointer-events: none`: o cursor nunca pode interceptar o próprio clique
// que ele está representando.
const HOVER_LIFT_PX = 1; // mesma regra do antigo cursorScene.js: a subida mora aqui, não no desenho, senão o ponto de pega mentiria sobre onde o clique cai
const Z_INDEX = 99999; // acima de tudo que a UI usa hoje (checado: o mais alto era 900, no menu-backdrop)

let imgEl;
let rawX = -99;
let rawY = -99;
// Se o último mousemove pousou no CANVAS ou em cima de algum painel de DOM
// (HUD, menu, tooltip) — ver render() logo abaixo pra saber por que isto
// importa tanto quanto a posição.
let isOverCanvas = false;

function ensureDom() {
  if (imgEl) return;
  imgEl = document.createElement('img');
  imgEl.style.position = 'fixed';
  imgEl.style.left = '0';
  imgEl.style.top = '0';
  imgEl.style.zIndex = String(Z_INDEX);
  imgEl.style.pointerEvents = 'none';
  imgEl.style.imageRendering = 'pixelated';
  imgEl.style.display = 'none';
  document.body.appendChild(imgEl);
}

/** Chamada uma vez, no boot (ver bootScene.js) — depois que
 *  generateCursorTextures já populou CURSOR_DATA_URLS. */
export function initCursorOverlay() {
  ensureDom();

  const handleMove = (event) => {
    rawX = event.clientX;
    rawY = event.clientY;
    // event.target é o elemento mais interno debaixo do ponteiro NA HORA do
    // evento — isso não muda com bubbling, então dá pra saber daqui, sem
    // custo de um elementFromPoint() a cada frame, se o mouse está sobre o
    // CANVAS (mundo do jogo, cursor contextual vale) ou sobre um painel de
    // DOM (HUD, menu, tooltip — cursor contextual NÃO vale, ver render()).
    isOverCanvas = event.target?.tagName === 'CANVAS';
    // 'mousemove' não tem pointerType (undefined) — só 'touch' de verdade
    // conta como toque; qualquer outra coisa é tratada como mouse. Escuta
    // na WINDOW, não no canvas: um painel de DOM por cima do canvas nunca
    // deixaria o evento chegar lá (mousemove não passa de um elemento pro
    // irmão embaixo dele), e é exatamente sobre painel de DOM que este
    // cursor mais precisa continuar funcionando.
    noteCursorPointer({ wasTouch: event.pointerType === 'touch' });
  };
  window.addEventListener('pointermove', handleMove);
  window.addEventListener('mousemove', handleMove); // redundante com pointermove pra mouse de verdade, cobre o que só dispara um dos dois

  const handleDown = (event) => {
    noteCursorPointer({ wasTouch: event.pointerType === 'touch' });
    setCursorPressed(true);
  };
  window.addEventListener('pointerdown', handleDown);
  window.addEventListener('mousedown', handleDown);
  // soltar em QUALQUER lugar solta — nunca fica "apertado" pra sempre.
  window.addEventListener('pointerup', () => setCursorPressed(false));
  window.addEventListener('mouseup', () => setCursorPressed(false));

  const loop = () => {
    render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function render() {
  // Modo editor: os botões da paleta usam useHandCursor nativo
  // (editor/editorMode.js) — os dois cursores ao mesmo tempo duplicariam.
  if (isEditorModeActive() || !isCursorMouseActive()) {
    imgEl.style.display = 'none';
    return;
  }
  // getCursorState() é decidido pelo hover do MUNDO (updateGroundItemCursor/
  // updateWalkCursor em islandScene.js), que só roda em cima do ponteiro do
  // Phaser — e o Phaser só atualiza esse ponteiro com eventos que chegam no
  // CANVAS. Fora dele (qualquer painel de DOM), esse estado fica CONGELADO
  // no que quer que fosse a última vez que o mouse esteve sobre o jogo —
  // achado pelo usuário: passar perto d'água e depois abrir um menu
  // deixava o X de "bloqueado" preso na tela por cima da UI. `pressado`
  // (o achatado de clique) é a única exceção: faz sentido em qualquer
  // clique, mundo ou botão de UI, então esse continua valendo sempre.
  const worldState = getCursorState();
  const pressedState = worldState === 'clique';
  const state = isOverCanvas || pressedState ? worldState : 'normal';
  const dimmed = isOverCanvas && isCursorDimmed();

  const src = CURSOR_DATA_URLS[`cursor-${state}`];
  if (!src) return; // texturas ainda não geradas (antes do boot terminar)
  if (imgEl.src !== src) imgEl.src = src;

  const hotspot = CURSOR_HOTSPOTS[state] ?? CURSOR_HOTSPOTS.normal;
  const lift = state === 'sobre' ? HOVER_LIFT_PX : 0;
  // translate() em vez de left/top: só GPU, sem forçar reflow a cada frame.
  // Arredondado ao pixel — coerente com pixelArt:true/roundPixels do jogo
  // (main.js), é o que faz o cursor ler como parte do jogo.
  imgEl.style.display = 'block';
  imgEl.style.opacity = dimmed ? '0.45' : '1';
  imgEl.style.transform = `translate(${Math.round(rawX) - hotspot.x}px, ${Math.round(rawY) - hotspot.y - lift}px)`;
}
