import { toggleMenu } from './menuManager.js';
import { ITEM_DEFS } from '../sim/itemDefs.js';
import { RECIPES, canCraft } from '../sim/crafting.js';
import { getQuantity } from '../sim/inventory.js';

const TOTAL_SLOTS = 18;

const TABS = [
  { key: 'itens', label: 'Itens' },
  { key: 'fabricar', label: 'Fabricar' },
];

function iconSvg(key) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${key}"></use></svg>`;
}

// Nome de exibição do que está na mão — arma OU ferramenta, é o mesmo slot
// único (ver character/layers.js: equipState só guarda UM equippedLayerId
// por vez, trocar de vara pra espada substitui, nunca soma).
function equippedLabel(equipState) {
  if (equipState.equippedLayerId === 'sword') return 'Cutlass de Ferro';
  if (equipState.equippedLayerId === 'vara-de-pescar') return 'Vara de Pescar';
  return 'Vazio';
}

function renderItemsTab(ctx) {
  const { inventory, equipState } = ctx;
  const owned = Object.entries(inventory.items).filter(([, qty]) => qty > 0);

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const entry = owned[i];
    if (!entry) return `<div class="slot empty" data-cat="vazio"></div>`;
    const [itemId, qty] = entry;
    const def = ITEM_DEFS[itemId];
    if (!def) return `<div class="slot empty" data-cat="vazio"></div>`;
    const qtyHtml = qty > 1 ? `<span class="qty">x${qty}</span>` : '';
    const equipped = def.equipLayerId && equipState.equippedLayerId === def.equipLayerId;
    const equipable = Boolean(def.equipLayerId);
    return `<div class="slot${equipable ? ' equipable' : ''}${equipped ? ' equipped' : ''}" data-cat="${def.category}" data-item="${itemId}" title="${def.name}${equipable ? ' — clique pra equipar/desequipar' : ''}">${def.icon}${qtyHtml}</div>`;
  }).join('');

  return `
    <div class="inv-layout">
      <div class="inv-equip">
        <h4>Equipado</h4>
        <div class="paperdoll-silhouette"></div>
        <div class="eq-slots">
          <div class="eq-slot">
            <div class="icon-badge">${iconSvg('espada')}</div>
            <div><div class="label">Mão</div><div class="value">${equippedLabel(equipState)}</div></div>
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
          <button class="filter-pill" data-cat="ferramentas">Ferramentas</button>
          <button class="filter-pill" data-cat="comida">Comida</button>
          <button class="filter-pill" data-cat="materiais">Materiais</button>
          <button class="filter-pill" data-cat="missao">Missão</button>
        </div>
        <div class="inv-grid">${slots}</div>
        <div class="inv-footer">
          <span>${owned.length}/${TOTAL_SLOTS} slots ocupados</span>
        </div>
      </div>
    </div>
  `;
}

function craftRow(recipe, inventory) {
  const outputDef = ITEM_DEFS[recipe.output.itemId];
  const ok = canCraft(inventory, recipe);
  const inputsHtml = recipe.inputs
    .map((input) => {
      const def = ITEM_DEFS[input.itemId];
      const have = getQuantity(inventory, input.itemId);
      const enough = have >= input.qty;
      return `<span class="craft-input${enough ? '' : ' missing'}">${def.icon} ${def.name} ${have}/${input.qty}</span>`;
    })
    .join('<span class="craft-plus">+</span>');

  return `
    <div class="craft-row${ok ? '' : ' disabled'}">
      <div class="craft-icon">${outputDef.icon}</div>
      <div class="craft-body">
        <div class="craft-name">${outputDef.name}</div>
        <div class="craft-inputs">${inputsHtml}</div>
      </div>
      <button class="craft-btn" data-recipe="${recipe.id}" ${ok ? '' : 'disabled'}>Fabricar</button>
    </div>`;
}

function renderCraftTab(ctx) {
  const rows = RECIPES.map((recipe) => craftRow(recipe, ctx.inventory)).join('');
  return `<div class="craft-list">${rows}</div>`;
}

function buildInventoryHtml(ctx) {
  const tabButtons = TABS.map((t, i) => `<button class="char-tab${i === 0 ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('');
  const renderers = { itens: renderItemsTab, fabricar: renderCraftTab };
  const pages = TABS.map((t, i) => `<div class="char-page${i === 0 ? ' active' : ''}" data-page="${t.key}">${renderers[t.key](ctx)}</div>`).join('');

  return `
    <div class="menu-header">
      <span class="menu-title">Inventário</span>
      <span class="menu-hint">Esc ou I fecha</span>
    </div>
    <div class="char-tabs">${tabButtons}</div>
    ${pages}
  `;
}

function mountInventoryMenu(panel, ctx) {
  panel.innerHTML = buildInventoryHtml(ctx);

  panel.querySelector('.char-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.char-tab');
    if (!btn) return;
    panel.querySelectorAll('.char-tab').forEach((t) => t.classList.toggle('active', t === btn));
    panel.querySelectorAll('.char-page').forEach((p) => p.classList.toggle('active', p.dataset.page === btn.dataset.tab));
  });

  panel.querySelector('.filters')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-pill');
    if (!btn) return;
    panel.querySelectorAll('.filter-pill').forEach((p) => p.classList.toggle('active', p === btn));
    const cat = btn.dataset.cat;
    panel.querySelectorAll('.inv-grid .slot').forEach((s) => {
      const match = cat === 'tudo' || s.dataset.cat === cat || s.dataset.cat === 'vazio';
      s.classList.toggle('dim', !match);
    });
  });

  panel.querySelectorAll('.slot.equipable').forEach((slot) => {
    slot.addEventListener('click', () => {
      const itemId = slot.dataset.item;
      ctx.onEquip(itemId);
      mountInventoryMenu(panel, ctx);
      // Só pisca se o clique EQUIPOU (não desequipar) — "acabei de equipar
      // algo" merece destaque, "guardei de volta" não precisa.
      const newSlot = panel.querySelector(`.slot[data-item="${itemId}"]`);
      flashOnce(newSlot?.classList.contains('equipped') ? newSlot : null);
    });
  });

  panel.querySelectorAll('.craft-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const recipeId = btn.dataset.recipe;
      const success = ctx.onCraft(recipeId);
      mountInventoryMenu(panel, ctx);
      const newRow = success ? panel.querySelector(`.craft-btn[data-recipe="${recipeId}"]`)?.closest('.craft-row') : null;
      flashOnce(newRow);
    });
  });
}

// Confirmação de "isso acabou de acontecer" sem precisar de um toast por
// cima do menu — pisca a própria linha/slot que mudou (ver conversa de
// design: fabricar/equipar não davam nenhum feedback antes disso).
function flashOnce(el) {
  if (!el) return;
  el.classList.remove('just-changed');
  void el.offsetWidth;
  el.classList.add('just-changed');
  setTimeout(() => el.classList.remove('just-changed'), 700);
}

// `onEquip(itemId)` alterna equipar/desequipar (chamando de novo no mesmo
// item já equipado desequipa); `onCraft(recipeId)` tenta fabricar. Os dois
// vivem em villageScene.js — este módulo só monta HTML e delega.
export function toggleInventoryMenu({ inventory, equipState, onEquip, onCraft }) {
  toggleMenu('inventario', (panel) => mountInventoryMenu(panel, { inventory, equipState, onEquip, onCraft }));
}
