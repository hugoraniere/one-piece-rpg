import { createHealth } from '../sim/health.js';
import { createProgression } from '../sim/progression.js';
import { createInventory } from '../sim/inventory.js';
import { createLayerState, equipLayer } from '../character/layers.js';
import { PLAYER_MAX_HP } from '../config.js';
import { DEFAULT_ISLAND_ID, getDefaultDiscoveredIslands } from '../world/islands/index.js';

// Estado do jogador que precisa sobreviver a uma troca de ilha (scene.restart
// recria a IslandScene do zero, mas inventário/berries/progressão/equipamento
// não podem "zerar" só porque o jogador entrou num barco). Singleton lazy:
// criado uma vez na primeira vez que alguém pedir, devolvido por referência
// dali em diante — quem tem o objeto (a cena) só precisa mutar os campos
// dele, nunca reatribuir a variável, senão a próxima cena voltaria a pegar
// o objeto antigo por engano.
let state = null;

function buildInitialState() {
  const equipState = createLayerState();
  equipLayer(equipState, 'sword'); // equipada por padrão só pra já dar pra ver funcionando
  return {
    inventory: createInventory({ 'linha-de-nylon': 2 }),
    berries: 0,
    progression: createProgression(),
    equipState,
    playerHealth: createHealth(PLAYER_MAX_HP),
    currentIslandId: DEFAULT_ISLAND_ID,
    discoveredIslands: getDefaultDiscoveredIslands(),
  };
}

export function getPlayerState() {
  if (!state) state = buildInitialState();
  return state;
}

// Só pra depuração/testes — recomeçar do zero sem recarregar a página.
export function resetPlayerState() {
  state = buildInitialState();
  return state;
}
