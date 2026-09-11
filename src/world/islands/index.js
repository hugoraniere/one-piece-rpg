import { VILA_DO_MASTRO_PARTIDO } from './vilaDoMastroPartido.js';
import { PORTOMARES } from './portomares.js';
import { FLORESTA_SUSSURRO } from './florestaSussurro.js';
import { PANTANO_RONCO } from './pantanoRonco.js';

// Registro de ilhas jogáveis — cada uma é um arquivo de config próprio (ver
// vilaDoMastroPartido.js pro formato completo). Adicionar uma ilha nova é só
// mais uma entrada aqui (import + linha no objeto), não código novo em
// nenhum outro lugar — scene, mapa, sistema de água etc. já leem tudo daqui.
export const DEFAULT_ISLAND_ID = VILA_DO_MASTRO_PARTIDO.id;

export const ISLANDS = {
  [VILA_DO_MASTRO_PARTIDO.id]: VILA_DO_MASTRO_PARTIDO,
  [PORTOMARES.id]: PORTOMARES,
  [FLORESTA_SUSSURRO.id]: FLORESTA_SUSSURRO,
  [PANTANO_RONCO.id]: PANTANO_RONCO,
};

// Ilhas visíveis/clicáveis no mapa desde o início — ver
// islandConfig.discoveredByDefault e state/playerState.js.
export function getDefaultDiscoveredIslands() {
  return Object.values(ISLANDS)
    .filter((island) => island.discoveredByDefault)
    .map((island) => island.id);
}

export function getIsland(id) {
  return ISLANDS[id] ?? ISLANDS[DEFAULT_ISLAND_ID];
}
