// Fórmulas puras do minigame de pesca — sem Phaser (ver ui/fishingHud.js pro
// minigame em si e scenes/villageScene.js pra onde isso é chamado).
//
// O jogo tem DUAS decisões separadas, de propósito (ver conversa de design):
//   1) a ISCA decide se um peixe vai morder ou não (chance por segundo
//      esperando, com a vara na água);
//   2) a QUALIDADE DO ARREMESSO nunca decide isso — ela só torna a janela de
//      reação pra fisgar mais generosa quando a mordida acontece. Um
//      arremesso perfeito não pesca sozinho; só facilita.
import { ITEM_DEFS } from './itemDefs.js';
import { getQuantity } from './inventory.js';

export const BAIT_BITE_CHANCE = {
  none: 0.08,
  'isca-improvisada': 0.25,
  minhoca: 0.4,
};

export const MAX_WAIT_TICKS = 12; // segundos esperando mordida antes de "nada mordeu"
export const BASE_REACTION_MS = 450;
export const MAX_CAST_BONUS_MS = 250; // bônus máximo de janela de reação por um arremesso perfeito

// Faixa de distância do jogador considerada "bom lugar pra jogar a isca" —
// muito perto (quase nos próprios pés) ou longe demais (no limite de
// alcance) pioram a qualidade do arremesso.
export const CAST_IDEAL_MIN_DIST = 60;
export const CAST_IDEAL_MAX_DIST = 180;
export const CAST_MAX_RANGE = 260;

// A melhor isca que o jogador tem no inventário — sempre a de maior tier
// (ver ITEM_DEFS). `null` significa pescar sem isca nenhuma.
export function getBestBait(inventory) {
  let best = null;
  for (const [itemId, def] of Object.entries(ITEM_DEFS)) {
    if (!def.isBait) continue;
    if (getQuantity(inventory, itemId) <= 0) continue;
    if (!best || def.baitTier > ITEM_DEFS[best].baitTier) best = itemId;
  }
  return best;
}

export function getBiteChance(baitId) {
  return BAIT_BITE_CHANCE[baitId ?? 'none'] ?? BAIT_BITE_CHANCE.none;
}

export function getReactionWindowMs(castQuality) {
  const clamped = Math.max(0, Math.min(1, castQuality));
  return BASE_REACTION_MS + clamped * MAX_CAST_BONUS_MS;
}

// 1 = arremesso na faixa ideal, decaindo linearmente pra 0 tanto perto
// demais (quase nos pés) quanto no limite do alcance máximo.
export function computeCastQuality(dist) {
  if (dist < CAST_IDEAL_MIN_DIST) return Math.max(0, dist / CAST_IDEAL_MIN_DIST);
  if (dist <= CAST_IDEAL_MAX_DIST) return 1;
  if (dist >= CAST_MAX_RANGE) return 0;
  return 1 - (dist - CAST_IDEAL_MAX_DIST) / (CAST_MAX_RANGE - CAST_IDEAL_MAX_DIST);
}
