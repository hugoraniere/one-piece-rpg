# Tilesets do Tiled (ground_v2)

Cada kit abaixo segue o mesmo padrão de arquivos:

```
<nome>/                    # os 16 tiles individuais, já nomeados (TILE_NN_descricao.png)
<nome>_spritesheet.png     # grid 4x4, 64x64 por tile (256x256 total) — gerado com tools/build_spritesheet.py --tile-size 64
<nome>.tsx                 # tileset do Tiled (abrir direto: Arquivo > Abrir)
```

Fonte original de cada kit em `~/Downloads/One Piece/` — **atenção**: alguns arquivos vieram com nome genérico/errado (ex: "Tileset dock.png" na verdade é grama+terra+pedra, "tileset 3.png" é o cais de madeira). Sempre abra a imagem antes de confiar no nome do arquivo.

## Kits

| Kit | Fonte (nome do arquivo) | Material | Cobertura |
|---|---|---|---|
| `grama-dirt` | (já vinha cortado em 16 PNGs) | grama ↔ areia | sólidos, bordas h/v (1 sentido), 2 cantos externos, 2 cantos "inferiores", 2 ilhas |
| `ocean` | `Tileset ocean.png` | areia ↔ água | sólidos, bordas h/v (2 sentidos), 2 cantos externos, 2 ilhas, 4 variantes de costa |
| `grama-terra` | `Tileset dock.png` (nome errado) | grama ↔ terra + parede de pedra | sólidos, bordas h/v (2 sentidos ✓), cantos arredondados, + clareiras (terra cercada de grama) |
| `colinas` | `Tileset colinas.png` | grama / penhasco / água | penhasco, cachoeira, rio entre grama, lagoas fechadas — kit de elevação (novo, não é autotile plano) |
| `cais` | `tileset 3.png` (nome errado) | doca de madeira sobre água | pranchas variantes, pontas com pilares, 8 cantos/junções |

## Ainda não importado (achados em Downloads, aguardando decisão)

- **`Tileset ocean 2.png`** — outro kit areia/água, estilo visual diferente do `ocean` (água em losango vs crosshatch). Não mesclei no `ocean.tsx` pra não repetir o problema de costura por textura incompatível. Tem uma forma nova útil (península de areia cercada de água) se quiser aproveitar separado.

## Gaps conhecidos (ver análise completa na conversa)

- grama ↔ areia: falta borda horizontal invertida (areia-cima/grama-baixo) e cantos internos.
- areia ↔ água: falta canto interno de baía "fechando pra dentro" (os 4 "praia-costa" são variações estéticas da mesma curva, não posições diferentes).

## Nota sobre trabalho paralelo

Em 13/09/2026 ~19:50, encontramos 4 pastas extras (`dock-madeira`, `grama-pedra`, `ocean-variante-2`, `ocean-variante-3`) geradas por uma sessão interativa separada (`assets-sprites-review-e32d60`, rodando nesse mesmo worktree) cortando os MESMOS arquivos-fonte, sem nome descritivo nos tiles. Não foram tocadas/renomeadas por essa sessão — decidir depois qual nomenclatura vira a definitiva.
