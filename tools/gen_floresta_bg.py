import numpy as np
from PIL import Image
import json, math, random

random.seed(101)
W, H = 2560, 1920

# Paleta mais escura/desaturada que a da vila e a de Portomares - "floresta
# antiga", nao praia turistica (ver VISUAL_STYLE_GUIDE.md: grama viva medida
# em #2b731d e o ponto de partida, escurecido aqui de proposito).
GRASS = np.array([0x1d, 0x4d, 0x16])
MUD = np.array([0x4a, 0x35, 0x24])
WATER = np.array([0x24, 0x50, 0x5f])

def smooth_curve(base, amplitude, n_octaves=4, seed=0):
    rnd = random.Random(seed)
    xs = np.arange(W)
    y = np.zeros(W, dtype=float)
    for o in range(n_octaves):
        freq = (o + 1) * 1.1
        phase = rnd.uniform(0, math.tau)
        octave_amp = amplitude / (o + 1.6)
        y += octave_amp * np.sin(xs / W * math.tau * freq + phase)
    return base + y

grass_mud_y = smooth_curve(H * 0.30, 90, seed=11)
mud_water_y = smooth_curve(H * 0.40, 100, seed=12)
mud_water_y = np.maximum(mud_water_y, grass_mud_y + 25)

def add_noise(arr, strength=9, seed=0):
    rnd = np.random.RandomState(seed)
    noise = rnd.normal(0, strength, arr.shape[:2])[:, :, None]
    out = arr.astype(float) + noise
    return np.clip(out, 0, 255).astype(np.uint8)

img = np.zeros((H, W, 3), dtype=np.uint8)
for x in range(W):
    gy = int(grass_mud_y[x])
    my = int(mud_water_y[x])
    img[0:gy, x] = GRASS
    img[gy:my, x] = MUD
    img[my:H, x] = WATER

img = add_noise(img, strength=9, seed=17)

foam = np.array([70, 90, 80])
for x in range(W):
    my = int(mud_water_y[x])
    band = 4
    top = max(0, my - band)
    bot = min(H, my + band)
    img[top:bot, x] = (0.4 * foam + 0.6 * img[top:bot, x]).astype(np.uint8)

out = Image.fromarray(img, mode='RGB')
out.save('assets/ground/floresta_sussurro_background.png')

line = mud_water_y.round().astype(int).tolist()
with open('assets/ground/floresta_sussurro_water_line.json', 'w') as f:
    json.dump({'width': W, 'height': H, 'line': line}, f)

print('saved', out.size)
for x in [200, 600, 1000, 1260, 1600, 2000, 2400]:
    print(x, 'grass/mud', round(grass_mud_y[x]), 'mud/water', round(mud_water_y[x]))
