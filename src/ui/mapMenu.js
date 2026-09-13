import { hideMenu, toggleMenu } from './menuManager.js';
import { ISLANDS } from '../world/islands/index.js';

// Arte pixel art de cada ilha (ver tools/gen_map_assets.py) — uma
// ilustração própria por ilha, refletindo o tema dela (porto, vila,
// floresta, pântano), não mais um blob de CSS genérico. Ilha sem entrada
// aqui (não deveria acontecer, mas por segurança) cai no genérico.
const ISLAND_ART = {
  'vila-do-mastro-partido': 'island-vila-do-mastro-partido.png',
  portomares: 'island-portomares.png',
  'floresta-sussurro': 'island-floresta-sussurro.png',
  'pantano-ronco': 'island-pantano-ronco.png',
};
const UNKNOWN_ART = 'island-unknown.png';
const MAP_ART_DIR = '/assets/map';

// Mapa de viagem de verdade — antes disto era quase-total placeholder (só
// linguagem visual: pergaminho, névoa, silhuetas nunca clicáveis, ver
// histórico do arquivo). Agora mostra as ilhas REALMENTE descobertas
// (ISLANDS + playerState.discoveredIslands, ver islandScene.js), clicáveis,
// com confirmação antes de zarpar (ui/sailingTransition.js faz o
// fade+scene.restart de verdade).
//
// Posições fixas (% do painel): a ilha atual sempre no slot 0 (centro, com
// o navio); as outras descobertas ocupam os slots seguintes na ordem em que
// foram visitadas. O resto dos slots continua com silhuetas nunca
// visitadas — mesma ideia visual de antes ("sabe que tem mais mundo lá
// fora"), só que agora o número de silhuetas encolhe conforme o jogador
// descobre lugares de verdade.
// Tops ficam <=60% pra sobrar espaço pro label (abaixo da arte) antes da
// faixa da legenda (.map-caption, fixa no rodapé do painel) — um slot mais
// baixo que isso faz o texto entrar embaixo da legenda (já aconteceu com
// Floresta Sussurro no slot 2 antes desse ajuste).
const KNOWN_SLOTS = [
  { top: '42%', left: '45%' },
  { top: '14%', left: '78%' },
  { top: '58%', left: '16%' },
  { top: '54%', left: '68%' },
];
const UNKNOWN_SLOTS = [
  { top: '10%', left: '13%' },
  { top: '68%', left: '85%' },
  { top: '46%', left: '92%' },
];

// Contexto da ilha atual — setado toda vez que o mapa abre (ver
// toggleMapMenu), já que toggleMenu() só repassa o elemento do painel pro
// render, não dados de jogo.
let context = null;
// Id da ilha aguardando confirmação de viagem, ou null (mapa em repouso).
let pendingDestinationId = null;

function renderCaption(panel) {
  const captionEl = panel.querySelector('#map-caption');
  if (!captionEl) return;
  const currentIsland = ISLANDS[context.currentIslandId];

  if (!pendingDestinationId) {
    captionEl.innerHTML = `${currentIsland.name} — ilha atual. Clique numa ilha descoberta pra viajar de navio, ou numa silhueta desconhecida pra zarpar às cegas.`;
    return;
  }

  // Ilha já descoberta: mostra o nome de verdade. Silhueta desconhecida:
  // NÃO revela o nome antes de chegar lá — é essa a diferença entre
  // "viajar" e "zarpar rumo ao desconhecido" (ver buildMapHtml).
  const isKnownDestination = context.discoveredIslands.includes(pendingDestinationId);
  const question = isKnownDestination ? `Viajar até ${ISLANDS[pendingDestinationId].name}?` : 'Zarpar rumo ao desconhecido?';
  captionEl.innerHTML = `
    <span>${question}</span>
    <button type="button" class="map-travel-confirm" data-action="confirm">Confirmar</button>
    <button type="button" class="map-travel-confirm" data-action="cancel">Cancelar</button>
  `;
  captionEl.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    hideMenu();
    context.onTravel(pendingDestinationId);
    pendingDestinationId = null;
  });
  captionEl.querySelector('[data-action="cancel"]').addEventListener('click', () => {
    pendingDestinationId = null;
    renderCaption(panel);
  });
}

function pct(value) {
  return parseFloat(value);
}

// Linhas de rota tracejadas, tipo tinta, ligando a ilha atual (sempre slot
// 0) a cada outra ilha já descoberta no mapa — reforça a leitura de "carta
// de navegação" em vez de ícones soltos no vazio. `viewBox="0 0 100 100"`
// deixa a matemática em % direta (cada slot já é dado em %).
function buildRoutesHtml(knownCount) {
  if (knownCount < 2) return '';
  const origin = KNOWN_SLOTS[0];
  const lines = [];
  for (let i = 1; i < knownCount; i++) {
    const dest = KNOWN_SLOTS[i] ?? KNOWN_SLOTS[KNOWN_SLOTS.length - 1];
    lines.push(`<line x1="${pct(origin.left)}" y1="${pct(origin.top)}" x2="${pct(dest.left)}" y2="${pct(dest.top)}" />`);
  }
  return `<svg class="map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${lines.join('')}</svg>`;
}

function buildMapHtml() {
  const others = context.discoveredIslands.filter((id) => id !== context.currentIslandId);
  const knownIds = [context.currentIslandId, ...others];

  const islandsHtml = knownIds
    .map((id, i) => {
      const island = ISLANDS[id];
      const pos = KNOWN_SLOTS[i] ?? KNOWN_SLOTS[KNOWN_SLOTS.length - 1];
      const isCurrent = id === context.currentIslandId;
      const art = ISLAND_ART[id] ?? UNKNOWN_ART;
      return `
        <div class="map-island${isCurrent ? '' : ' map-island-travelable'}" data-island-id="${id}" style="top:${pos.top};left:${pos.left}">
          <img class="map-island-art" src="${MAP_ART_DIR}/${art}" alt="" />
          ${isCurrent ? `<img class="map-ship" src="${MAP_ART_DIR}/ship.png" alt="" />` : ''}
          <span class="map-island-label">${island.name}</span>
        </div>`;
    })
    .join('');

  // Silhuetas desconhecidas — antes eram só decorativas (nenhuma ilha de
  // verdade por trás). Agora, as primeiras `undiscoveredIds.length` slots
  // apontam pra ilhas reais que existem no registro mas ainda não foram
  // visitadas (ver PANTANO_RONCO, discoveredByDefault: false) — clicáveis,
  // sem mostrar nome (ver renderCaption). O resto continua puramente
  // decorativo — "sabe que tem mais mundo lá fora" sem prometer nada.
  const undiscoveredIds = Object.keys(ISLANDS).filter((id) => !context.discoveredIslands.includes(id));
  const unknownCount = Math.max(0, UNKNOWN_SLOTS.length - Math.max(0, knownIds.length - 1));
  const unknownHtml = UNKNOWN_SLOTS.slice(0, unknownCount)
    .map((pos, i) => {
      const targetId = undiscoveredIds[i];
      const travelable = targetId ? ' map-unknown-travelable' : '';
      const dataAttr = targetId ? ` data-island-id="${targetId}"` : '';
      return `<img class="map-unknown-island${travelable}"${dataAttr} src="${MAP_ART_DIR}/${UNKNOWN_ART}" alt="" style="top:${pos.top};left:${pos.left}" />`;
    })
    .join('');

  return `
    <div class="map-header">
      <span class="menu-title">Mapa</span>
      <div class="map-header-right">
        <span class="menu-hint">Esc ou M fecha</span>
        <button type="button" class="map-close" data-action="close" aria-label="Fechar mapa">×</button>
      </div>
    </div>
    <div class="map-fog"></div>
    ${buildRoutesHtml(knownIds.length)}
    ${islandsHtml}
    ${unknownHtml}
    <img class="map-compass" src="${MAP_ART_DIR}/compass.png" alt="" />
    <div class="map-caption" id="map-caption"></div>
  `;
}

function mountMapMenu(panel) {
  panel.classList.add('map-mode');
  pendingDestinationId = null;
  panel.innerHTML = buildMapHtml();
  renderCaption(panel);

  panel.querySelector('.map-close').addEventListener('click', () => hideMenu());

  panel.querySelectorAll('.map-island-travelable, .map-unknown-travelable').forEach((el) => {
    el.addEventListener('click', () => {
      pendingDestinationId = el.dataset.islandId;
      renderCaption(panel);
    });
  });
}

// `context = { currentIslandId, discoveredIslands, onTravel }` — ver
// openMapMenu em islandScene.js, que monta isso a partir de
// this.islandConfig.id e getPlayerState().discoveredIslands.
export function toggleMapMenu(newContext) {
  context = newContext;
  toggleMenu('mapa', mountMapMenu);
}
