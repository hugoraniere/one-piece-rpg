# Elementos interativos do mundo — guia de padrão

Como adicionar um objeto do mundo (tipo baú, barco, barraca de mercado) que:
1. tem um ponto de interação (tecla **G** perto dele, ou clique direto nele);
2. opcionalmente bloqueia passagem (colisão sólida);
3. opcionalmente ganha um **brilho de destaque** quando o jogador está perto o bastante pra interagir.

Tudo isto mora em `src/scenes/islandScene.js`. Ideia original do destaque veio do
Reino de Aurora (`~/Desktop/reino-de-aurora-jogo/src/cenas/Mundo.ts#atualizarDestaque`),
adaptada — ver seção "Por que não é a técnica original" no fim.

## 1. Ponto de interação (`G` = "aja aqui perto")

Todo objeto interativo tem um ponto lógico `{ x, y }` num campo do
`islandConfig` (ver `src/world/islands/*.js`): `chestSpawn`, `boatSpawn`,
`marketSpawn`. `handleGather()` (chamada pela tecla G) já checa esses pontos
em ordem de prioridade, cada um com seu próprio raio de alcance:

```js
const CHEST_INTERACT_RANGE = 90;   // pixels
const BOAT_INTERACT_RANGE = 100;
const MARKET_INTERACT_RANGE = 110;
```

Pra adicionar um novo tipo:
1. Escolha um raio de alcance (`NOVO_INTERACT_RANGE`, mesma ordem de grandeza dos existentes: 80–120px).
2. Adicione o ponto ao(s) `islandConfig` relevante(s) (`novoSpawn: { x, y }`).
3. Adicione um branch em `handleGather()`, na MESMA ordem de prioridade dos outros (ground items sempre primeiro, depois barco/mercado/baú/o novo, depois o cooldown de coleta genérica).

Se o objeto também deve abrir com **clique direto** (não só G — ver seção 3), o clique chama a mesma função de ação que o G chamaria; não duplique lógica.

## 2. Colisão sólida (opcional)

Se o objeto não deve ser atravessável:

- **Prop decorativo comum** (o objeto é só uma imagem plantada em `VILLAGE_PROPS`/`islandConfig.props`, sem estado próprio): use o campo `collision: { width, height }` já suportado por `buildVillageProps()` em `src/world/propRegistry.js`. Ele cria uma `zone` física estática do tamanho dado, centrada horizontalmente e ancorada na base do prop.
- **Sprite com estado próprio** (ver seção 3, como o baú): crie a zone manualmente, mesmo padrão:

```js
const collisionZone = scene.add.zone(x, y - height / 2, width, height);
scene.physics.add.existing(collisionZone, true); // true = corpo estático
scene.physics.add.collider(scene.player, collisionZone);
```

Escolha `width`/`height` bem menores que o sprite inteiro — só a "caixa" da base deve bloquear, não a altura visual toda (mesmo critério das casas/poço em `VILLAGE_PROPS`).

## 3. Sprite com estado próprio (abre/fecha, troca de textura, clicável)

Só precisa disto se o objeto faz mais que existir (o baú troca de textura
fechado/aberto e anima). Um prop puramente decorativo (barraca, barco) NÃO
precisa — ele já nasce e morre com `buildVillageProps()`.

Padrão (ver `createChestSprite()`):

```js
function createXSprite(scene) {
  const spawn = scene.islandConfig.xSpawn;
  if (!spawn) return null;
  const sprite = scene.add.image(spawn.x, spawn.y, 'textura-inicial');
  sprite.setOrigin(0.5, 1); // pivô no PÉ — mesma régua de Y-sorting do resto do jogo
  sprite.setScale(ESCALA);
  sprite.setDepth(spawn.y);

  // Clicável direto (além do G) — sempre com event.stopPropagation(),
  // senão o clique "vaza" pro handler global de pointerdown da cena
  // (ataque/pesca).
  sprite.setInteractive({ useHandCursor: true });
  sprite.on('pointerdown', (pointer, localX, localY, event) => {
    event.stopPropagation();
    if (isEditorModeActive() || isFishingActive()) return;
    const dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, spawn.x, spawn.y);
    if (dist > X_INTERACT_RANGE) {
      showBlockedThrottled(scene, 'lastXBlockHintAt', 'cadeado', 'Chegue mais perto pra abrir.');
      return;
    }
    scene.openXMenu();
  });

  return sprite;
}
```

Guarde a referência em `this.xSprite` no `create()`, depois de `buildVillageProps(...)`.

Se o objeto troca de estado visual conforme um menu abre/fecha (como o baú
aberto/fechado), sincronize por **polling todo frame**, não por callback de
"eu abri"/"eu fechei" — o menu pode fechar por Esc ou clique fora do
backdrop, caminhos que não passam pelo seu código:

```js
function syncXVisual(scene) {
  if (!scene.xSprite) return;
  const shouldBeOpen = getActiveMenuKey() === 'chave-do-seu-menu';
  if (shouldBeOpen === scene.xIsOpen) return; // só mexe quando MUDA
  scene.xIsOpen = shouldBeOpen;
  playXToggleAnim(scene, shouldBeOpen);
}
```
Chame isto sempre, incondicionalmente, perto do topo de `update()` (mesmo
grupo de chamadas "sempre em dia" que `updateGroundItemHighlights`/
`syncChestVisual` já fazem).

### Animar abrir/fechar com só 2 artes estáticas (sem spritesheet)

Se você só tem uma arte "fechado" e uma "aberto" (sem quadros
intermediários — caso comum de asset pack), a troca de textura em seco
parece um "piscar". `playChestToggleAnim()` resolve com uma batida de
escala: encolhe rápido, troca a textura no ponto mais comprimido, estica de
volta com `Back.easeOut`. Copie esse padrão pra qualquer objeto na mesma
situação.

## 4. Brilho de destaque (o "atualizarDestaque" importado)

Chamado todo frame, incondicionalmente, no fluxo normal de jogo (mesmo lugar
de `updateNearbyLootPanel`): `updateInteractiveHighlight(this)`. Ele acha o
interagível mais perto **dentro do alcance dele** (cada um pode ter um
alcance diferente) entre todos que `getHighlightTargets()` retorna, e
desenha um brilho elíptico atrás dele.

### Registrando um alvo novo

Edite `getHighlightTargets()`:

```js
function getHighlightTargets(scene) {
  const targets = [];
  // ... entradas existentes (baú/barco/mercado) ...
  const novoSpawn = scene.islandConfig.novoSpawn;
  if (novoSpawn) {
    targets.push({
      x: novoSpawn.x,
      y: novoSpawn.y,
      // `sprite` é OPCIONAL — null é válido, ver "Sem sprite exato" abaixo.
      sprite: scene.novoSprite ?? findPropSpriteAt(novoSpawn.x, novoSpawn.y),
      range: NOVO_INTERACT_RANGE,
    });
  }
  return targets;
}
```

Três formas de conseguir o `sprite`:
1. **Objeto com estado próprio** (seção 3): já tem a referência direta (`scene.xSprite`).
2. **Prop decorativo cujo spawn COINCIDE exatamente com as coordenadas do prop** (caso do barco): use `findPropSpriteAt(spawn.x, spawn.y)`, que procura em `editorObjects` (de `propRegistry.js`) um prop plantado EXATAMENTE ali.
3. **Sem sprite exato** (caso do mercado de Portomares: `marketSpawn` é o PONTO ENTRE duas barracas, não coincide com nenhuma): passe `sprite: null` — o sistema cai automaticamente num tamanho padrão (`HIGHLIGHT_FALLBACK_WIDTH`) em vez de não destacar nada.

### ⚠️ Pegadinha: margem transparente na base da textura

**Meça antes de confiar no `sprite.y`.** `sprite.y` é o pé de origem
(`setOrigin(0.5,1)`), que só bate com o pé VISÍVEL de verdade se a arte não
tiver padding transparente embaixo. Descobrimos isto por tentativa e erro
(o brilho do baú fechado ficava boiando perto da cabeça do personagem) —
`village-chest-closed.png` tem **16–22%** de altura transparente na base
(provável reserva pro arco da tampa abrindo).

**Meça, não chute**, com este script (rode uma vez por arquivo novo, local, fora do jogo):

```bash
python3 -c "
from PIL import Image
im = Image.open('assets/caminho/da_textura.png').convert('RGBA')
w, h = im.size
px = im.load()
last_row = None
for y in range(h - 1, -1, -1):
    if any(px[x, y][3] > 40 for x in range(0, w, 3)):
        last_row = y
        break
trim = h - 1 - last_row
print(f'trim_bottom_px={trim} trim_frac={trim/h:.3f}')
"
```

Se `trim_frac` for maior que ~0.03 (3%), adicione uma entrada em
`HIGHLIGHT_VISUAL_BOTTOM_TRIM` (chave = `texture.key`, valor = a fração
medida — ajuste fino por olho depois, o valor medido é só o ponto de
partida). Texturas não listadas usam 0 (sem correção) — é por isso que
barco/barraca (medidos em <1.5%) nunca precisaram de entrada.

### Tamanho, cor e posição do brilho

- Largura do brilho = ~70% da `displayWidth` do sprite (ou `HIGHLIGHT_FALLBACK_WIDTH * 0.7` sem sprite); altura = 35% da largura. Não precisa mexer nisso por alvo — já escala sozinho.
- Cor (`HIGHLIGHT_COLOR = 0xf2802b`) é única pro jogo inteiro — não crie uma cor por tipo de objeto, o destaque deve significar sempre a mesma coisa.
- **Depth sempre relativo ao alvo** (`sprite.depth - 1`, ou `y - 1` sem sprite), nunca um valor fixo alto. Já tentamos fixo (resolvia o mercado lotado de Portomares) e piorou o caso comum (baú/barco): o brilho cobria o objeto por cima em vez de ficar atrás. Se um alvo específico tiver esse problema (objetos vizinhos "na frente" cobrindo o brilho), é comportamento correto de Y-sorting — não vale a pena um caso especial só por isso.
- Contorno grosso e quase opaco (`setStrokeStyle(3, HIGHLIGHT_COLOR, 1)`) é o que garante leitura em QUALQUER chão por baixo — preenchimento sozinho quase sumia contra terra/areia (mesma família de cor do laranja). Não reduza o contorno achando redundante.
- Pulso é por **escala**, nunca por alpha do GameObject — animar `alpha` ali multiplica em cima do `fillAlpha`/`strokeAlpha` já fixos do shape e mal se nota, além de arriscar esvaziar o contraste que o contorno resolve.

## Referência rápida — o que já existe hoje

| Objeto  | Spawn config      | Range | Sprite pro destaque              | Trim de textura |
|---------|-------------------|-------|-----------------------------------|------------------|
| Baú     | `chestSpawn`      | 110   | `scene.chestSprite` (estado próprio) | closed 0.22, open 0.09 |
| Barco   | `boatSpawn`       | 100   | `findPropSpriteAt` (coincide com o prop) | nenhum (< 1.5%) |
| Mercado | `marketSpawn`     | 110   | `null` (fallback) — Portomares tem 2 barracas, spawn é o meio | n/a |

## Por que não é a técnica original do Reino de Aurora

A referência (`atualizarDestaque()`) usa 8 cópias do sprite do alvo,
tingidas de cor sólida via `setTintFill`, deslocadas 1px em cada direção
pra formar um contorno pixel-perfect. **Isso só funciona no renderer
WEBGL.** Este jogo roda em `Phaser.CANVAS` de propósito (`main.js`) —
testado direto no browser, confirmado que `setTintFill`/`setTint` não têm
NENHUM efeito nesse modo. Por isso a adaptação usa um `Ellipse` (shape com
`fillColor`/`strokeColor` de verdade, funciona nos dois renderers) em vez
de cópias tingidas do sprite. Se um dia o jogo migrar pra `Phaser.WEBGL`,
a técnica original volta a ser viável — mas não antes disso.
