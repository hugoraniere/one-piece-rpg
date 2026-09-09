import { applyDamage, createHealth, isDead, resetHealth } from '../sim/health.js';
import { spawnFloatingDamage } from './floatingText.js';
import { createHpBar, setHpBarPosition, setHpBarVisible, updateHpBar } from './hpBar.js';

export const ENEMY_MAX_HP = 30;
const RESPAWN_DELAY_MS = 3000;
const HIT_FLASH_MS = 120;

// PLACEHOLDER — alvo de treino desenhado por código, não é arte de verdade
// (mesma ideia do placeholder da arma em layers.js). Só existe pra ter
// algo pra bater enquanto o combate é testado. Quando tiver arte de monstro
// de verdade, troque generatePlaceholderEnemyTexture por scene.load.image().
export function generatePlaceholderEnemyTexture(scene) {
  const size = 140;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2 + 10, 42, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  // "X" nos olhos — deixa claro que é um boneco de treino, não um monstro de verdade.
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(size / 2 - 18, size / 2 - 14);
  ctx.lineTo(size / 2 - 4, size / 2);
  ctx.moveTo(size / 2 - 4, size / 2 - 14);
  ctx.lineTo(size / 2 - 18, size / 2);
  ctx.moveTo(size / 2 + 4, size / 2 - 14);
  ctx.lineTo(size / 2 + 18, size / 2);
  ctx.moveTo(size / 2 + 18, size / 2 - 14);
  ctx.lineTo(size / 2 + 4, size / 2);
  ctx.stroke();

  scene.textures.addCanvas('enemy-placeholder', canvas);
}

// Cria o boneco de treino: sprite com física (bloqueia o jogador, mas não se
// move sozinho — sem IA ainda, ver nota no fim do arquivo) + vida + um texto
// de HP flutuando em cima.
export function createEnemy(scene, x, y) {
  const sprite = scene.physics.add.sprite(x, y, 'enemy-placeholder');
  sprite.setDepth(y);
  sprite.body.setSize(70, 70);
  sprite.body.setImmovable(true);

  const hpBar = createHpBar(scene, x, y - 70, 'Manequim');

  const enemy = {
    sprite,
    health: createHealth(ENEMY_MAX_HP),
    hpBar,
    spawnX: x,
    spawnY: y,
    respawnTimer: 0,
    flashTimer: 0,
  };
  refreshEnemyHpBar(enemy);
  return enemy;
}

function refreshEnemyHpBar(enemy) {
  updateHpBar(enemy.hpBar, enemy.health.current, enemy.health.max);
}

// Aplica dano, mostra o número flutuando e cuida da "morte" (some e volta
// depois de um tempo, pra dar pra testar o combate várias vezes sem recarregar
// a página — não é o sistema de morte/loot de verdade, só um alvo de treino).
export function damageEnemy(scene, enemy, amount) {
  if (enemy.respawnTimer > 0) return; // já "morto", esperando respawn — não acumula dano

  applyDamage(enemy.health, amount);
  refreshEnemyHpBar(enemy);
  enemy.flashTimer = HIT_FLASH_MS;
  spawnFloatingDamage(scene, enemy.sprite.x, enemy.sprite.y - 40, amount);

  if (isDead(enemy.health)) {
    enemy.sprite.setVisible(false);
    enemy.sprite.body.enable = false;
    setHpBarVisible(enemy.hpBar, false);
    enemy.respawnTimer = RESPAWN_DELAY_MS;
  }
}

export function updateEnemy(enemy, delta) {
  if (enemy.respawnTimer > 0) {
    enemy.respawnTimer -= delta;
    if (enemy.respawnTimer <= 0) {
      resetHealth(enemy.health);
      refreshEnemyHpBar(enemy);
      enemy.sprite.setPosition(enemy.spawnX, enemy.spawnY);
      enemy.sprite.setVisible(true);
      enemy.sprite.body.enable = true;
      setHpBarVisible(enemy.hpBar, true);
    }
    return;
  }

  if (enemy.flashTimer > 0) {
    enemy.flashTimer -= delta;
    enemy.sprite.setTintFill(0xffffff);
    if (enemy.flashTimer <= 0) enemy.sprite.clearTint();
  }

  setHpBarPosition(enemy.hpBar, enemy.sprite.x, enemy.sprite.y - 70);
}

// Fora de combate o boneco só fica parado (sem perseguir o jogador). O
// comportamento dele DENTRO de um combate (perseguir, atacar quando
// adjacente) mora em villageScene.js por enquanto — se isso crescer, vira
// um src/world/enemyAI.js separado, pra não misturar "como o inimigo se
// comporta" com "como vida/dano funcionam" aqui.
