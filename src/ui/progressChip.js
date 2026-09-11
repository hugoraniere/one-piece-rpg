import './progressChip.css';
import { getProgressPercent } from '../sim/progression.js';

// Chip de progressão — ver comentário no topo do CSS. Fica dentro de
// .hud-topleft (mesma coluna de vida/Berries em hud.js) pra empilhar por
// flexbox, sem precisar calcular posição na mão.
const IDLE_HIDE_MS = 2200;
const POP_DELAY_MS = 260; // tempo que a barra fica "cheia" antes de zerar — dá tempo do olho registrar que encheu

let rootEl;
let iconUseEl;
let nameEl;
let fillEl;
let hideTimer = null;

function ensureDom() {
  const host = document.querySelector('.hud-topleft') ?? document.body;
  // `.hud-topleft` é recriado do zero a cada initHud() (ver ui/hud.js —
  // overlay.innerHTML = ... substitui os filhos antigos inteiros), o que
  // aconteceria a cada troca de ilha (scene.restart chama create() nela de
  // novo). Sem o `isConnected`, o chip continuaria vivo e sendo atualizado,
  // só que pendurado num nó já removido da árvore — invisível pra sempre.
  if (rootEl && rootEl.isConnected) return;
  if (rootEl) {
    host.appendChild(rootEl);
    return;
  }
  rootEl = document.createElement('div');
  rootEl.className = 'progress-chip';
  rootEl.innerHTML = `
    <div class="badge-circle"><svg class="icon" aria-hidden="true"><use id="progress-chip-icon-use"></use></svg></div>
    <div class="info">
      <span class="skill-name" id="progress-chip-name"></span>
      <div class="bar-track"><div class="bar-fill" id="progress-chip-fill"></div></div>
    </div>
  `;
  host.appendChild(rootEl);
  iconUseEl = rootEl.querySelector('#progress-chip-icon-use');
  nameEl = rootEl.querySelector('#progress-chip-name');
  fillEl = rootEl.querySelector('#progress-chip-fill');
}

function scheduleHide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => rootEl.classList.remove('show'), IDLE_HIDE_MS);
}

// `meta` = { icon, name } (ver ui/menuData.js#findStatMeta), `stat` =
// { actions, level } (ver sim/progression.js).
export function showTrainingProgress(meta, stat) {
  ensureDom();
  iconUseEl.setAttribute('href', `#i-${meta.icon}`);
  nameEl.textContent = meta.name;
  rootEl.classList.remove('levelup');
  fillEl.style.transition = 'width 0.2s ease';
  fillEl.style.width = `${getProgressPercent(stat)}%`;
  rootEl.classList.add('show');
  scheduleHide();
}

// Chamado em vez de showTrainingProgress quando a ação fez subir de nível
// — enche até 100%, segura um instante, e reinicia zerada com um "pop"
// dourado, em vez de só mostrar o número pós-reset (que já veio zerado de
// sim/progression.js e não contaria a história de "acabou de encher").
export function showLevelUp(meta) {
  ensureDom();
  iconUseEl.setAttribute('href', `#i-${meta.icon}`);
  nameEl.textContent = meta.name;
  rootEl.classList.add('show');

  fillEl.style.transition = 'none';
  fillEl.style.width = '100%';
  void fillEl.offsetWidth;

  setTimeout(() => {
    fillEl.style.transition = 'width 0.2s ease';
    fillEl.style.width = '0%';
    rootEl.classList.remove('levelup');
    void rootEl.offsetWidth;
    rootEl.classList.add('levelup');
  }, POP_DELAY_MS);

  scheduleHide();
}
