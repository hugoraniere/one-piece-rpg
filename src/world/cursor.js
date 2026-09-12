// Estado do cursor customizado — módulo puro, sem Phaser e sem cena (quem
// desenha é scenes/cursorScene.js). Portado do sistema de cursor do jogo
// "Reino de Aurora" (sistemas/cursor.ts daquele projeto): "o cursor é o
// tooltip" — ele muda de forma ANTES do clique, então o jogador descobre o
// que a cena aceita sem precisar clicar pra descobrir. Separar o estado da
// cena permite que qualquer sistema (hover de item no chão, hover futuro de
// NPC etc.) diga "o cursor deve mostrar isto agora" sem importar UI.
let state = 'normal';
let pressed = false;
// "longe" no Reino de Aurora não é um desenho à parte: é o MESMO cursor de
// contexto, apagado — "isso é interativo, mas você não alcança" tem que
// parecer diferente de "isso não é nada", sem inventar vocabulário novo.
let dimmed = false;
// Um dedo não paira: o cursor só existe depois que um mouse de verdade se
// move, e some de novo no toque — mesmo cuidado do Ponteiro.ts original.
let mouseActive = false;

export function setCursorState(next, opts = {}) {
  state = next;
  dimmed = Boolean(opts.dimmed);
}

export function getCursorState() {
  return pressed ? 'clique' : state;
}

export function isCursorDimmed() {
  return !pressed && dimmed;
}

export function setCursorPressed(value) {
  pressed = value;
}

export function noteCursorPointer(pointer) {
  mouseActive = !pointer.wasTouch;
}

export function isCursorMouseActive() {
  return mouseActive;
}
