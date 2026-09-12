# Personagem principal — o que já temos e o que falta

## Já integrado no jogo

| Pose | Arquivo | Uso atual |
|---|---|---|
| Idle de frente | `idle_front.png` | Parado, olhando pra baixo |
| Idle de costas (2 frames, alterna devagar) | `idle_back_1/2.png` | Parado, olhando pra cima — respiração sutil |
| Idle de perfil (arte própria, sem espelhar) | `idle_left.png` / `idle_right.png` | Parado, olhando pros lados |
| Caminhada de frente (2 frames) | `walk_front_1/2.png` | Andando pra baixo |
| Caminhada de costas (2 frames) | `walk_back_1/2.png` | Andando pra cima |
| Caminhada de perfil (1 frame) | `walk_side_1.png` | Andando esquerda/direita (espelhado) |

Fundo verde já removido (`tools/remove_chroma_key.py`), redimensionado pra 200x200 (arquivos originais em alta resolução preservados como `assets/characters/raw_*.png`).

## Pendência conhecida

- **`walk_side_2.png` está causando textura quebrada** pro usuário em teste real (o arquivo passa validação aqui, mas mostra o ícone de "textura não encontrada" no jogo — possivelmente cache do navegador ou algo específico do ambiente dele). Por ora, a caminhada de perfil usa só `walk_side_1.png` repetido (sem alternar) pra não arriscar mostrar o ícone quebrado. Quando for gerar o frame que falta, é só voltar a lista `walk` de `left`/`right` em `main.js` pra ter os dois frames de novo.

## Faltando — movimento

- Segundo frame de caminhada de perfil (ver pendência acima — nota: essa
  seção inteira já está desatualizada, a caminhada de verdade hoje é o
  ciclo de 8 frames por direção gerado via API PixelLab, ver
  character/races.js)
- ~~Corrida~~ — feita (8 frames por direção, Shift pra ativar, mesmo
  pipeline da caminhada/ataque/idle)
- Direções diagonais (a maioria dos RPGs top-down ignora isso e reaproveita as 4 direções principais — só gerar se você quiser algo mais suave)

## Faltando — combate (esse personagem é espadachim)

- **Ataque básico (golpe de espada)** — código já pronto (`attack` é um modo de
  animação de verdade em `src/character/character.js` e
  `src/character/layers.js`, com seu próprio timer/frame-rate, igual
  idle/walk). Hoje usa o frame de idle como placeholder pro corpo (ver
  `RACES.human.frames.<direção>.attack` em `src/character/races.js`) e o
  placeholder roxo pra arma (`LAYER_DEFS.sword.<direção>.attack` em
  `src/character/layers.js`). Quando a arte real chegar (corpo + arma, por
  direção, ver plano de geração combinado com `EQUIPMENT_ASSETS_TODO.md`), é
  só substituir esses arrays — nenhuma outra mudança de código necessária.
- Ataque especial / habilidade — mesmo padrão do ataque básico, ainda não
  tem nem placeholder de dados; adicionar como um modo novo (`skill`) do
  mesmo jeito que `attack` foi adicionado.
- Recebendo dano (hit reaction) — talvez nem precise de frames novos, ver
  tabela abaixo (hoje já fazemos flash de tint no inimigo, sem arte extra)
- Esquiva
- Vitória
- Derrota/morte

### Tabela mestre — quantos frames pedir de cada animação

Baseado em pesquisa de convenção de pixel art pra RPG (ver
`RACE_EQUIPMENT_VISUAL_REFERENCES.md` seção 5) — usar como ponto de partida
na hora de escrever os prompts de geração, não como regra rígida:

| Animação | Frames sugeridos | Direções | Prioridade |
|---|---:|---|---|
| Idle | 4 | 4 (frente/costas/perfil) | já ok, não precisa refazer |
| Walk | 4-8 | 4 | já ok, não precisa refazer |
| Attack básico | 3-4 | 4 | **próxima prioridade** (código já pronto, só falta arte) |
| Hit reaction | 2-3, ou 0 (só tint de cor) | 1 (frente já cobre a maioria dos casos) | baixa — o truque de `setTintFill` que já usamos no inimigo pode bastar pro jogador também, sem gerar arte |
| Death/Defeat | 4 (se for só o boneco de treino) até 10+ (jogador) | 1 (frente) | baixa — só o jogador vale o investimento maior |
| Victory | 1-2 | 1 (frente) | baixa |
| Esquiva | 3-4 | 4 | mais baixa ainda — avaliar se o jogo precisa mesmo disso no MVP |

## Ponto de atenção pro futuro: equipamento

A arte atual já vem com a espada "desenhada" na roupa (bainha no cinto). Isso é ótimo pro MVP, mas significa que trocar de arma visualmente mais pra frente vai exigir gerar o personagem de novo por arma, a não ser que a gente separe o personagem em camadas (corpo + equipamento como peças independentes) — vale decidir isso antes de gerar muitas variações de arma.

## Depois do personagem principal

- Mesma sequência (idle + caminhada 6 frames, no mínimo) pra cada membro da tripulação, já que o combate é em grupo
- Inimigos básicos (pelo menos 1-2 pra testar combate)
