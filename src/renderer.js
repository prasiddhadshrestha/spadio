import { mapBandToEvents } from './mapping.js';

export function encodeAudioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(audioBuffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function renderBandsToWavBlob(bands, options = {}) {
  const {
    style = 'sparkle',
    scaleId = 'pentatonic',
    maxBrightness = 0.01,
    stepSec = 0.42,
    sampleRate = 22050
  } = options;

  const totalSec = bands.length * stepSec + 1.2;
  const OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const ctx = new OfflineCtx(2, Math.ceil(totalSec * sampleRate), sampleRate);

  const comp = ctx.createDynamicsCompressor();
  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(comp);
  comp.connect(ctx.destination);

  bands.forEach((band, idx) => {
    const t = idx * stepSec + 0.02;
    const { events } = mapBandToEvents(band, {
      style,
      scaleId,
      maxBrightness,
      bandCount: bands.length,
      bandIndex: idx
    });

    for (const ev of events) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = ev.wave || 'sine';
      osc.frequency.setValueAtTime(ev.freq, t);
      if (ev.glideToFreq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, ev.glideToFreq), t + ev.duration);
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, ev.gain), t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + ev.duration);

      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(ev.pan || 0, t);
      osc.connect(g);
      g.connect(pan);
      pan.connect(master);

      osc.start(t);
      osc.stop(t + ev.duration + 0.05);
    }
  });

  const rendered = await ctx.startRendering();
  return encodeAudioBufferToWav(rendered);
}
