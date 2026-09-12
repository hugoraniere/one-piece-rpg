// Atributos de gameplay por item equipável (equipLayerId) — separado de
// ITEM_DEFS (catálogo de inventário) e LAYER_DEFS (visual) porque isso aqui
// é só "o que o item FAZ" quando equipado. Generaliza o que antes era
// hardcoded pra 'sword' em tryAttack()/handleGather() (ver islandScene.js).
//
// `kind: 'weapon'` — participa de tryAttack() (ataque corpo-a-corpo/
// distância contra o boneco de treino). `damage` soma ao dano base
// (getForcaDamageBonus já soma força por cima). `range` sobrescreve
// MELEE_RANGE quando definido (arco tem alcance maior). `skillKey` é a
// perícia treinada a cada acerto (ver menuData.js).
//
// `kind: 'tool'` — participa de handleGather() perto de árvore
// (`gatherMultiplier`) e/ou de tryStartFishing() (`canFish`/`biteBonus`).
// `canFish` marca ferramenta de pesca de verdade — sem isso, machado (que
// também é 'tool') deixaria pescar por engano se tryStartFishing só
// checasse `kind === 'tool'`. `biteBonus` soma direto na chance de mordida
// de sim/fishing.js#getBiteChance, por cima do que a isca já dá — uma vara
// melhor não muda a fórmula da isca, só melhora o "equipamento" por trás
// dela (mesma separação de responsabilidade que já existia entre isca e
// qualidade do arremesso, ver comentário no topo de fishing.js).
export const EQUIPMENT_DEFS = {
  sword: {
    kind: 'weapon',
    damage: 0, // dano base já é MELEE_DAMAGE (islandScene.js) — espada não soma nada extra, é a referência
    skillKey: 'espada',
  },
  arco: {
    kind: 'weapon',
    damage: -1, // menos dano que a espada por golpe, mas...
    range: 160, // ...alcance bem maior (MELEE_RANGE é 90) — compensação de arma à distância sem sistema de projétil de verdade ainda
    skillKey: 'arremesso',
  },
  lanca: {
    kind: 'weapon',
    damage: 1, // mais dano que a espada — compensa o alcance menor que o arco
    range: 110, // meio-termo entre MELEE_RANGE (90, espada) e o arco (160) — alcance de haste, sem ser à distância de verdade
    skillKey: 'lancas',
  },
  machado: {
    kind: 'tool',
    gatherMultiplier: 2, // dobra o graveto por coleta perto de árvore
  },
  'vara-de-pescar': {
    kind: 'tool',
    canFish: true,
    biteBonus: 0, // baseline — explícito (não implícito) pra deixar claro que é o "tier 1"
  },
  'vara-reforcada': {
    kind: 'tool',
    canFish: true,
    biteBonus: 0.1, // +10 pontos percentuais de chance de mordida, por cima da isca
  },
};

export function getEquipmentDef(equipLayerId) {
  return EQUIPMENT_DEFS[equipLayerId] ?? null;
}
