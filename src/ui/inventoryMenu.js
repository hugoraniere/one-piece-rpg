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

// Nome/ícone de exibição do que está na mão — arma OU ferramenta, é o
// mesmo slot único (ver character/layers.js: equipState só guarda UM
// equippedLayerId por vez, trocar de vara pra espada substitui, nunca
// soma). Deriva de ITEM_DEFS por busca reversa (equipLayerId → item) em
// vez de manter uma tabela própria — agora que a espada também é item de
// inventário normal (ver ITEMS_PROGRESS.md), ITEM_DEFS já tem tudo que
// precisa (name/iconPath), duplicar aqui só arriscaria os dois saírem de
// sincronia quando um item novo aparecer.
const ITEM_BY_EQUIP_LAYER = Object.fromEntries(
  Object.entries(ITEM_DEFS)
    .filter(([, def]) => def.equipLayerId)
    .map(([itemId, def]) => [def.equipLayerId, itemId]),
);
function equippedItemDef(equipState) {
  const itemId = ITEM_BY_EQUIP_LAYER[equipState.equippedLayerId];
  return itemId ? ITEM_DEFS[itemId] : null;
}
function equippedLabel(equipState) {
  return equippedItemDef(equipState)?.name ?? 'Vazio';
}
function equippedIcon(equipState) {
  return equippedItemDef(equipState)?.iconPath ?? '/assets/icons/sword.png';
}

function renderItemsTab(ctx) {
  const { inventory, equipState } = ctx;
  const hotbarEditMode = ctx.getHotbarEditMode();
  const pendingHotbarAssignItemId = ctx.getPendingHotbarAssignItemId();
  const owned = Object.entries(inventory.items).filter(([, qty]) => qty > 0);

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
    const entry = owned[i];
    if (!entry) return `<div class="slot empty" data-cat="vazio"></div>`;
    const [itemId, qty] = entry;
    const def = ITEM_DEFS[itemId];
    if (!def) return `<div class="slot empty" data-cat="vazio"></div>`;
    const qtyHtml = qty > 1 ? `<span class="qty">x${qty}</span>` : '';
    const equipable = Boolean(def.equipLayerId);
    const equipped = equipable && equipState.equippedLayerId === def.equipLayerId;
    const selecting = equipable && hotbarEditMode && itemId === pendingHotbarAssignItemId;
    // Título muda com o modo — "Organizar Hotbar" ligado quer dizer que o
    // clique escolhe o item pra atribuir a um slot, não equipa direto (ver
    // mountInventoryMenu abaixo).
    const title = equipable ? (hotbarEditMode ? `${def.name} — clique pra escolher pra hotbar` : `${def.name} — clique pra equipar/desequipar`) : def.name;
    // Botão de descartar — próprio elemento (não o slot inteiro) pra não
    // brigar com o clique de equipar/selecionar-pra-hotbar do slot; o
    // handler dele chama stopPropagation (ver mountInventoryMenu). Some 1
    // unidade por clique (ver handleDropItem em islandScene.js) — sem
    // seletor de quantidade de propósito, clique repetido é simples o
    // bastante pra descartar mais de uma.
    const dropBtn = `<button class="slot-drop-btn" data-drop-item="${itemId}" title="Descartar 1x ${def.name}">✕</button>`;
    const iconHtml = def.iconPath ? `<img src="${def.iconPath}" alt="${def.name}" class="item-icon">` : def.icon;
    return `<div class="slot${equipable ? ' equipable' : ''}${equipped ? ' equipped' : ''}${selecting ? ' selecting' : ''}" data-cat="${def.category}" data-item="${itemId}" title="${title}">${iconHtml}${qtyHtml}${dropBtn}</div>`;
  }).join('');

  return `
    <div class="inv-layout">
      <div class="inv-equip">
        <h4>Equipado</h4>
        <div class="paperdoll-silhouette"></div>
        <div class="eq-slots">
          <div class="eq-slot" title="Arma ou ferramenta equipada">
            <div class="icon-badge"><img class="icon pixel-icon" src="${equippedIcon(equipState)}" alt="${equippedLabel(equipState)}"></div>
            <div><div class="label">Mão</div><div class="value">${equippedLabel(equipState)}</div></div>
          </div>
          <div class="eq-slot" title="Roupa/armadura (em breve)">
            <div class="icon-badge">${iconSvg('roupa')}</div>
            <div><div class="label">Roupa</div><div class="value">Vazio</div></div>
          </div>
          <div class="eq-slot" title="Acessório especial (em breve)">
            <div class="icon-badge">${iconSvg('vazio')}</div>
            <div><div class="label">Acessório</div><div class="value">Vazio</div></div>
          </div>
        </div>
        <button class="hotbar-edit-toggle${hotbarEditMode ? ' active' : ''}" id="inv-hotbar-edit-toggle" title="Clique para atribuir items aos slots de atalho (1-9, 0)">
          ${hotbarEditMode ? 'Organizando Hotbar ✕' : 'Organizar Hotbar'}
        </button>
        ${
          hotbarEditMode
            ? `<p class="hotbar-edit-hint">${
                pendingHotbarAssignItemId
                  ? `Clique num slot da hotbar (o de baixo, no jogo) pra colocar ${ITEM_DEFS[pendingHotbarAssignItemId]?.name ?? 'o item'} lá.`
                  : 'Clique num item equipável aqui, depois num slot da hotbar pra atribuir. Clique num slot já atribuído a esse item pra remover.'
              }</p>`
            : ''
        }
      </div>
      <div class="inv-main">
        <div class="filters">
          <button class="filter-pill active" data-cat="tudo" title="Mostra todos os itens do inventário">Tudo</button>
          <button class="filter-pill" data-cat="armas" title="Armas para combate">Armas</button>
          <button class="filter-pill" data-cat="ferramentas" title="Ferramentas para coleta e pesca">Ferramentas</button>
          <button class="filter-pill" data-cat="comida" title="Alimentos para vender">Comida</button>
          <button class="filter-pill" data-cat="materiais" title="Materiais para fabricação">Materiais</button>
          <button class="filter-pill" data-cat="missao" title="Itens de missão">Missão</button>
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
      const iconHtml = def.iconPath ? `<img src="${def.iconPath}" alt="${def.name}" class="item-icon">` : def.icon;
      return `<span class="craft-input${enough ? '' : ' missing'}">${iconHtml} ${def.name} ${have}/${input.qty}</span>`;
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
  const tabTitles = { itens: 'Ver e gerenciar seus itens', fabricar: 'Combinar itens para criar novos' };
  const tabButtons = TABS.map((t, i) => `<button class="char-tab${i === 0 ? ' active' : ''}" data-tab="${t.key}" title="${tabTitles[t.key]}">${t.label}</button>`).join('');
  const renderers = { itens: renderItemsTab, fabricar: renderCraftTab };
  const pages = TABS.map((t, i) => `<div class="char-page${i === 0 ? ' active' : ''}" data-page="${t.key}">${renderers[t.key](ctx)}</div>`).join('');

  return `
    <div class="menu-header">
      <span class="menu-title">Inventário</span>
      <span class="menu-hint">Esc ou I fecha</span>
      <button class="menu-close" aria-label="Fechar inventário">✕</button>
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
      // Modo "Organizar Hotbar" ligado: o clique SELECIONA o item pra
      // atribuir a um slot (o clique que de fato atribui é na hotbar de
      // verdade, fora deste painel — ver onHotbarSlotClick em
      // islandScene.js) — não equipa/desequipa direto.
      if (ctx.getHotbarEditMode()) {
        ctx.onSelectForHotbar(itemId);
        mountInventoryMenu(panel, ctx);
        return;
      }
      ctx.onEquip(itemId);
      mountInventoryMenu(panel, ctx);
      // Só pisca se o clique EQUIPOU (não desequipar) — "acabei de equipar
      // algo" merece destaque, "guardei de volta" não precisa.
      const newSlot = panel.querySelector(`.slot[data-item="${itemId}"]`);
      flashOnce(newSlot?.classList.contains('equipped') ? newSlot : null);
    });
  });

  panel.querySelectorAll('.slot-drop-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // não deixa o clique "vazar" pro slot por baixo (equiparia/selecionaria pra hotbar sem querer)
      ctx.onDropItem(btn.dataset.dropItem);
      mountInventoryMenu(panel, ctx);
    });
  });

  panel.querySelector('#inv-hotbar-edit-toggle')?.addEventListener('click', () => {
    ctx.onToggleHotbarEditMode();
    mountInventoryMenu(panel, ctx);
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

  panel.querySelector('.menu-close')?.addEventListener('click', () => {
    document.getElementById('menu-backdrop-inventario')?.classList.remove('show');
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
// item já equipado desequipa); `onCraft(recipeId)` tenta fabricar;
// `onDropItem(itemId)` descarta 1 unidade pro chão (ver world/
// groundItems.js); `onToggleHotbarEditMode()`/`onSelectForHotbar(itemId)`
// controlam o modo "Organizar Hotbar" (ver comentário em renderItemsTab).
// Todos vivem em islandScene.js — este módulo só monta HTML e delega.
export function toggleInventoryMenu({
  inventory,
  equipState,
  onEquip,
  onCraft,
  onDropItem,
  getHotbarEditMode,
  getPendingHotbarAssignItemId,
  onToggleHotbarEditMode,
  onSelectForHotbar,
}) {
  toggleMenu('inventario', (panel) =>
    mountInventoryMenu(panel, {
      inventory,
      equipState,
      onEquip,
      onCraft,
      onDropItem,
      getHotbarEditMode,
      getPendingHotbarAssignItemId,
      onToggleHotbarEditMode,
      onSelectForHotbar,
    }),
  );
}
