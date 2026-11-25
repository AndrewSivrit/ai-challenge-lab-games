/* ============================================================
   LUMEN RIFT — original chiptune audio engine (Web Audio API)
   All melodies, bass lines and percussion are composed here.
   ============================================================ */
(function (global) {
  'use strict';

  var Audio = {
    ctx: null,
    available: true,
    started: false,
    musicOn: true,
    sfxOn: true,
    master: null,
    musicGain: null,
    sfxGain: null,
    _timer: null,
    _step: 0,
    _nextTime: 0,
    _tempo: 0.125,     // seconds per 16th step
    _playing: false,
    _songIndex: 0
  };

  /* ---------- note helpers ---------- */
  var NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function freq(name) {
    if (name === '-' || name === null || name === undefined) return 0;
    var n = String(name).trim();
    var semi = NOTE_BASE[n.charAt(0).toUpperCase()];
    if (semi === undefined) return 0;
    var i = 1;
    if (n.charAt(1) === '#') { semi += 1; i = 2; }
    if (n.charAt(2) === '+') semi += 24;
    var oct = parseInt(n.slice(i), 10);
    var midi = 12 * (oct + 1) + semi;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  /* ---------- init ---------- */
  Audio.init = function () {
    if (Audio.ctx) {
      if (Audio.ctx.state === 'suspended') Audio.ctx.resume();
      return true;
    }
    var AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) { Audio.available = false; return false; }
    try { Audio.ctx = new AC(); } catch (e) { Audio.available = false; return false; }
    var ctx = Audio.ctx;
    Audio.master = ctx.createGain();
    Audio.master.gain.value = 0.85;
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 22;
    comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.22;
    Audio.master.connect(comp);
    comp.connect(ctx.destination);

    Audio.musicGain = ctx.createGain();
    Audio.musicGain.gain.value = Audio.musicOn ? 0.32 : 0;
    Audio.musicGain.connect(Audio.master);

    Audio.sfxGain = ctx.createGain();
    Audio.sfxGain.gain.value = 0.5;
    Audio.sfxGain.connect(Audio.master);

    Audio.started = true;
    return true;
  };

  Audio.ready = function () {
    return !!Audio.ctx && Audio.ctx.state !== 'closed';
  };

  /* ---------- low-level voice ---------- */
  function tone(opts) {
    if (!Audio.ready()) return;
    var ctx = Audio.ctx;
    var t0 = opts.t || ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(Math.max(20, opts.f), t0);
    if (opts.slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + (opts.dur || 0.1));
    }
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0);
    var vol = opts.vol === undefined ? 0.3 : opts.vol;
    var atk = opts.atk === undefined ? 0.004 : opts.atk;
    var dur = opts.dur || 0.12;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + atk);
    if (opts.decay === 'hold') {
      g.gain.setValueAtTime(Math.max(0.0002, vol), t0 + Math.max(atk, dur - 0.03));
      g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    }
    var out = opts.dest || Audio.sfxGain;
    if (opts.filter) {
      var f = ctx.createBiquadFilter();
      f.type = opts.filter.type || 'lowpass';
      f.frequency.setValueAtTime(opts.filter.freq || 2200, t0);
      if (opts.filter.to) f.frequency.exponentialRampToValueAtTime(opts.filter.to, t0 + dur);
      f.Q.value = opts.filter.q || 0.7;
      osc.connect(f); f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    osc.onended = function () { try { osc.disconnect(); g.disconnect(); } catch (e) {} };
    return osc;
  }

  var noiseBuf = null;
  function noise(t, dur, vol, opts) {
    if (!Audio.ready()) return;
    var ctx = Audio.ctx;
    opts = opts || {};
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      var seed = 12345;
      for (var i = 0; i < d.length; i++) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        d[i] = (seed / 0x3fffffff) - 1;
      }
    }
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = opts.rate || 1;
    var f = ctx.createBiquadFilter();
    f.type = opts.filterType || 'bandpass';
    f.frequency.setValueAtTime(opts.freq || 3000, t);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    f.Q.value = opts.q || 1.1;
    var g = ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.0002, vol), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(opts.dest || Audio.sfxGain);
    src.start(t); src.stop(t + dur + 0.02);
    src.onended = function () { try { src.disconnect(); f.disconnect(); g.disconnect(); } catch (e) {} };
  }
  Audio._tone = tone;
  Audio._noise = noise;
  Audio.freq = freq;

  /* ============================================================
     ORIGINAL SOUNDTRACK
     Each song is 16 bars of 16 sixteenth-steps.
     Channels: mel (lead square), harm (2nd square), bass (triangle), drums (noise)
     ============================================================ */
  function rep(s, n) { var o = ''; for (var i = 0; i < n; i++) o += s; return o; }

  var SONGS = [
    { // 0 — title / overworld theme, "Rift Awakening"
      name: 'Rift Awakening',
      mel: [
        'E5 - G5 - C6 - B5 A5 - G5 - - E5 -',
        'D5 - F5 - A5 - G5 F5 - E5 - - D5 -',
        'C5 - E5 - G5 - A5 B5 - C6 - - G5 -',
        'F5 - E5 D5 - C5 - - - - - - - - -',
        'E5 - G5 - C6 - B5 A5 - G5 - - E5 -',
        'D5 - F5 - A5 - B5 C6 - B5 - - A5 -',
        'G5 - A5 - B5 - C6 - D6 - C6 - B5 -',
        'C6 - - - G5 - E5 - C5 - - - - - -',
        'A5 - - C6 - - B5 A5 - - G5 - A5 -',
        'G5 - - B5 - - A5 G5 - - E5 - G5 -',
        'F5 - A5 - C6 - B5 A5 - - F5 - D5 -',
        'E5 - G5 - C6 - - - - - - - - - -',
        'A5 - - C6 - - B5 A5 - - G5 - A5 -',
        'B5 - - D6 - - C6 B5 - - G5 - B5 -',
        'C6 - D6 - E6 - D6 C6 - - A5 - F5 -',
        'G5 - - - C6 - - - - - - - - - -'
      ].join(' '),
      harm: [
        'C5 - - - E5 - - - G5 - - - E5 - - -',
        'D5 - - - F5 - - - A5 - - - F5 - - -',
        'E5 - - - G5 - - - C6 - - - G5 - - -',
        'F5 - - - A5 - - - C6 - - - A5 - - -',
        'C5 - - - E5 - - - G5 - - - E5 - - -',
        'D5 - - - F5 - - - A5 - - - F5 - - -',
        'E5 - - - G5 - - - B5 - - - G5 - - -',
        'E5 - - - G5 - - - C6 - - - G5 - - -',
        'A5 - - - C6 - - - E6 - - - C6 - - -',
        'G5 - - - B5 - - - D6 - - - B5 - - -',
        'F5 - - - A5 - - - C6 - - - A5 - - -',
        'E5 - - - G5 - - - C6 - - - G5 - - -',
        'A5 - - - C6 - - - E6 - - - C6 - - -',
        'G5 - - - B5 - - - D6 - - - B5 - - -',
        'A5 - - - C6 - - - F5 - - - A5 - - -',
        'G5 - - - B5 - - - D6 - - - G5 - - -'
      ].join(' '),
      bass: [
        'C3 - - - C3 - - - G2 - - - G2 - - -',
        'D3 - - - D3 - - - A2 - - - A2 - - -',
        'E3 - - - E3 - - - G2 - - - G2 - - -',
        'F3 - - - F3 - - - A2 - - - A2 - - -',
        'C3 - - - C3 - - - G2 - - - G2 - - -',
        'D3 - - - D3 - - - A2 - - - A2 - - -',
        'E3 - - - E3 - - - B2 - - - B2 - - -',
        'C3 - - - C3 - - - C3 - - - G2 - - -',
        'A2 - - - A2 - - - A2 - - - E2 - - -',
        'G2 - - - G2 - - - G2 - - - D2 - - -',
        'F2 - - - F2 - - - F2 - - - C3 - - -',
        'C3 - - - C3 - - - C3 - - - G2 - - -',
        'A2 - - - A2 - - - A2 - - - E2 - - -',
        'G2 - - - G2 - - - G2 - - - B2 - - -',
        'F2 - - - F2 - - - C3 - - - C3 - - -',
        'G2 - - - G2 - - - G2 - - - G2 - - -'
      ].join(' '),
      drums: [
        rep('k.h.s.h.', 4),
        rep('k.h.s.hh', 4),
        rep('k.h.s.h.', 4),
        rep('k.hkk.hss', 4),
        rep('k.h.s.h.', 4),
        rep('k.h.s.hh', 4),
        rep('k.h.s.h.', 4),
        rep('k.h.s.shs', 4),
        rep('k.h.s.h.', 4),
        rep('k.h.s.hh', 4),
        rep('k.h.s.h.', 4),
        rep('k.hkk.hss', 4),
        rep('k.h.s.h.', 4),
        rep('k.h.s.hh', 4),
        rep('k.h.s.hs', 4),
        rep('kkkkksssSSSSSS', 1)
      ].join('')
    }
  ];
  Audio.SONGS = SONGS;
  var TRACKS = {};
  function tracks(song) {
    if (!song._c) {
      song._c = {
        mel: song.mel.trim().split(/\s+/),
        harm: song.harm.trim().split(/\s+/),
        bass: song.bass.trim().split(/\s+/),
        drums: song.drums.replace(/\s+/g, '')
      };
    }
    return song._c;
  }

  function playStep(song, step, t, off) {
    var tr = tracks(song);
    var i = step % tr.mel.length;
    var m = tr.mel[i], h = tr.harm[i], b = tr.bass[i], d = tr.drums[i];
    var o = off || 0;
    var mg = Audio.musicGain || Audio.master;
    if (m && m !== '-') {
      var len = 1, j = i + 1;
      while (j < tr.mel.length && (tr.mel[j] === '-' || tr.mel[j] === undefined) && len < 8) { len++; j++; }
      tone({ t: t, f: freq(m), dur: len * Audio._tempo * 0.95 + 0.03, vol: 0.20,
        type: 'square', decay: 'hold', dest: mg });
    }
    if (h && h !== '-') {
      tone({ t: t, f: freq(h), dur: Audio._tempo * 3.6, vol: 0.06,
        type: 'triangle', decay: 'hold', dest: mg });
    }
    if (b && b !== '-') {
      tone({ t: t, f: freq(b), dur: Audio._tempo * 3.2, vol: 0.17,
        type: 'triangle', decay: 'hold', dest: mg });
    }
    if (d && d !== '.') {
      if (d === 'k') noise(t, 0.11, 0.16, { freq: 110, to: 60, filterType: 'lowpass', dest: mg });
      else if (d === 's') noise(t, 0.09, 0.07, { freq: 2200, to: 900, filterType: 'bandpass', dest: mg });
      else if (d === 'h') noise(t, 0.03, 0.03, { freq: 8000, filterType: 'highpass', dest: mg });
    }
    if (o) { /* reserved */ }
  }
  /* ---------- scheduler ---------- */
  function scheduler() {
    if (!Audio.ready() || !Audio._playing) return;
    var ctx = Audio.ctx;
    var horizon = ctx.currentTime + 0.22;
    var guard = 0;
    while (Audio._nextTime < horizon && guard++ < 64) {
      var song = SONGS[Audio._songIndex] || SONGS[0];
      playStep(song, Audio._step, Audio._nextTime);
      Audio._step = (Audio._step + 1) % tracks(song).mel.length;
      Audio._nextTime += Audio._tempo;
    }
    if (Audio._nextTime < ctx.currentTime - 0.5) Audio._nextTime = ctx.currentTime + 0.05;
  }

  Audio.playMusic = function (index) {
    if (!Audio.ready()) return;
    if (index !== undefined && index !== Audio._songIndex) {
      Audio._songIndex = index;
      Audio._step = 0;
    }
    if (Audio._playing) return;   // never double-schedule
    Audio._playing = true;
    Audio._nextTime = Audio.ctx.currentTime + 0.08;
    if (Audio._timer) clearInterval(Audio._timer);
    Audio._timer = setInterval(scheduler, 40);
    scheduler();
  };

  Audio.stopMusic = function () {
    Audio._playing = false;
    if (Audio._timer) { clearInterval(Audio._timer); Audio._timer = null; }
  };

  Audio.setMusic = function (on) {
    Audio.musicOn = !!on;
    if (Audio.musicGain && Audio.ctx) {
      var t = Audio.ctx.currentTime;
      Audio.musicGain.gain.cancelScheduledValues(t);
      Audio.musicGain.gain.setTargetAtTime(on ? 0.32 : 0, t, 0.05);
    }
    if (!on) Audio.stopMusic();
    else if (Audio.started && !Audio._playing) Audio.playMusic();
    return Audio.musicOn;
  };

  Audio.toggleMusic = function () { return Audio.setMusic(!Audio.musicOn); };

  Audio.setSfx = function (on) {
    Audio.sfxOn = !!on;
    if (Audio.sfxGain && Audio.ctx) Audio.sfxGain.gain.setTargetAtTime(on ? 0.5 : 0, Audio.ctx.currentTime, 0.03);
    return Audio.sfxOn;
  };

  Audio = Audio;
  /* ============================================================
     SOUND EFFECTS (all synthesized, no samples)
     ============================================================ */
  var SFX = {
    jump: function () {
      tone({ f: 300, slideTo: 760, dur: 0.16, type: 'square', vol: 0.15, atk: 0.005 });
      tone({ f: 610, slideTo: 1300, dur: 0.1, type: 'triangle', vol: 0.09, atk: 0.004 });
    },
    coin: function () {
      var c = Audio.ctx ? Audio.ctx.currentTime : 0;
      tone({ t: c, f: freq('B5'), dur: 0.06, type: 'square', vol: 0.16, decay: 'hold' });
      tone({ t: c + 0.06, f: freq('E6'), dur: 0.18, type: 'square', vol: 0.16 });
    },
    hurt: function () {
      tone({ f: 420, slideTo: 70, dur: 0.34, type: 'sawtooth', vol: 0.18 });
      noise(0, 0.26, 0.15, { freq: 1400, to: 200, filterType: 'bandpass', q: 0.8 });
    },
    life: function () {
      var c = Audio.ctx ? Audio.ctx.currentTime : 0;
      var ns = [freq('C5'), freq('E5'), freq('G5'), freq('C6')];
      for (var i = 0; i < ns.length; i++) {
        tone({ t: c + i * 0.09, f: ns[i], dur: 0.26, type: 'square', vol: 0.13, decay: 'hold' });
      }
      noise(c, 0.5, 0.06, { freq: 500, to: 80, filterType: 'lowpass' });
    },
    levelClear: function () {
      var c = Audio.ctx ? Audio.ctx.currentTime : 0;
      var seq = ['C5', 'E5', 'G5', 'C6', 'G5', 'C6', 'E6'];
      for (var i = 0; i < seq.length; i++) {
        tone({ t: c + i * 0.11, f: freq(seq[i]), dur: 0.2, type: 'square', vol: 0.14, decay: 'hold' });
        tone({ t: c + i * 0.11, f: freq(seq[i]) / 4, dur: 0.2, type: 'triangle', vol: 0.1, decay: 'hold' });
      }
    },
    victory: function () {
      var c = Audio.ctx ? Audio.ctx.currentTime : 0;
      var mel = ['G4', 'C5', 'E5', 'G5', 'C6', 'B5', 'C6', 'E6'];
      var len = [0.14, 0.14, 0.14, 0.14, 0.22, 0.14, 0.16, 0.8];
      var t = c;
      for (var i = 0; i < mel.length; i++) {
        tone({ t: t, f: freq(mel[i]), dur: len[i], type: 'square', vol: 0.15, decay: 'hold' });
        tone({ t: t, f: freq(mel[i]) / 2, dur: len[i], type: 'triangle', vol: 0.1, decay: 'hold' });
        if (i % 2 === 0) noise(t, 0.08, 0.06, { freq: 6000, filterType: 'highpass' });
        t += len[i];
      }
    },
    select: function () {
      tone({ f: 660, slideTo: 990, dur: 0.09, type: 'square', vol: 0.12 });
    },
    stomp: function () {
      tone({ f: 700, slideTo: 180, dur: 0.13, type: 'square', vol: 0.16 });
      noise(0, 0.1, 0.1, { freq: 900, to: 200, filterType: 'lowpass' });
    },
    loss: function () {
      var c = Audio.ctx ? Audio.ctx.currentTime : 0;
      var seq = ['E5', 'C5', 'A4', 'G4', ''];
      for (var i = 0; i < 4; i++) {
        tone({ t: c + i * 0.13, f: freq(seq[i]), dur: 0.2, type: 'square', vol: 0.14, decay: 'hold' });
      }
      tone({ t: c + 0.55, f: freq('C3'), dur: 0.7, type: 'triangle', vol: 0.13 });
    },
    checkpoint: function () {
      var c = Audio.ctx ? Audio.ctx.currentTime : 0;
      tone({ t: c, f: freq('E6'), dur: 0.1, type: 'triangle', vol: 0.14 });
      tone({ t: c + 0.1, f: freq('B6'), dur: 0.22, type: 'triangle', vol: 0.12 });
    }
  };

  Audio.sfx = function (name) {
    if (!Audio.sfxOn || !Audio.ready()) return;
    var fn = SFX[name];
    if (!fn) return;
    try { fn(); } catch (e) { }
  };
  Audio.sfxNames = Object.keys(SFX);

  global.Chiptune = Audio;
})(typeof window !== 'undefined' ? window : this);
