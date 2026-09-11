import { hideMenu, toggleMenu } from './menuManager.js';
import { ISLANDS } from '../world/islands/index.js';

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
const KNOWN_SLOTS = [
  { top: '45%', left: '45%' },
  { top: '16%', left: '78%' },
  { top: '76%', left: '20%' },
];
const UNKNOWN_SLOTS = [
  { top: '12%', left: '13%' },
  { top: '80%', left: '76%' },
  { top: '48%', left: '92%' },
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
    captionEl.innerHTML = `${currentIsland.name} — ilha atual. Clique numa ilha descoberta pra viajar de navio.`;
    return;
  }

  const destination = ISLANDS[pendingDestinationId];
  captionEl.innerHTML = `
    <span>Viajar até ${destination.name}?</span>
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

function buildMapHtml() {
  const others = context.discoveredIslands.filter((id) => id !== context.currentIslandId);
  const knownIds = [context.currentIslandId, ...others];

  const islandsHtml = knownIds
    .map((id, i) => {
      const island = ISLANDS[id];
      const pos = KNOWN_SLOTS[i] ?? KNOWN_SLOTS[KNOWN_SLOTS.length - 1];
      const isCurrent = id === context.currentIslandId;
      return `
        <div class="map-island${isCurrent ? '' : ' map-island-travelable'}" data-island-id="${id}" style="top:${pos.top};left:${pos.left}">
          <div class="map-island-shape"></div>
          ${isCurrent ? '<svg class="map-ship" aria-hidden="true"><use href="#i-navio"></use></svg>' : ''}
          <span class="map-island-label">${island.name}</span>
        </div>`;
    })
    .join('');

  // Preenche os slots restantes (até um total de 5, contando os conhecidos)
  // com silhuetas nunca visitadas — mesma quantidade de antes quando só
  // existia uma ilha descoberta.
  const unknownCount = Math.max(0, UNKNOWN_SLOTS.length - Math.max(0, knownIds.length - 1));
  const unknownHtml = UNKNOWN_SLOTS.slice(0, unknownCount)
    .map((pos) => `<div class="map-unknown-island" style="top:${pos.top};left:${pos.left}"></div>`)
    .join('');

  return `
    <div class="map-header">
      <span class="menu-title">Mapa</span>
      <span class="menu-hint">Esc ou M fecha</span>
    </div>
    <div class="map-chart-lines"></div>
    <div class="map-fog"></div>
    ${islandsHtml}
    ${unknownHtml}
    <svg class="map-compass" viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="1.2">
        <circle cx="20" cy="20" r="17" opacity="0.5" />
        <path d="M20 4 L23 18 L20 20 L17 18 Z" fill="currentColor" stroke="none" />
        <path d="M20 36 L23 22 L20 20 L17 22 Z" fill="currentColor" stroke="none" opacity="0.6" />
        <path d="M4 20 L18 17 L20 20 L18 23 Z" fill="currentColor" stroke="none" opacity="0.6" />
        <path d="M36 20 L22 17 L20 20 L22 23 Z" fill="currentColor" stroke="none" opacity="0.6" />
      </g>
      <text x="20" y="12" font-size="5" fill="currentColor" text-anchor="middle">N</text>
    </svg>
    <div class="map-caption" id="map-caption"></div>
  `;
}

function mountMapMenu(panel) {
  panel.classList.add('map-mode');
  pendingDestinationId = null;
  panel.innerHTML = buildMapHtml();
  renderCaption(panel);

  panel.querySelectorAll('.map-island-travelable').forEach((el) => {
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
