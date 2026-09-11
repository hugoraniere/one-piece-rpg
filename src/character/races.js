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
// As 4 direções cardeais agora têm ciclo de caminhada de verdade (8 frames,
// pernas alternando) — geradas via API da PixelLab (POST /v2/animate-
// character, mode v3) reaproveitando o MESMO character_id do resto da
// arte, pra manter a consistência visual com o sul feito à mão no editor.
// `attack` ainda não tem arte de verdade — reaproveita o frame de idle
// como placeholder, igual antes.
function walkFrames(dir) {
  return Array.from({ length: 8 }, (_, i) => `char-walk-${dir}-${i + 1}`);
}

function walkAssets(dir) {
  return walkFrames(dir).map((key, i) => ({
    key,
    path: `assets/characters/pixel/walk_${dir}_${String(i + 1).padStart(2, '0')}.png`,
  }));
}

export const RACES = {
  human: {
    assets: [
      { key: 'char-idle-south', path: 'assets/characters/pixel/idle_south.png' },
      { key: 'char-idle-north', path: 'assets/characters/pixel/idle_north.png' },
      { key: 'char-idle-east', path: 'assets/characters/pixel/idle_east.png' },
      { key: 'char-idle-west', path: 'assets/characters/pixel/idle_west.png' },
      ...walkAssets('south'),
      ...walkAssets('north'),
      ...walkAssets('east'),
      ...walkAssets('west'),
    ],
    frames: {
      down: {
        idle: ['char-idle-south'],
        walk: walkFrames('south'),
        attack: ['char-idle-south'],
      },
      up: {
        idle: ['char-idle-north'],
        walk: walkFrames('north'),
        attack: ['char-idle-north'],
      },
      // Sem espelhar mais nada — o export trouxe leste E oeste de verdade
      // (ao contrário da arte antiga, que só tinha um perfil e espelhava
      // pra virar o outro lado).
      left: {
        idle: ['char-idle-west'],
        walk: walkFrames('west'),
        attack: ['char-idle-west'],
      },
      right: {
        idle: ['char-idle-east'],
        walk: walkFrames('east'),
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
