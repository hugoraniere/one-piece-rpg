# Análise da imagem de referência (vila + praia + doca)

Este documento é só o exercício de entender a referência antes de mexer no
jogo — nenhuma mudança em `main.js` ainda. Medi as proporções de terreno
direto nos pixels da imagem (não no olho) e cataloguei cada prop visível,
comparando com o que já temos no projeto e com o pacote `vila_semente_delivery_v5`
(que por acaso já tem quase tudo que falta pra fechar essa cena).

Imagem de referência: 1672×941px.

## 1. Faixas de terreno — proporção real medida vs. o que o jogo tem hoje

Medi isso analisando a cor dominante de cada linha horizontal de pixels da
referência (classificando verde/areia/água por faixa de cor), não estimando
a olho.

| Faixa | Referência (medido) | Jogo hoje (`GROUND_ROWS`) | Diagnóstico |
|---|---:|---:|---|
| Floresta/borda (topo) | **~13%** | 0% (não existe) | Não é uma textura de chão separada — é uma linha densa de árvores/moitas sobre a grama. Ver seção 3. |
| Terra (`ground-dirt`) | **0%** | **21.25%** | Não aparece em nenhum lugar da referência. É a maior causa da "proporção errada". |
| Grama | **~49%** | **21.25%** | Referência usa quase metade da imagem em grama — é onde TUDO (casas, poço, fogueira) mora. Estávamos dando à grama só a mesma fatia que a terra (que nem aparece). |
| Transição grama→areia | **~8%** | 5% (1 tile fixo) | Próximo, mas na referência é uma borda orgânica/curva com pedras, não uma faixa reta. |
| Areia (praia) | **~13%** | **21.25%** | Nosso trecho de areia está quase o dobro do que a referência usa. |
| Transição areia→água | **~5%** | 5% (1 tile fixo) | Bate certinho. |
| Água | **~12%** | **21.25%** | Também quase o dobro do necessário. |

**Isso sozinho já explica boa parte do "tudo diferente, inclusive a
proporção do mapa"**: o jogo reserva 1/4 da altura do mundo pra terra (que
não existe na referência) e infla areia+água pra quase metade do mundo,
enquanto a referência é dominada por grama (quase metade da cena) com praia
e mar bem mais estreitos.

### Proposta de `GROUND_ROWS` revisado (só a proporção, ainda não implementado)

```
floresta/moitas   ~13%  → não é ground-row, é prop-dressing sobre a grama (seção 3)
grama             ~53%  → flex maior (absorve o espaço da "terra" removida)
transição g→a      ~8%
areia             ~13%
transição a→á      ~5%
água              ~12%
```
(a linha de "terra" no norte do mapa desaparece — ou vira só a base
decorativa embaixo da forja/vila mais ao norte, se algum dia adicionarmos
essa zona; não existe na referência atual)

## 2. Inventário de props da referência → asset real

Posições abaixo são aproximadas em % da imagem (x%, y%), útil pra depois
converter em pixels do mundo (`WORLD_WIDTH=3200 × WORLD_HEIGHT=2400`).

### Zona norte/floresta (y 0–16%)

| Elemento na referência | Asset a usar | Status |
|---|---|---|
| Copas de árvore densas formando borda | `village-tree-ancient` repetida + `village-tree-small` intercaladas, encostadas umas nas outras | **temos** — só precisa de mais repetições que o layout atual (tínhamos poucas) |
| Rochedo separando floresta de um platô mais baixo | `village-rock-cluster` | **temos**, mas em pouca quantidade |
| Toco com machado cravado + pilha de lenha (x≈8%, y≈14%) | toco = `village-tree-stump`; machado cravado = não existe | **falta o machado** (baixa prioridade, puramente decorativo) |
| Moita redonda densa (x≈20%, y≈10%) | `ENV_V01_LARGEBUSH_01` / `ENV_V02_FLOWERBUSH_01` (pacote v5) | **não temos ainda — está no v5, pronto pra importar** |
| Flores coloridas pequenas no topo (x≈65-75%, y≈2%) | decoração de fundo, provavelmente parte da própria textura da árvore/moita | não precisa de asset novo |

### Zona da praça / vila (y 16–62%) — a maior faixa da imagem

| Elemento | Asset | Status |
|---|---|---|
| Casa de palha (x 2–29%, y 2–33%) | `village-house-straw` | **temos**, mesma arte |
| Casa vermelha (x 34–52%, y 0–27%) | `village-house-red` | **temos** |
| Casa azul com telhado azul + varanda (x 60–88%, y 0–35%) | `village-house-blue` | **temos** |
| Poço (x ≈52–60%, y ≈24–36%), levemente à direita do centro | `village-well` | **temos** |
| Fogueira acesa + pedras ao redor (x ≈68–78%, y ≈33–45%) | `village-campfire` | **temos** |
| **Bancos de madeira ao redor da fogueira (2–3 un.)** | — | **NÃO EXISTE no projeto nem no v5** — precisa gerar. Único item realmente novo a criar do zero. |
| Toco perto da fogueira | `village-tree-stump` | **temos** |
| Quadro de avisos + lanterna no mesmo poste (x ≈38–46%, y ≈38–52%) | `village-noticeboard` + `village-lantern` (hoje são objetos separados no nosso editor — na referência ficam colados no mesmo poste, dá pra aproximar posicionando os dois juntos) | **temos ambos** |
| Barris, caixotes, sacos perto das portas das casas | `village-barrel`, `village-crate`, `village-lootsack` | **temos** |
| Floreiras/vasos com flores nas janelas | `village-planter` | **temos** |
| Moitas redondas espalhadas perto das casas e cercas | bushes do v5 (ver acima) | **falta importar** |
| Cercas separando os lotes de cada casa | `village-fence` | **temos** |
| Varal atrás da casa azul | `village-clothesline` | **temos** |
| Toldo listrado na varanda da casa azul | — | decorativo, não crítico — pode ficar de fora por ora |
| Bandeira/estandarte na parede da casa de palha (folha verde) | — | decorativo/branding, opcional, baixa prioridade |
| Caminho de terra batida ligando as casas ao poço e descendo até a praia | `village-path-*` (já temos as 5 peças: reto h/v, curva, T, cruzamento) | **temos**, mas hoje quase não usamos — a referência usa o caminho de forma bem mais generosa entre os clusters |

### Transição grama→areia (y 62–70%)

| Elemento | Asset | Status |
|---|---|---|
| Borda curva/orgânica com tufos de grama entrando na areia | kit `ground-sand-edge-*` / `ground-sand-outer/inner-corner-*` já implementado | **temos**, já com autotile |
| Rochedo baixo separando um platô de grama da praia (lado esquerdo) | `village-rock-cluster` maior, ou nova formação de pedra — aproximar com o que já temos | **temos aproximação**, sem asset dedicado de "penhasco" |

### Praia (y 70–83%)

| Elemento | Asset | Status |
|---|---|---|
| Tronco caído (driftwood), 2 unidades (uma perto do centro, outra perto do barco) | `prop-log` | **temos** |
| Estrela-do-mar (x≈47%, y≈70%) | — | **falta** (baixa prioridade, puramente decorativo) |
| Pedrinhas soltas espalhadas pela areia (várias, pequenas) | — | **falta** — hoje só temos `rock-cluster` (formação grande), não uma pedrinha solta pequena |
| Doca de madeira com postes e corda, saindo do canto inferior esquerdo, com um caixote com planta em cima | `ENV_W09_DOCK_MODULE_01` + `ENV_W10_DOCKPLATFORM_01` (v5) | **falta importar** — não existe nada parecido no projeto hoje |
| Barco a remo encostado na praia perto das rochas (canto inferior direito) | — | **falta em todo lugar** — não está nem no v5. Precisa ser gerado do zero. |

### Água (y 83–100%)

| Elemento | Asset | Status |
|---|---|---|
| Água com espuma de onda na borda | `ground-water` + `ground-transition-sand-water` | **temos**, sem o detalhe de espuma anmada (cosmético) |
| Rochas saindo da água nos dois cantos inferiores | `ENV_W14_WATERROCK_01` (v5) | **falta importar** |

## 3. Observação de composição importante: a "floresta" não é uma faixa de chão

Na referência, a borda de árvores no topo (e também no canto direito da
praça, atrás da casa azul) **não é uma textura de terreno diferente** — é
grama comum com uma parede densa de árvores grandes + moitas encostadas
umas nas outras, funcionando como limite visual do mapa. Isso é mais barato
de reproduzir plantando `village-tree-ancient`/`village-tree-small`/bush em
sequência apertada nas bordas do que criar uma nova ground-row.

## 4. O que já temos "de graça": o pacote `vila_semente_delivery_v5`

Achei um pacote (`~/Downloads/Ambiente Sprites/vila_semente_delivery_v5.zip`)
com um spec (`VILA_SEMENTE_MAP_SPEC.md`) que já mapeia essa mesma vila
zona-a-zona com posições e escalas, aparentemente de uma sessão anterior sua
com o ChatGPT. Ele confirma que praticamente todos os assets que já
integramos (`house_*`, `well`, `campfire*`, `fence`, `lantern`, `barrel`,
`noticeboard`, `chest*`, `crate`, `lootsack`, `clothesline`, `planter`,
`tree_*`, `rock_cluster`) são pixel-a-pixel os mesmos arquivos do catálogo
oficial — e ele já traz prontos os itens que essa análise identificou como
faltando: moitas (2 variantes), borda/canto de água, módulo de doca +
plataforma, pedra de água, vitória-régia, e ainda forja/barraca de mercado
(não aparecem na referência atual, mas existem se um dia expandirmos o
mapa pra norte).

**Não cobre**: banco de madeira, machado cravado no toco, estrela-do-mar,
pedrinhas soltas na areia, barco a remo. Esses cinco continuam sem asset em
lugar nenhum — ficam pendentes de geração nova (mesma lista do
`SCENE_ASSETS_TODO.md`, agora com uma faixa de prioridade mais clara: banco
de madeira e barco a remo são os mais visíveis/repetidos, os outros três
são só detalhe pequeno).

## 5. Próximo passo (ainda não fiz — é só a proposta)

1. Importar do v5 pro projeto: 2 moitas, borda/canto/rocha de água, os 2
   módulos de doca, vitória-régia — processar cada um (checar alpha,
   escala) do mesmo jeito que fizemos com o kit de transição grama/areia.
2. Recalibrar `GROUND_ROWS` pras proporções da seção 1 (mais grama, menos
   terra/areia/água).
3. Reescrever `VILLAGE_PROPS` usando as posições percentuais da seção 2
   convertidas pra pixels do mundo, respeitando os clusters e espaçamentos
   observados (casas bem separadas por cerca, moitas quebrando os cantos
   vazios, caminho de terra generoso entre poço/fogueira/casas).
4. Gerar um mockup PNG estático (compondo os PNGs de verdade nessas
   posições) pra você aprovar o layout **antes** de eu tocar no `main.js`
   de novo.
5. Só depois disso, aplicar no jogo de verdade.

Isso resolve o "não fazer de novo às cegas": a régua agora é a proporção
medida da própria imagem, não uma composição que eu inventei.
