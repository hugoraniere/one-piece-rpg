import './fishingHud.css';

// Minigame de pesca, duas fases (ver conversa de design / sim/fishing.js
// pras fórmulas):
//   1) ESPERA — a isca está na água, um sorteio por segundo decide se um
//      peixe morde (chance dada pela isca usada). Sem mordida até o tempo
//      máximo, a tentativa acaba em "nada mordeu".
//   2) MORDIDA — abre uma janela curta de reação (mais generosa quanto
//      melhor foi o arremesso); soltar a tecla/botão dentro dela é sucesso,
//      fora dela (ou não soltar a tempo) é "o peixe escapou".
// Soltar durante a ESPERA (antes de qualquer mordida) sempre falha na hora
// — "puxou cedo demais". Isso é o próprio villageScene.js chamando
// releaseFishingAttempt() a partir do keyup-F ou do pointerup do mouse.
const TICK_MS = 1000;

let rootEl;
let hintEl;
let fillEl;

let phase = 'idle'; // 'idle' | 'esperando' | 'mordida'
let waitIntervalId = null;
let biteTimeoutId = null;
let elapsedTicks = 0;
let maxTicks = 0;
let biteChance = 0;
let reactionMs = 0;
let resultCallback = null;
let biteCallback = null;

function ensureDom() {
  if (rootEl) return;
  rootEl = document.createElement('div');
  rootEl.className = 'fishing-hud';
  rootEl.innerHTML = `
    <div class="fishing-hint" id="fishing-hint">Aguardando mordida...</div>
    <div class="fishing-track">
      <div class="fishing-bite-fill" id="fishing-bite-fill"></div>
    </div>
  `;
  document.body.appendChild(rootEl);
  hintEl = rootEl.querySelector('#fishing-hint');
  fillEl = rootEl.querySelector('#fishing-bite-fill');
}

export function isFishingActive() {
  return phase !== 'idle';
}

// Só pra depuração (ver __gameDebug em villageScene.js) — testar a fase de
// mordida de fora sem essa leitura significa ou monkey-patchar Math.random
// (arriscado, o próprio Phaser usa Math.random internamente pra outras
// coisas) ou apostar num tempo fixo de espera.
export function getFishingPhase() {
  return phase;
}

// `maxWaitTicks` vem de sim/fishing.js (MAX_WAIT_TICKS) — não importamos
// direto aqui pra este módulo continuar sem saber de regra de jogo nenhuma,
// só de estado de UI/timer (mesma separação de fishingHud.js original).
export function startFishingAttempt({ biteChance: chance, reactionMs: reaction, maxWaitTicks, onResult, onBite }) {
  if (phase !== 'idle') return;
  ensureDom();
  phase = 'esperando';
  biteChance = chance;
  reactionMs = reaction;
  maxTicks = maxWaitTicks;
  elapsedTicks = 0;
  resultCallback = onResult;
  biteCallback = onBite;

  rootEl.classList.remove('bite-active');
  hintEl.textContent = 'Aguardando mordida... segure a tecla';
  fillEl.style.transition = 'none';
  fillEl.style.width = '0%';
  rootEl.classList.add('show');

  waitIntervalId = setInterval(tickWait, TICK_MS);
}

function tickWait() {
  if (phase !== 'esperando') return;
  elapsedTicks += 1;
  if (Math.random() < biteChance) {
    startBiteWindow();
    return;
  }
  if (elapsedTicks >= maxTicks) {
    finish('nada-mordeu');
  }
}

function startBiteWindow() {
  clearInterval(waitIntervalId);
  waitIntervalId = null;
  phase = 'mordida';

  if (biteCallback) biteCallback();
  rootEl.classList.add('bite-active');
  hintEl.textContent = 'MORDEU! Solte agora!';
  // Força um reflow antes de trocar a transição — sem isso o navegador pode
  // agrupar o "encher" e o "esvaziar" na mesma passada e a barra nunca
  // aparece cheia visualmente.
  fillEl.style.transition = 'none';
  fillEl.style.width = '100%';
  void fillEl.offsetWidth;
  fillEl.style.transition = `width ${reactionMs}ms linear`;
  fillEl.style.width = '0%';

  biteTimeoutId = setTimeout(() => finish('escapou'), reactionMs);
}

// Chamado pelo keyup-F ou pointerup — solta a vara, seja qual for a fase.
export function releaseFishingAttempt() {
  if (phase === 'esperando') {
    finish('cedo-demais');
  } else if (phase === 'mordida') {
    clearTimeout(biteTimeoutId);
    biteTimeoutId = null;
    finish('sucesso');
  }
}

// Segurança pra troca de cena/interrupção externa — não faz parte do fluxo
// normal (que sempre termina em finish() pelos dois caminhos acima).
export function cancelFishingAttempt() {
  if (phase === 'idle') return;
  clearInterval(waitIntervalId);
  clearTimeout(biteTimeoutId);
  waitIntervalId = null;
  biteTimeoutId = null;
  phase = 'idle';
  if (rootEl) rootEl.classList.remove('show', 'bite-active');
  resultCallback = null;
  biteCallback = null;
}

function finish(outcome) {
  clearInterval(waitIntervalId);
  clearTimeout(biteTimeoutId);
  waitIntervalId = null;
  biteTimeoutId = null;
  phase = 'idle';
  rootEl.classList.remove('show', 'bite-active');
  const callback = resultCallback;
  resultCallback = null;
  biteCallback = null;
  if (callback) callback(outcome);
}
