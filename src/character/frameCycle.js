// Avança um "índice de frame que troca a cada X ms" dado um objeto de
// estado próprio (timer + índice). Usado tanto pelo corpo do personagem
// quanto por cada camada de equipamento — cada um com seu PRÓPRIO objeto de
// estado, nunca compartilhado, senão trocariam de frame fora de sincronia
// assim que tivessem contagens de frame diferentes entre si.
export function advanceFrame(state, timerKey, indexKey, frames, frameDurationMs, delta) {
  if (frames.length <= 1) {
    state[timerKey] = 0;
    state[indexKey] = 0;
    return frames[0];
  }

  state[timerKey] += delta;
  if (state[timerKey] >= frameDurationMs) {
    state[timerKey] -= frameDurationMs;
    state[indexKey] = (state[indexKey] + 1) % frames.length;
  }
  // % de novo aqui — se trocar de direção com um índice "alto" (ex: parou no
  // frame 3 de 4 e virou pra uma direção com só 2 frames), sem isso ia
  // tentar ler um frame que não existe nesse array menor.
  return frames[state[indexKey] % frames.length];
}

// Dado o conjunto de frames de uma direção (idle/walk/run/attack + seus
// flips opcionais) e o modo atual, resolve qual array de frames usar e se
// deve espelhar. Compartilhado entre character.js e layers.js pra não
// duplicar essa mesma decisão nos dois lugares — se `attack` não existir
// ainda numa raça/camada, cai pro idle (placeholder até a arte de ataque
// chegar); do mesmo jeito, se `run` não existir (caso das camadas de
// equipamento — a arma não precisa de uma pose de "correndo" própria,
// só acompanha o corpo), cai pro walk.
export function resolveModeFrames(frameSet, mode) {
  if (mode === 'run') return { frames: frameSet.run ?? frameSet.walk, flip: frameSet.runFlip ?? !!frameSet.walkFlip };
  if (mode === 'walk') return { frames: frameSet.walk, flip: !!frameSet.walkFlip };
  if (mode === 'attack') return { frames: frameSet.attack ?? frameSet.idle, flip: frameSet.attackFlip ?? !!frameSet.idleFlip };
  return { frames: frameSet.idle, flip: !!frameSet.idleFlip };
}
