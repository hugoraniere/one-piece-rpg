#!/usr/bin/env python3
"""Remove a solid chroma-key background (e.g. green screen) from a PNG,
turning it into real alpha transparency.

Usage:
    python3 tools/remove_chroma_key.py input.png output.png

The key color is sampled automatically from the four corners of the image
(averaged), so it works as long as the background is one solid color and
the corners aren't covered by the character. Edge pixels get partial alpha
instead of a hard cutoff, to avoid jagged/haloed edges.
"""
import sys
from PIL import Image


def remove_chroma_key(input_path, output_path, low=60, high=120):
    img = Image.open(input_path).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    corners = [pixels[0, 0], pixels[width - 1, 0], pixels[0, height - 1], pixels[width - 1, height - 1]]
    key_r = sum(c[0] for c in corners) / 4
    key_g = sum(c[1] for c in corners) / 4
    key_b = sum(c[2] for c in corners) / 4

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            dist = ((r - key_r) ** 2 + (g - key_g) ** 2 + (b - key_b) ** 2) ** 0.5

            if dist < low:
                pixels[x, y] = (r, g, b, 0)
            elif dist < high:
                alpha = int(255 * (dist - low) / (high - low))
                pixels[x, y] = (r, g, b, min(a, alpha))
            # else: keep fully opaque

    img.save(output_path)
    print(f"{input_path} -> {output_path} (key color ~= {key_r:.0f},{key_g:.0f},{key_b:.0f})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 remove_chroma_key.py input.png output.png")
        sys.exit(1)
    remove_chroma_key(sys.argv[1], sys.argv[2])
