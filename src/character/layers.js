import Phaser from 'phaser';
import { ATTACK_FRAME_MS, IDLE_FRAME_MS, RUN_FRAME_MS, WALK_FRAME_MS } from '../config.js';
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
  // Arco — arma (ver sim/equipmentDefs.js), então precisa de 'attack'.
  // Diferente da espada, os frames de CORPO do golpe (races.js, gerados via
  // PixelLab) foram desenhados especificamente pra um swing de espada — não
  // existe (ainda) uma animação de corpo "puxando a corda do arco". Por
  // ora a camada do arco simplesmente continua visível e estática durante o
  // golpe (mesma pose de idle) — igual às outras camadas, updateLayerVisual
  // só esconde a camada durante attack pro caso específico da espada (ver
  // comentário lá). É uma limitação conhecida de placeholder, não um bug —
  // ver ITEMS_PROGRESS.md.
  arco: {
    down: { idle: ['weapon-bow-front'], walk: ['weapon-bow-front'], attack: ['weapon-bow-front'] },
    up: { idle: ['weapon-bow-back'], walk: ['weapon-bow-back'], attack: ['weapon-bow-back'] },
    right: {
      idle: ['weapon-bow-side'],
      idleFlip: false,
      walk: ['weapon-bow-side'],
      walkFlip: false,
      attack: ['weapon-bow-side'],
    },
    left: {
      idle: ['weapon-bow-side'],
      idleFlip: true,
      walk: ['weapon-bow-side'],
      walkFlip: true,
      attack: ['weapon-bow-side'],
    },
  },
  // Machado — ferramenta (kind: 'tool' em equipmentDefs.js), não arma: sem
  // golpe de ataque, mesmo caso da vara de pescar acima.
  machado: {
    down: { idle: ['weapon-axe-front'], walk: ['weapon-axe-front'] },
    up: { idle: ['weapon-axe-back'], walk: ['weapon-axe-back'] },
    right: { idle: ['weapon-axe-side'], idleFlip: false, walk: ['weapon-axe-side'], walkFlip: false },
    left: { idle: ['weapon-axe-side'], idleFlip: true, walk: ['weapon-axe-side'], walkFlip: true },
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

// PLACEHOLDER na mesma linha da espada acima, mesmo ponto de cintura
// (rod-front/back/side usam os MESMOS anchors de weapon-sword-*): cabo e
// carretilha ficam acima da cintura (altura da mão), vareta pendura pra
// BAIXO ao lado da perna. Primeira versão segurava a vara quase reta pra
// CIMA — ficava sobre o cabelo escuro do personagem e sumia por falta de
// contraste (mesmo problema de raiz que a espada tinha antes de virar pra
// baixo). Resolvido do mesmo jeito: pendurada, não erguida.
export function generatePlaceholderRodTextures(scene) {
  drawPlaceholderRod(scene, 'rod-front', 19, 19, -8);
  drawPlaceholderRod(scene, 'rod-back', 12, 18, -8);
  drawPlaceholderRod(scene, 'rod-side', 18, 19, -4);
}

// PLACEHOLDER — mesmos anchors de cintura/mão da espada e da vara (ver
// comentário de generatePlaceholderWeaponTextures acima), mas empunhado
// ERGUIDO ao lado do corpo (não pendurado como a espada) — um arco vai na
// mão, não na bainha. Arco simples: madeira curva + corda reta + grip no
// meio, sem ângulo de rotação (fica vertical, do jeito que se segura).
export function generatePlaceholderBowTextures(scene) {
  drawPlaceholderBow(scene, 'weapon-bow-front', 19, 19);
  drawPlaceholderBow(scene, 'weapon-bow-back', 12, 18);
  drawPlaceholderBow(scene, 'weapon-bow-side', 18, 19);
}

// PLACEHOLDER — mesma lógica de pendurar na cintura da espada (ponta pra
// baixo, acompanha a perna), só que com cabeça de machado (lâmina larga de
// um lado só) em vez de lâmina reta dos dois lados.
export function generatePlaceholderAxeTextures(scene) {
  drawPlaceholderAxe(scene, 'weapon-axe-front', 19, 19, 20);
  drawPlaceholderAxe(scene, 'weapon-axe-back', 12, 18, 20);
  drawPlaceholderAxe(scene, 'weapon-axe-side', 18, 19, 15);
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

  // Cabo de cortiça (acima da cintura, altura da mão)
  ctx.fillStyle = '#3b2415';
  ctx.fillRect(-1, -4, 2, 4);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(-1, -4, 2, 4);

  // Carretilha — pequena, senão vira uma bola preta dominando o desenho
  ctx.beginPath();
  ctx.arc(1.6, -2.5, 1.2, 0, Math.PI * 2);
  ctx.fillStyle = '#3a3a3e';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#96969c';
  ctx.fillRect(1.1, -3, 1, 1); // brilho

  // Vareta afunilada pendurada (grossa no cabo, fina na ponta) — contorno
  // preto, senão some contra o cabelo escuro do personagem
  ctx.beginPath();
  ctx.moveTo(-1, 0);
  ctx.lineTo(1, 0);
  ctx.lineTo(0.5, 9);
  ctx.lineTo(-0.5, 9);
  ctx.closePath();
  ctx.fillStyle = '#a8703e';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#785029'; // sombra
  ctx.beginPath();
  ctx.moveTo(-0.5, 1);
  ctx.lineTo(-0.2, 8);
  ctx.stroke();
  ctx.strokeStyle = '#cc9c64'; // friso de luz
  ctx.beginPath();
  ctx.moveTo(0.5, 1);
  ctx.lineTo(0.2, 8);
  ctx.stroke();

  // Linha de pesca escapando da ponta
  ctx.strokeStyle = '#e6e0d0';
  ctx.beginPath();
  ctx.moveTo(0, 9);
  ctx.lineTo(-2.2, 13);
  ctx.stroke();

  ctx.restore();

  scene.textures.addCanvas(key, canvas);
}

function drawPlaceholderBow(scene, key, gripX, gripY) {
  const size = PLACEHOLDER_CANVAS_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(gripX, gripY);

  // Madeira curva do arco — barriga arredondada pro lado direito (fora do
  // corpo), pontas em cima e embaixo na altura de ombro/quadril.
  ctx.strokeStyle = '#8a5a2e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(1, -8);
  ctx.quadraticCurveTo(4.5, 0, 1, 8);
  ctx.stroke();

  // Corda esticada, reta, mais perto do corpo que a madeira
  ctx.strokeStyle = '#e6e0d0';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(1, -8);
  ctx.lineTo(1, 8);
  ctx.stroke();

  // Empunhadura no meio do arco
  ctx.fillStyle = '#4a2c17';
  ctx.fillRect(0, -1.5, 2, 3);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.4;
  ctx.strokeRect(0, -1.5, 2, 3);

  ctx.restore();
  scene.textures.addCanvas(key, canvas);
}

function drawPlaceholderAxe(scene, key, hiltX, hiltY, angleDeg) {
  const size = PLACEHOLDER_CANVAS_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(hiltX, hiltY);
  ctx.rotate(Phaser.Math.DegToRad(angleDeg));

  // Cabo de madeira pendurado na cintura — mesma orientação (ponta pra
  // baixo) da espada.
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(-1, -2, 2, 9);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.4;
  ctx.strokeRect(-1, -2, 2, 9);

  // Cabeça do machado — lâmina larga de um lado só (silhueta legível de
  // machado, não espelhada como um bipene de batalha).
  ctx.fillStyle = '#9aa0ab';
  ctx.beginPath();
  ctx.moveTo(1, -4);
  ctx.lineTo(5, -3);
  ctx.lineTo(5, 1);
  ctx.lineTo(1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a5e68';
  ctx.lineWidth = 0.5;
  ctx.stroke();
  ctx.fillStyle = '#ced2da'; // friso/brilho
  ctx.fillRect(4, -3, 1, 4);

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
  // Silhueta legível de espada: pomo, guarda mais larga que o cabo (marca
  // a "cruz") e lâmina afunilada até uma ponta. Cores agora são as de
  // verdade (aço/latão/couro) em vez do magenta "impossível" de antes —
  // ainda é um placeholder (forma simples, sem arte desenhada à mão), mas
  // já lê como espada de longe, não só como um bloco colorido.
  ctx.fillStyle = '#8b6c27'; // pomo (latão escuro)
  ctx.fillRect(-1, -4, 2, 1);
  ctx.fillStyle = '#4a2c17'; // cabo (couro)
  ctx.fillRect(-1, -3, 2, 3);
  ctx.fillStyle = '#c49c3e'; // guarda (latão)
  ctx.fillRect(-3, 0, 6, 1);
  ctx.fillStyle = '#c4c8d1'; // lâmina (aço)
  ctx.beginPath();
  ctx.moveTo(-1, 1);
  ctx.lineTo(1, 1);
  ctx.lineTo(1, 6);
  ctx.lineTo(0, 8);
  ctx.lineTo(-1, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#787e8a'; // sombra na lâmina (dá volume)
  ctx.fillRect(-1, 1, 1, 5);
  ctx.fillStyle = '#eef1f5'; // friso/brilho na lâmina
  ctx.fillRect(0, 1, 1, 5);
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
    runTimer: 0,
    runFrameIndex: 0,
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
  state.runTimer = 0;
  state.runFrameIndex = 0;
  state.idleTimer = 0;
  state.idleFrameIndex = 0;
  state.attackTimer = 0;
  state.attackFrameIndex = 0;
}

export function unequipLayer(state) {
  state.equippedLayerId = null;
}

const FRAME_MS_BY_MODE = { idle: IDLE_FRAME_MS, walk: WALK_FRAME_MS, run: RUN_FRAME_MS, attack: ATTACK_FRAME_MS };
const TIMER_KEY_BY_MODE = { idle: 'idleTimer', walk: 'walkTimer', run: 'runTimer', attack: 'attackTimer' };
const INDEX_KEY_BY_MODE = { idle: 'idleFrameIndex', walk: 'walkFrameIndex', run: 'runFrameIndex', attack: 'attackFrameIndex' };
const ALL_MODES = ['idle', 'walk', 'run', 'attack'];

// Atualiza textura/frame da camada e sincroniza sua posição/escala/
// profundidade com o sprite do corpo — é essa sincronia que faz a camada
// "grudar" no personagem em vez de precisar de coordenadas calculadas por
// direção. `mode` é 'idle' | 'walk' | 'attack', igual em character.js.
export function updateLayerVisual(layerSprite, state, bodySprite, delta, mode, facing) {
  // Os frames de golpe do CORPO (gerados via PixelLab, ver races.js) já
  // vêm com a espada desenhada na mão — mostrar a camada de equipamento
  // (espada "embainhada" no quadril) por cima duplicaria a arma durante o
  // golpe. Some ela só nesse modo; idle/walk continuam mostrando a camada
  // normalmente.
  if (mode === 'attack' && state.equippedLayerId === 'sword') {
    layerSprite.setVisible(false);
    return;
  }

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
