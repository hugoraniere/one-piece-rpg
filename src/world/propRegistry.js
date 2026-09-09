import Phaser from 'phaser';

// Registro de todos os props colocados no mundo (iniciais ou criados no
// editor). O editor importa `editorObjects` e `createPropImage` daqui em vez
// de ter sua própria lista, porque a colocação inicial da vila e a colocação
// manual no editor precisam aparecer na mesma lista pra exportação/seleção
// funcionar igual nos dois casos.
export const editorObjects = [];

// Praça da Vila Semente — baseado no pacote de assets reais em
// assets/village/ (ver VILA_SEMENTE_MAP_SPEC.md original) + assets/water/
// (recortado do Pack07 — ver BEACH_SCENE_ANALYSIS.md). Layout validado
// primeiro num mockup PNG estático (tools/build_scene_mockup.py) usando
// proporções medidas na imagem de referência, e só depois convertido pra
// coordenadas daqui — não são mais números "no olho".
//
// Todo prop usa pivô bottom-center (x,y = onde ele "toca o chão"). Isso é
// o que faz o Y-sorting funcionar direito: comparamos sempre "pé com pé",
// nunca centro-da-imagem com pé (era esse o bug do personagem "afundando"
// no tronco antes).
//
// `collision` é opcional: {width, height} de uma caixa estática centrada
// no pivô, só pra objetos que devem bloquear passagem (casas, poço, cerca).
// `tint`/`rotation` são usados só onde anotado.
//
// Itens marcados PLACEHOLDER reaproveitam um asset existente no lugar de
// algo que não existe em nenhum catálogo ainda (banco de madeira,
// estrela-do-mar, pedrinha solta, machado no toco) — ver seção 4 do
// BEACH_SCENE_ANALYSIS.md pra lista completa do que falta gerar de verdade.
export const VILLAGE_PROPS = [
  // --- Borda de floresta (topo da grama) ---
  { key: 'village-tree-ancient', x: 77, y: 144, scale: 1.16 },
  { key: 'village-tree-small', x: 205, y: 182, scale: 1.71 },
  { key: 'village-tree-ancient', x: 358, y: 144, scale: 1.16 },
  { key: 'village-tree-small', x: 563, y: 182, scale: 1.71 },
  { key: 'village-tree-ancient', x: 768, y: 144, scale: 1.16 },
  { key: 'village-tree-ancient', x: 2522, y: 144, scale: 1.16 },
  { key: 'village-tree-small', x: 2406, y: 182, scale: 1.71 },
  { key: 'village-tree-ancient', x: 2266, y: 144, scale: 1.16 },

  // "arbustos" — sem asset dedicado ainda, árvore pequena numa escala mais baixa
  { key: 'village-tree-small', x: 461, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 666, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 1587, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 1792, y: 202, scale: 1.0 },
  { key: 'village-tree-small', x: 2304, y: 202, scale: 1.0 },
  { key: 'prop-flower', x: 256, y: 221, scale: 0.28 },
  { key: 'prop-flower', x: 870, y: 221, scale: 0.28 },
  { key: 'prop-flower', x: 1690, y: 221, scale: 0.28 },

  // PLACEHOLDER: toco com machado cravado na referência — sem asset de
  // machado em nenhum catálogo, fica só o toco liso.
  { key: 'village-tree-stump', x: 179, y: 298, scale: 0.22 },
  { key: 'village-rock-cluster', x: 128, y: 278, scale: 0.30 },

  // --- Casas, em fileira ---
  { key: 'village-house-straw', x: 397, y: 470, scale: 0.84, collision: { width: 185, height: 48 } },
  { key: 'village-house-red', x: 1075, y: 394, scale: 0.92, collision: { width: 165, height: 48 } },
  { key: 'village-house-blue', x: 1869, y: 451, scale: 0.87, collision: { width: 210, height: 50 } },

  // --- Cerca entre as casas ---
  { key: 'village-fence', x: 742, y: 557, scale: 0.59, collision: { width: 110, height: 20 } },
  { key: 'village-fence', x: 1446, y: 557, scale: 0.59, collision: { width: 110, height: 20 } },

  // --- Barris, caixas, sacos, floreiras perto das portas ---
  { key: 'village-barrel', x: 525, y: 528, scale: 0.39 },
  { key: 'village-lootsack', x: 602, y: 538, scale: 0.07 },
  { key: 'village-crate', x: 1165, y: 451, scale: 0.09 },
  { key: 'village-barrel', x: 1242, y: 461, scale: 0.39 },
  { key: 'village-planter', x: 1741, y: 528, scale: 0.26 },
  { key: 'village-crate', x: 1677, y: 518, scale: 0.09 },
  { key: 'village-clothesline', x: 2048, y: 490, scale: 0.53 },
  { key: 'village-lantern', x: 269, y: 518, scale: 0.66 },
  { key: 'village-lantern', x: 1626, y: 422, scale: 0.66 },

  // --- Praça central: poço, fogueira, quadro de avisos ---
  { key: 'village-well', x: 1395, y: 643, scale: 0.68, collision: { width: 100, height: 40 } },
  { key: 'village-barrel', x: 1318, y: 662, scale: 0.39 },
  { key: 'village-barrel', x: 1472, y: 672, scale: 0.39 },

  { key: 'village-noticeboard', x: 1062, y: 883, scale: 0.79 },
  { key: 'village-lantern', x: 1165, y: 902, scale: 0.66 },
  { key: 'village-barrel', x: 947, y: 912, scale: 0.39 },

  { key: 'village-campfire', x: 1856, y: 797, scale: 0.2 },
  { key: 'village-tree-stump', x: 1702, y: 826, scale: 0.22 },
  { key: 'village-lantern', x: 1984, y: 912, scale: 0.66 },
  // PLACEHOLDER: banco de madeira não existe em nenhum catálogo — usando
  // um pedaço de cerca deitado (sem colisão) como aproximação temporária.
  { key: 'village-fence', x: 1754, y: 845, scale: 0.28 },
  { key: 'village-fence', x: 1958, y: 854, scale: 0.28 },

  { key: 'village-tree-small', x: 947, y: 960, scale: 0.9 },
  { key: 'village-tree-small', x: 1536, y: 960, scale: 0.9 },
  { key: 'village-tree-small', x: 1626, y: 960, scale: 0.9 },
  { key: 'prop-flower', x: 742, y: 970, scale: 0.28 },

  // --- Transição grama→areia: pedras no penhasco esquerdo ---
  { key: 'village-rock-cluster', x: 90, y: 1315, scale: 0.55 },
  { key: 'village-rock-cluster', x: 192, y: 1354, scale: 0.35 },

  // --- Praia ---
  { key: 'prop-log', x: 1024, y: 1450, scale: 0.69 },
  { key: 'water-boat-row', x: 2266, y: 1498, scale: 0.85, rotation: -12 },
  { key: 'prop-log', x: 2163, y: 1526, scale: 0.40 },

  // PLACEHOLDER: estrela-do-mar não existe em nenhum catálogo — flor
  // tingida de laranja só pra marcar "tem um objeto pequeno aqui".
  { key: 'prop-flower', x: 1203, y: 1411, scale: 0.14, tint: 0xeb7828 },

  // PLACEHOLDER: pedrinha solta também não existe — rock-cluster reduzido.
  { key: 'village-rock-cluster', x: 768, y: 1469, scale: 0.09 },
  { key: 'village-rock-cluster', x: 1536, y: 1517, scale: 0.09 },
  { key: 'village-rock-cluster', x: 1818, y: 1565, scale: 0.09 },
  { key: 'village-rock-cluster', x: 614, y: 1536, scale: 0.09 },

  // --- Doca + pedra-d'água (recortados do Pack07) ---
  { key: 'water-dock-pier', x: 154, y: 1795, scale: 1.35 },
  { key: 'water-rock', x: 51, y: 1363, scale: 0.85 },
  { key: 'water-rock', x: 2470, y: 1450, scale: 0.55 },
  { key: 'water-lilypad-flower', x: 768, y: 1824, scale: 0.55 },
  { key: 'water-lilypad-plain', x: 1178, y: 1872, scale: 0.45 },
];

// `defaultScale` de cada item é calculado a partir do tamanho real do
// conteúdo do arquivo (sem a margem transparente) contra uma régua comum:
// o personagem tem ~110px de altura na tela, e cada prop mira uma altura
// plausível relativa a isso (poço ~1,3x personagem, barril ~metade, etc).
// Os arquivos do pacote vieram em resoluções bem diferentes entre si (o
// baú por exemplo tem 700px de conteúdo, a cerca só 111px) — sem isso,
// colocar tudo em escala 1 deixa proporção sem nexo entre os objetos.
export const EDITOR_PROP_PALETTE = [
  { key: 'village-house-straw', label: 'Casa de palha', defaultScale: 0.84 },
  { key: 'village-house-red', label: 'Casa vermelha', defaultScale: 0.92 },
  { key: 'village-house-blue', label: 'Casa azul', defaultScale: 0.87 },
  { key: 'village-fence', label: 'Cerca', defaultScale: 0.59 },
  { key: 'village-well', label: 'Poço', defaultScale: 0.68 },
  { key: 'village-campfire', label: 'Fogueira (acesa)', defaultScale: 0.2 },
  { key: 'village-campfire-unlit', label: 'Fogueira (apagada)', defaultScale: 0.2 },
  { key: 'village-campfire-small', label: 'Fogueira (começando)', defaultScale: 0.19 },
  { key: 'village-campfire-embers', label: 'Fogueira (brasas)', defaultScale: 0.16 },
  { key: 'village-noticeboard', label: 'Quadro de avisos', defaultScale: 0.79 },
  { key: 'village-lantern', label: 'Lanterna', defaultScale: 0.66 },
  { key: 'village-barrel', label: 'Barril', defaultScale: 0.39 },
  { key: 'village-crate', label: 'Caixote', defaultScale: 0.09 },
  { key: 'village-lootsack', label: 'Saco de pano', defaultScale: 0.07 },
  { key: 'village-chest-closed', label: 'Baú (fechado)', defaultScale: 0.06 },
  { key: 'village-chest-open', label: 'Baú (aberto)', defaultScale: 0.09 },
  { key: 'village-clothesline', label: 'Varal', defaultScale: 0.53 },
  { key: 'village-planter', label: 'Floreira', defaultScale: 0.26 },
  { key: 'village-tree-small', label: 'Árvore pequena', defaultScale: 1.71 },
  { key: 'village-tree-ancient', label: 'Árvore grande', defaultScale: 1.16 },
  { key: 'village-rock-cluster', label: 'Pedras', defaultScale: 0.3 },
  { key: 'village-tree-stump', label: 'Toco de árvore', defaultScale: 0.22 },
  { key: 'prop-log', label: 'Tronco caído (praia)', defaultScale: 0.69 },
  { key: 'prop-flower', label: 'Flores', defaultScale: 0.28 },

  // Recortados do Pack07 (A Pedra do Sol) — ver BEACH_SCENE_ANALYSIS.md.
  { key: 'water-boat-row', label: 'Barco a remo', defaultScale: 0.85 },
  { key: 'water-dock-pier', label: 'Doca (com escada)', defaultScale: 1.35 },
  { key: 'water-rock', label: 'Pedra de água', defaultScale: 0.85 },
  { key: 'water-lilypad-flower', label: 'Vitória-régia (com flor)', defaultScale: 0.55 },
  { key: 'water-lilypad-plain', label: 'Vitória-régia (lisa)', defaultScale: 0.45 },
  { key: 'water-bridge-wood-arch', label: 'Ponte de madeira (arco)', defaultScale: 0.55 },
  { key: 'water-bridge-wood-straight', label: 'Ponte de madeira (reta)', defaultScale: 0.55 },
  { key: 'water-bridge-stone-arch', label: 'Ponte de pedra (arco)', defaultScale: 0.55 },
  { key: 'water-rope-fence', label: 'Cerca de corda', defaultScale: 0.55 },
];

export function preloadVillageAssets(scene) {
  scene.load.image('village-house-straw', 'assets/village/house_straw.png');
  scene.load.image('village-house-red', 'assets/village/house_red.png');
  scene.load.image('village-house-blue', 'assets/village/house_blue.png');
  scene.load.image('village-fence', 'assets/village/fence.png');
  scene.load.image('village-well', 'assets/village/well.png');
  scene.load.image('village-campfire', 'assets/village/campfire.png');
  scene.load.image('village-noticeboard', 'assets/village/noticeboard.png');
  scene.load.image('village-lantern', 'assets/village/lantern.png');
  scene.load.image('village-barrel', 'assets/village/barrel.png');
  scene.load.image('village-tree-small', 'assets/village/tree_small.png');
  scene.load.image('village-campfire-unlit', 'assets/village/campfire_unlit.png');
  scene.load.image('village-campfire-small', 'assets/village/campfire_small.png');
  scene.load.image('village-campfire-embers', 'assets/village/campfire_embers.png');
  scene.load.image('village-clothesline', 'assets/village/clothesline.png');
  scene.load.image('village-planter', 'assets/village/planter.png');
  scene.load.image('village-chest-closed', 'assets/village/chest_closed.png');
  scene.load.image('village-chest-open', 'assets/village/chest_open.png');
  scene.load.image('village-crate', 'assets/village/crate.png');
  scene.load.image('village-lootsack', 'assets/village/lootsack.png');
  scene.load.image('village-rock-cluster', 'assets/village/rock_cluster.png');
  scene.load.image('village-tree-stump', 'assets/village/tree_stump.png');
  scene.load.image('prop-log', 'assets/props/log.png');
  scene.load.image('prop-flower', 'assets/props/flower.png');
  scene.load.image('village-tree-ancient', 'assets/village/tree_ancient.png');
  scene.load.image('village-path-straight-h', 'assets/village/path_straight_h.png');
  scene.load.image('village-path-straight-v', 'assets/village/path_straight_v.png');
  scene.load.image('village-path-corner', 'assets/village/path_corner.png');
  scene.load.image('village-path-tjunction', 'assets/village/path_tjunction.png');
  scene.load.image('village-path-crossroad', 'assets/village/path_crossroad.png');

  // Recortados do sheet "Pack 07" (A Pedra do Sol, água/pontes) — ver
  // BEACH_SCENE_ANALYSIS.md seção 4. Pontes e cerca de corda ficaram
  // prontas mas não usadas nesta cena (não há rio/vão aqui).
  scene.load.image('water-boat-row', 'assets/water/boat_row.png');
  scene.load.image('water-dock-pier', 'assets/water/dock_pier.png');
  scene.load.image('water-rock', 'assets/water/water_rock.png');
  scene.load.image('water-lilypad-flower', 'assets/water/lilypad_flower.png');
  scene.load.image('water-lilypad-plain', 'assets/water/lilypad_plain.png');
  scene.load.image('water-bridge-wood-arch', 'assets/water/bridge_wood_arch.png');
  scene.load.image('water-bridge-wood-straight', 'assets/water/bridge_wood_straight.png');
  scene.load.image('water-bridge-stone-arch', 'assets/water/bridge_stone_arch.png');
  scene.load.image('water-rope-fence', 'assets/water/rope_fence.png');
}

// Cria a imagem de um prop já pronta pro editor (pivô nos pés, arrastável,
// registrada em editorObjects pra entrar na exportação).
export function createPropImage(scene, key, x, y, scale) {
  const image = scene.add.image(x, y, key);
  image.setOrigin(0.5, 1); // pivô nos "pés" do objeto, como o pacote de assets especifica
  image.setScale(scale);
  image.setDepth(y); // mesma régua de Y-sorting do personagem (ver character.js)
  image.setData('propKey', key);
  image.setInteractive({ draggable: true });
  editorObjects.push(image);
  return image;
}

export function buildVillageProps(scene, player) {
  VILLAGE_PROPS.forEach((prop) => {
    const image = createPropImage(scene, prop.key, prop.x, prop.y, prop.scale);
    if (prop.rotation) image.setRotation(Phaser.Math.DegToRad(prop.rotation));
    // `tint` é só pra placeholders temporários (ex.: flor tingida de
    // laranja fazendo às vezes de estrela-do-mar) — ver BEACH_SCENE_ANALYSIS.md.
    if (prop.tint) image.setTint(prop.tint);

    if (prop.collision) {
      const zone = scene.add.zone(prop.x, prop.y - prop.collision.height / 2, prop.collision.width, prop.collision.height);
      scene.physics.add.existing(zone, true); // true = corpo estático (não se move)
      scene.physics.add.collider(player, zone);
    }
  });
}
