import { toggleMenu } from './menuManager.js';

// Itens da mochila — PLACEHOLDER (ver menuData.js pro mesmo aviso). Ícones
// de item continuam emoji por enquanto: são artes por-item de verdade mais
// pra frente, diferente dos ícones de UI (atributos/perícias), que já usam
// o sprite do game-icons.net.
const ITEMS = [
  { icon: '🗡️', cat: 'armas', qty: 1 },
  { icon: '🔫', cat: 'armas', qty: 1 },
  { icon: '🔱', cat: 'armas', qty: 1 },
  { icon: '🍖', cat: 'comida', qty: 4 },
  { icon: '🐟', cat: 'comida', qty: 2 },
  { icon: '💧', cat: 'comida', qty: 3 },
  { icon: '🍶', cat: 'comida', qty: 1 },
  { icon: '🩹', cat: 'materiais', qty: 5 },
  { icon: '🧵', cat: 'materiais', qty: 2 },
  { icon: '🔩', cat: 'materiais', qty: 8 },
  { icon: '🪵', cat: 'materiais', qty: 6 },
  { icon: '💣', cat: 'materiais', qty: 3 },
  { icon: '🗺️', cat: 'missao', qty: 1 },
  { icon: '🔑', cat: 'missao', qty: 1 },
];
const TOTAL_SLOTS = 18;

function iconSvg(key) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${key}"></use></svg>`;
}

function buildInventoryHtml(equipState) {
  const weaponEquipped = equipState.equippedLayerId === 'sword';

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const it = ITEMS[i];
    if (!it) return `<div class="slot empty" data-cat="vazio"></div>`;
    const qty = it.qty > 1 ? `<span class="qty">x${it.qty}</span>` : '';
    return `<div class="slot" data-cat="${it.cat}">${it.icon}${qty}</div>`;
  }).join('');

  return `
    <div class="menu-header">
      <span class="menu-title">Inventário</span>
      <span class="menu-hint">Esc ou I fecha</span>
    </div>
    <div class="inv-layout">
      <div class="inv-equip">
        <h4>Equipado</h4>
        <div class="paperdoll-silhouette"></div>
        <div class="eq-slots">
          <div class="eq-slot">
            <div class="icon-badge">${iconSvg('espada')}</div>
            <div><div class="label">Arma</div><div class="value">${weaponEquipped ? 'Cutlass de Ferro' : 'Vazio'}</div></div>
          </div>
          <div class="eq-slot">
            <div class="icon-badge">${iconSvg('roupa')}</div>
            <div><div class="label">Roupa</div><div class="value">Vazio</div></div>
          </div>
          <div class="eq-slot">
            <div class="icon-badge">${iconSvg('vazio')}</div>
            <div><div class="label">Acessório</div><div class="value">Vazio</div></div>
          </div>
        </div>
      </div>
      <div class="inv-main">
        <div class="filters">
          <button class="filter-pill active" data-cat="tudo">Tudo</button>
          <button class="filter-pill" data-cat="armas">Armas</button>
          <button class="filter-pill" data-cat="comida">Comida</button>
          <button class="filter-pill" data-cat="materiais">Materiais</button>
          <button class="filter-pill" data-cat="missao">Missão</button>
        </div>
        <div class="inv-grid">${slots}</div>
        <div class="inv-footer">
          <span>${ITEMS.length}/${TOTAL_SLOTS} slots ocupados</span>
        </div>
      </div>
    </div>
  `;
}

function mountInventoryMenu(panel, equipState) {
  panel.innerHTML = buildInventoryHtml(equipState);

  panel.querySelector('.filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    panel.querySelectorAll('.filter-pill').forEach((p) => p.classList.toggle('active', p === btn));
    const cat = btn.dataset.cat;
    panel.querySelectorAll('.inv-grid .slot').forEach((s) => {
      const match = cat === 'tudo' || s.dataset.cat === cat || s.dataset.cat === 'vazio';
      s.classList.toggle('dim', !match);
    });
  });
}

export function toggleInventoryMenu(equipState) {
  toggleMenu('inventario', (panel) => mountInventoryMenu(panel, equipState));
}
