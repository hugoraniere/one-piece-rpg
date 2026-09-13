// Catálogo de itens — ícones continuam emoji por enquanto (mesmo aviso já
// existente em inventoryMenu.js: arte por-item de verdade vem depois; os
// ícones do sprite SVG são só pra UI de atributos/perícias/moodles).
//
// `equipLayerId` marca itens equipáveis, referenciando um id de
// character/layers.js#LAYER_DEFS — é o que conecta "ter o item" (aqui) com
// "aparecer no personagem" (lá). Todo item com `equipLayerId` também tem
// `iconPath` (PNG 32x32) — usado na hotbar e no slot "Mão" do Inventário,
// onde o emoji `icon` fica pequeno/inconsistente demais; o emoji continua
// sendo o ícone da GRADE do inventário (ver renderItemsTab em
// inventoryMenu.js).
// `isBait`/`baitTier` marcam iscas de pesca — ver sim/fishing.js pra como o
// tier vira chance de mordida.
// `sellPrice` marca item vendável no mercado de Portomares (ver
// handleSell em scenes/islandScene.js) — Berries por unidade.
export const ITEM_DEFS = {
  // Antes hardcoded fora do inventário (equipada direto por Q, sem
  // depender de posse) — agora é um item normal como qualquer outro,
  // pra caber na regra "hotbar mostra o que você tem, não o que é fixo
  // por slot" (ver ITEMS_PROGRESS.md). O jogador começa com uma no
  // inventário (ver state/playerState.js).
  sword: {
    name: 'Cutlass de Ferro',
    icon: '⚔️',
    category: 'armas',
    equipLayerId: 'sword',
    iconPath: '/assets/icons/sword.png',
    description: 'Espada confiável para combate corpo-a-corpo',
  },
  'vara-de-pescar': {
    name: 'Vara de Pescar',
    icon: '🎣',
    category: 'ferramentas',
    equipLayerId: 'vara-de-pescar',
    iconPath: '/assets/icons/rod.png',
    description: 'Ferramenta básica para pescar',
  },
  'vara-reforcada': {
    name: 'Vara Reforçada',
    icon: '🎏',
    category: 'ferramentas',
    equipLayerId: 'vara-reforcada',
    iconPath: '/assets/icons/vara-reforcada.png',
    description: 'Vara reforçada com melhor chance de captura',
  },
  arco: {
    name: 'Arco Curto',
    icon: '🏹',
    category: 'armas',
    equipLayerId: 'arco',
    iconPath: '/assets/icons/arco.png',
    description: 'Arma à distância com grande alcance',
  },
  lanca: {
    name: 'Lança de Caça',
    icon: '🔱',
    category: 'armas',
    equipLayerId: 'lanca',
    iconPath: '/assets/icons/lanca.png',
    description: 'Lança com dano aumentado e alcance médio',
  },
  machado: {
    name: 'Machado de Lenhador',
    icon: '🪓',
    category: 'ferramentas',
    equipLayerId: 'machado',
    iconPath: '/assets/icons/machado.png',
    description: 'Dobra a quantidade de graveto coletado',
  },
  graveto: {
    name: 'Graveto',
    icon: '🪵',
    category: 'materiais',
    iconPath: '/assets/icons/graveto.png',
    description: 'Pedaço de madeira para fabricação',
  },
  corda: {
    name: 'Corda Trançada',
    icon: '🪢',
    category: 'materiais',
    iconPath: '/assets/icons/corda.png',
    description: 'Corda resistente para arcos e outros itens',
  },
  'ferro-bruto': {
    name: 'Ferro Bruto',
    icon: '⛏️',
    category: 'materiais',
    iconPath: '/assets/icons/ferro-bruto.png',
    description: 'Minério para fabricar armas reforçadas',
  },
  'linha-de-nylon': {
    name: 'Linha de Nylon',
    icon: '🧵',
    category: 'materiais',
    iconPath: '/assets/icons/linha-de-nylon.png',
    description: 'Linha resistente para varas de pesca',
  },
  minhoca: {
    name: 'Minhoca',
    icon: '🪱',
    category: 'materiais',
    isBait: true,
    baitTier: 2,
    iconPath: '/assets/icons/minhoca.png',
    description: 'Isca de qualidade média para pesca',
  },
  'isca-improvisada': {
    name: 'Isca Improvisada',
    icon: '🐛',
    category: 'materiais',
    isBait: true,
    baitTier: 1,
    iconPath: '/assets/icons/isca-improvisada.png',
    description: 'Isca básica para pesca',
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
    iconPath: '/assets/icons/peixe.png',
    description: 'Peixe comum da praia',
  },
  // Portomares — água salgada de porto movimentado.
  robalo: {
    name: 'Robalo',
    icon: '🐠',
    category: 'comida',
    sellPrice: 6,
    iconPath: '/assets/icons/robalo.png',
    description: 'Peixe de água salgada de Portomares',
  },
  // Floresta Sussurro — lago/rio de água doce.
  truta: {
    name: 'Truta',
    icon: '🐡',
    category: 'comida',
    sellPrice: 5,
    iconPath: '/assets/icons/truta.png',
    description: 'Peixe de água doce da Floresta Sussurro',
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
    iconPath: '/assets/icons/lixo-marinho.png',
    description: 'Objeto descartado encontrado na pesca',
  },
  // Itens novos (leva de arte "Pack de assets 0") — só catálogo/ícone por
  // enquanto: sem equipLayerId (não existe arte de camada pro personagem
  // pra escudo/capacete ainda, ver character/layers.js) e sem mecânica de
  // uso (poção não cura, escudo/capacete não dão defesa — não existe
  // sistema de defesa/consumo no jogo ainda). Aparecem no baú/inventário e
  // são vendíveis; sellPrice é placeholder, sem balanceamento real.
  escudo: {
    name: 'Escudo de Madeira',
    icon: '🛡️',
    category: 'armas',
    iconPath: '/assets/icons/escudo.png',
    description: 'Escudo reforçado com metal — ainda sem efeito ao equipar',
  },
  'pocao-vida': {
    name: 'Poção de Vida',
    icon: '🧪',
    category: 'comida',
    sellPrice: 10,
    iconPath: '/assets/icons/pocao-vida.png',
    description: 'Frasco de líquido vermelho — ainda sem efeito ao usar',
  },
  capacete: {
    name: 'Capacete de Ferro',
    icon: '🪖',
    category: 'armas',
    iconPath: '/assets/icons/capacete.png',
    description: 'Proteção de cabeça — ainda sem efeito ao equipar',
  },
  'bolsa-moedas': {
    name: 'Bolsa de Moedas',
    icon: '💰',
    category: 'materiais',
    sellPrice: 15,
    iconPath: '/assets/icons/bolsa-moedas.png',
    description: 'Saco de moedas encontrado por aí — vale Berries se vendido',
  },
};
