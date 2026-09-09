#!/usr/bin/env python3
"""Normalize a chroma-keyed character frame to a consistent scale/baseline
so animation frames don't jitter/deform relative to each other.

Detects the opaque bounding box, scales it to TARGET_HEIGHT tall, then
pastes it onto a CANVAS_SIZE x CANVAS_SIZE transparent canvas centered
horizontally with its bottom edge at BOTTOM_Y.

Usage:
    python3 tools/normalize_char_frame.py input.png output.png
"""
import sys
import numpy as np
from PIL import Image

CANVAS_SIZE = 200
TARGET_HEIGHT = 174
BOTTOM_Y = 185


def normalize(input_path, output_path):
    img = Image.open(input_path).convert("RGBA")
    arr = np.array(img)
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > 10)
    if len(ys) == 0:
        raise SystemExit(f"{input_path}: no opaque pixels found")

    top, bottom = ys.min(), ys.max()
    left, right = xs.min(), xs.max()
    cropped = img.crop((left, top, right + 1, bottom + 1))

    bbox_h = bottom - top + 1
    scale = TARGET_HEIGHT / bbox_h
    new_w = max(1, round(cropped.width * scale))
    new_h = max(1, round(cropped.height * scale))
    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    paste_x = (CANVAS_SIZE - new_w) // 2
    paste_y = BOTTOM_Y - new_h
    canvas.paste(resized, (paste_x, paste_y), resized)
    canvas.save(output_path)
    print(f"{input_path} -> {output_path}  bbox_h={bbox_h} scale={scale:.3f} pasted_at=({paste_x},{paste_y})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: normalize_char_frame.py input.png output.png")
        sys.exit(1)
    normalize(sys.argv[1], sys.argv[2])
