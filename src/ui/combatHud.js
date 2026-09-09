import './combatHud.css';

// HUD de combate (fileira de turno + mensagem + botão de encerrar turno) —
// sobreposto ao canvas via DOM, só visível enquanto uma luta está ativa.
// As barras de vida de cada combatente NÃO ficam aqui: elas precisam
// acompanhar sprites se movendo no mundo, o que é mais natural em Phaser
// (ver world/hpBar.js) — este módulo só cuida do que fica fixo na tela.
let rootEl;
let bannerEl;
let endTurnBtn;
let playerChip;
let enemyChip;

function ensureDom() {
  if (rootEl) return;
  rootEl = document.createElement('div');
  rootEl.className = 'combat-hud';
  rootEl.innerHTML = `
    <div class="combat-turn-order">
      <div class="combat-turn-chip" data-who="player">Vc</div>
      <div class="combat-turn-chip enemy" data-who="enemy">In</div>
    </div>
    <div class="combat-banner" id="combat-banner"></div>
    <button class="combat-endturn-btn" id="combat-endturn">Encerrar turno</button>
  `;
  document.body.appendChild(rootEl);

  bannerEl = rootEl.querySelector('#combat-banner');
  endTurnBtn = rootEl.querySelector('#combat-endturn');
  playerChip = rootEl.querySelector('[data-who="player"]');
  enemyChip = rootEl.querySelector('[data-who="enemy"]');
}

export function showCombatHud() {
  ensureDom();
  rootEl.classList.add('show');
}

export function hideCombatHud() {
  if (!rootEl) return;
  rootEl.classList.remove('show');
}

export function setCombatMessage(text) {
  ensureDom();
  bannerEl.textContent = text;
}

// `turn` é 'player' | 'enemy' — destaca o chip de quem está jogando e só
// mostra o botão de encerrar turno quando é a vez do jogador (não faz
// sentido poder "passar a vez" durante o turno do inimigo).
export function setCombatTurn(turn) {
  ensureDom();
  playerChip.classList.toggle('current', turn === 'player');
  enemyChip.classList.toggle('current', turn === 'enemy');
  endTurnBtn.hidden = turn !== 'player';
}

export function onEndTurnClick(handler) {
  ensureDom();
  endTurnBtn.addEventListener('click', handler);
}
