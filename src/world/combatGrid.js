import { COMBAT_TILE_SIZE } from '../config.js';
import { tileToWorld } from '../sim/grid.js';

// Um tile está bloqueado se qualquer corpo físico estático ocupar aquela
// célula — reaproveita exatamente a mesma física já registrada pra colisão
// no mundo livre (props com colisão, água, o boneco de treino), então a
// grade nunca fica dessincronizada do que já bloqueia o jogador lá fora.
// `ignoreBody` é o corpo de quem está se movendo (não pode ser bloqueado
// pelo próprio corpo).
export function isTileBlocked(scene, col, row, ignoreBody) {
  const { x, y } = tileToWorld(col, row);
  const half = COMBAT_TILE_SIZE / 2;
  const bodies = scene.physics.overlapRect(x - half, y - half, COMBAT_TILE_SIZE, COMBAT_TILE_SIZE, true, true);
  return bodies.some((body) => body !== ignoreBody);
}

export function createTileHighlight(scene) {
  const graphics = scene.add.graphics();
  graphics.setDepth(8000);
  return graphics;
}

export function drawTileHighlight(graphics, tiles, color) {
  graphics.clear();
  graphics.fillStyle(color, 0.35);
  const half = COMBAT_TILE_SIZE / 2;
  tiles.forEach(({ col, row }) => {
    const { x, y } = tileToWorld(col, row);
    graphics.fillRect(x - half, y - half, COMBAT_TILE_SIZE, COMBAT_TILE_SIZE);
  });
}

export function clearTileHighlight(graphics) {
  graphics.clear();
}
