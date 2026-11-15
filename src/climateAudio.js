/**
 * SPADIO Planetary Thermal Resonance Synthesizer
 * Deterministically sonifies global temperature anomalies (1980 - 2026).
 */

export class ClimateSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.isPlaying = false;
  }

  init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.setValueAtTime(280, this.ctx.currentTime);
    this.filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    this.filter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Fundamental Earth resonance carrier (Schumann-scaled octave)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.setValueAtTime(110, this.ctx.currentTime); // A2

    // Thermal dissonance overtone
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.setValueAtTime(165, this.ctx.currentTime); // E3 fifth

    this.osc1.connect(this.filter);
    this.osc2.connect(this.filter);

    this.osc1.start();
    this.osc2.start();
  }

  setMuted(muted) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const targetGain = muted ? 0 : 0.18;
    this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    this.isPlaying = !muted;
  }

  updateAnomaly(tempAnomaly) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Map Anomaly (+0.1 to +1.52 C) to subtle pitch ascension and harmonic tension
    const baseFreq = 100 + (tempAnomaly * 28); // 103 Hz to 142 Hz
    const overtoneDetune = tempAnomaly * 18; // Detune spread creates acoustic tension

    this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
    this.osc2.frequency.setTargetAtTime((baseFreq * 1.5) + overtoneDetune, now, 0.05);
    this.filter.frequency.setTargetAtTime(240 + (tempAnomaly * 220), now, 0.05);
  }

  stop() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    this.isPlaying = false;
  }
}
