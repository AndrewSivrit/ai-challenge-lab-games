const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const musicBtn = document.getElementById("musicBtn");

const W = 960, H = 540;
const GRAV = 1800;
const MOVE = 260;
const JUMP = 620;

const keys = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if ((e.code === "Enter" || e.code === "Space") && screen !== "play") {
    e.preventDefault();
    beginGame();
  }
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });

let screen = "title";
let lives = 3;
let score = 0;
let levelIndex = 0;
let player, entities, camX, invuln, levelTime, toast, toastT;
let musicWanted = true;
let jumpHeld = false;

function solid(x, y, w, h) { return { x, y, w, h, kind: "solid" }; }
function coin(x, y) { return { x, y, w: 18, h: 18, kind: "coin", alive: true }; }
function enemy(x, y, minX, maxX, speed) {
  return { x, y, w: 28, h: 26, kind: "enemy", minX, maxX, speed, dir: 1, baseY: y };
}
function goal(x, y) { return { x, y, w: 28, h: 64, kind: "goal" }; }
function spike(x, y, w) { return { x, y, w, h: 16, kind: "spike" }; }

const LEVELS = [
  {
    name: "Dusk Path",
    sky: ["#2c3e6b", "#f08a4b"],
    spawn: { x: 40, y: 360 },
    solids: [
      solid(0, 480, 520, 60),
      solid(620, 480, 200, 60),
      solid(860, 440, 220, 100),
      solid(220, 400, 130, 18),
      solid(400, 330, 120, 18),
      solid(560, 360, 140, 18),
      solid(760, 300, 100, 18),
      solid(980, 390, 200, 18),
      solid(1240, 330, 180, 18),
      solid(1480, 420, 280, 120)
    ],
    coins: [coin(250, 360), coin(430, 290), coin(600, 320), coin(790, 260), coin(1060, 360), coin(1300, 300)],
    enemies: [enemy(640, 454, 620, 800, 70), enemy(1000, 374, 980, 1140, 80)],
    spikes: [spike(530, 500, 80)],
    goal: goal(1580, 356)
  },
  {
    name: "Cinder Stairs",
    sky: ["#3a2458", "#e06a4a"],
    spawn: { x: 30, y: 400 },
    solids: [
      solid(0, 470, 280, 70),
      solid(360, 400, 140, 18),
      solid(450, 330, 150, 18),
      solid(640, 270, 140, 18),
      solid(500, 470, 180, 70),
      solid(760, 430, 160, 18),
      solid(980, 370, 120, 18),
      solid(1160, 310, 140, 18),
      solid(900, 500, 400, 40),
      solid(1380, 420, 160, 18),
      solid(1580, 350, 200, 190)
    ],
    coins: [coin(310, 360), coin(470, 300), coin(650, 250), coin(800, 390), coin(1020, 330), coin(1200, 270), coin(1420, 380)],
    enemies: [enemy(520, 444, 500, 660, 90), enemy(920, 474, 900, 1260, 100), enemy(1400, 394, 1380, 1500, 70)],
    spikes: [spike(720, 484, 50), spike(1100, 484, 40)],
    goal: goal(1700, 286)
  },
  {
    name: "Beacon Peak",
    sky: ["#1a2744", "#6ec4d8"],
    spawn: { x: 40, y: 400 },
    solids: [
      solid(0, 480, 260, 60),
      solid(300, 410, 170, 18),
      solid(500, 340, 160, 18),
      solid(690, 280, 150, 18),
      solid(500, 500, 360, 40),
      solid(860, 420, 140, 18),
      solid(1060, 350, 120, 18),
      solid(1240, 280, 100, 18),
      solid(1400, 360, 140, 18),
      solid(1580, 300, 120, 18),
      solid(1740, 400, 260, 140)
    ],
    coins: [coin(370, 380), coin(550, 320), coin(710, 260), coin(900, 380), coin(1100, 310), coin(1270, 240), coin(1440, 320), coin(1620, 260)],
    enemies: [enemy(360, 394, 340, 430, 60), enemy(520, 474, 500, 820, 110), enemy(1080, 324, 1060, 1160, 75), enemy(1420, 334, 1400, 1520, 85)],
    spikes: [spike(270, 464, 60), spike(940, 484, 80)],
    goal: goal(1900, 336)
  }
];

function loadLevel(i) {
  const L = LEVELS[i];
  player = { x: L.spawn.x, y: L.spawn.y, w: 26, h: 36, vx: 0, vy: 0, onGround: false, facing: 1 };
  entities = {
    solids: L.solids.map(s => Object.assign({}, s)),
    coins: L.coins.map(c => Object.assign({}, c, { alive: true })),
    enemies: L.enemies.map(e => Object.assign({}, e)),
    spikes: L.spikes.map(s => Object.assign({}, s)),
    goal: Object.assign({}, L.goal)
  };
  camX = 0;
  invuln = 0;
  levelTime = 0;
  toast = L.name;
  toastT = 2.2;
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hurt() {
  if (invuln > 0 || screen !== "play") return;
  lives--;
  invuln = 1.2;
  player.vy = -280;
  player.vx = -player.facing * 160;
  AudioSys.sfx(lives <= 0 ? "over" : "hurt");
  if (lives <= 0) {
    screen = "over";
    AudioSys.stopMusic();
    startBtn.classList.remove("hidden");
    startBtn.textContent = "Restart";
  }
}

function update(dt) {
  if (screen !== "play") return;
  levelTime += dt;
  if (toastT > 0) toastT -= dt;
  if (invuln > 0) invuln -= dt;

  const left = keys.ArrowLeft || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;
  const jump = keys.Space || keys.ArrowUp || keys.KeyW;
  player.vx = (right ? MOVE : 0) - (left ? MOVE : 0);
  if (player.vx) player.facing = player.vx > 0 ? 1 : -1;
  if (jump && player.onGround && !jumpHeld) {
    player.vy = -JUMP;
    player.onGround = false;
    AudioSys.sfx("jump");
  }
  jumpHeld = !!jump;
  player.vy += GRAV * dt;
  if (player.vy > 900) player.vy = 900;

  player.x += player.vx * dt;
  for (const s of entities.solids) {
    if (!aabb(player, s)) continue;
    if (player.vx > 0) player.x = s.x - player.w;
    else if (player.vx < 0) player.x = s.x + s.w;
  }
  player.y += player.vy * dt;
  player.onGround = false;
  for (const s of entities.solids) {
    if (!aabb(player, s)) continue;
    if (player.vy > 0) {
      player.y = s.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (player.vy < 0) {
      player.y = s.y + s.h;
      player.vy = 0;
    }
  }

  if (player.y > H + 80) hurt();

  for (const c of entities.coins) {
    if (c.alive && aabb(player, c)) {
      c.alive = false;
      score += 100;
      AudioSys.sfx("coin");
    }
  }
  for (const e of entities.enemies) {
    e.x += e.dir * e.speed * dt;
    if (e.x < e.minX) { e.x = e.minX; e.dir = 1; }
    if (e.x + e.w > e.maxX) { e.x = e.maxX - e.w; e.dir = -1; }
    e.y = e.baseY + Math.sin(levelTime * 4 + e.x) * 2;
    if (aabb(player, e)) hurt();
  }
  for (const s of entities.spikes) if (aabb(player, s)) hurt();

  const g = entities.goal;
  if (aabb(player, g)) {
    if (levelIndex < LEVELS.length - 1) {
      AudioSys.sfx("level");
      levelIndex++;
      loadLevel(levelIndex);
    } else {
      AudioSys.sfx("win");
      AudioSys.stopMusic();
      screen = "win";
      startBtn.classList.remove("hidden");
      startBtn.textContent = "Play Again";
    }
  }

  const target = player.x - 280;
  camX += (target - camX) * Math.min(1, dt * 6);
  if (camX < 0) camX = 0;
}

function sky() {
  const L = LEVELS[levelIndex] || LEVELS[0];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, L.sky[0]);
  g.addColorStop(1, L.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,230,160,0.15)";
  for (let i = 0; i < 8; i++) {
    const x = ((i * 180 - camX * 0.2) % (W + 80) + W + 80) % (W + 80) - 40;
    ctx.beginPath();
    ctx.arc(x, 70 + (i % 3) * 28, 18 + (i % 4) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlayer() {
  const x = player.x - camX, y = player.y;
  const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0;
  if (blink) return;
  ctx.fillStyle = "#2b2118";
  ctx.fillRect(x + 4, y + 30, 7, 6);
  ctx.fillRect(x + 15, y + 30, 7, 6);
  ctx.fillStyle = "#3d7ea6";
  ctx.fillRect(x + 4, y + 14, 18, 18);
  ctx.fillStyle = "#f2c7a0";
  ctx.fillRect(x + 6, y + 2, 14, 14);
  ctx.fillStyle = "#1b1b1b";
  const ex = player.facing > 0 ? 14 : 8;
  ctx.fillRect(x + ex, y + 7, 3, 3);
  ctx.fillStyle = "#ffe27a";
  ctx.fillRect(x + (player.facing > 0 ? 18 : 2), y + 16, 8, 6);
}

function draw() {
  sky();
  if (screen === "title" || screen === "over" || screen === "win") {
    drawOverlay();
    return;
  }
  ctx.save();
  for (const s of entities.solids) {
    const x = s.x - camX;
    ctx.fillStyle = "#5c4634";
    ctx.fillRect(x, s.y, s.w, s.h);
    ctx.fillStyle = "#7d9a4e";
    ctx.fillRect(x, s.y, s.w, 6);
  }
  for (const s of entities.spikes) {
    ctx.fillStyle = "#e8e8f0";
    const x = s.x - camX;
    for (let i = 0; i < s.w; i += 12) {
      ctx.beginPath();
      ctx.moveTo(x + i, s.y + s.h);
      ctx.lineTo(x + i + 6, s.y);
      ctx.lineTo(x + i + 12, s.y + s.h);
      ctx.fill();
    }
  }
  for (const c of entities.coins) {
    if (!c.alive) continue;
    ctx.fillStyle = "#ffd24a";
    ctx.beginPath();
    ctx.arc(c.x - camX + 9, c.y + 9 + Math.sin(levelTime * 6) * 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b8860b";
    ctx.fillRect(c.x - camX + 7, c.y + 4, 3, 10);
  }
  for (const e of entities.enemies) {
    const x = e.x - camX;
    ctx.fillStyle = "#6b2d4a";
    ctx.fillRect(x, e.y + 8, e.w, e.h - 8);
    ctx.fillStyle = "#c45c26";
    ctx.beginPath();
    ctx.arc(x + 14, e.y + 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 8, e.y + 7, 3, 3);
    ctx.fillRect(x + 16, e.y + 7, 3, 3);
  }
  const g = entities.goal;
  ctx.fillStyle = "#efe6d0";
  ctx.fillRect(g.x - camX + 12, g.y, 4, g.h);
  ctx.fillStyle = "#e23b3b";
  ctx.beginPath();
  ctx.moveTo(g.x - camX + 16, g.y + 4);
  ctx.lineTo(g.x - camX + 40, g.y + 14);
  ctx.lineTo(g.x - camX + 16, g.y + 24);
  ctx.fill();
  drawPlayer();
  ctx.restore();

  ctx.fillStyle = "#fff8e8";
  ctx.font = "18px Courier New";
  ctx.fillText("SCORE " + score, 16, 28);
  ctx.fillText("LIVES " + lives, 180, 28);
  ctx.fillText("LEVEL " + (levelIndex + 1) + "/3  " + LEVELS[levelIndex].name, 340, 28);
  if (toastT > 0) {
    ctx.font = "28px Courier New";
    ctx.fillText(toast, W / 2 - ctx.measureText(toast).width / 2, 80);
  }
}

function drawOverlay() {
  ctx.fillStyle = "rgba(10,8,16,0.45)";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#ffe27a";
  ctx.textAlign = "center";
  ctx.font = "56px Courier New";
  if (screen === "title") {
    ctx.fillText("LANTERN RIDGE", W / 2, 180);
    ctx.font = "18px Courier New";
    ctx.fillStyle = "#f4efe4";
    ctx.fillText("Carry the lantern to the beacon.", W / 2, 230);
    ctx.fillText("Arrows / A D to move   Space to jump", W / 2, 270);
    ctx.fillText("Collect coins. Avoid crawlers and spikes.", W / 2, 300);
  } else if (screen === "over") {
    ctx.fillText("GAME OVER", W / 2, 200);
    ctx.font = "20px Courier New";
    ctx.fillStyle = "#f4efe4";
    ctx.fillText("Score " + score, W / 2, 250);
  } else {
    ctx.fillText("BEACON LIT", W / 2, 190);
    ctx.font = "20px Courier New";
    ctx.fillStyle = "#f4efe4";
    ctx.fillText("You reached the ridge. Score " + score, W / 2, 240);
  }
  ctx.textAlign = "left";
}

function beginGame() {
  AudioSys.ensure();
  AudioSys.resume();
  AudioSys.setMusic(musicWanted);
  lives = 3;
  score = 0;
  levelIndex = 0;
  screen = "play";
  loadLevel(0);
  AudioSys.stopMusic();
  if (musicWanted) AudioSys.startMusic();
  startBtn.classList.add("hidden");
}

startBtn.addEventListener("click", beginGame);
musicBtn.addEventListener("click", () => {
  musicWanted = !musicWanted;
  AudioSys.ensure();
  AudioSys.resume();
  AudioSys.setMusic(musicWanted);
  musicBtn.textContent = musicWanted ? "Music: ON" : "Music: OFF";
  musicBtn.setAttribute("aria-pressed", musicWanted ? "true" : "false");
  if (screen === "play") {
    if (musicWanted) AudioSys.startMusic();
    else AudioSys.stopMusic();
  }
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
