// Estado de vida — sem nenhuma dependência de Phaser/sprite. Usado tanto
// pelo jogador quanto por qualquer inimigo.
export function createHealth(max) {
  return { max, current: max };
}

export function applyDamage(health, amount) {
  health.current = Math.max(0, health.current - amount);
  return health.current;
}

export function isDead(health) {
  return health.current <= 0;
}

export function resetHealth(health) {
  health.current = health.max;
}
