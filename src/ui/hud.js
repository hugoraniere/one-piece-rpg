import './hud.css';
import { injectMoodleIcons } from './icons.js';

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

// Hotbar — data-driven pra dar pra somar slot novo sem tocar em mais nada
// (render, atalho de número, bind de clique, estado equipado/travado — tudo
// deriva desta lista). `equipLayerId` liga o slot ao equipState de verdade
// (character/layers.js); `locksUntilOwned: true` é a trava "ainda não
// fabricou" (some quando o item entra no inventário, ver setHotbarState);
// sem nenhum dos dois o slot é permanentemente reservado (trava pra sempre,
// mesmo trato que a habilidade já tinha — "não existe ainda", não "falta
// fabricar").
const HOTBAR_SLOTS = [
  { id: 'sword', shortcut: '1', icon: '/assets/icons/sword.png', title: 'Cutlass de Ferro', equipLayerId: 'sword' },
  { id: 'rod', shortcut: '2', icon: '/assets/icons/rod.png', title: 'Vara de Pescar', equipLayerId: 'vara-de-pescar', locksUntilOwned: true },
  { id: 'ability', shortcut: '3', iconSymbol: 'cadeado', title: 'Habilidade (ainda não existe)' },
  { id: 'slot4', shortcut: '4', iconSymbol: 'cadeado', title: 'Reservado (ainda não existe)' },
];

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
      <div class="menu-btn" data-menu="personagem" title="Personagem (C)"><svg class="icon" aria-hidden="true"><use href="#i-personagem"></use></svg></div>
      <div class="menu-btn" data-menu="inventario" title="Inventário (I)"><svg class="icon" aria-hidden="true"><use href="#i-inventario"></use></svg></div>
      <div class="menu-btn" data-menu="mapa" title="Mapa (M)"><svg class="icon" aria-hidden="true"><use href="#i-mapa"></use></svg></div>
    </div>
    <div class="hotbar" id="hud-hotbar">
      ${HOTBAR_SLOTS.map((slot) => `
        <div class="hotbar-slot${slot.locksUntilOwned || !slot.equipLayerId ? ' locked' : ''}" id="hud-hotbar-${slot.id}" title="${slot.title} (${slot.shortcut})">
          ${slot.icon
            ? `<img class="icon pixel-icon" src="${slot.icon}" alt="${slot.title}">`
            : `<svg class="icon" aria-hidden="true"><use href="#i-${slot.iconSymbol}"></use></svg>`}
          <span class="hotbar-key">${slot.shortcut}</span>
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

// `equipped` é o mesmo equipState.equippedLayerId de character/layers.js
// ('sword' | 'vara-de-pescar' | null) — hud.js só espelha, não decide.
// `hasRod` trava o slot da vara (visual + clique) até ela existir de
// verdade no inventário (ver refreshHotbar em islandScene.js). Genérico
// pra qualquer slot com `equipLayerId`/`locksUntilOwned` — somar um novo
// item equipável é só mais uma entrada em HOTBAR_SLOTS, sem mexer aqui.
export function setHotbarState({ equipped, hasRod }) {
  HOTBAR_SLOTS.forEach((slot) => {
    const el = hotbarEls[slot.id];
    if (slot.equipLayerId) el.classList.toggle('equipped', equipped === slot.equipLayerId);
    if (slot.locksUntilOwned) el.classList.toggle('locked', !hasRod);
  });
}

// `handlers` é `{ <id do slot>: () => void }` — mesmos ids de HOTBAR_SLOTS,
// chamado tanto pelo clique quanto pelo atalho de número (ver
// bindHotbarShortcuts, que reusa os MESMOS handlers pelo teclado 1-4).
export function bindHotbar(handlers) {
  HOTBAR_SLOTS.forEach((slot) => {
    hotbarEls[slot.id].addEventListener('click', () => handlers[slot.id]?.());
  });
}

// Mapa atalho-de-número → id do slot, pra quem liga a tecla (ver
// keydown-ONE..FOUR em islandScene.js) saber qual handler chamar sem
// precisar conhecer a lista de slots.
export function getHotbarSlotIdByShortcut(shortcut) {
  return HOTBAR_SLOTS.find((slot) => slot.shortcut === shortcut)?.id;
}
