/* ============================================================
   LUMEN RIFT — game engine
   ============================================================ */
(function () {
  'use strict';
  var T = 32, VW = 960, VH = 540;
  var cv = document.getElementById('game');
  var ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var $ = function (id) { return document.getElementById(id); };
  var overlay = $('overlay');

  var G = {
    state: 'title',       // title | playing | paused | levelclear | gameover | victory
    levelIndex: 0,
    score: 0,
    lives: 3,
    totalCoins: 0,
    coins: 0,
    levelCoins: 0,
    levelTotal: 0,
    best: 0
  };

  var level, tiles, solids, coins, enemies, hazards, movers, goal, player, camera;
  var levelTime = 0, shakeT = 0, shakeMag = 0, particles = [], floaties = [], flash = 0;
  var keys = {}, tPrev = 0, acc = 0, STEP = 1 / 120;
  var transitionT = 0, transitionMode = null;

  function now() { return performance.now(); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------- level parsing ---------- */
  function loadLevel(idx) {
    var L = LEVELS[idx];
    var rows = L.map;
    var cols = 0;
    for (var r = 0; r < rows.length; r++) cols = Math.max(cols, rows[r].length);
    var W = cols * T, H = rows.length * T;
    level = { def: L, W: W, H: H, cols: cols, rows: rows.length, name: L.name };
    solids = []; coins = []; enemies = []; hazards = []; movers = []; goal = null;
    var spawn = { x: 2 * T, y: 8 * T };
    for (var y = 0; y < rows.length; y++) {
      var line = rows[y];
      for (var x = 0; x < cols; x++) {
        var c = line.charAt(x);
        var px = x * T, py = y * T;
        if (c === '#') solids.push({ x: px, y: py, w: T, h: T, kind: 'ground' });
        else if (c === '=') solids.push({ x: px, y: py, w: T, h: T, kind: 'platform' });
        else if (c === 'B') solids.push({ x: px, y: py, w: T, h: T, kind: 'bounce' });
        else if (c === '^') hazards.push({ x: px + 5, y: py + 16, w: T - 10, h: T - 16, baseY: py });
        else if (c === 'o') coins.push({ x: px + 8, y: py + 8, w: 16, h: 16, got: false, t: Math.random() * 6 });
        else if (c === 'S') spawn = { x: px + 4, y: py - 18 };
        else if (c === 'G') goal = { x: px, y: py - T, w: T, h: T * 2 };
        else if (c === 'e') enemies.push({ type: 'walker', x: px + 3, y: py - 14, w: 26, h: 46, vx: -58, vy: 0, alive: true, t: Math.random() * 3 });
        else if (c === 'f') enemies.push({ type: 'flyer', x: px + 2, y: py - 14, w: 28, h: 24, vx: -52, vy: 0, alive: true, t: Math.random() * 3, homeY: py - 14 });
        else if (c === '+' || c === '~') {
          movers.push({
            x: px, y: py, w: T * 2.5, h: 14,
            ox: px, oy: py, axis: c === '+' ? 'x' : 'y',
            amp: 96, vx: 0, vy: 0, px: px, py2: py, t: Math.random() * Math.PI * 2, speed: 1.1 + idx * 0.12
          });
        }
      }
    }
    G.levelTotal = coins.length;
    G.levelCoins = 0;
    player = {
      x: spawn.x, y: spawn.y, w: 22, h: 28, vx: 0, vy: 0,
      onGround: false, facing: 1, coyote: 0, jumpBuf: 0, jumpHeld: false,
      invuln: 0, anim: 0, squash: 1, dying: false, deadT: 0, onMover: null
    };
    camera = { x: 0, y: 0 };
    particles.length = 0; floaties.length = 0; levelTime = 0;
    updateCamera(true);
    syncHud();
  }
  function syncHud() {
    $('hudScore').textContent = G.score;
    $('hudLives').textContent = G.lives > 0 ? new Array(G.lives + 1).join('\u2665') : '\u2014';
    $('hudLevel').textContent = (G.levelIndex + 1) + '/' + LEVELS.length;
    $('hudCoins').textContent = G.levelCoins + '/' + G.levelTotal;
  }

  function addParticles(x, y, n, col, spread, life) {
    for (var i = 0; i < n; i++) {
      particles.push({
        x: x, y: y, vx: rnd(-(spread || 120), spread || 120), vy: rnd(-(spread || 120), 40),
        life: life || 0.6, max: life || 0.6, col: col || '#6ff7e8', s: rnd(2, 5)
      });
    }
  }
  function floaty(x, y, text, col) {
    floaties.push({ x: x, y: y, text: text, col: col || '#ffd166', life: 1.0 });
  }
  /* ---------- physics ---------- */
  var GRAV = 2100, MOVE_ACC = 2400, MAX_RUN = 260, FRICTION = 2200, JUMP_V = -660;
  var MAX_FALL = 900;

  function moveWithSolids(e, dt, includeMovers) {
    // horizontal
    e.x += e.vx * dt;
    var list = solids;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (aabb(e, s)) {
        if (e.vx > 0) { e.x = s.x - e.w; } else if (e.vx < 0) { e.x = s.x + s.w; }
        e.vx = 0;
      }
    }
    if (includeMovers) {
      for (var m = 0; m < movers.length; m++) {
        var mv = { x: movers[m].x, y: movers[m].y, w: movers[m].w, h: movers[m].h };
        if (aabb(e, mv)) {
          if (e.vy >= 0 && e.y + e.h - e.vy * dt <= mv.y + 10) {
            e.y = mv.y - e.h; e.vy = 0; e.onGround = true; e.onMover = movers[m];
          }
        }
      }
    }
    // vertical
    e.y += e.vy * dt;
    e.onGround = false;
    for (var j = 0; j < solids.length; j++) {
      var t2 = solids[j];
      if (aabb(e, t2)) {
        if (e.vy > 0) { e.y = t2.y - e.h; e.vy = 0; e.onGround = true; e.groundKind = t2.kind; }
        else if (e.vy < 0) { e.y = t2.y + t2.h; e.vy = 0; }
      }
    }
    if (includeMovers) {
      for (var k = 0; k < movers.length; k++) {
        var mv2 = movers[k];
        if (e.x + e.w > mv2.x + 2 && e.x < mv2.x + mv2.w - 2) {
          var prevBottom = e.y + e.h - e.vy * dt;
          if (e.vy >= 0 && prevBottom <= mv2.y + 6 && e.y + e.h >= mv2.y && e.y + e.h <= mv2.y + 18) {
            e.y = mv2.y - e.h; e.vy = 0; e.onGround = true; e.onMover = mv2; e.groundKind = 'mover';
          }
        }
      }
    }
  }
  /* ---------- player update ---------- */
  function updatePlayer(dt) {
    var p = player;
    if (p.dying) {
      p.deadT += dt;
      p.vy += GRAV * 0.6 * dt;
      p.y += p.vy * dt;
      if (p.deadT > 1.1) respawnOrGameOver();
      return;
    }
    var left = keys['ArrowLeft'] || keys['KeyA'];
    var right = keys['ArrowRight'] || keys['KeyD'];
    var dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir !== 0) {
      p.vx += dir * MOVE_ACC * dt;
      p.vx = clamp(p.vx, -MAX_RUN, MAX_RUN);
      p.facing = dir;
    } else {
      if (p.vx > 0) p.vx = Math.max(0, p.vx - FRICTION * dt);
      else if (p.vx < 0) p.vx = Math.min(0, p.vx + FRICTION * dt);
    }
    // jump buffer + coyote time
    if (p.coyote > 0) p.coyote -= dt;
    if (p.jumpBuf > 0) p.jumpBuf -= dt;
    if (p.jumpBuf > 0 && p.coyote > 0) {
      p.vy = JUMP_V;
      p.coyote = 0; p.jumpBuf = 0; p.onGround = false;
      p.squash = 0.75;
      Chiptune.sfx('jump');
      addParticles(p.x + p.w / 2, p.y + p.h, 6, '#aef7ef', 90, 0.35);
    }
    var jumpKey = keys['Space'] || keys['KeyW'] || keys['ArrowUp'];
    if (!jumpKey && p.vy < -180) p.vy = -180;

    p.vy = Math.min(MAX_FALL, p.vy + GRAV * dt);
    p.onMover = null;
    var wasGround = p.onGround;
    var prevY = p.y;
    moveWithSolids(p, dt, true);
    if (p.onGround) p.coyote = 0.1;
    if (!wasGround && p.onGround && p.vy >= 0) {
      p.squash = 1.28;
      if (p.vy > 300) addParticles(p.x + p.w / 2, p.y + p.h, 5, '#9be7d8', 70, 0.3);
    }
    if (p.onMover) { p.x += p.onMover.dx || 0; p.y += p.onMover.dy || 0; }
    if (p.groundKind === 'bounce' && p.onGround) {
      p.vy = JUMP_V * 1.25; p.onGround = false;
      Chiptune.sfx('jump'); addParticles(p.x + p.w / 2, p.y + p.h, 8, '#ff8a5c', 130, 0.4);
    }
    p.groundKind = null;
    p.anim += Math.abs(p.vx) * dt * 0.06;
    p.squash += (1 - p.squash) * Math.min(1, dt * 12);
    if (p.invuln > 0) p.invuln -= dt;

    // fell into a pit
    if (p.y > level.H + 40) { killPlayer(true); }
  }

  function killPlayer(fell) {
    var p = player;
    if (p.dying) return;
    p.dying = true; p.deadT = 0; p.vy = fell ? 0 : -420; p.vx = 0;
    G.lives -= 1;
    syncHud();
    shake(0.35, 8);
    flash = 0.18;
    addParticles(p.x + p.w / 2, p.y + p.h / 2, 18, '#ff5c8a', 200, 0.7);
    Chiptune.sfx(G.lives > 0 ? 'hurt' : 'loss');
  }

  function respawnOrGameOver() {
    if (G.lives <= 0) {
      gameOver();
      return;
    }
    loadLevelKeepProgress();
  }

  function loadLevelKeepProgress() {
    var lvl = G.levelIndex;
    var sc = G.score, lv = G.lives;
    loadLevel(lvl);
    G.score = sc; G.lives = lv;
    syncHud();
    player.invuln = 1.2;
  }
  /* ---------- world update ---------- */
  function updateWorld(dt) {
    levelTime += dt;
    var i, j;
    // movers
    for (i = 0; i < movers.length; i++) {
      var m = movers[i];
      m.t += dt * m.speed;
      var ox = m.x, oy = m.y;
      if (m.axis === 'x') m.x = m.ox + Math.sin(m.t) * m.amp;
      else m.y = m.oy + Math.sin(m.t) * m.amp * 0.75;
      m.dx = m.x - ox; m.dy = m.y - oy;
    }
    // enemies
    for (i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) { e.deadT = (e.deadT || 0) + dt; continue; }
      e.t += dt;
      if (e.type === 'walker') {
        e.vy = Math.min(MAX_FALL, e.vy + GRAV * dt);
        var oldX = e.x;
        e.x += e.vx * dt;
        // wall / edge detection
        var probeX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        var blocked = false;
        for (j = 0; j < solids.length; j++) {
          var s = solids[j];
          if (aabb(e, s)) {
            if (e.vx > 0) { e.x = s.x - e.w; } else { e.x = s.x + s.w; }
            blocked = true;
          }
        }
        // edge ahead?
        var edgeX = e.vx > 0 ? e.x + e.w + 4 : e.x - 4;
        var groundAhead = false;
        for (j = 0; j < solids.length; j++) {
          var s2 = solids[j];
          if (edgeX > s2.x && edgeX < s2.x + s2.w && e.y + e.h + 4 > s2.y && e.y + e.h + 4 < s2.y + s2.h + 10) { groundAhead = true; break; }
        }
        if (blocked || !groundAhead) { e.vx = -e.vx; e.x = oldX; }
        e.y += e.vy * dt;
        for (j = 0; j < solids.length; j++) {
          var s3 = solids[j];
          if (aabb(e, s3)) {
            if (e.vy > 0) { e.y = s3.y - e.h; e.vy = 0; }
            else { e.y = s3.y + s3.h; e.vy = 0; }
          }
        }
      } else {
        e.x += e.vx * dt;
        e.y = e.homeY + Math.sin(e.t * 2.4) * 26;
        for (j = 0; j < solids.length; j++) {
          var s4 = solids[j];
          if (aabb(e, s4)) { if (e.vx > 0) e.x = s4.x - e.w; else e.x = s4.x + s4.w; e.vx = -e.vx; }
        }
        if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); }
        if (e.x + e.w > level.W) { e.x = level.W - e.w; e.vx = -Math.abs(e.vx); }
      }
    }
    if (enemies.length && enemies.every(function (e) { return !e.alive || e.deadT > 3; })) {
      // keep at least one alive for the moving-hazard requirement
      for (i = 0; i < enemies.length; i++) if (!enemies[i].alive) {
        var en = enemies[i];
        en.alive = true; en.deadT = 0; en.x = en.spawnX === undefined ? en.x : en.spawnX;
        en.vy = 0;
        break;
      }
    }
  }

  function solidAt(x, y) {
    for (var i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s;
    }
    return null;
  }
  /* ---------- collisions / items ---------- */
  function checkCollisions(dt) {
    var p = player;
    if (p.dying) return;
    var i;
    for (i = 0; i < coins.length; i++) {
      var c = coins[i];
      if (c.got) continue;
      if (aabb(p, c)) {
        c.got = true;
        G.score += 100; G.levelCoins++; G.coins++;
        addParticles(c.x + 8, c.y + 8, 10, '#ffd166', 140, 0.5);
        floaty(c.x + 8, c.y, '+100');
        Chiptune.sfx('coin');
        syncHud();
      }
    }
    for (i = 0; i < hazards.length; i++) {
      var h = hazards[i];
      if (aabb(p, h)) { hurt(); return; }
    }
    for (i = 0; i < enemies.length; i++) {
      var e = enemies[i];
      if (!e.alive) continue;
      if (aabb(p, e)) {
        if (p.vy > 60 && p.y + p.h - p.vy * dt <= e.y + 14) {
          e.alive = false; e.deadT = 0;
          p.vy = -480;
          G.score += 150;
          floaty(e.x + e.w / 2, e.y, '+150', '#ff8a5c');
          addParticles(e.x + e.w / 2, e.y + e.h / 2, 14, '#ff8a5c', 160, 0.5);
          shake(0.16, 4);
          Chiptune.sfx('stomp');
          syncHud();
        } else {
          hurt();
          return;
        }
      }
    }
    if (goal && aabb(p, goal)) completeLevel();
  }

  function hurt() {
    var p = player;
    if (p.invuln > 0 || p.dying) return;
    killPlayer(false);
  }

  function shake(t, m) { shakeT = Math.max(shakeT, t); shakeMag = Math.max(shakeMag, m); }
  /* ---------- camera & game state ---------- */
  function updateCamera(instant) {
    var tx = player.x + player.w / 2 - VW / 2;
    var ty = player.y + player.h / 2 - VH / 2 - 20;
    tx = clamp(tx, 0, Math.max(0, level.W - VW));
    ty = clamp(ty, 0, Math.max(0, level.H - VH));
    if (instant) { camera.x = tx; camera.y = ty; return; }
    camera.x += (tx - camera.x) * 0.14;
    camera.y += (ty - camera.y) * 0.1;
  }

  function startGame() {
    Chiptune.init();
    Chiptune.setMusic(true);
    G.score = 0; G.lives = 3; G.coins = 0; G.levelIndex = 0;
    loadLevel(0);
    G.state = 'playing';
    hideOverlay();
    Chiptune.playMusic(0);
    Chiptune.sfx('select');
  }

  function completeLevel() {
    if (G.state !== 'playing') return;
    G.state = 'levelclear';
    G.score += 250 + G.lives * 50;
    Chiptune.sfx('levelClear');
    addParticles(goal.x + T / 2, goal.y + T, 26, '#6ff7e8', 220, 0.9);
    flash = 0.25;
    syncHud();
    if (G.levelIndex >= LEVELS.length - 1) {
      setTimeout(function () { if (G.state === 'levelclear') victory(); }, 1300);
    } else {
      setTimeout(function () {
        if (G.state !== 'levelclear') return;
        G.levelIndex++;
        loadLevelKeepProgress();
        G.state = 'playing';
      }, 1300);
      showClearPanel();
    }
  }

  function victory() {
    G.state = 'victory';
    Chiptune.sfx('victory');
    Chiptune.stopMusic();
    G.best = Math.max(G.best, G.score);
    showPanel('victory');
  }

  function gameOver() {
    G.state = 'gameover';
    Chiptune.stopMusic();
    G.best = Math.max(G.best, G.score);
    showPanel('gameover');
  }

  function restartGame() {
    Chiptune.stopMusic();
    startGame();
  }
  /* ---------- UI panels ---------- */
  function hideOverlay() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
  function showOverlay(html) {
    overlay.innerHTML = html;
    overlay.classList.add('show');
  }
  function showPanel(kind) {
    var stats = '<div class="stats">' +
      '<div>Score<span>' + G.score + '</span></div>' +
      '<div>Best<span>' + G.best + '</span></div>' +
      '<div>Sparks<span>' + G.coins + '</span></div>' +
      '<div>Level<span>' + (G.levelIndex + 1) + '/' + LEVELS.length + '</span></div>' +
      '</div>';
    if (kind === 'gameover') {
      showOverlay('<div class="panel"><h1 class="bad">GAME OVER</h1>' +
        '<p class="sub">The rift consumed your light&hellip;</p>' + stats +
        '<button id="btnRestart" class="big">TRY AGAIN</button>' +
        '<p class="hint">Press Enter or R to restart &middot; M toggles music</p></div>');
    } else if (kind === 'victory') {
      showOverlay('<div class="panel"><h1 class="win">YOU WIN!</h1>' +
        '<p class="sub">All three realms of the Lumen Rift are restored.</p>' + stats +
        '<div class="row"><button id="btnRestart" class="big">PLAY AGAIN</button></div>' +
        '<p class="hint">Press Enter or R to play again</p></div>');
    }
    var b = document.getElementById('btnRestart');
    if (b) b.onclick = function () { Chiptune.init(); restartGame(); };
  }
  function showClearPanel() {
    showOverlay('<div class="panel"><h1>LEVEL CLEAR</h1>' +
      '<p class="sub">' + level.name + ' &mdash; spark count ' + G.levelCoins + '/' + G.levelTotal + '</p>' +
      '<p class="sub">Score ' + G.score + '</p>' +
      '<p class="hint">Next realm opening&hellip;</p></div>');
  }
  function togglePause() {
    if (G.state === 'playing') { G.state = 'paused'; Chiptune.stopMusic(); showOverlay('<div class="panel"><h1>PAUSED</h1><p class="sub">Press P to resume</p></div>'); }
    else if (G.state === 'paused') { G.state = 'playing'; hideOverlay(); Chiptune.setMusic(Chiptune.musicOn); }
  }
  /* ---------- input ---------- */
  document.addEventListener('keydown', function (ev) {
    var k = ev.code;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(k) >= 0) ev.preventDefault();
    keys[k] = true;
    if (k === 'KeyM') { Chiptune.init(); updateAudioButtons(); Chiptune.toggleMusic(); updateAudioButtons(); }
    if (k === 'KeyN') { Chiptune.setSfx(!Chiptune.sfxOn); updateAudioButtons(); }
    if (k === 'Space' || k === 'KeyW' || k === 'ArrowUp') {
      if (G.state === 'playing') player.jumpBuf = 0.13;
      if (G.state === 'title') { Chiptune.init(); startGame(); }
    }
    if (k === 'Enter') {
      if (G.state === 'title') { Chiptune.init(); startGame(); }
      else if (G.state === 'gameover' || G.state === 'victory') { Chiptune.init(); restartGame(); }
    }
    if (k === 'KeyR' && (G.state === 'gameover' || G.state === 'victory')) { Chiptune.init(); restartGame(); }
    if (k === 'KeyP') togglePause();
  });
  document.addEventListener('keyup', function (ev) { keys[ev.code] = false; });
  window.addEventListener('blur', function () { keys = {}; });

  function updateAudioButtons() {
    var bm = document.getElementById('btnMusic'), bs = document.getElementById('btnMute');
    if (bm) {
      bm.textContent = 'MUSIC: ' + (Chiptune.musicOn ? 'ON' : 'OFF');
      bm.classList.toggle('off', !Chiptune.musicOn);
    }
    if (bs) {
      bs.textContent = 'SFX: ' + (Chiptune.sfxOn ? 'ON' : 'OFF');
      bs.classList.toggle('off', !Chiptune.sfxOn);
    }
  }
  document.getElementById('btnMusic').onclick = function (ev) {
    ev.target.blur(); Chiptune.init(); Chiptune.toggleMusic(); updateAudioButtons();
  };
  document.getElementById('btnMute').onclick = function (ev) {
    ev.target.blur(); Chiptune.init(); Chiptune.setSfx(!Chiptune.sfxOn); updateAudioButtons();
  };
  var startBtn = document.getElementById('btnStart');
  if (startBtn) startBtn.onclick = function () { Chiptune.init(); startGame(); };
  updateAudioButtons();
  /* ---------- rendering ---------- */
  var bgStars = [];
  for (var s = 0; s < 70; s++) bgStars.push({ x: Math.random() * VW, y: Math.random() * VH * 0.6, r: Math.random() * 1.8 + 0.5, sp: Math.random() * 0.25 + 0.05 });

  function drawBackground() {
    var L = level ? level.def : LEVELS[0];
    var g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, L.sky[0]); g.addColorStop(0.6, L.sky[1]); g.addColorStop(1, L.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    // parallax stars
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (var i = 0; i < bgStars.length; i++) {
      var st = bgStars[i];
      var sx = ((st.x - camera.x * 0.25) % VW + VW) % VW;
      var sy = st.y - camera.y * 0.1;
      var tw = 0.55 + 0.45 * Math.sin(levelTime * 2 + i);
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(sx, sy, st.r * 2, st.r * 2);
    }
    ctx.globalAlpha = 1;
    // distant hills
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (var h = 0; h < 6; h++) {
      var hx = (h * 240 - camera.x * 0.4) % (VW + 260) - 130;
      ctx.beginPath();
      ctx.arc(hx, VH - 40, 150, Math.PI, 0);
      ctx.fill();
    }
    // floating motes
    ctx.fillStyle = 'rgba(174,247,239,0.28)';
    for (var m = 0; m < 26; m++) {
      var mx = ((m * 137 + levelTime * 18) % (VW + 60)) - 30;
      var my = ((m * 97 - levelTime * 22) % (VH + 60) + VH + 60) % (VH + 60);
      ctx.fillRect(mx, my, 3, 3);
    }
  }
  function drawSolid(s) {
    var x = s.x, y = s.y, w = s.w, h = s.h;
    if (s.kind === 'ground') {
      ctx.fillStyle = '#1b2742'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#243553'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
      // top grass strip
      var grd = ctx.createLinearGradient(0, y, 0, y + 10);
      grd.addColorStop(0, level && level.def.accent ? level.def.accent : '#6ff7e8');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.75; ctx.fillStyle = grd; ctx.fillRect(x, y, w, 10); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      for (var i = 0; i < 3; i++) ctx.fillRect(x + 4 + i * 9, y + 14 + ((i * 7) % 10), 5, 5);
    } else if (s.kind === 'bounce') {
      ctx.fillStyle = '#ff8a5c'; ctx.fillRect(x, y + h - 12, w, 12);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(x + 2, y + h - 10, w - 4, 5);
      ctx.fillStyle = '#7a3018'; ctx.fillRect(x + 4, y + h - 2, w - 8, 2);
    } else {
      ctx.fillStyle = '#4e6a94'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#7fa3d1'; ctx.fillRect(x, y, w, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x, y + h - 5, w, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 4, y + 7, 8, 3);
    }
  }

  function drawCoin(c) {
    if (c.got) return;
    var bob = Math.sin(levelTime * 3 + c.t) * 3;
    var sq = Math.abs(Math.cos(levelTime * 3 + c.t));
    var w = 5 + sq * 11, cx = c.x + 8, cy = c.y + 8 + bob;
    ctx.save();
    ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.ellipse(cx, cy, w / 2, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff3bf';
    ctx.beginPath(); ctx.ellipse(cx - 1, cy - 2, Math.max(1, w / 2 - 3), 5, 0, 0, Math.PI * 2); ctx.fill();
  }

  function drawSpikes(h) {
    ctx.fillStyle = '#c9d8ef';
    for (var i = 0; i < 4; i++) {
      var sx = h.x + i * ((h.w) / 4);
      ctx.beginPath();
      ctx.moveTo(sx, h.y + h.h);
      ctx.lineTo(sx + h.w / 8, h.y);
      ctx.lineTo(sx + h.w / 4, h.y + h.h);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ff5c8a'; ctx.fillRect(h.x, h.y + h.h - 3, h.w, 3);
  }

  function drawMover(m) {
    ctx.fillStyle = 'rgba(111,247,232,0.22)';
    ctx.fillRect(m.x - 3, m.y - 3, m.w + 6, m.h + 6);
    ctx.fillStyle = '#6ff7e8'; ctx.fillRect(m.x, m.y, m.w, m.h);
    ctx.fillStyle = '#1d5f63'; ctx.fillRect(m.x + 3, m.y + m.h - 4, m.w - 6, 2);
    ctx.fillStyle = '#d8fffb';
    for (var i = 0; i < 3; i++) ctx.fillRect(m.x + 9 + i * 22, m.y + 3, 3, 3);
  }

  function drawGoal(g) {
    var cx = g.x + g.w / 2, cy = g.y + g.h / 2;
    var pulse = 0.7 + 0.3 * Math.sin(levelTime * 4);
    ctx.save();
    ctx.shadowColor = level.def.accent; ctx.shadowBlur = 24 * pulse;
    ctx.strokeStyle = level.def.accent; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(cx, cy, 20 * pulse, 34, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(174,247,239,0.25)';
    ctx.beginPath(); ctx.ellipse(cx, cy, 16 * pulse, 29, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = level.def.accent;
    for (var i = 0; i < 5; i++) {
      var a = levelTime * 1.6 + i * 1.25;
      ctx.fillRect(cx + Math.cos(a) * 26 - 1.5, cy + Math.sin(a) * 38 - 1.5, 3, 3);
    }
  }
  function drawEnemy(e) {
    if (!e.alive) {
      if ((e.deadT || 0) < 0.5) {
        ctx.globalAlpha = 1 - (e.deadT || 0) * 2;
        ctx.fillStyle = '#ff8a5c';
        ctx.fillRect(e.x, e.y + e.h - 8, e.w, 8);
        ctx.globalAlpha = 1;
      }
      return;
    }
    var bob = Math.sin(e.t * 6) * 2;
    if (e.type === 'walker') {
      var x = e.x, y = e.y + bob;
      ctx.fillStyle = '#ff5c8a';
      ctx.fillRect(x + 2, y + 10, e.w - 4, e.h - 10);
      ctx.fillStyle = '#2b0d1c';
      ctx.beginPath(); ctx.arc(x + 2, y + 12, 12, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.arc(x + e.w - 2, y + 12, 12, Math.PI, 0); ctx.fill();
      // eyes
      var ex = e.vx > 0 ? x + 12 : x + 6;
      ctx.fillStyle = '#fff';
      ctx.fillRect(ex, y + 16, 6, 7); ctx.fillRect(ex + 9, y + 16, 6, 7);
      ctx.fillStyle = '#1a0510';
      var pf = e.vx > 0 ? 3 : 0;
      ctx.fillRect(ex + pf, y + 19, 3, 4); ctx.fillRect(ex + 9 + pf, y + 19, 3, 4);
      // feet
      ctx.fillStyle = '#a8234d';
      var step = Math.sin(e.t * 10) * 3;
      ctx.fillRect(x + 2, y + e.h - 4 + step, 8, 4);
      ctx.fillRect(x + e.w - 10, y + e.h - 4 - step, 8, 4);
    } else {
      var fx = e.x, fy = e.y + bob;
      var flap = Math.sin(e.t * 12) * 8;
      ctx.fillStyle = '#b48cff';
      ctx.beginPath();
      ctx.moveTo(fx + 6, fy + 12); ctx.lineTo(fx - 8, fy + 4 + flap); ctx.lineTo(fx - 2, fy + 20); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx + e.w - 6, fy + 12); ctx.lineTo(fx + e.w + 8, fy + 4 + flap); ctx.lineTo(fx + e.w + 2, fy + 20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e0d4ff';
      ctx.beginPath(); ctx.ellipse(fx + e.w / 2, fy + 13, e.w / 2 - 2, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a1f66';
      ctx.fillRect(fx + 9, fy + 9, 4, 5); ctx.fillRect(fx + e.w - 13, fy + 9, 4, 5);
    }
  }
  function drawPlayer() {
    var p = player;
    if (p.invuln > 0 && !p.dying && Math.floor(levelTime * 18) % 2 === 0) return;
    var sq = p.squash, w = p.w / sq, h = p.h * sq;
    var x = p.x + (p.w - w) / 2, y = p.y + (p.h - h);
    if (p.dying) { ctx.globalAlpha = 0.7; }
    // glow
    ctx.save();
    ctx.shadowColor = '#6ff7e8'; ctx.shadowBlur = 14;
    // body
    ctx.fillStyle = '#aef7ef';
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y);
    ctx.lineTo(x + w - 2, y + h * 0.55);
    ctx.lineTo(x + w - 4, y + h);
    ctx.lineTo(x + 4, y + h);
    ctx.lineTo(x + 2, y + h * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // visor
    ctx.fillStyle = '#123049';
    ctx.fillRect(x + 5, y + h * 0.28, w - 10, h * 0.22);
    ctx.fillStyle = '#6ff7e8';
    var eyeOff = p.facing > 0 ? 3 : 0;
    ctx.fillRect(x + 7 + eyeOff, y + h * 0.32, 4, 4);
    ctx.fillRect(x + w - 13 + eyeOff, y + h * 0.32, 4, 4);
    // scarf
    ctx.fillStyle = '#ff5c8a';
    var flutter = Math.sin(p.anim * 2) * 3;
    ctx.fillRect(x + (p.facing > 0 ? -8 : w - 2), y + h * 0.52 + flutter, 10, 4);
    // legs animation
    if (p.onGround && Math.abs(p.vx) > 20) {
      var lstep = Math.sin(p.anim * 8) * 3;
      ctx.fillStyle = '#5fc9c0';
      ctx.fillRect(x + 4, y + h, 5, 3 + lstep);
      ctx.fillRect(x + w - 9, y + h, 5, 3 - lstep);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    drawBackground();
    ctx.save();
    var ox = 0, oy = 0;
    if (shakeT > 0) { ox = rnd(-shakeMag, shakeMag); oy = rnd(-shakeMag, shakeMag); }
    ctx.translate(-Math.round(camera.x) + ox, -Math.round(camera.y) + oy);

    // decorations: pillars behind
    var i;
    for (i = 0; i < solids.length; i++) {
      var s = solids[i];
      if (s.x + s.w < camera.x - 40 || s.x > camera.x + VW + 40) continue;
      drawSolid(s);
    }
    for (i = 0; i < movers.length; i++) drawMover(movers[i]);
    for (i = 0; i < hazards.length; i++) drawSpikes(hazards[i]);
    for (i = 0; i < coins.length; i++) drawCoin(coins[i]);
    for (i = 0; i < enemies.length; i++) drawEnemy(enemies[i]);
    if (goal) drawGoal(goal);
    if (player && !(G.state === 'title')) drawPlayer();

    // particles
    for (i = 0; i < particles.length; i++) {
      var pt = particles[i];
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.col;
      ctx.fillRect(pt.x, pt.y, pt.s, pt.s);
    }
    ctx.globalAlpha = 1;
    // floating score text
    ctx.font = 'bold 14px "Courier New",monospace';
    ctx.textAlign = 'center';
    for (i = 0; i < floaties.length; i++) {
      var f = floaties[i];
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.fillStyle = f.col;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    ctx.textAlign = 'left';

    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (flash * 1.8) + ')';
      ctx.fillRect(0, 0, VW, VH);
    }
    if (G.state === 'playing' || G.state === 'paused') {
      ctx.font = 'bold 12px "Courier New",monospace';
      ctx.fillStyle = 'rgba(200,230,255,0.45)';
      ctx.fillText(level.name, 14, VH - 12);
      ctx.textAlign = 'right';
      ctx.fillText('SPARKS ' + G.levelCoins + '/' + G.levelTotal, VW - 14, VH - 12);
      ctx.textAlign = 'left';
    }
  }
  /* ---------- main loop ---------- */
  function update(dt) {
    if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) { shakeT = 0; shakeMag = 0; } }
    if (flash > 0) flash = Math.max(0, flash - dt * 3);
    var i;
    for (i = particles.length - 1; i >= 0; i--) {
      var pt = particles[i];
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 700 * dt; pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }
    for (i = floaties.length - 1; i >= 0; i--) {
      var f = floaties[i];
      f.y -= 42 * dt; f.life -= dt * 1.1;
      if (f.life <= 0) floaties.splice(i, 1);
    }
    if (G.state !== 'playing') return;
    updateWorld(dt);
    updatePlayer(dt);
    checkCollisions(dt);
    updateCamera(false);
    syncHud();
  }

  function frame(ts) {
    var dt = (ts - tPrev) / 1000;
    if (!isFinite(dt) || dt < 0) dt = 0;
    tPrev = ts;
    dt = Math.min(dt, 0.1);
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard++ < 8) { update(STEP); acc -= STEP; }
    render();
    requestAnimationFrame(frame);
  }

  /* ---------- boot ---------- */
  try {
    loadLevel(0);
  } catch (e) {
    console.error('level load failed', e);
  }
  // keep a static camera for title
  player = null;
  camera = { x: 0, y: 0 };
  overlay.classList.add('show');
  updateAudioButtons();
  window.LUMEN = {
    G: G, Chiptune: Chiptune,
    get level() { return level; }, get player() { return player; },
    get enemies() { return enemies; }, get coins() { return coins; },
    get goal() { return goal; },
    get state() { return G.state; },
    debug: {
      warpToGoal: function () { if (goal && player) { player.x = goal.x + 4; player.y = goal.y + 20; } },
      setLives: function (n) { G.lives = n; syncHud(); },
      hurt: function () { hurt(); },
      start: function () { startGame(); },
      restart: function () { restartGame(); },
      state: function () { return G.state; }
    }
  };
  requestAnimationFrame(function (t) { tPrev = t; requestAnimationFrame(frame); });
})();
