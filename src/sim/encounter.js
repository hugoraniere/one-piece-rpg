// Estado de uma luta em turnos — só "de quem é o turno agora" e "o que esse
// combatente já fez neste turno". Quem decide o que acontece de fato em
// cada turno (mover o sprite, aplicar dano, desenhar a grade) é
// villageScene.js; este módulo não conhece Phaser nem sprites.
//
// Hoje é sempre jogador-vs-1-inimigo, então o turno é só um booleano
// alternando. Se um dia tiver mais de um inimigo na mesma luta, isso vira
// uma lista de combatentes com iniciativa + um índice de turno — não
// construí isso agora porque não existe caso de uso ainda.
export function createEncounterState() {
  return {
    active: false,
    turn: 'player', // 'player' | 'enemy'
    hasMoved: false,
    hasActed: false,
  };
}

export function startEncounter(state) {
  state.active = true;
  state.turn = 'player';
  state.hasMoved = false;
  state.hasActed = false;
}

export function endEncounter(state) {
  state.active = false;
}

export function passTurn(state) {
  state.turn = state.turn === 'player' ? 'enemy' : 'player';
  state.hasMoved = false;
  state.hasActed = false;
}
