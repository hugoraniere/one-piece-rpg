import { COMBAT_TILE_SIZE } from '../config.js';

// Grade lógica usada só durante o combate — fora de combate o mundo
// continua sendo 100% movimento livre em pixels (ver ENCOUNTER_TRIGGER_RANGE
// em config.js). Nenhuma função aqui depende de Phaser; quem sabe o que
// está bloqueado no mundo real é src/world/combatGrid.js.

export function worldToTile(x, y) {
  return { col: Math.floor(x / COMBAT_TILE_SIZE), row: Math.floor(y / COMBAT_TILE_SIZE) };
}

export function tileToWorld(col, row) {
  return { x: col * COMBAT_TILE_SIZE + COMBAT_TILE_SIZE / 2, y: row * COMBAT_TILE_SIZE + COMBAT_TILE_SIZE / 2 };
}

function tileKey(col, row) {
  return `${col},${row}`;
}

// Distância "de rei de xadrez" — diagonal conta como 1 passo só, igual ao
// movimento 8-direcional usado aqui (é assim que D&D 5e/BG3 medem alcance).
export function tileDistance(a, b) {
  return Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
}

const NEIGHBOR_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// BFS: todos os tiles alcançáveis em até `maxSteps` passos a partir de
// `start`, sem passar por tiles bloqueados. `isBlocked(col,row)` é fornecido
// por quem chama porque só a cena sabe o que tem colisão no mundo real
// (props, água, o outro combatente, os limites do mapa).
export function reachableTiles(start, maxSteps, isBlocked) {
  const startKey = tileKey(start.col, start.row);
  const visited = new Map([[startKey, 0]]);
  const queue = [start];

  while (queue.length > 0) {
    const current = queue.shift();
    const steps = visited.get(tileKey(current.col, current.row));
    if (steps >= maxSteps) continue;

    for (const [dc, dr] of NEIGHBOR_OFFSETS) {
      const next = { col: current.col + dc, row: current.row + dr };
      const key = tileKey(next.col, next.row);
      if (visited.has(key) || isBlocked(next.col, next.row)) continue;
      visited.set(key, steps + 1);
      queue.push(next);
    }
  }

  visited.delete(startKey); // não inclui o próprio tile de partida
  return Array.from(visited.keys()).map((key) => {
    const [col, row] = key.split(',').map(Number);
    return { col, row };
  });
}
