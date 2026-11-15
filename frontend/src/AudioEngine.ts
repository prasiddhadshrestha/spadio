/**
 * AudioEngine.ts - Web Audio API Synthesis Engine for Earth Information Jukebox
 * Translates temperature & climate anomalies into expressive harmonic soundscapes.
 */

export interface ClimateAudioState {
  pitchHz: number;
  dissonance: number; // 0.0 (pure consonance) to 1.0 (harsh tritone/minor 2nd)
  pulseBpm: number;
  distressScore: number;
}

export class EarthAudioEngine {
  private ctx: AudioContext | null = null;
  private primaryOsc: OscillatorNode | null = null;
  private secondaryOsc: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private pulseLfo: OscillatorNode | null = null;
  private pulseLfoGain: GainNode | null = null;
  private pulseVca: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private volumeGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying: boolean = false;
  private currentVolume: number = 0.75;
  private stopTimeoutId: number | null = null;

  public init(): void {
    if (this.ctx) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.78;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.setValueAtTime(520, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.6, this.ctx.currentTime);

    this.pulseVca = this.ctx.createGain();
    this.pulseVca.gain.setValueAtTime(0.85, this.ctx.currentTime);

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.volumeGain = this.ctx.createGain();
    this.volumeGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);

    this.filterNode.connect(this.pulseVca);
    this.pulseVca.connect(this.masterGain);
    this.masterGain.connect(this.volumeGain);
    this.volumeGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  private cleanupOscillators(): void {
    const nodes = [this.primaryOsc, this.secondaryOsc, this.subOsc, this.pulseLfo];
    for (const node of nodes) {
      if (node) {
        try {
          node.stop();
        } catch {
          // Already stopped
        }
        try {
          node.disconnect();
        } catch {
          // Ignore
        }
      }
    }
    try {
      this.pulseLfoGain?.disconnect();
    } catch {
      // Ignore
    }
    this.primaryOsc = null;
    this.secondaryOsc = null;
    this.subOsc = null;
    this.pulseLfo = null;
    this.pulseLfoGain = null;
  }

  public start(): void {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.filterNode || !this.masterGain || !this.pulseVca) return;

    if (this.stopTimeoutId !== null) {
      window.clearTimeout(this.stopTimeoutId);
      this.stopTimeoutId = null;
      this.cleanupOscillators();
      this.isPlaying = false;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.isPlaying) return;

    const t = this.ctx.currentTime;

    // Primary Oscillator: Warm root tone
    this.primaryOsc = this.ctx.createOscillator();
    this.primaryOsc.type = 'sine';
    this.primaryOsc.frequency.setValueAtTime(210, t);

    // Secondary Oscillator: Harmonic interval / dissonance voice
    this.secondaryOsc = this.ctx.createOscillator();
    this.secondaryOsc.type = 'triangle';
    this.secondaryOsc.frequency.setValueAtTime(210 * 1.5, t);

    // Sub-Harmonic Warmth Oscillator (an octave below, quiet)
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.setValueAtTime(105, t);
    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.28, t);

    // Rhythmic Pulse LFO driven by pulseBpm
    this.pulseLfo = this.ctx.createOscillator();
    this.pulseLfo.type = 'sine';
    this.pulseLfo.frequency.setValueAtTime(1.2, t);
    this.pulseLfoGain = this.ctx.createGain();
    this.pulseLfoGain.gain.setValueAtTime(0.14, t);
    this.pulseLfo.connect(this.pulseLfoGain);
    this.pulseLfoGain.connect(this.pulseVca.gain);

    this.primaryOsc.connect(this.filterNode);
    this.secondaryOsc.connect(this.filterNode);
    this.subOsc.connect(subGain);
    subGain.connect(this.filterNode);

    this.primaryOsc.start(t);
    this.secondaryOsc.start(t);
    this.subOsc.start(t);
    this.pulseLfo.start(t);

    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
    this.masterGain.gain.linearRampToValueAtTime(0.36, t + 0.18);

    this.isPlaying = true;
  }

  public updateState(state: ClimateAudioState): void {
    if (
      !this.ctx ||
      !this.isPlaying ||
      !this.primaryOsc ||
      !this.secondaryOsc ||
      !this.subOsc ||
      !this.filterNode ||
      !this.pulseLfo ||
      !this.pulseLfoGain
    ) {
      return;
    }

    const t = this.ctx.currentTime;
    const rampTime = 0.14;

    // 1. Fundamental Pitch
    this.primaryOsc.frequency.cancelScheduledValues(t);
    this.primaryOsc.frequency.linearRampToValueAtTime(state.pitchHz, t + rampTime);

    this.subOsc.frequency.cancelScheduledValues(t);
    this.subOsc.frequency.linearRampToValueAtTime(Math.max(55, state.pitchHz * 0.5), t + rampTime);

    // 2. Harmonic Interval Morph: Fifth (1.5) -> Tritone (1.414) -> Minor 2nd tension (1.059)
    let ratio: number;
    if (state.dissonance <= 0.6) {
      ratio = 1.5 - (state.dissonance / 0.6) * 0.086;
    } else {
      const upperT = (state.dissonance - 0.6) / 0.4;
      ratio = 1.414 - upperT * (1.414 - 1.059);
    }

    this.secondaryOsc.frequency.cancelScheduledValues(t);
    this.secondaryOsc.frequency.linearRampToValueAtTime(state.pitchHz * ratio, t + rampTime);

    // 3. Lowpass Filter Sweep: Warmer when calm, brighter/edgier as anomaly rises
    const cutoff = 320 + state.distressScore * 3100;
    this.filterNode.frequency.cancelScheduledValues(t);
    this.filterNode.frequency.linearRampToValueAtTime(cutoff, t + rampTime);

    // 4. Rhythmic Temperature Pulse LFO (BPM -> Hz)
    const lfoHz = Math.max(0.6, Math.min(4.0, state.pulseBpm / 60));
    this.pulseLfo.frequency.cancelScheduledValues(t);
    this.pulseLfo.frequency.linearRampToValueAtTime(lfoHz, t + rampTime);

    const pulseDepth = 0.08 + state.distressScore * 0.14;
    this.pulseLfoGain.gain.cancelScheduledValues(t);
    this.pulseLfoGain.gain.linearRampToValueAtTime(pulseDepth, t + rampTime);
  }

  public setVolume(volume: number): void {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.volumeGain) {
      const t = this.ctx.currentTime;
      this.volumeGain.gain.cancelScheduledValues(t);
      this.volumeGain.gain.linearRampToValueAtTime(this.currentVolume, t + 0.05);
    }
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public stop(): void {
    if (!this.ctx || !this.isPlaying || !this.masterGain) return;
    const t = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(t);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, t);
    this.masterGain.gain.linearRampToValueAtTime(0.0, t + 0.14);

    if (this.stopTimeoutId !== null) {
      window.clearTimeout(this.stopTimeoutId);
    }

    this.isPlaying = false;
    this.stopTimeoutId = window.setTimeout(() => {
      this.cleanupOscillators();
      this.stopTimeoutId = null;
    }, 155);
  }

  public getAnalyserData(dataArray: Uint8Array): void {
    if (this.analyser) {
      (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(
        dataArray
      );
    }
  }

  public getLevel(): number {
    if (!this.analyser || !this.isPlaying) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.getAnalyserData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length) / 255;
    return Math.min(1, rms * 2);
  }
}
