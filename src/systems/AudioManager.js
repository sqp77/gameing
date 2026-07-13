/*
 * MASAR
 * Owner: Saud Alqhtani
 * GitHub: sqp77
 * =============
 */

// Per-vehicle-category engine tone tables (v1.2.0 Audio Overhaul) — every field feeds
// updateEngine()'s existing setTargetAtTime ramps, so switching profile never pops. `overtone`
// gates the EV-only quiet high-pitched "futuristic" whine layered on top of the base tone.
const VEHICLE_AUDIO_PROFILES = {
  sedan: { osc1: 'sawtooth', osc2: 'square', baseFreq: 55, freqPerSpeed: 220, freqPerThrottle: 40, gainBase: 0.05, gainPerSpeed: 0.09, gainPerThrottle: 0.03, filterBase: 400, filterPerSpeed: 2000, overtone: false },
  suv: { osc1: 'sawtooth', osc2: 'square', baseFreq: 42, freqPerSpeed: 170, freqPerThrottle: 32, gainBase: 0.06, gainPerSpeed: 0.1, gainPerThrottle: 0.035, filterBase: 320, filterPerSpeed: 1600, overtone: false },
  pickup: { osc1: 'square', osc2: 'sawtooth', baseFreq: 38, freqPerSpeed: 150, freqPerThrottle: 30, gainBase: 0.07, gainPerSpeed: 0.11, gainPerThrottle: 0.04, filterBase: 280, filterPerSpeed: 1400, overtone: false },
  ev: { osc1: 'sine', osc2: 'sine', baseFreq: 90, freqPerSpeed: 260, freqPerThrottle: 20, gainBase: 0.025, gainPerSpeed: 0.035, gainPerThrottle: 0.012, filterBase: 900, filterPerSpeed: 2600, overtone: true },
};

// All sound is synthesized at runtime via the Web Audio API so the game has
// zero binary asset dependencies. Engine pitch/volume tracks vehicle speed live.
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.7;
    this._unlocked = false;
    this._engineNodes = null;
    this._ambientNodes = null;
    this._overtoneNodes = null;
    this._profile = VEHICLE_AUDIO_PROFILES.sedan;

    const unlock = () => {
      if (this._unlocked) return;
      this._init();
      this._unlocked = true;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  _init() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volume;
    this.masterGain.connect(this.ctx.destination);

    this._noiseBuffer = this._createNoiseBuffer();
    this._startEngine();
    this._startOvertone();
    this._startAmbient();
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  // Selects the engine tone table for the active vehicle's category (sedan/suv/pickup/ev — see
  // Car.js's `category` field). Only reassigns oscillator waveform/gain targets on the already-
  // running nodes from _startEngine(); nothing is torn down or recreated, so switching vehicles
  // mid-session (Shop "Use") re-tunes the same continuous tone instead of restarting it.
  setVehicleProfile(category) {
    this._profile = VEHICLE_AUDIO_PROFILES[category] || VEHICLE_AUDIO_PROFILES.sedan;
    if (this._engineNodes) {
      this._engineNodes.osc.type = this._profile.osc1;
      this._engineNodes.osc2.type = this._profile.osc2;
    }
  }

  _createNoiseBuffer() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _startEngine() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = this._profile.osc1;
    const osc2 = ctx.createOscillator();
    osc2.type = this._profile.osc2;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.frequency.value = 60;
    osc2.frequency.value = 120;
    osc.start();
    osc2.start();

    this._engineNodes = { osc, osc2, gain, filter };
  }

  // Always-running (gain-gated) high overtone layer — only the EV profile raises its gain above
  // zero (updateEngine()), giving electric vehicles a quiet "futuristic" whine on top of the base
  // tone without needing to create/destroy oscillator nodes per vehicle switch (a WebAudio
  // OscillatorNode can only be started/stopped once).
  _startOvertone() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    this._overtoneNodes = { osc, gain };
  }

  _startAmbient() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.value = 0.02;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    this._ambientNodes = { src, gain };
  }

  // speedRatio: 0..1+ of max speed, throttle: 0..1 — tone shape comes entirely from the active
  // VEHICLE_AUDIO_PROFILES entry (setVehicleProfile), so each category (sedan/suv/pickup/ev)
  // accelerates/idles with its own pitch and volume curve.
  updateEngine(speedRatio, throttle) {
    if (!this._engineNodes) return;
    const p = this._profile;
    const now = this.ctx.currentTime;
    const targetFreq = p.baseFreq + speedRatio * p.freqPerSpeed + throttle * p.freqPerThrottle;
    const targetGain = p.gainBase + Math.min(speedRatio, 1) * p.gainPerSpeed + throttle * p.gainPerThrottle;
    this._engineNodes.osc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this._engineNodes.osc2.frequency.setTargetAtTime(targetFreq * 2.01, now, 0.08);
    this._engineNodes.filter.frequency.setTargetAtTime(p.filterBase + speedRatio * p.filterPerSpeed, now, 0.1);
    this._engineNodes.gain.gain.setTargetAtTime(targetGain, now, 0.05);

    if (this._overtoneNodes) {
      const overtoneGain = p.overtone ? 0.015 + Math.min(speedRatio, 1) * 0.05 : 0;
      const overtoneFreq = 1400 + speedRatio * 2600;
      this._overtoneNodes.osc.frequency.setTargetAtTime(overtoneFreq, now, 0.08);
      this._overtoneNodes.gain.gain.setTargetAtTime(overtoneGain, now, 0.08);
    }
  }

  // Starter-motor grind (filtered noise burst) into a rising tone that settles at idle —
  // played once whenever a car spawns (CarController constructor), covering level start,
  // retries, and vehicle switches.
  playEngineStart() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 180;
    filter.Q.value = 4;
    const grindGain = ctx.createGain();
    grindGain.gain.setValueAtTime(0.001, ctx.currentTime);
    grindGain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.05);
    grindGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    src.connect(filter);
    filter.connect(grindGain);
    grindGain.connect(this.masterGain);
    src.start();
    src.stop(ctx.currentTime + 0.35);

    const osc = ctx.createOscillator();
    osc.type = this._profile.osc1;
    const oscGain = ctx.createGain();
    osc.frequency.setValueAtTime(20, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(this._profile.baseFreq, ctx.currentTime + 0.5);
    oscGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.1);
    oscGain.gain.linearRampToValueAtTime(this._profile.gainBase, ctx.currentTime + 0.5);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(ctx.currentTime + 0.1);
    osc.stop(ctx.currentTime + 0.7);
  }

  // Quick descending tone — played once when leaving a driving session back to the menu.
  playEngineStop() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = this._profile.osc1;
    osc.frequency.setValueAtTime(Math.max(this._profile.baseFreq, 40), ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(this._profile.gainBase, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  }

  // Short double-beep — played once on the D-to-R gear transition (not continuously in reverse).
  playReverseBeep() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (const offset of [0, 0.18]) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 1200;
      const gain = ctx.createGain();
      const start = ctx.currentTime + offset;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.15);
    }
  }

  // Short mechanical ratchet click — played once on handbrake key-down, distinct from the
  // continuous slide screech in playBrakeScreech (which only fires while sliding at speed).
  playHandbrakeEngage() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    src.stop(ctx.currentTime + 0.08);
  }

  playBrakeScreech(intensity = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    filter.Q.value = 6;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18 * intensity, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    src.stop(ctx.currentTime + 0.45);
  }

  playCollision(intensity = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;
    const gain = ctx.createGain();
    const amp = Math.min(1, intensity) * 0.5;
    gain.gain.setValueAtTime(amp, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start();
    src.stop(ctx.currentTime + 0.3);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, ctx.currentTime);
    thump.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(amp * 0.8, ctx.currentTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    thump.connect(thumpGain);
    thumpGain.connect(this.masterGain);
    thump.start();
    thump.stop(ctx.currentTime + 0.25);
  }

  playSuccessChime() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.11;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.5);
    });
  }

  playFailBuzz() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 110;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  }

  // Short blip for the parking-assist proximity sensor; pitch rises as intensity (closeness)
  // increases, same lightweight synth style as playUIClick.
  playProximityBeep(intensity = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 700 + intensity * 500;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  }

  playUIClick() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }
}
