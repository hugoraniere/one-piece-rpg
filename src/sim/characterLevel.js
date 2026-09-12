// Nível geral do personagem — DERIVADO da progressão que já existe, não
// uma segunda moeda de XP paralela (ver sim/progression.js: perícias e
// atributos sobem por ação real, XP genérico foi decisão de design
// explicitamente rejeitada). Cada perícia/atributo já guarda quantas
// ações reais completou na vida (`level * ACTIONS_PER_LEVEL + actions`);
// somando isso em tudo, o "XP" de personagem é literalmente a contagem
// de ações reais que o jogador já fez — nada inventado, nada de matar
// bicho pra ganhar ponto.
//
// Consequência boa: nenhuma mudança de save é necessária — o nível de
// personagem sempre pode ser recalculado a partir do `progression` que
// já é salvo (ver state/playerState.js).
import { ACTIONS_PER_LEVEL, ATTRIBUTE_BASE } from './progression.js';

export const CHARACTER_XP_PER_LEVEL = 100; // flat, mesma filosofia "sem curva exponencial" do resto da progressão

// Atributos começam em ATTRIBUTE_BASE (10), não em 0 — sem descontar isso
// aqui, todo personagem novo nasceria com ~900 de XP de graça (6
// atributos × nível 10 × 15 ações) só por existir, sem ter feito nada.
function statXp(stat, baseLevel) {
  return (stat.level - baseLevel) * ACTIONS_PER_LEVEL + stat.actions;
}

export function getTotalXp(progression) {
  const skillXp = Object.values(progression.skills).reduce((sum, stat) => sum + statXp(stat, 0), 0);
  const attributeXp = Object.values(progression.attributes).reduce((sum, stat) => sum + statXp(stat, ATTRIBUTE_BASE), 0);
  return skillXp + attributeXp;
}

export function getCharacterLevel(progression) {
  return Math.floor(getTotalXp(progression) / CHARACTER_XP_PER_LEVEL) + 1;
}

export function getCharacterLevelProgress(progression) {
  const xp = getTotalXp(progression);
  return Math.round(((xp % CHARACTER_XP_PER_LEVEL) / CHARACTER_XP_PER_LEVEL) * 100);
}

// Patente temática (pirata) por faixa de nível — puramente cosmética,
// mostrada ao lado do número. Ajustar nomes/faixas é só mexer aqui.
export const CHARACTER_RANKS = [
  { minLevel: 1, name: 'Grumete' },
  { minLevel: 3, name: 'Marujo' },
  { minLevel: 6, name: 'Pirata' },
  { minLevel: 10, name: 'Capitão' },
  { minLevel: 15, name: 'Lenda dos Mares' },
];

export function getCharacterRank(level) {
  let rank = CHARACTER_RANKS[0];
  for (const candidate of CHARACTER_RANKS) {
    if (candidate.minLevel > level) break;
    rank = candidate;
  }
  return rank;
}
