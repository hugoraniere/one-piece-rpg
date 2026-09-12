import Phaser from 'phaser';
import { ATTACK_FRAME_MS, CHAR_SCALE, IDLE_FRAME_MS, RUN_FRAME_MS, SHADOW_OFFSET_Y, SHADOW_SCALE_X, SHADOW_SCALE_Y, WALK_FRAME_MS } from '../config.js';
import { advanceFrame, resolveModeFrames } from './frameCycle.js';
import { RACES, preloadRaceAssets } from './races.js';

export function generateShadowTexture(scene) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.22)');
  gradient.addColorStop(0.4, 'rgba(0,0,0,0.16)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.08)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  scene.textures.addCanvas('shadow', canvas);
  scene.textures.get('shadow').setFilter(Phaser.Textures.FilterMode.LINEAR);
}

export function preloadCharacterAssets(scene) {
  preloadRaceAssets(scene, 'human');
}

export function createPlayerCharacter(scene, x, y, raceId = 'human') {
  const shadow = scene.add.image(x, y + SHADOW_OFFSET_Y, 'shadow');
  shadow.setScale(SHADOW_SCALE_X, SHADOW_SCALE_Y);
  shadow.setDepth(-0.5);

  const initialTexture = RACES[raceId].frames.down.idle[0];
  const player = scene.physics.add.sprite(x, y, initialTexture);
  player.setScale(CHAR_SCALE);
  player.body.setSize(14, 10);
  player.body.setOffset(9, 19);
  player.setCollideWorldBounds(true);

  return { player, shadow };
}

export function createAnimationState() {
  return {
    walkTimer: 0,
    walkFrameIndex: 0,
    runTimer: 0,
    runFrameIndex: 0,
    idleTimer: 0,
    idleFrameIndex: 0,
    attackTimer: 0,
    attackFrameIndex: 0,
  };
}

const FRAME_MS_BY_MODE = { idle: IDLE_FRAME_MS, walk: WALK_FRAME_MS, run: RUN_FRAME_MS, attack: ATTACK_FRAME_MS };
const TIMER_KEY_BY_MODE = { idle: 'idleTimer', walk: 'walkTimer', run: 'runTimer', attack: 'attackTimer' };
const INDEX_KEY_BY_MODE = { idle: 'idleFrameIndex', walk: 'walkFrameIndex', run: 'runFrameIndex', attack: 'attackFrameIndex' };
const ALL_MODES = ['idle', 'walk', 'run', 'attack'];

export function updateCharacterVisual(player, state, delta, mode, facing, raceId = 'human') {
  const frameSet = RACES[raceId].frames[facing];
  const { frames, flip } = resolveModeFrames(frameSet, mode);

  for (const otherMode of ALL_MODES) {
    if (otherMode === mode) continue;
    state[TIMER_KEY_BY_MODE[otherMode]] = 0;
    state[INDEX_KEY_BY_MODE[otherMode]] = 0;
  }

  player.setFlipX(flip);
  player.setTexture(advanceFrame(state, TIMER_KEY_BY_MODE[mode], INDEX_KEY_BY_MODE[mode], frames, FRAME_MS_BY_MODE[mode], delta));
}
