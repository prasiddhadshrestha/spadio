import { AudioNoteEvent } from './mapping';

const MAX_VOICES = 64;

interface ActiveVoice {
  osc: OscillatorNode;
  gain: GainNode;
}

export class SonificationEngine {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private activeVoices: ActiveVoice[] = [];
  private volume: number = 0.75;
  private timer: number | null = null;

  public init(): void {
    if (this.ac) return;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ac = new AudioContextClass();

    // Pre-generate percussive noise buffer for Taiko drum skin strikes & rim clicks
    const bufferSize = Math.floor(this.ac.sampleRate * 0.25);
    this.noiseBuffer = this.ac.createBuffer(1, bufferSize, this.ac.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ac.sampleRate * 0.04));
    }

    this.compressor = this.ac.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.2;

    this.analyser = this.ac.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.78;

    this.master = this.ac.createGain();
    this.master.gain.value = this.volume;

    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ac.destination);

    if (this.ac.state === 'suspended') {
      this.ac.resume().catch(() => {});
    }
  }

  public setVolume(val0to1: number): void {
    this.volume = Math.max(0, Math.min(1, val0to1));
    if (this.master && this.ac) {
      const t = this.ac.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(this.volume, t + 0.04);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getAudioContext(): AudioContext | null {
    return this.ac;
  }

  public scheduleEvent(ev: AudioNoteEvent): void {
    if (!this.ac || !this.master) {
      this.init();
    }
    if (!this.ac || !this.master) return;

    if (this.ac.state === 'suspended') {
      this.ac.resume().catch(() => {});
    }

    const t = this.ac.currentTime;

    while (this.activeVoices.length >= MAX_VOICES) {
      const oldest = this.activeVoices.shift();
      if (oldest) {
        try {
          oldest.gain.gain.cancelScheduledValues(t);
          oldest.gain.gain.setValueAtTime(0.0001, t);
          oldest.osc.stop(t + 0.02);
        } catch {
          // already stopped
        }
      }
    }

    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();
    osc.type = ev.wave || 'sine';
    osc.frequency.setValueAtTime(Math.max(20, ev.freq), t);

    const attackTime = ev.attack !== undefined ? Math.max(0.001, ev.attack) : 0.025;

    if (ev.glideToFreq) {
      const glideDur = ev.glideDuration !== undefined ? Math.max(0.02, ev.glideDuration) : Math.max(0.05, ev.duration);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, ev.glideToFreq),
        t + glideDur
      );
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, ev.gain), t + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + attackTime + ev.duration);

    let outputNode: AudioNode = gain;
    if (ev.filterFreq) {
      const filter = this.ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(ev.filterFreq, t);
      filter.Q.setValueAtTime(1.8, t);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    let targetBus: AudioNode = this.master;
    if (this.ac.createStereoPanner && ev.pan !== undefined) {
      const panner = this.ac.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, ev.pan)), t);
      outputNode.connect(panner);
      panner.connect(this.master);
      targetBus = panner;
    } else {
      outputNode.connect(this.master);
    }

    // Taiko / Drum skin strike transient burst
    if (ev.noiseGain && ev.noiseGain > 0 && this.noiseBuffer) {
      const noiseSrc = this.ac.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;

      const noiseFilter = this.ac.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(ev.noiseFilterFreq || 480, t);
      noiseFilter.Q.setValueAtTime(1.5, t);

      const noiseGainNode = this.ac.createGain();
      noiseGainNode.gain.setValueAtTime(Math.max(0.0002, ev.noiseGain), t);
      noiseGainNode.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGainNode);
      noiseGainNode.connect(targetBus);

      noiseSrc.start(t);
      noiseSrc.stop(t + 0.07);
    }

    const voice: ActiveVoice = { osc, gain };
    this.activeVoices.push(voice);

    osc.onended = () => {
      const idx = this.activeVoices.indexOf(voice);
      if (idx !== -1) this.activeVoices.splice(idx, 1);
    };

    osc.start(t);
    osc.stop(t + attackTime + ev.duration + 0.05);
  }

  public scheduleEvents(events: AudioNoteEvent[]): void {
    for (const ev of events) {
      this.scheduleEvent(ev);
    }
  }

  public startScheduler(getStepDurationSec: () => number, onStep: () => void): void {
    this.stopScheduler();
    try {
      this.init();
    } catch {
      // Allow visual scan even if audio context blocked
    }

    const runStep = () => {
      if (this.ac && this.ac.state === 'suspended') {
        this.ac.resume().catch(() => {});
      }
      onStep();
    };

    runStep();
    this.timer = window.setInterval(
      runStep,
      Math.max(50, Math.round(getStepDurationSec() * 1000))
    );
  }

  public stopScheduler(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const t = this.ac?.currentTime || 0;
    for (const voice of this.activeVoices) {
      try {
        voice.gain.gain.cancelScheduledValues(t);
        voice.gain.gain.linearRampToValueAtTime(0.0001, t + 0.05);
        voice.osc.stop(t + 0.06);
      } catch {
        // Ignore
      }
    }
    this.activeVoices = [];
  }

  public getAnalyserData(dataArray: Uint8Array): void {
    if (this.analyser) {
      (this.analyser as unknown as { getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(
        dataArray
      );
    }
  }

  public getLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.getAnalyserData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length) / 255;
    return Math.min(1, rms * 2.2);
  }
}
