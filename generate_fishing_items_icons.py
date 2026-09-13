#!/usr/bin/env python3
"""Generate 10 fishing & material item icons in hard-pixel style matching sword.png aesthetic."""

from PIL import Image, ImageDraw
import os

# Output directory
OUT_DIR = "assets/icons"
os.makedirs(OUT_DIR, exist_ok=True)

# Palette: hard-pixel style with limited colors per icon
# Reference colors from sword.png: black (0,0,0), browns, grays, whites
COLORS = {
    'black': (0, 0, 0),
    'dark_brown': (74, 44, 23),
    'brown': (139, 108, 39),
    'light_brown': (196, 156, 62),
    'dark_gray': (55, 55, 55),
    'mid_gray': (120, 126, 138),
    'light_gray': (196, 200, 209),
    'white': (238, 241, 245),
    # Additional colors for variety
    'red': (180, 40, 40),
    'dark_red': (120, 20, 20),
    'blue': (40, 60, 140),
    'dark_blue': (20, 30, 80),
    'orange': (200, 100, 30),
    'tan': (180, 160, 120),
    'cream': (220, 210, 190),
    'pink': (220, 100, 150),
}

def draw_solid_rect(draw, x, y, w, h, color, outline=True):
    """Draw a solid rectangle with black outline."""
    if outline:
        draw.rectangle([x-1, y-1, x+w, y+h], fill='black')
    draw.rectangle([x, y, x+w-1, y+h-1], fill=color)

def draw_solid_circle(draw, cx, cy, r, color, outline=True):
    """Draw a solid circle with black outline."""
    if outline:
        draw.ellipse([cx-r-1, cy-r-1, cx+r+1, cy+r+1], fill='black')
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color)

def create_graveto():
    """Small stick/log of wood."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Main body: rotated stick
    draw_solid_rect(draw, 8, 6, 16, 4, COLORS['dark_brown'])
    draw_solid_rect(draw, 9, 10, 14, 3, COLORS['brown'])
    draw_solid_rect(draw, 10, 13, 12, 2, COLORS['light_brown'])
    img.save(f"{OUT_DIR}/graveto.png")

def create_corda():
    """Coiled rope."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Coil: concentric circles with dark brown outline
    draw_solid_circle(draw, 16, 16, 9, COLORS['dark_brown'], outline=True)
    draw_solid_circle(draw, 16, 16, 7, COLORS['brown'], outline=True)
    draw_solid_circle(draw, 16, 16, 5, COLORS['tan'], outline=True)
    img.save(f"{OUT_DIR}/corda.png")

def create_ferro_bruto():
    """Raw iron ore."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Rough stone with metal veins
    draw_solid_rect(draw, 6, 8, 20, 16, COLORS['dark_gray'])
    draw_solid_rect(draw, 7, 9, 18, 14, COLORS['mid_gray'])
    # Metal veins
    draw_solid_rect(draw, 10, 10, 3, 12, COLORS['light_gray'])
    draw_solid_rect(draw, 18, 12, 2, 10, COLORS['light_gray'])
    img.save(f"{OUT_DIR}/ferro-bruto.png")

def create_linha_de_nylon():
    """Fishing line spool - wooden spool with blue line."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Wooden spool body
    draw_solid_circle(draw, 16, 10, 6, COLORS['dark_brown'])
    draw_solid_rect(draw, 12, 16, 8, 3, COLORS['brown'])
    draw_solid_circle(draw, 16, 22, 6, COLORS['dark_brown'])
    # Blue line wrapped
    draw_solid_rect(draw, 10, 12, 12, 8, COLORS['blue'])
    img.save(f"{OUT_DIR}/linha-de-nylon.png")

def create_minhoca():
    """Worm - pink, curved in S shape."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # S-curve worm
    draw_solid_circle(draw, 10, 8, 3, COLORS['pink'])
    draw_solid_circle(draw, 12, 12, 3, COLORS['pink'])
    draw_solid_circle(draw, 14, 16, 3, COLORS['pink'])
    draw_solid_circle(draw, 16, 20, 3, COLORS['pink'])
    draw_solid_circle(draw, 18, 24, 2, COLORS['pink'])
    img.save(f"{OUT_DIR}/minhoca.png")

def create_isca_improvisada():
    """Improvised bait - cream/beige grub in C shape."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # C-shape body
    draw_solid_circle(draw, 12, 10, 4, COLORS['cream'])
    draw_solid_circle(draw, 14, 14, 4, COLORS['cream'])
    draw_solid_circle(draw, 14, 20, 4, COLORS['cream'])
    draw_solid_circle(draw, 12, 24, 3, COLORS['tan'])
    img.save(f"{OUT_DIR}/isca-improvisada.png")

def create_peixe():
    """Blue fish - side view with tail and fins."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Body
    draw_solid_rect(draw, 6, 12, 14, 8, COLORS['dark_blue'])
    draw_solid_circle(draw, 8, 16, 4, COLORS['blue'])  # head
    # Tail
    draw_solid_rect(draw, 19, 14, 8, 4, COLORS['mid_gray'])
    # Fins
    draw_solid_rect(draw, 12, 10, 2, 3, COLORS['mid_gray'])
    draw_solid_rect(draw, 12, 19, 2, 3, COLORS['mid_gray'])
    img.save(f"{OUT_DIR}/peixe.png")

def create_robalo():
    """Golden fish - same pose as peixe but gold color."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Body
    draw_solid_rect(draw, 6, 12, 14, 8, COLORS['orange'])
    draw_solid_circle(draw, 8, 16, 4, COLORS['light_brown'])  # head
    # Tail
    draw_solid_rect(draw, 19, 14, 8, 4, COLORS['tan'])
    # Fins
    draw_solid_rect(draw, 12, 10, 2, 3, COLORS['tan'])
    draw_solid_rect(draw, 12, 19, 2, 3, COLORS['tan'])
    img.save(f"{OUT_DIR}/robalo.png")

def create_truta():
    """Pufferfish/Baiacu - orange, round with spines."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Round body
    draw_solid_circle(draw, 16, 16, 8, COLORS['orange'])
    # Spines (small rectangles around perimeter)
    for angle in range(0, 360, 45):
        import math
        x = 16 + int(math.cos(math.radians(angle)) * 10)
        y = 16 + int(math.sin(math.radians(angle)) * 10)
        draw_solid_rect(draw, x-1, y-1, 2, 2, COLORS['black'])
    # Eye
    draw_solid_circle(draw, 14, 14, 1, COLORS['white'])
    img.save(f"{OUT_DIR}/truta.png")

def create_lixo_marinho():
    """Rusty can - gray metal with red/brown rust."""
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Can body
    draw_solid_rect(draw, 8, 8, 16, 14, COLORS['dark_gray'])
    draw_solid_rect(draw, 9, 9, 14, 12, COLORS['mid_gray'])
    # Rust patches
    draw_solid_rect(draw, 10, 10, 3, 3, COLORS['dark_red'])
    draw_solid_rect(draw, 17, 12, 2, 4, COLORS['red'])
    draw_solid_rect(draw, 12, 16, 4, 2, COLORS['dark_red'])
    # Dents
    draw_solid_rect(draw, 14, 11, 1, 5, COLORS['dark_gray'])
    img.save(f"{OUT_DIR}/lixo-marinho.png")

if __name__ == "__main__":
    print("Generating fishing item icons...")
    create_graveto()
    print("  ✓ graveto.png")
    create_corda()
    print("  ✓ corda.png")
    create_ferro_bruto()
    print("  ✓ ferro-bruto.png")
    create_linha_de_nylon()
    print("  ✓ linha-de-nylon.png")
    create_minhoca()
    print("  ✓ minhoca.png")
    create_isca_improvisada()
    print("  ✓ isca-improvisada.png")
    create_peixe()
    print("  ✓ peixe.png")
    create_robalo()
    print("  ✓ robalo.png")
    create_truta()
    print("  ✓ truta.png")
    create_lixo_marinho()
    print("  ✓ lixo-marinho.png")
    print("Done!")
