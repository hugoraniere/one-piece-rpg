# Guia de estilo visual — o mínimo pra não desencontrar de novo

Este documento existe porque aconteceu, na prática, o seguinte: o chão
(`scene_background.png` + o kit `grass/sand/water.png`) foi gerado num
momento, os props da vila (`assets/village/`) vieram de um pacote comprado/
gerado em outro, e ninguém comparou os dois lado a lado até o jogo já
estar rodando com o personagem "bonito" andando sobre uma textura de
teste. Regra simples pra não repetir: **antes de considerar um asset (ou
placeholder) pronto, compare com pelo menos uma peça já em uso, na tela,
lado a lado.**

## 1. Paleta de referência (medida, não chutada)

Estas cores foram extraídas de assets REAIS já no jogo (não inventadas) —
ver `tools/recolor_ground_palette.py` pra reprodução exata. Qualquer chão/
terreno novo deve mirar nesta faixa, não na saturação "crua" de uma
textura procedural genérica:

| Elemento | Referência usada | Alvo (H, S, V) | Hex aproximado |
|---|---|---|---|
| Grama | `bush_large`/`bush_flower`/`tree_small` (village pack) | 0.31, 0.74, 0.45 | `#2b731d` |
| Areia | `house_straw.png` (madeira/palha da vila) | 0.09, 0.66, 0.62 | `#9d6c35` |
| Água | `water_rock.png` (água real do pacote) | 0.56, 0.66, 0.53 | `#2e6887` |

Regra geral por trás dos números: os assets da vila são **mais escuros e
mais saturados** do que texturas procedurais tendem a sair por padrão.
Uma textura "clara e lavada" quase sempre vai destoar do resto — quando
gerar algo novo, erre para o lado de mais escuro/mais saturado, não menos.

## 2. Uma régua de tamanho só, sempre a mesma

O personagem tem **~110px de altura na tela** — é a régua pra tudo. Pra
calibrar `scale` de qualquer prop novo:

```
scale = altura_desejada_na_tela / altura_do_conteúdo_no_arquivo
```

("altura do conteúdo" = bounding box sem a margem transparente, não o
tamanho do arquivo. Um PNG de 700px pode ter só 150px de conteúdo real —
ver `village-chest-closed` vs `village-fence` pra um exemplo real dessa
diferença.) Referências já calibradas: poço ≈ 1.3× personagem, barril ≈
metade, arbusto ≈ 0.75× (ver `EDITOR_PROP_PALETTE` em `propRegistry.js`
pra mais exemplos com `defaultScale` já certo).

## 3. Antes de gerar algo novo, procure o que já existe

Nesta ordem:

1. **Procure nos pacotes já baixados** (`assets/water_new/`, e o que
   estiver em `~/Downloads/` referenciado nos `*_TODO.md`/`*_ANALYSIS.md`
   deste projeto) antes de gerar/pedir arte nova. Boa parte do que falta
   já foi baixado em algum momento e nunca chegou a ser cadastrado (ver
   `BEACH_SCENE_ANALYSIS.md` seção 4 — os arbustos e a doca extra vieram
   assim).
2. **Abra o arquivo e confira o CONTEÚDO, nunca só o nome.** `assets/
   water_new/dock_module.png` não é uma doca — é uma vitória-régia com o
   nome errado. Um nome de arquivo é uma alegação, não um fato.
3. **Só depois disso**, se realmente não existir nada aproveitável,
   desenhar um placeholder deliberadamente simples via código (canvas),
   seguindo o padrão já usado pra espada/vara em `character/layers.js`:
   silhueta simples, 1-2 cores sólidas, sem tentar imitar detalhe pintado.
   Um placeholder óbvio (todo mundo sabe que é temporário) é melhor que um
   placeholder "quase bom" que passa despercebido e nunca é trocado.

## 4. Catálogo e uso real precisam ser a mesma coisa

Se um sistema "registra" uma peça (uma paleta de editor, uma lista de
receitas, um enum de itens), ela **precisa estar realmente em uso** em
algum lugar, ou vir com um comentário explícito dizendo por que não está
("ainda não implementado", "substituído por X"). O bug original que gerou
este guia era exatamente isso: `EDITOR_TERRAIN_PALETTE` cadastrava ~20
peças de autotile que a base do mapa real (`scene_background.png`) nem
usava mais — dois sistemas que pararam de se falar, sem nenhum aviso no
código. Rotações de tile pré-geradas (`_90/_180/_270`) que ninguém carrega
porque o código já gira por conta própria (tecla R no editor) são a mesma
categoria de problema: arquivo no disco que não corresponde a nada em uso.

## 5. Checklist rápido antes de dar por terminado

- [ ] Comparei (screenshot lado a lado, não "de memória") com pelo menos
      um asset já em uso na mesma cena.
- [ ] Se usei algo de um pacote externo, abri o arquivo e vi o conteúdo
      de verdade, não confiei no nome.
- [ ] O `scale` foi calculado pela régua da seção 2, não chutado.
- [ ] Se isso substitui um placeholder antigo, o placeholder antigo foi
      removido (não deixado morto no código "por via das dúvidas").
