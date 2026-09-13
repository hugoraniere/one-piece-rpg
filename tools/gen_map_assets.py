#!/usr/bin/env python3
"""Gera os assets pixel art do mapa de viagem (ui/mapMenu.js + menu.css),
pra substituir os blobs de CSS (border-radius aleatório) que existiam antes.

Mesma técnica validada nos ícones de item (ver commit "Refaz ícones com
técnica real de pixel art"): silhueta grande e simples desenhada em baixa
resolução nativa, contorno sólido via dilatação do canal alpha (double-draw:
forma escura "atrás" do preenchimento), poucas cores em bandas chapadas —
depois upscale NEAREST por um fator inteiro pra virar PNG nítido em pixel
art (sem antialiasing/gradiente suave).

Paleta alinhada com o que o resto do jogo já usa: base clara igual ao
`.menu-panel` padrão (#e8d9b0) pras cartas de pergaminho, contorno igual à
cor de texto dos menus (#2b1b12), e os tons de ilha "atual"/"viajável" que
já existiam no CSS antigo (#7a8a4c / #9aa860) — pra ilha combinar com o
hover que o CSS novo ainda aplica via filtro, não troca de PNG.

Usage:
    python3 tools/gen_map_assets.py
"""
import os

import numpy as np
from PIL import Image, ImageDraw

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'assets', 'map')
os.makedirs(OUT, exist_ok=True)

INK = (35, 22, 14, 255)
INK_SOFT = (74, 50, 30, 255)

PARCHMENT = (232, 217, 176, 255)
PARCHMENT_MID = (211, 189, 143, 255)
PARCHMENT_STAIN = (181, 152, 101, 255)
PARCHMENT_DARK = (145, 116, 74, 255)

VILLAGE_LAND = (122, 138, 76, 255)
VILLAGE_LAND_LIGHT = (154, 168, 96, 255)
ROOF_RED = (150, 58, 40, 255)
MAST_WOOD = (107, 74, 43, 255)

PORT_SAND = (191, 156, 101, 255)
PORT_SAND_LIGHT = (214, 181, 126, 255)
DOCK_WOOD = (122, 84, 48, 255)
DOCK_WOOD_LIGHT = (150, 106, 62, 255)
SAIL_CREAM = (226, 214, 180, 255)
HULL_BROWN = (94, 61, 33, 255)
WATER_BAY = (46, 104, 135, 255)
WATER_BAY_LIGHT = (74, 138, 168, 255)

FOREST_DARK = (58, 82, 46, 255)
FOREST_MID = (78, 105, 56, 255)
FOREST_LIGHT = (104, 132, 68, 255)
TRUNK = (75, 51, 30, 255)

SWAMP_MUD = (95, 92, 58, 255)
SWAMP_MUD_LIGHT = (117, 112, 74, 255)
SWAMP_WATER = (74, 87, 74, 255)
REED = (139, 132, 74, 255)

UNKNOWN_FILL = (58, 46, 34, 255)


def canvas(w, h):
    return Image.new('RGBA', (w, h), (0, 0, 0, 0))


def outline(img, color=INK, size=1):
    """Dilata o canal alpha por `size` px (raio de Chebyshev) e pinta só o
    anel novo — a "forma preta expandida atrás do preenchimento" da técnica
    dos ícones, sem depender de nenhuma lib de morfologia externa."""
    arr = np.array(img)
    mask = arr[:, :, 3] > 10
    dil = mask.copy()
    for dy in range(-size, size + 1):
        for dx in range(-size, size + 1):
            if dx == 0 and dy == 0:
                continue
            dil |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    ring = dil & ~mask
    out = np.zeros_like(arr)
    out[ring] = color
    return Image.alpha_composite(Image.fromarray(out, 'RGBA'), img)


def upscale(img, factor):
    return img.resize((img.width * factor, img.height * factor), Image.NEAREST)


def save(img, name, factor=4, outline_size=1):
    final = upscale(outline(img, size=outline_size), factor)
    path = os.path.join(OUT, name)
    final.save(path)
    print(f'{name}: {final.size}')


def blob(draw, cx, cy, rx, ry, color, bumps=None):
    """Silhueta de ilha orgânica: elipse base + alguns "morros" (círculos
    extras) pra fugir do oval perfeito sem precisar de polígono à mão."""
    draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=color)
    for (bx, by, br) in bumps or []:
        draw.ellipse([cx + bx - br, cy + by - br, cx + bx + br, cy + by + br], fill=color)


# ---------------------------------------------------------------- pergaminho
def gen_parchment_bg():
    w, h = 190, 105
    rng = np.random.default_rng(7)
    img = Image.new('RGBA', (w, h), PARCHMENT)
    px = img.load()
    # Manchas grandes (poucas, baixa frequência) — não ruído por pixel, que
    # leria como estática, e sim blocos irregulares tipo mancha de água.
    stain_layer = canvas(w, h)
    sd = ImageDraw.Draw(stain_layer)
    for _ in range(14):
        cx, cy = rng.integers(0, w), rng.integers(0, h)
        rx, ry = rng.integers(8, 26), rng.integers(6, 18)
        tone = PARCHMENT_STAIN if rng.random() < 0.6 else PARCHMENT_MID
        alpha = int(rng.integers(40, 90))
        sd.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(*tone[:3], alpha))
    img = Image.alpha_composite(img, stain_layer)
    # Hachura de "linhas de carta" bem sutil — pontinhos em grade esparsa,
    # não linhas retas contínuas (fica mais "desenhado à mão").
    dots = canvas(w, h)
    dd = ImageDraw.Draw(dots)
    for gy in range(6, h, 12):
        for gx in range(6, w, 12):
            if rng.random() < 0.7:
                dd.point((gx, gy), fill=(*PARCHMENT_DARK[:3], 90))
    img = Image.alpha_composite(img, dots)
    # Borda "queimada" — escurece pra dentro nos 4 cantos.
    burn = canvas(w, h)
    bd = ImageDraw.Draw(burn)
    for i in range(10):
        alpha = int(180 * (1 - i / 10))
        bd.rectangle([i, i, w - 1 - i, h - 1 - i], outline=(*INK_SOFT[:3], alpha))
    img = Image.alpha_composite(img, burn)
    img.resize((w * 4, h * 4), Image.NEAREST).save(os.path.join(OUT, 'parchment_bg.png'))
    print('parchment_bg.png', (w * 4, h * 4))


# --------------------------------------------------------------------- navio
def gen_ship():
    w, h = 20, 20
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    # casco
    d.polygon([(3, 13), (17, 13), (15, 17), (5, 17)], fill=HULL_BROWN)
    d.line([(3, 13), (17, 13)], fill=(120, 82, 46, 255))
    # mastro + vela
    d.rectangle([9, 3, 10, 13], fill=MAST_WOOD)
    d.polygon([(10, 4), (16, 9), (10, 11)], fill=SAIL_CREAM)
    d.polygon([(10, 5), (6, 10), (10, 12)], fill=(206, 194, 160, 255))
    save(img, 'ship.png', factor=5)


# ------------------------------------------------------------------ genérico
def new_island_canvas():
    return canvas(36, 24), ImageDraw.Draw(Image.new('RGBA', (1, 1)))


def gen_island_vila():
    w, h = 36, 24
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    blob(d, 18, 15, 13, 7, VILLAGE_LAND, bumps=[(-9, 2, 5), (9, 1, 6), (0, -3, 6)])
    blob(d, 15, 12, 9, 5, VILLAGE_LAND_LIGHT, bumps=[(6, -1, 4)])
    # casinhas simples (telhado triangular vermelho + base)
    for hx in (11, 19):
        d.rectangle([hx, 11, hx + 3, 13], fill=(176, 158, 118, 255))
        d.polygon([(hx - 1, 11), (hx + 4, 11), (hx + 1.5, 7)], fill=ROOF_RED)
    # mastro partido — vara inclinada com a ponta quebrada, bandeira caída
    d.line([(24, 13), (27, 4)], fill=MAST_WOOD, width=1)
    d.line([(27, 4), (29, 7)], fill=MAST_WOOD, width=1)
    d.polygon([(27, 4), (31, 5), (27, 7)], fill=ROOF_RED)
    save(img, 'island-vila-do-mastro-partido.png')


def gen_island_portomares():
    w, h = 36, 24
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    blob(d, 15, 14, 12, 7, PORT_SAND, bumps=[(-9, 2, 5), (2, -4, 6)])
    blob(d, 13, 12, 8, 5, PORT_SAND_LIGHT)
    # enseada — mordida de água azul na lateral direita, pra ficar óbvio
    # que é um porto sem depender do fundo do mapa (que agora é pergaminho,
    # não mar azul como no CSS antigo).
    d.ellipse([20, 8, 33, 20], fill=WATER_BAY)
    d.ellipse([21, 9, 29, 16], fill=WATER_BAY_LIGHT)
    # doca de madeira atravessando a enseada
    d.rectangle([17, 12, 28, 14], fill=DOCK_WOOD)
    d.line([(17, 12), (28, 12)], fill=DOCK_WOOD_LIGHT, width=1)
    # barquinho ancorado na ponta da doca
    d.polygon([(26, 15), (33, 15), (32, 18), (27, 18)], fill=HULL_BROWN)
    d.line([(29, 10), (29, 15)], fill=MAST_WOOD)
    d.polygon([(29, 11), (33, 14), (29, 14)], fill=SAIL_CREAM)
    save(img, 'island-portomares.png')


def gen_island_floresta():
    w, h = 36, 24
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    blob(d, 18, 15, 13, 7, FOREST_DARK, bumps=[(-9, 1, 6), (9, 2, 5), (0, -2, 6)])
    # copas de árvore — vários círculos sobrepostos em 2 tons, sem contorno
    # individual (só o outline geral da ilha depois) pra não virar ruído.
    canopies = [
        (9, 9, 4, FOREST_MID), (14, 6, 5, FOREST_LIGHT), (20, 7, 5, FOREST_MID),
        (26, 9, 4, FOREST_LIGHT), (12, 13, 4, FOREST_MID), (19, 13, 5, FOREST_DARK),
        (25, 14, 4, FOREST_LIGHT), (16, 18, 4, FOREST_MID),
    ]
    for cx, cy, r, tone in canopies:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=tone)
    save(img, 'island-floresta-sussurro.png')


def gen_island_pantano():
    w, h = 36, 24
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    blob(d, 18, 15, 13, 7, SWAMP_MUD, bumps=[(-9, 2, 5), (9, 1, 6), (0, -2, 6)])
    # poças d'água parada dentro da ilha
    for cx, cy, rx, ry in [(11, 16, 3, 2), (23, 17, 3, 2)]:
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=SWAMP_WATER)
    # árvores retorcidas — tronco em zigue-zague fino, sem copa cheia
    for tx in (10, 18, 26):
        ty = 13
        d.line([(tx, ty), (tx + 2, ty - 4), (tx - 1, ty - 8), (tx + 1, ty - 11)], fill=TRUNK, width=1)
    # juncos finos
    for rx in (14, 22, 30):
        d.line([(rx, 16), (rx - 1, 10)], fill=REED, width=1)
    save(img, 'island-pantano-ronco.png')


def gen_island_unknown():
    w, h = 24, 16
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    blob(d, 12, 9, 8, 4, UNKNOWN_FILL, bumps=[(-5, 1, 3), (5, 1, 3)])
    save(img, 'island-unknown.png', factor=4)


# ------------------------------------------------------------------- bússola
def gen_compass():
    w, h = 40, 40
    img = canvas(w, h)
    d = ImageDraw.Draw(img)
    cx, cy = 20, 20
    d.ellipse([cx - 17, cy - 17, cx + 17, cy + 17], outline=PARCHMENT_DARK, width=1)
    # 4 pontas principais (N maior/destacada) em bandas de cor chapada
    pts_main = [
        ((cx, cy - 18), (cx + 4, cy), (cx, cy), (cx - 4, cy), ROOF_RED),  # N
        ((cx, cy + 18), (cx + 3, cy), (cx, cy), (cx - 3, cy), INK_SOFT),  # S
        ((cx + 18, cy), (cx, cy + 3), (cx, cy), (cx, cy - 3), INK_SOFT),  # E
        ((cx - 18, cy), (cx, cy + 3), (cx, cy), (cx, cy - 3), INK_SOFT),  # W
    ]
    for tip, a, center, b, color in pts_main:
        d.polygon([tip, a, b], fill=color)
    # pontas diagonais, menores e mais discretas
    for dx, dy in [(1, 1), (1, -1), (-1, 1), (-1, -1)]:
        tip = (cx + dx * 12, cy + dy * 12)
        a = (cx + dx * 2, cy)
        b = (cx, cy + dy * 2)
        d.polygon([tip, a, b], fill=PARCHMENT_DARK)
    d.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill=INK)
    save(img, 'compass.png', factor=3)


if __name__ == '__main__':
    gen_parchment_bg()
    gen_ship()
    gen_island_vila()
    gen_island_portomares()
    gen_island_floresta()
    gen_island_pantano()
    gen_island_unknown()
    gen_compass()
