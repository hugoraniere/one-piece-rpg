import Phaser from 'phaser';
import { ATTACK_DURATION_MS, CAMERA_ZOOM, PLAYER_SPEED, RUN_SPEED, SHADOW_OFFSET_Y } from '../config.js';
import { createEnemy, damageEnemy, updateEnemy } from '../world/enemy.js';
import { createAnimationState, createPlayerCharacter, preloadCharacterAssets, updateCharacterVisual } from '../character/character.js';
import { createLayerSprite, unequipLayer, updateLayerVisual, equipLayer } from '../character/layers.js';
import { initCharacterManager } from '../character/characterManager.js';
import { isEditorModeActive, panEditorCamera, resetEditorState, setupEditor } from '../editor/editorMode.js';
import { buildVillageProps, resetEditorObjects } from '../world/propRegistry.js';
import { buildGround, buildPierDock, buildWaterCollision, isNearWater, isWaterPoint, preloadTerrainPaletteAssets } from '../world/ground.js';
import { getIsland, DEFAULT_ISLAND_ID } from '../world/islands/index.js';
import { spawnItemText, spawnLevelUpText, spawnMissText, spawnMoneyText } from '../world/floatingText.js';
import {
  collectGroundItem,
  findNearbyGroundItems,
  findNearestGroundItem,
  spawnGroundItem,
  updateGroundItemHighlights,
} from '../world/groundItems.js';
import { getForcaDamageBonus, trainAttribute, trainSkill } from '../sim/progression.js';
import { getEquipmentDef } from '../sim/equipmentDefs.js';
import { getCharacterLevel, getCharacterRank } from '../sim/characterLevel.js';
import { addItem, getQuantity, hasItem, removeItem } from '../sim/inventory.js';
import { ITEM_DEFS } from '../sim/itemDefs.js';
import { RECIPES, craft } from '../sim/crafting.js';
import {
  CAST_MAX_RANGE,
  MAX_WAIT_TICKS,
  computeCastQuality,
  getBestBait,
  getBiteChance,
  getReactionWindowMs,
} from '../sim/fishing.js';
import { bindHotbar, bindMenuButtons, flashEmptyHotbarSlot, getHotbarSlotIdByShortcut, initHud, setBerries, setHotbarState, setHp, setMinimapPos } from '../ui/hud.js';
import { getActiveMenuKey, isMenuOpen } from '../ui/menuManager.js';
import { toggleCharacterMenu } from '../ui/characterMenu.js';
import { toggleInventoryMenu } from '../ui/inventoryMenu.js';
import { toggleChestMenu } from '../ui/chestMenu.js';
import { toggleMapMenu } from '../ui/mapMenu.js';
import { findStatMeta } from '../ui/menuData.js';
import { cancelFishingAttempt, getFishingPhase, isFishingActive, releaseFishingAttempt, startFishingAttempt } from '../ui/fishingHud.js';
import { showBlocked } from '../ui/blockToast.js';
import { showLevelUp, showTrainingProgress } from '../ui/progressChip.js';
import { logEvent, bindJournalShortcut } from '../ui/eventLog.js';
import { hideNearbyLootPanel, initNearbyLootPanel, updateNearbyLootPanel } from '../ui/nearbyLootPanel.js';
import { playBiteJitter, playCast, playReelResult, resetRod } from '../character/fishingAnimation.js';
import { getPlayerState, resetPlayerState, saveState } from '../state/playerState.js';
import { FADE_MS, travelToIsland } from '../ui/sailingTransition.js';

const BOAT_INTERACT_RANGE = 100; // pixels — perto o bastante do barco pra "G" abrir o mapa em vez de coletar
const MARKET_INTERACT_RANGE = 110; // pixels — perto o bastante das barracas pra "G" vender em vez de coletar
const CHEST_INTERACT_RANGE = 90; // pixels — perto o bastante do baú pra "G" abrir o menu dele em vez de coletar

// Escala do sprite do baú (ver createChestSprite) — calibrada igual o resto
// dos props (ver comentário de defaultScale em propRegistry.js), só que
// maior de propósito: achado em teste, na escala genérica de prop pequeno
// (0.06, mesma da paleta do editor) o baú ficava quase invisível perto do
// personagem, pequeno demais pra um objeto interativo (não só decoração).
// Aberto e fechado usam escalas DIFERENTES pra render na MESMA altura
// aparente nos dois estados (a imagem "aberta" tem menos altura de
// conteúdo que a "fechada" — a tampa deitada pra trás ocupa mais largura,
// não mais altura) — sem isso, trocar de estado dava um "pulo" de tamanho.
const CHEST_SCALE_CLOSED = 0.14;
const CHEST_SCALE_OPEN = 0.16;
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

// Mostra um toast de "ação bloqueada" com cooldown — sem isso, qualquer
// clique/tecla repetida (slot de hotbar travado, vender sem nada pra
// vender, etc.) reinicia a animação do toast a cada acionamento, virando
// um piscar contínuo em vez de um aviso só (achado em revisão de UX:
// "notificações aparecendo de forma desnecessária"). `hintKey` é o nome
// do campo em `scene` que guarda o timestamp do último aviso DESSE tipo
// (cada tipo de aviso tem o seu, inicializado em create() — não
// compartilham cooldown entre si de propósito, senão um aviso de pesca
// silenciaria um aviso de ataque que aconteça logo em seguida).
function showBlockedThrottled(scene, hintKey, iconKey, message) {
  const now = scene.time.now;
  if (now - scene[hintKey] < BLOCK_HINT_COOLDOWN_MS) return;
  scene[hintKey] = now;
  showBlocked(iconKey, message);
}

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
    // Itens largados no chão (ver world/groundItems.js) — sem persistência
    // entre troca de ilha/reload de propósito (ver comentário no módulo):
    // recomeça vazio a cada create(), igual this.treePositions.
    this.groundItems = [];
    this.lastGatherAt = -Infinity;
    this.lastGatherBlockHintAt = -Infinity;
    this.lastFishBlockHintAt = -Infinity;
    this.lastAttackBlockHintAt = -Infinity;
    this.lastHotbarBlockHintAt = -Infinity;
    this.lastSellBlockHintAt = -Infinity;
    this.attackAnimTimer = 0;
    // Modo "Organizar Hotbar" do Inventário (ver inventoryMenu.js) — sem
    // isso o clique na hotbar sempre equiparia; com isso ativo, clicar num
    // item do Inventário guarda o itemId aqui (`pendingHotbarAssignItemId`)
    // e o PRÓXIMO clique na hotbar atribui ele ao slot em vez de equipar
    // (ver onHotbarSlotClick abaixo).
    this.hotbarEditMode = false;
    this.pendingHotbarAssignItemId = null;

    // Limpa estado de módulo do editor deixado pela ilha anterior (ver
    // comentário nas próprias funções) — precisa vir antes de qualquer
    // buildVillageProps/setupEditor desta ilha.
    resetEditorObjects();
    resetEditorState();

    initHud();
    initNearbyLootPanel();
    buildGround(this);

    const { spawnPoint } = this.islandConfig;
    const { player, shadow } = createPlayerCharacter(this, spawnPoint.x, spawnPoint.y);
    this.player = player;
    this.shadow = shadow;
    setMinimapPos(this.player.x / this.islandConfig.worldWidth, this.player.y / this.islandConfig.worldHeight);
    this.animState = createAnimationState();

    // ✨ CharacterManager — escalável outfit/layers sistema
    this.characterManager = initCharacterManager({ player, shadow }, this);

    setHp(this.state.playerHealth.current, this.state.playerHealth.max);
    setBerries(this.state.berries);

    // Camada de equipamento (arma/ferramenta) — ver EQUIPMENT_ASSETS_TODO.md
    // pro plano de trocar os placeholders pela arte de verdade. As texturas
    // em si já foram geradas uma vez só, na BootScene (ver bootScene.js).
    this.weaponSprite = createLayerSprite(this, 'weapon-sword-front');

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
        onDropItem: (itemId) => handleDropItem(this, itemId),
        // Função, não valor — o painel re-renderiza a si mesmo depois de
        // cada clique (ver mountInventoryMenu) reusando o MESMO ctx; um
        // valor capturado aqui (this.hotbarEditMode no momento de abrir)
        // ficaria congelado pra sempre nesse render, nunca refletindo o
        // toggle que aconteceu depois. Getter sempre lê o estado atual.
        getHotbarEditMode: () => this.hotbarEditMode,
        getPendingHotbarAssignItemId: () => this.pendingHotbarAssignItemId,
        onToggleHotbarEditMode: () => {
          this.hotbarEditMode = !this.hotbarEditMode;
          if (!this.hotbarEditMode) this.pendingHotbarAssignItemId = null;
        },
        // Clicar no MESMO item selecionado de novo desmarca (dá pra
        // desistir de atribuir sem precisar clicar na hotbar).
        onSelectForHotbar: (itemId) => {
          this.pendingHotbarAssignItemId = this.pendingHotbarAssignItemId === itemId ? null : itemId;
        },
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
    // Mesma ideia do Inventário/Mapa, só que sem tecla dedicada — abre via G
    // perto do baú (ver chestSpawn/CHEST_INTERACT_RANGE, handleGather()).
    const openChestMenu = () => {
      if (isEditorModeActive() || isFishingActive()) return;
      toggleChestMenu({
        inventory: this.state.inventory,
        chestInventory: this.state.chestInventory,
        onMoveToChest: (itemId) => handleMoveToChest(this, itemId),
        onMoveToInventory: (itemId) => handleMoveToInventory(this, itemId),
      });
    };
    // Guardadas na cena (não só na closure local) pra handleGather() poder
    // abrir o mapa/baú quando o jogador estiver perto do barco/baú — ver
    // BOAT_INTERACT_RANGE/CHEST_INTERACT_RANGE logo abaixo.
    this.openMapMenu = openMapMenu;
    this.openChestMenu = openChestMenu;
    this.input.keyboard.on('keydown-C', openCharacterMenu);
    this.input.keyboard.on('keydown-I', openInventoryMenu);
    this.input.keyboard.on('keydown-M', openMapMenu);
    bindMenuButtons({ onPersonagem: openCharacterMenu, onInventario: openInventoryMenu, onMapa: openMapMenu });

    // Hotbar — troca rápida do que está na mão sem abrir o Inventário,
    // clique OU tecla de número (1-9, 0). Sem item fixo por slot (ver
    // ITEMS_PROGRESS.md): cada slot guarda o que o JOGADOR atribuiu
    // (this.state.hotbarAssignments, ver state/playerState.js), atribuído
    // pelo modo "Organizar Hotbar" do Inventário. UM handler só cobre os
    // 10 slots — o que ele faz depende do modo atual (ver comentário de
    // pendingHotbarAssignItemId acima):
    //  - com um item pendente (veio do Inventário): atribui esse item ao
    //    slot clicado (ou remove, se já era o mesmo item nesse slot);
    //  - sem pendência: equipa/desequipa o que já está atribuído ali,
    //    igual sempre foi.
    const onHotbarSlotClick = (slotId) => {
      if (isEditorModeActive() || isFishingActive()) return;
      const pendingItemId = this.pendingHotbarAssignItemId;
      if (pendingItemId && isMenuOpen()) {
        assignItemToHotbarSlot(this.state.hotbarAssignments, slotId, pendingItemId);
        this.pendingHotbarAssignItemId = null;
        refreshHotbar(this);
        return;
      }
      if (isMenuOpen()) return; // Inventário aberto mas sem item selecionado pra atribuir — hotbar fica quieta, evita equipar sem querer atrás do menu.
      const itemId = this.state.hotbarAssignments[slotId];
      if (!itemId) {
        // Sem toast aqui de propósito (achado ruim em revisão de UX) — só o
        // próprio slot pisca rápido, ver flashEmptyHotbarSlot em ui/hud.js.
        flashEmptyHotbarSlot(slotId);
        return;
      }
      if (!hasItem(this.state.inventory, itemId)) {
        showBlockedThrottled(this, 'lastHotbarBlockHintAt', 'cadeado', `Você não tem mais ${ITEM_DEFS[itemId].name} — atribua outro item a este slot.`);
        return;
      }
      handleEquip(this, itemId);
    };
    bindHotbar(onHotbarSlotClick);
    // Mesmo handler, só que pela tecla de número — nomes de evento do
    // Phaser pra dígitos são por extenso (KeyCodes.ONE = 49, ver
    // KeyMap.js), não "keydown-1". Q continua como atalho rápido, agora
    // só um alias do slot 1 (antes era hardcoded pra espada).
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'].forEach((keyName, i) => {
      const num = i < 9 ? i + 1 : 0;
      const slotId = getHotbarSlotIdByShortcut(String(num));
      this.input.keyboard.on(`keydown-${keyName}`, () => onHotbarSlotClick(slotId));
    });
    this.input.keyboard.on('keydown-Q', () => onHotbarSlotClick('slot1'));
    refreshHotbar(this);

    // Journal — "J" para abrir/fechar o diário de eventos
    bindJournalShortcut(this);

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
    // matar). A vara é só mais um equipamento: o MESMO clique que ataca com
    // a espada arremessa com a vara — sem tecla dedicada (F) só pra ela.
    // Dois cliques, não segurar/soltar: um pra jogar a isca, outro pra
    // fisgar quando morder — ver sim/fishing.js pras fórmulas e
    // ui/fishingHud.js pro minigame de duas fases (espera + mordida).
    this.input.on('pointerdown', (pointer) => {
      if (isEditorModeActive() || isMenuOpen()) return;
      if (isFishingActive()) {
        // Clique durante a espera não faz nada (sem mordida ainda, nada pra
        // fisgar) — só a mordida reage ao clique. Assim não existe mais
        // jeito de "puxar cedo demais" por um clique impaciente.
        if (getFishingPhase() === 'mordida') releaseFishingAttempt();
        return;
      }
      // Perto do boneco de treino com arma equipada? O clique vira golpe,
      // não arremesso — checa isso ANTES de tentar pescar (ver tryAttack).
      if (tryAttack(this)) return;
      // Arma equipada mas SEM alvo (longe demais, ou nem existe boneco por
      // perto) — não é uma tentativa de pesca, então não pode cair no
      // tryStartFishing só porque não é 'vara-de-pescar': isso mostrava
      // "Você precisa de uma vara equipada" pra quem tinha uma ARMA na mão,
      // uma mensagem sobre o item errado (achado em revisão de bug pelo
      // usuário). Mesmo padrão de aviso com cooldown já usado pra pesca/
      // coleta, só que pro contexto de ataque. Generalizado pra qualquer
      // arma (não só espada) via equipmentDefs — arco cai aqui também.
      const equippedWeaponDef = getEquipmentDef(this.state.equipState.equippedLayerId);
      if (equippedWeaponDef?.kind === 'weapon') {
        showBlockedThrottled(this, 'lastAttackBlockHintAt', 'espada', 'Ninguém por perto pra atacar.');
        return;
      }
      tryStartFishing(this, { x: pointer.worldX, y: pointer.worldY });
    });

    const { worldWidth, worldHeight } = this.islandConfig;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Câmera menor que o mundo, seguindo o personagem, sem sair da borda do
    // mapa. O Scale Manager (modo RESIZE) já redimensiona essa câmera sozinho
    // quando a janela muda de tamanho — não precisamos fazer isso na mão.
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(CAMERA_ZOOM);
    // Simétrico com o fadeOut de travelToIsland (ui/sailingTransition.js) —
    // roda também no primeiro boot (fade a partir de preto), o que é
    // inofensivo/discreto o bastante pra não precisar de um caso especial
    // só pra pular ele na primeira vez.
    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');

    buildVillageProps(this, this.player, this.islandConfig.props);
    this.chestSprite = createChestSprite(this);
    this.chestIsOpen = false;
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
          chestInventory: this.state.chestInventory,
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
        // Aciona o mesmo caminho do segundo clique (fisgar) — junto com
        // tryStartFishing, dá pra simular uma captura de ponta a ponta sem
        // depender de cliques de verdade (pouco confiável em automação).
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
    // Liga/desliga o destaque dourado + nome dos itens no chão conforme o
    // jogador entra/sai do alcance de apanhar (ver world/groundItems.js) —
    // mesma ideia sempre-em-dia de cima, funciona mesmo parado num menu.
    updateGroundItemHighlights(this);
    // Mesma ideia sempre-em-dia de cima — espelha o Baú aberto/fechado no
    // MUNDO conforme o menu dele está aberto (ver syncChestVisual). Não dá
    // pra fazer isso só no momento de abrir via G (openChestMenu): o menu
    // também fecha pelo Esc ou clicando fora do backdrop
    // (ui/menuManager.js), nenhum dos quais passa por islandScene.js.
    syncChestVisual(this);

    if (isMenuOpen()) {
      // Personagem/Inventário abertos — mundo congela, sem nenhuma UI de
      // Phaser própria (ver ui/menuManager.js). Caixa de itens próximos
      // some junto — não faz sentido apanhar item enquanto o mundo tá
      // parado (ui/nearbyLootPanel.js).
      hideNearbyLootPanel();
      this.player.body.setVelocity(0, 0);
      updateCharacterVisual(this.player, this.animState, delta, 'idle', this.facing);
      updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, 'idle', this.facing);
      return;
    }

    if (isFishingActive()) {
      // Parado olhando a água enquanto a barra de reação roda — ver o
      // pointerdown único que decide arremessar/fisgar conforme a fase.
      hideNearbyLootPanel();
      this.player.body.setVelocity(0, 0);
      updateCharacterVisual(this.player, this.animState, delta, 'idle', this.facing);
      updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, 'idle', this.facing);
      return;
    }

    if (isEditorModeActive()) {
      hideNearbyLootPanel();
      this.player.body.setVelocity(0, 0);
      updateCharacterVisual(this.player, this.animState, delta, 'idle', this.facing);
      updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, 'idle', this.facing);
      panEditorCamera(this, delta, this.cursors, this.wasd);
      return;
    }

    // Caixa suspensa de itens próximos (ver ui/nearbyLootPanel.js) — só
    // no fluxo normal de jogo (os três "congela o mundo" acima já
    // esconderam ela e voltaram). Clique num item da lista chama o mesmo
    // pickUpGroundItem que a tecla G usa.
    updateNearbyLootPanel(this, findNearbyGroundItems(this, this.player.x, this.player.y), (entry) => pickUpGroundItem(this, entry));

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

    // Corrida — segurar Shift (this.cursors.shift já vem de graça do
    // createCursorKeys(), sem precisar registrar tecla nova). Só importa
    // enquanto o jogador estiver de fato andando pra algum lado; segurar
    // Shift parado não faz nada (nem tem por quê — ver isMoving abaixo).
    const isRunning = this.cursors.shift.isDown && (vx !== 0 || vy !== 0);
    const speed = isRunning ? RUN_SPEED : PLAYER_SPEED;
    this.player.body.setVelocity(vx * speed, vy * speed);
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

    const visualMode = isRunning ? 'run' : isMoving ? 'walk' : 'idle';
    updateCharacterVisual(this.player, this.animState, delta, visualMode, this.facing);
    updateLayerVisual(this.weaponSprite, this.state.equipState, this.player, delta, visualMode, this.facing);
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
  const levelBefore = getCharacterLevel(scene.state.progression);
  const result = trainSkill(scene.state.progression, key);
  const meta = findStatMeta(key);
  if (meta) {
    if (result.leveledUp) {
      showLevelUp(meta);
      logEvent('PROGRESSION', `${meta.name} ↑`, {
        level: `${result.level}`,
        xp: `+${result.xpGained}`,
      });
    } else showTrainingProgress(meta, scene.state.progression.skills[key]);
  }
  reportCharacterLevel(scene, levelBefore);
  return result;
}

// Mesma ideia de trainAndNotify, só que pra atributo (trainAttribute em
// vez de trainSkill) — hoje só chamada pra Força (ver tryAttack). Duas
// funções pequenas em vez de uma genérica com parâmetro "tipo": os dois
// motores (trainSkill/trainAttribute) já são separados em
// sim/progression.js por terem tetos diferentes (nível 10 vs sem teto),
// então espelhar essa separação aqui é mais claro que esconder um `if`.
function trainAttributeAndNotify(scene, key) {
  const levelBefore = getCharacterLevel(scene.state.progression);
  const result = trainAttribute(scene.state.progression, key);
  const meta = findStatMeta(key);
  if (meta) {
    if (result.leveledUp) showLevelUp(meta);
    else showTrainingProgress(meta, scene.state.progression.attributes[key]);
  }
  reportCharacterLevel(scene, levelBefore);
  return result;
}

// Nível de PERSONAGEM (agregado de todas as perícias/atributos, ver
// sim/characterLevel.js) — chamado de dentro de trainAndNotify/
// trainAttributeAndNotify pra todo ponto que já treina algo participar
// automaticamente, sem precisar mexer em cada um dos 7 call sites. Sem
// chip fixo no HUD (removido — ficava grande demais e nem precisava estar
// sempre visível, ver revisão de UX); o texto flutuante de nível já basta
// como feedback no momento, e a Ficha de Personagem mostra o número/
// patente completos sob demanda.
function reportCharacterLevel(scene, levelBefore) {
  const level = getCharacterLevel(scene.state.progression);
  if (level > levelBefore) {
    const rank = getCharacterRank(level);
    spawnLevelUpText(scene, scene.player.x, scene.player.y - 100, `Nível ${level} — ${rank.name}`);
  }
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
//
// Treina Espada e Força de verdade (antes não treinava nada, apesar das
// duas aparecerem como "real" no menu — achado ao planejar o sistema de
// nível de personagem: um nível que ignora combate ficaria estranho pra
// quem só luta). getForcaDamageBonus já existia em sim/progression.js mas
// nunca tinha sido chamada — o dano segue fixo (MELEE_DAMAGE) até o
// jogador treinar Força de verdade batendo no boneco.
function tryAttack(scene) {
  const enemy = scene.enemy;
  const weaponDef = getEquipmentDef(scene.state.equipState.equippedLayerId);
  if (!weaponDef || weaponDef.kind !== 'weapon') return false;
  if (!enemy || enemy.respawnTimer > 0) return false;
  const range = weaponDef.range ?? MELEE_RANGE;
  const dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, enemy.sprite.x, enemy.sprite.y);
  if (dist > range) return false;

  const damage = Math.round(MELEE_DAMAGE + weaponDef.damage + getForcaDamageBonus(scene.state.progression));
  damageEnemy(scene, enemy, damage);
  logEvent('COMBAT', `Atacou ${enemy.enemyDef.name}`, { damage: `-${damage}` });

  // Se inimigo morreu, registrar vitória
  if (enemy.health <= 0) {
    logEvent('COMBAT', `Derrotou ${enemy.enemyDef.name}`);
  }

  scene.attackAnimTimer = ATTACK_DURATION_MS;
  trainAndNotify(scene, weaponDef.skillKey);
  trainAttributeAndNotify(scene, 'forca');
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
    showBlockedThrottled(scene, 'lastSellBlockHintAt', 'comercio', 'Nada pra vender agora.');
    return;
  }

  scene.state.berries += total;
  setBerries(scene.state.berries);
  spawnMoneyText(scene, scene.player.x, scene.player.y - 60, total);
  logEvent('ITEM', `Vendeu ${count} item(ns)`, { berries: `+${total}` });
  const skillResult = trainAndNotify(scene, 'comercio');
  if (skillResult.leveledUp) spawnLevelUpText(scene, scene.player.x, scene.player.y - 76, 'Comércio');
}

// Compartilhado entre a tecla G (pega o mais perto, ver handleGather
// abaixo) e o clique na caixa de itens próximos (ver ui/nearbyLootPanel.js
// e a chamada de updateNearbyLootPanel em update()) — as duas formas de
// apanhar um item do chão fazem exatamente a mesma coisa, só mudam em
// COMO o item foi escolhido.
function pickUpGroundItem(scene, entry) {
  // Trava contra coletar duas vezes (G e a caixa de itens próximos podem
  // disparar quase juntos pro MESMO item — ver comentário de
  // entry.collected em world/groundItems.js). Checa ANTES do addItem,
  // não só dentro de collectGroundItem, senão o item duplicaria no
  // inventário mesmo com a animação protegida.
  if (entry.collected) return;
  addItem(scene.state.inventory, entry.itemId, entry.qty);
  spawnItemText(scene, scene.player.x, scene.player.y - 60, itemLabel(entry.itemId, entry.qty));
  collectGroundItem(scene, entry);
}

function handleGather(scene) {
  // Prioridade MÁXIMA de todas: tem um item largado bem ali (ver
  // world/groundItems.js), G sempre pega o mais próximo antes de qualquer
  // outra interação de contexto — é o gesto mais específico e imediato
  // possível (o jogador está literalmente em cima do item), então nada
  // mais deveria competir com isso. Fora do cooldown de coleta de
  // propósito, igual barco/mercado abaixo: pegar um item específico não
  // devia ficar preso atrás do cooldown do "procurar minhoca no mato".
  // Pra escolher QUAL item apanhar (quando tem mais de um por perto), ver
  // a caixa suspensa (ui/nearbyLootPanel.js) — G é só o atalho "o mais
  // perto, sem escolher".
  const nearbyGroundItem = findNearestGroundItem(scene, scene.player.x, scene.player.y);
  if (nearbyGroundItem) {
    pickUpGroundItem(scene, nearbyGroundItem);
    return;
  }

  // Prioridade máxima entre o resto: perto do barco, G abre o mapa de
  // viagem em vez de coletar — mesma tecla de "interagir com o que tem
  // por perto" de sempre, só que aqui o contexto é "quer navegar", não
  // "quer um recurso". Fica antes até do cooldown de coleta pra nunca
  // ficar bloqueado tentando abrir o mapa só porque acabou de coletar algo.
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

  // Mesma lógica pro baú (ver chestSpawn, só existe na Vila do Mastro
  // Partido por enquanto) — abrir o Baú também não deveria ficar preso
  // atrás do cooldown de coleta.
  const chestSpawn = scene.islandConfig.chestSpawn;
  if (chestSpawn && Phaser.Math.Distance.Between(scene.player.x, scene.player.y, chestSpawn.x, chestSpawn.y) <= CHEST_INTERACT_RANGE) {
    scene.openChestMenu();
    return;
  }

  const now = scene.time.now;
  if (now - scene.lastGatherAt < GATHER_COOLDOWN_MS) {
    showBlockedThrottled(scene, 'lastGatherBlockHintAt', 'sobrevivencia', 'Ainda recuperando fôlego da coleta.');
    return;
  }
  scene.lastGatherAt = now;

  const player = scene.player;
  const inventory = scene.state.inventory;
  const nearTree = scene.treePositions.some((t) => Phaser.Math.Distance.Between(player.x, player.y, t.x, t.y) <= GATHER_TREE_RANGE);
  if (nearTree) {
    // Machado equipado multiplica o graveto por coleta (ver
    // sim/equipmentDefs.js) — sem machado continua 1 por coleta, igual
    // sempre foi.
    const toolDef = getEquipmentDef(scene.state.equipState.equippedLayerId);
    const gatherQty = toolDef?.kind === 'tool' && toolDef.gatherMultiplier ? toolDef.gatherMultiplier : 1;
    addItem(inventory, 'graveto', gatherQty);
    const gavetoLabel = itemLabel('graveto', gatherQty);
    spawnItemText(scene, player.x, player.y - 60, gavetoLabel);
    logEvent('ITEM', `${gavetoLabel} coletado`);
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
    const iscaLabel = itemLabel('isca-improvisada', 1);
    spawnItemText(scene, player.x, player.y - 60, iscaLabel);
    logEvent('ITEM', `${iscaLabel} coletado`);
    const skillResult = trainAndNotify(scene, 'sobrevivencia');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 76, 'Sobrevivência');
    return;
  }

  if (Math.random() < MINHOCA_SUCCESS_CHANCE) {
    addItem(inventory, 'minhoca', 1);
    const minhojaLabel = itemLabel('minhoca', 1);
    spawnItemText(scene, player.x, player.y - 60, minhojaLabel);
    logEvent('ITEM', `${minhojaLabel} coletado`);
    const skillResult = trainAndNotify(scene, 'caca');
    if (skillResult.leveledUp) spawnLevelUpText(scene, player.x, player.y - 76, 'Caça');
  } else {
    logEvent('ITEM', 'Falha ao caçar');
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

// Descarta 1 unidade de `itemId` do inventário pro chão, na posição do
// jogador (ver world/groundItems.js) — chamado pelo botão de descartar de
// cada slot do Inventário (ver inventoryMenu.js). Se era o item
// equipado e a última unidade acabou de sair do inventário, desequipa
// também: continuar "equipado" um item que você não tem mais deixaria o
// weaponSprite desenhado sem dono (mesmo cuidado que já existia pro caso
// de trocar de vara no meio de uma pescaria, ver toggleSwordEquip
// histórico).
function handleDropItem(scene, itemId) {
  const def = ITEM_DEFS[itemId];
  if (!def || getQuantity(scene.state.inventory, itemId) <= 0) return;

  removeItem(scene.state.inventory, itemId, 1);
  spawnGroundItem(scene, itemId, 1, scene.player.x, scene.player.y);

  const equipState = scene.state.equipState;
  if (def.equipLayerId && equipState.equippedLayerId === def.equipLayerId && !hasItem(scene.state.inventory, itemId)) {
    unequipLayer(equipState);
  }
  refreshHotbar(scene);
}

// Transfere 1 unidade do Inventário pro Baú (ver ui/chestMenu.js) — mesmo
// cuidado de handleDropItem com item equipado: se a última unidade saiu do
// inventário e era o que estava na mão, desequipa.
function handleMoveToChest(scene, itemId) {
  const def = ITEM_DEFS[itemId];
  if (!def || getQuantity(scene.state.inventory, itemId) <= 0) return;

  removeItem(scene.state.inventory, itemId, 1);
  addItem(scene.state.chestInventory, itemId, 1);

  const equipState = scene.state.equipState;
  if (def.equipLayerId && equipState.equippedLayerId === def.equipLayerId && !hasItem(scene.state.inventory, itemId)) {
    unequipLayer(equipState);
  }
  refreshHotbar(scene);
}

// Inverso — tira 1 unidade do Baú de volta pro Inventário.
function handleMoveToInventory(scene, itemId) {
  if (getQuantity(scene.state.chestInventory, itemId) <= 0) return;
  removeItem(scene.state.chestInventory, itemId, 1);
  addItem(scene.state.inventory, itemId, 1);
  refreshHotbar(scene);
}

// Sprite do baú no MUNDO — fora do pipeline genérico de props decorativos
// (buildVillageProps/propRegistry.js) de propósito: ele precisa trocar de
// textura fechado/aberto e animar quando o menu abre/fecha (ver
// syncChestVisual/playChestToggleAnim logo abaixo), algo que um prop comum
// nunca faz. `village-chest-closed`/`-open` já são carregados por
// preloadVillageAssets (mesmo pacote de assets da vila, arte real, não
// placeholder). Sem chestSpawn (ilha ainda sem baú), não cria nada.
function createChestSprite(scene) {
  const chestSpawn = scene.islandConfig.chestSpawn;
  if (!chestSpawn) return null;
  const sprite = scene.add.image(chestSpawn.x, chestSpawn.y, 'village-chest-closed');
  sprite.setOrigin(0.5, 1); // pivô nos "pés", mesma régua de Y-sorting dos props (ver createPropImage)
  sprite.setScale(CHEST_SCALE_CLOSED);
  sprite.setDepth(chestSpawn.y);
  return sprite;
}

// Chamada todo frame (ver update()) — compara o estado atual do menu do
// Baú contra o que o sprite já está mostrando, só mexe em algo quando MUDA.
// Cobre tanto abrir via G (openChestMenu) quanto fechar por qualquer
// caminho (Esc, clique fora, trocar de menu) sem precisar de um callback
// próprio pra cada um.
function syncChestVisual(scene) {
  if (!scene.chestSprite) return;
  const shouldBeOpen = getActiveMenuKey() === 'bau';
  if (shouldBeOpen === scene.chestIsOpen) return;
  scene.chestIsOpen = shouldBeOpen;
  playChestToggleAnim(scene, shouldBeOpen);
}

// Troca a textura fechado/aberto no FUNDO de uma "batida" de escala
// (encolhe, troca a arte no ponto mais comprimido, estica de volta com
// Back.easeOut) — só duas imagens estáticas no pacote de assets, sem
// spritesheet com quadros intermediários de tampa abrindo, mas o tween
// vende a sensação de abrir/fechar de verdade em vez de só "piscar" pra
// outra arte.
const CHEST_ANIM_SQUASH_MS = 70;
const CHEST_ANIM_POP_MS = 160;
function playChestToggleAnim(scene, isOpen) {
  const sprite = scene.chestSprite;
  const currentScale = sprite.scaleX;
  scene.tweens.add({
    targets: sprite,
    scaleX: currentScale * 1.08,
    scaleY: currentScale * 0.6,
    duration: CHEST_ANIM_SQUASH_MS,
    ease: 'Cubic.easeIn',
    onComplete: () => {
      const targetScale = isOpen ? CHEST_SCALE_OPEN : CHEST_SCALE_CLOSED;
      sprite.setTexture(isOpen ? 'village-chest-open' : 'village-chest-closed');
      sprite.setScale(targetScale * 1.08, targetScale * 0.6);
      scene.tweens.add({
        targets: sprite,
        scaleX: targetScale,
        scaleY: targetScale,
        duration: CHEST_ANIM_POP_MS,
        ease: 'Back.easeOut',
      });
    },
  });
}

// Atribui `itemId` ao slot `slotId` — clicar no MESMO slot que já tinha
// esse item remove a atribuição (desatribuir sem precisar de um segundo
// gesto). Um item só fica em UM slot por vez: se já estava atribuído em
// outro, limpa de lá antes (evita duplicar o mesmo item em dois slots,
// que seria confuso sem trazer nenhum benefício de gameplay).
function assignItemToHotbarSlot(assignments, slotId, itemId) {
  if (assignments[slotId] === itemId) {
    assignments[slotId] = null;
    return;
  }
  for (const id of Object.keys(assignments)) {
    if (assignments[id] === itemId) assignments[id] = null;
  }
  assignments[slotId] = itemId;
}

// Espelha equipState/inventory/hotbarAssignments pro HUD (ver
// setHotbarState em ui/hud.js) — chamado depois de qualquer coisa que
// possa mudar "o que está na mão", "o que tenho" ou "o que atribuí a cada
// slot" (equipar, fabricar, teclado, clique na hotbar, organizar).
function refreshHotbar(scene) {
  setHotbarState({
    equipped: scene.state.equipState.equippedLayerId,
    inventory: scene.state.inventory,
    assignments: scene.state.hotbarAssignments,
  });
}

// ============================================================================
// PESCA — arremesso (mira/qualidade) + espera/mordida (ver sim/fishing.js
// pras fórmulas e ui/fishingHud.js pro minigame). `targetPoint` é sempre o
// clique n'água — sem tecla dedicada pra arremesso "cego" (ver clique único
// pro item equipado, acima).
// ============================================================================

function tryStartFishing(scene, targetPoint) {
  const player = scene.player;
  // Generalizado pra qualquer vara (ver equipmentDefs.js#canFish) — machado
  // também é 'tool', então checar só `kind` deixaria pescar com ele por
  // engano; `canFish` é o discriminador específico.
  const rodDef = getEquipmentDef(scene.state.equipState.equippedLayerId);
  if (!rodDef?.canFish) {
    return; // Se não tem vara equipada, não dá pra pescar — silencioso
  }
  if (!isNearWater(scene, player.x, player.y)) {
    showBlockedThrottled(scene, 'lastFishBlockHintAt', 'pesca', 'Muito longe da água pra pescar.');
    return;
  }

  const dx = targetPoint.x - player.x;
  const dy = targetPoint.y - player.y;
  // Vira o personagem (e a vara) pro lado do clique — sem isso o arremesso
  // ia sempre visualmente pra direção que o personagem já estava olhando
  // antes de pescar, mesmo mirando pro lado oposto na água.
  scene.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';

  const dist = Phaser.Math.Distance.Between(player.x, player.y, targetPoint.x, targetPoint.y);
  const clampedDist = Math.min(dist, CAST_MAX_RANGE);
  const angle = Phaser.Math.Angle.Between(player.x, player.y, targetPoint.x, targetPoint.y);
  const target = { x: player.x + Math.cos(angle) * clampedDist, y: player.y + Math.sin(angle) * clampedDist };
  const castQuality = computeCastQuality(clampedDist);

  if (!isWaterPoint(scene, target.x, target.y)) {
    spawnMissText(scene, player.x, player.y - 60, 'Aí não tem água pra pescar.');
    return;
  }

  const baitId = getBestBait(scene.state.inventory);
  playCast(scene, scene.weaponSprite);
  startFishingAttempt({
    biteChance: getBiteChance(baitId, scene.state.equipState.equippedLayerId),
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
    const catchLabel = itemLabel(catchId, 1);
    spawnItemText(scene, player.x, player.y - 60, catchLabel);
    logEvent('ITEM', `Pescou ${catchLabel.toLowerCase()}`);

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
    escapou: 'Peixe escapou',
    'nada-mordeu': 'Nada mordeu',
    'cedo-demais': 'Puxou cedo',
  }[outcome];
  logEvent('ITEM', message ?? 'Pesca falhou');
  spawnMissText(scene, player.x, player.y - 60, message ?? 'Nada aconteceu.');
}
