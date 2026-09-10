// Inventário real — contagem de itens por id, nada de Phaser/UI aqui (ver
// ui/inventoryMenu.js pra onde isso vira tela). Substitui o array decorativo
// que existia antes em inventoryMenu.js.

export function createInventory(startingItems = {}) {
  return { items: { ...startingItems } };
}

export function getQuantity(inventory, itemId) {
  return inventory.items[itemId] || 0;
}

export function hasItem(inventory, itemId, qty = 1) {
  return getQuantity(inventory, itemId) >= qty;
}

export function addItem(inventory, itemId, qty = 1) {
  inventory.items[itemId] = getQuantity(inventory, itemId) + qty;
}

// Retorna false sem mudar nada se não tiver quantidade suficiente — quem
// chama decide o que fazer (crafting.js usa isso pra não consumir metade
// dos ingredientes de uma receita que não pode ser feita).
export function removeItem(inventory, itemId, qty = 1) {
  const current = getQuantity(inventory, itemId);
  if (current < qty) return false;
  const next = current - qty;
  if (next <= 0) delete inventory.items[itemId];
  else inventory.items[itemId] = next;
  return true;
}
