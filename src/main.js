import Phaser from 'phaser';
import { create, preload, update } from './scenes/villageScene.js';

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
  scene: { preload, create, update },
};

window.__game = new Phaser.Game(config);
