#!/usr/bin/env python3
"""Remove a baked-in gray/white "transparency checkerboard" background.

Some AI image generations, when asked for a transparent background, instead
draw a literal picture of the checkerboard icon that editors use to
*represent* transparency — solid gray/white pixels, not real alpha. A normal
chroma-key (single solid color) doesn't work here because the checker
alternates between two colors.

This targets pixels that are both (a) desaturated/grayscale (R, G and B are
close to each other) and (b) bright — which the checkerboard is, and actual
plant/prop artwork usually isn't — and fades them to transparent.

Usage:
    python3 tools/remove_checkerboard_bg.py input.png output.png
"""
import sys
import numpy as np
from PIL import Image


def remove_checkerboard_bg(input_path, output_path, chroma_max=30, brightness_min=150, brightness_full=200):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img, dtype=np.float64)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    chroma = np.max(arr[..., :3], axis=-1) - np.min(arr[..., :3], axis=-1)
    brightness = arr[..., :3].mean(axis=-1)

    grayness = np.clip(1 - chroma / chroma_max, 0, 1)
    brightness_score = np.clip((brightness - brightness_min) / (brightness_full - brightness_min), 0, 1)
    bg_score = grayness * brightness_score  # 1 = definitely checkerboard background

    new_alpha = np.clip(a * (1 - bg_score), 0, 255)
    # "Posteriza" a transparência: mata de vez qualquer resíduo fraco (a
    # neblina cinza que sobrava do quadriculado) e recupera pixels que já
    # estavam quase 100% opacos — sem essa etapa sobra uma auréola visível
    # em volta do objeto quando ele fica sobre um fundo de cor clara no jogo.
    new_alpha = np.where(new_alpha < 60, 0, new_alpha)
    new_alpha = np.where(new_alpha > 200, 255, new_alpha)
    new_alpha = new_alpha.astype(np.uint8)
    result = np.dstack([arr[..., 0], arr[..., 1], arr[..., 2], new_alpha]).astype(np.uint8)

    Image.fromarray(result, mode="RGBA").save(output_path)
    print(f"{input_path} -> {output_path}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: remove_checkerboard_bg.py input.png output.png")
        sys.exit(1)
    remove_checkerboard_bg(sys.argv[1], sys.argv[2])
