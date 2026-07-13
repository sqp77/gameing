// All audio is synthesized procedurally with the Web Audio API — no external
// sound files are required, so the game works fully offline out of the box.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.engine = null;
    this._musicTimer = null;
    this._musicStep = 0;
  }

  _ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.55;
    this.sfxGain.connect(this.master);
  }

  resume() {
    this._ensureContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
    }
  }

  // ---------------- Engine hum (continuous, pitch follows speed) ----------------

  startEngine() {
    this._ensureContext();
    if (this.engine) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;

    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 120;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;

    const gain = ctx.createGain();
    gain.gain.value = 0.09;

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start();
    osc2.start();

    this.engine = { osc, osc2, filter, gain };
  }

  updateEngine(speedRatio) {
    if (!this.engine || !this.ctx) return;
    const t = this.ctx.currentTime;
    const freq = 55 + speedRatio * 90;
    this.engine.osc.frequency.setTargetAtTime(freq, t, 0.15);
    this.engine.osc2.frequency.setTargetAtTime(freq * 2.05, t, 0.15);
    this.engine.filter.frequency.setTargetAtTime(260 + speedRatio * 500, t, 0.15);
  }

  stopEngine() {
    if (!this.engine) return;
    const { osc, osc2, gain } = this.engine;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0, t, 0.08);
    osc.stop(t + 0.3);
    osc2.stop(t + 0.3);
    this.engine = null;
  }

  // ---------------- One-shot SFX ----------------

  playCollect(comboMultiplier = 1) {
    this._ensureContext();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const baseFreq = 520 + Math.min(comboMultiplier, 5) * 90;

    [0, 0.07].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * (i === 0 ? 1 : 1.5), t + delay);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(0.35, t + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + delay);
      osc.stop(t + delay + 0.3);
    });
  }

  playCrash() {
    this._ensureContext();
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // Noise burst
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 900;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);

    // Low thud
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.25);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playUIClick() {
    this._ensureContext();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 700;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playAchievement() {
    this._ensureContext();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.25, t + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.4);
    });
  }

  playCelebration() {
    this._ensureContext();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    scale.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const gain = ctx.createGain();
      const start = t + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  }

  playCountdownTick() {
    this._ensureContext();
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 880;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // ---------------- Ambient background music loop ----------------

  startMusic() {
    this._ensureContext();
    if (this._musicTimer) return;
    const pattern = [0, 3, 5, 7, 5, 3, 0, -2];
    const rootFreq = 220;
    const scaleRatios = { '-2': 0.891, 0: 1, 3: 1.189, 5: 1.335, 7: 1.498 };

    const playStep = () => {
      const ctx = this.ctx;
      const t = ctx.currentTime;
      const degree = pattern[this._musicStep % pattern.length];
      const freq = rootFreq * (scaleRatios[degree] || 1);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 1);

      this._musicStep++;
    };

    playStep();
    this._musicTimer = setInterval(playStep, 480);
  }

  stopMusic() {
    if (this._musicTimer) {
      clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }
}
