#!/usr/bin/env python3
"""Processa o kit de doca modular (18 peças, PIER_CUSTOM_WIDTH_KIT_18_FINAL)
pra dentro do jogo — mesma filosofia do chão (ver reprocess_ground_tiles.py):
sem downscale agressivo, e com a água recolorida pra bater com water.png.

Diferença importante em relação ao kit de grama/areia: aqui NÃO reduzimos
pra "1 peça + gira por código" — o grão da madeira é direcional (pranchas
horizontais), então girar 90° deixaria o grão errado. O pacote original já
veio com as 4 variantes N/E/S/W desenhadas certas; mantemos as 18.

Três peças (EDGE_S, CONNECT_S, INNER_NW) vieram do gerador com um retângulo
preto sólido em vez do conteúdo esperado (sem canal alpha — não é
transparência, é defeito de geração). Reconstruídas por composição
mascarada com a peça-irmã espelhada (só os pixels realmente pretos são
substituídos — o resto de cada peça, já correto, fica como veio):
  EDGE_S      <- EDGE_N   espelhada verticalmente (grão de madeira bate
                 pixel a pixel na parte que já funcionava — conferido).
  INNER_NW    <- INNER_NE espelhada horizontalmente (mesma checagem).
  CONNECT_S   <- CONNECT_N espelhada verticalmente (aqui a peça-irmã não é
                 um match perfeito da composição original, só a melhor
                 referência disponível — revisar visualmente depois).

Usage:
    python3 tools/reprocess_pier_kit.py
"""
import colorsys
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from recolor_ground_palette import DELTAS  # noqa: E402

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE, 'assets', 'water', 'pier')
SRC_DIR = os.path.join(os.path.expanduser('~'), 'Downloads', 'One Piece', 'Terreno', 'Ponto', 'PIER_CUSTOM_WIDTH_KIT_18_FINAL')

TARGET_RES = 512
BLACK_THRESHOLD = 20  # 0-255 — abaixo disso em TODOS os canais, é o defeito, não conteúdo real

# out_name -> (arquivo fonte, arquivo de patch ou None, flip do patch)
TILES = {
    'pier_center': ('PIER_WIDE_01_CENTER.png', None, None),
    'pier_edge_n': ('PIER_WIDE_02_EDGE_N.png', None, None),
    'pier_edge_e': ('PIER_WIDE_03_EDGE_E.png', None, None),
    'pier_edge_s': ('PIER_WIDE_04_EDGE_S.png', 'PIER_WIDE_02_EDGE_N.png', Image.FLIP_TOP_BOTTOM),
    'pier_edge_w': ('PIER_WIDE_05_EDGE_W.png', None, None),
    'pier_outer_nw': ('PIER_WIDE_06_OUTER_NW.png', None, None),
    'pier_outer_ne': ('PIER_WIDE_07_OUTER_NE.png', None, None),
    'pier_outer_se': ('PIER_WIDE_08_OUTER_SE.png', None, None),
    'pier_outer_sw': ('PIER_WIDE_09_OUTER_SW.png', None, None),
    'pier_connect_n': ('PIER_WIDE_10_CONNECT_N.png', None, None),
    'pier_connect_e': ('PIER_WIDE_11_CONNECT_E.png', None, None),
    'pier_connect_s': ('PIER_WIDE_12_CONNECT_S.png', 'PIER_WIDE_10_CONNECT_N.png', Image.FLIP_TOP_BOTTOM),
    'pier_connect_w': ('PIER_WIDE_13_CONNECT_W.png', None, None),
    'pier_inner_nw': ('PIER_WIDE_14_INNER_NW.png', 'PIER_WIDE_15_INNER_NE.png', Image.FLIP_LEFT_RIGHT),
    'pier_inner_ne': ('PIER_WIDE_15_INNER_NE.png', None, None),
    'pier_inner_se': ('PIER_WIDE_16_INNER_SE.png', None, None),
    'pier_inner_sw': ('PIER_WIDE_17_INNER_SW.png', None, None),
    'pier_t': ('PIER_WIDE_18_T_NEW_FIXED.png', None, None),
}


def patch_black_defect(img, patch_src_path, flip):
    """Substitui só os pixels quase-pretos de `img` pelos pixels
    correspondentes de `patch_src_path` (espelhado por `flip`) — nunca
    troca a imagem inteira, só o defeito."""
    arr = np.array(img.convert('RGB'))
    patch = Image.open(patch_src_path).convert('RGB')
    if patch.size != img.size:
        patch = patch.resize(img.size, Image.LANCZOS)
    patch = patch.transpose(flip)
    patch_arr = np.array(patch)

    is_defect = np.all(arr < BLACK_THRESHOLD, axis=-1)
    out = arr.copy()
    out[is_defect] = patch_arr[is_defect]
    n_fixed = is_defect.sum()
    return Image.fromarray(out, mode='RGB'), n_fixed


def recolor_water_only(img):
    """Deixa a madeira como veio (já perto do tom já usado em dock_pier.png)
    e recolore só a água pra bater com o water.png atual — mesma técnica de
    mistura contínua usada no kit de grama/areia, com o par água/madeira no
    lugar de água/areia/grama (calibração em recolor_ground_palette.py)."""
    arr = np.array(img.convert('RGB'), dtype=np.float64) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    hsv = np.vectorize(colorsys.rgb_to_hsv)(r, g, b)
    h, s, v = hsv

    water_w = np.clip((b - r + 0.1) / 0.2, 0, 1)

    water_hue, water_sat, water_val = DELTAS['water']
    h_water = (h + water_hue) % 1.0
    s_water = np.clip(s * water_sat, 0, 1)
    v_water = np.clip(v * water_val, 0, 1)
    rgb_water = np.stack(np.vectorize(colorsys.hsv_to_rgb)(h_water, s_water, v_water), axis=-1)
    rgb_wood = np.stack([r, g, b], axis=-1)

    out_rgb = rgb_wood * (1 - water_w[..., None]) + rgb_water * water_w[..., None]
    out = np.clip(out_rgb * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(out, mode='RGB')


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    for out_name, (src_file, patch_file, flip) in TILES.items():
        src_path = os.path.join(SRC_DIR, src_file)
        if not os.path.exists(src_path):
            print(f'AVISO: fonte não encontrada, pulando "{out_name}": {src_path}')
            continue
        img = Image.open(src_path)

        note = ''
        if patch_file:
            patch_path = os.path.join(SRC_DIR, patch_file)
            img, n_fixed = patch_black_defect(img, patch_path, flip)
            note = f' (defeito corrigido: {n_fixed} pixels vindos de {patch_file})'

        img = img.resize((TARGET_RES, TARGET_RES), Image.LANCZOS)
        img = recolor_water_only(img)

        out_path = os.path.join(OUT_DIR, f'{out_name}.png')
        img.save(out_path)
        print(f'{out_name}: {src_file} -> {out_path} ({TARGET_RES}x{TARGET_RES}){note}')

    print(f'\nPronto — {len(TILES)} peças em {OUT_DIR}')
