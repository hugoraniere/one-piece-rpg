// Metadados de exibição da ficha (ícone, nome, dica) — separados do ESTADO
// de verdade (nível/ações), que mora em sim/progression.js. `real: true`
// marca quem já tem uma ação de jogo de verdade treinando aquilo hoje;
// `real: false` significa que o motor existe e está pronto, mas nenhum
// verbo de jogo ainda produz treino pra essa estatística (ver comentário
// de topo em sim/progression.js).

// `effects(level)` descreve o efeito daquele nível — pra Força e Vitalidade
// é a MESMA fórmula usada de verdade em villageScene.js (ver
// sim/progression.js), então o número mostrado aqui nunca destoa do jogo.
// As outras quatro ainda não têm efeito nenhum implementado: o texto é só
// a intenção de design, não algo que já acontece.
export const ATTRIBUTES = [
  {
    key: 'forca',
    icon: 'forca',
    name: 'Força',
    real: true,
    trainedBy: 'Sobe atacando em combate (arma ou desarmado).',
    effects: (level) => `+${((level - 10) * 0.7).toFixed(1)} dano corpo a corpo`,
  },
  {
    key: 'vitalidade',
    icon: 'vitalidade',
    name: 'Vitalidade',
    real: true,
    trainedBy: 'Sobe apanhando em combate e sobrevivendo.',
    effects: (level) => `+${(level - 10) * 2} HP máximo`,
  },
  {
    key: 'destreza',
    icon: 'destreza',
    name: 'Destreza',
    real: false,
    trainedBy: 'Treino de esquiva — ainda não existe no jogo.',
    effects: () => '+crítico · +ordem de turno (não implementado)',
  },
  {
    key: 'velocidade',
    icon: 'velocidade',
    name: 'Velocidade',
    real: false,
    trainedBy: 'Corridas/natação cronometradas — ainda não existe no jogo.',
    effects: () => '+esquiva · natação mais rápida (não implementado)',
  },
  {
    key: 'inteligencia',
    icon: 'inteligencia',
    name: 'Inteligência',
    real: false,
    trainedBy: 'Livros/enigmas — ainda não existe no jogo.',
    effects: () => '+XP de perícias (não implementado)',
  },
  {
    key: 'vontade',
    icon: 'vontade',
    name: 'Força de Vontade',
    real: false,
    trainedBy: 'Provações superadas — ainda não existe no jogo.',
    effects: () => 'Resistência a pânico · acelera Haki (não implementado)',
  },
];

export const COMBAT_SKILLS = [
  { key: 'espada', icon: 'espada', name: 'Espadas', real: true, trainedBy: 'Sobe acertando inimigos com a espada equipada.' },
  { key: 'armas-fogo', icon: 'armas-fogo', name: 'Armas de fogo', real: false, trainedBy: 'Sem arma de fogo no jogo ainda.' },
  { key: 'luta', icon: 'luta', name: 'Luta (desarmado)', real: true, trainedBy: 'Sobe acertando inimigos sem nenhuma arma equipada.' },
  { key: 'lancas', icon: 'lancas', name: 'Lanças/hastes', real: false, trainedBy: 'Sem lança/haste no jogo ainda.' },
  { key: 'arremesso', icon: 'arremesso', name: 'Arremesso', real: false, trainedBy: 'Sem arma de arremesso no jogo ainda.' },
];

export const OFICIO_SKILLS = [
  { key: 'culinaria', icon: 'culinaria', name: 'Culinária', real: false, trainedBy: 'Sem cozinha no jogo ainda.' },
  { key: 'construcao', icon: 'construcao', name: 'Construção naval', real: false, trainedBy: 'Sem navio pra reparar ainda.' },
  { key: 'navegacao', icon: 'navegacao', name: 'Navegação', real: false, trainedBy: 'Sem travessia marítima ainda.' },
  { key: 'natacao', icon: 'natacao', name: 'Natação', real: false, trainedBy: 'Sem natação de verdade ainda.' },
  { key: 'pesca', icon: 'pesca', name: 'Pesca', real: false, trainedBy: 'Sem vara de pescar ainda.' },
  { key: 'caca', icon: 'caca', name: 'Caça', real: false, trainedBy: 'Sem animais selvagens ainda.' },
  { key: 'socorros', icon: 'socorros', name: 'Primeiros socorros', real: false, trainedBy: 'Sem cura/tratamento ainda.' },
  { key: 'alfaiataria', icon: 'alfaiataria', name: 'Alfaiataria', real: false, trainedBy: 'Sem costura ainda.' },
  { key: 'ferraria', icon: 'ferraria', name: 'Ferraria', real: false, trainedBy: 'Sem forja ainda.' },
  { key: 'comercio', icon: 'comercio', name: 'Comércio', real: false, trainedBy: 'Sem mercador ainda.' },
  { key: 'sobrevivencia', icon: 'sobrevivencia', name: 'Sobrevivência', real: false, trainedBy: 'Sem forrageamento ainda.' },
  { key: 'furtividade', icon: 'furtividade', name: 'Furtividade', real: false, trainedBy: 'Sem furtividade ainda.' },
  { key: 'percepcao', icon: 'percepcao', name: 'Percepção', real: false, trainedBy: 'Sem sistema de detecção ainda.' },
  { key: 'arqueologia', icon: 'arqueologia', name: 'Arqueologia', real: false, trainedBy: 'Sem ruínas escaváveis ainda.' },
];

// Haki não aparece em lugar nenhum da UI até ser despertado — nenhum dado
// aqui, de propósito (ver characterMenu.js).
