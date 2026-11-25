// Chiptune Audio Engine using Web Audio API
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.tempo = 142; // BPM
    this.step = 0;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.5 : 0, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicEnabled ? 0.35 : 0, this.ctx.currentTime);
    }
    return this.musicEnabled;
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxEnabled ? 0.5 : 0, this.ctx.currentTime);
    }
    return this.sfxEnabled;
  }
  // Note to frequency helper
  mtof(midi) {
    if (!midi || midi <= 0) return 0;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Synthesize 8-bit pulse/square sound
  playTone(freq, duration, type = 'square', gainVal = 0.2, dest = null) {
    if (!this.ctx || freq <= 0) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(dest || this.musicGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // Synthesize short white noise pulse (for 8-bit drums)
  playNoise(duration, gainVal = 0.15, dest = null) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest || this.musicGain);

    noise.start();
  }
  // Sound Effects
  playJump() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playCoin() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // Classic 2-tone arpeggio: B5 (987Hz) then E6 (1318Hz)
    const playToneStep = (freq, start, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + dur);
    };
    playToneStep(987.77, now, 0.08);
    playToneStep(1318.51, now + 0.08, 0.22);
  }

  playHit() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
    this.playNoise(0.2, 0.25, this.sfxGain);
  }
  playGameOver() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    const notes = [64, 63, 62, 59, 57, 55]; // Downward sad progression
    notes.forEach((midi, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + i * 0.16;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(this.mtof(midi), t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  playLevelComplete() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // Triumphant fanfare
    const notes = [60, 64, 67, 72, 71, 72];
    const times = [0, 0.1, 0.2, 0.35, 0.5, 0.65];
    const durs = [0.09, 0.09, 0.14, 0.14, 0.14, 0.4];
    notes.forEach((midi, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + times[i];
      osc.type = 'square';
      osc.frequency.setValueAtTime(this.mtof(midi), t);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + durs[i]);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + durs[i] + 0.01);
    });
  }

  playVictory() {
    if (!this.ctx || !this.sfxEnabled) return;
    this.resume();
    const now = this.ctx.currentTime;
    // Grand victory melody
    const notes = [60, 60, 60, 60, 64, 67, 72, 67, 72];
    const times = [0, 0.12, 0.24, 0.36, 0.55, 0.75, 0.95, 1.2, 1.4];
    const durs = [0.1, 0.1, 0.1, 0.15, 0.18, 0.18, 0.22, 0.18, 0.6];
    notes.forEach((midi, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + times[i];
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.mtof(midi), t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + durs[i]);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + durs[i] + 0.01);
    });
  }
  // 8-bit Chiptune Soundtrack (Original 32-step composition)
  // Melody, bassline, and drum rhythm
  startMusic() {
    this.init();
    this.resume();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.step = 0;

    // 32-step original melody (C major / A minor uplifting platformer theme)
    // 0 means rest
    const melody = [
      60,  0, 64,  0, 67,  0, 72, 71, // C4, E4, G4, C5, B4
      69,  0, 67,  0, 64,  0, 62, 64, // A4, G4, E4, D4, E4
      65,  0, 69,  0, 72,  0, 74, 72, // F4, A4, C5, D5, C5
      71, 69, 67, 65, 64, 62, 60,  0  // B4, A4, G4, F4, E4, D4, C4
    ];

    // Harmony / Arp / Counter-melody (triangle/square)
    const arp = [
      64, 67, 64, 67, 64, 67, 64, 67,
      60, 64, 60, 64, 60, 64, 60, 64,
      65, 69, 65, 69, 65, 69, 65, 69,
      62, 65, 62, 65, 59, 62, 59, 62
    ];

    // Bassline (Triangle wave, punchy roots)
    const bass = [
      36,  0, 36,  0, 36,  0, 36, 43, // C2, G2
      45,  0, 45,  0, 40,  0, 40,  0, // A2, E2
      41,  0, 41,  0, 41,  0, 41, 43, // F2, G2
      43,  0, 43,  0, 38,  0, 36,  0  // G2, D2, C2
    ];

    // Drum track: 1 = kick, 2 = snare, 3 = hi-hat, 0 = rest
    const drums = [
      1, 3, 2, 3, 1, 3, 2, 3,
      1, 3, 2, 3, 1, 3, 2, 3,
      1, 3, 2, 3, 1, 3, 2, 3,
      1, 3, 2, 3, 1, 1, 2, 3
    ];

    const stepDuration = 60 / this.tempo / 2; // 16th notes

    const scheduleStep = () => {
      if (!this.isPlayingMusic || !this.ctx) return;

      const current = this.step % 32;

      // Melody channel (Square wave)
      const melNote = melody[current];
      if (melNote > 0 && this.musicEnabled) {
        this.playTone(this.mtof(melNote), stepDuration * 0.9, 'square', 0.16);
      }

      // Arpeggio channel (Soft pulse / square)
      const arpNote = arp[current];
      if (arpNote > 0 && this.musicEnabled && current % 2 === 1) {
        this.playTone(this.mtof(arpNote), stepDuration * 0.7, 'triangle', 0.12);
      }

      // Bass channel (Triangle wave)
      const bassNote = bass[current];
      if (bassNote > 0 && this.musicEnabled) {
        this.playTone(this.mtof(bassNote), stepDuration * 0.95, 'triangle', 0.28);
      }

      // Drum channel
      const drumHit = drums[current];
      if (this.musicEnabled) {
        if (drumHit === 1) {
          // 8-bit Kick (pitch drop)
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.1);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.musicGain);
          osc.start(now);
          osc.stop(now + 0.11);
        } else if (drumHit === 2) {
          // 8-bit Snare (noise + triangle pop)
          this.playNoise(0.09, 0.2, this.musicGain);
          this.playTone(180, 0.05, 'triangle', 0.2, this.musicGain);
        } else if (drumHit === 3) {
          // Hi-hat (short crisp noise)
          this.playNoise(0.03, 0.08, this.musicGain);
        }
      }

      this.step++;
      this.musicTimer = setTimeout(scheduleStep, stepDuration * 1000);
    };

    scheduleStep();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// Global audio instance
const audio = new SoundEngine();
