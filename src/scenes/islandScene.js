import Phaser from 'phaser';
import { ATTACK_DURATION_MS, PLAYER_SPEED, SHADOW_OFFSET_Y } from '../config.js';
import { createEnemy, damageEnemy, updateEnemy } from '../world/enemy.js';
import { createAnimationState, createPlayerCharacter, preloadCharacterAssets, updateCharacterVisual } from '../character/character.js';
import { createLayerSprite, unequipLayer, updateLayerVisual, equipLayer } from '../character/layers.js';
import { isEditorModeActive, panEditorCamera, resetEditorState, setupEditor } from '../editor/editorMode.js';
import { buildVillageProps, resetEditorObjects } from '../world/propRegistry.js';
import { buildGround, buildPierDock, buildWaterCollision, isNearWater, isWaterPoint, preloadTerrainPaletteAssets } from '../world/ground.js';
import { getIsland, DEFAULT_ISLAND_ID } from '../world/islands/index.js';
import { spawnItemText, spawnLevelUpText, spawnMissText, spawnMoneyText } from '../world/floatingText.js';
import { trainSkill } from '../sim/progression.js';
import { addItem, getQuantity, hasItem, removeItem } from '../sim/inventory.js';
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
import { bindHotbar, bindMenuButtons, initHud, setBerries, setHotbarState, setHp, setMinimapPos } from '../ui/hud.js';
import { isMenuOpen } from '../ui/menuManager.js';
import { toggleCharacterMenu } from '../ui/characterMenu.js';
import { toggleInventoryMenu } from '../ui/inventoryMenu.js';
import { toggleMapMenu } from '../ui/mapMenu.js';
import { findStatMeta } from '../ui/menuData.js';
import { cancelFishingAttempt, getFishingPhase, isFishingActive, releaseFishingAttempt, startFishingAttempt } from '../ui/fishingHud.js';
import { showBlocked } from '../ui/blockToast.js';
import { showLevelUp, showTrainingProgress } from '../ui/progressChip.js';
import { playBiteJitter, playCast, playReelResult, resetRod } from '../character/fishingAnimation.js';
import { getPlayerState, resetPlayerState, saveState } from '../state/playerState.js';
import { FADE_MS, travelToIsland } from '../ui/sailingTransition.js';

const BOAT_INTERACT_RANGE = 100; // pixels — perto o bastante do barco pra "G" abrir o mapa em vez de coletar
const MARKET_INTERACT_RANGE = 110; // pixels — perto o bastante das barracas pra "G" vender em vez de coletar
const MELEE_RANGE = 90; // pixels — mesma ordem de grandeza de GATHER_TREE_RANGE
const MELEE_DAMAGE = 5; // valor fixo por enquanto — sem sistema de dano de verdade ainda (combate real é projeto futuro à parte)

const FISH_REWARD = 8; // Berries por peixe fisgado — valor de referência, fácil de reequilibrar

// Árvores da vila servem de ponto de coleta de graveto — ver handleGather().
// Reaproveita as posições já cadastradas em propRegistry.js em vez de ter
// uma segunda lista de "onde tem árvore" pra manter sincronizada na mão.
const TREE_KEYS = ['village-tree-ancient', 'village-tree-small', 'village-tree-stump'];
const GATHER_TREE_RANGE = 90; // pixels
const GATHER_COOLDOWN_MS = 2500;
const MINHOCA_SUCCESS_CHANCE = 0.7;
const BLOCK_HINT_COOLDOWN_MS = 1500; // evita reiniciar a animação do aviso a cada repetição de tecla segurada

// Cena única, reutilizada por qualquer ilha (ver plano de múltiplas ilhas) —
// trocar de ilha é `this.scene.restart({ islandId })`, não uma cena nova por
// lugar. Por isso todo estado que precisa sobreviver à troca (inventário,
// berries, progressão, equipamento) mora em state/playerState.js, não aqui:
// esta classe é recriada do zero a cada restart, só o que está em
// playerState.js atravessa.
export default class IslandScene extends Phaser.Scene {
  constructor() {
    super('island');
  }

  // Roda ANTES de preload() — é daqui que a cena sabe qual ilha montar
  // (ver `scene.restart({ islandId })` no fluxo de viagem, marco 3 do
  // plano). Sem `data.islandId` (primeiro boot), usa a ilha atual salva em
  // playerState, ou a ilha padrão se nem isso existir ainda.
  init(data) {
    this.islandConfig = getIsland(data?.islandId ?? getPlayerState().currentIslandId ?? DEFAULT_ISLAND_ID);
  }

  preload() {
    // Compartilhado por qualquer ilha — ver comentário nas próprias funções.
    preloadTerrainPaletteAssets(this);
    preloadCharacterAssets(this);
    // Só o que é específico DESTA ilha (fundo, linha d'água, props) — ver
    // world/islands/*.js.
    this.islandConfig.preloadAssets(this);
  }

  create(data) {
    // Estado que PRECISA sobreviver a uma troca de ilha — ver
    // state/playerState.js. Mantemos a referência ao objeto (não uma cópia),
    // então mutar `this.state.berries` etc. já persiste sozinho.
    this.state = getPlayerState();

    // Chegou de barco de verdade (ver sailingTransition.js) — treina
    // Navegação, que até aqui não tinha nenhum gatilho real ("sem
    // travessia marítima ainda", ver menuData.js). Não dispara no primeiro
    // boot (sem data.arrivedByBoat) nem no teste de auto-viagem do
    // __gameDebug.travelTo quando o destino é a própria ilha atual — só
    // quando a ilha realmente mudou.
    if (data?.arrivedByBoat && this.islandConfig.id !== data.previousIslandId) {
      trainAndNotify(this, 'navegacao');
    }

    // Estado que é OK (e correto) resetar a cada troca de ilha/restart.
    this.facing = 'down'; // 'up' | 'down' | 'left' | 'right'
    this.treePositions = [];
    this.lastGatherAt = -Infinity;
    this.lastGatherBlockHintAt = -Infinity;
    this.lastFishBlockHintAt = -Infinity;
    this.attackAnimTimer = 0;

    // Limpa estado de módulo do editor deixado pela ilha anterior (ver
    // comentário nas próprias funções) — precisa vir antes de qualquer
    // buildVillageProps/setupEditor desta ilha.
    resetEditorObjects();
    resetEditorState();

    initHud();
    buildGround(this);

    const { spawnPoint } = this.islandConfig;
    const { player, shadow } = createPlayerCharacter(this, spawnPoint.x, spawnPoint.y);
    this.player = player;
    this.shadow = shadow;
    setMinimapPos(this.player.x / this.islandConfig.worldWidth, this.player.y / this.islandConfig.worldHeight);
    this.animState = createAnimationState();
    setHp(this.state.playerHealth.current, this.state.playerHealth.max);
    setBerries(this.state.berries);

    // Camada de equipamento (arma/ferramenta) — ver EQUIPMENT_ASSETS_TODO.md
    // pro plano de trocar os placeholders pela arte de verdade. As texturas
    // em si já foram geradas uma vez só, na BootScene (ver bootScene.js).
    this.weaponSprite = createLayerSprite(this, 'weapon-sword-front');
    // Nomeada (em vez de inline) pra reaproveitar no clique do slot de espada
    // da hotbar — mesmo padrão já usado pros menus (ver openCharacterMenu
    // etc. logo abaixo).
    const toggleSwordEquip = () => {
      // Sem essa trava, Q desequipava a vara no meio de uma pescaria em
      // andamento (ou por trás de um menu aberto) — a animação continuava
      // rodando com a linha "largada sem dono" (ver auditoria de bugs).
      if (isEditorModeActive() || isMenuOpen() || isFishingActive()) return;
      this.state.equipState.equippedLayerId ? unequipLayer(this.state.equipState) : equipLayer(this.state.equipState, 'sword');
      refreshHotbar(this);
    };
    this.input.keyboard.on('keydown-Q', toggleSwordEquip);

    this.treePositions = this.islandConfig.props.filter((p) => TREE_KEYS.includes(p.key)).map((p) => ({ x: p.x, y: p.y }));

    // Menus (Personagem/Inventário/Mapa) — ver ui/menuManager.js. Não abrem
    // no editor nem com uma pescaria em andamento, pra não empilhar estado de
    // UI incompatível. Funções nomeadas (em vez de inline) porque agora têm
    // DOIS jeitos de chamar a mesma coisa: atalho de teclado e o botão
    // clicável do HUD (ver bindMenuButtons logo abaixo).
    const openCharacterMenu = () => {
      if (isEditorModeActive() || isFishingActive()) return;
      toggleCharacterMenu(this.state.progression);
    };
    const openInventoryMenu = () => {
      if (isEditorModeActive() || isFishingActive()) return;
      toggleInventoryMenu({
        inventory: this.state.inventory,
        equipState: this.state.equipState,
        onEquip: (itemId) => handleEquip(this, itemId),
        onCraft: (recipeId) => handleCraft(this, recipeId),
      });
    };
    const openMapMenu = () => {
      if (isEditorModeActive() || isFishingActive()) return;
      toggleMapMenu({
        currentIslandId: this.islandConfig.id,
        discoveredIslands: this.state.discoveredIslands,
        onTravel: (destinationId) => travelToIsland(this, destinationId),
      });
    };
    // Guardada na cena (não só na closure local) pra handleGather() poder
    // abrir o mapa quando o jogador estiver perto do barco — ver
    // BOAT_INTERACT_RANGE logo abaixo.
    this.openMapMenu = openMapMenu;
    this.input.keyboard.on('keydown-C', openCharacterMenu);
    this.input.keyboard.on('keydown-I', openInventoryMenu);
    this.input.keyboard.on('keydown-M', openMapMenu);
    bindMenuButtons({ onPersonagem: openCharacterMenu, onInventario: openInventoryMenu, onMapa: openMapMenu });

    // Hotbar — troca rápida do que está na mão sem abrir o Inventário. Só 2
    // slots de item de verdade porque só existem 2 coisas equipáveis hoje
    // (ver setHotbarState em ui/hud.js). O slot da espada reusa o mesmo
    // toggle da tecla Q; o da vara avisa com o toast já existente se ainda
    // não foi fabricada, em vez de deixar clicar num slot "travado" sem
    // feedback nenhum. O 4º slot é permanentemente travado — reserva de
    // espaço pra quando existir alguma habilidade de verdade — e usa o mesmo
    // toast só que com o ícone de cadeado, deixando claro que a trava aqui é
    // "não existe ainda", não "falta fabricar".
    const onHotbarRod = () => {
      if (isEditorModeActive() || isMenuOpen() || isFishingActive()) return;
      if (!hasItem(this.state.inventory, 'vara-de-pescar')) {
        showBlocked('pesca', 'Você ainda não tem uma vara de pescar — fabrique uma no Inventário.');
        return;
      }
      handleEquip(this, 'vara-de-pescar');
    };
    const onHotbarAbility = () => {
      if (isEditorModeActive() || isMenuOpen() || isFishingActive()) return;
      showBlocked('cadeado', 'Habilidade ainda não existe.');
    };
    bindHotbar({ onSword: toggleSwordEquip, onRod: onHotbarRod, onAbility: onHotbarAbility });
    refreshHotbar(this);

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
      // Perto do boneco de treino com espada equipada? O clique vira golpe,
      // não arremesso — checa isso ANTES de tentar pescar (ver tryAttack).
      if (tryAttack(this)) return;
      tryStartFishing(this, { x: pointer.worldX, y: pointer.worldY });
    });
    this.input.on('pointerup', () => {
      if (isFishingActive()) releaseFishingAttempt();
    });

    const { worldWidth, worldHeight } = this.islandConfig;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Câmera menor que o mundo, seguindo o personagem, sem sair da borda do
    // mapa. O Scale Manager (modo RESIZE) já redimensiona essa câmera sozinho
    // quando a janela muda de tamanho — não precisamos fazer isso na mão.
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    // Simétrico com o fadeOut de travelToIsland (ui/sailingTransition.js) —
    // roda também no primeiro boot (fade a partir de preto), o que é
    // inofensivo/discreto o bastante pra não precisar de um caso especial
    // só pra pular ele na primeira vez.
    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    buildVillageProps(this, this.player, this.islandConfig.props);
    buildPierDock(this);
    buildWaterCollision(this, this.player);
    setupEditor(this, this.player);

    // Boneco de treino — placeholder de monstro (ver world/enemy.js), raro/
    // opcional igual o resto do jogo. Sem IA nem combate de verdade ainda:
    // combate real por turnos é um projeto futuro à parte (ver plano de
    // ilhas). A textura já foi gerada uma vez só, na BootScene.
    this.enemy = createEnemy(this, this.islandConfig.monsterSpawn.x, this.islandConfig.monsterSpawn.y);
    this.physics.add.collider(this.player, this.enemy.sprite);

    // Se a cena for destruída com uma pescaria em andamento (recarregar em
    // dev, troca de ilha), encerra o timer em vez de deixar rodando sozinho
    // sem ninguém pra receber o resultado.
    this.events.once('shutdown', () => {
      cancelFishingAttempt();
      resetRod(this.weaponSprite);
    });

    // Ganchos de depuração só em dev (o build de produção elimina este bloco
    // inteiro) — pra inspecionar o estado do jogo pelo console.
    if (import.meta.env.DEV) {
      window.__gameDebug = {
        getState: () => ({
          islandId: this.islandConfig.id,
          discoveredIslands: this.state.discoveredIslands,
          playerHealth: this.state.playerHealth,
          player: { x: this.player.x, y: this.player.y },
          berries: this.state.berries,
          progression: this.state.progression,
          inventory: this.state.inventory,
          equipState: this.state.equipState,
        }),
        // Pra testar a animação de pesca sem precisar chegar perto d'água de
        // verdade (ver character/fishingAnimation.js).
        playCastAnim: () => playCast(this, this.weaponSprite),
        playBiteAnim: () => playBiteJitter(this, this.weaponSprite),
        playResultAnim: (outcome) => playReelResult(this, this.weaponSprite, outcome),
        getRodRotationDeg: () => Phaser.Math.RadToDeg(this.weaponSprite.rotation),
        // Força um estado de "pescando" sem precisar estar perto d'água —
        // só pra testar travas (Q/E) contra isFishingActive() sem depender
        // de movimento de verdade.
        forceStartFishing: () => startFishingAttempt({ biteChance: 0, reactionMs: 500, maxWaitTicks: 999, onResult: () => {} }),
        isFishingActive: () => isFishingActive(),
        isEditorModeActive: () => isEditorModeActive(),
        getFacing: () => this.facing,
        tryStartFishing: (point) => tryStartFishing(this, point),
        // Solta a vara de fora (equivalente ao keyup-F/pointerup) — junto com
        // tryStartFishing, dá pra simular uma captura de ponta a ponta sem
        // depender de segurar tecla de verdade (pouco confiável em automação).
        releaseFishingAttempt: () => releaseFishingAttempt(),
        getFishingPhase: () => getFishingPhase(),
        // Teleporta o jogador pra testar coisas que dependem de posição
        // (perto d'água, perto de árvore) sem depender de simulação de
        // movimento via teclado, que é pouco confiável em automação.
        setPlayerPos: (x, y) => {
          this.player.body.reset(x, y);
          this.shadow.setPosition(x, y + SHADOW_OFFSET_Y);
        },
        // Aciona o mesmo caminho do menu de Mapa/barco, sem precisar de uma
        // 2ª ilha real descoberta pra clicar em algo — útil pra testar o
        // pipeline de viagem (fade + scene.restart + estado preservado)
        // isoladamente (ver ui/sailingTransition.js).
        travelTo: (islandId) => travelToIsland(this, islandId),
        // Força o RESULTADO de uma captura sem depender do sorteio real de
        // mordida (que usa Math.random() dentro de um setInterval — sob
        // throttling de aba oculta em automação, esperar uma mordida de
        // verdade pode levar minutos; forçar o outcome aqui testa a lógica
        // de recompensa/espécie/lixo sem precisar disso). NÃO usar pra
        // simular sucesso de jogador de verdade — é só pra depuração.
        forceCatch: (outcome = 'sucesso', baitId = null) => handleFishingResult(this, outcome, baitId),
        // Save de verdade agora existe (localStorage, ver state/playerState.js)
        // — saveNow força fora do intervalo de 5s do autosave, resetSave
        // apaga e recarrega a página com jogo novo.
        saveNow: () => saveState(),
        resetSave: () => {
          resetPlayerState();
          location.reload();
        },
      };
    }
  }

  update(time, delta) {
    // Sempre em dia, mesmo parado (menu/pesca/editor) ou depois de um
    // teleporte via __gameDebug.setPlayerPos — mais simples que replicar essa
    // chamada em cada branch abaixo.
    setMinimapPos(this.player.x / this.islandConfig.worldWidth, this.player.y / this.islandConfig.worldHeight);
    // Também sempre em dia — o respawn do boneco de treino não deveria travar
    // só porque o jogador abriu um menu (ver world/enemy.js).
    updateEnemy(this.enemy, delta);

    if (isMenuOpen()) {
      // Personagem/Inventário abertos — mundo congela, sem nenhuma UI de
      // Phaser própria (ver ui/menuManager.js).
      this.player.body.setVelocity(0, 0);
      updateCharacterVisual(this.player, this.animState, delta, 'idle', this.facing);
      updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, 'idle', this.facing);
      return;
    }

    if (isFishingActive()) {
      // Parado olhando a água enquanto a barra de reação roda — ver keydown-F.
      this.player.body.setVelocity(0, 0);
      updateCharacterVisual(this.player, this.animState, delta, 'idle', this.facing);
      updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, 'idle', this.facing);
      return;
    }

    if (isEditorModeActive()) {
      this.player.body.setVelocity(0, 0);
      updateCharacterVisual(this.player, this.animState, delta, 'idle', this.facing);
      updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, 'idle', this.facing);
      panEditorCamera(this, delta, this.cursors, this.wasd);
      return;
    }

    if (this.attackAnimTimer > 0) {
      // Parado durante o golpe (ver tryAttack) — mesma ideia de "congela o
      // resto pra essa ação ler bem" das outras travas acima.
      this.attackAnimTimer -= delta;
      this.player.body.setVelocity(0, 0);
      updateCharacterVisual(this.player, this.animState, delta, 'attack', this.facing);
      updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, 'attack', this.facing);
      return;
    }

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

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

    this.player.body.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
    this.shadow.setPosition(this.player.x, this.player.y + SHADOW_OFFSET_Y);

    // Y-sorting: quem estiver mais "embaixo" na tela desenha por cima.
    // Comparamos pela posição dos PÉS (player.y + offset), não pelo centro
    // do sprite — os props da vila usam pivô nos pés, então essa é a
    // régua comum entre os dois. Comparar centro-com-pé é o que causava o
    // personagem "afundando" nos objetos antes.
    const feetY = this.player.y + SHADOW_OFFSET_Y;
    this.player.setDepth(feetY);
    this.shadow.setDepth(feetY - 1);

    const isMoving = vx !== 0 || vy !== 0;
    if (isMoving) {
      if (Math.abs(vx) > Math.abs(vy)) {
        this.facing = vx > 0 ? 'right' : 'left';
      } else {
        this.facing = vy > 0 ? 'down' : 'up';
      }
    }

    updateCharacterVisual(this.player, this.animState, delta, isMoving ? 'walk' : 'idle', this.facing);
    updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, isMoving ? 'walk' : 'idle', this.facing);
  }
}

// ============================================================================
// COLETA — graveto (árvore), isca improvisada (beira d'água) e minhoca
// (caça, em qualquer outro chão) alimentam a receita da vara e a pesca em
// si. Uma tecla só (G), contexto decide o verbo — ver comentário no
// keydown-G acima.
//
// Estas funções recebem `scene` (a IslandScene) em vez de fechar sobre
// variável de módulo — mesmo padrão de antes da conversão pra classe, só que
// agora "a variável de módulo" virou `scene.player`/`scene.state.inventory`
// etc. Continuam soltas (não são métodos da classe) porque não fazem sentido
// como "verbo da cena" pra quem lê de fora, e mantê-las assim evita qualquer
// dúvida sobre binding de `this` nos call-sites que passam elas como
// callback.
// ============================================================================

function trainAndNotify(scene, key) {
  const result = trainSkill(scene.state.progression, key);
  const meta = findStatMeta(key);
  if (meta) {
    if (result.leveledUp) showLevelUp(meta);
    else showTrainingProgress(meta, scene.state.progression.skills[key]);
  }
  return result;
}

function itemLabel(itemId, qty) {
  const def = ITEM_DEFS[itemId];
  return `${def.icon} +${qty} ${def.name}`;
}

// Golpe corpo-a-corpo no boneco de treino (ver world/enemy.js) — só existe
// pra dar o que bater enquanto não existe combate de verdade (esse é um
// projeto futuro à parte, ver plano de ilhas). Precisa de espada equipada e
// alcance curto; sem trava de cooldown própria porque a animação de ataque
// (ATTACK_DURATION_MS, ver update()) já ocupa o jogador tempo suficiente
// entre um clique e outro.
function tryAttack(scene) {
  const enemy = scene.enemy;
  if (scene.state.equipState.equippedLayerId !== 'sword') return false;
  if (!enemy || enemy.respawnTimer > 0) return false;
  const dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, enemy.sprite.x, enemy.sprite.y);
  if (dist > MELEE_RANGE) return false;

  damageEnemy(scene, enemy, MELEE_DAMAGE);
  scene.attackAnimTimer = ATTACK_DURATION_MS;
  return true;
}

// Vende TODO item com sellPrice no inventário de uma vez (hoje só peixe/
// robalo/truta) — só existe onde há mercado de verdade (marketSpawn, só em
// Portomares por enquanto). Substitui/estende a "ponte temporária" de
// Berries direto na captura (ver handleFishingResult): aquela continua
// existindo (ainda não dá pra remover sem esvaziar a renda de quem nunca
// visitou um porto), mas agora carregar o peixe até um mercado de verdade
// rende Berries A MAIS — o comércio de verdade que os comentários antigos
// esperavam. Também é o primeiro gatilho real da perícia Comércio (ver
// menuData.js, que até aqui dizia "sem mercador ainda").
function handleSell(scene) {
  const inventory = scene.state.inventory;
  let total = 0;
  let count = 0;
  for (const [itemId, def] of Object.entries(ITEM_DEFS)) {
    if (!def.sellPrice) continue;
    const qty = getQuantity(inventory, itemId);
    if (qty <= 0) continue;
    total += def.sellPrice * qty;
    count += qty;
    removeItem(inventory, itemId, qty);
  }

  if (count === 0) {
    showBlocked('comercio', 'Nada pra vender agora.');
    return;
  }

  scene.state.berries += total;
  setBerries(scene.state.berries);
  spawnMoneyText(scene, scene.player.x, scene.player.y - 60, total);
  const skillResult = trainAndNotify(scene, 'comercio');
  if (skillResult.leveledUp) spawnLevelUpText(scene, scene.player.x, scene.player.y - 76, 'Comércio');
}

function handleGather(scene) {
  // Prioridade máxima: perto do barco, G abre o mapa de viagem em vez de
  // coletar — mesma tecla de "interagir com o que tem por perto" de sempre,
  // só que aqui o contexto é "quer navegar", não "quer um recurso". Fica
  // antes até do cooldown de coleta pra nunca ficar bloqueado tentando abrir
  // o mapa só porque acabou de coletar algo.
  const boatSpawn = scene.islandConfig.boatSpawn;
  if (boatSpawn && Phaser.Math.Distance.Between(scene.player.x, scene.player.y, boatSpawn.x, boatSpawn.y) <= BOAT_INTERACT_RANGE) {
    scene.openMapMenu();
    return;
  }

  // Mesma lógica pro mercado (só existe em Portomares, ver marketSpawn) —
  // vender também não deveria ficar preso atrás do cooldown de coleta.
  const marketSpawn = scene.islandConfig.marketSpawn;
  if (marketSpawn && Phaser.Math.Distance.Between(scene.player.x, scene.player.y, marketSpawn.x, marketSpawn.y) <= MARKET_INTERACT_RANGE) {
    handleSell(scene);
    return;
  }

  const now = scene.time.now;
  if (now - scene.lastGatherAt < GATHER_COOLDOWN_MS) {
    if (now - scene.lastGatherBlockHintAt >= BLOCK_HINT_COOLDOWN_MS) {
      scene.lastGatherBlockHintAt = now;
      showBlocked('sobrevivencia', 'Ainda recuperando fôlego da coleta.');
    }
    return;
  }
  scene.lastGatherAt = now;

  const player = scene.player;
  const inventory = scene.state.inventory;
  const nearTree = scene.treePositions.some((t) => Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= GATHER_TREE_RANGE);
  if (nearTree) {
    addItem(inventory, 'graveto', 1);
    spawnItemText(scene, player.x, player.y - 60, itemLabel('graveto', 1));
    // Forrageamento (graveto/isca) treina Sobrevivência — ver menuData.js,
    // que até aqui dizia "sem forrageamento ainda". Separado de Caça
    // (minhoca, logo abaixo): forragear é achar o que já está largado por
    // aí, caçar é perseguir bicho.
    const skillResult = trainAndNotify(scene, 'sobrevivencia');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 76, 'Sobrevivência');
    return;
  }

  if (isNearWater(scene, player.x, player.y)) {
    addItem(inventory, 'isca-improvisada', 1);
    spawnItemText(scene, player.x, player.y - 60, itemLabel('isca-improvisada', 1));
    const skillResult = trainAndNotify(scene, 'sobrevivencia');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 76, 'Sobrevivência');
    return;
  }

  if (Math.random() < MINHOCA_SUCCESS_CHANCE) {
    addItem(inventory, 'minhoca', 1);
    spawnItemText(scene, player.x, player.y - 60, itemLabel('minhoca', 1));
    const skillResult = trainAndNotify(scene, 'caca');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 76, 'Caça');
  } else {
    spawnMissText(scene, player.x, player.y - 60, 'Não achou nada pra caçar.');
  }
}

// ============================================================================
// EQUIPAR / FABRICAR — chamados pelo Inventário (ver ui/inventoryMenu.js);
// este módulo só sabe fazer, quem monta a UI e delega de volta é lá.
// ============================================================================

function handleEquip(scene, itemId) {
  const def = ITEM_DEFS[itemId];
  if (!def || !def.equipLayerId) return;
  const equipState = scene.state.equipState;
  if (equipState.equippedLayerId === def.equipLayerId) {
    unequipLayer(equipState);
  } else {
    equipLayer(equipState, def.equipLayerId);
  }
  refreshHotbar(scene);
}

function handleCraft(scene, recipeId) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;
  const crafted = craft(scene.state.inventory, recipe);
  // Fabricar a vara pela primeira vez destrava o slot dela na hotbar na
  // hora — sem isso o jogador só veria a mudança na próxima vez que
  // equipar/desequipar alguma coisa.
  if (crafted) refreshHotbar(scene);
  return crafted;
}

// Espelha equipState/inventory pro HUD (ver setHotbarState em ui/hud.js) —
// chamado depois de qualquer coisa que possa mudar "o que está na mão" ou
// "tem vara ou não" (equipar, fabricar, teclado ou clique na hotbar).
function refreshHotbar(scene) {
  setHotbarState({ equipped: scene.state.equipState.equippedLayerId, hasRod: hasItem(scene.state.inventory, 'vara-de-pescar') });
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
  const player = scene.player;
  if (scene.state.equipState.equippedLayerId !== 'vara-de-pescar') {
    const now = scene.time.now;
    if (now - scene.lastFishBlockHintAt >= BLOCK_HINT_COOLDOWN_MS) {
      scene.lastFishBlockHintAt = now;
      showBlocked('pesca', 'Você precisa de uma vara equipada.');
    }
    return;
  }
  if (!isNearWater(scene, player.x, player.y)) {
    const now = scene.time.now;
    if (now - scene.lastFishBlockHintAt >= BLOCK_HINT_COOLDOWN_MS) {
      scene.lastFishBlockHintAt = now;
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
    scene.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

    const dist = Phaser.Math.Distance.Between(player.x, player.y, targetPoint.x, targetPoint.y);
    const clampedDist = Math.min(dist, CAST_MAX_RANGE);
    const angle = Phaser.Math.Angle.Between(player.x, player.y, targetPoint.x, targetPoint.y);
    target = { x: player.x + Math.cos(angle) * clampedDist, y: player.y + Math.sin(angle) * clampedDist };
    castQuality = computeCastQuality(clampedDist);
  } else {
    const dir = facingVector(scene.facing);
    target = { x: player.x + dir.x * CAST_DEFAULT_DIST, y: player.y + dir.y * CAST_DEFAULT_DIST };
    castQuality = CAST_DEFAULT_QUALITY;
  }

  if (!isWaterPoint(scene, target.x, target.y)) {
    spawnMissText(scene, player.x, player.y - 60, 'Aí não tem água pra pescar.');
    return;
  }

  const baitId = getBestBait(scene.state.inventory);
  playCast(scene, scene.weaponSprite);
  startFishingAttempt({
    biteChance: getBiteChance(baitId),
    reactionMs: getReactionWindowMs(castQuality),
    maxWaitTicks: MAX_WAIT_TICKS,
    onBite: () => playBiteJitter(scene, scene.weaponSprite),
    onResult: (outcome) => handleFishingResult(scene, outcome, baitId),
  });
}

function handleFishingResult(scene, outcome, baitId) {
  const player = scene.player;
  playReelResult(scene, scene.weaponSprite, outcome);

  // Isca só se perde se um peixe chegou a morder (sucesso ou escapou) —
  // "nada mordeu"/"cedo demais" significam que ela ainda está no anzol.
  if (baitId && (outcome === 'sucesso' || outcome === 'escapou')) {
    removeItem(scene.state.inventory, baitId, 1);
  }

  if (outcome === 'sucesso') {
    // Espécie e chance de lixo variam por ilha (ver islandConfig.fishing em
    // world/islands/*.js) — cada zona de pesca tem sua própria água, isso
    // era debatido e propositalmente adiado desde a primeira versão da
    // pesca (ver ITEM_DEFS), só fazia sentido depois de existir mais de uma
    // ilha de verdade.
    const fishing = scene.islandConfig.fishing ?? { fishItemId: 'peixe', junkChance: 0 };
    const isJunk = Math.random() < fishing.junkChance;
    const catchId = isJunk ? 'lixo-marinho' : fishing.fishItemId;

    addItem(scene.state.inventory, catchId, 1);
    spawnItemText(scene, player.x, player.y - 60, itemLabel(catchId, 1));

    // Berries direto na captura ainda é ponte temporária, igual a linha de
    // nylon de graça no create() — agora já existe comércio de verdade
    // (ver handleSell, mercado de Portomares), mas removê-la totalmente
    // deixaria a renda zerada em qualquer ilha sem porto até o jogador
    // aprender a rota de comércio; fica pra uma passada futura de economia.
    // Lixo não vale Berries nenhum — a mordida foi real, só não veio nada bom.
    if (!isJunk) {
      scene.state.berries += FISH_REWARD;
      setBerries(scene.state.berries);
      spawnMoneyText(scene, player.x, player.y - 76, FISH_REWARD);
    }
    const skillResult = trainAndNotify(scene, 'pesca');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - (isJunk ? 76 : 92), 'Pesca');
    return;
  }

  const message = {
    escapou: 'O peixe escapou...',
    'nada-mordeu': 'Nada mordeu a isca.',
    'cedo-demais': 'Você puxou cedo demais.',
  }[outcome];
  spawnMissText(scene, player.x, player.y - 60, message ?? 'Nada aconteceu.');
}
