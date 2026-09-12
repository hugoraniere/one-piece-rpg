// Catálogo de itens — ícones continuam emoji por enquanto (mesmo aviso já
// existente em inventoryMenu.js: arte por-item de verdade vem depois; os
// ícones do sprite SVG são só pra UI de atributos/perícias/moodles).
//
// `equipLayerId` marca itens equipáveis, referenciando um id de
// character/layers.js#LAYER_DEFS — é o que conecta "ter o item" (aqui) com
// "aparecer no personagem" (lá).
// `isBait`/`baitTier` marcam iscas de pesca — ver sim/fishing.js pra como o
// tier vira chance de mordida.
// `sellPrice` marca item vendável no mercado de Portomares (ver
// handleSell em scenes/islandScene.js) — Berries por unidade.
export const ITEM_DEFS = {
  'vara-de-pescar': {
    name: 'Vara de Pescar',
    icon: '🎣',
    category: 'ferramentas',
    equipLayerId: 'vara-de-pescar',
  },
  'vara-reforcada': {
    name: 'Vara Reforçada',
    icon: '🎏',
    category: 'ferramentas',
    equipLayerId: 'vara-reforcada',
  },
  arco: {
    name: 'Arco Curto',
    icon: '🏹',
    category: 'armas',
    equipLayerId: 'arco',
  },
  lanca: {
    name: 'Lança de Caça',
    icon: '🔱',
    category: 'armas',
    equipLayerId: 'lanca',
  },
  machado: {
    name: 'Machado de Lenhador',
    icon: '🪓',
    category: 'ferramentas',
    equipLayerId: 'machado',
  },
  graveto: {
    name: 'Graveto',
    icon: '🪵',
    category: 'materiais',
  },
  corda: {
    name: 'Corda Trançada',
    icon: '🪢',
    category: 'materiais',
  },
  'ferro-bruto': {
    name: 'Ferro Bruto',
    icon: '⛏️',
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
  // Peixe da praia/vila — a espécie original, mantida como padrão. As duas
  // espécies novas (uma por ilha) e o "pescar lixo" eram debatidos e
  // propositalmente adiados; agora que existem 3 ilhas de verdade, cada
  // zona de pesca tem sua própria espécie (ver islandConfig.fishing em
  // world/islands/*.js e handleFishingResult em scenes/islandScene.js).
  peixe: {
    name: 'Peixe',
    icon: '🐟',
    category: 'comida',
    sellPrice: 4,
  },
  // Portomares — água salgada de porto movimentado.
  robalo: {
    name: 'Robalo',
    icon: '🐠',
    category: 'comida',
    sellPrice: 6,
  },
  // Floresta Sussurro — lago/rio de água doce.
  truta: {
    name: 'Truta',
    icon: '🐡',
    category: 'comida',
    sellPrice: 5,
  },
  // "Pescar lixo" — chance pequena (por ilha, ver islandConfig.fishing) de a
  // isca voltar com isto em vez de um peixe de verdade: mordida real,
  // reação certa, só que não veio nada bom. Sem valor de venda nem uso em
  // receita ainda — existe só pela sensação de "essa água tem lixo",
  // maior em Portomares (porto movimentado) que na Floresta (água limpa).
  'lixo-marinho': {
    name: 'Lixo do Mar',
    icon: '🥫',
    category: 'materiais',
  },
};
