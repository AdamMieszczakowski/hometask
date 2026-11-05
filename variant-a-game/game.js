/* =======================================================
   1. KONFIGURACJA PODSTAWOWA, CLICKTAG I DOSTĘPNOŚĆ
   ======================================================= */
// Zgodnie z wytycznymi Rich Media definiujemy standardowy parametr clickTag
const clickTag = window.clickTag || 'https://example.com/landing';

// Tryb debugowania (?debug=1) rysuje zarysy hitboxów na canvasie
const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';

// Sprawdzenie preferencji użytkownika dotyczących redukcji animacji
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Obsługa kliknięcia we wszystkie przyciski CTA w nowym oknie
document.querySelectorAll('.btn-cta').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(clickTag, '_blank');
  });
});

/* =======================================================
   2. KONTROLER DŹWIĘKÓW I ZARZĄDZANIE AUDIO
   ======================================================= */
let isMuted = false;
let audioUnlocked = false;

// Inicjalizacja ścieżek audio
const sounds = {
  bgm: new Audio('assets/music/background_music/Funny Game Loop.mp3'),
  crash: new Audio('assets/music/crash/Cartoon Crash Boing.mp3'),
  fail: new Audio('assets/music/endcard_fail/Fail.mp3'),
  winApplause: new Audio('assets/music/endcard_win/applause.mp3'),
  winCheer: new Audio('assets/music/endcard_win/Celebrative Happy Woohoo Cheer 2.mp3')
};

// Konfiguracja poziomów głośności oraz zapętlenia muzyki w tle
sounds.bgm.loop = true;
sounds.bgm.volume = 0.45;
sounds.crash.volume = 0.7;
sounds.fail.volume = 0.65;
sounds.winApplause.volume = 0.6;
sounds.winCheer.volume = 0.65;

// Bezpieczne odtwarzanie dźwięków po odblokowaniu przez pierwszą interakcję
function playSound(audio) {
  if (isMuted || !audioUnlocked) return;
  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (err) {}
}

// Obsługa przycisku wyciszenia (Mute Toggle)
const muteBtn = document.getElementById('mute-btn');
const iconSoundOn = document.getElementById('icon-sound-on');
const iconSoundOff = document.getElementById('icon-sound-off');

muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isMuted = !isMuted;
  iconSoundOn.style.display = isMuted ? 'none' : 'block';
  iconSoundOff.style.display = isMuted ? 'block' : 'none';

  if (isMuted) {
    sounds.bgm.pause();
  } else if (gameState === 'PLAYING') {
    sounds.bgm.play().catch(() => {});
  }
});

// Zatrzymywanie dźwięku i gry przy zmianie karty w przeglądarce (visibilitychange)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (!isMuted) sounds.bgm.pause();
  } else {
    if (!isMuted && gameState === 'PLAYING') {
      sounds.bgm.play().catch(() => {});
    }
  }
});

/* =======================================================
   3. PRELOADER GRAFIK
   ======================================================= */
const imageSources = {
  player: 'assets/01_game/player.png',
  gameplayGut: 'assets/01_game/gameplay.png',
  bgTexture: 'assets/01_game/bg_texture.png',
  bac1: 'assets/01_game/bac1.png',
  bac2: 'assets/01_game/bac2.png',
  bac3: 'assets/01_game/bac3.png',
  bac4: 'assets/01_game/bac4.png',
  bac5: 'assets/01_game/bac5.png',
  bac6: 'assets/01_game/bac6.png',
  txt1: 'assets/01_game/txt1.png',
  txt2: 'assets/01_game/txt2.png',
  txt3: 'assets/01_game/txt3.png',
  txt4: 'assets/01_game/txt4.png',
  txt5: 'assets/01_game/txt5.png',
  txt6: 'assets/01_game/txt6.png',
  txt7: 'assets/01_game/txt7.png',
  txt8: 'assets/01_game/txt8.png',
  txt9: 'assets/01_game/txt9.png'
};

const loadedImages = {};
let totalAssetsToLoad = Object.keys(imageSources).length;
let assetsLoadedCount = 0;

for (const [key, src] of Object.entries(imageSources)) {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    loadedImages[key] = img;
    assetsLoadedCount++;
    if (assetsLoadedCount === totalAssetsToLoad) {
      initGame();
    }
  };
  img.onerror = () => {
    // Awaryjny pusty obiekt w razie błędu ładowania pojedynczego pliku
    loadedImages[key] = new Image();
    assetsLoadedCount++;
    if (assetsLoadedCount === totalAssetsToLoad) {
      initGame();
    }
  };
}

/* =======================================================
   4. SILNIK GRY, FIZYKA I SKALOWANIE PŁÓTNA
   ======================================================= */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('game-stage');

// Wymiary bazowe zgodne z wytycznymi zadania (360x640 px)
const V_WIDTH = 360;
const V_HEIGHT = 640;

let scaleFactor = 1;
let gameState = 'START'; // Dostępne stany: 'START' | 'PLAYING' | 'FAIL' | 'WIN'
let animationFrameId = null;

// Stałe fizyki ruchu postaci
const GRAVITY = 0.38;
const JUMP_VELOCITY = -6.8;
const HORIZONTAL_SPEED = 2.4;

// Parametry gracza (x jest stałe, porusza się tylko w pionie)
const player = {
  x: 75,
  y: 280,
  radius: 20, // Promień kolizji dopasowany tak, by unikać niesprawiedliwych zderzeń
  vy: 0,
  width: 48,
  height: 48,
  rotation: 0
};

let obstacles = [];
let passedObstaclesCount = 0;
let gutOffset = 0;

// Responsywne skalowanie płótna z uwzględnieniem gęstości pikseli (DPR)
function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  scaleFactor = canvas.width / V_WIDTH;
  ctx.setTransform(dpr * (rect.width / V_WIDTH), 0, 0, dpr * (rect.height / V_HEIGHT), 0, 0);
}
window.addEventListener('resize', resizeCanvas);

// Generowanie listy 15 unikalnych przeszkód (każda pojawia się dokładnie 1 raz na rundę)
function buildObstaclesList() {
  const items = [
    { key: 'bac1', yPos: 160 },
    { key: 'txt1', yPos: 380 },
    { key: 'bac2', yPos: 140 },
    { key: 'txt2', yPos: 390 },
    { key: 'bac3', yPos: 410 },
    { key: 'txt3', yPos: 150 },
    { key: 'bac4', yPos: 400 },
    { key: 'txt4', yPos: 160 },
    { key: 'bac5', yPos: 240 },
    { key: 'txt5', yPos: 370 },
    { key: 'bac6', yPos: 170 },
    { key: 'txt6', yPos: 380 },
    { key: 'txt7', yPos: 150 },
    { key: 'txt8', yPos: 390 },
    { key: 'txt9', yPos: 250 }
  ];

  // Odstęp startowy 460px daje graczowi chwilę na przygotowanie ("get ready moment")
  let currentX = 460;
  const GAP = 260;

  return items.map((item, index) => {
    const obs = {
      id: index,
      key: item.key,
      x: currentX,
      y: item.yPos,
      passed: false,
      img: loadedImages[item.key]
    };
    currentX += GAP;
    return obs;
  });
}

function initGame() {
  resizeCanvas();
  setupStartScreenAnimations();
}

// Start nowej rozgrywki
function startRun() {
  if (!audioUnlocked) audioUnlocked = true;
  if (!isMuted) {
    sounds.bgm.currentTime = 0;
    sounds.bgm.play().catch(() => {});
  }

  gameState = 'PLAYING';
  player.y = 280;
  player.vy = 0;
  player.rotation = 0;
  gutOffset = 0;
  passedObstaclesCount = 0;
  obstacles = buildObstaclesList();

  // Ukrycie wszystkich nakładek
  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('fail-screen').classList.remove('active');
  document.getElementById('win-screen').classList.remove('active');
  
  const hud = document.getElementById('hud-score');
  hud.style.opacity = '1';
  hud.textContent = `Przeszkody: 0 / 15`;

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  lastTimestamp = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Reakcja na tapnięcie gracza (skok)
function handleTap() {
  if (gameState === 'START') {
    startRun();
  } else if (gameState === 'PLAYING') {
    player.vy = JUMP_VELOCITY;
    if (!prefersReducedMotion) {
      gsap.to(player, { rotation: -0.35, duration: 0.12, ease: "power1.out" });
    }
  }
}

stage.addEventListener('pointerdown', (e) => {
  // Ignorujemy tapnięcia w przyciski funkcyjne
  if (e.target.closest('.mute-btn') || e.target.closest('.btn-cta') || e.target.closest('.btn-replay')) return;
  handleTap();
});

// Przycisk restartu po przegranej
document.getElementById('btn-replay').addEventListener('click', (e) => {
  e.stopPropagation();
  startRun();
});

/* =======================================================
   5. GŁÓWNA PĘTLA ROZGRYWKI (PHYSICS & RENDER)
   ======================================================= */
let lastTimestamp = 0;

function gameLoop(timestamp) {
  if (gameState !== 'PLAYING') return;

  const dt = Math.min((timestamp - lastTimestamp) / 16.66, 2.5);
  lastTimestamp = timestamp;

  // 1. Aktualizacja fizyki gracza
  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  
  if (!prefersReducedMotion && player.vy > 0) {
    player.rotation = Math.min(player.rotation + 0.02 * dt, 0.45);
  }

  // 2. Granice planszy (górna i dolna ścianka jelita)
  const TOP_BOUND = 85;
  const BOTTOM_BOUND = 555;

  if (player.y - player.radius <= TOP_BOUND || player.y + player.radius >= BOTTOM_BOUND) {
    triggerGameOver(false);
    return;
  }

  // 3. Przesuwanie tła jelita i przeszkód
  gutOffset = (gutOffset + HORIZONTAL_SPEED * dt) % V_WIDTH;
  let allPassed = true;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    obs.x -= HORIZONTAL_SPEED * dt;

    // Aktualizacja wyniku po minięciu przeszkody
    if (!obs.passed && obs.x + 30 < player.x) {
      obs.passed = true;
      passedObstaclesCount++;
      document.getElementById('hud-score').textContent = `Przeszkody: ${passedObstaclesCount} / 15`;
    }

    if (!obs.passed) allPassed = false;

    // Sprawdzenie kolizji ze strefą bezpieczeństwa
    if (checkCollision(player, obs)) {
      triggerGameOver(false);
      return;
    }
  }

  // Warunek wygranej: minięcie wszystkich 15 przeszkód
  if (allPassed && obstacles[obstacles.length - 1].x < -120) {
    triggerGameOver(true);
    return;
  }

  renderScene();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// Wykrywanie kolizji ze zmniejszonym wewnętrznym obrysem (zapobiega przypadkowym uderzeniom)
function checkCollision(p, obs) {
  if (!obs.img) return false;
  const w = (obs.img.naturalWidth || 80) * 0.45;
  const h = (obs.img.naturalHeight || 80) * 0.45;
  
  const obsX = obs.x - w / 2;
  const obsY = obs.y - h / 2;

  // Bezpieczny margines 14% z każdej strony
  const marginX = w * 0.14;
  const marginY = h * 0.14;
  const boxLeft = obsX + marginX;
  const boxRight = obsX + w - marginX;
  const boxTop = obsY + marginY;
  const boxBottom = obsY + h - marginY;

  const closestX = Math.max(boxLeft, Math.min(p.x, boxRight));
  const closestY = Math.max(boxTop, Math.min(p.y, boxBottom));

  const distX = p.x - closestX;
  const distY = p.y - closestY;
  const distSq = (distX * distX) + (distY * distY);

  return distSq < (p.radius * p.radius * 0.85);
}

// Rysowanie klatki na canvasie
function renderScene() {
  ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

  // Płynne przewijanie tła jelita
  if (loadedImages.gameplayGut) {
    const gutImg = loadedImages.gameplayGut;
    ctx.drawImage(gutImg, -gutOffset, 0, V_WIDTH, V_HEIGHT);
    ctx.drawImage(gutImg, -gutOffset + V_WIDTH, 0, V_WIDTH, V_HEIGHT);
  }

  // Rysowanie przeszkód
  for (const obs of obstacles) {
    if (obs.x < -150 || obs.x > V_WIDTH + 150) continue;
    if (obs.img) {
      const w = (obs.img.naturalWidth || 80) * 0.45;
      const h = (obs.img.naturalHeight || 80) * 0.45;
      ctx.drawImage(obs.img, obs.x - w / 2, obs.y - h / 2, w, h);

      // Opcjonalne rysowanie hitboxów w trybie ?debug=1
      if (isDebug) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(obs.x - w * 0.36, obs.y - h * 0.36, w * 0.72, h * 0.72);
      }
    }
  }

  // Rysowanie postaci gracza
  if (loadedImages.player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.rotation);
    const pw = player.width;
    const ph = player.height;
    ctx.drawImage(loadedImages.player, -pw / 2, -ph / 2, pw, ph);

    if (isDebug) {
      ctx.beginPath();
      ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* =======================================================
   6. OBSŁUGA KOŃCA GRY (FAIL / WIN) I ANIMACJE GSAP
   ======================================================= */
function triggerGameOver(isWin) {
  gameState = isWin ? 'WIN' : 'FAIL';
  cancelAnimationFrame(animationFrameId);
  sounds.bgm.pause();
  document.getElementById('hud-score').style.opacity = '0';

  if (isWin) {
    playSound(sounds.winApplause);
    setTimeout(() => playSound(sounds.winCheer), 350);
    showWinEndcard();
  } else {
    playSound(sounds.crash);
    setTimeout(() => playSound(sounds.fail), 400);
    showFailEndcard();
  }
}

// Wyświetlenie karty przegranej
function showFailEndcard() {
  const screen = document.getElementById('fail-screen');
  screen.classList.add('active');

  if (prefersReducedMotion) return;

  gsap.fromTo('#fail-avatar', 
    { y: -30, opacity: 0, scale: 0.8 }, 
    { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
  );
  gsap.fromTo('#fail-screen .endcard-headline', 
    { opacity: 0, y: 15 }, 
    { opacity: 1, y: 0, duration: 0.5, delay: 0.2, ease: "power2.out" }
  );
  gsap.fromTo('#fail-cta', 
    { scale: 0.8, opacity: 0 }, 
    { scale: 1, opacity: 1, duration: 0.45, delay: 0.35, ease: "elastic.out(1, 0.7)" }
  );
  gsap.fromTo('#btn-replay', 
    { opacity: 0, y: 10 }, 
    { opacity: 1, y: 0, duration: 0.4, delay: 0.5, ease: "power1.out" }
  );
}

// Wyświetlenie karty wygranej
function showWinEndcard() {
  const screen = document.getElementById('win-screen');
  screen.classList.add('active');

  if (prefersReducedMotion) return;

  gsap.fromTo('#win-confetti', 
    { opacity: 0, scale: 1.15 }, 
    { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
  );
  gsap.fromTo('#win-avatar', 
    { scale: 0, rotation: -20 }, 
    { scale: 1, rotation: 0, duration: 0.7, ease: "elastic.out(1, 0.6)" }
  );
  gsap.fromTo('#win-screen .endcard-headline', 
    { opacity: 0, y: 15 }, 
    { opacity: 1, y: 0, duration: 0.5, delay: 0.25, ease: "power2.out" }
  );
  gsap.fromTo('#win-cta', 
    { scale: 0.85, opacity: 0 }, 
    { scale: 1, opacity: 1, duration: 0.5, delay: 0.4, ease: "back.out(1.8)" }
  );

  // Delikatne pulsowanie przycisku CTA po wygranej
  gsap.to('#win-cta', {
    scale: 1.04,
    duration: 0.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    delay: 0.9
  });
}

// Animacja podskakiwania dłoni na ekranie powitalnym
function setupStartScreenAnimations() {
  if (prefersReducedMotion) return;

  gsap.to('#start-gesture', {
    y: -12,
    duration: 0.65,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });
}