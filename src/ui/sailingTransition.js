import { getPlayerState } from '../state/playerState.js';

export const FADE_MS = 400;

// Viagem entre ilhas — SEMPRE passa por aqui (menu de mapa e o barco em
// islandScene.js, nunca um scene.restart direto), pra fade + persistência de
// estado nunca ficarem esquecidos num call-site novo. `destinationId` pode
// ser a própria ilha atual (não é um erro) — é assim que o marco 3 do plano
// testa o pipeline inteiro (fade + restart + estado intacto) antes de
// existir uma segunda ilha de verdade pra viajar.
export function travelToIsland(scene, destinationId) {
  const previousIslandId = scene.islandConfig.id;
  scene.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
  scene.cameras.main.once('camerafadeoutcomplete', () => {
    const state = getPlayerState();
    state.currentIslandId = destinationId;
    if (!state.discoveredIslands.includes(destinationId)) {
      state.discoveredIslands.push(destinationId);
    }
    // IslandScene.create() termina com um fadeIn (ver islandScene.js) —
    // simétrico com este fadeOut, então a troca nunca "pisca" pro branco/
    // preto sólido entre uma ilha e outra. `arrivedByBoat` é só pra
    // IslandScene.create() saber treinar Navegação (ver menuData.js, que
    // até aqui dizia "sem travessia marítima ainda") sem precisar importar
    // nada daqui pra lá (evita ciclo de import entre os dois módulos).
    scene.scene.restart({ islandId: destinationId, arrivedByBoat: true, previousIslandId });
  });
}
