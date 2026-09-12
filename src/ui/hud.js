import './hud.css';
import { injectMoodleIcons } from './icons.js';
import { hasItem } from '../sim/inventory.js';
import { ITEM_DEFS } from '../sim/itemDefs.js';

// HUD de exploração — sobreposto ao canvas via #hud-overlay (ver
// index.html), não desenhado com Phaser. Mais fácil de estilar em HTML/CSS
// e reaproveita o mesmo visual (madeira + pergaminho) do wireframe de UI.
//
// Moodles (fome/sede/sono/etc) já vêm prontos aqui, mas nenhum sistema do
// jogo ainda produz esses estados — fica exposto por setMoodle() pra quando
// a sobrevivência (fome, sede, sono) for implementada.
const MOODLE_DEFS = [
  { key: 'fome', severity: 'bad-1', label: 'Faminto — carga reduzida' },
  { key: 'sede', severity: 'bad-2', label: 'Muito sedento — atributos -2' },
  { key: 'sono', severity: 'bad-1', label: 'Cansado — Destreza -1' },
  { key: 'bem-alimentado', severity: 'good', label: 'Bem alimentado — +1 Vitalidade (2h)' },
  { key: 'hidratado', severity: 'good', label: 'Hidratado' },
  { key: 'descansado', severity: 'good', label: 'Descansado' },
  { key: 'sobrecarregado', severity: 'bad-2', label: 'Sobrecarregado — movimento mais lento' },
  { key: 'ferido', severity: 'bad-2', label: 'Ferido — sangrando aos poucos' },
];

// Hotbar — 10 slots genéricos (teclas 1-9, 0), nenhum item fixo por slot.
// Cada slot mostra o que o JOGADOR atribuiu ali (ver hotbarAssignments em
// state/playerState.js, atribuído pelo modo "Organizar Hotbar" do
// Inventário — ver inventoryMenu.js) — a trava é só "você tem o item no
// inventário agora?" (ver setHotbarState), não mais um `equipLayerId`
// fixo por posição. Puramente posicional: id/atalho de teclado, nada mais.
const HOTBAR_SLOTS = Array.from({ length: 10 }, (_, i) => ({
  id: `slot${i + 1}`,
  shortcut: i === 9 ? '0' : String(i + 1),
}));

// Mesma ideia da hotbar: qualquer botão clicável que também tem atalho de
// teclado mostra o indicador — não só a hotbar. `id` bate com o
// `data-menu`/chave de handler que bindMenuButtons já esperava.
const MENU_BUTTONS = [
  { id: 'personagem', shortcut: 'C', iconSymbol: 'personagem', title: 'Personagem' },
  { id: 'inventario', shortcut: 'I', iconSymbol: 'inventario', title: 'Inventário' },
  { id: 'mapa', shortcut: 'M', iconSymbol: 'mapa', title: 'Mapa' },
];

// Badge do atalho — fundo escuro sólido próprio, não a cor de texto do
// slot por baixo. Um slot de hotbar claro (madeira) ou um menu-btn também
// claro (creme) deixava o número quase invisível (creme sobre creme,
// achado em revisão de contraste); com chip escuro próprio o número
// sempre lê, não importa o fundo por trás.
function shortcutBadge(shortcut) {
  return `<span class="shortcut-badge">${shortcut}</span>`;
}

let hpFrameEl;
let hpFillEl;
let hpNumEl;
let berriesFrameEl;
let berriesEl;
let moodleTrayEl;
let minimapDotEl;
let hotbarEls = {};
let lastHp = null;
let lastBerries = null;

export function initHud() {
  injectMoodleIcons();

  let overlay = document.getElementById('hud-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'hud-overlay';
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div class="hud-topleft">
      <div class="hp-frame">
        <span class="hp-label">Vida</span>
        <div class="hp-bar"><div class="hp-fill" id="hud-hp-fill"></div></div>
        <span class="hp-num" id="hud-hp-num"></span>
      </div>
      <div class="berries"><span class="coin"></span><span id="hud-berries">0</span></div>
    </div>
    <div class="moodle-tray" id="hud-moodle-tray"></div>
    <div class="minimap-wrap">
      <div class="minimap-frame">
        <div class="minimap-rivet" style="left:99px;top:54px"></div>
        <div class="minimap-rivet" style="left:76.5px;top:93px"></div>
        <div class="minimap-rivet" style="left:31.5px;top:93px"></div>
        <div class="minimap-rivet" style="left:9px;top:54px"></div>
        <div class="minimap-rivet" style="left:31.5px;top:15px"></div>
        <div class="minimap-rivet" style="left:76.5px;top:15px"></div>
        <div class="minimap"><div class="minimap-dot" id="hud-minimap-dot"></div></div>
      </div>
    </div>
    <div class="menu-buttons" id="hud-menu-buttons">
      ${MENU_BUTTONS.map((btn) => `
        <div class="menu-btn" data-menu="${btn.id}" title="${btn.title} (${btn.shortcut})">
          <svg class="icon" aria-hidden="true"><use href="#i-${btn.iconSymbol}"></use></svg>
          ${shortcutBadge(btn.shortcut)}
        </div>
      `).join('')}
    </div>
    <div class="hotbar" id="hud-hotbar">
      ${HOTBAR_SLOTS.map((slot) => `
        <div class="hotbar-slot empty" id="hud-hotbar-${slot.id}" title="Slot vazio (${slot.shortcut})">
          <div class="hotbar-slot-icon"></div>
          ${shortcutBadge(slot.shortcut)}
        </div>
      `).join('')}
    </div>
  `;

  hpFrameEl = overlay.querySelector('.hp-frame');
  hpFillEl = overlay.querySelector('#hud-hp-fill');
  hpNumEl = overlay.querySelector('#hud-hp-num');
  berriesFrameEl = overlay.querySelector('.berries');
  berriesEl = overlay.querySelector('#hud-berries');
  moodleTrayEl = overlay.querySelector('#hud-moodle-tray');
  minimapDotEl = overlay.querySelector('#hud-minimap-dot');
  hotbarEls = {};
  HOTBAR_SLOTS.forEach((slot) => {
    hotbarEls[slot.id] = overlay.querySelector(`#hud-hotbar-${slot.id}`);
  });
  lastHp = null;
  lastBerries = null;

  MOODLE_DEFS.forEach(({ key, severity, label }) => {
    const el = document.createElement('div');
    el.className = `moodle ${severity}`;
    el.dataset.key = key;
    el.innerHTML = `<span class="moodle-icon"><svg class="icon" aria-hidden="true"><use href="#i-${key}"></use></svg></span><span class="tip">${label}</span>`;
    moodleTrayEl.appendChild(el);
  });
}

// Pisca o chip (escala + brilho dourado, ver hud.css) só quando o valor
// realmente muda — evita piscar já na primeira chamada de create() (que só
// está preenchendo o estado inicial, não é uma "mudança" de verdade pro
// jogador ver).
function pulse(el) {
  el.classList.remove('pulse');
  void el.offsetWidth; // reflow — sem isso o navegador não reinicia a animação numa segunda pulsação rápida
  el.classList.add('pulse');
}

export function setHp(current, max) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  hpFillEl.style.width = `${pct}%`;
  hpNumEl.textContent = `${current}/${max}`;
  if (lastHp !== null && current !== lastHp) pulse(hpFrameEl);
  lastHp = current;
}

export function setBerries(amount) {
  berriesEl.textContent = amount;
  if (lastBerries !== null && amount !== lastBerries) pulse(berriesFrameEl);
  lastBerries = amount;
}

export function setMoodle(key, active) {
  const el = moodleTrayEl.querySelector(`[data-key="${key}"]`);
  if (el) el.classList.toggle('show', active);
}

// Recebe a posição do jogador já normalizada (0..1 de largura/altura do
// mundo) — hud.js não sabe nada de WORLD_WIDTH/WORLD_HEIGHT, quem chama
// (villageScene.js) que faz a conta, igual já faz pra tudo mais aqui.
export function setMinimapPos(fracX, fracY) {
  minimapDotEl.style.left = `${Math.max(0, Math.min(1, fracX)) * 100}%`;
  minimapDotEl.style.top = `${Math.max(0, Math.min(1, fracY)) * 100}%`;
}

// Liga os botões clicáveis de Personagem/Inventário/Mapa aos MESMOS
// handlers que os atalhos de teclado já chamam — hud.js não sabe nada de
// progressão/inventário, só repassa o clique (ver villageScene.js, que
// chama isto uma vez logo depois de initHud()).
export function bindMenuButtons({ onPersonagem, onInventario, onMapa }) {
  const overlay = document.getElementById('hud-overlay');
  const HANDLERS = { personagem: onPersonagem, inventario: onInventario, mapa: onMapa };
  overlay.querySelectorAll('.menu-btn').forEach((btn) => {
    btn.addEventListener('click', () => HANDLERS[btn.dataset.menu]?.());
  });
}

// `equipped` é o mesmo equipState.equippedLayerId de character/layers.js —
// hud.js só espelha, não decide. `assignments` é hotbarAssignments de
// state/playerState.js (`{ <id do slot>: itemId | null }`, atribuído pelo
// jogador — ver inventoryMenu.js) — cada slot busca seu PRÓPRIO item nessa
// tabela e resolve ícone/nome via ITEM_DEFS, ao contrário de antes (item
// fixo por posição em HOTBAR_SLOTS). `inventory` trava o slot (visual +
// clique) quando o item atribuído não existe mais de verdade no
// inventário (perdido/gasto) — o slot continua "lembrando" o que estava
// lá, só não deixa equipar até o jogador ter outra unidade ou reatribuir.
export function setHotbarState({ equipped, inventory, assignments }) {
  HOTBAR_SLOTS.forEach((slot) => {
    const el = hotbarEls[slot.id];
    const itemId = assignments?.[slot.id] ?? null;
    const def = itemId ? ITEM_DEFS[itemId] : null;
    const owned = Boolean(def) && hasItem(inventory, itemId);

    const iconEl = el.querySelector('.hotbar-slot-icon');
    iconEl.innerHTML = def?.iconPath ? `<img class="icon pixel-icon" src="${def.iconPath}" alt="${def.name}">` : '';

    el.classList.toggle('empty', !def);
    el.classList.toggle('locked', Boolean(def) && !owned);
    el.classList.toggle('equipped', Boolean(def) && owned && equipped === def.equipLayerId);
    el.title = def ? `${def.name} (${slot.shortcut})` : `Slot vazio (${slot.shortcut})`;
  });
}

// Pisca rápido o slot clicado sem nada atribuído — antes disparava um toast
// de aviso (ver showBlockedThrottled em islandScene.js), achado ruim em
// revisão de UX: o próprio slot piscando já avisa "não dá fazer nada aqui",
// sem precisar de texto flutuando por cima do jogo.
export function flashEmptyHotbarSlot(slotId) {
  const el = hotbarEls[slotId];
  if (!el) return;
  el.classList.remove('blink');
  void el.offsetWidth; // reflow — sem isso o navegador não reinicia a animação numa segunda piscada rápida
  el.classList.add('blink');
}

// Clique de QUALQUER slot chama o MESMO handler — o que ele faz (equipar,
// atribuir, remover) depende do modo em que o jogo está no momento
// (ver onHotbarSlotClick em islandScene.js), não mais de qual item está
// hardcoded naquele slot. Atalho de número reusa o mesmo handler.
export function bindHotbar(onSlotClick) {
  HOTBAR_SLOTS.forEach((slot) => {
    hotbarEls[slot.id].addEventListener('click', () => onSlotClick(slot.id));
  });
}

// Mapa atalho-de-número → id do slot, pra quem liga a tecla (ver
// keydown-ONE..FOUR em islandScene.js) saber qual handler chamar sem
// precisar conhecer a lista de slots.
export function getHotbarSlotIdByShortcut(shortcut) {
  return HOTBAR_SLOTS.find((slot) => slot.shortcut === shortcut)?.id;
}
