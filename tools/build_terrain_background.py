#!/usr/bin/env python3
"""Gera o background de terreno (grama + curva orgânica + faixa areia/água
rica) como UM PNG único, pra usar como imagem de fundo estática no jogo em
vez das faixas retas (`GROUND_ROWS`) antigas.

Mesma técnica validada no mockup (tools/build_scene_mockup.py): a fronteira
grama/areia é uma máscara em nível de pixel (soma de senos suavizada), e a
faixa areia/água usa as 3 texturas novas de "Transição Água" com as costuras
alinhadas pela própria curva de espuma de cada uma.

Não inclui props (casas, poço etc.) — esses continuam sendo objetos do
Phaser, não pixels no fundo, pra manter o editor funcionando.

Também exporta um JSON com a linha areia→água (uma altura em pixels por
coluna), lido pelo próprio PNG final já pronto — não recalculado a partir
da lógica de montagem das tiles, pra garantir que bate exatamente com o
que foi desenhado (inclusive nas faixas de crossfade da costura). O jogo
usa isso pra montar a colisão que impede o personagem de entrar na água.

Usage:
    python3 tools/build_terrain_background.py <world_width> <world_height> <output_path>
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GROUND = os.path.join(BASE, 'assets', 'ground')
WATER_SRC_DIR = '/Users/hugo/Downloads/One Piece/Terreno/Transição Agua'


def tile_fill(tile_img, width, height):
    w, h = tile_img.size
    layer = Image.new('RGBA', (width, height))
    # Variantes espelhadas em xadrez (mesmo bloco de cor continua batendo
    # na costura — espelhar não muda isso — só a MANCHA grande de luz/sombra
    # deixa de repetir sempre no mesmo lugar). Sem isso, num tile grande o
    # bastante pra reter detalhe pintado, a mancha de textura vira visível
    # como um padrão em grade real (ver conversa de design — foi exatamente
    # o que apareceu ao tirar o downscale de 120px pra 512px).
    variants = {
        (0, 0): tile_img,
        (1, 0): tile_img.transpose(Image.FLIP_LEFT_RIGHT),
        (0, 1): tile_img.transpose(Image.FLIP_TOP_BOTTOM),
        (1, 1): tile_img.transpose(Image.ROTATE_180),
    }
    row = 0
    for ty in range(0, height, h):
        col = 0
        for tx in range(0, width, w):
            layer.paste(variants[(col % 2, row % 2)], (tx, ty))
            col += 1
        row += 1
    return layer


def curve_mask(width, height, base_y, amplitude, waves, feather=10, round_px=0):
    xs = np.arange(width)
    ys = np.full(width, float(base_y))
    for wl, weight, phase in waves:
        ys += amplitude * weight * np.sin((xs / wl) * 2 * math.pi + phase)
    if round_px:
        # `mode='same'` faz média com zero implícito além das bordas do
        # array, puxando a curva pra baixo bem perto de x=0 e x=width-1
        # (o "degrauzinho" visto nos cantos dos primeiros testes). Estende
        # as pontas por reflexo antes de suavizar, pra a média nas bordas
        # não enxergar "zero" onde deveria enxergar "mais do mesmo".
        kernel = np.ones(round_px) / round_px
        pad = round_px // 2
        ys_padded = np.pad(ys, pad, mode='reflect')
        ys = np.convolve(ys_padded, kernel, mode='same')[pad:pad + width]
    row_idx = np.arange(height).reshape(-1, 1)
    dist = row_idx - ys.reshape(1, -1)
    alpha = np.clip(255 * (0.5 - dist / (2 * feather)), 0, 255).astype('uint8')
    return Image.fromarray(alpha, mode='L')


def boundary_profile(tile_img):
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


def extract_water_line(canvas):
    """Pra cada coluna do PNG final, a primeira linha (de cima pra baixo)
    que já é água — mesma heurística de matiz usada em toda a análise
    (ver BEACH_SCENE_ANALYSIS.md). Varre o canvas pronto, não reconstrói a
    lógica de montagem das tiles, então bate exatamente com o desenho."""
    arr = np.array(canvas.convert('RGB'), dtype=np.float64)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    is_water = (b > r + 8) & (b > 80) & (g > 60)
    h, w = is_water.shape
    line = np.full(w, h - 1, dtype=int)
    for x in range(w):
        col = np.where(is_water[:, x])[0]
        if len(col):
            line[x] = int(col[0])
    return line.tolist()


def build(world_width, world_height, output_path):
    scale = world_width / 3200  # os parâmetros abaixo foram calibrados pro mundo original de 3200px

    grass_layer = tile_fill(Image.open(os.path.join(GROUND, 'grass.png')).convert('RGBA'), world_width, world_height)

    # Só a FORMA da onda (comprimento/amplitude) escala com o tamanho do
    # mundo — as margens de segurança (feather, suavização, folga de
    # alinhamento) ficam fixas em pixels absolutos. Escalá-las também foi
    # o que causou os degraus/blocos visíveis no primeiro teste em 2560px:
    # a folga ficou pequena demais pra cobrir o mesmo desvio de curva.
    grass_sand_waves = [(1400 * scale, 1.0, 0.4), (600 * scale, 0.28, 2.1), (260 * scale, 0.1, 4.7)]
    gs_base_y = round(0.665 * world_height)
    gs_amplitude = 110 * scale
    gs_mask = curve_mask(world_width, world_height, gs_base_y, gs_amplitude, grass_sand_waves, feather=16, round_px=70)

    rich_band_top = round(0.583 * world_height)
    rich_tile_w = max(400, round(1000 * scale))
    rich_margin = 450
    band_height = world_height - rich_band_top  # altura visível real da faixa

    # Cada tile nasce MAIS ALTA que o necessário (band_height + 2*margem) e
    # o alinhamento de costura é feito RECORTANDO uma janela de band_height
    # de dentro dela, deslocada pela margem — em vez de colar a tile inteira
    # numa posição deslocada. Isso garante que toda tile final entregue já
    # tem exatamente band_height de altura, sem nenhuma chance de sobrar um
    # buraco transparente numa das pontas (foi exatamente esse buraco —
    # tile do tamanho exato da janela, deslocada, sem sobra nenhuma pra
    # cobrir — que causou os blocos/degraus dos testes anteriores).
    # SÓ 1.png aqui de propósito — ciclar 1/2/3 deixava DUAS emendas visíveis
    # (1↔2 e 2↔3), porque as três texturas não são a mesma água: 1 tem um
    # brilho mais liso e mostra bem mais areia seca: 2 e 3 têm um padrão de
    # "diamante" mais forte e a água cobre quase toda a faixa. Testei usar só
    # 2+3 pra eliminar a emenda, mas isso empurrou a linha d'água muito pra
    # cima (média de 180px, pico de 417px) e sumiu com a praia quase toda —
    # pior que o problema original. Repetir só a 1 remove a emenda (mesma
    # fonte o tempo todo) sem perder a proporção de areia já calibrada.
    tall_h = band_height + 2 * rich_margin
    rich_tiles_tall = [
        Image.open(os.path.join(WATER_SRC_DIR, f'{i}.png')).convert('RGBA').resize((rich_tile_w, tall_h), Image.LANCZOS)
        for i in (1,)
    ]
    profiles = [boundary_profile(t) for t in rich_tiles_tall]
    edge_sample = 12

    rich_band = Image.new('RGBA', (world_width, band_height))
    i = 0
    running_right_edge = None
    for tx in range(0, world_width, rich_tile_w):
        idx = i % 1
        tall_tile = rich_tiles_tall[idx]
        prof = profiles[idx]

        # `edge` = onde a costura desse lado apareceria no canvas final SE
        # essa tile usasse a janela padrão (shift=0). Cortar a janela
        # `shift` px mais pra baixo na tile alta sobe o conteúdo em `shift`
        # no resultado final — por isso a posição final é `edge - shift`,
        # não `edge + shift` (esse sinal trocado foi o motivo da tile do
        # meio ter saído deslocada demais no teste anterior).
        left_edge = prof[:edge_sample].mean() - rich_margin
        right_edge = prof[-edge_sample:].mean() - rich_margin
        shift = 0 if running_right_edge is None else round(left_edge - running_right_edge)
        shift = max(-rich_margin + 10, min(rich_margin - 10, shift))
        window_top = rich_margin + shift
        tile = tall_tile.crop((0, window_top, rich_tile_w, window_top + band_height))

        rich_band.paste(tile, (tx, 0), tile)

        if i > 0:
            overlap = 60
            blend_mask = Image.new('L', (overlap, band_height))
            grad = np.tile(np.linspace(0, 255, overlap, dtype='uint8'), (band_height, 1))
            blend_mask.putdata(grad.flatten())
            rich_band.paste(tile.crop((0, 0, overlap, band_height)), (tx, 0), blend_mask)

        running_right_edge = right_edge - shift
        i += 1

    canvas = Image.new('RGBA', (world_width, world_height), (0, 0, 0, 255))
    canvas.paste(grass_layer, (0, 0))
    canvas.paste(rich_band, (0, rich_band_top), rich_band)
    canvas.paste(grass_layer, (0, 0), gs_mask)

    canvas.convert('RGB').save(output_path)
    print(f'salvo: {output_path} ({world_width}x{world_height})')

    water_line = extract_water_line(canvas)
    water_line_path = os.path.splitext(output_path)[0] + '_water_line.json'
    with open(water_line_path, 'w') as f:
        json.dump({'width': world_width, 'height': world_height, 'line': water_line}, f)
    print(f'salvo: {water_line_path}')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        print('Usage: build_terrain_background.py <world_width> <world_height> <output_path>')
        sys.exit(1)
    build(int(sys.argv[1]), int(sys.argv[2]), sys.argv[3])
