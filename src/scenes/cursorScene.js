import Phaser from 'phaser';
import { setCursorPressed } from '../world/cursor.js';
import { isEditorModeActive } from '../editor/editorMode.js';

// O DESENHO do cursor mora em DOM agora (ver ui/cursorOverlay.js) — um
// canvas nunca consegue ficar por cima de um painel de UI (HUD, menu,
// tooltip), porque são camadas de DOM com stacking context próprio, mais
// alto que o canvas continue sempre embaixo (achado testando: o cursor
// customizado sumia atrás da caixa de "slot vazio" do hotbar). Esta cena
// sobra pra duas coisas que SÃO de canvas de verdade:
//
// 1. O anel de clique no chão (spawnClickRing) — é posição de MUNDO, só
//    faz sentido dentro do canvas, sobre o que o jogador realmente tocou.
// 2. O cursor NATIVO do canvas (setDefaultCursor) — o canvas em si (fora
//    de qualquer painel de DOM) ainda precisa de `cursor: none` pra não
//    mostrar a seta do sistema por baixo do cursor de DOM; some no modo
//    Editor porque os botões da paleta usam useHandCursor de verdade.
const CLICK_RING_FRAMES = ['cursor-anel1', 'cursor-anel2', 'cursor-anel3'];
const CLICK_RING_FRAME_MS = 70;

export default class CursorScene extends Phaser.Scene {
  constructor() {
    super('cursor');
  }

  create() {
    this.input.setDefaultCursor('none');
    this.editorCursorActive = false;

    this.input.on('pointerdown', (pointer) => {
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
    // Modo editor ligado: devolve o cursor NATIVO do canvas. Os próprios
    // botões do editor já usam o useHandCursor nativo do Phaser
    // (editor/editorMode.js), que troca o cursor do CANVAS sozinho — o
    // cursor de DOM (ui/cursorOverlay.js) também se esconde no editor pela
    // mesma razão (ver isEditorModeActive lá).
    const editorOn = isEditorModeActive();
    if (editorOn !== this.editorCursorActive) {
      this.editorCursorActive = editorOn;
      this.input.setDefaultCursor(editorOn ? 'default' : 'none');
    }
  }
}
