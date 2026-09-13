import Phaser from 'phaser';
import { generateShadowTexture } from '../character/character.js';
import {
  generatePlaceholderAxeTextures,
  generatePlaceholderBowTextures,
  generatePlaceholderLancaTextures,
  generatePlaceholderReinforcedRodTextures,
  generatePlaceholderRodTextures,
  generatePlaceholderWeaponTextures,
} from '../character/layers.js';
import { generatePlaceholderEnemyTexture } from '../world/enemy.js';
import { generateCursorTextures } from '../world/cursorTextures.js';
import { getPlayerState } from '../state/playerState.js';

// Roda uma vez só, ao ligar o jogo — não a cada troca de ilha (isso é
// IslandScene, ver islandScene.js). Existe só por causa de scene.textures
// ser global ao jogo inteiro, não por cena: se essas texturas fossem
// geradas dentro de IslandScene.create(), toda troca de ilha (scene.restart)
// tentaria recriar a mesma chave de textura e o Phaser avisaria (sem
// quebrar, mas sem necessidade nenhuma de gerar de novo o que já existe).
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    generateShadowTexture(this);
    generatePlaceholderWeaponTextures(this);
    generatePlaceholderRodTextures(this);
    generatePlaceholderReinforcedRodTextures(this);
    generatePlaceholderBowTextures(this);
    generatePlaceholderAxeTextures(this);
    generatePlaceholderLancaTextures(this);
    generatePlaceholderEnemyTexture(this);
    generateCursorTextures(this);
    // CursorScene roda em paralelo com a ilha (launch, não start — não pode
    // parar quando a ilha reinicia via scene.restart ao trocar de mapa,
    // senão o cursor sumiria a cada viagem). Lançada antes do start pra já
    // estar ativa no primeiro frame da ilha.
    this.scene.launch('cursor');
    this.scene.start('island', { islandId: getPlayerState().currentIslandId });
  }
}
