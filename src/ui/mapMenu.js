import { toggleMenu } from './menuManager.js';

// Mapa — PLACEHOLDER quase total: o jogo hoje só tem um lugar (a vila/praia
// onde tudo acontece), sem viagem por navio nem outras ilhas ainda. Isso só
// existe pra deixar a linguagem visual (pergaminho + névoa + "sem viagem
// rápida") pronta pra quando houver mais de um lugar de verdade pra
// mostrar. Tecla M, fora do Menu (ver conversa de design no wireframe).
// Posições fixas (% do painel) das ilhas nunca visitadas — só silhueta, sem
// nome (ver .map-unknown-island no CSS pro porquê). Uma delas (a de cima à
// direita) ganha uma rota pontilhada saindo da Vila, pra sugerir "pra lá
// dá pra navegar" sem prometer nenhum destino específico ainda.
const UNKNOWN_ISLANDS = [
  { top: '12%', left: '13%' },
  { top: '16%', left: '78%' },
  { top: '76%', left: '20%' },
  { top: '80%', left: '76%' },
  { top: '48%', left: '92%' },
];

function buildMapHtml() {
  const islandsHtml = UNKNOWN_ISLANDS.map(
    (pos) => `<div class="map-unknown-island" style="top:${pos.top};left:${pos.left}"></div>`
  ).join('');

  return `
    <div class="map-header">
      <span class="menu-title">Mapa</span>
      <span class="menu-hint">Esc ou M fecha</span>
    </div>
    <div class="map-chart-lines"></div>
    <div class="map-fog"></div>
    ${islandsHtml}
    <svg class="map-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M 47 46 Q 62 32 76 20" />
    </svg>
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
    <div class="map-island">
      <div class="map-island-shape"></div>
      <svg class="map-ship" style="top:6px;left:26px" aria-hidden="true"><use href="#i-navio"></use></svg>
    </div>
    <div class="map-caption">Vila do Mastro Partido — único lugar descoberto até agora. Sem viagem rápida: novas ilhas vão precisar de navio de verdade.</div>
  `;
}

function mountMapMenu(panel) {
  panel.classList.add('map-mode');
  panel.innerHTML = buildMapHtml();
}

export function toggleMapMenu() {
  toggleMenu('mapa', mountMapMenu);
}
