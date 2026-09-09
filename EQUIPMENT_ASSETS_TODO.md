# Personagem em camadas (corpo + arma) — o que já existe e o que falta

## O que já está pronto no código

O jogo agora desenha a arma equipada como uma **segunda imagem, grudada no
personagem** (`src/character/layers.js` — generalizado de "arma" pra
"qualquer camada de equipamento", ver nota no fim do arquivo). Ela copia
posição, escala e profundidade do corpo a cada frame — não existe nenhum
"deslocamento X/Y" calculado à mão pra encaixar.

A arma também já tem um terceiro modo de animação, `attack`, além de
idle/walk — hoje reaproveitando os mesmos frames do idle como placeholder
(junto com o corpo, ver `CHARACTER_ASSETS_TODO.md`). Quando a arte de golpe
de verdade chegar, é só trocar os arrays de frames em `LAYER_DEFS.sword` (em
`layers.js`), sem mexer em nenhuma outra função.

Enquanto não tem arte de verdade, o jogo usa uma **espada placeholder
roxa/magenta gerada por código** (cor que não existe em nenhum asset real,
pra nunca confundir com arte de verdade). Aperte **Q** no jogo pra
equipar/desequipar e ver a camada funcionando.

## Por que isso funciona sem cálculo de posição

A regra é simples: **a arte da arma precisa nascer na mesma "folha" (mesmo
tamanho de canvas, mesmo alinhamento) que o frame do corpo correspondente**,
como se fosse um acetato transparente por cima do desenho do personagem. Se
os dois nascem alinhados, basta desenhar os dois na mesma posição/escala na
tela — sem matemática nenhuma pelo meio.

Hoje os frames do personagem são 200x200 (ver `CHARACTER_ASSETS_TODO.md`).
Qualquer arte de arma precisa ser gerada/exportada nesse mesmo tamanho de
tela, com a arma desenhada exatamente onde ela apareceria se estivesse
desenhada junto no personagem — e tudo o resto do canvas transparente.

## O que preciso receber (quando for gerar a arma de verdade)

Pra a espada atual (já baked na arte do personagem), o ideal é:

1. **Regerar o corpo SEM a arma desenhada** (mesma pose, mesmo estilo, só
   tirando a espada/bainha do cinto) — isso substitui os arquivos atuais em
   `assets/characters/`.
2. **Gerar a arma sozinha**, no mesmo canvas 200x200, na mesma posição em
   que estava no corpo original — isso vira os arquivos novos abaixo.

Só precisa de **3 imagens de arma** (não uma por frame de caminhada — a
espada sheathed não se move muito enquanto anda, então reaproveitar a mesma
imagem no idle e na caminhada já fica bom o suficiente por enquanto):

| Arquivo esperado | Direção |
|---|---|
| `assets/characters/weapon_sword_front.png` | de frente (olhando pra baixo) |
| `assets/characters/weapon_sword_back.png` | de costas (olhando pra cima) |
| `assets/characters/weapon_sword_side.png` | de perfil (direita — a esquerda reaproveita espelhada, igual já fazemos com o corpo) |

## Como conectar quando os arquivos chegarem

Em `src/character/equipment.js`:

1. Trocar `generatePlaceholderWeaponTextures(scene)` por `scene.load.image(...)`
   pros 3 arquivos acima (mesmo padrão de `preloadCharacterAssets` em
   `character.js`) — chamar isso de dentro de `preload()` da cena
   (`src/scenes/villageScene.js`), não mais em `create()`.
2. Trocar as chaves em `WEAPONS.sword` pelas novas (`weapon-sword-front`,
   `weapon-sword-back`, `weapon-sword-side`).

Nenhuma outra mudança de código é necessária — a sincronia de
posição/escala/profundidade já é genérica.

## Depois da espada

- Se quiser a arma balançando durante a caminhada (em vez de ficar rígida),
  é só gerar mais de um frame por direção e colocar no array `walk` de
  `WEAPONS.sword` — o código já suporta isso (mesma lógica de troca de frame
  do corpo).
- Pra adicionar uma segunda arma (ex: um item novo, ou a arma de outro
  membro da tripulação), é só adicionar outra entrada em `WEAPONS` com a
  mesma estrutura.
- Outras camadas de equipamento (chapéu, roupa alternativa) seguem
  exatamente o mesmo padrão — outra imagem sincronizada com o corpo, outra
  entrada de dados como `WEAPONS`.
