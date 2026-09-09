# Ilustrando equipamento/itens + bibliotecas gratuitas — pesquisa

## 1. Como desenhar ícone de item/equipamento bem (resumo prático)

- **Silhueta é o que mais importa.** Se você borrar o ícone e ainda dá pra
  reconhecer o que é (espada vs poção vs chave), a silhueta está certa. Em
  16x16-32x32 (tamanho comum de ícone de inventário), detalhe interno some
  primeiro — a forma externa é o que precisa comunicar.
- **Contorno consistente em todo o set.** Escolher UM estilo (contorno preto
  grosso — que já é o nosso, contorno colorido mais suave, ou sem contorno)
  e manter em todos os ícones. Misturar estilos de contorno no mesmo
  inventário quebra a coesão visual mais rápido que qualquer outra coisa.
- **Paleta fixa entre os ícones**, não só dentro de cada um — reaproveitar
  as mesmas cores-base (o mesmo azul do casaco, o mesmo dourado dos
  detalhes) entre itens diferentes é o que faz o inventário parecer "de um
  jogo só".
- **Grid consistente** — cada item nasce num canvas do mesmo tamanho
  (ex: 64x64, como já usamos pro personagem/arma), alinhado ao mesmo pixel
  grid, mesmo que o objeto em si não ocupe o canvas todo.

Fontes: [Icons8 — A guide to pixel-perfect icons](https://icons8.medium.com/a-guide-to-pixel-perfect-icons-390e2fa2820c), [drububu.com — pixel art & shading](https://drububu.com/tutorial/pixel-art-and-shading.html)

## 2. Bibliotecas gratuitas — onde baixar

| Fonte | O que tem | Licença | Uso recomendado |
|---|---|---|---|
| **[Kenney.nl](https://kenney.nl/assets)** | Milhares de assets 2D/3D/UI/áudio, estilo consistente entre pacotes | **CC0** (domínio público) | Seguro pra qualquer uso, inclusive comercial fechado — mas o estilo visual (mais "flat/game-jam") não bate com o nosso (cel-shaded, contorno grosso, pintado) |
| **[itch.io — tag items+pixel-art](https://itch.io/game-assets/free/tag-items/tag-pixel-art)** | Milhares de packs individuais de itens/ícones | **Varia por pack** — checar sempre a licença específica na página de cada um | Bom pra achar um estilo mais próximo do nosso, mas precisa filtrar um por um |
| **[RPG Pixel Art Icon Pack — 33 ícones (itch.io)](https://id01t.itch.io/rpg-pixel-art-icon-pack)** | 33 ícones 16x16 (armas + itens básicos) | **CC0** | Bom placeholder pra itens genéricos (poção, moeda, pergaminho) |
| **[OpenGameArt.org](https://opengameart.org/)** | Arquivo grande, ativo, com "art jams" recorrentes | Varia — cada item mostra a licença (CC0, CC-BY, CC-BY-SA, GPL) | Igual itch.io, checar item por item |
| **[16x16 Weapon RPG Icons (OpenGameArt)](https://opengameart.org/content/16x16-weapon-rpg-icons)** | 30 armas + 4 recolors cada | Checar página (geralmente CC-BY ou CC0) | Bom referência de variedade de silhueta de arma |
| **[Armor Icons by Equipment Slot — LPC (OpenGameArt)](https://lpc.opengameart.org/content/armor-icons-by-equipment-slot)** | Ícones de armadura por slot (cabeça/peito/mão/perna/pé), 5 materiais | **CC0** (essa página específica) | Bom pra estruturar quais SLOTS de equipamento vocês querem ter (não necessariamente pra usar a arte em si) |
| **[Liberated Pixel Cup (LPC) — Universal Sprite Sheet Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)** | O MAIS PARECIDO com nosso problema: corpo + roupa + arma em camadas, várias raças/proporções, tudo open-source, com um gerador visual pra combinar | **CC-BY-SA 3.0 + GPLv3** (ver seção 3 — ATENÇÃO) | Ótima REFERÊNCIA de arquitetura (como eles organizam camada por slot, direção, frame) — usar a arte em si tem restrição, ver abaixo |

## 3. Atenção — licença do LPC não é "livre pra qualquer coisa"

Isso é importante o suficiente pra separar numa seção própria: o LPC usa
**CC-BY-SA 3.0** (às vezes GPLv3 junto). Isso significa:

- **Atribuição obrigatória** — precisa creditar os autores originais em
  algum lugar acessível (créditos do jogo, por exemplo).
- **Share-alike ("viral")** — se você pegar a arte do LPC e MODIFICAR
  (recolorir, editar), a modificação também precisa ser licenciada
  CC-BY-SA. Isso não te impede de vender o jogo, mas te impede de manter
  essas modificações "fechadas" — teoricamente alguém poderia pedir pra
  redistribuir a arte derivada sob a mesma licença.

**Recomendação prática:** não vale a pena usar arte do LPC diretamente nos
assets finais do jogo (o requisito de atribuição + share-alike é
fricção desnecessária pra um projeto onde já estamos gerando arte própria
por IA). Mas **vale MUITO a pena estudar a estrutura de camadas/slots deles**
como referência de arquitetura — é literalmente o mesmo problema que
`layers.js`/`races.js` resolve, testado em produção por anos.

## 4. O problema real: estilo visual não combina

Nenhum desses pacotes gratuitos foi feito no MESMO estilo do nosso
personagem (cel-shaded, contorno preto grosso, cores vivas, gerado por IA
com referência travada). Misturar um ícone baixado de um pack genérico com
a arte do personagem provavelmente vai destoar (resolução de pixel
diferente, peso de contorno diferente, paleta diferente).

**Uso recomendado desses packs, então:**

1. **Referência de variedade/silhueta** — "quantos tipos de espada existem
   visualmente, como uma machadinha se diferencia de uma espada, que
   elementos uma poção precisa ter pra ser reconhecível" — inspiração de
   design, não arte final.
2. **Placeholder temporário** — usar um ícone genérico CC0 (ex: o pack de
   33 ícones) só pra ter ALGO no lugar enquanto não geramos o item de
   verdade no nosso estilo — mesmo princípio da espada roxa placeholder que
   já existe em `layers.js`.
3. **Estrutura de dados (slots de equipamento)** — o pack "Armor Icons by
   Equipment Slot" é útil só pra decidir QUE slots existem (cabeça, peito,
   mão, perna, pé) antes de gerar arte de verdade.

## Conclusão prática pro projeto

- Não recomendo baixar arte pronta pra usar direto no jogo final — o
  estilo não vai bater, e criaria uma mistura visual inconsistente.
- Vale usar Kenney/OpenGameArt/itch como **inspiração e placeholder
  temporário**, do mesmo jeito que já usamos formas desenhadas por código
  (roxo/magenta) — nunca fingindo ser arte final.
- Vale estudar a **estrutura** do LPC (slots, organização de camadas) como
  referência de arquitetura, sem usar a arte dele por causa da licença
  share-alike.
- Pra arte final, o caminho continua sendo gerar no gerador de imagem com
  referência travada no personagem atual — mesmo processo que já validamos
  pro corpo/arma.
