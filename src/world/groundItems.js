// Itens largados no chão — descartados pelo jogador no Inventário (ver
// handleDropItem em scenes/islandScene.js) e recolhidos de volta via a
// caixa de itens próximos (ver ui/nearbyLootPanel.js: aparece sozinha
// quando o jogador chega perto, clique num item da lista apanha ele) ou
// pela tecla G, que continua apanhando o mais próximo direto — a caixa é
// a forma "escolher qual", G é o atalho "só pega o mais perto".
//
// Referência de UX pedida: Baldur's Gate 3 / Project Zomboid — nos dois,
// pegar um item no chão é uma ação contida (chega perto, o jogo destaca o
// item, você interage por uma lista/menu, item some), NÃO um efeito
// vistoso de moeda voando até o personagem (isso é linguagem de jogo
// arcade/mobile, destoa do tom do resto do jogo). Aqui: sem nenhum
// círculo/badge de fundo (achado em revisão: competia com o ícone em vez
// de ajudar) — só o emoji do item, grande, com sombra embaixo pra
// ancorar no chão. O "apanhar" é um levantar+sumir no próprio lugar, sem
// viajar pela tela.
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

export const PICKUP_RANGE = 60; // pixels — um pouco maior que antes: agora é o raio que faz a caixa de itens próximos aparecer, não só o alcance "encostado" do G

// Espalha um pouco a posição de dois descartes seguidos no mesmo lugar,
// pra não nascerem exatamente empilhados (mesmo problema que
// floatingText.js resolve pra texto, aqui resolvido na hora do spawn em
// vez de exigir estado contínuo).
const SPREAD_PX = 26;

// Tamanho calibrado pro CAMERA_ZOOM 0.5 do jogo (ver config.js) — tudo na
// tela renderiza pela metade do tamanho de verdade. Sem círculo de fundo
// agora, o ícone sozinho precisa carregar toda a legibilidade — maior que
// antes de propósito.
const ICON_FONT_PX = 50;

let nextUid = 1;

export function spawnGroundItem(scene, itemId, qty, x, y) {
  const def = ITEM_DEFS[itemId];
  const spawnX = x + (Math.random() - 0.5) * SPREAD_PX;
  const spawnY = y + (Math.random() - 0.5) * SPREAD_PX;

  const shadow = scene.add.ellipse(0, 20, 30, 12, 0x000000, 0.35);
  const icon = scene.add.text(0, 0, def.icon, { font: `${ICON_FONT_PX}px sans-serif` });
  icon.setOrigin(0.5, 0.5);
  const children = [shadow, icon];

  let qtyBadge = null;
  if (qty > 1) {
    qtyBadge = scene.add.text(18, 16, `x${qty}`, {
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
  // identificar). Só aparece quando o jogador entra no alcance — a caixa
  // de itens próximos (ui/nearbyLootPanel.js) já mostra o nome de todos
  // de uma vez, mas esse rótulo aqui ajuda a identificar QUAL sprite no
  // chão é qual item antes mesmo de abrir/olhar a caixa.
  const nameLabel = scene.add.text(0, -ICON_FONT_PX / 2 - 10, def.name, {
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
  // pegável, mesmo fora de alcance (o pulso de escala do container,
  // separado, só liga DENTRO do alcance — ver updateGroundItemHighlights).
  const bobTween = scene.tweens.add({
    targets: icon,
    y: -5,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  });

  const entry = {
    uid: nextUid++,
    itemId,
    qty,
    x: spawnX,
    y: spawnY,
    container,
    icon,
    nameLabel,
    bobTween,
    pulseTween: null,
    inRange: false,
  };
  scene.groundItems.push(entry);
  return entry;
}

// Chamada todo frame (ver update() em islandScene.js) — liga/desliga o
// destaque de "dá pra apanhar agora" conforme o jogador entra/sai do
// alcance de cada item. Só mexe em alguma coisa quando o estado realmente
// MUDA (entry.inRange como cache) — reprocessar a cada frame reiniciaria
// a animação de pulso sem parar.
export function updateGroundItemHighlights(scene) {
  for (const entry of scene.groundItems) {
    const inRange = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, entry.x, entry.y) <= PICKUP_RANGE;
    if (inRange === entry.inRange) continue;
    entry.inRange = inRange;
    entry.nameLabel.setVisible(inRange);

    if (inRange) {
      entry.pulseTween = scene.tweens.add({
        targets: entry.icon,
        scale: 1.15,
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    } else {
      entry.pulseTween?.stop();
      entry.pulseTween = null;
      entry.icon.setScale(1);
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
// (não só quando a animação termina) — sem isso, um clique na caixa de
// itens próximos e um G quase simultâneos coletariam o mesmo item duas
// vezes durante os ~220ms de animação.
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

// O mais próximo dentro do alcance, ou null — usado pelo atalho da tecla
// G (pega o mais perto direto, sem precisar abrir a caixa de itens
// próximos).
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

// TODOS dentro do alcance, mais perto primeiro — usado pela caixa de
// itens próximos (ver ui/nearbyLootPanel.js) pra listar tudo que dá pra
// escolher, não só o mais perto.
export function findNearbyGroundItems(scene, x, y, range = PICKUP_RANGE) {
  return scene.groundItems
    .map((entry) => ({ entry, dist: Phaser.Math.Distance.Between(x, y, entry.x, entry.y) }))
    .filter(({ dist }) => dist <= range)
    .sort((a, b) => a.dist - b.dist)
    .map(({ entry }) => entry);
}
