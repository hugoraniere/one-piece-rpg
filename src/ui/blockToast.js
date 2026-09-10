import './blockToast.css';

// Aviso de bloqueio ("por que essa ação não rolou") — ver comentário no
// topo do CSS. Um só de cada vez: chamar de novo troca ícone/texto e
// reinicia a contagem, não empilha.
const DURATION_MS = 2600;

let rootEl;
let iconUseEl;
let msgEl;
let hideTimer = null;

function ensureDom() {
  if (rootEl) return;
  rootEl = document.createElement('div');
  rootEl.className = 'block-toast';
  rootEl.innerHTML = `
    <div class="row">
      <div class="badge-circle"><svg class="icon" aria-hidden="true"><use id="block-toast-icon-use"></use></svg></div>
      <span class="msg" id="block-toast-msg"></span>
    </div>
    <div class="drain-track"><div class="drain-fill"></div></div>
  `;
  document.body.appendChild(rootEl);
  iconUseEl = rootEl.querySelector('#block-toast-icon-use');
  msgEl = rootEl.querySelector('#block-toast-msg');
}

// `iconKey` é um id do sprite de ícones (ver ui/icons.js), ex: 'pesca'.
export function showBlocked(iconKey, message) {
  ensureDom();
  iconUseEl.setAttribute('href', `#i-${iconKey}`);
  msgEl.textContent = message;

  rootEl.classList.remove('drain-anim');
  void rootEl.offsetWidth; // força reflow — sem isso a animação não reinicia numa segunda chamada rápida
  rootEl.classList.add('show', 'drain-anim');

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => rootEl.classList.remove('show'), DURATION_MS);
}
