// Star Knight: Gem Odyssey
// Complete 2D Platformer Engine with 3 Levels, Enemies, Hazards, and Polished Visuals

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game States
const STATE_TITLE = 0;
const STATE_PLAYING = 1;
const STATE_LEVEL_COMPLETE = 2;
const STATE_GAME_OVER = 3;
const STATE_VICTORY = 4;

let gameState = STATE_TITLE;
let currentLevelIndex = 0;
let score = 0;
let lives = 3;
let timer = 0;
let transitionTimer = 0;

// Camera
let cameraX = 0;

// Input management
const keys = {
  left: false,
  right: false,
  up: false,
  jump: false,
  jumpPressed: false
};

window.addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (!keys.jump) keys.jumpPressed = true;
    keys.jump = true;
  }
  if (e.code === 'KeyR') {
    if (gameState === STATE_GAME_OVER || gameState === STATE_VICTORY) {
      restartFullGame();
    }
  }
  if (e.code === 'KeyM') {
    toggleMusicButton();
  }
  if (e.code === 'Enter' || e.code === 'Space') {
    if (gameState === STATE_TITLE) {
      startGame();
    } else if (gameState === STATE_GAME_OVER || gameState === STATE_VICTORY) {
      restartFullGame();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    keys.jump = false;
    keys.jumpPressed = false;
  }
});
// Audio button UI hooks
const musicBtn = document.getElementById('music-toggle');
const sfxBtn = document.getElementById('sfx-toggle');

function toggleMusicButton() {
  audio.init();
  const enabled = audio.toggleMusic();
  musicBtn.textContent = enabled ? '♪ MUSIC: ON' : '♪ MUSIC: OFF';
  musicBtn.classList.toggle('muted', !enabled);
}

musicBtn.addEventListener('click', () => {
  toggleMusicButton();
});

sfxBtn.addEventListener('click', () => {
  audio.init();
  const enabled = audio.toggleSfx();
  sfxBtn.textContent = enabled ? '🔊 SFX: ON' : '🔊 SFX: OFF';
  sfxBtn.classList.toggle('muted', !enabled);
});

// Particles System for jump dust, coin sparkle, hit sparks
let particles = [];
function addSparkles(x, y, count = 8, color = '#ffd13b') {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 1,
      size: Math.random() * 4 + 2,
      color,
      life: 1.0,
      decay: Math.random() * 0.04 + 0.03
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15; // gravity on particles
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - cameraX, p.y, p.size, p.size);
    ctx.restore();
  }
}
// Player Object
const player = {
  x: 60,
  y: 300,
  w: 24,
  h: 32,
  vx: 0,
  vy: 0,
  speed: 4.2,
  jumpStrength: -10.5,
  gravity: 0.48,
  grounded: false,
  facing: 1, // 1 = right, -1 = left
  animFrame: 0,
  animTimer: 0,
  invulnerableTimer: 0,
  coyoteTimer: 0, // friendly jumping tolerance

  reset(x = 60, y = 300) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = false;
    this.facing = 1;
    this.invulnerableTimer = 0;
    this.coyoteTimer = 0;
  },

  update(platforms) {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer--;
    }

    // Horizontal control
    let moveDir = 0;
    if (keys.left) moveDir -= 1;
    if (keys.right) moveDir += 1;

    if (moveDir !== 0) {
      this.vx = moveDir * this.speed;
      this.facing = moveDir;
      this.animTimer++;
      if (this.animTimer > 6) {
        this.animFrame = (this.animFrame + 1) % 4;
        this.animTimer = 0;
      }
    } else {
      this.vx = 0;
      this.animFrame = 0;
    }

    // Jump handling with coyote time
    if (this.grounded) {
      this.coyoteTimer = 6;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    if (keys.jumpPressed && (this.grounded || this.coyoteTimer > 0)) {
      this.vy = this.jumpStrength;
      this.grounded = false;
      this.coyoteTimer = 0;
      keys.jumpPressed = false;
      audio.playJump();
      addSparkles(this.x + this.w / 2, this.y + this.h, 6, '#cbd5e1');
    }

    // Gravity
    this.vy += this.gravity;
    if (this.vy > 12) this.vy = 12;

    // Move X and resolve collisions
    this.x += this.vx;
    for (const p of platforms) {
      if (checkRectOverlap(this, p)) {
        if (this.vx > 0) {
          this.x = p.x - this.w;
        } else if (this.vx < 0) {
          this.x = p.x + p.w;
        }
      }
    }

    // Move Y and resolve collisions
    this.grounded = false;
    this.y += this.vy;
    for (const p of platforms) {
      if (checkRectOverlap(this, p)) {
        if (this.vy > 0) {
          // Landing on platform
          this.y = p.y - this.h;
          this.vy = 0;
          this.grounded = true;
        } else if (this.vy < 0) {
          // Hitting ceiling
          this.y = p.y + p.h;
          this.vy = 0;
        }
      }
    }

    // Prevent moving past start of level
    if (this.x < 0) this.x = 0;

    // Pit hazard / falling out of bounds
    if (this.y > 520) {
      takeDamage(true);
    }
  },

  draw() {
    ctx.save();
    // Flicker when invulnerable
    if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const drawX = Math.round(this.x - cameraX);
    const drawY = Math.round(this.y);

    // Star Knight Sprite (Pixel art style via canvas primitives)
    ctx.translate(drawX + this.w / 2, drawY + this.h / 2);
    ctx.scale(this.facing, 1);

    // Cape
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-10, -4, 6, 16);

    // Armor Body
    ctx.fillStyle = '#2563eb';
    ctx.fillRect(-7, -6, 14, 18);

    // Belt & Gold Accents
    ctx.fillStyle = '#ffd13b';
    ctx.fillRect(-7, 4, 14, 3);
    ctx.fillRect(-3, -2, 6, 6); // Star emblem on chest

    // Helmet & Visor
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-8, -16, 16, 12);
    // Glowing Star Visor
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1, -12, 8, 4);

    // Helmet Star plume
    ctx.fillStyle = '#ffd13b';
    ctx.fillRect(-3, -20, 6, 5);

    // Legs animation
    ctx.fillStyle = '#1e293b';
    if (!this.grounded) {
      // In air jump pose
      ctx.fillRect(-7, 12, 5, 4);
      ctx.fillRect(2, 10, 5, 4);
    } else if (this.vx !== 0) {
      // Run cycle
      const legOffset = Math.sin(this.animFrame * Math.PI / 2) * 4;
      ctx.fillRect(-7 + legOffset, 12, 5, 5);
      ctx.fillRect(2 - legOffset, 12, 5, 5);
    } else {
      // Standing
      ctx.fillRect(-7, 12, 5, 5);
      ctx.fillRect(2, 12, 5, 5);
    }

    ctx.restore();
  }
};

function checkRectOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}
// Levels Definition: 3 distinct, well-crafted levels
// Each level has platforms, obstacles/hazards, moving enemies, coins, and a reachable goal portal
const levels = [
  {
    name: "Level 1: Emerald Ruins",
    theme: { bg: '#0b132b', ground: '#1c2541', top: '#48cae4', accent: '#3a86c8' },
    startX: 60,
    startY: 280,
    width: 2200,
    platforms: [
      // Starting ground
      { x: 0, y: 350, w: 450, h: 70 },
      // Stepping stones
      { x: 520, y: 290, w: 140, h: 22 },
      { x: 720, y: 230, w: 150, h: 22 },
      { x: 930, y: 290, w: 180, h: 22 },
      // Elevated ruin section
      { x: 1180, y: 240, w: 220, h: 22 },
      { x: 1470, y: 190, w: 160, h: 22 },
      { x: 1700, y: 260, w: 180, h: 22 },
      // Goal platform
      { x: 1950, y: 340, w: 250, h: 80 }
    ],
    hazards: [
      // Stationary crystal spikes in gaps
      { x: 450, y: 400, w: 70, h: 20 },
      { x: 870, y: 400, w: 60, h: 20 },
      { x: 1110, y: 400, w: 70, h: 20 },
      { x: 1630, y: 400, w: 70, h: 20 }
    ],
    enemies: [
      // Patrol slime/bug
      { x: 260, y: 322, w: 28, h: 28, vx: 1.5, minX: 180, maxX: 420, type: 'slime' },
      { x: 1220, y: 212, w: 28, h: 28, vx: 1.8, minX: 1190, maxX: 1380, type: 'slime' },
      { x: 1720, y: 232, w: 28, h: 28, vx: 1.5, minX: 1710, maxX: 1860, type: 'slime' }
    ],
    coins: [
      { x: 200, y: 300, collected: false },
      { x: 300, y: 300, collected: false },
      { x: 580, y: 240, collected: false },
      { x: 780, y: 180, collected: false },
      { x: 1010, y: 240, collected: false },
      { x: 1280, y: 190, collected: false },
      { x: 1540, y: 140, collected: false },
      { x: 1780, y: 210, collected: false },
      { x: 2020, y: 280, collected: false }
    ],
    goal: { x: 2100, y: 260, w: 32, h: 80 }
  },
  {
    name: "Level 2: Molten Caverns",
    theme: { bg: '#1c0a0a', ground: '#3d1313', top: '#ff5a36', accent: '#991b1b' },
    startX: 60,
    startY: 320,
    width: 2400,
    platforms: [
      { x: 0, y: 400, w: 350, h: 80 },
      // Ascending volcanic bridges
      { x: 420, y: 340, w: 120, h: 24 },
      { x: 610, y: 280, w: 130, h: 24 },
      { x: 810, y: 220, w: 140, h: 24 },
      // Middle drop & jump
      { x: 1020, y: 320, w: 200, h: 24 },
      { x: 1280, y: 260, w: 130, h: 24 },
      { x: 1480, y: 200, w: 150, h: 24 },
      { x: 1700, y: 280, w: 140, h: 24 },
      { x: 1920, y: 340, w: 150, h: 24 },
      // Final platform
      { x: 2140, y: 380, w: 260, h: 100 }
    ],
    hazards: [
      // Lava pits below
      { x: 350, y: 450, w: 70, h: 30, type: 'lava' },
      { x: 540, y: 450, w: 70, h: 30, type: 'lava' },
      { x: 740, y: 450, w: 70, h: 30, type: 'lava' },
      { x: 950, y: 450, w: 70, h: 30, type: 'lava' },
      { x: 1220, y: 450, w: 60, h: 30, type: 'lava' },
      { x: 1410, y: 450, w: 70, h: 30, type: 'lava' },
      { x: 1630, y: 450, w: 70, h: 30, type: 'lava' },
      { x: 1840, y: 450, w: 80, h: 30, type: 'lava' },
      { x: 2070, y: 450, w: 70, h: 30, type: 'lava' },
      // Flying fire hazard (vertical moving fireball)
      { x: 1110, y: 160, w: 22, h: 22, vy: 2.2, minY: 140, maxY: 300, isMovingHazard: true }
    ],
    enemies: [
      { x: 160, y: 372, w: 28, h: 28, vx: 2.0, minX: 80, maxX: 320, type: 'magma' },
      { x: 630, y: 252, w: 28, h: 28, vx: 1.6, minX: 620, maxX: 720, type: 'magma' },
      { x: 1040, y: 292, w: 28, h: 28, vx: 1.8, minX: 1030, maxX: 1200, type: 'magma' },
      { x: 1500, y: 172, w: 28, h: 28, vx: 1.5, minX: 1490, maxX: 1610, type: 'magma' },
      { x: 1940, y: 312, w: 28, h: 28, vx: 1.8, minX: 1930, maxX: 2050, type: 'magma' }
    ],
    coins: [
      { x: 180, y: 350, collected: false },
      { x: 470, y: 290, collected: false },
      { x: 660, y: 230, collected: false },
      { x: 860, y: 170, collected: false },
      { x: 1070, y: 270, collected: false },
      { x: 1330, y: 210, collected: false },
      { x: 1540, y: 150, collected: false },
      { x: 1760, y: 230, collected: false },
      { x: 1980, y: 290, collected: false },
      { x: 2200, y: 330, collected: false }
    ],
    goal: { x: 2300, y: 300, w: 32, h: 80 }
  },
  {
    name: "Level 3: Cosmic Citadel",
    theme: { bg: '#080214', ground: '#1f1338', top: '#c084fc', accent: '#7c3aed' },
    startX: 60,
    startY: 320,
    width: 2600,
    platforms: [
      { x: 0, y: 400, w: 320, h: 80 },
      // High flying cosmic platforms
      { x: 380, y: 320, w: 120, h: 22 },
      { x: 560, y: 250, w: 110, h: 22 },
      { x: 730, y: 190, w: 130, h: 22 },
      { x: 930, y: 260, w: 140, h: 22 },
      { x: 1140, y: 330, w: 180, h: 22 },
      { x: 1390, y: 270, w: 120, h: 22 },
      { x: 1580, y: 200, w: 140, h: 22 },
      { x: 1800, y: 150, w: 120, h: 22 },
      { x: 1980, y: 220, w: 130, h: 22 },
      { x: 2180, y: 300, w: 140, h: 22 },
      // Throne platform
      { x: 2380, y: 380, w: 220, h: 100 }
    ],
    hazards: [
      // Void spikes & cosmic moving laser orbs
      { x: 320, y: 460, w: 60, h: 20 },
      { x: 500, y: 460, w: 60, h: 20 },
      { x: 670, y: 460, w: 60, h: 20 },
      { x: 1200, y: 200, w: 24, h: 24, vy: 2.0, minY: 180, maxY: 310, isMovingHazard: true },
      { x: 1640, y: 100, w: 24, h: 24, vy: 2.2, minY: 90, maxY: 210, isMovingHazard: true }
    ],
    enemies: [
      { x: 140, y: 372, w: 28, h: 28, vx: 2.2, minX: 80, maxX: 290, type: 'drone' },
      { x: 950, y: 232, w: 28, h: 28, vx: 1.8, minX: 940, maxX: 1050, type: 'drone' },
      { x: 1160, y: 302, w: 28, h: 28, vx: 2.0, minX: 1150, maxX: 1300, type: 'drone' },
      { x: 1590, y: 172, w: 28, h: 28, vx: 1.6, minX: 1590, maxX: 1700, type: 'drone' },
      { x: 2190, y: 272, w: 28, h: 28, vx: 2.0, minX: 2190, maxX: 2300, type: 'drone' }
    ],
    coins: [
      { x: 160, y: 350, collected: false },
      { x: 430, y: 270, collected: false },
      { x: 610, y: 200, collected: false },
      { x: 790, y: 140, collected: false },
      { x: 990, y: 210, collected: false },
      { x: 1220, y: 280, collected: false },
      { x: 1440, y: 220, collected: false },
      { x: 1640, y: 150, collected: false },
      { x: 1850, y: 100, collected: false },
      { x: 2030, y: 170, collected: false },
      { x: 2240, y: 250, collected: false },
      { x: 2450, y: 330, collected: false }
    ],
    goal: { x: 2500, y: 300, w: 32, h: 80 }
  }
];

let activeLevel = null;
// Level loader & state controllers
function loadLevel(idx) {
  currentLevelIndex = idx;
  const raw = levels[idx];
  // Deep clone so coins and enemy states are fresh
  activeLevel = {
    name: raw.name,
    theme: raw.theme,
    width: raw.width,
    platforms: raw.platforms.map(p => ({ ...p })),
    hazards: raw.hazards.map(h => ({ ...h })),
    enemies: raw.enemies.map(e => ({ ...e })),
    coins: raw.coins.map(c => ({ ...c })),
    goal: { ...raw.goal }
  };
  player.reset(raw.startX, raw.startY);
  cameraX = 0;
  particles = [];
}

function startGame() {
  audio.init();
  audio.startMusic();
  score = 0;
  lives = 3;
  loadLevel(0);
  gameState = STATE_PLAYING;
}

function restartFullGame() {
  audio.init();
  audio.startMusic();
  score = 0;
  lives = 3;
  loadLevel(0);
  gameState = STATE_PLAYING;
}

function takeDamage(instantKill = false) {
  if (player.invulnerableTimer > 0 && !instantKill) return;

  lives--;
  audio.playHit();
  addSparkles(player.x + player.w / 2, player.y + player.h / 2, 14, '#ef4444');

  if (lives <= 0) {
    gameState = STATE_GAME_OVER;
    audio.stopMusic();
    audio.playGameOver();
  } else {
    // Respawn at level start or safe position with invulnerability
    player.reset(activeLevel.startX || 60, activeLevel.startY || 320);
    player.invulnerableTimer = 90; // 1.5 seconds at 60fps
  }
}
// Game Loop: update & render
function updateGame() {
  timer++;

  if (gameState === STATE_PLAYING) {
    // Update player
    player.update(activeLevel.platforms);

    // Camera follow player smoothly
    const targetCamX = player.x - 280;
    cameraX += (targetCamX - cameraX) * 0.1;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > activeLevel.width - canvas.width) {
      cameraX = activeLevel.width - canvas.width;
    }

    // Update moving hazards
    for (const h of activeLevel.hazards) {
      if (h.isMovingHazard) {
        h.y += h.vy;
        if (h.y <= h.minY || h.y >= h.maxY) {
          h.vy = -h.vy;
        }
      }
      // Check collision with player
      if (checkRectOverlap(player, h)) {
        takeDamage();
      }
    }

    // Update enemies
    for (const e of activeLevel.enemies) {
      e.x += e.vx;
      if (e.x <= e.minX || e.x >= e.maxX) {
        e.vx = -e.vx;
      }
      // Check collision with player
      if (checkRectOverlap(player, e)) {
        // Did player stomp on enemy from above?
        if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 12) {
          // Stomp victory! Bounce player up and defeat enemy
          player.vy = player.jumpStrength * 0.8;
          score += 150;
          audio.playCoin();
          addSparkles(e.x + e.w / 2, e.y + e.h / 2, 12, '#38bdf8');
          // Move enemy offscreen / defeat
          e.y = 9999;
          e.x = -9999;
        } else {
          takeDamage();
        }
      }
    }

    // Check coins
    for (const c of activeLevel.coins) {
      if (!c.collected) {
        const coinBox = { x: c.x - 10, y: c.y - 10, w: 20, h: 20 };
        if (checkRectOverlap(player, coinBox)) {
          c.collected = true;
          score += 100;
          audio.playCoin();
          addSparkles(c.x, c.y, 8, '#ffd13b');
        }
      }
    }

    // Check Goal Portal
    if (checkRectOverlap(player, activeLevel.goal)) {
      if (currentLevelIndex < levels.length - 1) {
        // Next Level!
        audio.playLevelComplete();
        currentLevelIndex++;
        loadLevel(currentLevelIndex);
      } else {
        // Victory!
        gameState = STATE_VICTORY;
        audio.stopMusic();
        audio.playVictory();
      }
    }
  }

  updateParticles();
}
// Rendering Pipeline: Backgrounds, Platforms, Hazards, Enemies, Coins, HUD, Screens
function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === STATE_TITLE) {
    drawTitleScreen();
    return;
  }

  // Active level graphics
  const theme = activeLevel.theme;

  // Parallax starfield / background
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background distant stars / nebula
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  for (let i = 0; i < 40; i++) {
    const starX = ((i * 67 + timer * 0.1) % (canvas.width + 100)) - 50;
    const starY = (i * 37) % 350;
    ctx.fillRect(starX, starY, (i % 3 === 0) ? 2 : 1, (i % 3 === 0) ? 2 : 1);
  }

  // Draw Platforms
  for (const p of activeLevel.platforms) {
    const px = Math.round(p.x - cameraX);
    const py = Math.round(p.y);

    // Platform Top Grass/Glow rim
    ctx.fillStyle = theme.top;
    ctx.fillRect(px, py, p.w, 4);

    // Platform Body
    ctx.fillStyle = theme.ground;
    ctx.fillRect(px, py + 4, p.w, p.h - 4);

    // Brick / Techno texture lines
    ctx.fillStyle = theme.accent;
    for (let bx = px + 16; bx < px + p.w; bx += 32) {
      ctx.fillRect(bx, py + 8, 2, p.h - 12);
    }
  }

  // Draw Hazards (Spikes, Lava, Flying Orbs)
  for (const h of activeLevel.hazards) {
    const hx = Math.round(h.x - cameraX);
    const hy = Math.round(h.y);

    if (h.isMovingHazard) {
      // Fireball / Laser Orb
      ctx.fillStyle = '#ff2200';
      ctx.beginPath();
      ctx.arc(hx + h.w / 2, hy + h.h / 2, h.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd13b';
      ctx.beginPath();
      ctx.arc(hx + h.w / 2, hy + h.h / 2, h.w / 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (h.type === 'lava') {
      // Molten Lava
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(hx, hy, h.w, h.h);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(hx, hy + Math.sin(timer * 0.1 + h.x) * 3, h.w, 4);
    } else {
      // Spikes
      ctx.fillStyle = '#cbd5e1';
      const spikeCount = Math.floor(h.w / 14);
      for (let s = 0; s < spikeCount; s++) {
        ctx.beginPath();
        ctx.moveTo(hx + s * 14, hy + h.h);
        ctx.lineTo(hx + s * 14 + 7, hy);
        ctx.lineTo(hx + s * 14 + 14, hy + h.h);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // Draw Coins (Spinning Golden Stars/Gems)
  for (const c of activeLevel.coins) {
    if (!c.collected) {
      const cx = Math.round(c.x - cameraX);
      const cy = Math.round(c.y + Math.sin(timer * 0.08 + c.x) * 4);
      const scaleX = Math.cos(timer * 0.1 + c.x);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(Math.abs(scaleX) * 0.8 + 0.2, 1);

      ctx.fillStyle = '#ffd13b';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
  }

  // Draw Enemies
  for (const e of activeLevel.enemies) {
    if (e.y > 2000) continue; // defeated
    const ex = Math.round(e.x - cameraX);
    const ey = Math.round(e.y);

    ctx.save();
    ctx.translate(ex + e.w / 2, ey + e.h / 2);
    ctx.scale(e.vx > 0 ? 1 : -1, 1);

    if (e.type === 'slime') {
      // Alien Crystal Slime
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.ellipse(0, 2, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -4, 6, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(4, -2, 3, 3);
    } else if (e.type === 'magma') {
      // Fire Crustacean
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-12, -10, 24, 20);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-8, -6, 16, 12);
      ctx.fillStyle = '#000000';
      ctx.fillRect(2, -4, 4, 4);
    } else {
      // Cosmic Drone
      ctx.fillStyle = '#8b5cf6';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-4, -4, 8, 8);
      // Pulsing thruster
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(-2, 10, 4, 4 + Math.sin(timer * 0.3) * 2);
    }
    ctx.restore();
  }

  // Draw Goal Portal
  const gx = Math.round(activeLevel.goal.x - cameraX);
  const gy = Math.round(activeLevel.goal.y);
  ctx.save();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 4;
  ctx.strokeRect(gx, gy, activeLevel.goal.w, activeLevel.goal.h);
  // Inner shimmering vortex
  const portalGlow = Math.sin(timer * 0.1) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(56, 189, 248, ${portalGlow})`;
  ctx.fillRect(gx + 4, gy + 4, activeLevel.goal.w - 8, activeLevel.goal.h - 8);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('PORTAL', gx - 8, gy - 8);
  ctx.restore();

  // Draw Player
  player.draw();

  // Draw Particles
  drawParticles();

  // Draw HUD Overlay
  drawHUD();

  // Overlay screens if Game Over or Victory
  if (gameState === STATE_GAME_OVER) {
    drawGameOverScreen();
  } else if (gameState === STATE_VICTORY) {
    drawVictoryScreen();
  }
}
// HUD and UI Screens
function drawHUD() {
  ctx.save();
  // Top Banner
  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(10, 10, 780, 36);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, 780, 36);

  ctx.font = 'bold 16px Courier New, monospace';

  // Level name
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(activeLevel.name, 24, 34);

  // Score
  ctx.fillStyle = '#ffd13b';
  ctx.fillText(`SCORE: ${score}`, 360, 34);

  // Lives
  ctx.fillStyle = '#f43f5e';
  let heartsStr = '';
  for (let i = 0; i < lives; i++) heartsStr += '♥ ';
  ctx.fillText(`LIVES: ${heartsStr}`, 640, 34);

  ctx.restore();
}

function drawTitleScreen() {
  // Starfield
  ctx.fillStyle = '#080a14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 60; i++) {
    const sx = (i * 97) % canvas.width;
    const sy = (i * 43 + timer * 0.2) % canvas.height;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(sx, sy, 2, 2);
  }

  ctx.save();
  ctx.textAlign = 'center';

  // Big Glowing Title
  ctx.shadowColor = '#ffd13b';
  ctx.shadowBlur = 15;
  ctx.fillStyle = '#ffd13b';
  ctx.font = 'bold 44px Courier New, monospace';
  ctx.fillText('STAR KNIGHT', canvas.width / 2, 140);

  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px Courier New, monospace';
  ctx.fillText('~ GEM ODYSSEY ~', canvas.width / 2, 185);

  ctx.shadowBlur = 0;

  // Pixel Hero Preview
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(canvas.width / 2 - 12, 205, 24, 32);
  ctx.fillStyle = '#ffd13b';
  ctx.fillRect(canvas.width / 2 - 6, 200, 12, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(canvas.width / 2 - 3, 204, 8, 4);

  // Start Prompt (flashing)
  if (Math.floor(timer / 30) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Courier New, monospace';
    ctx.fillText('PRESS [SPACE] OR CLICK TO START', canvas.width / 2, 275);
  }

  // Feature description
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px Courier New, monospace';
  ctx.fillText('3 Thrilling Levels • Moving Enemies • Authentic Chiptune Music', canvas.width / 2, 312);
  ctx.fillText('Controls: A/D or Arrows to Move | Space to Jump | M to Mute', canvas.width / 2, 336);

  // Clickable Start Button Box
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#ffd13b';
  ctx.lineWidth = 2;
  const btnX = canvas.width / 2 - 120;
  const btnY = 358;
  const btnW = 240;
  const btnH = 38;
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeRect(btnX, btnY, btnW, btnH);

  ctx.fillStyle = '#ffd13b';
  ctx.font = 'bold 16px Courier New, monospace';
  ctx.fillText('★ START GAME ★', canvas.width / 2, 382);

  ctx.restore();
}

function drawGameOverScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 12;
  ctx.font = 'bold 44px Courier New, monospace';
  ctx.fillText('GAME OVER', canvas.width / 2, 180);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 20px Courier New, monospace';
  ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, 235);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Courier New, monospace';
  ctx.fillText('PRESS [SPACE] OR [R] TO RESTART', canvas.width / 2, 310);

  ctx.restore();
}

function drawVictoryScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 15, 30, 0.88)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd13b';
  ctx.shadowColor = '#ffd13b';
  ctx.shadowBlur = 15;
  ctx.font = 'bold 42px Courier New, monospace';
  ctx.fillText('★ VICTORY! ★', canvas.width / 2, 160);

  ctx.shadowBlur = 8;
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px Courier New, monospace';
  ctx.fillText('YOU RESTORED THE COSMIC CITADEL!', canvas.width / 2, 210);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Courier New, monospace';
  ctx.fillText(`FINAL SCORE: ${score}`, canvas.width / 2, 265);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '16px Courier New, monospace';
  ctx.fillText('All 3 Levels Cleared with Valour!', canvas.width / 2, 310);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Courier New, monospace';
  ctx.fillText('PRESS [SPACE] OR [R] TO PLAY AGAIN', canvas.width / 2, 370);

  ctx.restore();
}

// Canvas click to start support
canvas.addEventListener('click', () => {
  if (gameState === STATE_TITLE) {
    startGame();
  } else if (gameState === STATE_GAME_OVER || gameState === STATE_VICTORY) {
    restartFullGame();
  }
});

// Master animation loop
function loop() {
  updateGame();
  drawGame();
  requestAnimationFrame(loop);
}

// Initial kickoff
requestAnimationFrame(loop);
