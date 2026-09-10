import Phaser from 'phaser';

// Animação IMPROVISADA do ato de pescar — base de código pra trocar por
// arte de verdade depois (ver conversa de design: "crie uma base, depois
// atualizamos com assets"). Só mexe na CAMADA da vara (`weaponSprite`),
// nunca no corpo: `updateLayerVisual` nunca toca `rotation` (só posição/
// escala/textura/flip — ver character/layers.js), então dá pra animar
// rotation aqui sem o update() de todo frame brigar com isso. Mesma ideia
// do antigo `swingWeapon` do combate (removido), agora pras 3 fases da
// pesca em vez de um golpe só:
//   arremesso -> espera (balanço lento, "segurando a linha") -> resultado.
const CAST_WOUND_DEG = -20; // ângulo "carregando" antes do arremesso
const CAST_HOLD_DEG = 35; // ângulo de descanso com a vara esticada pra água
const SWAY_DEG = 3; // amplitude do balanço lento durante a espera
const BITE_JITTER_DEG = 8; // amplitude do tremor rápido na mordida
const SUCCESS_PULL_DEG = -40; // puxão forte pra cima — fisgou
const ESCAPE_DROOP_DEG = 50; // vara "murcha" pra baixo — escapou

let idleSwayTween = null;
let activeTween = null;

function stopTweens() {
  if (idleSwayTween) {
    idleSwayTween.stop();
    idleSwayTween = null;
  }
  if (activeTween) {
    activeTween.stop();
    activeTween = null;
  }
}

function startIdleSway(scene, weaponSprite) {
  const base = Phaser.Math.DegToRad(CAST_HOLD_DEG);
  idleSwayTween = scene.tweens.add({
    targets: weaponSprite,
    rotation: base - Phaser.Math.DegToRad(SWAY_DEG),
    duration: 900,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  });
}

// Chamado quando o arremesso é validado (ver tryStartFishing em
// villageScene.js) — vara "carrega" pra trás e chicoteia pra frente, e ao
// terminar entra num balanço lento (linha na água, esperando mordida).
export function playCast(scene, weaponSprite) {
  stopTweens();
  weaponSprite.rotation = Phaser.Math.DegToRad(CAST_WOUND_DEG);
  activeTween = scene.tweens.add({
    targets: weaponSprite,
    rotation: Phaser.Math.DegToRad(CAST_HOLD_DEG),
    duration: 180,
    ease: 'Back.out',
    onComplete: () => {
      activeTween = null;
      startIdleSway(scene, weaponSprite);
    },
  });
}

// Chamado no instante em que um peixe morde (ver `onBite` em
// startFishingAttempt) — troca o balanço calmo por um tremor rápido,
// avisando "algo está puxando" mesmo pra quem não está lendo o texto da
// UI (ver ui/fishingHud.js).
export function playBiteJitter(scene, weaponSprite) {
  if (idleSwayTween) {
    idleSwayTween.stop();
    idleSwayTween = null;
  }
  const base = Phaser.Math.DegToRad(CAST_HOLD_DEG);
  activeTween = scene.tweens.add({
    targets: weaponSprite,
    rotation: base + Phaser.Math.DegToRad(BITE_JITTER_DEG),
    duration: 70,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.inOut',
  });
}

// Sequência de tweens em cadeia (a API do Phaser não encadeia rotações
// diferentes num `add` só de forma legível) — cada uma só começa quando a
// anterior termina.
function playSequence(scene, weaponSprite, steps, i = 0) {
  if (i >= steps.length) {
    activeTween = null;
    return;
  }
  activeTween = scene.tweens.add({
    targets: weaponSprite,
    rotation: steps[i].rotation,
    duration: steps[i].duration,
    ease: steps[i].ease,
    onComplete: () => playSequence(scene, weaponSprite, steps, i + 1),
  });
}

// Chamado com o resultado final (ver handleFishingResult) — cada desfecho
// tem uma "personalidade" de movimento diferente, sempre terminando em
// rotation 0 (o mesmo descanso usado fora da pesca).
const RESULT_SEQUENCES = {
  sucesso: [
    { rotation: Phaser.Math.DegToRad(SUCCESS_PULL_DEG), duration: 140, ease: 'Back.out' },
    { rotation: 0, duration: 260, ease: 'Sine.inOut' },
  ],
  escapou: [
    { rotation: Phaser.Math.DegToRad(ESCAPE_DROOP_DEG), duration: 220, ease: 'Sine.out' },
    { rotation: 0, duration: 300, ease: 'Sine.inOut' },
  ],
  'nada-mordeu': [{ rotation: 0, duration: 260, ease: 'Sine.inOut' }],
  'cedo-demais': [{ rotation: 0, duration: 140, ease: 'Quad.out' }],
};

export function playReelResult(scene, weaponSprite, outcome) {
  stopTweens();
  playSequence(scene, weaponSprite, RESULT_SEQUENCES[outcome] ?? RESULT_SEQUENCES['nada-mordeu']);
}

// Rede de segurança pra interrupção fora do fluxo normal (ex: cena
// destruída com uma pescaria em andamento) — o fluxo normal já termina em
// rotation 0 sozinho via playReelResult.
export function resetRod(weaponSprite) {
  stopTweens();
  weaponSprite.rotation = 0;
}
