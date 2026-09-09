// Constantes gerais do mundo/personagem, compartilhadas entre os módulos de
// cena, personagem, mundo e editor.

export const PLAYER_SPEED = 160; // pixels por segundo
export const CHAR_SCALE = 0.65; // escala de exibição — ajuste aqui se o tamanho não bater
export const WALK_FRAME_MS = 180; // troca de frame do ciclo de caminhada (2 frames alternando)
export const IDLE_FRAME_MS = 650; // troca de frame do idle (bem mais devagar — é só uma respiração sutil)
export const ATTACK_FRAME_MS = 90; // troca de frame do ataque — mais rápido, dá sensação de impacto
export const ATTACK_DURATION_MS = 280; // quanto tempo o modo 'attack' fica ativo antes de voltar pra idle/walk

// Sombra sob os pés — desenhada por código (gradiente radial), não é um
// asset. Assim ela nunca desalinha entre os frames do personagem, e já
// funciona de graça pra qualquer personagem/inimigo futuro.
export const SHADOW_OFFSET_Y = 55; // distância dos pés até o centro do personagem, em pixels de tela
export const SHADOW_SCALE_X = 1.0;
export const SHADOW_SCALE_Y = 0.4;

// O MUNDO é maior que a tela — a câmera acompanha o personagem e o jogo
// mostra só uma janela dele por vez. Aumente esses números pra um mapa maior.
export const WORLD_WIDTH = 2560;
export const WORLD_HEIGHT = 1920;

// Ainda usado pelo grid do editor e pela pintura de terreno.
export const TILE_SIZE = 120;

// Combate por turnos (estilo tático, grade sobre o mundo livre) — a grade
// só existe enquanto uma luta está ativa; fora de combate o mundo continua
// 100% movimento livre em pixels. Ver src/sim/grid.js e
// src/world/combatGrid.js.
export const COMBAT_TILE_SIZE = 100;
export const COMBAT_MOVE_RANGE = 3; // tiles que dá pra andar no seu turno
export const COMBAT_ATTACK_RANGE = 1; // tiles de alcance do ataque (adjacente, diagonal conta)
export const COMBAT_ATTACK_DAMAGE = 10;
export const ENCOUNTER_TRIGGER_RANGE = 220; // pixels — o quão perto precisa chegar do inimigo pra poder iniciar o combate
export const PLAYER_MAX_HP = 30;
