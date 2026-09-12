import { createHealth } from '../sim/health.js';
import { createProgression } from '../sim/progression.js';
import { createInventory } from '../sim/inventory.js';
import { ITEM_DEFS } from '../sim/itemDefs.js';
import { createLayerState, equipLayer } from '../character/layers.js';
import { PLAYER_MAX_HP } from '../config.js';
import { DEFAULT_ISLAND_ID, getDefaultDiscoveredIslands, ISLANDS } from '../world/islands/index.js';

// Estado do jogador que precisa sobreviver a uma troca de ilha (scene.restart
// recria a IslandScene do zero, mas inventário/berries/progressão/equipamento
// não podem "zerar" só porque o jogador entrou num barco). Singleton lazy:
// criado uma vez na primeira vez que alguém pedir, devolvido por referência
// dali em diante — quem tem o objeto (a cena) só precisa mutar os campos
// dele, nunca reatribuir a variável, senão a próxima cena voltaria a pegar
// o objeto antigo por engano.
let state = null;

// Save de verdade — sim/progression.js já avisava "sem persistência ainda...
// quando existir save de verdade, isso entra junto". localStorage, uma
// chave só, serializado o suficiente pra sobreviver a versões futuras do
// jogo (ver mergeProgression/mergeDiscoveredIslands abaixo: nunca confia
// cegamente no save antigo, sempre funde com o que o jogo espera hoje).
const STORAGE_KEY = 'one-piece-rpg-save-v1';
const AUTOSAVE_INTERVAL_MS = 5000;

// Hotbar não tem mais item fixo por slot (ver ITEMS_PROGRESS.md) — cada
// slot guarda o itemId que o JOGADOR atribuiu ali (ou null, vazio), e é
// isso que persiste no save. 10 slots genéricos (teclas 1-9, 0), mesma
// contagem de sempre. `slot1: 'sword'` é o único default não-vazio — só
// pra quem começa do zero já ver a espada pronta pra usar, sem precisar
// abrir o Inventário primeiro.
const HOTBAR_SLOT_COUNT = 10;
function createDefaultHotbarAssignments() {
  const assignments = {};
  for (let i = 1; i <= HOTBAR_SLOT_COUNT; i++) {
    assignments[`slot${i}`] = null;
  }
  assignments.slot1 = 'sword';
  return assignments;
}

// Funde atribuições salvas por cima do default — mesmo espírito de
// mergeProgression/mergeDiscoveredIslands: um save antigo (de antes de um
// slot novo existir, se a contagem crescer no futuro) não quebra, só ganha
// os slots que não conhecia vazios.
function mergeHotbarAssignments(saved) {
  const fresh = createDefaultHotbarAssignments();
  if (!saved || typeof saved !== 'object') return fresh;
  for (const key of Object.keys(fresh)) {
    if (key in saved) fresh[key] = saved[key];
  }
  return fresh;
}

function buildInitialState() {
  const saved = loadFromStorage();
  if (saved) return saved;

  const equipState = createLayerState();
  equipLayer(equipState, 'sword'); // equipada por padrão só pra já dar pra ver funcionando
  return {
    // corda/ferro-bruto seguem o mesmo padrão da linha-de-nylon: suprimento
    // inicial fixo, sem coleta própria ainda (ver ITEMS_PROGRESS.md) — dá
    // exatamente pra uma fabricação de cada item novo (arco usa corda;
    // machado, vara reforçada e lança usam ferro-bruto, por isso 3 em
    // vez de 1). `sword: 1`: a espada virou item normal (antes era
    // hardcoded fora do inventário) — jogador começa com uma.
    inventory: createInventory({ sword: 1, 'linha-de-nylon': 2, corda: 1, 'ferro-bruto': 3 }),
    berries: 0,
    progression: createProgression(),
    equipState,
    playerHealth: createHealth(PLAYER_MAX_HP),
    currentIslandId: DEFAULT_ISLAND_ID,
    discoveredIslands: getDefaultDiscoveredIslands(),
    hotbarAssignments: createDefaultHotbarAssignments(),
  };
}

// Funde perícias/atributos salvos por cima de uma progressão nova — nunca
// substitui o objeto inteiro. Assim, se uma versão futura do jogo adicionar
// uma perícia nova (como Comércio/Navegação/Sobrevivência viraram reais
// nesta mesma sessão), um save antigo que não conhece essa chave ainda
// ganha ela zerada, em vez de a chave simplesmente não existir e quebrar
// telas que esperam todo SKILL_KEYS presente.
function mergeProgression(saved) {
  const fresh = createProgression();
  if (!saved) return fresh;
  for (const key of Object.keys(fresh.skills)) {
    if (saved.skills?.[key]) fresh.skills[key] = saved.skills[key];
  }
  for (const key of Object.keys(fresh.attributes)) {
    if (saved.attributes?.[key]) fresh.attributes[key] = saved.attributes[key];
  }
  return fresh;
}

// Mesma ideia pras ilhas descobertas: união do save com as que já vêm
// desbloqueadas de fábrica hoje — se uma ilha nova virar "descoberta desde
// o início" numa atualização futura, quem já tinha save não fica sem ela
// só porque salvou antes dela existir.
function mergeDiscoveredIslands(saved) {
  const defaults = getDefaultDiscoveredIslands();
  const fromSave = Array.isArray(saved) ? saved.filter((id) => ISLANDS[id]) : [];
  return Array.from(new Set([...fromSave, ...defaults]));
}

function loadFromStorage() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // localStorage indisponível (aba privada, permissão negada) — segue sem save, não quebra o jogo
  }
  if (!raw) return null;

  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null; // save corrompido — ignora em vez de travar o boot
  }

  const equipState = createLayerState();
  if (saved.equippedLayerId) equipLayer(equipState, saved.equippedLayerId);

  const maxHp = saved.playerHealth?.max ?? PLAYER_MAX_HP;
  return {
    inventory: createInventory(saved.inventory?.items ?? { sword: 1, 'linha-de-nylon': 2, corda: 1, 'ferro-bruto': 3 }),
    berries: typeof saved.berries === 'number' ? saved.berries : 0,
    progression: mergeProgression(saved.progression),
    equipState,
    playerHealth: { max: maxHp, current: Math.min(saved.playerHealth?.current ?? maxHp, maxHp) },
    currentIslandId: ISLANDS[saved.currentIslandId] ? saved.currentIslandId : DEFAULT_ISLAND_ID,
    discoveredIslands: mergeDiscoveredIslands(saved.discoveredIslands),
    hotbarAssignments: mergeHotbarAssignments(saved.hotbarAssignments),
  };
}

// Só o que faz sentido sobreviver — nenhum timer de animação (equipState
// tem vários, todos transientes, sempre corretos recomeçar do zero).
function serialize(s) {
  return JSON.stringify({
    inventory: s.inventory,
    berries: s.berries,
    progression: s.progression,
    equippedLayerId: s.equipState.equippedLayerId,
    playerHealth: s.playerHealth,
    currentIslandId: s.currentIslandId,
    discoveredIslands: s.discoveredIslands,
    hotbarAssignments: s.hotbarAssignments,
  });
}

export function saveState() {
  if (!state) return;
  try {
    localStorage.setItem(STORAGE_KEY, serialize(state));
  } catch {
    // localStorage indisponível ou cheio — falha silenciosa, não é motivo
    // pra interromper o jogo por causa do save.
  }
}

export function getPlayerState() {
  if (!state) state = buildInitialState();
  return state;
}

// Só pra depuração/testes — recomeçar do zero sem recarregar a página.
export function resetPlayerState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem — sem localStorage, não tem o que limpar
  }
  state = buildInitialState();
  return state;
}

// Autosave — roda uma vez só (efeito de módulo, ver comentário no topo do
// arquivo sobre o singleton). Intervalo curto + beforeunload cobre tanto
// "fechou a aba direito" quanto "navegador travou"/recarregou sem aviso.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', saveState);
  setInterval(saveState, AUTOSAVE_INTERVAL_MS);
}
