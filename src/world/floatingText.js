// Texto flutuando e sumindo — usado pra dano e pra avisos de progressão
// (subiu de nível). Mesma animação pros dois, só muda o texto/cor.
function spawnFloatingText(scene, x, y, message, color, size) {
  const text = scene.add.text(x, y, message, {
    font: `bold ${size}px monospace`,
    color,
  });
  text.setOrigin(0.5, 0.5);
  text.setDepth(9001);
  scene.tweens.add({
    targets: text,
    y: y - 40,
    alpha: 0,
    duration: 600,
    ease: 'Cubic.out',
    onComplete: () => text.destroy(),
  });
}

export function spawnFloatingDamage(scene, x, y, amount) {
  spawnFloatingText(scene, x, y, `-${amount}`, '#fde047', 16);
}

// Aviso de "subiu de nível" (perícia ou atributo) — ver sim/progression.js.
// Cor dourada pra destacar de dano (amarelo) e diferenciar visualmente.
export function spawnLevelUpText(scene, x, y, label) {
  spawnFloatingText(scene, x, y, `${label} ↑`, '#e6c66e', 14);
}

// Dinheiro ganho (pesca, futuras fontes de renda) — verde, bem distinto de
// dano (amarelo) e de nível (dourado).
export function spawnMoneyText(scene, x, y, amount) {
  spawnFloatingText(scene, x, y, `+${amount} Berries`, '#8fd19e', 14);
}

// Tentativa que não rendeu nada (peixe escapou, etc.) — tom neutro/apagado,
// pra não parecer dano nem recompensa.
export function spawnMissText(scene, x, y, message) {
  spawnFloatingText(scene, x, y, message, '#b3a488', 13);
}

// Item ganho por coleta (graveto, isca, minhoca) — mesmo verde de dinheiro
// (é renda também, só que em item em vez de Berries).
export function spawnItemText(scene, x, y, message) {
  spawnFloatingText(scene, x, y, message, '#8fd19e', 13);
}
