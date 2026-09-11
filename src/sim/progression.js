// Progressão de atributos e perícias — sobem por REPETIÇÃO de uma ação
// real, nunca por XP genérico de matar inimigo (decisão de design de longa
// data, ver conversa no wireframe "Diário de Bordo"). Cada estatística
// guarda uma CONTAGEM DE AÇÕES, não pontos de xp arbitrários, porque é
// isso que aparece pro jogador na ficha ("8/15 treinos").
//
// Isto é só o motor, sem Phaser/UI. A maioria das perícias e metade dos
// atributos ainda não tem nenhuma ação real de jogo que as treine (cozinhar,
// pescar, meditar, correr...) — elas existem aqui prontas, em 0, esperando
// o verbo de jogo correspondente ser implementado (ver REAL_TRIGGERS em
// ui/menuData.js pra saber quais já têm e quais ainda não).
//
// Hoje só o combate treina de verdade (ver villageScene.js):
//   atacar        -> Espadas (arma equipada) ou Luta (desarmado) + Força
//   apanhar e sobreviver -> Vitalidade
//
// Progressão já sobrevive a recarregar a página (ver state/playerState.js —
// save em localStorage, autosave a cada 5s + beforeunload). Só a posição
// exata dentro da ilha continua resetando pro spawnPoint — isso é
// intencional (mesma regra de toda troca de ilha), não uma limitação de
// save; vida, inventário e Berries persistem junto com a progressão.

export const ACTIONS_PER_LEVEL = 15;
export const ATTRIBUTE_BASE = 10;
export const SKILL_MAX_LEVEL = 10;

export const SKILL_KEYS = [
  'espada',
  'armas-fogo',
  'luta',
  'lancas',
  'arremesso',
  'culinaria',
  'construcao',
  'navegacao',
  'natacao',
  'pesca',
  'caca',
  'socorros',
  'alfaiataria',
  'ferraria',
  'comercio',
  'sobrevivencia',
  'furtividade',
  'percepcao',
  'arqueologia',
];

export const ATTRIBUTE_KEYS = ['forca', 'vitalidade', 'destreza', 'velocidade', 'inteligencia', 'vontade'];

// Quanto cada ponto de atributo acima da base (10) vale em efeito real de
// jogo. Só Força e Vitalidade têm efeito de verdade hoje — ver uso em
// villageScene.js (dano de ataque e HP máximo).
export const FORCA_DAMAGE_PER_POINT = 0.7;
export const VITALIDADE_HP_PER_POINT = 2;

function createStat(startLevel) {
  return { level: startLevel, actions: 0 };
}

export function createProgression() {
  const skills = {};
  SKILL_KEYS.forEach((k) => {
    skills[k] = createStat(0);
  });
  const attributes = {};
  ATTRIBUTE_KEYS.forEach((k) => {
    attributes[k] = createStat(ATTRIBUTE_BASE);
  });
  return { skills, attributes };
}

// Retorna { leveledUp } pra quem chamou poder mostrar feedback (floating
// text etc.) sem este módulo precisar saber nada de Phaser/UI.
function trainStat(stat, maxLevel) {
  if (stat.level >= maxLevel) return { leveledUp: false };
  stat.actions += 1;
  if (stat.actions >= ACTIONS_PER_LEVEL) {
    stat.actions = 0;
    stat.level += 1;
    return { leveledUp: true };
  }
  return { leveledUp: false };
}

export function trainSkill(progression, key) {
  const stat = progression.skills[key];
  if (!stat) return { leveledUp: false };
  return trainStat(stat, SKILL_MAX_LEVEL);
}

export function trainAttribute(progression, key) {
  const stat = progression.attributes[key];
  if (!stat) return { leveledUp: false };
  return trainStat(stat, Infinity); // atributos não têm teto — "evolução lenta" é o próprio limite
}

export function getProgressPercent(stat) {
  return Math.round((stat.actions / ACTIONS_PER_LEVEL) * 100);
}

export function getForcaDamageBonus(progression) {
  return (progression.attributes.forca.level - ATTRIBUTE_BASE) * FORCA_DAMAGE_PER_POINT;
}

export function getVitalidadeMaxHpBonus(progression) {
  return (progression.attributes.vitalidade.level - ATTRIBUTE_BASE) * VITALIDADE_HP_PER_POINT;
}
