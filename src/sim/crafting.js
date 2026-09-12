// Motor de crafting — sem Phaser/UI aqui (ver ui/inventoryMenu.js pra aba
// "Fabricar"). Uma receita só por enquanto: a vara de pescar. Novas receitas
// futuras (culinária, ferraria, ...) são só mais entradas neste array.
import { addItem, hasItem, removeItem } from './inventory.js';

export const RECIPES = [
  {
    id: 'vara-de-pescar',
    inputs: [
      { itemId: 'graveto', qty: 1 },
      { itemId: 'linha-de-nylon', qty: 1 },
    ],
    output: { itemId: 'vara-de-pescar', qty: 1 },
  },
  {
    id: 'arco',
    inputs: [
      { itemId: 'graveto', qty: 2 },
      { itemId: 'corda', qty: 1 },
    ],
    output: { itemId: 'arco', qty: 1 },
  },
  {
    id: 'machado',
    inputs: [
      { itemId: 'graveto', qty: 1 },
      { itemId: 'ferro-bruto', qty: 1 },
    ],
    output: { itemId: 'machado', qty: 1 },
  },
  {
    id: 'vara-reforcada',
    inputs: [
      { itemId: 'graveto', qty: 2 },
      { itemId: 'linha-de-nylon', qty: 1 },
      { itemId: 'ferro-bruto', qty: 1 },
    ],
    output: { itemId: 'vara-reforcada', qty: 1 },
  },
  {
    id: 'lanca',
    inputs: [
      { itemId: 'graveto', qty: 2 },
      { itemId: 'ferro-bruto', qty: 1 },
    ],
    output: { itemId: 'lanca', qty: 1 },
  },
];

export function canCraft(inventory, recipe) {
  return recipe.inputs.every((input) => hasItem(inventory, input.itemId, input.qty));
}

// Retorna false sem mudar nada se faltar ingrediente — checa tudo ANTES de
// remover qualquer coisa, pra nunca consumir metade de uma receita que não
// pode ser completada.
export function craft(inventory, recipe) {
  if (!canCraft(inventory, recipe)) return false;
  recipe.inputs.forEach((input) => removeItem(inventory, input.itemId, input.qty));
  addItem(inventory, recipe.output.itemId, recipe.output.qty);
  return true;
}
