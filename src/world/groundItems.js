// Itens largados no chão — descartados pelo jogador no Inventário (ver
// handleDropItem em scenes/islandScene.js) e recolhidos de volta com a
// mesma tecla G de sempre (ver handleGather — checado ANTES de
// árvore/água/caça, é a interação mais específica: se tem algo largado
// bem ali, isso sempre ganha da coleta genérica).
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
// vez de exigir estado contínuo).
const SPREAD_PX = 18;

export function spawnGroundItem(scene, itemId, qty, x, y) {
  const def = ITEM_DEFS[itemId];
  const spawnX = x + (Math.random() - 0.5) * SPREAD_PX;
  const spawnY = y + (Math.random() - 0.5) * SPREAD_PX;

  const shadow = scene.add.ellipse(0, 12, 24, 11, 0x000000, 0.35);
  // Badge de fundo (mesma paleta creme/madeira dos ícones de UI, ver
  // hud.css) — sem isso o emoji sozinho ficava ilegível na câmera com
  // CAMERA_ZOOM 0.5 (tudo na tela renderiza pela metade do tamanho):
  // testado direto no jogo, um emoji de ~22px virava ~11px na tela e
  // sumia contra terrenos de cor parecida (areia, principalmente).
  const badge = scene.add.circle(0, 0, 19, 0xe8d9b0, 1);
  badge.setStrokeStyle(3, 0x3b2415, 1);
  const icon = scene.add.text(0, 0, def.icon, { font: '26px sans-serif' });
  icon.setOrigin(0.5, 0.5);
  const children = [shadow, badge, icon];

  if (qty > 1) {
    const qtyBadge = scene.add.text(11, 10, `x${qty}`, {
      font: 'bold 11px monospace',
      color: '#f5ebc8',
      backgroundColor: '#241a12',
      padding: { x: 2, y: 1 },
    });
    qtyBadge.setOrigin(0, 0);
    children.push(qtyBadge);
  }

  const container = scene.add.container(spawnX, spawnY, children);
  container.setDepth(spawnY);

  // Balanço sutil — a única pista visual de "isso é pegável", já que não
  // existe (ainda) nenhum prompt de UI tipo "aperte G" no resto do jogo
  // (coleta de árvore/água também não tem, ver handleGather).
  scene.tweens.add({
    targets: icon,
    y: -4,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  });

  const entry = { itemId, qty, x: spawnX, y: spawnY, container };
  scene.groundItems.push(entry);
  return entry;
}

export function removeGroundItem(scene, entry) {
  entry.container.destroy();
  const i = scene.groundItems.indexOf(entry);
  if (i !== -1) scene.groundItems.splice(i, 1);
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
