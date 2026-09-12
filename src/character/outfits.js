// Definição de outfits (roupas) do personagem
// Cada outfit é um conjunto visual completo que reutiliza as mesmas animações

export const OUTFITS = {
  default: {
    name: "Roupa Padrão",
    description: "Pirata iniciante",
    bodyKey: "body-pirate-default",
    // Assets carregam dos mesmos sprites pixel art que já temos
    assets: [
      // Idle
      { key: "char-idle-south-1", path: "assets/characters/pixel/idle_south_01.png" },
      { key: "char-idle-south-2", path: "assets/characters/pixel/idle_south_02.png" },
      { key: "char-idle-south-3", path: "assets/characters/pixel/idle_south_03.png" },
      { key: "char-idle-south-4", path: "assets/characters/pixel/idle_south_04.png" },

      { key: "char-idle-north-1", path: "assets/characters/pixel/idle_north_01.png" },
      { key: "char-idle-north-2", path: "assets/characters/pixel/idle_north_02.png" },
      { key: "char-idle-north-3", path: "assets/characters/pixel/idle_north_03.png" },
      { key: "char-idle-north-4", path: "assets/characters/pixel/idle_north_04.png" },

      { key: "char-idle-east-1", path: "assets/characters/pixel/idle_east_01.png" },
      { key: "char-idle-east-2", path: "assets/characters/pixel/idle_east_02.png" },
      { key: "char-idle-east-3", path: "assets/characters/pixel/idle_east_03.png" },
      { key: "char-idle-east-4", path: "assets/characters/pixel/idle_east_04.png" },

      { key: "char-idle-west-1", path: "assets/characters/pixel/idle_west_01.png" },
      { key: "char-idle-west-2", path: "assets/characters/pixel/idle_west_02.png" },
      { key: "char-idle-west-3", path: "assets/characters/pixel/idle_west_03.png" },
      { key: "char-idle-west-4", path: "assets/characters/pixel/idle_west_04.png" },

      // Walk
      { key: "char-walk-south-1", path: "assets/characters/pixel/walk_south_01.png" },
      { key: "char-walk-south-2", path: "assets/characters/pixel/walk_south_02.png" },
      { key: "char-walk-south-3", path: "assets/characters/pixel/walk_south_03.png" },
      { key: "char-walk-south-4", path: "assets/characters/pixel/walk_south_04.png" },
      { key: "char-walk-south-5", path: "assets/characters/pixel/walk_south_05.png" },
      { key: "char-walk-south-6", path: "assets/characters/pixel/walk_south_06.png" },
      { key: "char-walk-south-7", path: "assets/characters/pixel/walk_south_07.png" },
      { key: "char-walk-south-8", path: "assets/characters/pixel/walk_south_08.png" },

      { key: "char-walk-north-1", path: "assets/characters/pixel/walk_north_01.png" },
      { key: "char-walk-north-2", path: "assets/characters/pixel/walk_north_02.png" },
      { key: "char-walk-north-3", path: "assets/characters/pixel/walk_north_03.png" },
      { key: "char-walk-north-4", path: "assets/characters/pixel/walk_north_04.png" },
      { key: "char-walk-north-5", path: "assets/characters/pixel/walk_north_05.png" },
      { key: "char-walk-north-6", path: "assets/characters/pixel/walk_north_06.png" },
      { key: "char-walk-north-7", path: "assets/characters/pixel/walk_north_07.png" },
      { key: "char-walk-north-8", path: "assets/characters/pixel/walk_north_08.png" },

      { key: "char-walk-east-1", path: "assets/characters/pixel/walk_east_01.png" },
      { key: "char-walk-east-2", path: "assets/characters/pixel/walk_east_02.png" },
      { key: "char-walk-east-3", path: "assets/characters/pixel/walk_east_03.png" },
      { key: "char-walk-east-4", path: "assets/characters/pixel/walk_east_04.png" },
      { key: "char-walk-east-5", path: "assets/characters/pixel/walk_east_05.png" },
      { key: "char-walk-east-6", path: "assets/characters/pixel/walk_east_06.png" },
      { key: "char-walk-east-7", path: "assets/characters/pixel/walk_east_07.png" },
      { key: "char-walk-east-8", path: "assets/characters/pixel/walk_east_08.png" },

      { key: "char-walk-west-1", path: "assets/characters/pixel/walk_west_01.png" },
      { key: "char-walk-west-2", path: "assets/characters/pixel/walk_west_02.png" },
      { key: "char-walk-west-3", path: "assets/characters/pixel/walk_west_03.png" },
      { key: "char-walk-west-4", path: "assets/characters/pixel/walk_west_04.png" },
      { key: "char-walk-west-5", path: "assets/characters/pixel/walk_west_05.png" },
      { key: "char-walk-west-6", path: "assets/characters/pixel/walk_west_06.png" },
      { key: "char-walk-west-7", path: "assets/characters/pixel/walk_west_07.png" },
      { key: "char-walk-west-8", path: "assets/characters/pixel/walk_west_08.png" },

      // Run
      { key: "char-run-south-1", path: "assets/characters/pixel/run_south_01.png" },
      { key: "char-run-south-2", path: "assets/characters/pixel/run_south_02.png" },
      { key: "char-run-south-3", path: "assets/characters/pixel/run_south_03.png" },
      { key: "char-run-south-4", path: "assets/characters/pixel/run_south_04.png" },
      { key: "char-run-south-5", path: "assets/characters/pixel/run_south_05.png" },
      { key: "char-run-south-6", path: "assets/characters/pixel/run_south_06.png" },
      { key: "char-run-south-7", path: "assets/characters/pixel/run_south_07.png" },
      { key: "char-run-south-8", path: "assets/characters/pixel/run_south_08.png" },

      { key: "char-run-north-1", path: "assets/characters/pixel/run_north_01.png" },
      { key: "char-run-north-2", path: "assets/characters/pixel/run_north_02.png" },
      { key: "char-run-north-3", path: "assets/characters/pixel/run_north_03.png" },
      { key: "char-run-north-4", path: "assets/characters/pixel/run_north_04.png" },
      { key: "char-run-north-5", path: "assets/characters/pixel/run_north_05.png" },
      { key: "char-run-north-6", path: "assets/characters/pixel/run_north_06.png" },
      { key: "char-run-north-7", path: "assets/characters/pixel/run_north_07.png" },
      { key: "char-run-north-8", path: "assets/characters/pixel/run_north_08.png" },

      { key: "char-run-east-1", path: "assets/characters/pixel/run_east_01.png" },
      { key: "char-run-east-2", path: "assets/characters/pixel/run_east_02.png" },
      { key: "char-run-east-3", path: "assets/characters/pixel/run_east_03.png" },
      { key: "char-run-east-4", path: "assets/characters/pixel/run_east_04.png" },
      { key: "char-run-east-5", path: "assets/characters/pixel/run_east_05.png" },
      { key: "char-run-east-6", path: "assets/characters/pixel/run_east_06.png" },
      { key: "char-run-east-7", path: "assets/characters/pixel/run_east_07.png" },
      { key: "char-run-east-8", path: "assets/characters/pixel/run_east_08.png" },

      { key: "char-run-west-1", path: "assets/characters/pixel/run_west_01.png" },
      { key: "char-run-west-2", path: "assets/characters/pixel/run_west_02.png" },
      { key: "char-run-west-3", path: "assets/characters/pixel/run_west_03.png" },
      { key: "char-run-west-4", path: "assets/characters/pixel/run_west_04.png" },
      { key: "char-run-west-5", path: "assets/characters/pixel/run_west_05.png" },
      { key: "char-run-west-6", path: "assets/characters/pixel/run_west_06.png" },
      { key: "char-run-west-7", path: "assets/characters/pixel/run_west_07.png" },
      { key: "char-run-west-8", path: "assets/characters/pixel/run_west_08.png" },

      // Attack
      { key: "char-attack-south-1", path: "assets/characters/pixel/attack_south_01.png" },
      { key: "char-attack-south-2", path: "assets/characters/pixel/attack_south_02.png" },
      { key: "char-attack-south-3", path: "assets/characters/pixel/attack_south_03.png" },
      { key: "char-attack-south-4", path: "assets/characters/pixel/attack_south_04.png" },

      { key: "char-attack-north-1", path: "assets/characters/pixel/attack_north_01.png" },
      { key: "char-attack-north-2", path: "assets/characters/pixel/attack_north_02.png" },
      { key: "char-attack-north-3", path: "assets/characters/pixel/attack_north_03.png" },
      { key: "char-attack-north-4", path: "assets/characters/pixel/attack_north_04.png" },

      { key: "char-attack-east-1", path: "assets/characters/pixel/attack_east_01.png" },
      { key: "char-attack-east-2", path: "assets/characters/pixel/attack_east_02.png" },
      { key: "char-attack-east-3", path: "assets/characters/pixel/attack_east_03.png" },
      { key: "char-attack-east-4", path: "assets/characters/pixel/attack_east_04.png" },

      { key: "char-attack-west-1", path: "assets/characters/pixel/attack_west_01.png" },
      { key: "char-attack-west-2", path: "assets/characters/pixel/attack_west_02.png" },
      { key: "char-attack-west-3", path: "assets/characters/pixel/attack_west_03.png" },
      { key: "char-attack-west-4", path: "assets/characters/pixel/attack_west_04.png" },
    ],
  },
};

export function preloadOutfitAssets(scene, outfitId) {
  const outfit = OUTFITS[outfitId];
  if (!outfit) return;

  for (const asset of outfit.assets) {
    scene.load.image(asset.key, asset.path);
  }
}
