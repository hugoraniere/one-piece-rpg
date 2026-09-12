// Itens largados no chão — descartados pelo jogador no Inventário (ver
// handleDropItem em scenes/islandScene.js) e recolhidos de volta com a
// mesma tecla G de sempre (ver handleGather — checado ANTES de
// árvore/água/caça, é a interação mais específica: se tem algo largado
// bem ali, isso sempre ganha da coleta genérica).
//
// Referência de UX pedida: Baldur's Gate 3 / Project Zomboid — nos dois,
// pegar um item no chão é uma ação contida (chega perto, o jogo destaca
// o item e mostra o nome, você interage, item some), NÃO um efeito
// vistoso de moeda voando até o personagem (isso é linguagem de jogo
// arcade/mobile, destoa do tom do resto do jogo). Aqui: badge muda de cor
// e o nome aparece quando o jogador entra no alcance (mesmo estilo do
// nameText de world/hpBar.js), e o "apanhar" é só um levantar+sumir no
// próprio lugar — sem viajar pela tela.
//
// Sem física/grupo do Phaser — todo o resto do mundo (árvore, água,
// barco, mercado, boneco de treino) já resolve proximidade com
// Phaser.Math.Distance.Between contra uma lista de posições, não com
// corpos físicos colidindo; isso só segue o mesmo padrão. `scene.
// groundItems` é um array solto na própria cena (mesmo espírito de
// `scene.treePositions`), recriado do zero a cada create() — sem
// persistência entre troca de ilha ou reload (ver comentário no fim).
import Phaser from 'phaser';
import { ITEM_DEFS } from '../sim/itemDefs.js';

export const PICKUP_RANGE = 50; // pixels — bem apertado, precisa chegar quase em cima

// Espalha um pouco a posição de dois descartes seguidos no mesmo lugar,
// pra não nascerem exatamente empilhados (mesmo problema que
// floatingText.js resolve pra texto, aqui resolvido na hora do spawn em
// vez de exigir estado contínuo). Maior que o raio do badge (ver
// BADGE_RADIUS abaixo) pra dois itens grandes não nascerem sobrepostos.
const SPREAD_PX = 30;

// Tamanho calibrado pro CAMERA_ZOOM 0.5 do jogo (ver config.js) — tudo na
// tela renderiza pela metade do tamanho de verdade, então um badge "de
// UI" normal (uns 20px) virava quase invisível contra terrenos de cor
// parecida (achado em revisão visual: sumia contra areia). Estes valores
// foram calibrados testando direto no jogo até ficar claramente legível.
const BADGE_RADIUS = 27;
const ICON_FONT_PX = 36;

const COLOR_NORMAL = 0x3b2415; // borda marrom escura padrão (mesma paleta de UI do jogo)
const COLOR_HIGHLIGHT = 0xe6c66e; // dourado — mesma cor de "isso é notável" já usada (level-up, ponto do minimapa)

export function spawnGroundItem(scene, itemId, qty, x, y) {
  const def = ITEM_DEFS[itemId];
  const spawnX = x + (Math.random() - 0.5) * SPREAD_PX;
  const spawnY = y + (Math.random() - 0.5) * SPREAD_PX;

  const shadow = scene.add.ellipse(0, 16, 34, 15, 0x000000, 0.35);
  const badge = scene.add.circle(0, 0, BADGE_RADIUS, 0xe8d9b0, 1);
  badge.setStrokeStyle(4, COLOR_NORMAL, 1);
  const icon = scene.add.text(0, 0, def.icon, { font: `${ICON_FONT_PX}px sans-serif` });
  icon.setOrigin(0.5, 0.5);
  const children = [shadow, badge, icon];

  let qtyBadge = null;
  if (qty > 1) {
    qtyBadge = scene.add.text(16, 14, `x${qty}`, {
      font: 'bold 13px monospace',
      color: '#f5ebc8',
      backgroundColor: '#241a12',
      padding: { x: 3, y: 1 },
    });
    qtyBadge.setOrigin(0, 0);
    children.push(qtyBadge);
  }

  // Nome do item — mesmo estilo do nameText de world/hpBar.js (rótulo
  // flutuante consistente em qualquer coisa "no mundo" que precisa se
  // identificar). Só aparece quando o jogador entra no alcance de
  // apanhar (ver updateGroundItemHighlights) — igual ao "destacar item
  // por perto" de BG3/Project Zomboid, não fica poluindo a tela o tempo
  // todo.
  const nameLabel = scene.add.text(0, -BADGE_RADIUS - 8, def.name, {
    font: '10px Arial',
    color: '#ffffff',
    backgroundColor: '#000000aa',
    padding: { x: 4, y: 1 },
  });
  nameLabel.setOrigin(0.5, 1);
  nameLabel.setVisible(false);
  children.push(nameLabel);

  const container = scene.add.container(spawnX, spawnY, children);
  container.setDepth(spawnY);

  // Nasce com um "pop" (cresce de 0 até o tamanho normal) em vez de
  // simplesmente aparecer — reforça que é um objeto novo no mundo, não
  // decoração que sempre esteve ali.
  container.setScale(0);
  scene.tweens.add({
    targets: container,
    scale: 1,
    duration: 220,
    ease: 'Back.easeOut',
  });

  // Balanço contínuo do ÍCONE — a pista visual "ambiente" de que isso é
  // pegável, mesmo fora de alcance (o destaque dourado + nome, por outro
  // lado, só aparecem DENTRO do alcance — ver updateGroundItemHighlights).
  const bobTween = scene.tweens.add({
    targets: icon,
    y: -4,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  });

  const entry = { itemId, qty, x: spawnX, y: spawnY, container, badge, nameLabel, bobTween, pulseTween: null, inRange: false };
  scene.groundItems.push(entry);
  return entry;
}

// Chamada todo frame (ver update() em islandScene.js) — liga/desliga o
// destaque de "dá pra apanhar agora" conforme o jogador entra/sai do
// alcance de cada item. Só mexe em alguma coisa quando o estado realmente
// MUDA (entra['inRange'] como cache) — recriar tween/trocar cor a cada
// frame seria desperdício e reiniciaria a animação de pulso sem parar.
export function updateGroundItemHighlights(scene) {
  for (const entry of scene.groundItems) {
    const inRange = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, entry.x, entry.y) <= PICKUP_RANGE;
    if (inRange === entry.inRange) continue;
    entry.inRange = inRange;
    entry.nameLabel.setVisible(inRange);

    if (inRange) {
      entry.badge.setStrokeStyle(4, COLOR_HIGHLIGHT, 1);
      entry.pulseTween = scene.tweens.add({
        targets: entry.badge,
        scale: 1.12,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    } else {
      entry.pulseTween?.stop();
      entry.pulseTween = null;
      entry.badge.setStrokeStyle(4, COLOR_NORMAL, 1);
      entry.badge.setScale(1);
    }
  }
}

// Remoção instantânea, sem animação — usada por collectGroundItem no
// final da própria animação de coleta. Fica exportada separada (em vez
// de só uma função interna) porque é o utilitário certo pra um despawn
// silencioso no futuro (ex: limite de itens no chão, expiração por
// tempo), que collectGroundItem não serve.
export function removeGroundItem(scene, entry) {
  entry.bobTween?.stop();
  entry.pulseTween?.stop();
  entry.container.destroy();
  const i = scene.groundItems.indexOf(entry);
  if (i !== -1) scene.groundItems.splice(i, 1);
}

// Animação de "apanhar" — contida de propósito (ver comentário no topo
// do arquivo): o item sobe um pouco e some no próprio lugar, sem viajar
// pela tela até o jogador. Remove da lista de coletáveis JÁ NO INÍCIO
// (não só quando a animação termina) — sem isso, dois "G" rápidos
// durante os ~220ms de animação coletariam o mesmo item duas vezes.
const PICKUP_ANIM_MS = 220;

export function collectGroundItem(scene, entry) {
  const i = scene.groundItems.indexOf(entry);
  if (i !== -1) scene.groundItems.splice(i, 1);
  entry.bobTween?.stop();
  entry.pulseTween?.stop();

  const { container } = entry;
  container.setDepth(99999); // por cima de tudo durante o gesto, mesmo se o jogador estiver "na frente" dele
  scene.tweens.add({
    targets: container,
    y: container.y - 16,
    scale: 1.15,
    alpha: 0,
    duration: PICKUP_ANIM_MS,
    ease: 'Cubic.easeOut',
    onComplete: () => container.destroy(),
  });
}

// O mais próximo dentro do alcance, ou null. Alcance bem menor que
// GATHER_TREE_RANGE de propósito — coleta de árvore/água é "por perto
// dela", pegar um item largado é "encostar nele", senão ficaria fácil
// demais varrer vários itens sem se aproximar de cada um.
export function findNearestGroundItem(scene, x, y, range = PICKUP_RANGE) {
  let nearest = null;
  let nearestDist = Infinity;
  for (const entry of scene.groundItems) {
    const dist = Phaser.Math.Distance.Between(x, y, entry.x, entry.y);
    if (dist <= range && dist < nearestDist) {
      nearest = entry;
      nearestDist = dist;
    }
  }
  return nearest;
}
