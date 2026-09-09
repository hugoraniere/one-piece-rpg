// Registro de raças — cada raça é seu próprio conjunto de frames (idle,
// caminhada, ataque, por direção) mais a lista de assets pra carregar. Uma
// raça nova é só mais uma entrada aqui, no mesmo formato de `human` — nenhum
// outro código (character.js, layers.js, villageScene.js) precisa mudar.
//
// `attack` ainda não tem arte de verdade em nenhuma raça — por enquanto
// reaproveita o frame de idle como placeholder (ver CHARACTER_ASSETS_TODO.md),
// só pra a máquina de estados de animação já funcionar ponta a ponta. Trocar
// pela arte real é só substituir esses arrays, sem mexer em código.
export const RACES = {
  human: {
    assets: [
      { key: 'char-idle-front', path: 'assets/characters/idle_front.png' },
      { key: 'char-idle-back-1', path: 'assets/characters/idle_back_1.png' },
      { key: 'char-idle-back-2', path: 'assets/characters/idle_back_2.png' },
      { key: 'char-idle-left', path: 'assets/characters/idle_left.png' },
      { key: 'char-idle-right', path: 'assets/characters/idle_right.png' },
      { key: 'char-walk-front-1', path: 'assets/characters/walk_front_1.png' },
      { key: 'char-walk-front-2', path: 'assets/characters/walk_front_2.png' },
      { key: 'char-walk-back-1', path: 'assets/characters/walk_up_1.png' },
      { key: 'char-walk-back-2', path: 'assets/characters/walk_up_2.png' },
      { key: 'char-walk-back-3', path: 'assets/characters/walk_up_3.png' },
      { key: 'char-walk-back-4', path: 'assets/characters/walk_up_4.png' },
      { key: 'char-walk-back-5', path: 'assets/characters/walk_up_5.png' },
      { key: 'char-walk-right-1', path: 'assets/characters/walk_right_1.png' },
      { key: 'char-walk-right-2', path: 'assets/characters/walk_right_2.png' },
      { key: 'char-walk-right-3', path: 'assets/characters/walk_right_3.png' },
      { key: 'char-walk-right-4', path: 'assets/characters/walk_right_4.png' },
      { key: 'char-walk-left-1', path: 'assets/characters/walk_left_1.png' },
      { key: 'char-walk-left-2', path: 'assets/characters/walk_left_2.png' },
      { key: 'char-walk-left-3', path: 'assets/characters/walk_left_3.png' },
      { key: 'char-walk-left-4', path: 'assets/characters/walk_left_4.png' },
    ],
    frames: {
      down: {
        idle: ['char-idle-front'],
        walk: ['char-walk-front-1', 'char-walk-front-2'],
        attack: ['char-idle-front'],
      },
      up: {
        idle: ['char-idle-back-1', 'char-idle-back-2'],
        walk: ['char-walk-back-1', 'char-walk-back-2', 'char-walk-back-3', 'char-walk-back-4', 'char-walk-back-5'],
        attack: ['char-idle-back-1'],
      },
      left: {
        idle: ['char-idle-left'],
        idleFlip: false,
        // Ver nota equivalente que existia em character.js: a caminhada de
        // perfil pra esquerda reaproveita a arte da direita espelhada (a
        // arte própria de "caminhada contra" saiu com o tronco torcido).
        walk: ['char-walk-right-1', 'char-walk-right-2', 'char-walk-right-3', 'char-walk-right-4'],
        walkFlip: true,
        attack: ['char-idle-left'],
      },
      right: {
        idle: ['char-idle-right'],
        idleFlip: false,
        walk: ['char-walk-right-1', 'char-walk-right-2', 'char-walk-right-3', 'char-walk-right-4'],
        walkFlip: false,
        attack: ['char-idle-right'],
      },
    },
  },
};

export function preloadRaceAssets(scene, raceId) {
  for (const asset of RACES[raceId].assets) {
    scene.load.image(asset.key, asset.path);
  }
}
