import Phaser from 'phaser';
import {
  PLAYER_MAX_HP,
  PLAYER_SPEED,
  SHADOW_OFFSET_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '../config.js';
import { createAnimationState, createPlayerCharacter, preloadCharacterAssets, updateCharacterVisual } from '../character/character.js';
import {
  createLayerSprite,
  createLayerState,
  equipLayer,
  generatePlaceholderRodTextures,
  generatePlaceholderWeaponTextures,
  unequipLayer,
  updateLayerVisual,
} from '../character/layers.js';
import { isEditorModeActive, panEditorCamera, setupEditor } from '../editor/editorMode.js';
import { buildVillageProps, preloadVillageAssets, VILLAGE_PROPS } from '../world/propRegistry.js';
import { buildGround, buildPierDock, buildWaterCollision, isNearWater, isWaterPoint, preloadGroundAssets } from '../world/ground.js';
import { spawnItemText, spawnLevelUpText, spawnMissText, spawnMoneyText } from '../world/floatingText.js';
import { createHealth } from '../sim/health.js';
import { createProgression, trainSkill } from '../sim/progression.js';
import { createInventory, addItem, removeItem } from '../sim/inventory.js';
import { ITEM_DEFS } from '../sim/itemDefs.js';
import { RECIPES, craft } from '../sim/crafting.js';
import {
  CAST_DEFAULT_DIST,
  CAST_DEFAULT_QUALITY,
  CAST_MAX_RANGE,
  MAX_WAIT_TICKS,
  computeCastQuality,
  getBestBait,
  getBiteChance,
  getReactionWindowMs,
} from '../sim/fishing.js';
import { bindMenuButtons, initHud, setBerries, setHp } from '../ui/hud.js';
import { isMenuOpen } from '../ui/menuManager.js';
import { toggleCharacterMenu } from '../ui/characterMenu.js';
import { toggleInventoryMenu } from '../ui/inventoryMenu.js';
import { toggleMapMenu } from '../ui/mapMenu.js';
import { findStatMeta } from '../ui/menuData.js';
import { cancelFishingAttempt, isFishingActive, releaseFishingAttempt, startFishingAttempt } from '../ui/fishingHud.js';
import { showBlocked } from '../ui/blockToast.js';
import { showLevelUp, showTrainingProgress } from '../ui/progressChip.js';
import { playBiteJitter, playCast, playReelResult, resetRod } from '../character/fishingAnimation.js';

let player; // Sprite com física — a posição/colisão "de verdade"
let shadow; // elipse sob os pés, sincronizada com o player todo frame
let weaponSprite; // camada de arma/ferramenta, sincronizada com o player todo frame (ver layers.js)
let cursors;
let wasd;
let facing = 'down'; // 'up' | 'down' | 'left' | 'right'
let animState;
let equipState;
let playerHealth;
let progression; // atributos/perícias — ver sim/progression.js
let inventory; // itens de verdade — ver sim/inventory.js
let berries = 0; // primeira fonte de renda real é pesca — ver keydown-F em create()

const FISH_REWARD = 8; // Berries por peixe fisgado — valor de referência, fácil de reequilibrar

// Árvores da vila servem de ponto de coleta de graveto — ver handleGather().
// Reaproveita as posições já cadastradas em propRegistry.js em vez de ter
// uma segunda lista de "onde tem árvore" pra manter sincronizada na mão.
const TREE_KEYS = ['village-tree-ancient', 'village-tree-small', 'village-tree-stump'];
const GATHER_TREE_RANGE = 90; // pixels
const GATHER_COOLDOWN_MS = 2500;
const MINHOCA_SUCCESS_CHANCE = 0.7;
let treePositions = [];
let lastGatherAt = -Infinity;
let lastGatherBlockHintAt = -Infinity;
let lastFishBlockHintAt = -Infinity;
const BLOCK_HINT_COOLDOWN_MS = 1500; // evita reiniciar a animação do aviso a cada repetição de tecla segurada

export function preload() {
  preloadGroundAssets(this);
  preloadCharacterAssets(this);
  preloadVillageAssets(this);
}

export function create() {
  initHud();
  buildGround(this);

  // Na praia, na frente do caminho descendo da praça.
  ({ player, shadow } = createPlayerCharacter(this, 1280, 1517));
  animState = createAnimationState();
  playerHealth = createHealth(PLAYER_MAX_HP);
  progression = createProgression();
  // Linha de nylon de graça, como ponte temporária até existir comércio de
  // verdade (ver conversa de design) — sem ela a receita da vara nunca
  // completa e o jogador trava antes mesmo de começar a pescar.
  inventory = createInventory({ 'linha-de-nylon': 2 });
  setHp(playerHealth.current, playerHealth.max);
  setBerries(berries);

  // Camada de equipamento (arma/ferramenta) — ver EQUIPMENT_ASSETS_TODO.md
  // pro plano de trocar os placeholders pela arte de verdade.
  generatePlaceholderWeaponTextures(this);
  generatePlaceholderRodTextures(this);
  weaponSprite = createLayerSprite(this, 'weapon-sword-front');
  equipState = createLayerState();
  equipLayer(equipState, 'sword'); // equipada por padrão só pra já dar pra ver funcionando
  this.input.keyboard.on('keydown-Q', () => {
    // Sem essa trava, Q desequipava a vara no meio de uma pescaria em
    // andamento (ou por trás de um menu aberto) — a animação continuava
    // rodando com a linha "largada sem dono" (ver auditoria de bugs).
    if (isEditorModeActive() || isMenuOpen() || isFishingActive()) return;
    equipState.equippedLayerId ? unequipLayer(equipState) : equipLayer(equipState, 'sword');
  });

  treePositions = VILLAGE_PROPS.filter((p) => TREE_KEYS.includes(p.key)).map((p) => ({ x: p.x, y: p.y }));

  // Menus (Personagem/Inventário/Mapa) — ver ui/menuManager.js. Não abrem
  // no editor nem com uma pescaria em andamento, pra não empilhar estado de
  // UI incompatível. Funções nomeadas (em vez de inline) porque agora têm
  // DOIS jeitos de chamar a mesma coisa: atalho de teclado e o botão
  // clicável do HUD (ver bindMenuButtons logo abaixo).
  const openCharacterMenu = () => {
    if (isEditorModeActive() || isFishingActive()) return;
    toggleCharacterMenu(progression);
  };
  const openInventoryMenu = () => {
    if (isEditorModeActive() || isFishingActive()) return;
    toggleInventoryMenu({ inventory, equipState, onEquip: handleEquip, onCraft: handleCraft });
  };
  const openMapMenu = () => {
    if (isEditorModeActive() || isFishingActive()) return;
    toggleMapMenu();
  };
  this.input.keyboard.on('keydown-C', openCharacterMenu);
  this.input.keyboard.on('keydown-I', openInventoryMenu);
  this.input.keyboard.on('keydown-M', openMapMenu);
  bindMenuButtons({ onPersonagem: openCharacterMenu, onInventario: openInventoryMenu, onMapa: openMapMenu });

  // Coleta — G é a tecla de "interagir com o que tem por perto" (E já é o
  // atalho do modo editor, ver editor/editorMode.js — os dois listeners
  // dispararIAM juntos se usássemos a mesma tecla). Contexto decide o verbo
  // (ver handleGather): grudado numa árvore = graveto, na beira d'água =
  // isca improvisada, em qualquer outro chão = caçar minhoca.
  this.input.keyboard.on('keydown-G', () => {
    if (isEditorModeActive() || isMenuOpen() || isFishingActive()) return;
    handleGather(this);
  });

  // Pesca — primeira fonte de renda real do jogo (ver conversa de design:
  // combate deveria ser raro, o dinheiro vem de trabalho/ofício, não de
  // matar). Segurar F (ou clicar na água e segurar) joga a vara; soltar
  // puxa — ver sim/fishing.js pras fórmulas e ui/fishingHud.js pro
  // minigame de duas fases (espera + mordida).
  this.input.keyboard.on('keydown-F', () => {
    if (isEditorModeActive() || isMenuOpen() || isFishingActive()) return;
    tryStartFishing(this, null);
  });
  this.input.keyboard.on('keyup-F', () => {
    if (isFishingActive()) releaseFishingAttempt();
  });
  this.input.on('pointerdown', (pointer) => {
    if (isEditorModeActive() || isMenuOpen() || isFishingActive()) return;
    tryStartFishing(this, { x: pointer.worldX, y: pointer.worldY });
  });
  this.input.on('pointerup', () => {
    if (isFishingActive()) releaseFishingAttempt();
  });

  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Câmera menor que o mundo, seguindo o personagem, sem sair da borda do
  // mapa. O Scale Manager (modo RESIZE) já redimensiona essa câmera sozinho
  // quando a janela muda de tamanho — não precisamos fazer isso na mão.
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  this.cameras.main.startFollow(player, true, 0.1, 0.1);

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys('W,A,S,D');

  buildVillageProps(this, player);
  buildPierDock(this);
  buildWaterCollision(this, player);
  setupEditor(this, player);

  // Se a cena for destruída com uma pescaria em andamento (recarregar em
  // dev, futura troca de cena), encerra o timer em vez de deixar rodando
  // sozinho sem ninguém pra receber o resultado.
  this.events.once('shutdown', () => {
    cancelFishingAttempt();
    resetRod(weaponSprite);
  });

  this.add
    .text(12, window.innerHeight - 34, 'Q: equipar/desequipar arma   G: coletar   F: pescar (segure e solte)', {
      font: '13px monospace',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    })
    .setScrollFactor(0)
    .setDepth(9999);

  // Ganchos de depuração só em dev (o build de produção elimina este bloco
  // inteiro) — pra inspecionar o estado do jogo pelo console.
  if (import.meta.env.DEV) {
    window.__gameDebug = {
      getState: () => ({
        playerHealth,
        player: { x: player.x, y: player.y },
        berries,
        progression,
        inventory,
        equipState,
      }),
      // Pra testar a animação de pesca sem precisar chegar perto d'água de
      // verdade (ver character/fishingAnimation.js).
      playCastAnim: () => playCast(this, weaponSprite),
      playBiteAnim: () => playBiteJitter(this, weaponSprite),
      playResultAnim: (outcome) => playReelResult(this, weaponSprite, outcome),
      getRodRotationDeg: () => Phaser.Math.RadToDeg(weaponSprite.rotation),
      // Força um estado de "pescando" sem precisar estar perto d'água —
      // só pra testar travas (Q/E) contra isFishingActive() sem depender
      // de movimento de verdade.
      forceStartFishing: () => startFishingAttempt({ biteChance: 0, reactionMs: 500, maxWaitTicks: 999, onResult: () => {} }),
      isFishingActive: () => isFishingActive(),
      isEditorModeActive: () => isEditorModeActive(),
      getFacing: () => facing,
      tryStartFishing: (point) => tryStartFishing(this, point),
      // Teleporta o jogador pra testar coisas que dependem de posição
      // (perto d'água, perto de árvore) sem depender de simulação de
      // movimento via teclado, que é pouco confiável em automação.
      setPlayerPos: (x, y) => {
        player.body.reset(x, y);
        shadow.setPosition(x, y + SHADOW_OFFSET_Y);
      },
    };
  }
}

// ============================================================================
// COLETA — graveto (árvore), isca improvisada (beira d'água) e minhoca
// (caça, em qualquer outro chão) alimentam a receita da vara e a pesca em
// si. Uma tecla só (G), contexto decide o verbo — ver comentário no
// keydown-G acima.
// ============================================================================

// Treina uma perícia E acende o chip de progressão (ver ui/progressChip.js)
// — helper só pra não repetir "acha o ícone/nome e decide se foi treino
// normal ou subiu de nível" nos dois lugares que já treinam algo (pesca,
// caça). O texto flutuante de "subiu de nível" continua por conta de quem
// chamou — o chip é o complemento persistente, não substitui o flutuante.
function trainAndNotify(key) {
  const result = trainSkill(progression, key);
  const meta = findStatMeta(key);
  if (meta) {
    if (result.leveledUp) showLevelUp(meta);
    else showTrainingProgress(meta, progression.skills[key]);
  }
  return result;
}

function itemLabel(itemId, qty) {
  const def = ITEM_DEFS[itemId];
  return `${def.icon} +${qty} ${def.name}`;
}

function handleGather(scene) {
  const now = scene.time.now;
  if (now - lastGatherAt < GATHER_COOLDOWN_MS) {
    if (now - lastGatherBlockHintAt >= BLOCK_HINT_COOLDOWN_MS) {
      lastGatherBlockHintAt = now;
      showBlocked('sobrevivencia', 'Ainda recuperando fôlego da coleta.');
    }
    return;
  }
  lastGatherAt = now;

  const nearTree = treePositions.some((t) => Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= GATHER_TREE_RANGE);
  if (nearTree) {
    addItem(inventory, 'graveto', 1);
    spawnItemText(scene, player.x, player.y - 60, itemLabel('graveto', 1));
    return;
  }

  if (isNearWater(scene, player.x, player.y)) {
    addItem(inventory, 'isca-improvisada', 1);
    spawnItemText(scene, player.x, player.y - 60, itemLabel('isca-improvisada', 1));
    return;
  }

  if (Math.random() < MINHOCA_SUCCESS_CHANCE) {
    addItem(inventory, 'minhoca', 1);
    spawnItemText(scene, player.x, player.y - 60, itemLabel('minhoca', 1));
    const skillResult = trainAndNotify('caca');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 76, 'Caça');
  } else {
    spawnMissText(scene, player.x, player.y - 60, 'Não achou nada pra caçar.');
  }
}

// ============================================================================
// EQUIPAR / FABRICAR — chamados pelo Inventário (ver ui/inventoryMenu.js);
// este módulo só sabe fazer, quem monta a UI e delega de volta é lá.
// ============================================================================

function handleEquip(itemId) {
  const def = ITEM_DEFS[itemId];
  if (!def || !def.equipLayerId) return;
  if (equipState.equippedLayerId === def.equipLayerId) {
    unequipLayer(equipState);
  } else {
    equipLayer(equipState, def.equipLayerId);
  }
}

function handleCraft(recipeId) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;
  return craft(inventory, recipe);
}

// ============================================================================
// PESCA — arremesso (mira/qualidade) + espera/mordida (ver sim/fishing.js
// pras fórmulas e ui/fishingHud.js pro minigame). `targetPoint` é o clique
// n'água, ou null se foi F sem mirar (arremesso reto, qualidade fixa).
// ============================================================================

function facingVector(dir) {
  if (dir === 'up') return { x: 0, y: -1 };
  if (dir === 'left') return { x: -1, y: 0 };
  if (dir === 'right') return { x: 1, y: 0 };
  return { x: 0, y: 1 }; // 'down'
}

function tryStartFishing(scene, targetPoint) {
  if (equipState.equippedLayerId !== 'vara-de-pescar') {
    const now = scene.time.now;
    if (now - lastFishBlockHintAt >= BLOCK_HINT_COOLDOWN_MS) {
      lastFishBlockHintAt = now;
      showBlocked('pesca', 'Você precisa de uma vara equipada.');
    }
    return;
  }
  if (!isNearWater(scene, player.x, player.y)) {
    const now = scene.time.now;
    if (now - lastFishBlockHintAt >= BLOCK_HINT_COOLDOWN_MS) {
      lastFishBlockHintAt = now;
      showBlocked('pesca', 'Muito longe da água pra pescar.');
    }
    return;
  }

  let target;
  let castQuality;
  if (targetPoint) {
    const dx = targetPoint.x - player.x;
    const dy = targetPoint.y - player.y;
    // Vira o personagem (e a vara) pro lado do clique — sem isso o arremesso
    // ia sempre visualmente pra direção que o personagem já estava olhando
    // antes de pescar, mesmo mirando pro lado oposto na água.
    facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

    const dist = Phaser.Math.Distance.Between(player.x, player.y, targetPoint.x, targetPoint.y);
    const clampedDist = Math.min(dist, CAST_MAX_RANGE);
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetPoint.x, targetPoint.y);
    target = { x: player.x + Math.cos(angle) * clampedDist, y: player.y + Math.sin(angle) * clampedDist };
    castQuality = computeCastQuality(clampedDist);
  } else {
    const dir = facingVector(facing);
    target = { x: player.x + dir.x * CAST_DEFAULT_DIST, y: player.y + dir.y * CAST_DEFAULT_DIST };
    castQuality = CAST_DEFAULT_QUALITY;
  }

  if (!isWaterPoint(scene, target.x, target.y)) {
    spawnMissText(scene, player.x, player.y - 60, 'Aí não tem água pra pescar.');
    return;
  }

  const baitId = getBestBait(inventory);
  playCast(scene, weaponSprite);
  startFishingAttempt({
    biteChance: getBiteChance(baitId),
    reactionMs: getReactionWindowMs(castQuality),
    maxWaitTicks: MAX_WAIT_TICKS,
    onBite: () => playBiteJitter(scene, weaponSprite),
    onResult: (outcome) => handleFishingResult(scene, outcome, baitId),
  });
}

function handleFishingResult(scene, outcome, baitId) {
  playReelResult(scene, weaponSprite, outcome);

  // Isca só se perde se um peixe chegou a morder (sucesso ou escapou) —
  // "nada mordeu"/"cedo demais" significam que ela ainda está no anzol.
  if (baitId && (outcome === 'sucesso' || outcome === 'escapou')) {
    removeItem(inventory, baitId, 1);
  }

  if (outcome === 'sucesso') {
    berries += FISH_REWARD;
    setBerries(berries);
    spawnMoneyText(scene, player.x, player.y - 60, FISH_REWARD);
    const skillResult = trainAndNotify('pesca');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 76, 'Pesca');
    return;
  }

  const message = {
    escapou: 'O peixe escapou...',
    'nada-mordeu': 'Nada mordeu a isca.',
    'cedo-demais': 'Você puxou cedo demais.',
  }[outcome];
  spawnMissText(scene, player.x, player.y - 60, message ?? 'Nada aconteceu.');
}

export function update(time, delta) {
  if (isMenuOpen()) {
    // Personagem/Inventário abertos — mundo congela, sem nenhuma UI de
    // Phaser própria (ver ui/menuManager.js).
    player.body.setVelocity(0, 0);
    updateCharacterVisual(player, animState, delta, 'idle', facing);
    updateLayerVisual(weaponSprite, equipState, player, delta, 'idle', facing);
    return;
  }

  if (isFishingActive()) {
    // Parado olhando a água enquanto a barra de reação roda — ver keydown-F.
    player.body.setVelocity(0, 0);
    updateCharacterVisual(player, animState, delta, 'idle', facing);
    updateLayerVisual(weaponSprite, equipState, player, delta, 'idle', facing);
    return;
  }

  if (isEditorModeActive()) {
    player.body.setVelocity(0, 0);
    updateCharacterVisual(player, animState, delta, 'idle', facing);
    updateLayerVisual(weaponSprite, equipState, player, delta, 'idle', facing);
    panEditorCamera(this, delta, cursors, wasd);
    return;
  }

  const left = cursors.left.isDown || wasd.A.isDown;
  const right = cursors.right.isDown || wasd.D.isDown;
  const up = cursors.up.isDown || wasd.W.isDown;
  const down = cursors.down.isDown || wasd.S.isDown;

  let vx = 0;
  let vy = 0;
  if (left) vx -= 1;
  if (right) vx += 1;
  if (up) vy -= 1;
  if (down) vy += 1;

  // Normaliza diagonal pra não andar mais rápido na diagonal
  if (vx !== 0 && vy !== 0) {
    const norm = Math.SQRT1_2;
    vx *= norm;
    vy *= norm;
  }

  player.body.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
  shadow.setPosition(player.x, player.y + SHADOW_OFFSET_Y);

  // Y-sorting: quem estiver mais "embaixo" na tela desenha por cima.
  // Comparamos pela posição dos PÉS (player.y + offset), não pelo centro
  // do sprite — os props da vila usam pivô nos pés, então essa é a
  // régua comum entre os dois. Comparar centro-com-pé é o que causava o
  // personagem "afundando" nos objetos antes.
  const feetY = player.y + SHADOW_OFFSET_Y;
  player.setDepth(feetY);
  shadow.setDepth(feetY - 1);

  const isMoving = vx !== 0 || vy !== 0;
  if (isMoving) {
    if (Math.abs(vx) > Math.abs(vy)) {
      facing = vx > 0 ? 'right' : 'left';
    } else {
      facing = vy > 0 ? 'down' : 'up';
    }
  }

  updateCharacterVisual(player, animState, delta, isMoving ? 'walk' : 'idle', facing);
  updateLayerVisual(weaponSprite, equipState, player, delta, isMoving ? 'walk' : 'idle', facing);
}
