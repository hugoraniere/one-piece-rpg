import './chestMenu.css';
import { toggleMenu } from './menuManager.js';
import { ITEM_DEFS } from '../sim/itemDefs.js';

// Baú — guarda/retira item livremente, sem filtro de categoria nem limite de
// capacidade (ver state/playerState.js#chestInventory: nasce com um estoque
// de TODOS os itens do jogo, pra dar pra testar/usar qualquer coisa sem
// depender só do que já foi coletado em campo). Duas grades lado a lado:
// clicar num item do Inventário manda 1 unidade pro Baú, clicar num item do
// Baú traz 1 unidade de volta — mesma convenção "1 por clique, clique
// repetido pra mais" já usada no botão de descartar do Inventário (ver
// inventoryMenu.js#slot-drop-btn).
const TOTAL_SLOTS = 18;

function renderGrid(items, hint) {
  const owned = Object.entries(items).filter(([, qty]) => qty > 0);
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const entry = owned[i];
    if (!entry) return `<div class="slot empty"></div>`;
    const [itemId, qty] = entry;
    const def = ITEM_DEFS[itemId];
    if (!def) return `<div class="slot empty"></div>`;
    const qtyHtml = qty > 1 ? `<span class="qty">x${qty}</span>` : '';
    const iconHtml = def.iconPath ? `<img src="${def.iconPath}" alt="${def.name}" class="item-icon">` : def.icon;
    const tooltipText = def.description ? `${def.name}\n${def.description}` : def.name;
    const tooltipHtml = def.description ? `<span class="tooltip-name">${def.name}</span><span class="tooltip-desc">${def.description}</span>` : `<span class="tooltip-name">${def.name}</span>`;
    return `<div class="slot chest-slot" data-item="${itemId}" title="${tooltipText}" data-tooltip="${def.name}">${iconHtml}${qtyHtml}<div class="tooltip-box">${tooltipHtml}</div></div>`;
  }).join('');
  return `<div class="inv-grid">${slots}</div>`;
}

function buildChestHtml(ctx) {
  return `
    <div class="menu-header">
      <span class="menu-title">Baú</span>
      <span class="menu-hint">Esc fecha</span>
      <button class="menu-close" aria-label="Fechar baú">✕</button>
    </div>
    <div class="chest-layout">
      <div class="chest-col">
        <h4>Seu Inventário</h4>
        ${renderGrid(ctx.inventory.items, 'clique pra guardar 1x')}
      </div>
      <div class="chest-arrows">⇄</div>
      <div class="chest-col">
        <h4>Baú</h4>
        ${renderGrid(ctx.chestInventory.items, 'clique pra tirar 1x')}
      </div>
    </div>
    <p class="chest-hint">Clique num item pra mover 1 unidade entre o Inventário e o Baú.</p>
  `;
}

function mountChestMenu(panel, ctx) {
  panel.innerHTML = buildChestHtml(ctx);

  const [invCol, chestCol] = panel.querySelectorAll('.chest-col');
  let draggedSlot = null;

  const addDragListeners = (col, moveCallback) => {
    col.querySelectorAll('.chest-slot').forEach((slot) => {
      slot.addEventListener('mousedown', () => {
        draggedSlot = slot;
        slot.classList.add('dragging');
      });

      slot.addEventListener('click', () => {
        moveCallback(slot.dataset.item);
        mountChestMenu(panel, ctx);
      });

      slot.addEventListener('mouseleave', () => {
        if (draggedSlot === slot) {
          slot.classList.remove('dragging');
          draggedSlot = null;
        }
      });

      slot.addEventListener('mouseup', () => {
        draggedSlot = null;
        slot.classList.remove('dragging');
      });
    });
  };

  addDragListeners(invCol, (itemId) => ctx.onMoveToChest(itemId));
  addDragListeners(chestCol, (itemId) => ctx.onMoveToInventory(itemId));

  panel.querySelector('.menu-close')?.addEventListener('click', () => {
    document.getElementById('menu-backdrop-bau')?.classList.remove('show');
  });
}

// `onMoveToChest(itemId)`/`onMoveToInventory(itemId)` movem 1 unidade por
// clique (ver handleMoveToChest/handleMoveToInventory em islandScene.js).
export function toggleChestMenu({ inventory, chestInventory, onMoveToChest, onMoveToInventory }) {
  toggleMenu('bau', (panel) => mountChestMenu(panel, { inventory, chestInventory, onMoveToChest, onMoveToInventory }));
}
