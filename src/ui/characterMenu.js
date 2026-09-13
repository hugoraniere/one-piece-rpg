import { hideMenu, toggleMenu } from './menuManager.js';
import { ATTRIBUTES, COMBAT_SKILLS, OFICIO_SKILLS } from './menuData.js';
import { ACTIONS_PER_LEVEL, SKILL_MAX_LEVEL, getProgressPercent } from '../sim/progression.js';
import { getCharacterLevel, getCharacterLevelProgress, getCharacterRank } from '../sim/characterLevel.js';

// Haki não tem sistema nenhum ainda — a aba simplesmente não existe até
// isso ser implementado (ver decisão no wireframe: nada de "???" também).
const HAKI_AWAKENED = false;

const TABS = [
  { key: 'atributos', label: 'Atributos' },
  { key: 'pericias', label: 'Perícias' },
  ...(HAKI_AWAKENED ? [{ key: 'haki', label: 'Haki' }] : []),
  { key: 'tripulacao', label: 'Tripulação' },
];

function iconSvg(key) {
  return `<svg class="icon" aria-hidden="true"><use href="#i-${key}"></use></svg>`;
}

function realTag(real) {
  return real ? '' : ' <em style="opacity:.6;font-style:italic">(sem gatilho real ainda)</em>';
}

function renderAttributesTab(progression) {
  const cards = ATTRIBUTES.map((meta) => {
    const stat = progression.attributes[meta.key];
    const progress = getProgressPercent(stat);
    return `
    <div class="attr-card">
      <div class="attr-top">
        <span class="attr-icon">${iconSvg(meta.icon)}</span>
        <span class="attr-name">${meta.name}</span>
        <span class="attr-value">${stat.level}</span>
      </div>
      <div class="attr-effects">${meta.effects(stat.level)}${realTag(meta.real)}</div>
      <div class="attr-track"><div class="attr-fill" style="width:${progress}%"></div></div>
      <div class="attr-caption">${stat.actions}/${ACTIONS_PER_LEVEL} ações — ${meta.trainedBy}</div>
    </div>`;
  }).join('');
  return `<div class="attr-grid">${cards}</div>`;
}

function skillRow(meta, progression) {
  const stat = progression.skills[meta.key];
  const progress = getProgressPercent(stat);
  return `
    <div class="skill-row">
      <span class="skill-icon">${iconSvg(meta.icon)}</span>
      <span class="skill-name">${meta.name}</span>
      <span class="skill-lvl">${stat.level}<small>/${SKILL_MAX_LEVEL}</small></span>
      <div class="skill-xp"><div class="skill-xp-fill" style="width:${progress}%"></div></div>
      <span class="tip">${meta.trainedBy}${realTag(meta.real)}</span>
    </div>`;
}

function renderSkillsTab(progression) {
  return `
    <div class="sheet-section">
      <div class="sheet-section-head"><h4>Combate</h4><span class="hint">sobe lutando com o estilo</span></div>
      <div class="skill-grid">${COMBAT_SKILLS.map((s) => skillRow(s, progression)).join('')}</div>
    </div>
    <div class="sheet-section">
      <div class="sheet-section-head"><h4>Ofícios &amp; sobrevivência</h4><span class="hint">sobem praticando a atividade correspondente no mundo</span></div>
      <div class="skill-grid">${OFICIO_SKILLS.map((s) => skillRow(s, progression)).join('')}</div>
    </div>`;
}

function renderCrewTab() {
  return `<div class="crew-card empty"><div class="name">Nenhum tripulante recrutado ainda</div></div>`;
}

// Nível de personagem (agregado de todas as perícias/atributos, ver
// sim/characterLevel.js) — cabeçalho novo acima das abas, mesma ideia do
// chip do HUD só que com a patente por extenso (tem espaço aqui).
function renderLevelBanner(progression) {
  const level = getCharacterLevel(progression);
  const rank = getCharacterRank(level);
  const progress = getCharacterLevelProgress(progression);
  return `
    <div class="char-level-banner">
      <span class="char-level-label">Nível ${level} <em>— ${rank.name}</em></span>
      <div class="char-level-track"><div class="char-level-fill" style="width:${progress}%"></div></div>
    </div>`;
}

function buildCharacterHtml(progression) {
  const tabButtons = TABS.map((t, i) => `<button class="char-tab${i === 0 ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`).join('');
  const renderers = { atributos: () => renderAttributesTab(progression), pericias: () => renderSkillsTab(progression), tripulacao: renderCrewTab };
  const pages = TABS.map((t, i) => `<div class="char-page${i === 0 ? ' active' : ''}" data-page="${t.key}">${renderers[t.key]()}</div>`).join('');

  return `
    <div class="menu-header">
      <span class="menu-title">Personagem</span>
      <span class="menu-hint"></span>
      <button class="menu-close" aria-label="Fechar personagem">✕</button>
    </div>
    ${renderLevelBanner(progression)}
    <div class="char-tabs">${tabButtons}</div>
    ${pages}
  `;
}

function mountCharacterMenu(panel, progression) {
  panel.innerHTML = buildCharacterHtml(progression);

  panel.querySelector('.char-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.char-tab');
    if (!btn) return;
    panel.querySelectorAll('.char-tab').forEach((t) => t.classList.toggle('active', t === btn));
    panel.querySelectorAll('.char-page').forEach((p) => p.classList.toggle('active', p.dataset.page === btn.dataset.tab));
  });

  panel.querySelector('.menu-close')?.addEventListener('click', () => {
    hideMenu();
  });
}

export function toggleCharacterMenu(progression) {
  toggleMenu('personagem', (panel) => mountCharacterMenu(panel, progression));
}
