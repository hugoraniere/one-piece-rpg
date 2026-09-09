#!/usr/bin/env python3
"""Color-match a grass/sand transition tile whose boundary isn't a simple
top/bottom split (corners, peninsulas — organic/diagonal shapes), so the
row-based tools/match_terrain_colors.py strip-sampling doesn't apply.

Classifies each pixel as "grass-ish" or "sand-ish" by hue (green channel
dominance vs red/blue), measures this tile's own grass-ish and sand-ish
average colors, compares to the real grass.png/sand.png reference tiles,
and nudges colors accordingly — blended smoothly by how strongly each
pixel reads as grass vs sand, so there's no hard seam at the reclassification
boundary.

Usage:
    python3 tools/match_terrain_colors_by_hue.py tile.png grass_ref.png sand_ref.png output.png
"""
import sys
import numpy as np
from PIL import Image


def match_by_hue(tile_path, grass_ref_path, sand_ref_path, output_path):
    img = Image.open(tile_path).convert("RGB")
    arr = np.array(img, dtype=np.float64)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

    # grassiness: positivo = mais verde que vermelho (grama), negativo = areia
    grassiness = np.clip((g - r) / 40.0, -1, 1)  # -1 areia .. +1 grama
    grass_weight = (grassiness + 1) / 2  # 0..1

    grass_mask = grassiness > 0.3
    sand_mask = grassiness < -0.3
    if grass_mask.sum() == 0 or sand_mask.sum() == 0:
        print(f"aviso: {tile_path} não tem área clara de grama+areia pra calibrar, pulando")
        Image.open(tile_path).save(output_path)
        return

    tile_grass_avg = arr[grass_mask].mean(axis=0)
    tile_sand_avg = arr[sand_mask].mean(axis=0)
    ref_grass_avg = np.array(Image.open(grass_ref_path).convert("RGB"), dtype=np.float64).reshape(-1, 3).mean(axis=0)
    ref_sand_avg = np.array(Image.open(sand_ref_path).convert("RGB"), dtype=np.float64).reshape(-1, 3).mean(axis=0)

    offset_grass = ref_grass_avg - tile_grass_avg
    offset_sand = ref_sand_avg - tile_sand_avg

    w = grass_weight[..., None]
    offset = offset_grass.reshape(1, 1, 3) * w + offset_sand.reshape(1, 1, 3) * (1 - w)

    result = np.clip(arr + offset, 0, 255).astype(np.uint8)
    Image.fromarray(result, mode="RGB").save(output_path)
    print(f"{tile_path} -> {output_path}  offset_grass={offset_grass.round(1)} offset_sand={offset_sand.round(1)}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: match_terrain_colors_by_hue.py tile.png grass_ref.png sand_ref.png output.png")
        sys.exit(1)
    match_by_hue(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
