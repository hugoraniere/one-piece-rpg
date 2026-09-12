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

## Itens planejados

| Item | Status | Slot hotbar | Atributo principal |
|---|---|---|---|
| Espada (Cutlass de Ferro) | ✅ já existia | 1 (Q) | Dano corpo-a-corpo (5 + Força) |
| Vara de Pescar | ✅ já existia | 2 | Pesca |
| Arco Curto | ✅ pronto e testado | 3 | Dano à distância (4 + Força, alcance 160 vs 90 da espada), treina Arremesso |
| Machado de Lenhador | ✅ pronto e testado | 4 | Dobra graveto coletado perto de árvore (tool, não ataca) |
| Vara Reforçada (tier 2) | ✅ pronto e testado | 5 | +10 pontos percentuais de chance de mordida (soma com a isca) |

## Log

- [x] Corrigida regressão do Q (CharacterManager → sistema real de equipState) — commit `250acfb`
- [x] `src/sim/equipmentDefs.js` novo — tabela de atributos por equipLayerId (kind weapon/tool, damage, range, skillKey, gatherMultiplier)
- [x] Generalizado `tryAttack()` pra ler de equipmentDefs — espada testada sem regressão (dano 5, treina 'espada')
- [x] Generalizado o toast de "sem alvo" no clique pra qualquer arma (antes só checava 'sword')
- [x] Generalizado `handleGather()` pra bônus de machado (testado: 1→2 graveto por coleta)
- [x] Generalizada hotbar (`setHotbarState`/`HOTBAR_SLOTS`) pra checar posse por item via `itemId` — antes um único `hasRod` boolean quebraria com 2+ slots travados
- [x] Item Arco: ITEM_DEFS + LAYER_DEFS (4 direções, placeholder canvas) + receita (graveto x2 + corda x1) + ícone (`assets/icons/arco.png`) + slot hotbar 3
- [x] Item Machado: ITEM_DEFS + LAYER_DEFS (4 direções, placeholder canvas, sem 'attack' — é tool) + receita (graveto x1 + ferro-bruto x1) + ícone (`assets/icons/machado.png`) + slot hotbar 4
- [x] Novos materiais `corda`/`ferro-bruto` seedados no inventário inicial (mesmo padrão de `linha-de-nylon`) — sem gather próprio ainda
- [x] `equippedLabel()`/ícone do slot "Mão" no inventoryMenu.js generalizados (antes hardcoded só sword/vara)
- [x] Perícia "Arremesso" virou `real: true` em menuData.js
- [x] Testado no browser: fabricar os dois itens pela UI real, equipar pelo clique na hotbar, textura visual troca corretamente (`weapon-bow-front`/`weapon-axe-front`), dano do arco (4) menor que espada (5) mas sem regressão na espada, bônus de coleta do machado (2x) confirmado, skill correta treinada em cada caso (arremesso vs espada)

## Limitação conhecida (não é bug)

O golpe de ataque do arco reaproveita a pose de IDLE da camada (sem frame de "puxar a corda") porque os frames de CORPO do golpe (`races.js`, PixelLab) foram desenhados especificamente pra um swing de espada — não existe animação de corpo pra arco ainda. Visualmente o personagem faz o swing de espada (frames do corpo) enquanto a camada do arco fica parada do lado. Corrigir isso exige gerar frames de corpo específicos via PixelLab (bloqueado, ver topo deste arquivo).

## Vara Reforçada (tier 2 de pesca) — detalhes

- `EQUIPMENT_DEFS['vara-de-pescar']`/`['vara-reforcada']` novos: `canFish: true` discrimina "essa ferramenta pesca" de "essa ferramenta só coleta" (machado é `kind: 'tool'` também, mas sem `canFish` — sem isso `tryStartFishing()` deixaria pescar com o machado equipado)
- `getBiteChance(baitId, equipLayerId)` em `sim/fishing.js` ganhou o segundo parâmetro — soma `biteBonus` por cima da chance da isca, `Math.min(1, ...)` trava em 100%. Chamada sem `equipLayerId` (ou com item sem `biteBonus`) continua com o comportamento de antes — testado: `getBiteChance('minhoca')` sem segundo argumento = 0.4, igual sempre foi
- `tryStartFishing()` generalizado de `equippedLayerId !== 'vara-de-pescar'` pra `!getEquipmentDef(...)?.canFish` — mesma generalização já aplicada em tryAttack/handleGather
- Visual: reaproveita o desenho da vara comum (`drawPlaceholderRod`) com um parâmetro `reinforced` novo que soma uma faixa metálica — não duplica a função inteira só pra "a mesma vara, com um detalhe a mais"
- Receita consome `ferro-bruto` (por isso o seed inicial subiu de 1 pra 2 — 1 pro machado, 1 pra essa) — `linha-de-nylon` (seed 2) e a vara comum (pré-requisito conceitual, mas NÃO um input da receita — são independentes) dividem o mesmo suprimento inicial sem faltar
- Testado: matemática de `getBiteChance` confirmada por chamada direta (0.08→0.18 sem isca, 0.4→0.5 com minhoca), `canFish` confirmado por inspeção do objeto (machado não tem a propriedade), fabricação via `craft()` consumiu os materiais certos, equipar troca a textura pra `rod-reforcada-front` corretamente, hotbar slot 5 reflete posse/equipagem

## Nota sobre o processo de teste desta sessão

Por duas vezes, uma chamada JS no console (`window.__game.scene.scenes[1].state`) veio `undefined` por ~1 frame logo depois de mutar `equipState.equippedLayerId` diretamente ou trocar de aba do menu — não é um bug do jogo, é só a cena passando por um instante de re-render/HMR do Vite nesta sessão de browser de longa duração. Esperar ~1s e tentar de novo sempre resolveu; o inventário/progressão nunca se perdeu nesses momentos.

## Próximos itens (não iniciados nesta sessão)

- Talvez uma segunda arma corpo-a-corpo (lança?) reaproveitando o padrão já estabelecido — adicionar um item novo agora é: 1 entrada em `ITEM_DEFS`, 1 em `LAYER_DEFS` (+ placeholder canvas), 1 em `EQUIPMENT_DEFS`, 1 em `RECIPES`, 1 em `HOTBAR_SLOTS` (se for pra hotbar) — o padrão está reutilizável e agora tem 4 exemplos de referência (arco, machado, vara-reforçada, mais a espada original)
- Considerar dar à `machado` também algum papel em combate (unequip → 'luta' desarmado já é `real: true` em menuData.js mas `tryAttack()` não permite ataque sem arma nenhuma — inconsistência PRÉ-EXISTENTE, não introduzida nesta sessão, mas vale nota pra quando alguém for mexer em combate desarmado)
- Regressão geral: nenhuma rodada de teste completo (fabricar TODOS os itens numa run só, testar cada slot 1-5) foi feita depois da vara reforçada — vale uma passada final antes de considerar a sessão "pronta pra revisão"
