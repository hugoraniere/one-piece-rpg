import Phaser from 'phaser';
import { ATTACK_FRAME_MS, CHAR_SCALE, IDLE_FRAME_MS, SHADOW_OFFSET_Y, SHADOW_SCALE_X, SHADOW_SCALE_Y, WALK_FRAME_MS } from '../config.js';
import { advanceFrame, resolveModeFrames } from './frameCycle.js';
import { RACES, preloadRaceAssets } from './races.js';

// Personagem real (assets/characters/), fundo verde já removido — ver
// tools/remove_chroma_key.py. Idle completo nas 4 direções (costas tem 2
// frames que alternam bem devagar, tipo respiração) + caminhada de frente,
// costas e perfil (perfil ainda é uma arte só, espelhada pra virar direita
// /esquerda — idle não espelha mais porque já tem arte própria dos dois
// lados). Os frames por raça (hoje só `human`) moraram pra race.js — ver lá
// pra adicionar uma raça nova.
//
// `attack` já é um modo de animação de verdade (frame-based, não mais um
// tween avulso) mas ainda usa o frame de idle como placeholder em toda
// raça — falta: corrida, dano, habilidade, morte, vitória. Ver
// CHARACTER_ASSETS_TODO.md pro mapeamento completo.

export function preloadCharacterAssets(scene) {
  preloadRaceAssets(scene, 'human');
}

// Cria a textura da sombra por canvas (gradiente radial) — não é um asset.
export function generateShadowTexture(scene) {
  // Resolução bem maior que o tamanho de exibição real — precisamos de
  // sobra porque o filtro "linear" (ver abaixo) suaviza a partir dos
  // pixels que já existem; pouca resolução ainda mostraria escada.
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Mais pontos de parada = esmaecimento mais gradual (evita a sensação de
  // "blob com borda"). Opacidade máxima bem mais sutil que antes.
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.22)');
  gradient.addColorStop(0.4, 'rgba(0,0,0,0.16)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.08)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  scene.textures.addCanvas('shadow', canvas);
  // O jogo inteiro usa pixelArt:true (amostragem "nearest", sem suavizar) —
  // ótimo pro personagem e pros tiles, péssimo pra um gradiente, que fica
  // com degraus visíveis em vez de esmaecer suave. Corrige só esta textura.
  scene.textures.get('shadow').setFilter(Phaser.Textures.FilterMode.LINEAR);
}

// Cria o sprite do jogador + sua sombra, já posicionados e com física.
// `raceId` decide qual conjunto de frames usar (ver races.js) — default
// 'human' porque é a única raça jogável até agora. A textura 'shadow' já
// precisa existir (ver BootScene.create() — gerada uma vez só, ao ligar o
// jogo, não a cada troca de ilha: scene.textures é global ao jogo inteiro,
// não por cena, então gerar de novo aqui a cada scene.restart() faria o
// Phaser avisar de chave duplicada sem motivo).
export function createPlayerCharacter(scene, x, y, raceId = 'human') {
  const shadow = scene.add.image(x, y + SHADOW_OFFSET_Y, 'shadow');
  shadow.setScale(SHADOW_SCALE_X, SHADOW_SCALE_Y);
  shadow.setDepth(-0.5); // acima do chão, abaixo do personagem

  const initialTexture = RACES[raceId].frames.down.idle[0];
  const player = scene.physics.add.sprite(x, y, initialTexture);
  player.setScale(CHAR_SCALE);
  // Caixa de colisão pequena perto dos pés, não o corpo inteiro (a imagem
  // tem bastante espaço vazio ao redor do personagem) — ajuste fino depois.
  // Valores proporcionais aos antigos (90,60 / 55,120 num canvas 200x200),
  // reduzidos pro canvas novo de 32x32 (fator 0.16) — ver CHAR_SCALE em
  // config.js pro resto da conta do teste de pixel art.
  player.body.setSize(14, 10);
  player.body.setOffset(9, 19);
  player.setCollideWorldBounds(true);

  return { player, shadow };
}

// Estado da animação (frame atual, timers) — um por personagem controlado
// por este módulo. Hoje só o jogador usa isso; se um NPC/inimigo precisar
// do mesmo ciclo de idle/walk/attack, criar outro objeto de estado com
// createAnimationState() em vez de reaproveitar este.
export function createAnimationState() {
  return {
    walkTimer: 0,
    walkFrameIndex: 0,
    idleTimer: 0,
    idleFrameIndex: 0,
    attackTimer: 0,
    attackFrameIndex: 0,
  };
}

const FRAME_MS_BY_MODE = { idle: IDLE_FRAME_MS, walk: WALK_FRAME_MS, attack: ATTACK_FRAME_MS };
const TIMER_KEY_BY_MODE = { idle: 'idleTimer', walk: 'walkTimer', attack: 'attackTimer' };
const INDEX_KEY_BY_MODE = { idle: 'idleFrameIndex', walk: 'walkFrameIndex', attack: 'attackFrameIndex' };
const ALL_MODES = ['idle', 'walk', 'attack'];

// `mode` é 'idle' | 'walk' | 'attack' — substitui o antigo booleano
// `isMoving` pra dar espaço a mais estados sem virar uma pilha de flags.
export function updateCharacterVisual(player, state, delta, mode, facing, raceId = 'human') {
  const frameSet = RACES[raceId].frames[facing];
  const { frames, flip } = resolveModeFrames(frameSet, mode);

  // Zera os timers dos modos que NÃO estão ativos agora, senão ao voltar
  // pra eles o personagem retoma de um índice/tempo "no meio" do ciclo
  // anterior em vez de recomeçar do frame 1.
  for (const otherMode of ALL_MODES) {
    if (otherMode === mode) continue;
    state[TIMER_KEY_BY_MODE[otherMode]] = 0;
    state[INDEX_KEY_BY_MODE[otherMode]] = 0;
  }

  player.setFlipX(flip);
  player.setTexture(advanceFrame(state, TIMER_KEY_BY_MODE[mode], INDEX_KEY_BY_MODE[mode], frames, FRAME_MS_BY_MODE[mode], delta));
}
