import Phaser from 'phaser';
import {
  ATTACK_DURATION_MS,
  COMBAT_ATTACK_DAMAGE,
  COMBAT_ATTACK_RANGE,
  COMBAT_MOVE_RANGE,
  ENCOUNTER_TRIGGER_RANGE,
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
  generatePlaceholderWeaponTextures,
  unequipLayer,
  updateLayerVisual,
} from '../character/layers.js';
import { isEditorModeActive, panEditorCamera, setupEditor } from '../editor/editorMode.js';
import { buildVillageProps, preloadVillageAssets } from '../world/propRegistry.js';
import { buildGround, buildWaterCollision, preloadGroundAssets } from '../world/ground.js';
import { createEnemy, damageEnemy, generatePlaceholderEnemyTexture, updateEnemy } from '../world/enemy.js';
import { spawnFloatingDamage, spawnLevelUpText } from '../world/floatingText.js';
import { createTileHighlight, clearTileHighlight, drawTileHighlight, isTileBlocked } from '../world/combatGrid.js';
import { reachableTiles, tileDistance, tileToWorld, worldToTile } from '../sim/grid.js';
import { createEncounterState, endEncounter, passTurn, startEncounter } from '../sim/encounter.js';
import { applyDamage, createHealth, isDead, resetHealth } from '../sim/health.js';
import { createProgression, getForcaDamageBonus, getVitalidadeMaxHpBonus, trainAttribute, trainSkill } from '../sim/progression.js';
import { initHud, setBerries, setHp } from '../ui/hud.js';
import { isMenuOpen } from '../ui/menuManager.js';
import { toggleCharacterMenu } from '../ui/characterMenu.js';
import { toggleInventoryMenu } from '../ui/inventoryMenu.js';
import { toggleMapMenu } from '../ui/mapMenu.js';
import { hideCombatHud, onEndTurnClick, setCombatMessage, setCombatTurn, showCombatHud } from '../ui/combatHud.js';
import { createHpBar, setHpBarPosition, setHpBarVisible, updateHpBar } from '../world/hpBar.js';

let player; // Sprite com física — a posição/colisão "de verdade"
let shadow; // elipse sob os pés, sincronizada com o player todo frame
let weaponSprite; // camada de arma, sincronizada com o player todo frame (ver layers.js)
let cursors;
let wasd;
let facing = 'down'; // 'up' | 'down' | 'left' | 'right'
let animState;
let equipState;
let isAttacking = false;
let attackTimer = 0; // ms restantes do modo 'attack' antes de voltar pra idle/walk
let enemy;
let playerHealth;
let encounterState;
let combatHighlight; // Graphics com os tiles verdes de alcance de movimento
let lastReachableTiles = []; // último cálculo, usado pra validar o clique de movimento
let playerHpBar; // só visível durante combate — fora dele a vida mora no HUD do canto (ver ui/hud.js)
let progression; // atributos/perícias — ver sim/progression.js

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
  refreshPlayerHpText();
  setBerries(0); // sem economia ainda — só deixa o HUD pronto pra quando existir

  // Camada de equipamento (arma) — ver EQUIPMENT_ASSETS_TODO.md pro plano de
  // trocar o placeholder roxo pela arte de verdade.
  generatePlaceholderWeaponTextures(this);
  weaponSprite = createLayerSprite(this, 'weapon-sword-front');
  equipState = createLayerState();
  equipLayer(equipState, 'sword'); // equipada por padrão só pra já dar pra ver funcionando
  this.input.keyboard.on('keydown-Q', () => {
    equipState.equippedLayerId ? unequipLayer(equipState) : equipLayer(equipState, 'sword');
  });

  // Menus (Personagem/Inventário) — ver ui/menuManager.js. Não abrem durante
  // combate nem no editor, pra não empilhar estado de UI incompatível.
  this.input.keyboard.on('keydown-C', () => {
    if (isEditorModeActive() || encounterState.active) return;
    toggleCharacterMenu(progression);
  });
  this.input.keyboard.on('keydown-I', () => {
    if (isEditorModeActive() || encounterState.active) return;
    toggleInventoryMenu(equipState);
  });
  this.input.keyboard.on('keydown-M', () => {
    if (isEditorModeActive() || encounterState.active) return;
    toggleMapMenu();
  });

  // Barra de vida ancorada no personagem — só aparece durante combate (ver
  // tryStartEncounter/winEncounter/loseEncounter). Fora de combate a vida já
  // está sempre visível no HUD do canto, então mostrar aqui também seria
  // redundante.
  playerHpBar = createHpBar(this, player.x, player.y - 70, 'Você');
  setHpBarVisible(playerHpBar, false);

  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Câmera menor que o mundo, seguindo o personagem, sem sair da borda do
  // mapa. O Scale Manager (modo RESIZE) já redimensiona essa câmera sozinho
  // quando a janela muda de tamanho — não precisamos fazer isso na mão.
  this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  this.cameras.main.startFollow(player, true, 0.1, 0.1);

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys('W,A,S,D');

  buildVillageProps(this, player);
  buildWaterCollision(this, player);
  setupEditor(this, player);

  // Boneco de treino — ver EQUIPMENT_ASSETS_TODO.md sobre o mesmo tipo de
  // placeholder já usado pra arma. Perto do spawn do jogador, na areia.
  generatePlaceholderEnemyTexture(this);
  enemy = createEnemy(this, 1430, 1467);
  this.physics.add.collider(player, enemy.sprite);

  setupCombatUI(this);
  encounterState = createEncounterState();
  combatHighlight = createTileHighlight(this);

  this.input.keyboard.on('keydown-SPACE', () => tryStartEncounter(this));
  this.input.on('pointerdown', (pointer) => handleCombatClick(this, pointer));

  this.add
    .text(12, window.innerHeight - 34, 'ESPAÇO perto do inimigo: entrar em combate   Q: equipar/desequipar arma', {
      font: '13px monospace',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 4 },
    })
    .setScrollFactor(0)
    .setDepth(9999);

  // Ganchos de depuração só em dev (o build de produção elimina este bloco
  // inteiro) — pra inspecionar/disparar o combate pelo console sem precisar
  // acertar coordenada de clique na tela.
  if (import.meta.env.DEV) {
    window.__combatDebug = {
      getState: () => ({
        encounterState,
        reachableTiles: lastReachableTiles,
        playerHealth,
        enemyHealth: enemy.health,
        player: { x: player.x, y: player.y },
        enemy: { x: enemy.sprite.x, y: enemy.sprite.y },
      }),
      clickWorld: (x, y) => handleCombatClick(this, { worldX: x, worldY: y }),
      startEncounter: () => tryStartEncounter(this),
    };
  }
}

function setupCombatUI(scene) {
  onEndTurnClick(() => {
    if (encounterState.active && encounterState.turn === 'player') endPlayerTurn(scene);
  });
}

function refreshPlayerHpText() {
  setHp(playerHealth.current, playerHealth.max);
  if (playerHpBar) updateHpBar(playerHpBar, playerHealth.current, playerHealth.max);
}

// ============================================================================
// COMBATE POR TURNOS — estilo tático (grade só existe enquanto a luta dura).
// Fora de combate o mundo é 100% movimento livre; ver update() lá embaixo
// pra onde a exploração normal fica suspensa enquanto isso está ativo.
// ============================================================================

function isMoveBlockedForCombat(scene, col, row, ignoreBody) {
  const world = tileToWorld(col, row);
  const outOfBounds = col < 0 || row < 0 || world.x >= WORLD_WIDTH || world.y >= WORLD_HEIGHT;
  if (outOfBounds) return true;
  return isTileBlocked(scene, col, row, ignoreBody);
}

function snapToGrid(sprite) {
  const tile = worldToTile(sprite.x, sprite.y);
  const { x, y } = tileToWorld(tile.col, tile.row);
  if (sprite.body) sprite.body.reset(x, y);
  else sprite.setPosition(x, y);
  sprite.setDepth(y);
}

function tryStartEncounter(scene) {
  if (isEditorModeActive() || encounterState.active || enemy.respawnTimer > 0) return;
  const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.sprite.x, enemy.sprite.y);
  if (dist > ENCOUNTER_TRIGGER_RANGE) return;

  startEncounter(encounterState);
  player.body.setVelocity(0, 0);
  // Encaixa os dois na grade antes de começar — assim ela nunca fica
  // desalinhada com onde os sprites realmente estavam no mundo livre.
  snapToGrid(player);
  snapToGrid(enemy.sprite);
  showCombatHud();
  setHpBarVisible(playerHpBar, true);
  setHpBarPosition(playerHpBar, player.x, player.y - 70);
  beginPlayerTurn(scene);
}

function beginPlayerTurn(scene) {
  setCombatMessage('Seu turno — clique num tile verde pra andar, no boneco pra atacar');
  setCombatTurn('player');
  const playerTile = worldToTile(player.x, player.y);
  lastReachableTiles = reachableTiles(playerTile, COMBAT_MOVE_RANGE, (col, row) => isMoveBlockedForCombat(scene, col, row, player.body));
  drawTileHighlight(combatHighlight, lastReachableTiles, 0x22c55e);
}

function handleCombatClick(scene, pointer) {
  if (isEditorModeActive() || !encounterState.active || encounterState.turn !== 'player') return;

  const clickedTile = worldToTile(pointer.worldX, pointer.worldY);
  const enemyTile = worldToTile(enemy.sprite.x, enemy.sprite.y);
  const playerTile = worldToTile(player.x, player.y);

  if (clickedTile.col === enemyTile.col && clickedTile.row === enemyTile.row) {
    if (!encounterState.hasActed && tileDistance(playerTile, enemyTile) <= COMBAT_ATTACK_RANGE) {
      performPlayerAttack(scene);
    }
    return;
  }

  if (!encounterState.hasMoved) {
    const isReachable = lastReachableTiles.some((t) => t.col === clickedTile.col && t.row === clickedTile.row);
    if (isReachable) movePlayerToTile(scene, clickedTile);
  }
}

function movePlayerToTile(scene, tile) {
  const { x, y } = tileToWorld(tile.col, tile.row);
  player.body.reset(x, y);
  player.setDepth(y);
  shadow.setPosition(x, y + SHADOW_OFFSET_Y);
  shadow.setDepth(y - 1);
  setHpBarPosition(playerHpBar, x, y - 70);
  encounterState.hasMoved = true;
  clearTileHighlight(combatHighlight);
}

// Treino real de verdade: espada equipada treina Espadas, sem nada
// equipado treina Luta — os dois também treinam um pouco de Força, já que
// golpear (com ou sem arma) exercita o corpo do mesmo jeito. Ver
// sim/progression.js pro porquê disso ser a única perícia/atributo que já
// sobe de verdade hoje.
function performPlayerAttack(scene) {
  encounterState.hasActed = true;
  isAttacking = true;
  attackTimer = ATTACK_DURATION_MS;
  swingWeapon(scene); // tween cosmético da arma, roda em cima da animação por frame

  const skillKey = equipState.equippedLayerId === 'sword' ? 'espada' : 'luta';
  const skillResult = trainSkill(progression, skillKey);
  const forcaResult = trainAttribute(progression, 'forca');
  if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 90, skillKey === 'espada' ? 'Espadas' : 'Luta');
  if (forcaResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 106, 'Força');

  const damage = Math.round(COMBAT_ATTACK_DAMAGE + getForcaDamageBonus(progression));
  damageEnemy(scene, enemy, damage);
  endPlayerTurn(scene);
}

function endPlayerTurn(scene) {
  clearTileHighlight(combatHighlight);
  if (isDead(enemy.health)) {
    winEncounter(scene);
    return;
  }
  passTurn(encounterState); // agora é 'enemy'
  setCombatMessage('Turno do inimigo...');
  setCombatTurn('enemy');
  runEnemyTurn(scene);
}

function runEnemyTurn(scene) {
  const playerTile = worldToTile(player.x, player.y);
  const enemyTile = worldToTile(enemy.sprite.x, enemy.sprite.y);

  if (tileDistance(enemyTile, playerTile) <= COMBAT_ATTACK_RANGE) {
    applyDamage(playerHealth, COMBAT_ATTACK_DAMAGE);
    refreshPlayerHpText();
    spawnFloatingDamage(scene, player.x, player.y - 60, COMBAT_ATTACK_DAMAGE);
    player.setTintFill(0xffffff);
    scene.time.delayedCall(120, () => player.clearTint());

    if (isDead(playerHealth)) {
      loseEncounter(scene);
      return;
    }

    // Só treina Vitalidade se sobreviveu ao golpe — "aguentar e continuar
    // de pé" é a ação real por trás disso (ver sim/progression.js).
    const vitResult = trainAttribute(progression, 'vitalidade');
    if (vitResult.leveledUp) {
      const previousMax = playerHealth.max;
      playerHealth.max = PLAYER_MAX_HP + getVitalidadeMaxHpBonus(progression);
      playerHealth.current = Math.min(playerHealth.max, playerHealth.current + (playerHealth.max - previousMax));
      refreshPlayerHpText();
      spawnLevelUpText(scene, player.x, player.y - 90, 'Vitalidade');
    }
  } else {
    const step = reachableTiles(enemyTile, 1, (col, row) => isMoveBlockedForCombat(scene, col, row, enemy.sprite.body)).sort(
      (a, b) => tileDistance(a, playerTile) - tileDistance(b, playerTile)
    )[0];
    if (step) {
      const { x, y } = tileToWorld(step.col, step.row);
      enemy.sprite.body.reset(x, y);
      enemy.sprite.setDepth(y);
      // A barra de vida em si já é reposicionada todo frame em updateEnemy().
    }
  }

  passTurn(encounterState); // agora é 'player' de novo
  beginPlayerTurn(scene);
}

function winEncounter(scene) {
  endEncounter(encounterState);
  clearTileHighlight(combatHighlight);
  hideCombatHud();
  setHpBarVisible(playerHpBar, false);
  // damageEnemy() já cuidou de esconder o boneco e agendar o respawn dele.
}

// Sem penalidade de derrota de verdade ainda (sem game over/checkpoint) —
// só cura o jogador e devolve o controle. Decidir isso direito (voltar pro
// último ponto seguro? perder algo?) é trabalho pra quando tiver progressão
// de verdade em jogo.
function loseEncounter(scene) {
  endEncounter(encounterState);
  clearTileHighlight(combatHighlight);
  hideCombatHud();
  setHpBarVisible(playerHpBar, false);
  resetHealth(playerHealth);
  refreshPlayerHpText();
}

// Complemento cosmético do modo 'attack' (que já troca o frame/textura da
// arma via updateLayerVisual): gira a camada de arma rapidamente e volta.
// `updateLayerVisual` nunca mexe em `rotation`, só em
// posição/escala/textura/flip — por isso dá pra animar a rotação aqui sem
// conflitar com o que roda todo frame no update().
function swingWeapon(scene) {
  weaponSprite.rotation = Phaser.Math.DegToRad(-30);
  scene.tweens.add({
    targets: weaponSprite,
    rotation: Phaser.Math.DegToRad(50),
    duration: 140,
    yoyo: true,
    ease: 'Quad.out',
  });
}

// 'attack' tem prioridade sobre tudo — enquanto o timer não zera, o
// personagem mostra a animação de golpe mesmo se `isMoving` for true (o
// jogador não anda durante o próprio ataque, mas outros estados podem vir a
// se sobrepor no futuro, daí a prioridade explícita em vez de assumir).
function currentAnimMode(isMoving) {
  if (isAttacking) return 'attack';
  return isMoving ? 'walk' : 'idle';
}

export function update(time, delta) {
  updateEnemy(enemy, delta);

  if (isAttacking) {
    attackTimer -= delta;
    if (attackTimer <= 0) isAttacking = false;
  }

  if (isMenuOpen()) {
    // Personagem/Inventário abertos — mundo congela igual ao editor/combate,
    // só que sem nenhuma UI de Phaser própria (ver ui/menuManager.js).
    player.body.setVelocity(0, 0);
    updateCharacterVisual(player, animState, delta, currentAnimMode(false), facing);
    updateLayerVisual(weaponSprite, equipState, player, delta, currentAnimMode(false), facing);
    return;
  }

  if (isEditorModeActive()) {
    player.body.setVelocity(0, 0);
    updateCharacterVisual(player, animState, delta, currentAnimMode(false), facing);
    updateLayerVisual(weaponSprite, equipState, player, delta, currentAnimMode(false), facing);
    panEditorCamera(this, delta, cursors, wasd);
    return;
  }

  if (encounterState.active) {
    // Sem movimento livre durante o combate — tudo acontece por clique
    // (ver handleCombatClick). O personagem só fica parado, "respirando" —
    // ou atacando, se `isAttacking` estiver ativo (ver performPlayerAttack).
    player.body.setVelocity(0, 0);
    updateCharacterVisual(player, animState, delta, currentAnimMode(false), facing);
    updateLayerVisual(weaponSprite, equipState, player, delta, currentAnimMode(false), facing);
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

  updateCharacterVisual(player, animState, delta, currentAnimMode(isMoving), facing);
  updateLayerVisual(weaponSprite, equipState, player, delta, currentAnimMode(isMoving), facing);
}
