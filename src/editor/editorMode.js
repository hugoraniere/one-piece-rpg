import Phaser from 'phaser';
import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '../config.js';
import { EDITOR_TERRAIN_PALETTE } from '../world/ground.js';
import { EDITOR_PROP_PALETTE, createPropImage, editorObjects } from '../world/propRegistry.js';
import { isFishingActive } from '../ui/fishingHud.js';

// ============================================================================
// MODO EDITOR — pra montar/ajustar o cenário visualmente, sem depender de
// alguém digitando coordenada por coordenada.
//
// Como ativar: clique no botão "Editor" no canto superior esquerdo (ou
// aperte E). Com o editor ligado:
//   clique numa miniatura   escolhe o que colocar (props ou terreno — as
//                           abas em cima da paleta trocam a categoria)
//   clique no mapa          coloca o item escolhido, ou seleciona um já
//                           existente (props); no modo terreno, pinta o
//                           tile (arraste pra pintar vários de uma vez)
//   arrastar (props)        move o objeto selecionado
//   botões − / +            diminui/aumenta o tamanho do selecionado
//   botões ↺ / ↻            gira o selecionado
//   botão 🗑                remove o selecionado
//   botão 📋 Exportar       copia a posição de tudo pro clipboard — cole
//                           de volta no chat comigo
//   WASD/setas              navega a câmera livre pelo mapa
//   roda do mouse           zoom
// ============================================================================

const EDITOR_GRID_SIZE = 8; // encaixe (snap) ao arrastar/colocar props, em pixels
const EDITOR_THUMB_SIZE = 40;
const EDITOR_THUMB_GAP = 6;
const EDITOR_PANEL_X = 12;
const EDITOR_PALETTE_COLUMNS = 12;
const EDITOR_CAMERA_SPEED = 500; // pixels por segundo, navegando o mapa no modo editor

let editorMode = false;
let editorCategory = 'prop'; // 'prop' | 'terrain' — qual paleta está ativa
let terrainOverrides = new Map(); // "col,row" -> Image do tile pintado por cima do chão base
let editorSelected = null;
let editorPropIndex = -1; // -1 = nenhuma ferramenta ativa (modo padrão: só selecionar/arrastar)
let editorTerrainIndex = -1;
let editorPanelBounds = { right: 560, bottom: 260 }; // recalculado depois de montar a UI
let editorPainting = false; // botão do mouse pressionado, pintando terreno em arraste
let editorTerrainRotation = 0; // 0/90/180/270 — orientação do "carimbo" de terreno atual
let spaceHeld = false; // barra de espaço pressionada — segurar + arrastar navega o mapa
let spacePanPointer = null; // última posição de tela conhecida enquanto arrastando com espaço
let editorGrid; // Graphics do grid, só visível em modo editor
let editorSelectionBox; // retângulo mostrando o objeto selecionado
let editorGhost; // preview semi-transparente seguindo o mouse
let editorToggleButton;
let editorPanel = []; // todos os elementos de UI do painel (some quando o editor desliga)
let editorAlwaysOnUI = []; // UI fixa na tela mesmo com o editor desligado (ex: botão de ligar)
let editorPaletteHighlight; // quadrado amarelo em volta da miniatura escolhida
let editorPropThumbs = [];
let editorTerrainThumbs = [];
let editorInfoText;
let editorTabPropText;
let editorTabTerrainText;

export function isEditorModeActive() {
  return editorMode;
}

// Chamado no início de toda IslandScene.create() (ver islandScene.js), antes
// de setupEditor() rodar de novo. Sem isso, uma troca de ilha herdaria o
// modo/seleção/pintura de terreno da ilha anterior — e `terrainOverrides`
// guardaria Image de tiles já destruídos junto com a cena velha.
export function resetEditorState() {
  editorMode = false;
  editorCategory = 'prop';
  terrainOverrides = new Map();
  editorSelected = null;
  editorPropIndex = -1;
  editorTerrainIndex = -1;
  editorPainting = false;
  editorTerrainRotation = 0;
  spaceHeld = false;
  spacePanPointer = null;
}

// Chamado do update() da cena quando o editor está ligado — WASD/setas
// viram pan de câmera em vez de mover o personagem.
export function panEditorCamera(scene, delta, cursors, wasd) {
  const cam = scene.cameras.main;
  const panSpeed = (EDITOR_CAMERA_SPEED * delta) / 1000 / cam.zoom;
  if (cursors.left.isDown || wasd.A.isDown) cam.scrollX -= panSpeed;
  if (cursors.right.isDown || wasd.D.isDown) cam.scrollX += panSpeed;
  if (cursors.up.isDown || wasd.W.isDown) cam.scrollY -= panSpeed;
  if (cursors.down.isDown || wasd.S.isDown) cam.scrollY += panSpeed;
}

export function setupEditor(scene, player) {
  // Grid de referência — cobre o mundo inteiro, mas só fica visível em
  // modo editor.
  editorGrid = scene.add.graphics();
  editorGrid.lineStyle(1, 0xffffff, 0.15);
  for (let x = 0; x <= WORLD_WIDTH; x += TILE_SIZE) {
    editorGrid.lineBetween(x, 0, x, WORLD_HEIGHT);
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += TILE_SIZE) {
    editorGrid.lineBetween(0, y, WORLD_WIDTH, y);
  }
  editorGrid.setDepth(9000);
  editorGrid.setVisible(false);

  editorSelectionBox = scene.add.rectangle(0, 0, 10, 10).setStrokeStyle(2, 0xffff00, 1);
  editorSelectionBox.setDepth(9998);
  editorSelectionBox.setVisible(false);

  editorGhost = scene.add.image(0, 0, EDITOR_PROP_PALETTE[0].key);
  editorGhost.setAlpha(0.5);
  editorGhost.setOrigin(0.5, 1);
  editorGhost.setDepth(9997);
  editorGhost.setVisible(false);

  // Botão sempre visível (independente do editor estar ligado) — é o que
  // resolve "como eu ativo isso": não depende de saber o atalho de teclado.
  editorToggleButton = makeButton(scene, EDITOR_PANEL_X, 12, '🖌 Editor: OFF', () => toggleEditorMode(scene, player));
  editorToggleButton.setDepth(10000); // sempre acima do painel
  editorAlwaysOnUI = [editorToggleButton];
  editorAlwaysOnUI.forEach((el) => {
    el.setData('uiBaseX', el.x);
    el.setData('uiBaseY', el.y);
    el.setData('uiBaseScaleX', el.scaleX);
    el.setData('uiBaseScaleY', el.scaleY);
  });

  buildEditorUI(scene, player);

  // Arrastar objeto selecionado (só props têm física de arraste — terreno
  // é pintado, não arrastado)
  scene.input.on('drag', (pointer, gameObject, dragX, dragY) => {
    if (!editorMode || !editorObjects.includes(gameObject) || spaceHeld) return;
    gameObject.x = Math.round(dragX / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    gameObject.y = Math.round(dragY / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    gameObject.setDepth(gameObject.y);
    updateEditorSelectionBox();
    updateEditorInfoText();
  });

  // Clicar num objeto existente = selecionar (em vez de colocar um novo)
  scene.input.on('gameobjectdown', (pointer, gameObject) => {
    if (!editorMode) return;
    if (!editorObjects.includes(gameObject)) return; // botões/miniaturas tratam o próprio clique
    if (spaceHeld) return; // segurando espaço = só navegar, nunca selecionar
    selectEditorObject(gameObject);
  });

  scene.input.on('pointerdown', (pointer) => {
    if (!editorMode) return;

    if (spaceHeld) {
      spacePanPointer = { x: pointer.x, y: pointer.y };
      return; // segurando espaço = arrastar move o mapa, nunca coloca/seleciona
    }

    const hits = scene.input.hitTestPointer(pointer);
    if (hits.length > 0) return; // clique em botão/miniatura/objeto já tratado

    if (editorCategory === 'terrain') {
      if (editorTerrainIndex === -1) return; // nenhuma ferramenta ativa — clicar no chão não faz nada
      editorPainting = true;
      paintTerrainAt(scene, pointer.worldX, pointer.worldY);
    } else if (editorPropIndex === -1) {
      // Nenhuma ferramenta ativa — clique no vazio só desseleciona
      editorSelected = null;
      updateEditorSelectionBox();
      updateEditorInfoText();
    } else {
      const snappedX = Math.round(pointer.worldX / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
      const snappedY = Math.round(pointer.worldY / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
      const paletteItem = EDITOR_PROP_PALETTE[editorPropIndex];
      const image = createPropImage(scene, paletteItem.key, snappedX, snappedY, paletteItem.defaultScale || 1);
      selectEditorObject(image);
    }
  });

  scene.input.on('pointerup', () => {
    editorPainting = false;
    spacePanPointer = null;
  });

  scene.input.on('pointermove', (pointer) => {
    if (!editorMode) return;

    if (spaceHeld && spacePanPointer && pointer.isDown) {
      const cam = scene.cameras.main;
      cam.scrollX -= (pointer.x - spacePanPointer.x) / cam.zoom;
      cam.scrollY -= (pointer.y - spacePanPointer.y) / cam.zoom;
      spacePanPointer = { x: pointer.x, y: pointer.y };
      editorGhost.setVisible(false);
      return;
    }

    updateEditorGhost(scene, pointer);
    if (editorPainting && editorCategory === 'terrain') {
      paintTerrainAt(scene, pointer.worldX, pointer.worldY);
    }
  });

  scene.input.keyboard.on('keydown-E', () => toggleEditorMode(scene, player));

  const DIGIT_KEY_NAMES = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'ZERO'];
  DIGIT_KEY_NAMES.forEach((keyName, i) => {
    scene.input.keyboard.on(`keydown-${keyName}`, () => {
      if (!editorMode || editorCategory !== 'prop' || i >= EDITOR_PROP_PALETTE.length) return;
      editorPropIndex = i;
      refreshEditorPaletteHighlight();
    });
  });

  scene.input.keyboard.on('keydown-DELETE', () => removeSelectedEditorObject());
  scene.input.keyboard.on('keydown-BACKSPACE', () => removeSelectedEditorObject());

  // Várias teclas mapeadas pro mesmo efeito — teclados diferem em qual tecla
  // física corresponde a "+"/"-" sem precisar de Shift.
  ['MINUS', 'NUMPAD_SUBTRACT'].forEach((k) => scene.input.keyboard.on(`keydown-${k}`, () => scaleSelectedEditorObject(-0.1)));
  ['PLUS', 'EQUALS', 'NUMPAD_ADD'].forEach((k) => scene.input.keyboard.on(`keydown-${k}`, () => scaleSelectedEditorObject(0.1)));

  // R gira o objeto selecionado (props) OU, se estiver na aba Terreno com um
  // tipo escolhido, gira o "carimbo" que vai ser pintado a seguir.
  scene.input.keyboard.on('keydown-R', (event) => rotateCurrentSelection(event.shiftKey ? -1 : 1));

  scene.input.keyboard.on('keydown-P', () => exportEditorLayout());

  scene.input.keyboard.on('keydown-SPACE', (event) => {
    if (!editorMode) return;
    event.preventDefault(); // barra de espaço não deve rolar a página
    spaceHeld = true;
  });
  scene.input.keyboard.on('keyup-SPACE', () => {
    spaceHeld = false;
    spacePanPointer = null;
  });

  scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
    if (!editorMode) return;
    const cam = scene.cameras.main;
    const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.3, 2.5);
    cam.setZoom(newZoom);
    applyEditorUIZoom();
  });
}

// Cria um "botão" clicável (texto com fundo) fixo na tela.
function makeButton(scene, x, y, label, onClick) {
  const button = scene.add.text(x, y, label, {
    font: '14px sans-serif',
    color: '#ffffff',
    backgroundColor: '#2a2a2acc',
    padding: { x: 8, y: 6 },
  });
  button.setScrollFactor(0);
  button.setDepth(9999);
  button.setInteractive({ useHandCursor: true });
  button.on('pointerdown', (pointer, x2, y2, event) => {
    event.stopPropagation();
    onClick();
  });
  return button;
}

// Cria a miniatura clicável de um item de paleta (props ou terreno).
// Sem `key` (null) vira o botão especial "Nenhuma ferramenta".
function makeThumb(scene, x, y, key, onClick) {
  const bg = scene.add.rectangle(x, y, EDITOR_THUMB_SIZE, EDITOR_THUMB_SIZE, 0x000000, 0.5);
  bg.setOrigin(0, 0);
  bg.setScrollFactor(0);
  bg.setDepth(9999);

  const image = key
    ? scene.add.image(x + EDITOR_THUMB_SIZE / 2, y + EDITOR_THUMB_SIZE / 2, key)
    : scene.add.text(x + EDITOR_THUMB_SIZE / 2, y + EDITOR_THUMB_SIZE / 2, '🚫', { font: '18px sans-serif' }).setOrigin(0.5);
  if (key) image.setDisplaySize(EDITOR_THUMB_SIZE - 6, EDITOR_THUMB_SIZE - 6);
  image.setScrollFactor(0);
  image.setDepth(10000);

  bg.setInteractive({ useHandCursor: true });
  bg.on('pointerdown', (pointer, lx, ly, event) => {
    event.stopPropagation();
    onClick();
  });

  return { bg, image, x, y };
}

// Organiza uma lista de miniaturas em várias linhas (a lista de props não
// cabe numa linha só). Retorna as miniaturas e a altura total ocupada.
function layoutThumbRow(scene, items, startY, columns, onSelect) {
  const thumbs = [];
  // slot 0 de toda categoria é o botão "nenhuma ferramenta" (modo padrão)
  const noneThumb = makeThumb(scene, EDITOR_PANEL_X, startY, null, () => onSelect(-1));
  thumbs.push(noneThumb);

  items.forEach((item, i) => {
    const slot = i + 1; // +1 por causa do botão "nenhuma" ocupando o slot 0
    const col = slot % columns;
    const row = Math.floor(slot / columns);
    const x = EDITOR_PANEL_X + col * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP);
    const y = startY + row * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP);
    thumbs.push(makeThumb(scene, x, y, item.key, () => onSelect(i)));
  });

  const rows = Math.ceil((items.length + 1) / columns);
  return { thumbs, height: rows * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP) };
}

function buildEditorUI(scene, player) {
  const rowY = 48;

  editorTabPropText = makeButton(scene, EDITOR_PANEL_X, rowY, 'Props', () => {
    editorCategory = 'prop';
    refreshEditorPaletteVisibility();
  });
  editorTabTerrainText = makeButton(scene, EDITOR_PANEL_X + 70, rowY, 'Terreno', () => {
    editorCategory = 'terrain';
    refreshEditorPaletteVisibility();
  });

  const thumbY = rowY + 34;
  const propLayout = layoutThumbRow(scene, EDITOR_PROP_PALETTE, thumbY, EDITOR_PALETTE_COLUMNS, (i) => {
    editorCategory = 'prop';
    editorPropIndex = i;
    refreshEditorPaletteVisibility();
  });
  const terrainLayout = layoutThumbRow(scene, EDITOR_TERRAIN_PALETTE, thumbY, EDITOR_PALETTE_COLUMNS, (i) => {
    editorCategory = 'terrain';
    editorTerrainIndex = i;
    editorTerrainRotation = 0; // começa do zero a cada troca de peça
    refreshEditorPaletteVisibility();
  });
  editorPropThumbs = propLayout.thumbs;
  editorTerrainThumbs = terrainLayout.thumbs;

  editorPaletteHighlight = scene.add.rectangle(0, 0, EDITOR_THUMB_SIZE, EDITOR_THUMB_SIZE).setStrokeStyle(3, 0xffff00, 1);
  editorPaletteHighlight.setOrigin(0, 0);
  editorPaletteHighlight.setScrollFactor(0);
  editorPaletteHighlight.setDepth(10001);

  const toolbarY = thumbY + Math.max(propLayout.height, terrainLayout.height) + 8;
  const scaleMinusBtn = makeButton(scene, EDITOR_PANEL_X, toolbarY, '−', () => scaleSelectedEditorObject(-0.1));
  const scalePlusBtn = makeButton(scene, EDITOR_PANEL_X + 36, toolbarY, '+', () => scaleSelectedEditorObject(0.1));
  const rotateCcwBtn = makeButton(scene, EDITOR_PANEL_X + 76, toolbarY, '↺', () => rotateCurrentSelection(-1));
  const rotateCwBtn = makeButton(scene, EDITOR_PANEL_X + 112, toolbarY, '↻', () => rotateCurrentSelection(1));
  const deleteBtn = makeButton(scene, EDITOR_PANEL_X + 152, toolbarY, '🗑 Remover', () => removeSelectedEditorObject());
  const exportBtn = makeButton(scene, EDITOR_PANEL_X + 250, toolbarY, '📋 Exportar', () => exportEditorLayout());

  const zoomOutBtn = makeButton(scene, EDITOR_PANEL_X, toolbarY + 34, '🔍−', () => zoomEditorCamera(scene, -0.25));
  const zoomInBtn = makeButton(scene, EDITOR_PANEL_X + 50, toolbarY + 34, '🔍+', () => zoomEditorCamera(scene, 0.25));
  const zoomResetBtn = makeButton(scene, EDITOR_PANEL_X + 100, toolbarY + 34, '100%', () => resetEditorCameraZoom(scene));

  editorInfoText = scene.add.text(EDITOR_PANEL_X, toolbarY + 68, '', {
    font: '13px monospace',
    color: '#ffffff',
    backgroundColor: '#000000cc',
    padding: { x: 8, y: 6 },
  });
  editorInfoText.setScrollFactor(0);
  editorInfoText.setDepth(9999);

  editorPanel = [
    editorTabPropText,
    editorTabTerrainText,
    ...editorPropThumbs.flatMap((t) => [t.bg, t.image]),
    ...editorTerrainThumbs.flatMap((t) => [t.bg, t.image]),
    editorPaletteHighlight,
    scaleMinusBtn,
    scalePlusBtn,
    rotateCcwBtn,
    rotateCwBtn,
    deleteBtn,
    exportBtn,
    zoomOutBtn,
    zoomInBtn,
    zoomResetBtn,
    editorInfoText,
  ];
  editorPanel.forEach((el) => el.setVisible(false));
  // A UI do editor usa setScrollFactor(0) pra não rolar com a câmera, mas
  // isso não impede o zoom da câmera de encolher o próprio desenho dela.
  // Guardamos aqui a posição/escala "de design" (zoom 1) de cada elemento
  // pra poder compensar o zoom depois (ver applyEditorUIZoom).
  editorPanel.forEach((el) => {
    el.setData('uiBaseX', el.x);
    el.setData('uiBaseY', el.y);
    el.setData('uiBaseScaleX', el.scaleX);
    el.setData('uiBaseScaleY', el.scaleY);
  });

  editorPanelBounds = {
    right: EDITOR_PANEL_X + EDITOR_PALETTE_COLUMNS * (EDITOR_THUMB_SIZE + EDITOR_THUMB_GAP),
    bottom: editorInfoText.y + editorInfoText.height + 8,
  };
}

function zoomEditorCamera(scene, delta) {
  const cam = scene.cameras.main;
  cam.setZoom(Phaser.Math.Clamp(cam.zoom + delta, 0.3, 2.5));
  applyEditorUIZoom();
}

function resetEditorCameraZoom(scene) {
  scene.cameras.main.setZoom(1);
  applyEditorUIZoom();
}

// Contra-escala a UI do editor pelo zoom atual da câmera, pra ela continuar
// com o mesmo tamanho/posição na tela em qualquer nível de zoom do mapa.
function applyEditorUIZoom() {
  const allUI = [...editorPanel, ...editorAlwaysOnUI];
  if (!allUI.length) return;
  const zoom = allUI[0].scene.cameras.main.zoom;
  allUI.forEach((el) => {
    const baseX = el.getData('uiBaseX');
    if (baseX === undefined) return;
    el.x = baseX / zoom;
    el.y = el.getData('uiBaseY') / zoom;
    el.scaleX = el.getData('uiBaseScaleX') / zoom;
    el.scaleY = el.getData('uiBaseScaleY') / zoom;
  });
}

function refreshEditorPaletteVisibility() {
  editorPropThumbs.forEach((t) => {
    t.bg.setVisible(editorCategory === 'prop');
    t.image.setVisible(editorCategory === 'prop');
  });
  editorTerrainThumbs.forEach((t) => {
    t.bg.setVisible(editorCategory === 'terrain');
    t.image.setVisible(editorCategory === 'terrain');
  });
  refreshEditorPaletteHighlight();
  updateEditorInfoText();
}

function refreshEditorPaletteHighlight() {
  const thumbs = editorCategory === 'prop' ? editorPropThumbs : editorTerrainThumbs;
  const index = editorCategory === 'prop' ? editorPropIndex : editorTerrainIndex;
  const thumb = thumbs[index + 1]; // +1 porque o slot 0 é sempre o botão "nenhuma ferramenta"
  if (!thumb) return;
  editorPaletteHighlight.setData('uiBaseX', thumb.x);
  editorPaletteHighlight.setData('uiBaseY', thumb.y);
  applyEditorUIZoom();
  updateEditorInfoText();
}

function updateEditorGhost(scene, pointer) {
  const activeIndex = editorCategory === 'terrain' ? editorTerrainIndex : editorPropIndex;
  if (!editorMode || editorPainting || activeIndex === -1) {
    editorGhost.setVisible(false);
    return;
  }
  // Não mostra o preview em cima do próprio painel de UI (senão fica
  // sobrepondo os botões/miniaturas de forma confusa)
  if (pointer.y < editorPanelBounds.bottom && pointer.x < editorPanelBounds.right) {
    editorGhost.setVisible(false);
    return;
  }
  if (editorCategory === 'terrain') {
    const col = Math.floor(pointer.worldX / TILE_SIZE);
    const row = Math.floor(pointer.worldY / TILE_SIZE);
    editorGhost.setTexture(EDITOR_TERRAIN_PALETTE[editorTerrainIndex].key);
    // Origem no centro (não no canto) — assim girar em 90°/180°/270° mantém
    // o quadrado perfeitamente encaixado na mesma célula do grid.
    editorGhost.setOrigin(0.5, 0.5);
    editorGhost.setDisplaySize(TILE_SIZE, TILE_SIZE);
    editorGhost.setRotation(Phaser.Math.DegToRad(editorTerrainRotation));
    editorGhost.setPosition(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
  } else {
    const paletteItem = EDITOR_PROP_PALETTE[editorPropIndex];
    const snappedX = Math.round(pointer.worldX / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    const snappedY = Math.round(pointer.worldY / EDITOR_GRID_SIZE) * EDITOR_GRID_SIZE;
    editorGhost.setTexture(paletteItem.key);
    editorGhost.setOrigin(0.5, 1);
    const tex = scene.textures.get(paletteItem.key).getSourceImage();
    const scale = paletteItem.defaultScale || 1;
    editorGhost.setDisplaySize(tex.width * scale, tex.height * scale);
    editorGhost.setRotation(0);
    editorGhost.setPosition(snappedX, snappedY);
  }
  editorGhost.setVisible(true);
}

function paintTerrainAt(scene, worldX, worldY) {
  const col = Math.floor(worldX / TILE_SIZE);
  const row = Math.floor(worldY / TILE_SIZE);
  if (col < 0 || row < 0 || col * TILE_SIZE >= WORLD_WIDTH || row * TILE_SIZE >= WORLD_HEIGHT) return;

  const cellKey = `${col},${row}`;
  const terrainKey = EDITOR_TERRAIN_PALETTE[editorTerrainIndex].key;

  const existing = terrainOverrides.get(cellKey);
  if (existing) {
    if (existing.texture.key === terrainKey && existing.getData('rotation') === editorTerrainRotation) return; // já é exatamente isso
    existing.destroy();
  }

  // Origem no centro, não no canto — gira em 90°/180°/270° sem sair da célula.
  const tile = scene.add.image(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, terrainKey);
  tile.setOrigin(0.5, 0.5);
  tile.setDisplaySize(TILE_SIZE, TILE_SIZE); // força 1 tile exato mesmo se o arquivo não for 120x120
  tile.setRotation(Phaser.Math.DegToRad(editorTerrainRotation));
  tile.setDepth(-0.99); // acima das faixas de chão, abaixo de sombra/props/personagem
  tile.setData('terrainKey', terrainKey);
  tile.setData('col', col);
  tile.setData('row', row);
  tile.setData('rotation', editorTerrainRotation);
  terrainOverrides.set(cellKey, tile);
}

function toggleEditorMode(scene, player) {
  // Só trava LIGAR o editor com pesca ativa (nunca trava desligar) — sem
  // isso dava pra abrir a paleta do editor por cima de uma pescaria ainda
  // rodando escondida atrás (ver auditoria de bugs).
  if (!editorMode && isFishingActive()) return;
  editorMode = !editorMode;
  editorGrid.setVisible(editorMode);
  editorToggleButton.setText(editorMode ? '🖌 Editor: ON' : '🖌 Editor: OFF');
  editorPanel.forEach((el) => el.setVisible(editorMode));

  const cam = scene.cameras.main;
  if (editorMode) {
    cam.stopFollow();
    refreshEditorPaletteVisibility();
  } else {
    editorSelectionBox.setVisible(false);
    editorGhost.setVisible(false);
    editorSelected = null;
    editorPainting = false;
    player.body.setVelocity(0, 0);
    cam.setZoom(1);
    cam.startFollow(player, true, 0.1, 0.1);
    applyEditorUIZoom();
  }
}

function selectEditorObject(gameObject) {
  editorSelected = gameObject;
  updateEditorSelectionBox();
  updateEditorInfoText();
}

function updateEditorSelectionBox() {
  if (!editorSelected) {
    editorSelectionBox.setVisible(false);
    return;
  }
  const bounds = editorSelected.getBounds();
  editorSelectionBox.setPosition(bounds.centerX, bounds.centerY);
  editorSelectionBox.setSize(bounds.width, bounds.height);
  editorSelectionBox.setRotation(editorSelected.rotation);
  editorSelectionBox.setVisible(true);
}

function removeSelectedEditorObject() {
  if (!editorMode || !editorSelected) return;
  const index = editorObjects.indexOf(editorSelected);
  if (index !== -1) editorObjects.splice(index, 1);
  editorSelected.destroy();
  editorSelected = null;
  editorSelectionBox.setVisible(false);
  updateEditorInfoText();
}

function scaleSelectedEditorObject(delta) {
  if (!editorMode || !editorSelected) return;
  const newScale = Math.max(0.1, Math.round((editorSelected.scaleX + delta) * 100) / 100);
  editorSelected.setScale(newScale);
  updateEditorSelectionBox();
  updateEditorInfoText();
}

function rotateSelectedEditorObject(deltaDeg) {
  if (!editorMode || !editorSelected) return;
  const newDeg = Phaser.Math.Wrap(Phaser.Math.RadToDeg(editorSelected.rotation) + deltaDeg, 0, 360);
  editorSelected.setRotation(Phaser.Math.DegToRad(newDeg));
  updateEditorSelectionBox();
  updateEditorInfoText();
}

// Usado pelo botão ↺/↻ e pela tecla R: gira o prop selecionado (passo fino,
// 15°) ou, se não há nada selecionado mas a aba Terreno tem um tipo ativo,
// gira o "carimbo" de terreno (passo de 90°, já que essas peças só fazem
// sentido em ângulos retos — são autotiles quadrados).
function rotateCurrentSelection(direction) {
  if (!editorMode) return;
  if (editorSelected) {
    rotateSelectedEditorObject(direction * 15);
  } else if (editorCategory === 'terrain' && editorTerrainIndex !== -1) {
    editorTerrainRotation = Phaser.Math.Wrap(editorTerrainRotation + direction * 90, 0, 360);
    updateEditorInfoText();
  }
}

function updateEditorInfoText() {
  if (!editorMode || !editorInfoText) return;
  const categoryLabel = editorCategory === 'prop' ? 'Props' : 'Terreno';
  const activeIndex = editorCategory === 'prop' ? editorPropIndex : editorTerrainIndex;
  const currentItem =
    activeIndex === -1
      ? { label: 'nenhuma (clique só seleciona/arrasta)' }
      : (editorCategory === 'prop' ? EDITOR_PROP_PALETTE : EDITOR_TERRAIN_PALETTE)[activeIndex];

  const selectedInfo = editorSelected
    ? `Selecionado: ${editorSelected.getData('propKey')} @ (${Math.round(editorSelected.x)}, ${Math.round(
        editorSelected.y
      )})  escala ${editorSelected.scaleX.toFixed(2)}  rotação ${Math.round(Phaser.Math.RadToDeg(editorSelected.rotation))}°`
    : editorCategory === 'terrain' && activeIndex !== -1
      ? `Rotação do carimbo: ${editorTerrainRotation}° (tecla R)`
      : 'Nada selecionado';

  editorInfoText.setText(
    `Categoria: ${categoryLabel}  |  Colocando: ${currentItem.label}\n${selectedInfo}\n` +
      'Clique: colocar/selecionar   Arrastar: mover   Espaço+arrastar: navegar mapa   Roda: zoom'
  );
}

function exportEditorLayout() {
  if (!editorMode) return;
  const props = editorObjects.map((obj) => ({
    key: obj.getData('propKey'),
    x: Math.round(obj.x),
    y: Math.round(obj.y),
    scale: Math.round(obj.scaleX * 100) / 100,
    rotation: Math.round(Phaser.Math.RadToDeg(obj.rotation)) || 0,
  }));
  const terrain = Array.from(terrainOverrides.values()).map((tile) => ({
    key: tile.getData('terrainKey'),
    col: tile.getData('col'),
    row: tile.getData('row'),
    rotation: tile.getData('rotation') || 0,
  }));
  const json = JSON.stringify({ props, terrain }, null, 2);
  console.log('--- LAYOUT EXPORTADO ---\n' + json);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).catch(() => {});
  }

  editorInfoText.setText(
    `Exportado! ${props.length} props + ${terrain.length} tiles de terreno.\n` +
      'Copiado pro clipboard (se o navegador permitiu).\n' +
      'Também impresso no console (F12) — cole no chat comigo.'
  );
}
