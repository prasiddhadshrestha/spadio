const MAX_VOICES = 12;

export class AudioEngine {
  constructor() {
    this.ac = null;
    this.master = null;
    this.compressor = null;
    this.activeVoices = [];
    this.volume = 0.75;
    this.timer = null;
  }

  init() {
    if (!this.ac) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ac = new Ctx();
      this.compressor = this.ac.createDynamicsCompressor();
      this.compressor.threshold.value = -16;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 6;
      this.compressor.attack.value = 0.005;
      this.compressor.release.value = 0.2;

      this.master = this.ac.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.compressor);
      this.compressor.connect(this.ac.destination);
    }
    if (this.ac.state === 'suspended') {
      this.ac.resume().catch(() => {});
    }
  }

  setVolume(val0to1) {
    this.volume = Math.max(0, Math.min(1, val0to1));
    if (this.master) {
      this.master.gain.value = this.volume;
    }
  }

  scheduleEvent(ev) {
    if (!this.ac || !this.master) return;
    const t = this.ac.currentTime;

    while (this.activeVoices.length >= MAX_VOICES) {
      const oldest = this.activeVoices.shift();
      try {
        oldest.gain.gain.cancelScheduledValues(t);
        oldest.gain.gain.setValueAtTime(0.0001, t);
        oldest.osc.stop(t + 0.02);
      } catch {
        // already stopped
      }
    }

    const osc = this.ac.createOscillator();
    const gain = this.ac.createGain();
    osc.type = ev.wave || 'sine';
    osc.frequency.value = ev.freq;
    if (ev.glideToFreq) {
      osc.frequency.setValueAtTime(ev.freq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, ev.glideToFreq), t + ev.duration);
    }

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, ev.gain), t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03 + ev.duration);

    osc.connect(gain);
    if (this.ac.createStereoPanner) {
      const panner = this.ac.createStereoPanner();
      panner.pan.value = ev.pan || 0;
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }

    const voice = { osc, gain };
    this.activeVoices.push(voice);
    osc.onended = () => {
      const idx = this.activeVoices.indexOf(voice);
      if (idx !== -1) this.activeVoices.splice(idx, 1);
    };

    osc.start(t);
    osc.stop(t + 0.03 + ev.duration + 0.05);
  }

  scheduleEvents(events) {
    for (const ev of events) {
      this.scheduleEvent(ev);
    }
  }

  startScheduler(getStepDurationSec, onStep) {
    this.stopScheduler();
    try {
      this.init();
    } catch {
      // Allow visual scan and captions even if Web Audio fails
    }

    const runStep = () => {
      if (this.ac && this.ac.state === 'suspended') {
        this.ac.resume().catch(() => {});
      }
      onStep();
    };

    runStep();
    this.timer = setInterval(runStep, Math.max(50, Math.round(getStepDurationSec() * 1000)));
  }

  stopScheduler() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
