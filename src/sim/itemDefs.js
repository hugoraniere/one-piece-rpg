// Catálogo de itens — ícones continuam emoji por enquanto (mesmo aviso já
// existente em inventoryMenu.js: arte por-item de verdade vem depois; os
// ícones do sprite SVG são só pra UI de atributos/perícias/moodles).
//
// `equipLayerId` marca itens equipáveis, referenciando um id de
// character/layers.js#LAYER_DEFS — é o que conecta "ter o item" (aqui) com
// "aparecer no personagem" (lá).
// `isBait`/`baitTier` marcam iscas de pesca — ver sim/fishing.js pra como o
// tier vira chance de mordida.
export const ITEM_DEFS = {
  'vara-de-pescar': {
    name: 'Vara de Pescar',
    icon: '🎣',
    category: 'ferramentas',
    equipLayerId: 'vara-de-pescar',
  },
  graveto: {
    name: 'Graveto',
    icon: '🪵',
    category: 'materiais',
  },
  'linha-de-nylon': {
    name: 'Linha de Nylon',
    icon: '🧵',
    category: 'materiais',
  },
  minhoca: {
    name: 'Minhoca',
    icon: '🪱',
    category: 'materiais',
    isBait: true,
    baitTier: 2,
  },
  'isca-improvisada': {
    name: 'Isca Improvisada',
    icon: '🐛',
    category: 'materiais',
    isBait: true,
    baitTier: 1,
  },
};
