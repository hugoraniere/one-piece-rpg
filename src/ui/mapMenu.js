import { toggleMenu } from './menuManager.js';

// Mapa — PLACEHOLDER quase total: o jogo hoje só tem um lugar (a vila/praia
// onde tudo acontece), sem viagem por navio nem outras ilhas ainda. Isso só
// existe pra deixar a linguagem visual (pergaminho + névoa + "sem viagem
// rápida") pronta pra quando houver mais de um lugar de verdade pra
// mostrar. Tecla M, fora do Menu (ver conversa de design no wireframe).
function buildMapHtml() {
  return `
    <div class="map-header">
      <span class="menu-title">Mapa</span>
      <span class="menu-hint">Esc ou M fecha</span>
    </div>
    <div class="map-fog"></div>
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
