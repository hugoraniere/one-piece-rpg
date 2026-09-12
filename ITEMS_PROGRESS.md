# Progresso — Sistema de Itens Equipáveis (sessão autônoma)

Trabalho iniciado em 2026-09-12, sessão autônoma (~2h) enquanto o Hugo está
fora. Este arquivo é o log de progresso pra revisão quando ele voltar.

## ⚠️ Bloqueio conhecido: sem geração de pixel art via PixelLab

Investigado no início da sessão: não há API key da PixelLab, nem
`character_id` (usado pra manter consistência visual entre gerações)
salvos em nenhum lugar do repositório — as gerações anteriores (idle, walk,
run, attack da espada) foram feitas via chamadas HTTP diretas em sessões
anteriores, sem persistir isso no repo. Não há MCP de PixelLab disponível
nesta sessão.

**Decisão**: em vez de travar esperando, os novos itens usam o MESMO padrão
de placeholder já estabelecido pra espada/vara (`drawPlaceholderSword`/
`drawPlaceholderRod` em `src/character/layers.js`) — formas simples
desenhadas via Canvas 2D, com cores/silhueta reconhecíveis, MARCADAS
como placeholder. Trocar por arte de verdade via PixelLab fica pra uma
sessão interativa com a API key.

## Arquitetura existente (descoberta, não inventada)

Dois sistemas de equipamento coexistem no código:
1. **Sistema real/ativo** (`src/character/layers.js` + `equipState`) — é o
   que renderiza de verdade (update loop, ataque, pesca, hotbar). Um slot
   só (`equipState.equippedLayerId`), um item por vez.
2. **CharacterManager novo** (`characterManager.js`/`layerSystem.js`/
   `outfits.js`, sessão anterior) — infraestrutura pra troca de OUTFIT
   completo (roupa do corpo todo), não pra arma na mão. Ainda não conectado
   à renderização. Não é o sistema usado pelos itens abaixo — são
   preocupações diferentes (outfit vs. item empunhado).

Achei e corrigi uma regressão no início desta sessão: a tecla Q tinha sido
ligada ao CharacterManager novo por engano, quebrando o equipar visual da
espada (commit `250acfb`).

## Itens

| Item | Status | Slot hotbar | Atributo principal |
|---|---|---|---|
| Espada (Cutlass de Ferro) | ✅ já existia | 1 (Q) | Dano corpo-a-corpo (5 + Força) |
| Vara de Pescar | ✅ já existia | 2 | Pesca (baseline) |
| Arco Curto | ✅ pronto e testado | 3 | Dano à distância (4 + Força, alcance 160 vs 90 da espada), treina Arremesso |
| Machado de Lenhador | ✅ pronto e testado | 4 | Dobra graveto coletado perto de árvore (tool, não ataca) |
| Vara Reforçada (tier 2) | ✅ pronto e testado | 5 | +10 pontos percentuais de chance de mordida (soma com a isca) |
| Lança de Caça | ✅ pronto e testado | 6 | Dano 6 (+1 sobre a espada), alcance 110 (entre espada e arco), treina Lanças/hastes |

## Sistema de atributos (fundação, reutilizável)

`src/sim/equipmentDefs.js` — tabela central de "o que cada item FAZ quando
equipado", por `equipLayerId`:
- `kind: 'weapon'` → participa de `tryAttack()`: `damage` (soma ao dano
  base), `range` (sobrescreve o alcance padrão), `skillKey` (perícia
  treinada a cada acerto)
- `kind: 'tool'` → `gatherMultiplier` (bônus de coleta perto de árvore) e/ou
  `canFish`+`biteBonus` (participa de `tryStartFishing()`/`getBiteChance()`)

Adicionar um item NOVO agora segue um padrão fixo (6 exemplos de referência
já existem): 1 entrada em `ITEM_DEFS` (catálogo/inventário), 1 em
`LAYER_DEFS` + placeholder canvas em `layers.js` (visual), 1 em
`EQUIPMENT_DEFS` (atributos), 1 em `RECIPES` (crafting.js), 1 em
`HOTBAR_SLOTS` (hud.js, se for pra hotbar) + handler em `islandScene.js`
(via `makeEquipHotbarHandler`), 1 par em `EQUIP_LABELS`/`EQUIP_ICONS`
(inventoryMenu.js). Nenhum desses pontos precisou de generalização nova
pra lança — a fundação criada pro arco/machado/vara reforçada já aguentou.

## Generalizações feitas (eram hardcoded pra 'sword'/'vara-de-pescar')

- `tryAttack()`: lê `equipmentDefs` em vez de checar `=== 'sword'` — dano/
  alcance/perícia vêm da tabela, sword mantém os valores originais (damage
  0, MELEE_RANGE, 'espada') como referência/baseline
- Toast de "sem alvo" no clique: qualquer `kind: 'weapon'`, não só espada
- `handleGather()`: bônus de coleta lido de `equipmentDefs` (`gatherMultiplier`)
- `tryStartFishing()`: `canFish` em vez de `=== 'vara-de-pescar'` hardcoded
- `getBiteChance(baitId, equipLayerId)`: segundo parâmetro novo, soma
  `biteBonus` por cima da isca — chamada sem ele mantém o comportamento
  de sempre
- Hotbar (`setHotbarState`/`HOTBAR_SLOTS`): trava de posse por `itemId`
  por slot, não um `hasRod` boolean único (esse quebraria com 2+ slots
  travados — bug que existiria se eu não tivesse generalizado antes do
  segundo item novo)
- `makeEquipHotbarHandler()` em islandScene.js: fábrica de handler
  "equipa se tiver, avisa se não tiver" — evita copiar o mesmo bloco a
  cada item novo (já eram 3 cópias quase idênticas antes de virar fábrica)
- `equippedLabel()`/ícone do slot "Mão" (inventoryMenu.js): tabela
  `EQUIP_LABELS`/`EQUIP_ICONS` em vez de ifs hardcoded
- Perícias "Arremesso" e "Lanças/hastes" viraram `real: true` em
  menuData.js (antes diziam "sem arma no jogo ainda")

## Materiais novos e suprimento inicial

`corda`/`ferro-bruto` seedados no inventário inicial (mesmo padrão de
`linha-de-nylon`, que já existia) — sem gather próprio ainda, é suprimento
fixo só pra dar pra fabricar cada item uma vez:
- `corda`: 1 (usado só pelo arco)
- `ferro-bruto`: 3 (machado, vara reforçada e lança usam 1 cada)
- `linha-de-nylon`: 2 (vara comum e vara reforçada usam 1 cada — já existia)

`graveto` é o único material compartilhado entre TODAS as receitas, mas
tem gather infinito (tecla G perto de árvore), então nunca é um limitador
real.

## Limitação visual conhecida (não é bug)

O golpe de ataque de arco/lança reaproveita a pose de IDLE da camada (sem
frame de "puxar a corda"/"estocar") porque os frames de CORPO do golpe
(`races.js`, PixelLab) foram desenhados especificamente pra um swing de
espada — não existe animação de corpo pra outras armas ainda. Visualmente
o personagem faz o swing de espada (frames do corpo) enquanto a camada da
arma equipada fica parada do lado. Corrigir isso exige gerar frames de
corpo específicos via PixelLab (bloqueado, ver topo deste arquivo).

## Regressão completa (todos os 5 itens novos+existentes juntos, do zero)

Feita duas vezes (depois da vara reforçada, e de novo depois da lança):
save resetado, todos os itens fabricados na mesma run (sem conflito de
material), cada `equipLayerId` testado via chamada direta às funções
reais do jogo (não só inspeção de dado):

- Fabricação simultânea de vara-de-pescar/arco/machado/vara-reforçada/lança:
  todos `true`, inventário final consistente (materiais raros zerados
  exatamente como esperado, nada sobrou nem faltou)
- Dano: espada 5, arco 4, lança 6 — cada um bate com `EQUIPMENT_DEFS`,
  sem regressão entre eles
- `machado.canFish` é `false` (não tem a propriedade) — não pesca, correto
- Chance de mordida: vara comum 0.4, reforçada 0.5 (com minhoca) — bônus
  aplicado corretamente, chamada sem vara equipada mantém 0.4 de sempre
- Coleta perto de árvore: machado 2 graveto, sem ferramenta 1 graveto —
  multiplicador aplicado só quando deveria
- Textura visual troca corretamente pra cada equipLayerId (`weapon-bow-
  front`, `weapon-axe-front`, `rod-reforcada-front`, `weapon-lanca-front`)
- Hotbar reflete posse/equipagem corretamente nos 6 slots ativos (clique
  real na UI, não só mutação direta de estado)
- Nenhum erro no console em nenhum momento

## Nota sobre o processo de teste desta sessão (não são bugs do jogo)

- Por algumas vezes, uma chamada JS no console veio `undefined` por ~1
  frame logo depois de mutar `equipState.equippedLayerId` diretamente ou
  trocar de aba do menu — é a cena passando por um instante de re-render/
  HMR do Vite nesta sessão de browser de longa duração. Esperar ~1s e
  tentar de novo sempre resolveu; o inventário/progressão nunca se perdeu.
- `await import('/src/ui/hud.js')` no console do browser cria uma
  instância SEPARADA do módulo (com seu próprio `hotbarEls = {}` vazio,
  nunca populado por `initHud()`) — chamar `setHotbarState` nela dá
  `TypeError: Cannot read properties of undefined (reading 'classList')`.
  Não é um bug do jogo: o HUD real (dentro da instância que o jogo já
  roda) sempre funcionou corretamente quando testado via clique real na
  UI ou via `window.__game.scene.scenes[1]`.

## Estado final

Sessão de itens equipáveis considerada **pronta pra revisão**. Seis itens
equipáveis (espada, vara comum, arco, machado, vara reforçada, lança)
funcionam de forma consistente e sem regressão entre si, cada um com
atributos de gameplay reais (não só visual) e testado ponta a ponta
(fabricar → equipar → usar → efeito correto). A fundação (`equipmentDefs.js`
+ generalizações) está reutilizável pra qualquer item futuro sem precisar
tocar na lógica central de novo.

Pendência real pra virar produto acabado: arte de verdade via PixelLab
(bloqueada nesta sessão, precisa de API key numa sessão interativa) — os
placeholders atuais são funcionais mas visualmente simples de propósito.

## Ideias não iniciadas (próxima sessão, se fizer sentido)

- Dar ao `machado` (ou a "sem arma nenhuma") algum papel em combate —
  'luta' desarmado já é `real: true` em menuData.js mas `tryAttack()` não
  permite ataque sem `kind: 'weapon'` equipado. Inconsistência
  PRÉ-EXISTENTE (não introduzida nesta sessão), vale nota pra quando
  alguém for mexer em combate desarmado.
- Gather próprio pra `corda`/`ferro-bruto` (hoje é suprimento fixo de
  boot) — só vira necessário se o jogo crescer pra precisar de mais de
  uma unidade de cada item por partida.
