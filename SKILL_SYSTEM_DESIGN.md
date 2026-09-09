# Sistema de skills — estrutura de dados proposta (design, sem código ainda)

Este documento é só o desenho da estrutura, pra revisar antes de implementar
em `src/sim/` e `src/character/`. Nenhum arquivo `.js` foi criado ou
alterado — é a continuação natural do `attack` que já existe como modo de
animação (ver `CHARACTER_ASSETS_TODO.md` e `EQUIPMENT_ASSETS_TODO.md`).

## Por que basear em pesquisa de RPG tático

O combate do jogo já é por grade/turnos (`src/sim/grid.js`,
`COMBAT_MOVE_RANGE`, `COMBAT_ATTACK_RANGE` em `config.js`), então o padrão
mais próximo não é ARPG de ação, é RPG tático (Fire Emblem, Tactics Ogre,
etc.) — pesquisa confirmou o formato comum de dado pra habilidade nesse
gênero: **alcance (range) separado de área de efeito (shape), custo,
cooldown e efeito**, com hierarquia de poder: ataque básico (grátis, sem
cooldown) → habilidade de classe (custo médio, 2-4 turnos de cooldown) →
habilidade definitiva (custo alto, cooldown longo).

Fonte: [theliquidfire.com/tactics-rpg-ability-range](https://theliquidfire.com/2015/08/24/tactics-rpg-ability-range/), [theliquidfire.com/tactics-rpg-ability-area-of-effect](http://theliquidfire.com/2015/08/31/tactics-rpg-ability-area-of-effect/)

## Campos propostos por skill

| Campo | Tipo | Exemplo | Observação |
|---|---|---|---|
| `id` | string | `'sword-thrust'` | chave única |
| `name` | string | `'Investida'` | nome exibido |
| `weaponFamily` | string \| `'any'` | `'sword-1h'` | qual família de arma pode usar (ver `RACE_EQUIPMENT_VISUAL_REFERENCES.md` seção 8) — `'any'` pra skills que não dependem de arma |
| `range` | number (tiles) | `1` | alcance a partir do personagem, mesma unidade de `COMBAT_ATTACK_RANGE` |
| `areaShape` | `'single'` \| `'line'` \| `'cone'` \| `'blast'` | `'single'` | `single` = só o alvo clicado (é o que `performPlayerAttack` já faz hoje) |
| `areaSize` | number | `0` | raio/comprimento adicional quando `areaShape` != `single` |
| `damage` | number | `10` | mesmo padrão de `COMBAT_ATTACK_DAMAGE` |
| `cooldownTurns` | number | `0` | 0 = sem cooldown (ataque básico); skills de classe começam em 2-4 |
| `cost` | number \| `null` | `null` | fica `null` até existir sistema de recurso (mana/stamina) — não inventar isso agora |
| `animationKey` | string | `'attack'` ou `'skill-thrust'` | qual conjunto de frames tocar (ver seção "Encaixe com o que já existe") |

## Exemplo concreto (ainda hipotético, não implementar já)

```
{
  id: 'sword-thrust',
  name: 'Investida',
  weaponFamily: 'sword-1h',
  range: 1,
  areaShape: 'single',
  areaSize: 0,
  damage: 15,
  cooldownTurns: 3,
  cost: null,
  animationKey: 'skill-thrust',
}
```

Isso é literalmente "o ataque básico atual, só que mais forte e com
cooldown" — é de propósito: a PRIMEIRA skill deveria ser a mais parecida
possível com o que já funciona (`performPlayerAttack` em
`villageScene.js`), só adicionando a checagem de cooldown. Prova o sistema
sem exigir animação/lógica nova de área.

## Encaixe com o que já existe (sem mudar nada ainda)

- `performPlayerAttack` (em `villageScene.js`) já faz: seta `isAttacking`,
  aplica dano, passa o turno. Uma skill com `areaShape: 'single'` é
  literalmente o mesmo fluxo + checagem de cooldown antes de permitir o
  clique.
- `currentAnimMode()` já retorna `'attack'` com prioridade sobre
  walk/idle — uma skill nova só precisaria de mais um modo (`'skill'`) no
  mesmo padrão, com seu próprio `attackFrameMs`-equivalente se o timing for
  diferente.
- `areaShape` além de `single` (line/cone/blast) não tem consumidor ainda —
  não implementar até a primeira skill de área ser decidida de verdade
  (mirar em quê? highlight de quê? `combatGrid.js` precisaria desenhar a
  área prevista antes do clique, hoje só desenha alcance de movimento).

## Não escopo (fora desta rodada de design)

- Sistema de recurso (mana/stamina) — `cost` fica reservado mas não usado.
- IA de inimigo escolhendo skills — hoje o inimigo só anda+bate
  (`runEnemyTurn`); dar skill pra inimigo é overkill antes do jogador ter
  mais de uma.
- Árvore de habilidades / progressão — isso é sistema de personagem, não de
  combate; fica pra depois de ter pelo meno 2-3 skills funcionando.

## Próximo passo sugerido (quando formos codar, não agora)

1. Implementar só `sword-thrust` (a mais parecida com o ataque atual) como
   prova de conceito do campo `cooldownTurns`.
2. Só depois disso, decidir a primeira skill de área de verdade (aí sim
   `combatGrid.js` precisa aprender a desenhar área prevista, não só
   alcance de movimento).
