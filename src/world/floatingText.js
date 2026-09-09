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
