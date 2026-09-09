#!/usr/bin/env python3
"""Compõe um mockup PNG estático da cena vila+praia usando os PNGs de
verdade do projeto (mais os novos recortados do sheet Pack07 — barco,
doca, ponte, pedra-d'água, vitória-régia), nas proporções medidas em
BEACH_SCENE_ANALYSIS.md.

v2: sem terreno de caminho (não existe nesse jogo), e a borda grama/areia
agora segue uma curva orgânica (soma de senos) em vez de uma faixa reta.

Não mexe no jogo — é só um mockup pra revisão visual antes de aplicar
no main.js. Roda em resolução real do mundo (3200x2400, TILE_SIZE=120)
e reduz o resultado final pela metade pra ficar mais leve de visualizar.
"""
import math
import os
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VILLAGE = os.path.join(BASE, 'assets', 'village')
GROUND = os.path.join(BASE, 'assets', 'ground')
PROPS = os.path.join(BASE, 'assets', 'props')
CHARACTERS = os.path.join(BASE, 'assets', 'characters')
WATER = os.path.join(BASE, 'assets', 'water')

WORLD_WIDTH = 3200
WORLD_HEIGHT = 2400
TILE_SIZE = 120

canvas = Image.new('RGBA', (WORLD_WIDTH, WORLD_HEIGHT), (0, 0, 0, 255))


def wavy_boundary(x, base_y, amplitude, wavelengths):
    """Soma de senos com fases diferentes -> curva orgânica, não periódica
    de forma óbvia. `wavelengths` é uma lista de (comprimento_de_onda, peso)."""
    y = base_y
    for wl, weight, phase in wavelengths:
        y += amplitude * weight * math.sin((x / wl) * 2 * math.pi + phase)
    return y


# --- 1. Terreno base: grama/areia/água com bordas onduladas orgânicas --
#        Em vez de tentar montar a curva com tiles de canto (o autotile
#        certo pra isso é o do editor in-game, feito pra ser ajustado à
#        mão), aqui a curva é uma MÁSCARA em nível de pixel — muito mais
#        confiável pra um mockup e visualmente mais "fluido" que ladrilho.
import numpy as np


def tile_fill(tile_img):
    w, h = tile_img.size
    layer = Image.new('RGBA', (WORLD_WIDTH, WORLD_HEIGHT))
    for ty in range(0, WORLD_HEIGHT, h):
        for tx in range(0, WORLD_WIDTH, w):
            layer.paste(tile_img, (tx, ty))
    return layer


def curve_mask(base_y, amplitude, waves, feather=10, round_px=0):
    """Máscara L: 255 acima da curva, 0 abaixo, com uma pena suave. Um
    blur leve (`round_px`) arredonda os picos da soma de senos, que
    sozinha fica com "bicos" — curva de praia de verdade é arredondada,
    não pontuda."""
    xs = np.arange(WORLD_WIDTH)
    ys = np.full(WORLD_WIDTH, float(base_y))
    for wl, weight, phase in waves:
        ys += amplitude * weight * np.sin((xs / wl) * 2 * math.pi + phase)
    if round_px:
        kernel = np.ones(round_px) / round_px
        ys = np.convolve(ys, kernel, mode='same')
    row_idx = np.arange(WORLD_HEIGHT).reshape(-1, 1)
    dist = row_idx - ys.reshape(1, -1)  # >0 = abaixo da curva
    alpha = np.clip(255 * (0.5 - dist / (2 * feather)), 0, 255).astype('uint8')
    return Image.fromarray(alpha, mode='L')


grass_layer = tile_fill(Image.open(os.path.join(GROUND, 'grass.png')).convert('RGBA'))

GRASS_SAND_WAVES = [(1400, 1.0, 0.4), (600, 0.28, 2.1), (260, 0.1, 4.7)]
gs_mask = curve_mask(round(0.665 * WORLD_HEIGHT), 110, GRASS_SAND_WAVES, feather=16, round_px=70)

# Faixa areia->água: em vez da textura reta antiga, usa as 3 novas
# "master tiles" de transição de água (1254px, mesma convenção do kit
# grama/areia) que o Hugo adicionou — cada uma já traz sua própria curva
# de espuma orgânica, então só precisamos ladrilhá-las lado a lado
# (variando pra não repetir) por baixo da curva de grama.
RICH_BAND_TOP = round(0.583 * WORLD_HEIGHT)  # acima do ponto mais alto que a curva de grama alcança
RICH_TILE_W = 1000
RICH_MARGIN = 450  # folga vertical extra pra poder alinhar as costuras sem cortar a curva
rich_h = WORLD_HEIGHT - RICH_BAND_TOP + RICH_MARGIN
water_src_dir = '/Users/hugo/Downloads/One Piece/Terreno/Transição Agua'
rich_tiles = [
    Image.open(os.path.join(water_src_dir, f'{i}.png')).convert('RGBA').resize((RICH_TILE_W, rich_h), Image.LANCZOS)
    for i in (1, 2, 3)
]


def boundary_profile(tile_img):
    """Pra cada coluna, a linha onde a cor deixa de ser "areia" e vira
    "água" (heurística de matiz, mesma ideia do BEACH_SCENE_ANALYSIS.md)."""
    arr = np.array(tile_img.convert('RGB'), dtype=np.float64)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    is_water = (b > r + 8) & (b > 70)
    h, w = is_water.shape
    prof = np.full(w, h - 1, dtype=float)
    for x in range(w):
        col = np.where(is_water[:, x])[0]
        if len(col):
            prof[x] = col[0]
    return prof


# Alinha cada ladrilho verticalmente pra que a borda direita do anterior
# encoste na borda esquerda do próximo (a curva de espuma fica contínua,
# em vez de dar um "degrau" a cada repetição), depois ainda funde as cores
# numa faixa estreita pra esconder qualquer diferença de textura restante.
profiles = [boundary_profile(t) for t in rich_tiles]
EDGE_SAMPLE = 12
rich_band = Image.new('RGBA', (WORLD_WIDTH, rich_h))
i = 0
running_right_edge = None
for tx in range(0, WORLD_WIDTH, RICH_TILE_W):
    idx = i % 3
    tile = rich_tiles[idx]
    prof = profiles[idx]
    left_edge = prof[:EDGE_SAMPLE].mean()
    right_edge = prof[-EDGE_SAMPLE:].mean()

    if running_right_edge is None:
        shift = 0
    else:
        shift = round(running_right_edge - left_edge)

    ty = RICH_MARGIN + shift  # desloca o ladrilho pra alinhar a costura
    rich_band.paste(tile, (tx, ty), tile)

    if i > 0:
        # funde uma faixa estreita na costura pra suavizar textura/cor
        OVERLAP = 60
        blend_mask = Image.new('L', (OVERLAP, rich_h))
        grad = np.tile(np.linspace(0, 255, OVERLAP, dtype='uint8'), (rich_h, 1))
        blend_mask.putdata(grad.flatten())
        rich_band.paste(tile.crop((0, 0, OVERLAP, rich_h)), (tx, ty), blend_mask)

    running_right_edge = right_edge + shift
    i += 1

rich_band = rich_band.crop((0, RICH_MARGIN, WORLD_WIDTH, RICH_MARGIN + (WORLD_HEIGHT - RICH_BAND_TOP)))

canvas.paste(grass_layer, (0, 0))
canvas.paste(rich_band, (0, RICH_BAND_TOP), rich_band)
canvas.paste(grass_layer, (0, 0), gs_mask)

print('terreno organico ok')


def paste_prop(filename, folder, scale, x_pct, y_pct, flip=False, rotate=0, tint=None, placeholder=False):
    """Cola um prop com origem no pé (bottom-center), como o jogo faz.

    `tint`: (r,g,b) opcional, multiplica a cor — usado só pra disfarçar um
    placeholder temporário (ex.: flor tingida de laranja virando um
    "objeto pequeno na areia" genérico no lugar de uma estrela-do-mar).
    `placeholder` é só documentação inline, não afeta o render.
    """
    img = Image.open(os.path.join(folder, filename)).convert('RGBA')
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if rotate:
        img = img.rotate(rotate, resample=Image.BICUBIC, expand=True)
    if tint:
        r, g, b, a = img.split()
        gray = Image.merge('RGB', (r, g, b)).convert('L')
        tinted = Image.merge('RGB', tuple(gray.point(lambda v, c=c: v * c / 255) for c in tint))
        img = Image.merge('RGBA', (*tinted.split(), a))
    w, h = img.size
    new_w, new_h = max(1, round(w * scale)), max(1, round(h * scale))
    img = img.resize((new_w, new_h), Image.LANCZOS)
    cx = round(x_pct * WORLD_WIDTH)
    feet_y = round(y_pct * WORLD_HEIGHT)
    canvas.paste(img, (cx - new_w // 2, feet_y - new_h), img)


# --- 2. Borda de floresta (topo) — árvores encostadas -------------------
forest_row_y = 0.075
for i, x_pct in enumerate([0.03, 0.08, 0.14, 0.22, 0.30, 0.985, 0.94, 0.885]):
    key = 'tree_ancient.png' if i % 2 == 0 else 'tree_small.png'
    scale = 1.16 if key == 'tree_ancient.png' else 1.71
    paste_prop(key, VILLAGE, scale, x_pct, forest_row_y + (0.02 if key == 'tree_small.png' else 0))

for x_pct in [0.18, 0.26, 0.62, 0.70, 0.90]:
    paste_prop('tree_small.png', VILLAGE, 1.0, x_pct, 0.105)
for x_pct in [0.10, 0.34, 0.66]:
    paste_prop('flower.png', PROPS, 0.28, x_pct, 0.115)

# PLACEHOLDER: na referência esse toco tem um machado cravado + pilha de
# lenha do lado — não existe asset de machado em nenhum catálogo, então
# fica só o toco liso mesmo (nenhum substituto disponível pra isso).
paste_prop('tree_stump.png', VILLAGE, 0.22, 0.07, 0.155, placeholder=True)
paste_prop('rock_cluster.png', VILLAGE, 0.30, 0.05, 0.145)

print('floresta ok')

# --- 3. Casas + lotes -----------------------------------------------------
paste_prop('house_straw.png', VILLAGE, 0.84, 0.155, 0.245)
paste_prop('house_red.png', VILLAGE, 0.92, 0.42, 0.205)
paste_prop('house_blue.png', VILLAGE, 0.87, 0.73, 0.235)

for x_pct in [0.29, 0.565]:
    paste_prop('fence.png', VILLAGE, 0.59, x_pct, 0.29)

paste_prop('barrel.png', VILLAGE, 0.39, 0.205, 0.275)
paste_prop('lootsack.png', VILLAGE, 0.07, 0.235, 0.28)
paste_prop('crate.png', VILLAGE, 0.09, 0.455, 0.235)
paste_prop('barrel.png', VILLAGE, 0.39, 0.485, 0.24)
paste_prop('planter.png', VILLAGE, 0.26, 0.68, 0.275)
paste_prop('crate.png', VILLAGE, 0.09, 0.655, 0.27)
paste_prop('clothesline.png', VILLAGE, 0.53, 0.80, 0.255)
paste_prop('lantern.png', VILLAGE, 0.66, 0.105, 0.27)
paste_prop('lantern.png', VILLAGE, 0.66, 0.635, 0.22)

print('casas ok')

# --- 4. Praça central: poço, fogueira, quadro de avisos -----------------
paste_prop('well.png', VILLAGE, 0.68, 0.545, 0.335)
paste_prop('barrel.png', VILLAGE, 0.39, 0.515, 0.345)
paste_prop('barrel.png', VILLAGE, 0.39, 0.575, 0.35)

paste_prop('noticeboard.png', VILLAGE, 0.79, 0.415, 0.46)
paste_prop('lantern.png', VILLAGE, 0.66, 0.455, 0.47)
paste_prop('barrel.png', VILLAGE, 0.39, 0.37, 0.475)

paste_prop('campfire.png', VILLAGE, 0.20, 0.725, 0.415)
paste_prop('tree_stump.png', VILLAGE, 0.22, 0.665, 0.43)
paste_prop('lantern.png', VILLAGE, 0.66, 0.775, 0.475)
# PLACEHOLDER: banco de madeira não existe em nenhum catálogo (nem no
# projeto, nem no Pack07/vila_semente) — usando um pedaço de cerca deitado
# como aproximação temporária. Precisa gerar um banco de verdade.
paste_prop('fence.png', VILLAGE, 0.28, 0.685, 0.44, placeholder=True)
paste_prop('fence.png', VILLAGE, 0.28, 0.765, 0.445, placeholder=True)

for x_pct in [0.37, 0.60, 0.635]:
    paste_prop('tree_small.png', VILLAGE, 0.9, x_pct, 0.50)
paste_prop('flower.png', PROPS, 0.28, 0.29, 0.505)

print('praca ok')

# --- 5. Faixa de transição: pedras no penhasco esquerdo ------------------
paste_prop('rock_cluster.png', VILLAGE, 0.55, 0.035, 0.685)
paste_prop('rock_cluster.png', VILLAGE, 0.35, 0.075, 0.705)

# --- 6. Praia: tronco, barco a remo (novo, recortado do Pack07) ---------
paste_prop('log.png', PROPS, 0.69, 0.40, 0.755)
paste_prop('boat_row.png', WATER, 0.85, 0.885, 0.78, rotate=-12)
paste_prop('log.png', PROPS, 0.40, 0.845, 0.795)

# PLACEHOLDER: estrela-do-mar não existe em nenhum catálogo — usando a
# flor tingida de laranja como aproximação bem temporária (só pra marcar
# "tem um objeto pequeno aqui"), precisa gerar uma estrela-do-mar de verdade.
paste_prop('flower.png', PROPS, 0.14, 0.47, 0.735, tint=(235, 120, 40), placeholder=True)

# PLACEHOLDER: pedrinha solta também não existe (só temos rock-cluster,
# que é uma formação grande) — usando rock-cluster bem reduzido.
for x_pct, y_pct in [(0.30, 0.765), (0.60, 0.79), (0.71, 0.815), (0.24, 0.80)]:
    paste_prop('rock_cluster.png', VILLAGE, 0.09, x_pct, y_pct, placeholder=True)

# --- 7. Doca (novo) + pedra-d'água (novo) --------------------------------
paste_prop('dock_pier.png', WATER, 1.35, 0.06, 0.935)
paste_prop('water_rock.png', WATER, 0.85, 0.02, 0.71)
paste_prop('water_rock.png', WATER, 0.55, 0.965, 0.755)
paste_prop('lilypad_flower.png', WATER, 0.55, 0.30, 0.95)
paste_prop('lilypad_plain.png', WATER, 0.45, 0.46, 0.975)

print('doca/agua ok')

# --- 8. Personagem, pra referência de escala -----------------------------
paste_prop('idle_front.png', CHARACTERS, 0.65, 0.50, 0.79)

print('personagem ok')

# --- Salvar --------------------------------------------------------------
out_full = os.path.join(BASE, 'tools', 'scratch', 'scene_mockup_full.png')
out_half = os.path.join(BASE, 'tools', 'scratch', 'scene_mockup.png')
canvas.save(out_full)
canvas.resize((WORLD_WIDTH // 2, WORLD_HEIGHT // 2), Image.LANCZOS).save(out_half)
print('salvo:', out_half)
