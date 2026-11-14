import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';
import { analyzeImageData } from '../src/analyzer.js';
import { mapBandToEvents } from '../src/mapping.js';

const SAMPLE_RATE = 22050;
const STEP_SEC = 0.42; // ~20.16s per 48-band sweep

function loadScaled(fullPath, targetW = 640, targetH = 358) {
  const buf = readFileSync(fullPath);
  const raw = fullPath.endsWith('.png') ? PNG.sync.read(buf) : jpeg.decode(buf, { useTArray: true });
  const out = new Uint8ClampedArray(targetW * targetH * 4);
  const s = Math.max(targetW / raw.width, targetH / raw.height);
  const ox = (targetW - raw.width * s) / 2;
  const oy = (targetH - raw.height * s) / 2;
  for (let y = 0; y < targetH; y++) {
    const sy = Math.min(raw.height - 1, Math.max(0, Math.floor((y - oy) / s)));
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(raw.width - 1, Math.max(0, Math.floor((x - ox) / s)));
      const si = (sy * raw.width + sx) * 4;
      const di = (y * targetW + x) * 4;
      out[di] = raw.data[si];
      out[di + 1] = raw.data[si + 1];
      out[di + 2] = raw.data[si + 2];
      out[di + 3] = 255;
    }
  }
  return out;
}

function oscSample(wave, phase) {
  const p = phase - Math.floor(phase);
  if (wave === 'triangle') return 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
  if (wave === 'square') return p < 0.5 ? 0.65 : -0.65;
  return Math.sin(2 * Math.PI * phase);
}

function encodeWav(left, right, sampleRate) {
  const length = left.length;
  const dataSize = length * 4;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let off = 44;
  for (let i = 0; i < length; i++) {
    const l = Math.max(-1, Math.min(1, Math.tanh(left[i])));
    const r = Math.max(-1, Math.min(1, Math.tanh(right[i])));
    buf.writeInt16LE(Math.round(l * 32767), off);
    buf.writeInt16LE(Math.round(r * 32767), off + 2);
    off += 4;
  }
  return buf;
}

function renderTrack(track) {
  const framePath = join(process.cwd(), 'public', track.frames[0]);
  const data = loadScaled(framePath);
  const analysis = analyzeImageData(data, 640, 358);

  const totalSec = analysis.bands.length * STEP_SEC + 1.2;
  const totalSamples = Math.ceil(totalSec * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  const captions = [];

  analysis.bands.forEach((band, idx) => {
    const startSample = Math.floor((idx * STEP_SEC + 0.02) * SAMPLE_RATE);
    const { events, caption } = mapBandToEvents(band, {
      style: track.defaultStyle,
      scaleId: 'pentatonic',
      maxBrightness: analysis.maxBrightness,
      bandCount: analysis.bands.length,
      bandIndex: idx
    });
    if (idx % 6 === 0) captions.push(caption);

    for (const ev of events) {
      const durSamples = Math.floor(ev.duration * SAMPLE_RATE);
      const atkSamples = Math.floor(0.03 * SAMPLE_RATE);
      const pan = ev.pan || 0;
      const lGain = Math.cos(((pan + 1) * Math.PI) / 4);
      const rGain = Math.sin(((pan + 1) * Math.PI) / 4);
      let phase = 0;

      for (let s = 0; s < durSamples && startSample + s < totalSamples; s++) {
        const progress = s / durSamples;
        const env = s < atkSamples
          ? s / atkSamples
          : Math.pow(0.001, (s - atkSamples) / Math.max(1, durSamples - atkSamples));
        const freq = ev.glideToFreq
          ? ev.freq * Math.pow(ev.glideToFreq / ev.freq, progress)
          : ev.freq;
        phase += freq / SAMPLE_RATE;
        const sample = oscSample(ev.wave, phase) * ev.gain * env * 1.4;
        left[startSample + s] += sample * lGain;
        right[startSample + s] += sample * rGain;
      }
    }
  });

  const wavBuf = encodeWav(left, right, SAMPLE_RATE);
  const txtDesc = [
    `Track: ${track.name} (${track.svsId})`,
    `Style: ${track.defaultStyle}`,
    `Source: ${track.source}`,
    `Placeholder: ${track.isPlaceholder ? 'Yes (procedural preview)' : 'No (NASA/Test frame)'}`,
    `Description: ${track.description}`,
    `Why it matters: ${track.whyItMatters || ''}`,
    `Sampled live captions:\n- ${captions.join('\n- ')}`
  ].join('\n');

  return { wavBuf, txtDesc };
}

const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public', 'tracks', 'manifest.json'), 'utf8'));
mkdirSync(join(process.cwd(), 'public', 'renders'), { recursive: true });
mkdirSync(join(process.cwd(), 'renders'), { recursive: true });

for (const track of manifest.tracks) {
  const { wavBuf, txtDesc } = renderTrack(track);
  writeFileSync(join(process.cwd(), 'public', 'renders', `${track.id}.wav`), wavBuf);
  writeFileSync(join(process.cwd(), 'renders', `${track.id}.wav`), wavBuf);
  writeFileSync(join(process.cwd(), 'renders', `${track.id}.txt`), txtDesc);
  console.log(`Rendered ${track.id}.wav (${Math.round(wavBuf.length / 1024)} KB)`);
}
