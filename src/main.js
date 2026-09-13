import Phaser from 'phaser';
import BootScene from './scenes/bootScene.js';
import IslandScene from './scenes/islandScene.js';
import CursorScene from './scenes/cursorScene.js';

const config = {
  type: Phaser.CANVAS,
  disableVisibilityChange: true,
  fps: { forceSetTimeOut: true },
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
  // BootScene gera as texturas placeholder uma única vez e entrega pra
  // IslandScene (ver bootScene.js) — trocar de ilha reusa a MESMA
  // IslandScene via scene.restart({islandId}), nunca cria outra cena nova
  // por lugar (ver plano de múltiplas ilhas). CursorScene roda em paralelo
  // com IslandScene (scene.launch, ver bootScene.js) e fica por ÚLTIMO na
  // lista de propósito: o Phaser desenha as cenas na ordem em que aparecem
  // aqui, e o cursor precisa ficar por cima de tudo.
  scene: [BootScene, IslandScene, CursorScene],
};

window.__game = new Phaser.Game(config);
