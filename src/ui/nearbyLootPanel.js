import './nearbyLootPanel.css';
import { ITEM_DEFS } from '../sim/itemDefs.js';

// Caixa suspensa (referência: Project Zomboid/Baldur's Gate 3) que lista
// os itens no chão perto do jogador — aparece sozinha quando tem algo no
// alcance, clique num item da lista apanha ele (ver pickUpGroundItem em
// scenes/islandScene.js, chamado tanto por aqui quanto pela tecla G, que
// continua sendo o atalho "só pega o mais perto" — ver comentário em
// world/groundItems.js). Segue a caixa em cima do personagem (convertendo
// posição de mundo pra tela via câmera a cada frame), não fica fixa num
// canto — é a "suspensa perto de você" pedida.
let rootEl;
let listEl;
let lastKey = ''; // uid+qty de cada item concatenados — só reconstrói o HTML quando o conjunto muda de verdade, não todo frame

function ensureDom() {
  if (rootEl) return;
  rootEl = document.createElement('div');
  rootEl.className = 'nearby-loot-panel';
  rootEl.innerHTML = '<div class="nearby-loot-list"></div>';
  document.body.appendChild(rootEl);
  listEl = rootEl.querySelector('.nearby-loot-list');
}

export function initNearbyLootPanel() {
  ensureDom();
  rootEl.classList.remove('show');
  lastKey = '';
}

// `entries` vem de findNearbyGroundItems (world/groundItems.js), já
// ordenado por distância. `onPickup(entry)` é chamado ao clicar um item.
export function updateNearbyLootPanel(scene, entries, onPickup) {
  ensureDom();

  if (entries.length === 0) {
    rootEl.classList.remove('show');
    lastKey = '';
    return;
  }

  const key = entries.map((e) => `${e.uid}:${e.qty}`).join(',');
  if (key !== lastKey) {
    lastKey = key;
    listEl.innerHTML = entries
      .map((entry) => {
        const def = ITEM_DEFS[entry.itemId];
        const qtyText = entry.qty > 1 ? ` x${entry.qty}` : '';
        return `
          <div class="nearby-loot-item" data-uid="${entry.uid}">
            <span class="nearby-loot-icon">${def.icon}</span>
            <span class="nearby-loot-name">${def.name}${qtyText}</span>
          </div>`;
      })
      .join('');
    listEl.querySelectorAll('.nearby-loot-item').forEach((el) => {
      el.addEventListener('click', () => {
        const uid = Number(el.dataset.uid);
        const entry = entries.find((e) => e.uid === uid);
        if (entry) onPickup(entry);
      });
    });
  }

  rootEl.classList.add('show');
  // Mundo → tela via câmera (RESIZE mode, canvas cobre o viewport 1:1 —
  // ver index.html/main.js — então isso já é coordenada de página direto,
  // sem precisar descontar offset do canvas).
  const cam = scene.cameras.main;
  const screenX = (scene.player.x - cam.worldView.x) * cam.zoom;
  const screenY = (scene.player.y - cam.worldView.y) * cam.zoom;
  rootEl.style.left = `${screenX}px`;
  rootEl.style.top = `${screenY - 72}px`; // acima da cabeça do personagem, fora do caminho do sprite
}

// Chamado quando o mundo "congela" (menu aberto, pescando, editor) — a
// caixa não faz sentido nesses estados (ver update() em islandScene.js).
export function hideNearbyLootPanel() {
  if (rootEl) rootEl.classList.remove('show');
  lastKey = '';
}
