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
  // Vara de pescar — sem golpe de ataque de verdade (não é arma), então
  // 'attack' nem precisa existir aqui: resolveModeFrames() já cai pro idle
  // sozinho quando falta (ver frameCycle.js).
  'vara-de-pescar': {
    down: { idle: ['rod-front'], walk: ['rod-front'] },
    up: { idle: ['rod-back'], walk: ['rod-back'] },
    right: { idle: ['rod-side'], idleFlip: false, walk: ['rod-side'], walkFlip: false },
    left: { idle: ['rod-side'], idleFlip: true, walk: ['rod-side'], walkFlip: true },
  },
};

// Mesmo tamanho dos frames reais do personagem (ver CHARACTER_ASSETS_TODO.md
// — a arte da camada precisa nascer nesse mesmo tamanho de tela pra alinhar).
// 32 pra bater com o canvas do teste de pixel art (ver character/races.js);
// era 200 com a arte pintada anterior — todas as coordenadas de desenho
// abaixo foram reduzidas pelo mesmo fator (32/200 = 0.16), não são mais as
// mesmas de antes.
const PLACEHOLDER_CANVAS_SIZE = 32;

// PLACEHOLDER — desenha uma "espada" simples numa cor que não existe em
// nenhum asset real (roxo/magenta), só pra provar que a camada de
// equipamento funciona: acompanha a direção, anda junto, aparece/some ao
// equipar. Troque por arte de verdade seguindo EQUIPMENT_ASSETS_TODO.md; até
// lá, ver esse retângulo roxo em cima do personagem é esperado. Em canvas
// tão pequeno (32px) o desenho fica mais tosco que antes — é esperado, é
// só um placeholder, e a escala tem que bater com o corpo (ver comentário
// de PLACEHOLDER_CANVAS_SIZE).
// Pontos de cintura MEDIDOS de verdade (não escalados às cegas) nos 4
// sprites de idle do teste de pixel art — desenhei uma grade de referência
// por cima do personagem em cada direção e conferi visualmente antes de
// aceitar (mesmo espírito de "confirma antes de aceitar" do
// VISUAL_STYLE_GUIDE.md, só que pra posição em vez de asset). Corpo é
// "chibi" (cabeça grande) — a cintura fica bem mais alta no canvas do que
// "65% da altura do conteúdo" sugere; ela está por volta de y=19-20 nos
// 4 sprites (medido direto na grade, não estimado).
// Primeira tentativa media o quadril certo mas desenhava a lâmina para
// CIMA a partir dele — numa vista de perfil isso empurra a espada até a
// altura do rosto (ruim). Corrigido: lâmina embainhada aponta pra BAIXO
// a partir da cintura (acompanha a perna), cabo/punho fica ligeiramente
// acima da cintura — é assim que uma espada na cintura realmente pendura.
// 'side' usa a cintura do east (18,19); o west reaproveita a MESMA textura
// espelhada (ver LAYER_DEFS.sword.left, idleFlip/walkFlip: true).
export function generatePlaceholderWeaponTextures(scene) {
  drawPlaceholderSword(scene, 'weapon-sword-front', 19, 19, 20);
  drawPlaceholderSword(scene, 'weapon-sword-back', 12, 18, 20);
  drawPlaceholderSword(scene, 'weapon-sword-side', 18, 19, 15);
}

// PLACEHOLDER na mesma linha da espada acima: uma vara marrom simples (sem
// arte de verdade ainda) só pra provar que o equip funciona. Mesmos pontos
// de cintura da espada, um pouco mais alto (vara segurada na altura do
// peito/mão, não pendurada no cinto) e mais vertical (uma vara de pescar
// descansa quase reta, não inclinada como uma lâmina embainhada).
export function generatePlaceholderRodTextures(scene) {
  drawPlaceholderRod(scene, 'rod-front', 19, 17, -8);
  drawPlaceholderRod(scene, 'rod-back', 12, 16, -8);
  drawPlaceholderRod(scene, 'rod-side', 18, 17, -4);
}

function drawPlaceholderRod(scene, key, gripX, gripY, angleDeg) {
  const size = PLACEHOLDER_CANVAS_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(Phaser.Math.DegToRad(angleDeg));
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(-1, -8, 2, 8); // vareta (encurtada pra caber no canvas de 32px)
  ctx.strokeStyle = '#e8d9b0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(2, -1);
  ctx.stroke(); // linha de pesca
  ctx.fillStyle = '#3b2415';
  ctx.fillRect(-1, -1, 2, 3); // cabo
  ctx.restore();

  scene.textures.addCanvas(key, canvas);
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
  // Lâmina embainhada aponta pra BAIXO a partir do ponto de cintura
  // (pendura ao lado da perna) — cabo/guarda ficam ACIMA desse ponto
  // (altura da mão que empunha). Ver comentário de generatePlaceholder-
  // WeaponTextures acima: a versão anterior desenhava isso invertido, o
  // que empurrava a lâmina até a altura do rosto na vista de perfil.
  ctx.fillStyle = '#701a75';
  ctx.fillRect(-1, -3, 2, 3); // cabo
  ctx.fillStyle = '#c026d3';
  ctx.fillRect(-2, 0, 4, 1); // guarda
  ctx.fillRect(-1, 1, 2, 8); // lâmina
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
