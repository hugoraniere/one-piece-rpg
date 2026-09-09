# Assets do personagem — o que trazer

Quando terminar de gerar as animações do personagem, traga os arquivos e eu conecto no protótipo (`main.js`).

## O que preciso receber

1. **Um PNG por direção** (o mais simples de integrar) ou **um spritesheet único** com todas as direções — qualquer um dos dois formatos funciona, me diga qual você gerou.
2. Pra cada direção de caminhada (baixo, cima, esquerda/direita — direita pode ser a esquerda espelhada), quantos frames de animação você tem (ex: 4 frames por direção).
3. O tamanho de cada frame em pixels (ex: 64x64, 128x128) — se não souber exato, me manda a imagem que eu meço.
4. Fundo transparente ou fundo sólido de uma cor só (pra eu saber se preciso remover fundo antes de usar).

## Estrutura de pastas já preparada

```
assets/
  characters/     ← coloque os arquivos do personagem aqui
```

## O que já está pronto no protótipo

- Personagem placeholder (círculo cinza com indicador de direção) andando com setas/WASD sobre um chão de terra placeholder.
- Movimento 4 direções (8 com diagonal), já guardando qual direção o personagem está olhando (`facing`) — isso é exatamente o que vai decidir qual animação/frame mostrar quando o sprite real entrar.

## O que eu faço quando os arquivos chegarem

- Substituo a textura placeholder pelo spritesheet real.
- Configuro a animação (frames por direção) usando o `facing` que já está sendo calculado.
- Ajusto o tamanho do personagem em relação ao tile do chão.
