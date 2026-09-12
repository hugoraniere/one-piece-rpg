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
// `kind: 'tool'` — participa de handleGather() perto de árvore.
// `gatherMultiplier` multiplica a quantidade de graveto coletado.
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
  machado: {
    kind: 'tool',
    gatherMultiplier: 2, // dobra o graveto por coleta perto de árvore
  },
};

export function getEquipmentDef(equipLayerId) {
  return EQUIPMENT_DEFS[equipLayerId] ?? null;
}
