import Phaser from 'phaser';
import { ATTACK_FRAME_MS, IDLE_FRAME_MS, WALK_FRAME_MS } from '../config.js';
import { advanceFrame, resolveModeFrames } from './frameCycle.js';

// Uma "camada" de equipamento (por enquanto só a arma) é uma segunda imagem
// desenhada por cima do corpo, sincronizada com ele (posição, escala,
// profundidade) todo frame — nunca calculamos um deslocamento manual pra
// encaixar. Isso só funciona porque a arte da camada é desenhada na MESMA
// "tela" (mesmo tamanho de canvas, mesmo alinhamento) que o frame do corpo
// correspondente, como uma camada transparente por cima da arte original.
// Ver EQUIPMENT_ASSETS_TODO.md pra instruções de como gerar isso de verdade.
//
// Generalizado pra qualquer camada, não só arma: uma camada nova (chapéu,
// roupa alternativa) é só mais uma entrada em LAYER_DEFS com a mesma
// estrutura (idle/walk/attack por direção) — nenhuma função deste módulo
// precisa mudar.
export const LAYER_DEFS = {
  sword: {
    down: { idle: ['weapon-sword-front'], walk: ['weapon-sword-front'], attack: ['weapon-sword-front'] },
    up: { idle: ['weapon-sword-back'], walk: ['weapon-sword-back'], attack: ['weapon-sword-back'] },
    right: {
      idle: ['weapon-sword-side'],
      idleFlip: false,
      walk: ['weapon-sword-side'],
      walkFlip: false,
      attack: ['weapon-sword-side'],
    },
    left: {
      idle: ['weapon-sword-side'],
      idleFlip: true,
      walk: ['weapon-sword-side'],
      walkFlip: true,
      attack: ['weapon-sword-side'],
    },
  },
};

// Mesmo tamanho dos frames reais do personagem (ver CHARACTER_ASSETS_TODO.md)
// — a arte da camada precisa nascer nesse mesmo tamanho de tela pra alinhar.
const PLACEHOLDER_CANVAS_SIZE = 200;

// PLACEHOLDER — desenha uma "espada" simples numa cor que não existe em
// nenhum asset real (roxo/magenta), só pra provar que a camada de
// equipamento funciona: acompanha a direção, anda junto, aparece/some ao
// equipar. Troque por arte de verdade seguindo EQUIPMENT_ASSETS_TODO.md; até
// lá, ver esse retângulo roxo em cima do personagem é esperado.
export function generatePlaceholderWeaponTextures(scene) {
  drawPlaceholderSword(scene, 'weapon-sword-front', 128, 118, -35);
  drawPlaceholderSword(scene, 'weapon-sword-back', 76, 108, -35);
  drawPlaceholderSword(scene, 'weapon-sword-side', 122, 118, -20);
}

function drawPlaceholderSword(scene, key, hiltX, hiltY, angleDeg) {
  const size = PLACEHOLDER_CANVAS_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(hiltX, hiltY);
  ctx.rotate(Phaser.Math.DegToRad(angleDeg));
  ctx.fillStyle = '#c026d3';
  ctx.fillRect(-4, -55, 8, 55); // lâmina
  ctx.fillRect(-12, -8, 24, 6); // guarda
  ctx.fillStyle = '#701a75';
  ctx.fillRect(-4, -2, 8, 16); // cabo
  ctx.restore();

  scene.textures.addCanvas(key, canvas);
}

// `initialTextureKey` é só o frame inicial (invisível até equipar algo) —
// qualquer camada nova (arma, chapéu, ...) cria seu próprio sprite chamando
// isso, cada um com seu próprio createLayerState().
export function createLayerSprite(scene, initialTextureKey) {
  const sprite = scene.add.image(0, 0, initialTextureKey);
  sprite.setVisible(false);
  return sprite;
}

export function createLayerState() {
  return {
    equippedLayerId: null,
    walkTimer: 0,
    walkFrameIndex: 0,
    idleTimer: 0,
    idleFrameIndex: 0,
    attackTimer: 0,
    attackFrameIndex: 0,
  };
}

export function equipLayer(state, layerId) {
  state.equippedLayerId = layerId;
  state.walkTimer = 0;
  state.walkFrameIndex = 0;
  state.idleTimer = 0;
  state.idleFrameIndex = 0;
  state.attackTimer = 0;
  state.attackFrameIndex = 0;
}

export function unequipLayer(state) {
  state.equippedLayerId = null;
}

const FRAME_MS_BY_MODE = { idle: IDLE_FRAME_MS, walk: WALK_FRAME_MS, attack: ATTACK_FRAME_MS };
const TIMER_KEY_BY_MODE = { idle: 'idleTimer', walk: 'walkTimer', attack: 'attackTimer' };
const INDEX_KEY_BY_MODE = { idle: 'idleFrameIndex', walk: 'walkFrameIndex', attack: 'attackFrameIndex' };
const ALL_MODES = ['idle', 'walk', 'attack'];

// Atualiza textura/frame da camada e sincroniza sua posição/escala/
// profundidade com o sprite do corpo — é essa sincronia que faz a camada
// "grudar" no personagem em vez de precisar de coordenadas calculadas por
// direção. `mode` é 'idle' | 'walk' | 'attack', igual em character.js.
export function updateLayerVisual(layerSprite, state, bodySprite, delta, mode, facing) {
  const layerData = state.equippedLayerId ? LAYER_DEFS[state.equippedLayerId] : null;
  const frameSet = layerData ? layerData[facing] : null;

  if (!frameSet) {
    layerSprite.setVisible(false);
    return;
  }
  layerSprite.setVisible(true);

  const { frames, flip } = resolveModeFrames(frameSet, mode);
  for (const otherMode of ALL_MODES) {
    if (otherMode === mode) continue;
    state[TIMER_KEY_BY_MODE[otherMode]] = 0;
    state[INDEX_KEY_BY_MODE[otherMode]] = 0;
  }

  layerSprite.setFlipX(flip);
  layerSprite.setTexture(advanceFrame(state, TIMER_KEY_BY_MODE[mode], INDEX_KEY_BY_MODE[mode], frames, FRAME_MS_BY_MODE[mode], delta));

  layerSprite.setPosition(bodySprite.x, bodySprite.y);
  layerSprite.setScale(bodySprite.scaleX, bodySprite.scaleY);
  layerSprite.setDepth(bodySprite.depth + 0.01);
}
