#!/usr/bin/env python3
"""Aproxima a paleta do chão (grama/areia/água) da paleta dos props da vila
e da água (pintados, saturação mais rica, mais escuros) — sem mudar a
TEXTURA de cada tile, só a cor média, via deslocamento HSV.

Os deltas abaixo foram medidos comparando a média HSV de cada tile atual
contra referências reais já no jogo:
  grama -> média de bush_large/bush_flower/tree_small (mesmas plantas que
           vão ficar em cima da grama)
  areia -> house_straw.png (madeira/palha, a referência marrom mais perto
           que existe no pacote da vila)
  água  -> water_rock.png (água de verdade, do mesmo pacote da água nova)

Ver conversa de design: "os assets não parecem ser iguais" — grass.png
tinha H/S/V bem diferente do que os props da vila usam (mais claro, mais
amarelo, menos saturado que o esperado).

Usage:
    python3 tools/recolor_ground_palette.py
"""
import colorsys
import os

import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUND = os.path.join(BASE, 'assets', 'ground')

# (hue_shift, sat_scale, val_scale) — medidos em tools/scratch, ver histórico
# do chat pra reprodução exata dos números.
DELTAS = {
    'grass': (0.0668, 0.956, 0.803),
    'sand': (-0.0172, 1.349, 0.669),
    'water': (0.0726, 0.987, 0.717),
}


def apply_hsv_delta(rgb_u8, hue_shift, sat_scale, val_scale):
    arr = rgb_u8.astype(np.float64) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    hsv = np.vectorize(colorsys.rgb_to_hsv)(r, g, b)
    h, s, v = hsv
    h = (h + hue_shift) % 1.0
    s = np.clip(s * sat_scale, 0, 1)
    v = np.clip(v * val_scale, 0, 1)
    rgb = np.vectorize(colorsys.hsv_to_rgb)(h, s, v)
    out = np.stack(rgb, axis=-1) * 255.0
    return np.clip(out, 0, 255).astype(np.uint8)


def recolor_tile(name):
    path = os.path.join(GROUND, f'{name}.png')
    img = Image.open(path).convert('RGB')
    arr = np.array(img)
    hue_shift, sat_scale, val_scale = DELTAS[name]
    out = apply_hsv_delta(arr, hue_shift, sat_scale, val_scale)
    Image.fromarray(out, mode='RGB').save(path)
    print(f'recolorido: {path}')


# Pra scene_background.png: a faixa de grama vem de grass.png (recolorida
# acima, o build_terrain_background.py já recompõe certo). A faixa de
# areia/água vem de uma fonte externa (ver WATER_SRC_DIR no outro script) —
# aqui aplicamos a MESMA correção direto em cima do PNG final já montado.
#
# PRIMEIRA versão disto usava classificação dura (pixel é água OU é areia OU
# é grama) — deixava um anel visível na faixa de transição feita à mão em
# curve_mask() (antialiasing entre grama/areia), porque um pixel ali é uma
# MISTURA das duas cores e não batia com nenhum dos dois grupos, ficando sem
# correção nenhuma. Trocado por PESOS contínuos (0..1, sem corte) — a mesma
# ideia de match_terrain_colors_by_hue.py, mas com três grupos em vez de
# dois — pra cada pixel da faixa de transição levar uma MISTURA proporcional
# das duas correções em vez de nenhuma ou a errada.
def recolor_background_sand_water(path):
    img = Image.open(path).convert('RGB')
    arr = np.array(img, dtype=np.float64) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    hsv = np.vectorize(colorsys.rgb_to_hsv)(r, g, b)
    h, s, v = hsv

    # Rampa suave (~0.05-0.15 de largura em unidades de canal 0..1) em vez de
    # um limiar único — é essa largura que cobre a faixa de antialiasing.
    water_w = np.clip((b - r - 0.05) / 0.15, 0, 1)
    sand_w = np.clip((r - g + 0.03) / 0.12, 0, 1) * (1 - water_w)
    grass_w = np.clip(1 - water_w - sand_w, 0, 1)

    sand_hue, sand_sat, sand_val = DELTAS['sand']
    water_hue, water_sat, water_val = DELTAS['water']

    # Hue é circular — soma ponderada direto em graus daria errado perto da
    # quebra 0/1. Em vez disso aplicamos os DOIS deslocamentos completos e
    # misturamos os resultados finais (RGB), não os deslocamentos em si.
    def shift(hh, ss, vv, hue_shift, sat_scale, val_scale):
        return (hh + hue_shift) % 1.0, np.clip(ss * sat_scale, 0, 1), np.clip(vv * val_scale, 0, 1)

    h_sand, s_sand, v_sand = shift(h, s, v, sand_hue, sand_sat, sand_val)
    h_water, s_water, v_water = shift(h, s, v, water_hue, water_sat, water_val)

    rgb_sand = np.stack(np.vectorize(colorsys.hsv_to_rgb)(h_sand, s_sand, v_sand), axis=-1)
    rgb_water = np.stack(np.vectorize(colorsys.hsv_to_rgb)(h_water, s_water, v_water), axis=-1)
    rgb_grass = np.stack([r, g, b], axis=-1)  # já recolorida a montante — não mexe

    weights = np.stack([grass_w, sand_w, water_w], axis=-1)
    out_rgb = rgb_grass * weights[..., 0:1] + rgb_sand * weights[..., 1:2] + rgb_water * weights[..., 2:3]

    out = np.clip(out_rgb * 255.0, 0, 255).astype(np.uint8)
    Image.fromarray(out, mode='RGB').save(path)
    print(f'areia/água recoloridas (com mistura suave na transição) em: {path}')


if __name__ == '__main__':
    for tile in ('grass', 'sand', 'water'):
        recolor_tile(tile)
