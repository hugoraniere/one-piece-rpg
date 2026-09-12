import './blockToast.css';

// Aviso de bloqueio ("por que essa ação não rolou") — muito pequeno, sem
// barra visual, 1.5s e some. Um só de cada vez: chamar de novo sobrescreve.
const DURATION_MS = 1500;

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

  rootEl.classList.add('show');

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => rootEl.classList.remove('show'), DURATION_MS);
}
