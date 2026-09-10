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

let hpFrameEl;
let hpFillEl;
let hpNumEl;
let berriesFrameEl;
let berriesEl;
let moodleTrayEl;
let minimapDotEl;
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
  `;

  hpFrameEl = overlay.querySelector('.hp-frame');
  hpFillEl = overlay.querySelector('#hud-hp-fill');
  hpNumEl = overlay.querySelector('#hud-hp-num');
  berriesFrameEl = overlay.querySelector('.berries');
  berriesEl = overlay.querySelector('#hud-berries');
  moodleTrayEl = overlay.querySelector('#hud-moodle-tray');
  minimapDotEl = overlay.querySelector('#hud-minimap-dot');
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
