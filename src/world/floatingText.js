// Texto flutuando e sumindo — usado pra dano e pra avisos de progressão
// (subiu de nível). Mesma animação pros dois, só muda o texto/cor.
//
// Dois ajustes em cima da versão original (ver conversa de design —
// "muito rápidas e invisíveis"):
//   - `activeCount` desloca cada texto novo um pouco mais acima do que o
//     anterior enquanto ainda houver algum na tela, pra dois nascendo quase
//     juntos (ex: pescou + subiu de nível) não ficarem exatamente um em
//     cima do outro.
//   - a duração escala com o tamanho da mensagem — "+8 Berries" continua
//     rápido, mas uma frase tipo "Não achou nada pra caçar." fica tempo
//     real de leitura em vez dos mesmos 600ms fixos.
let activeCount = 0;

function spawnFloatingText(scene, x, y, message, color, size) {
  const startY = y - activeCount * 20;
  const duration = Math.min(1400, 600 + Math.max(0, message.length - 10) * 25);

  const text = scene.add.text(x, startY, message, {
    font: `bold ${size}px monospace`,
    color,
  });
  text.setOrigin(0.5, 0.5);
  text.setDepth(9001);
  activeCount += 1;
  scene.tweens.add({
    targets: text,
    y: startY - 40,
    alpha: 0,
    duration,
    ease: 'Cubic.out',
    onComplete: () => {
      text.destroy();
      activeCount = Math.max(0, activeCount - 1);
    },
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
