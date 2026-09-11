// Registro de raças — cada raça é seu próprio conjunto de frames (idle,
// caminhada, ataque, por direção) mais a lista de assets pra carregar. Uma
// raça nova é só mais uma entrada aqui, no mesmo formato de `human` — nenhum
// outro código (character.js, layers.js, villageScene.js) precisa mudar.
//
// TESTE de estilo pixel art (gerado no PixelLab, ver
// assets/characters/pixel/ — 8 direções exportadas mas só as 4 cardeais
// estão em uso aqui, mesma limitação de sempre do sistema de facing).
// Substituiu a arte "pintada" anterior (200x200) — ver git log pra
// recuperar os arquivos antigos se o teste não agradar.
//
// Canvas NÃO é o mesmo em todo arquivo (idle/north/east/west de caminhada
// são 32x32; o ciclo novo de caminhada pro sul é 40x40) — sem problema:
// Phaser centraliza cada textura no x/y do sprite não importa o tamanho do
// canvas, e o conteúdo real do personagem mede a mesma altura (~26-27px)
// nos dois casos, então o personagem não muda de tamanho trocando de pose.
//
// Só o sul tem ciclo de caminhada de verdade (8 frames, pernas alternando)
// — as outras 3 direções ainda seguram uma pose só enquanto andam (o
// export original não trouxe ciclo pra elas, "animations" saiu vazio no
// metadata.json). `attack` ainda não tem arte de verdade — reaproveita o
// frame de idle como placeholder, igual antes.
export const RACES = {
  human: {
    assets: [
      { key: 'char-idle-south', path: 'assets/characters/pixel/idle_south.png' },
      { key: 'char-idle-north', path: 'assets/characters/pixel/idle_north.png' },
      { key: 'char-idle-east', path: 'assets/characters/pixel/idle_east.png' },
      { key: 'char-idle-west', path: 'assets/characters/pixel/idle_west.png' },
      { key: 'char-walk-south-1', path: 'assets/characters/pixel/walk_south_01.png' },
      { key: 'char-walk-south-2', path: 'assets/characters/pixel/walk_south_02.png' },
      { key: 'char-walk-south-3', path: 'assets/characters/pixel/walk_south_03.png' },
      { key: 'char-walk-south-4', path: 'assets/characters/pixel/walk_south_04.png' },
      { key: 'char-walk-south-5', path: 'assets/characters/pixel/walk_south_05.png' },
      { key: 'char-walk-south-6', path: 'assets/characters/pixel/walk_south_06.png' },
      { key: 'char-walk-south-7', path: 'assets/characters/pixel/walk_south_07.png' },
      { key: 'char-walk-south-8', path: 'assets/characters/pixel/walk_south_08.png' },
      { key: 'char-walk-north', path: 'assets/characters/pixel/walk_north.png' },
      { key: 'char-walk-east', path: 'assets/characters/pixel/walk_east.png' },
      { key: 'char-walk-west', path: 'assets/characters/pixel/walk_west.png' },
    ],
    frames: {
      down: {
        idle: ['char-idle-south'],
        walk: [
          'char-walk-south-1',
          'char-walk-south-2',
          'char-walk-south-3',
          'char-walk-south-4',
          'char-walk-south-5',
          'char-walk-south-6',
          'char-walk-south-7',
          'char-walk-south-8',
        ],
        attack: ['char-idle-south'],
      },
      up: {
        idle: ['char-idle-north'],
        walk: ['char-walk-north'],
        attack: ['char-idle-north'],
      },
      // Sem espelhar mais nada — o export trouxe leste E oeste de verdade
      // (ao contrário da arte antiga, que só tinha um perfil e espelhava
      // pra virar o outro lado).
      left: {
        idle: ['char-idle-west'],
        walk: ['char-walk-west'],
        attack: ['char-idle-west'],
      },
      right: {
        idle: ['char-idle-east'],
        walk: ['char-walk-east'],
        attack: ['char-idle-east'],
      },
    },
  },
};

export function preloadRaceAssets(scene, raceId) {
  for (const asset of RACES[raceId].assets) {
    scene.load.image(asset.key, asset.path);
  }
}
