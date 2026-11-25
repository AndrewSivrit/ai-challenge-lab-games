/* Original chiptune for Lantern Ridge — Web Audio only. */
const AudioSys = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let musicOn = true;
  let playing = false;
  let stepTimer = null;
  let step = 0;

  const tempo = 128;
  const stepDur = 60 / tempo / 2; // eighth notes

  // C major-ish pentatonic march. Melody / harmony / bass, 32 steps, loop.
  const melody = [
    72,0,76,0, 79,0,76,74, 72,0,67,0, 69,0,72,0,
    74,0,76,0, 72,0,69,67, 64,0,67,0, 69,0,72,0
  ];
  const harmony = [
    64,0,67,0, 72,0,67,0, 64,0,60,0, 62,0,64,0,
    67,0,69,0, 64,0,62,60, 57,0,60,0, 62,0,64,0
  ];
  const bass = [
    48,0,48,0, 43,0,43,0, 45,0,45,0, 41,0,41,0,
    43,0,43,0, 48,0,48,0, 45,0,41,0, 48,0,48,0
  ];
  const drum = [
    1,0,2,0, 1,2,0,2, 1,0,2,0, 1,2,0,3,
    1,0,2,0, 1,2,0,2, 1,0,2,1, 3,2,0,2
  ];

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = musicOn ? 0.55 : 0;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(master);
    return true;
  }

  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  function tone(freq, when, dur, type, gain, dest) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  function noiseHit(when, dur, gain, hp) {
    const n = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = n;
    const f = ctx.createBiquadFilter();
    f.type = hp ? "highpass" : "lowpass";
    f.frequency.value = hp ? 1800 : 400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f);
    f.connect(g);
    g.connect(musicGain);
    src.start(when);
    src.stop(when + dur + 0.02);
  }

  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function tick() {
    if (!ctx || !playing) return;
    const t = ctx.currentTime + 0.03;
    const i = step % melody.length;
    if (melody[i]) tone(midi(melody[i]), t, stepDur * 0.85, "square", 0.12, musicGain);
    if (harmony[i]) tone(midi(harmony[i]), t, stepDur * 0.7, "square", 0.05, musicGain);
    if (bass[i]) tone(midi(bass[i]), t, stepDur * 0.9, "triangle", 0.16, musicGain);
    if (drum[i] === 1) noiseHit(t, 0.06, 0.18, false);
    if (drum[i] === 2) noiseHit(t, 0.04, 0.08, true);
    if (drum[i] === 3) noiseHit(t, 0.12, 0.14, false);
    step++;
    stepTimer = setTimeout(tick, stepDur * 1000);
  }

  function startMusic() {
    if (!ensure()) return;
    resume();
    if (playing) return;
    playing = true;
    step = 0;
    tick();
  }

  function stopMusic() {
    playing = false;
    if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
  }

  function setMusic(on) {
    musicOn = !!on;
    if (musicGain) musicGain.gain.value = musicOn ? 0.55 : 0;
  }

  function sfx(kind) {
    if (!ensure()) return;
    resume();
    const t = ctx.currentTime;
    if (kind === "jump") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(640, t + 0.12);
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g); g.connect(sfxGain);
      o.start(t); o.stop(t + 0.16);
    } else if (kind === "coin") {
      tone(880, t, 0.08, "square", 0.1, sfxGain);
      tone(1320, t + 0.07, 0.12, "square", 0.1, sfxGain);
    } else if (kind === "hurt") {
      tone(220, t, 0.18, "sawtooth", 0.12, sfxGain);
      tone(140, t + 0.05, 0.2, "square", 0.08, sfxGain);
    } else if (kind === "over") {
      [392, 349, 311, 262].forEach((f, i) => tone(f, t + i * 0.14, 0.16, "square", 0.1, sfxGain));
    } else if (kind === "level") {
      [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.1, 0.16, "square", 0.1, sfxGain));
    } else if (kind === "win") {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.12, 0.2, "square", 0.11, sfxGain));
    }
  }

  return { ensure, resume, startMusic, stopMusic, setMusic, sfx, isMusicOn: () => musicOn };
})();
