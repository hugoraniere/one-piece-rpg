// Sistema escalável de layers (equipamento, acessórios, etc)
// Cada layer sobrepõe o corpo com sincronização automática de frames

export const LAYERS = {
  sword: {
    name: "Espada",
    description: "Cutlass de Ferro",
    zIndex: 10,
    offset: { x: 8, y: -4 }, // Offset visual na mão
    poses: {
      idle: {
        south: "item-sword-idle-south",
        north: "item-sword-idle-north",
        east: "item-sword-idle-east",
        west: "item-sword-idle-west",
      },
      walk: null, // Reutiliza idle
      run: null,
      attack: {
        south: "item-sword-attack-south",
        north: "item-sword-attack-north",
        east: "item-sword-attack-east",
        west: "item-sword-attack-west",
      },
    },
    assets: [
      { key: "item-sword-idle-south", path: "assets/characters/pixel/sword-idle-south.png" },
      { key: "item-sword-idle-north", path: "assets/characters/pixel/sword-idle-north.png" },
      { key: "item-sword-idle-east", path: "assets/characters/pixel/sword-idle-east.png" },
      { key: "item-sword-idle-west", path: "assets/characters/pixel/sword-idle-west.png" },
      { key: "item-sword-attack-south", path: "assets/characters/pixel/sword-attack-south.png" },
      { key: "item-sword-attack-north", path: "assets/characters/pixel/sword-attack-north.png" },
      { key: "item-sword-attack-east", path: "assets/characters/pixel/sword-attack-east.png" },
      { key: "item-sword-attack-west", path: "assets/characters/pixel/sword-attack-west.png" },
    ],
  },

  rod: {
    name: "Vara de Pescar",
    description: "Vara de Pescar",
    zIndex: 9,
    offset: { x: 6, y: -8 },
    poses: {
      idle: {
        south: "item-rod-idle-south",
        north: "item-rod-idle-north",
        east: "item-rod-idle-east",
        west: "item-rod-idle-west",
      },
      walk: null,
      run: null,
      fishing: {
        south: "item-rod-fish-south",
        north: "item-rod-fish-north",
        east: "item-rod-fish-east",
        west: "item-rod-fish-west",
      },
    },
    assets: [
      { key: "item-rod-idle-south", path: "assets/characters/pixel/rod-idle-south.png" },
      { key: "item-rod-idle-north", path: "assets/characters/pixel/rod-idle-north.png" },
      { key: "item-rod-idle-east", path: "assets/characters/pixel/rod-idle-east.png" },
      { key: "item-rod-idle-west", path: "assets/characters/pixel/rod-idle-west.png" },
      // Pesca será adicionada quando gerar os sprites
    ],
  },

  hat: {
    name: "Chapéu",
    description: "Chapéu do Pirata",
    zIndex: 20,
    offset: { x: 0, y: -12 },
    poses: {
      static: {
        south: "item-hat-default",
        north: "item-hat-default",
        east: "item-hat-default",
        west: "item-hat-default",
      },
    },
    assets: [
      // Placeholder - sera criado depois
      // { key: "item-hat-default", path: "assets/characters/pixel/hat-default.png" },
    ],
  },
};

export function preloadLayerAssets(scene, layerId) {
  const layer = LAYERS[layerId];
  if (!layer) return;

  for (const asset of layer.assets) {
    scene.load.image(asset.key, asset.path);
  }
}

// Resolver qual frame de layer usar baseado em modo/direção
export function resolveLayerFrame(layerId, mode, direction, frameIndex) {
  const layer = LAYERS[layerId];
  if (!layer) return null;

  // Tenta encontrar pose para modo solicitado
  let poseKey = layer.poses[mode];

  // Se modo não existe, tenta idle
  if (!poseKey) {
    poseKey = layer.poses.idle;
  }

  // Se ainda não existe, tenta static (pra acessórios)
  if (!poseKey) {
    poseKey = layer.poses.static;
  }

  if (!poseKey) return null;

  // Retorna o frame key da direção
  const frameKey = poseKey[direction];
  return frameKey || null;
}
