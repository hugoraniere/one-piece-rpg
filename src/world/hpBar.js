import Phaser from 'phaser';

// Barra de vida "presa" a um personagem no mundo (jogador ou inimigo)
// durante combate — desenhada com Graphics, não texto. Mesma paleta do HUD
// (moldura escura + trilho vinho + preenchimento vermelho), só que ancorada
// em coordenada de mundo em vez de fixa na tela.
const BAR_WIDTH = 56;
const BAR_HEIGHT = 8;

export function createHpBar(scene, x, y, name) {
  const graphics = scene.add.graphics();
  graphics.setDepth(9000);

  const nameText = scene.add.text(x, y - 11, name, {
    font: '10px Arial',
    color: '#ffffff',
    backgroundColor: '#000000aa',
    padding: { x: 4, y: 1 },
  });
  nameText.setOrigin(0.5, 1);
  nameText.setDepth(9000);

  const bar = { graphics, nameText, x, y, current: 1, max: 1 };
  redraw(bar);
  return bar;
}

export function setHpBarPosition(bar, x, y) {
  bar.x = x;
  bar.y = y;
  bar.nameText.setPosition(x, y - 11);
  redraw(bar);
}

export function updateHpBar(bar, current, max) {
  bar.current = current;
  bar.max = max;
  redraw(bar);
}

export function setHpBarVisible(bar, visible) {
  bar.graphics.setVisible(visible);
  bar.nameText.setVisible(visible);
}

function redraw(bar) {
  const { graphics, x, y, current, max } = bar;
  graphics.clear();
  const left = x - BAR_WIDTH / 2;

  graphics.fillStyle(0x241708, 1);
  graphics.fillRoundedRect(left - 1, y - 1, BAR_WIDTH + 2, BAR_HEIGHT + 2, 3);

  graphics.fillStyle(0x4a2020, 1);
  graphics.fillRoundedRect(left, y, BAR_WIDTH, BAR_HEIGHT, 2);

  const pct = max > 0 ? Phaser.Math.Clamp(current / max, 0, 1) : 0;
  if (pct > 0) {
    graphics.fillStyle(0x9c2b2b, 1);
    graphics.fillRoundedRect(left, y, BAR_WIDTH * pct, BAR_HEIGHT, 2);
  }
}
