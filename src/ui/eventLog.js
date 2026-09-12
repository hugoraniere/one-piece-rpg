// Sistema de log de eventos com histórico persistente
// Cada evento: { timestamp, category, icon, message, details }

import './eventLog.css';

const MAX_EVENTS = 100;
const CATEGORIES = {
  QUEST: { label: 'Missão', color: '#6b9cde', icon: 'quest' },
  COMBAT: { label: 'Combate', color: '#e74c3c', icon: 'sword' },
  PROGRESSION: { label: 'Progresso', color: '#2ecc71', icon: 'upgrade' },
  ITEM: { label: 'Item', color: '#f39c12', icon: 'item' },
  DISCOVERY: { label: 'Descoberta', color: '#9b59b6', icon: 'discovery' },
  CHARACTER: { label: 'Personagem', color: '#e91e63', icon: 'personagem' },
  SYSTEM: { label: 'Sistema', color: '#95a5a6', icon: 'sistema' },
};

let events = [];
let toastQueue = [];
let journalEl = null;
let toastContainerEl = null;
let activeToastCount = 0;
const MAX_VISIBLE_TOASTS = 3;

function ensureDom() {
  if (!toastContainerEl) {
    toastContainerEl = document.createElement('div');
    toastContainerEl.id = 'event-toast-container';
    document.body.appendChild(toastContainerEl);
  }
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function logEvent(category, message, details = {}) {
  if (!CATEGORIES[category]) {
    console.warn(`Unknown event category: ${category}`);
    return;
  }

  const event = {
    timestamp: Date.now(),
    category,
    message,
    details,
  };

  // Manter histórico limitado
  events.unshift(event);
  if (events.length > MAX_EVENTS) events.pop();

  // Mostrar toast
  showToast(event);

  // Atualizar journal se aberto
  refreshJournal();
}

function showToast(event) {
  ensureDom();

  const catInfo = CATEGORIES[event.category];
  const toastEl = document.createElement('div');
  toastEl.className = `event-toast event-toast--${event.category.toLowerCase()}`;
  toastEl.innerHTML = `
    <div class="event-toast__icon" style="color: ${catInfo.color}">
      <svg class="icon" aria-hidden="true"><use href="#i-${catInfo.icon}"></use></svg>
    </div>
    <div class="event-toast__content">
      <span class="event-toast__category">${catInfo.label}</span>
      <span class="event-toast__message">${event.message}</span>
    </div>
  `;

  toastContainerEl.appendChild(toastEl);
  activeToastCount++;

  const duration = 5000; // 5 segundos
  setTimeout(() => {
    toastEl.classList.add('event-toast--hiding');
    setTimeout(() => {
      toastEl.remove();
      activeToastCount--;
    }, 300);
  }, duration);
}

export function openJournal() {
  ensureDom();

  if (journalEl && journalEl.isConnected) {
    closeJournal();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'event-journal-overlay';
  overlay.innerHTML = `
    <div class="event-journal">
      <div class="event-journal__header">
        <h2>📖 Diário de Eventos</h2>
        <button class="event-journal__close" aria-label="Fechar">✕</button>
      </div>

      <div class="event-journal__filters">
        <button class="event-journal__filter-btn event-journal__filter-btn--active" data-filter="ALL">
          Todos
        </button>
        ${Object.entries(CATEGORIES).map(([key, { label, color }]) => `
          <button class="event-journal__filter-btn" data-filter="${key}" style="--color: ${color}">
            ${label}
          </button>
        `).join('')}
      </div>

      <div class="event-journal__list" id="event-journal-list">
        <!-- Eventos preenchidos por refreshJournal -->
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  journalEl = overlay;

  // Close button
  overlay.querySelector('.event-journal__close').addEventListener('click', closeJournal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeJournal();
  });

  // Filter buttons
  overlay.querySelectorAll('.event-journal__filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.event-journal__filter-btn').forEach((b) => {
        b.classList.remove('event-journal__filter-btn--active');
      });
      btn.classList.add('event-journal__filter-btn--active');
      refreshJournal();
    });
  });

  refreshJournal();
}

function closeJournal() {
  if (journalEl) {
    journalEl.remove();
    journalEl = null;
  }
}

function refreshJournal() {
  if (!journalEl || !journalEl.isConnected) return;

  const listEl = journalEl.querySelector('#event-journal-list');
  const activeFilter = journalEl.querySelector('.event-journal__filter-btn--active')?.dataset.filter || 'ALL';

  const filtered = activeFilter === 'ALL'
    ? events
    : events.filter(e => e.category === activeFilter);

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="event-journal__empty">Nenhum evento ainda</div>';
    return;
  }

  listEl.innerHTML = filtered.map((event) => {
    const catInfo = CATEGORIES[event.category];
    return `
      <div class="event-journal__entry">
        <div class="event-journal__time">${formatTime(event.timestamp)}</div>
        <div class="event-journal__icon" style="color: ${catInfo.color}">
          <svg class="icon" aria-hidden="true"><use href="#i-${catInfo.icon}"></use></svg>
        </div>
        <div class="event-journal__body">
          <div class="event-journal__category">${catInfo.label}</div>
          <div class="event-journal__message">${event.message}</div>
          ${event.details && Object.keys(event.details).length > 0 ? `
            <div class="event-journal__details">
              ${Object.entries(event.details)
                .map(([key, val]) => `<span>${key}: ${val}</span>`)
                .join('')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

export function getEventCount() {
  return events.length;
}

export function clearEvents() {
  events = [];
  refreshJournal();
}

// Atalho: J para abrir/fechar journal
export function bindJournalShortcut(scene) {
  scene.input.keyboard.on('keydown-J', () => openJournal());
}
