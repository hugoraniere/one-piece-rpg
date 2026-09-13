import './dayCycleOverlay.css';

// Elemento único, criado uma vez (mesmo padrão de ui/nearbyLootPanel.js) —
// sobrevive a troca de ilha (scene.restart), só a cor/alpha mudam.
let rootEl;

function ensureDom() {
  if (rootEl) return;
  rootEl = document.createElement('div');
  rootEl.className = 'day-cycle-overlay';
  document.body.appendChild(rootEl);
}

/** `color` é um inteiro 0xRRGGBB (mesmo formato que Phaser usa), `alpha` de
 *  0 (céu limpo) a ~0.5 (mais escuro que o motor permite — ver
 *  sim/dayCycle.js: a noite nunca fica opaca de propósito). */
export function updateDayCycleOverlay(color, alpha) {
  ensureDom();
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  rootEl.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
