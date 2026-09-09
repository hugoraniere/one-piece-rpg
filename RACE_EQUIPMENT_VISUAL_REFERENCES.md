# Referências visuais — raças e camadas de equipamento

Pesquisa pra embasar as próximas raças e a extensão do sistema de camadas
(`src/character/layers.js`, `src/character/races.js`) antes de gerar arte
nova. Sem mudança de código aqui, só referência.

## 1. Como packs de pixel art reais resolvem "várias raças"

O [Fantasy Races Pack](https://pixel-wanderer.itch.io/fantasy-races-pack-retro-8-bit)
(13 personagens: humano, elfo, anão, orc, + híbridos) usa uma abordagem que
bate com o que discutimos: **todo mundo no MESMO canvas (24x24px)**, mesma
quantidade de frames/animações por personagem (idle, andar, dano, escudo, 5
tipos de ataque). A diferenciação de raça vem de:

- Paleta de cor
- Formato da cabeça
- Pequenos ajustes de proporção dentro do mesmo canvas

Ou seja, na prática ninguém redesenha o esqueleto por raça — eles mantêm o
"grid" idêntico e variam detalhe. Isso é uma boa notícia pro nosso caso:
**dá pra tratar raça como reskin com ajuste de proporção, não como rig
novo**, pelo menos pra raças humanoides "normais" (elfo, humano). Só raças
com silhueta muito diferente (anão baixo/largo) fogem disso.

Fonte: [pixel-wanderer.itch.io/fantasy-races-pack-retro-8-bit](https://pixel-wanderer.itch.io/fantasy-races-pack-retro-8-bit)

## 2. Proporção e direções — guia prático (Slynyrd Pixelblog)

Do [Pixelblog #22 — Top Down Character Sprites](https://www.slynyrd.com/blog/2019/10/21/pixelblog-22-top-down-character-sprites):

- **4 direções bastam, e só 3 artes únicas são necessárias** — perfil
  esquerdo/direito é o mesmo espelhado (exatamente o que já fazemos em
  `races.js` com `walkFlip`/`idleFlip`).
- **Cabeça grande (1/3 a 1/2 do sprite)** em personagens pequenos — bate com
  a correção que você já fez no personagem atual (não totalmente realista,
  mas também não chibi extremo — um meio-termo).
- **Altura variável é o principal diferenciador sistemático** — o autor usa
  alturas diferentes pra distinguir macho/fêmea/jovem/idoso dentro do MESMO
  sistema. Aplica direto pra raças: anão = mesmo rig, canvas mais baixo/
  largo; elfo = mesmo rig, um pouco mais alto/magro.
- **Sprite alinhado ao tile** (1 tile de largura, ~2 de altura) — já é como
  o projeto funciona (`CHAR_SCALE`, `TILE_SIZE` em `config.js`).

Fonte: [slynyrd.com/blog/2019/10/21/pixelblog-22-top-down-character-sprites](https://www.slynyrd.com/blog/2019/10/21/pixelblog-22-top-down-character-sprites)

## 3. Camadas de equipamento — validação da nossa abordagem + 1 nuance importante

Busca geral confirma o padrão que `layers.js` já implementa: **cada peça é
um PNG transparente do mesmo tamanho de canvas que o corpo, desenhada por
cima, nunca pré-renderizada junto** — é a abordagem "real-time stacking"
(vs. a alternativa "pré-renderizar toda combinação", que explode
combinatoriamente e foi descartada por bom motivo).

**Nuance que ainda não tratamos:** a ordem de desenho (z-order) muda por
direção. Resultado de busca resumiu assim: *"quando o personagem anda pra
cima [de costas], a ordem é: arma < mão < cabeça < corpo"* — ou seja, uma
arma na mão pode precisar desenhar **atrás** do braço/corpo quando o
personagem está de costas, mesmo sendo a mesma "camada arma" que desenha na
frente quando ele está de frente.

Hoje `updateLayerVisual` sempre desenha a arma em
`bodySprite.depth + 0.01` (sempre na frente, fixo). Isso funciona bem pra
espada na cintura (nunca "atrás" de nada), mas se um dia adicionarmos algo
segurado na mão que devia sumir atrás do corpo de costas (ex: escudo,
tocha), vamos precisar de um `depthOffset` por direção nos dados da camada
(`LAYER_DEFS`), não mais um valor fixo. Não é urgente agora — só documentando
pra não esquecer quando a arte de ataque/skill chegar.

## 4. Ferramentas de animação por esqueleto (Spine vs DragonBones) — contexto, não recomendação de mudança agora

Confirma o que já tínhamos concluído: **Spine é o padrão da indústria**
(usado com libgdx/Phaser/Unity/etc, mesh deformation, IK), **DragonBones é a
alternativa gratuita** mas foi rebatizado pra "LoongBones" em 2026 com
relatos de problemas de compatibilidade e incerteza sobre o futuro da
ferramenta — **isso é um ponto a favor de NÃO migrar pra lá agora** (dependência
instável). Se algum dia o volume de raças/equipamento justificar migrar pra
esqueleto de verdade, Spine seria a escolha mais segura, não DragonBones.

Fontes:
[Best 2D Skeletal Animation Software in 2026 (armanimation.com)](https://www.armanimation.com/post/best-2d-skeletal-animation-software-in-2026-free-paid-options-compared),
[Spine vs DragonBones vs Charios: 2D animation tools in 2026 (charios.com)](https://charios.com/blog/spine-vs-dragonbones-vs-charios-2d-animation-tools-2026)

## 5. Contagem de frames por animação — guia prático

Confirma que "mais frames" não é o que faz uma animação boa — timing e pose
importam mais. Números de referência pra usar como ponto de partida (ajustar
depois olhando no jogo):

| Animação | Frames sugeridos | Observação |
|---|---:|---|
| Idle | 4 | hoje temos 1-2, dá pra deixar assim (respiração sutil não precisa de muito) |
| Walk | 4-8 | hoje temos 2-5, ok |
| Attack | 3-4 | preparar → golpe → recuperar, como já planejamos |
| Hit reaction (dano) | 2-3 | um flinch simples já resolve — pode até ser só 1 frame + tint de cor (é o que já fazemos com o inimigo em `enemy.js`, `setTintFill`) |
| Death/Defeat | 4 (NPC/inimigo descartável) até 10+ (jogador/boss) | vale investir mais só na morte do jogador, não em cada inimigo genérico |
| Victory | 1-2 | só de frente, pose estática já basta |

Fonte: [sprite-ai.art/blog/sprite-animation-frames](https://www.sprite-ai.art/blog/sprite-animation-frames), [sandromaglione.com/articles/pixel-art-character-animations-guide](https://www.sandromaglione.com/articles/pixel-art-character-animations-guide)

## 6. Descoberta importante: arma diferente pode exigir POSE de corpo diferente, não só textura nova

Pesquisa sobre sistemas de animação de arma revelou uma coisa que nosso
sistema de camadas ainda não modela: **tipos de arma diferentes têm
biomecânica diferente** — um golpe de espada de uma mão usa rotação de
ombro; um machado/espada de duas mãos usa o corpo inteiro com rotação de
quadril; um arco precisa de uma pose de "puxar corda" completamente
diferente. Ou seja: **não dá pra generalizar "attack" como uma pose de
corpo única + arma trocada por cima** — isso só funciona DENTRO da mesma
família de arma (ex: todas as espadas de uma mão podem reaproveitar a mesma
pose de golpe do corpo, só trocando a textura da arma).

Isso muda a estrutura de dados: `attack` (e futuramente `skill`) precisa ser
indexado por **família de arma**, não só por direção. Ver seção 8 pra como
isso fica em `RACES`/raça.

Fontes: [mocaponline.com/blogs/mocap-news/combat-animation-game-dev-guide](https://mocaponline.com/blogs/mocap-news/combat-animation-game-dev-guide), [mocaponline.com/blogs/mocap-news/weapon-animation-systems-guide](https://mocaponline.com/blogs/mocap-news/weapon-animation-systems-guide)

## 7. Anão — proporção de referência

Regra prática: humano adulto ~8 cabeças de altura; **anão fica bem em ~6
cabeças** — resultado stocky/boneco, pernas e mãos curtas, juntas mais
rígidas (movimento menos "elegante" que humano/elfo). Importante: isso
significa que o anão **não pode reaproveitar os frames de caminhada do
humano** (proporção e ritmo de passada diferentes) — só a ESTRUTURA de
dados é compartilhada (mesmas chaves down/up/left/right × idle/walk/attack),
a arte em si precisa ser gerada própria por raça. Ver conclusão da seção 1 —
isso refina aquele ponto: "mesma estrutura" não é "mesma arte reaproveitada".

Fonte: [gamedev.net/forums/topic/625955](https://www.gamedev.net/forums/topic/625955-pixel-art-sprite-proportions-and-size/4946700/)

## 8. Esqueleto de dados proposto — raça × família de arma × animação

Estrutura conceitual (documentação, não código) de como `RACES` teria que
crescer pra suportar múltiplas famílias de arma sem perder o padrão atual:

```
RACES.<raceId>.frames.<direção>.<modo>
```
continua igual pra idle/walk (não dependem de arma). Mas:
```
RACES.<raceId>.attackByWeaponFamily.<weaponFamily>.<direção> = [frames...]
```
vira uma segunda estrutura só pra golpe/skill, porque o corpo se move
diferente por família de arma. `LAYER_DEFS` (a arma em si) já é
naturalmente por item (`sword`, `bow`, ...), então só falta o corpo também
saber por família.

**Recomendação de escopo:** não implementar isso agora — com 1 arma só
(espada), a estrutura atual (`attack` único) já resolve. Só vale a pena
generalizar pra `attackByWeaponFamily` quando a SEGUNDA família de arma
(ex: arco) for realmente entrar em produção. Documentando aqui pra não
esquecer o porquê quando chegar a hora.

## Conclusão prática pro projeto

1. **Não precisa de rig por raça, mas precisa de ARTE por raça.** Cada raça
   nova reaproveita a MESMA estrutura de dados de `RACES.human` (mesmo
   canvas, mesmas 4 direções, mesmos modos idle/walk/attack) — mas os
   frames em si são gerados do zero por raça (proporção e ritmo de
   movimento mudam, ex: anão em 6 cabeças de altura vs. 8 do humano). O
   ganho arquitetural é não precisar mudar código por raça, não economizar
   geração de arte.
2. **Camada de equipamento já está no caminho certo**, só falta prever
   `depthOffset` por direção em `LAYER_DEFS` pro dia que precisarmos de algo
   que passa atrás do corpo (não urgente, documentado na seção 3).
3. **Arma nova = possível pose de corpo nova**, não só textura nova — só
   vale generalizar `attack` por família de arma (seção 8) quando a segunda
   arma de verdade entrar em produção.
4. **Não migrar pra Spine/DragonBones ainda** — volume de conteúdo não
   justifica, e DragonBones está instável em 2026. Revisitar só se o número
   de raças × equipamentos crescer muito.
5. **Contagem de frames**: usar a tabela da seção 5 como ponto de partida
   pra pedir os assets — evita gerar frames demais em coisas que não
   precisam (idle, hit reaction, victory) e guardar o investimento maior
   pra attack/death do jogador.
