import Phaser from 'phaser';
import { CURSOR_HOTSPOTS } from '../world/cursorTextures.js';
import {
  getCursorState, isCursorDimmed, isCursorMouseActive,
  noteCursorPointer, setCursorPressed,
} from '../world/cursor.js';
import { isEditorModeActive } from '../editor/editorMode.js';

// Desenha o cursor do mouse DENTRO do canvas, numa cena própria que roda em
// paralelo com 'island' (ver bootScene.js, que dá scene.launch nela junto
// com scene.start da ilha). Cena separada, e não um objeto filho de
// IslandScene, pela mesma razão do Ponteiro.ts do Reino de Aurora: a câmera
// do mundo roda em CAMERA_ZOOM 0.5 (config.js) — um cursor preso àquela
// câmera encolheria pela metade junto com o resto. Uma cena própria tem
// câmera padrão (zoom 1), então o cursor vive em pixel de TELA sempre,
// igual um cursor de sistema de verdade.
//
// Por que não é um cursor de CSS: o jogo é pixelArt:true (main.js) — um
// cursor de imagem de sistema não acompanha a mesma grade de pixel do resto
// do jogo e fica com contraste ruim sobre água/areia/grama ao mesmo tempo
// (por isso o contorno de tinta em cursorTextures.js). Desenhado aqui, o
// cursor ganha o mesmo tratamento de pixel do resto.
const HOVER_LIFT_PX = 1; // "sobe 1px" mora na cena, não no desenho: se a seta subisse dentro da textura, o ponto de pega mentiria sobre onde o clique cai
const CLICK_RING_FRAMES = ['cursor-anel1', 'cursor-anel2', 'cursor-anel3'];
const CLICK_RING_FRAME_MS = 70;

export default class CursorScene extends Phaser.Scene {
  constructor() {
    super('cursor');
  }

  create() {
    this.input.setDefaultCursor('none');
    this.editorCursorActive = false;
    // Nasce fora da tela e escondido — só aparece no primeiro pointermove de
    // mouse de verdade (ver isCursorMouseActive em world/cursor.js), pra um
    // toque em tela sensível nunca ver um cursor nascer do nada.
    this.image = this.add.image(-99, -99, 'cursor-normal').setOrigin(0, 0).setVisible(false).setDepth(1000);

    this.input.on('pointermove', (pointer) => noteCursorPointer(pointer));
    this.input.on('pointerdown', (pointer) => {
      noteCursorPointer(pointer);
      setCursorPressed(true);
      // Sem anel de clique no modo editor — ali o cursor customizado já
      // some por completo (ver update() abaixo), o anel ficaria sozinho.
      if (!isEditorModeActive()) this.spawnClickRing(pointer.x, pointer.y);
    });
    // pointerup em QUALQUER lugar — soltar fora da tela ainda solta, senão
    // o cursor fica "apertado" pra sempre.
    this.input.on('pointerup', () => setCursorPressed(false));
    this.input.on('pointerupoutside', () => setCursorPressed(false));
  }

  // Único retorno visual de clique que existe no chão, onde não há botão
  // pra afundar (mesma ideia do Reino de Aurora, docs/interface-do-mouse.md
  // seção 1) — três quadros de anel abrindo a partir do ponto tocado.
  spawnClickRing(x, y) {
    const ring = this.add.image(x, y, CLICK_RING_FRAMES[0]).setOrigin(0.5, 0.5).setDepth(999);
    let frame = 0;
    const timer = this.time.addEvent({
      delay: CLICK_RING_FRAME_MS,
      repeat: CLICK_RING_FRAMES.length - 1,
      callback: () => {
        frame += 1;
        if (frame < CLICK_RING_FRAMES.length) ring.setTexture(CLICK_RING_FRAMES[frame]);
      },
    });
    this.tweens.add({
      targets: ring,
      alpha: 0,
      duration: CLICK_RING_FRAMES.length * CLICK_RING_FRAME_MS,
      onComplete: () => {
        timer.remove();
        ring.destroy();
      },
    });
  }

  update() {
    // Modo editor ligado: devolve o cursor do sistema. Os próprios botões do
    // editor já usam o useHandCursor nativo do Phaser (editor/editorMode.js),
    // que troca o cursor do CANVAS sozinho — com os dois ligados ao mesmo
    // tempo apareceriam dois cursores sobrepostos.
    const editorOn = isEditorModeActive();
    if (editorOn !== this.editorCursorActive) {
      this.editorCursorActive = editorOn;
      this.input.setDefaultCursor(editorOn ? 'default' : 'none');
    }
    if (editorOn || !isCursorMouseActive()) {
      this.image.setVisible(false);
      return;
    }

    const state = getCursorState();
    const hotspot = CURSOR_HOTSPOTS[state] ?? CURSOR_HOTSPOTS.normal;
    const pointer = this.input.activePointer;
    const lift = state === 'sobre' ? HOVER_LIFT_PX : 0;
    // Posição arredondada ao pixel — coerente com pixelArt:true/roundPixels
    // do jogo (main.js): é o que faz o cursor ler como parte do jogo, não
    // como coisa do sistema operacional boiando por cima.
    this.image
      .setVisible(true)
      .setTexture(`cursor-${state}`)
      .setAlpha(isCursorDimmed() ? 0.45 : 1)
      .setPosition(Math.round(pointer.x) - hotspot.x, Math.round(pointer.y) - hotspot.y - lift);
  }
}
