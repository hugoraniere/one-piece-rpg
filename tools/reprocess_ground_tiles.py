#!/usr/bin/env python3
"""Reprocessa grama/areia/água + o kit de transição direto dos originais em
alta resolução, SEM o downscale agressivo pra 120px que o pipeline antigo
usava (perdia quase todo o detalhe pintado — ver conversa de design/
VISUAL_STYLE_GUIDE.md pro diagnóstico completo).

Pipeline por tile:
  1. Carrega o PNG original (1254×1254, de ~/Downloads/One Piece/Terreno/).
  2. Redimensiona pra TARGET_RES (LANCZOS — melhor qualidade de downscale
     que o padrão do Phaser, feito uma vez aqui em vez de em runtime).
  3. Aplica a MESMA correção de cor de recolor_ground_palette.py (os
     originais nunca passaram por ela — só as versões 120px antigas).
  4. Salva por cima do arquivo em assets/ground/.

O kit de transição (edge/corner/peninsula) usa uma mistura contínua
grama↔areia em vez de uma correção única, porque cada imagem tem os dois
materiais ao mesmo tempo — mesma técnica de recolor_background_sand_water,
sem o componente de água (esses tiles nunca têm água).

Depois de rodar isto, rode de novo (nessa ordem):
  python3 tools/build_terrain_background.py 2560 1920 assets/ground/scene_background.png
  python3 -c "import sys; sys.path.insert(0,'tools'); from recolor_ground_palette import recolor_background_sand_water; recolor_background_sand_water('assets/ground/scene_background.png')"
pra recompor o fundo com a grama nova (a areia/água do fundo vem de uma
fonte externa diferente, não mexida aqui — ver WATER_SRC_DIR em
build_terrain_background.py).

Usage:
    python3 tools/reprocess_ground_tiles.py
"""
import colorsys
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from recolor_ground_palette import DELTAS, apply_hsv_delta  # noqa: E402

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUND = os.path.join(BASE, 'assets', 'ground')
DOWNLOADS_TERRENO = os.path.join(os.path.expanduser('~'), 'Downloads', 'One Piece', 'Terreno')
DOWNLOADS_DESCARTADO = os.path.join(
    os.path.expanduser('~'), 'Downloads', 'Ambiente Sprites', '_terreno-descartado'
)

TARGET_RES = 512  # 120 -> 512: ~18x mais pixel que antes, ainda leve o bastante pra um tile que repete

# Tiles de UM material só — corrigidos com sim/DELTAS direto (ver
# recolor_ground_palette.py pro porquê de cada número).
BASE_TILES = {
    'grass': os.path.join(DOWNLOADS_DESCARTADO, 'Grama 2.png'),
    'sand': os.path.join(DOWNLOADS_TERRENO, 'Areia de Praia.png'),
    'water': os.path.join(DOWNLOADS_TERRENO, 'Agua.png'),
}

# Tiles com grama E areia na mesma imagem (kit de transição) — mistura
# contínua por peso, não correção única.
TRANSITION_TILES = {
    'sand_edge_a': os.path.join(DOWNLOADS_TERRENO, 'GRASS_SAND_TRANSITION_KIT_A', 'TRANSITION_GRASS_TO_SAND_SOUTH_A.png'),
    'sand_edge_b': os.path.join(DOWNLOADS_TERRENO, 'GRASS_SAND_TRANSITION_KIT_A', 'TRANSITION_GRASS_TO_SAND_SOUTH_B.png'),
    'sand_outer_corner_0': os.path.join(
        DOWNLOADS_TERRENO, 'GRASS_SAND_TRANSITION_KIT_A', 'TRANSITION_GRASS_TO_SAND_OUTER_CORNER_TOP_LEFT_A.png'
    ),
    'sand_inner_corner_0': os.path.join(
        DOWNLOADS_TERRENO, 'GRASS_SAND_TRANSITION_KIT_A', 'TRANSITION_GRASS_TO_SAND_INNER_CORNER_TOP_LEFT_A.png'
    ),
    'sand_peninsula_0': os.path.join(
        DOWNLOADS_TERRENO, 'GRASS_SAND_TRANSITION_KIT_A', 'TRANSITION_GRASS_TO_SAND_PENINSULA_END_SOUTH_A.png'
    ),
}


def load_resized(path):
    img = Image.open(path).convert('RGB')
    if img.size != (TARGET_RES, TARGET_RES):
        img = img.resize((TARGET_RES, TARGET_RES), Image.LANCZOS)
    return img


def process_base_tile(name, src_path):
    if not os.path.exists(src_path):
        print(f'AVISO: fonte não encontrada, pulando "{name}": {src_path}')
        return
    img = load_resized(src_path)
    arr = np.array(img)
    hue_shift, sat_scale, val_scale = DELTAS[name]
    out = apply_hsv_delta(arr, hue_shift, sat_scale, val_scale)
    out_path = os.path.join(GROUND, f'{name}.png')
    Image.fromarray(out, mode='RGB').save(out_path)
    print(f'{name}: {src_path} ({os.path.getsize(src_path)//1024}KB fonte) -> {out_path} ({TARGET_RES}x{TARGET_RES})')


def process_transition_tile(name, src_path):
    if not os.path.exists(src_path):
        print(f'AVISO: fonte não encontrada, pulando "{name}": {src_path}')
        return
    img = load_resized(src_path)
    arr = np.array(img, dtype=np.float64) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    hsv = np.vectorize(colorsys.rgb_to_hsv)(r, g, b)
    h, s, v = hsv

    # Mesma rampa suave de recolor_background_sand_water, só que sem o grupo
    # de água (esses tiles nunca têm água) — o peso da areia já cobre tudo
    # que não é grama.
    sand_w = np.clip((r - g + 0.03) / 0.12, 0, 1)
    grass_w = 1 - sand_w

    sand_hue, sand_sat, sand_val = DELTAS['sand']
    grass_hue, grass_sat, grass_val = DELTAS['grass']

    def shift(hh, ss, vv, hue_shift, sat_scale, val_scale):
        return (hh + hue_shift) % 1.0, np.clip(ss * sat_scale, 0, 1), np.clip(vv * val_scale, 0, 1)

    h_sand, s_sand, v_sand = shift(h, s, v, sand_hue, sand_sat, sand_val)
    h_grass, s_grass, v_grass = shift(h, s, v, grass_hue, grass_sat, grass_val)

    rgb_sand = np.stack(np.vectorize(colorsys.hsv_to_rgb)(h_sand, s_sand, v_sand), axis=-1)
    rgb_grass = np.stack(np.vectorize(colorsys.hsv_to_rgb)(h_grass, s_grass, v_grass), axis=-1)

    weights = np.stack([grass_w, sand_w], axis=-1)
    out_rgb = rgb_grass * weights[..., 0:1] + rgb_sand * weights[..., 1:2]

    out = np.clip(out_rgb * 255.0, 0, 255).astype(np.uint8)
    out_path = os.path.join(GROUND, f'{name}.png')
    Image.fromarray(out, mode='RGB').save(out_path)
    print(f'{name}: {src_path} ({os.path.getsize(src_path)//1024}KB fonte) -> {out_path} ({TARGET_RES}x{TARGET_RES})')


if __name__ == '__main__':
    print(f'--- tiles base (1 material), alvo {TARGET_RES}x{TARGET_RES} ---')
    for name, path in BASE_TILES.items():
        process_base_tile(name, path)

    print(f'\n--- kit de transição (grama+areia), alvo {TARGET_RES}x{TARGET_RES} ---')
    for name, path in TRANSITION_TILES.items():
        process_transition_tile(name, path)

    print('\nPronto. Falta rodar build_terrain_background.py + recolor_background_sand_water pra recompor scene_background.png (ver docstring deste arquivo).')
