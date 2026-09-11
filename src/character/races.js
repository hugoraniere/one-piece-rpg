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
// As 4 direções cardeais agora têm ciclo de caminhada (8 frames) E golpe de
// espada (4 frames) de verdade — geradas via API da PixelLab (POST /v2/
// animate-character, mode v3) reaproveitando o MESMO character_id do resto
// da arte, pra manter a consistência visual com o sul feito à mão no
// editor. O modelo desenhou a espada de verdade na mão nos frames de
// ataque (surpresa boa) — por isso a camada de equipamento (arma
// "embainhada" no quadril) se esconde durante o modo 'attack', ver
// updateLayerVisual em character/layers.js, senão apareceriam duas
// espadas ao mesmo tempo.
function poseFrames(prefix, dir, count) {
  return Array.from({ length: count }, (_, i) => `char-${prefix}-${dir}-${i + 1}`);
}

function poseAssets(prefix, dir, count) {
  return poseFrames(prefix, dir, count).map((key, i) => ({
    key,
    path: `assets/characters/pixel/${prefix}_${dir}_${String(i + 1).padStart(2, '0')}.png`,
  }));
}

const WALK_FRAME_COUNT = 8;
const ATTACK_FRAME_COUNT = 4;

export const RACES = {
  human: {
    assets: [
      { key: 'char-idle-south', path: 'assets/characters/pixel/idle_south.png' },
      { key: 'char-idle-north', path: 'assets/characters/pixel/idle_north.png' },
      { key: 'char-idle-east', path: 'assets/characters/pixel/idle_east.png' },
      { key: 'char-idle-west', path: 'assets/characters/pixel/idle_west.png' },
      ...poseAssets('walk', 'south', WALK_FRAME_COUNT),
      ...poseAssets('walk', 'north', WALK_FRAME_COUNT),
      ...poseAssets('walk', 'east', WALK_FRAME_COUNT),
      ...poseAssets('walk', 'west', WALK_FRAME_COUNT),
      ...poseAssets('attack', 'south', ATTACK_FRAME_COUNT),
      ...poseAssets('attack', 'north', ATTACK_FRAME_COUNT),
      ...poseAssets('attack', 'east', ATTACK_FRAME_COUNT),
      ...poseAssets('attack', 'west', ATTACK_FRAME_COUNT),
    ],
    frames: {
      down: {
        idle: ['char-idle-south'],
        walk: poseFrames('walk', 'south', WALK_FRAME_COUNT),
        attack: poseFrames('attack', 'south', ATTACK_FRAME_COUNT),
      },
      up: {
        idle: ['char-idle-north'],
        walk: poseFrames('walk', 'north', WALK_FRAME_COUNT),
        attack: poseFrames('attack', 'north', ATTACK_FRAME_COUNT),
      },
      // Sem espelhar mais nada — o export trouxe leste E oeste de verdade
      // (ao contrário da arte antiga, que só tinha um perfil e espelhava
      // pra virar o outro lado).
      left: {
        idle: ['char-idle-west'],
        walk: poseFrames('walk', 'west', WALK_FRAME_COUNT),
        attack: poseFrames('attack', 'west', ATTACK_FRAME_COUNT),
      },
      right: {
        idle: ['char-idle-east'],
        walk: poseFrames('walk', 'east', WALK_FRAME_COUNT),
        attack: poseFrames('attack', 'east', ATTACK_FRAME_COUNT),
      },
    },
  },
};

export function preloadRaceAssets(scene, raceId) {
  for (const asset of RACES[raceId].assets) {
    scene.load.image(asset.key, asset.path);
  }
}
