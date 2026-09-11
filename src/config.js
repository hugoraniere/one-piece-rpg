// Constantes gerais do mundo/personagem, compartilhadas entre os módulos de
// cena, personagem, mundo e editor.

export const PLAYER_SPEED = 160; // pixels por segundo
// Escala de exibição — ajuste aqui se o tamanho não bater. Recalculada pro
// teste de pixel art (canvas 32x32, conteúdo real ~26px de altura — ver
// character/races.js): 113px de altura em tela / ~26.5px de conteúdo ≈ 4.26,
// mesma altura em tela que o personagem pintado anterior tinha (200x200,
// conteúdo 174px, escala 0.65).
export const CHAR_SCALE = 4.26;
// Zoom da câmera — o personagem em 113px de altura (CHAR_SCALE acima) e
// câmera no zoom padrão (1) deixava o boneco grande demais na tela,
// escondendo o mundo ao redor. Zoom < 1 encolhe a visão inteira igual
// (personagem, chão, props) mantendo a proporção — mais "visão de cima"
// de RPG top-down, menos "close no rosto".
export const CAMERA_ZOOM = 0.5;
export const WALK_FRAME_MS = 180; // troca de frame do ciclo de caminhada (2 frames alternando)
export const IDLE_FRAME_MS = 650; // troca de frame do idle (bem mais devagar — é só uma respiração sutil)
export const ATTACK_FRAME_MS = 90; // troca de frame do ataque — mais rápido, dá sensação de impacto
// Quanto tempo o modo 'attack' fica ativo antes de voltar pra idle/walk —
// precisa caber o ciclo inteiro (ATTACK_FRAME_MS * nº de frames de ataque
// = 90 * 4 = 360ms) mais uma pequena folga, senão o golpe corta antes do
// último frame aparecer.
export const ATTACK_DURATION_MS = 400;

// Sombra sob os pés — desenhada por código (gradiente radial), não é um
// asset. Assim ela nunca desalinha entre os frames do personagem, e já
// funciona de graça pra qualquer personagem/inimigo futuro.
export const SHADOW_OFFSET_Y = 49; // distância dos pés até o centro do personagem, em pixels de tela — recalculado junto com CHAR_SCALE pro teste de pixel art
export const SHADOW_SCALE_X = 1.0;
export const SHADOW_SCALE_Y = 0.4;

// Tamanho de mundo da ilha inicial (Vila do Mastro Partido) — ver
// world/islands/vilaDoMastroPartido.js. Cada ilha nova tem seu próprio
// worldWidth/worldHeight no config dela; estes dois só existem aqui pra não
// duplicar o valor "de fábrica" da primeira ilha em dois lugares.
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
