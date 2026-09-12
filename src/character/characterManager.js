// ✨ NOVO: Gerenciador escalável de personagem com outfit/layers
// Encapsula a lógica de troca de roupa e equipamento

import { OUTFITS, preloadOutfitAssets } from './outfits.js';
import { LAYERS, preloadLayerAssets, resolveLayerFrame } from './layerSystem.js';
import { getPlayerState } from '../state/playerState.js';

export class CharacterManager {
  constructor(character) {
    this.character = character; // { player, shadow }
    this.outfit = 'default';
    this.layers = {}; // { mainHand: sprite, head: sprite, etc }
    this.scene = null;

    // Frame index compartilhado (sincronização de layers)
    this.frameState = {
      timer: 0,
      index: 0,
    };
  }

  setScene(scene) {
    this.scene = scene;
  }

  // Troca de outfit (roupa)
  setOutfit(outfitId) {
    const outfit = OUTFITS[outfitId];
    if (!outfit) {
      console.warn(`Outfit "${outfitId}" not found`);
      return false;
    }

    // Carrega assets
    preloadOutfitAssets(this.scene, outfitId);
    this.outfit = outfitId;

    // Reseta frame state
    this.frameState = { timer: 0, index: 0 };

    // Atualiza playerState
    const state = getPlayerState();
    state.outfit = outfitId;

    console.log(`✅ Outfit changed to: ${outfitId}`);
    return true;
  }

  // Equipa um layer (equipamento)
  equipLayer(layerId, slotName = 'mainHand') {
    const layer = LAYERS[layerId];
    if (!layer) {
      console.warn(`Layer "${layerId}" not found`);
      return false;
    }

    // Carrega assets
    preloadLayerAssets(this.scene, layerId);

    // Armazena layer info
    this.layers[slotName] = layerId;

    // Atualiza playerState
    const state = getPlayerState();
    state.equippedLayers = state.equippedLayers || {};
    state.equippedLayers[slotName] = layerId;

    console.log(`✅ Equipped ${layerId} on ${slotName}`);
    return true;
  }

  // Desequipa um layer
  unequipLayer(slotName) {
    delete this.layers[slotName];

    const state = getPlayerState();
    if (state.equippedLayers) {
      state.equippedLayers[slotName] = null;
    }

    console.log(`✅ Unequipped from ${slotName}`);
    return true;
  }

  // Debug: printa estado atual
  debugState() {
    console.log(`📊 Character State:`, {
      outfit: this.outfit,
      layers: this.layers,
      frameState: this.frameState,
    });
  }
}

// Helper global pra fácil acesso
export let characterManager = null;

export function initCharacterManager(character, scene) {
  characterManager = new CharacterManager(character);
  characterManager.setScene(scene);
  window.__characterManager = characterManager; // Para debug no console
  return characterManager;
}

export function getCharacterManager() {
  return characterManager;
}
