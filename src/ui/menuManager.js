import './menu.css';
import { injectIconSprite } from './icons.js';

// Dono único do modal de menu (backdrop + moldura de madeira + painel de
// pergaminho) — Personagem e Inventário só fornecem o HTML de dentro do
// painel. Mantém só um menu aberto por vez: abrir um fecha o outro.
let backdropEl;
let panelEl;
let activeKey = null; // 'personagem' | 'inventario' | null

function ensureDom() {
  if (backdropEl) return;
  injectIconSprite();

  backdropEl = document.createElement('div');
  backdropEl.className = 'menu-backdrop';
  backdropEl.innerHTML = `
    <div class="menu-frame">
      <div class="menu-panel"></div>
    </div>
  `;
  document.body.appendChild(backdropEl);
  panelEl = backdropEl.querySelector('.menu-panel');

  // Clicar fora do painel (no fundo escurecido) fecha, igual maioria dos menus de jogo.
  backdropEl.addEventListener('click', (e) => {
    if (e.target === backdropEl) hideMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && activeKey) hideMenu();
  });
}

export function isMenuOpen() {
  return activeKey !== null;
}

export function getActiveMenuKey() {
  return activeKey;
}

export function hideMenu() {
  if (!backdropEl) return;
  backdropEl.classList.remove('show');
  activeKey = null;
}

// `key` identifica qual tela é essa (pra alternar/fechar certo);
// `render(panel)` recebe o elemento do painel já limpo pra montar o HTML e
// ligar os próprios listeners.
export function toggleMenu(key, render) {
  ensureDom();
  if (activeKey === key) {
    hideMenu();
    return;
  }
  activeKey = key;
  panelEl.className = 'menu-panel'; // some telas (Mapa) adicionam uma classe extra — reseta antes de trocar
  panelEl.innerHTML = '';
  render(panelEl);
  backdropEl.classList.add('show');
}
