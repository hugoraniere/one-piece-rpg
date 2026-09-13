// O ciclo de dia — relógio simulado que avança com o tempo real, dividido em
// períodos de duração desigual, cada um pintando o céu com uma cor/alpha.
// Portado do motor equivalente do jogo "Reino de Aurora" (lá dividido em
// dados/tempo.ts + sistemas/tempo.ts) — só o motor por enquanto: sem ícone de
// período, sem NPC por rotina, sem peixe raro por horário (fica pra depois).
//
// Puro: lê e escreve só em getPlayerState().clockMinutes, sem Phaser. Quem
// desenha o resultado (o overlay de céu escurecendo) é scenes/islandScene.js.
import { getPlayerState } from '../state/playerState.js';

export const MINUTES_PER_DAY = 1440;

// Quantos minutos REAIS um dia de jogo inteiro dura. Número de
// balanceamento: mais baixo, o céu muda mais rápido.
export const REAL_MINUTES_PER_GAME_DAY = 20;

const GAME_MINUTES_PER_MS = MINUTES_PER_DAY / (REAL_MINUTES_PER_GAME_DAY * 60000);

// Cada período começa aos `start` minutos do dia simulado (lista SEMPRE
// ordenada por `start` crescente, começando em 0 — currentPeriod() acha o
// período atual pelo último `start` que já passou) e pinta o céu com esta
// cor e alpha (0 = céu limpo, sem overlay).
//
// As faixas NÃO são iguais de propósito: aurora e entardecer são janelas
// curtas de transição (180 min cada, exatamente 2x TRANSITION_MIN abaixo,
// pra transição de entrada e de saída nunca se sobrepor), os outros quatro
// períodos são mais longos. O alpha máximo (madrugada, 0.5) fica bem abaixo
// de opaco de propósito — de noite nunca deve ficar preto de verdade, só
// escurecer.
export const PERIODS = [
  { id: 'madrugada', start: 0, skyColor: 0x0d1b2a, skyAlpha: 0.5 },
  { id: 'aurora', start: 180, skyColor: 0xf4a6c1, skyAlpha: 0.22 },
  { id: 'manha', start: 360, skyColor: 0x0d1b2a, skyAlpha: 0 },
  { id: 'tarde', start: 660, skyColor: 0x0d1b2a, skyAlpha: 0 },
  { id: 'entardecer', start: 900, skyColor: 0xff8c42, skyAlpha: 0.28 },
  { id: 'noite', start: 1080, skyColor: 0x0d1b2a, skyAlpha: 0.42 },
];

/** Quantos minutos já se passaram no dia simulado (0 a 1439). */
export function currentDayMinute() {
  return getPlayerState().clockMinutes;
}

/** Avança o relógio pelo tempo real decorrido. Não salva sozinho — o
 *  relógio vai pro disco no próximo autosave, igual o resto do playerState. */
export function advanceClock(deltaMs) {
  const state = getPlayerState();
  state.clockMinutes = (state.clockMinutes + deltaMs * GAME_MINUTES_PER_MS) % MINUTES_PER_DAY;
}

/** O índice, em PERIODS, de quem está valendo agora: o último cujo `start`
 *  já passou. Só funciona porque PERIODS está sempre ordenada por `start`
 *  crescente começando em 0 — não é uma divisão fixa, as faixas têm
 *  tamanhos diferentes. */
function periodIndexAt(minute) {
  for (let i = PERIODS.length - 1; i >= 0; i--) {
    if (minute >= PERIODS[i].start) return i;
  }
  return 0;
}

/** Quantos minutos o período `idx` dura, medindo até o início do próximo
 *  (com volta pro começo do dia se for o último da lista). */
function periodDuration(idx) {
  const next = PERIODS[(idx + 1) % PERIODS.length].start;
  return ((next - PERIODS[idx].start + MINUTES_PER_DAY) % MINUTES_PER_DAY) || MINUTES_PER_DAY;
}

export function currentPeriod() {
  return PERIODS[periodIndexAt(currentDayMinute())].id;
}

/** Quantos minutos de jogo, contados de trás pra frente a partir do fim de
 *  cada período, a transição de cor leva pra completar. */
const TRANSITION_MIN = 90;

/** A cor e o alpha do céu agora, interpolados nos últimos minutos de cada
 *  período pra transição nunca ser um corte seco. */
export function currentSkyColor() {
  const minute = currentDayMinute();
  const idx = periodIndexAt(minute);
  const current = PERIODS[idx];
  const next = PERIODS[(idx + 1) % PERIODS.length];
  const elapsed = minute - current.start;
  const remaining = periodDuration(idx) - elapsed;
  if (remaining > TRANSITION_MIN) return { color: current.skyColor, alpha: current.skyAlpha };
  const t = 1 - remaining / TRANSITION_MIN;
  return {
    color: t < 0.5 ? current.skyColor : next.skyColor,
    alpha: current.skyAlpha + (next.skyAlpha - current.skyAlpha) * t,
  };
}
