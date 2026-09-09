#!/usr/bin/env python3
"""Color-match a transition tile (grass-on-top-of-something, or similar) to
the two pure tiles it sits between, so the seams don't show a color jump.

Each transition tile was generated independently from the pure tiles, so
its "grass" half (for example) is a slightly different shade of green than
ground-grass.png. This samples a thin strip at the very top and very bottom
of the transition tile (the parts that touch the pure tiles), compares them
to the pure tiles' average color, and nudges the transition tile's colors
row-by-row (blending smoothly from a top correction to a bottom correction)
so both edges match their neighbor.

Usage:
    python3 tools/match_terrain_colors.py transition.png top_ref.png bottom_ref.png output.png
"""
import sys
import numpy as np
from PIL import Image


def average_color(img_path, region=None):
    img = np.array(Image.open(img_path).convert("RGB"), dtype=np.float64)
    if region is not None:
        y0, y1 = region
        img = img[y0:y1]
    return img.reshape(-1, 3).mean(axis=0)


def match_terrain_colors(transition_path, top_ref_path, bottom_ref_path, output_path, edge_frac=0.12):
    img = Image.open(transition_path).convert("RGB")
    arr = np.array(img, dtype=np.float64)
    h = arr.shape[0]
    edge = max(1, int(h * edge_frac))

    src_top = average_color(transition_path, (0, edge))
    src_bottom = average_color(transition_path, (h - edge, h))
    dst_top = average_color(top_ref_path)
    dst_bottom = average_color(bottom_ref_path)

    offset_top = dst_top - src_top
    offset_bottom = dst_bottom - src_bottom

    t = np.linspace(0, 1, h).reshape(h, 1, 1)  # 0 no topo, 1 embaixo
    offset = offset_top.reshape(1, 1, 3) * (1 - t) + offset_bottom.reshape(1, 1, 3) * t

    result = np.clip(arr + offset, 0, 255).astype(np.uint8)
    Image.fromarray(result, mode="RGB").save(output_path)
    print(f"{transition_path} -> {output_path}")
    print(f"  offset topo: {offset_top.round(1)}  offset base: {offset_bottom.round(1)}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: match_terrain_colors.py transition.png top_ref.png bottom_ref.png output.png")
        sys.exit(1)
    match_terrain_colors(*sys.argv[1:5])
