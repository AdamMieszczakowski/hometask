/* =======================================================
   1. KONFIGURACJA PODSTAWOWA, CLICKTAG I DOSTĘPNOŚĆ
   ======================================================= */
const clickTag = window.clickTag || 'https://example.com/landing';
const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('.btn-cta').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(clickTag, '_blank');
  });
});

/* =======================================================
   2. KONTROLER AUDIO
   ======================================================= */
let isMuted = false;
let audioUnlocked = false;

const sounds = {
  bgm: new Audio('assets/music/background_music/Funny Game Loop.mp3'),
  crash: new Audio('assets/music/crash/Cartoon Crash Boing.mp3'),
  fail: new Audio('assets/music/endcard_fail/Fail.mp3'),
  winApplause: new Audio('assets/music/endcard_win/applause.mp3'),
  winCheer: new Audio('assets/music/endcard_win/Celebrative Happy Woohoo Cheer 2.mp3')
};

sounds.bgm.loop = true;
sounds.bgm.volume = 0.45;
sounds.crash.volume = 0.7;
sounds.fail.volume = 0.65;
sounds.winApplause.volume = 0.6;
sounds.winCheer.volume = 0.65;

function playSound(audio) {
  if (isMuted || !audioUnlocked) return;
  try {
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) playPromise.catch(() => {});
  } catch (err) {}
}

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
    if (assetsLoadedCount === totalAssetsToLoad) initGame();
  };
  img.onerror = () => {
    loadedImages[key] = new Image();
    assetsLoadedCount++;
    if (assetsLoadedCount === totalAssetsToLoad) initGame();
  };
}

/* =======================================================
   4. SILNIK GRY I FIZYKA
   ======================================================= */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const stage = document.getElementById('game-stage');

const V_WIDTH = 360;
const V_HEIGHT = 640;

const TOP_BOUND = 160;
const BOTTOM_BOUND = 560;

let scaleFactor = 1;
let gameState = 'START';
let animationFrameId = null;

const GRAVITY = 0.38;
const JUMP_VELOCITY = -6.8;
const HORIZONTAL_SPEED = 2.4;

const player = {
  x: 75,
  y: 310,
  radius: 17,
  vy: 0,
  width: 46,
  height: 46,
  rotation: 0
};

let obstacles = [];
let passedObstaclesCount = 0;
let gutOffset = 0;

function resizeCanvas() {
  const rect = stage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  scaleFactor = canvas.width / V_WIDTH;
  ctx.setTransform(dpr * (rect.width / V_WIDTH), 0, 0, dpr * (rect.height / V_HEIGHT), 0, 0);
}
window.addEventListener('resize', resizeCanvas);

function buildObstaclesList() {
  const items = [
    { key: 'bac1', yPos: 285 },
    { key: 'txt1', yPos: 430 },
    { key: 'bac2', yPos: 275 },
    { key: 'txt2', yPos: 430 },
    { key: 'bac3', yPos: 435 },
    { key: 'txt3', yPos: 270 },
    { key: 'bac4', yPos: 435 },
    { key: 'txt4', yPos: 270 },
    { key: 'bac5', yPos: 275 },
    { key: 'txt5', yPos: 435 },
    { key: 'bac6', yPos: 270 },
    { key: 'txt6', yPos: 430 },
    { key: 'txt7', yPos: 270 },
    { key: 'txt8', yPos: 435 },
    { key: 'txt9', yPos: 275 }
  ];

  let currentX = 520;
  const GAP = 280;

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

function startRun() {
  if (!audioUnlocked) audioUnlocked = true;
  if (!isMuted) {
    sounds.bgm.currentTime = 0;
    sounds.bgm.play().catch(() => {});
  }

  gameState = 'PLAYING';
  player.y = 310;
  player.vy = 0;
  player.rotation = 0;
  gutOffset = 0;
  passedObstaclesCount = 0;
  obstacles = buildObstaclesList();

  document.getElementById('start-screen').classList.remove('active');
  document.getElementById('fail-screen').classList.remove('active');
  document.getElementById('win-screen').classList.remove('active');
  
  const hud = document.getElementById('hud-score');
  hud.style.opacity = '1';
  hud.textContent = `Hindernisse: 0 / 15`;

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  lastTimestamp = performance.now();
  animationFrameId = requestAnimationFrame(gameLoop);
}

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
  if (e.target.closest('.mute-btn') || e.target.closest('.btn-cta') || e.target.closest('.btn-replay')) return;
  handleTap();
});

document.getElementById('btn-replay').addEventListener('click', (e) => {
  e.stopPropagation();
  startRun();
});

/* =======================================================
   5. PĘTLA RENDEROWANIA I DETEKCJA KOLIZJI
   ======================================================= */
let lastTimestamp = 0;

function gameLoop(timestamp) {
  if (gameState !== 'PLAYING') return;

  const dt = Math.min((timestamp - lastTimestamp) / 16.66, 2.5);
  lastTimestamp = timestamp;

  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  
  if (!prefersReducedMotion && player.vy > 0) {
    player.rotation = Math.min(player.rotation + 0.02 * dt, 0.45);
  }

  if (player.y - player.radius <= TOP_BOUND || player.y + player.radius >= BOTTOM_BOUND) {
    triggerGameOver(false);
    return;
  }

  gutOffset = gutOffset + HORIZONTAL_SPEED * dt;
  let allPassed = true;

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    obs.x -= HORIZONTAL_SPEED * dt;

    if (!obs.passed && obs.x + 30 < player.x) {
      obs.passed = true;
      passedObstaclesCount++;
      document.getElementById('hud-score').textContent = `Hindernisse: ${passedObstaclesCount} / 15`;
    }

    if (!obs.passed) allPassed = false;

    if (checkCollision(player, obs)) {
      triggerGameOver(false);
      return;
    }
  }

  if (allPassed && obstacles[obstacles.length - 1].x < -120) {
    triggerGameOver(true);
    return;
  }

  renderScene();
  animationFrameId = requestAnimationFrame(gameLoop);
}

function checkCollision(p, obs) {
  if (!obs.img) return false;
  
  const isText = obs.key.startsWith('txt');
  const scale = isText ? 0.38 : 0.45;
  const w = (obs.img.naturalWidth || 80) * scale;
  const h = (obs.img.naturalHeight || 80) * scale;
  
  const obsX = obs.x - w / 2;
  const obsY = obs.y - h / 2;

  const marginX = isText ? w * 0.25 : w * 0.15;
  const marginY = isText ? h * 0.20 : h * 0.15;

  const boxLeft = obsX + marginX;
  const boxRight = obsX + w - marginX;
  const boxTop = obsY + marginY;
  const boxBottom = obsY + h - marginY;

  const closestX = Math.max(boxLeft, Math.min(p.x, boxRight));
  const closestY = Math.max(boxTop, Math.min(p.y, boxBottom));

  const distX = p.x - closestX;
  const distY = p.y - closestY;
  const distSq = (distX * distX) + (distY * distY);

  return distSq < (p.radius * p.radius * 0.80);
}

function renderScene() {
  ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

  // 1. Tło z mikroelementami (bg_texture.png)
  if (loadedImages.bgTexture) {
    const bg = loadedImages.bgTexture;
    const bgScale = 0.55;
    const bgW = (bg.naturalWidth || 360) * bgScale;
    const bgH = (bg.naturalHeight || 640) * bgScale;
    const bgOffset = (gutOffset * 0.3) % bgW;
    ctx.globalAlpha = 0.22;
    for (let x = -bgOffset; x < V_WIDTH + bgW; x += bgW) {
      ctx.drawImage(bg, x, 120, bgW, bgH);
    }
    ctx.globalAlpha = 1.0;
  }

  // 2. Korytarz jelita (gameplay.png) z wycięciem mikromarginesu (eliminuje czarną kreskę)
  if (loadedImages.gameplayGut) {
    const gutImg = loadedImages.gameplayGut;
    const nw = gutImg.naturalWidth || 720;
    const nh = gutImg.naturalHeight || 380;
    
    const cropX = 2; // Odcięcie 2px z lewej i prawej strony
    const sWidth = nw - cropX * 2;
    const aspect = sWidth / nh;

    const gutH = 448; 
    const gutW = gutH * aspect;
    const gutY = 130; 

    const startIdx = Math.floor((gutOffset - 100) / gutW);
    const endIdx = startIdx + Math.ceil(V_WIDTH / gutW) + 2;

    for (let i = startIdx; i <= endIdx; i++) {
      const drawX = i * gutW - gutOffset;
      const isMirrored = Math.abs(i % 2) === 1;

      ctx.save();
      if (isMirrored) {
        ctx.translate(drawX + gutW, gutY);
        ctx.scale(-1, 1);
        ctx.drawImage(gutImg, cropX, 0, sWidth, nh, 0, 0, gutW, gutH);
      } else {
        ctx.drawImage(gutImg, cropX, 0, sWidth, nh, drawX, gutY, gutW, gutH);
      }
      ctx.restore();
    }
  }

  // 3. Przeszkody
  for (const obs of obstacles) {
    if (obs.x < -150 || obs.x > V_WIDTH + 150) continue;
    if (obs.img) {
      const isText = obs.key.startsWith('txt');
      const scale = isText ? 0.38 : 0.45;
      const w = (obs.img.naturalWidth || 80) * scale;
      const h = (obs.img.naturalHeight || 80) * scale;
      
      ctx.drawImage(obs.img, obs.x - w / 2, obs.y - h / 2, w, h);

      if (isDebug) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1.5;
        const marginX = isText ? w * 0.25 : w * 0.15;
        const marginY = isText ? h * 0.20 : h * 0.15;
        ctx.strokeRect(obs.x - w / 2 + marginX, obs.y - h / 2 + marginY, w - marginX * 2, h - marginY * 2);
      }
    }
  }

  // 4. Postać gracza
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

  if (isDebug) {
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, TOP_BOUND);
    ctx.lineTo(V_WIDTH, TOP_BOUND);
    ctx.moveTo(0, BOTTOM_BOUND);
    ctx.lineTo(V_WIDTH, BOTTOM_BOUND);
    ctx.stroke();
  }
}

/* =======================================================
   6. OBSŁUGA EKRANÓW KOŃCOWYCH
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

function showFailEndcard() {
  const screen = document.getElementById('fail-screen');
  screen.classList.add('active');

  if (prefersReducedMotion) return;

  gsap.fromTo('#fail-avatar', 
    { y: -25, opacity: 0, scale: 0.8 }, 
    { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" }
  );
  gsap.fromTo('#fail-screen .endcard-headline-img', 
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

function showWinEndcard() {
  const screen = document.getElementById('win-screen');
  screen.classList.add('active');

  if (prefersReducedMotion) return;

  gsap.fromTo('#win-confetti', 
    { opacity: 0, scale: 1.1 }, 
    { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out" }
  );
  gsap.fromTo('#win-avatar', 
    { scale: 0, rotation: -20 }, 
    { scale: 1, rotation: 0, duration: 0.7, ease: "elastic.out(1, 0.6)" }
  );
  gsap.fromTo('#win-screen .endcard-headline-img', 
    { opacity: 0, y: 15 }, 
    { opacity: 1, y: 0, duration: 0.5, delay: 0.25, ease: "power2.out" }
  );
  gsap.fromTo('#win-cta', 
    { scale: 0.85, opacity: 0 }, 
    { scale: 1, opacity: 1, duration: 0.5, delay: 0.4, ease: "back.out(1.8)" }
  );

  gsap.to('#win-cta', {
    scale: 1.04,
    duration: 0.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
    delay: 0.9
  });
}

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