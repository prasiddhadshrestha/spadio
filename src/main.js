import { BAND_COUNT, CANVAS_HEIGHT, CANVAS_WIDTH, SPEED_INTERVALS_MS } from './presets.js';
import { analyzeImageData, drawFrameToContext } from './analyzer.js';
import { selectStyle } from './styleSelector.js';
import { mapBandToEvents } from './mapping.js';
import { AudioEngine } from './engine.js';
import { FrameSequencer } from './sequencer.js';
import { Narrator } from './narrator.js';
import { playDetentClick, triggerHaptic } from './tactileAudio.js';
import {
  buildStyleButtons,
  buildTrackShelf,
  clearPulses,
  drawProgressiveStrip,
  spawnPulses,
  updateScanOverlay,
  updateStyleDisplay,
  updateTrackShelfSelection
} from './ui.js';

const stageCanvas = document.getElementById('cv');
const stageCtx = stageCanvas.getContext('2d', { willReadFrequently: true });
const stripCanvas = document.getElementById('strip');
const stripCtx = stripCanvas.getContext('2d');

const engine = new AudioEngine();
const sequencer = new FrameSequencer();
const narrator = new Narrator(document.getElementById('live-cap'));

const state = {
  tracks: [],
  trackIdx: 0,
  selectedStyle: 'auto',
  resolvedStyle: 'sparkle',
  scaleId: 'pentatonic',
  scanMode: 'radar',
  speed: 3,
  loop: true,
  playing: false,
  pos: 0,
  analysis: null,
  scanned: new Array(BAND_COUNT).fill(false),
  uploadedImage: null,
  uploadedName: ''
};

function getStepIntervalMs() {
  return SPEED_INTERVALS_MS[Math.max(0, Math.min(4, state.speed - 1))];
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function analyzeCurrentCanvas() {
  const imgData = stageCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const prevBands = state.uploadedImage ? null : sequencer.getPreviousBands();
  const result = analyzeImageData(imgData.data, CANVAS_WIDTH, CANVAS_HEIGHT, {
    bandCount: BAND_COUNT,
    scanMode: state.scanMode,
    prevFrameBands: prevBands
  });

  state.analysis = result;
  if (!state.uploadedImage) {
    sequencer.storeAnalysis(sequencer.currentIndex, result);
  }

  const track = state.tracks[state.trackIdx];
  if (state.selectedStyle === 'auto') {
    state.resolvedStyle = state.uploadedImage
      ? selectStyle(result.summary)
      : (track?.defaultStyle || selectStyle(result.summary));
  } else {
    state.resolvedStyle = state.selectedStyle;
  }

  state.scanned.fill(false);
  drawProgressiveStrip(stripCtx, result.bands, result.maxBrightness, state.scanned, -1);
  updateStyleDisplay(state.selectedStyle, state.resolvedStyle);
}

async function renderCurrentFrame() {
  if (state.uploadedImage) {
    drawFrameToContext(stageCtx, state.uploadedImage, CANVAS_WIDTH, CANVAS_HEIGHT);
    document.getElementById('stage-title').textContent = `Uploaded: ${state.uploadedName}`;
    document.getElementById('frame-badge').textContent = 'User Frame';
    analyzeCurrentCanvas();
    return;
  }

  const track = state.tracks[state.trackIdx];
  if (!track) return;

  const frameUrl = sequencer.frames[sequencer.currentIndex];
  const img = await loadImage(frameUrl);
  drawFrameToContext(stageCtx, img, CANVAS_WIDTH, CANVAS_HEIGHT);

  const label = sequencer.getCurrentLabel();
  document.getElementById('stage-title').textContent = `${track.icon} ${track.name} · ${label}`;
  document.getElementById('frame-badge').textContent = track.isPlaceholder ? 'Procedural Preview' : track.svsId;
  analyzeCurrentCanvas();
}

async function selectTrack(idx, autoPickStyle = false) {
  playDetentClick(780 + idx * 40, 0.03);
  triggerHaptic(6);

  state.trackIdx = idx;
  state.pos = 0;
  state.uploadedImage = null;
  const track = state.tracks[idx];
  if (!track) return;

  if (autoPickStyle) state.selectedStyle = 'auto';

  sequencer.setTrackFrames(track.frames, track.labels);
  updateTrackShelfSelection(document.getElementById('track-shelf'), idx);

  document.getElementById('track-desc').textContent = track.description;
  document.getElementById('track-why').textContent = track.whyItMatters ? `Scientific context: ${track.whyItMatters}` : '';

  const sliderWrap = document.getElementById('frame-slider-wrap');
  const rngFrame = document.getElementById('rng-frame');
  if (track.frames.length > 1) {
    sliderWrap.hidden = false;
    rngFrame.max = String(track.frames.length - 1);
    rngFrame.value = '0';
    document.getElementById('lbl-frame').textContent = `1 / ${track.frames.length} (${track.labels[0] || ''})`;
  } else {
    sliderWrap.hidden = true;
  }

  await renderCurrentFrame();
  narrator.speak(`${track.name}. ${track.description}`);
  syncHash();
}

function step(audioTime) {
  if (!state.analysis) return;
  if (state.pos === 0) state.scanned.fill(false);

  const idxPos = state.scanMode === 'rl' ? BAND_COUNT - 1 - state.pos : state.pos;
  const band = state.analysis.bands[idxPos];
  const stepMs = getStepIntervalMs();
  const mapped = mapBandToEvents(band, {
    style: state.resolvedStyle,
    scaleId: state.scaleId,
    maxBrightness: state.analysis.maxBrightness,
    bandCount: BAND_COUNT,
    bandIndex: idxPos
  });

  engine.scheduleEvents(mapped.events);

  state.scanned[idxPos] = true;
  drawProgressiveStrip(stripCtx, state.analysis.bands, state.analysis.maxBrightness, state.scanned, idxPos);
  updateScanOverlay(state.scanMode, idxPos, state.pos, true, stepMs);
  spawnPulses(band.hotspots, stepMs);

  document.getElementById('band-readout').textContent = `Band ${idxPos + 1}/${BAND_COUNT}`;
  narrator.updateCaption(mapped.caption, stepMs);

  state.pos++;
  if (state.pos >= BAND_COUNT) {
    state.pos = 0;
    if (!state.uploadedImage && sequencer.getFrameCount() > 1) {
      sequencer.advance();
      const rngFrame = document.getElementById('rng-frame');
      rngFrame.value = String(sequencer.currentIndex);
      document.getElementById('lbl-frame').textContent =
        `${sequencer.currentIndex + 1} / ${sequencer.getFrameCount()} (${sequencer.getCurrentLabel()})`;
      renderCurrentFrame();
    }
    if (!state.loop) {
      setPlaying(false);
    }
  }
}

async function setPlaying(shouldPlay) {
  playDetentClick(shouldPlay ? 1040 : 540, 0.04);
  triggerHaptic(8);

  state.playing = shouldPlay;
  const btn = document.getElementById('btn-play');
  btn.textContent = shouldPlay ? '⏸ Pause' : '▶ Power / Play';
  btn.setAttribute('aria-pressed', String(shouldPlay));

  if (shouldPlay) {
    if (!state.analysis) {
      await renderCurrentFrame();
    }
    engine.startScheduler(() => getStepIntervalMs() / 1000, step);
  } else {
    engine.stopScheduler();
    updateScanOverlay(state.scanMode, 0, 0, false);
    clearPulses();
  }
}

function syncHash() {
  const track = state.tracks[state.trackIdx];
  if (!track) return;
  const params = new URLSearchParams({
    track: track.id,
    style: state.selectedStyle,
    scale: state.scaleId,
    speed: String(state.speed)
  });
  history.replaceState(null, '', `#${params.toString()}`);
}

function updateRotaryVisual(speedVal) {
  const knob = document.getElementById('rotary-tuner');
  if (!knob) return;
  // Map speed 1-5 to angle -135deg to +135deg (270 degree rotation arc)
  const angle = ((speedVal - 1) / 4) * 270 - 135;
  knob.style.transform = `rotate(${angle}deg)`;
  knob.setAttribute('aria-valuenow', String(speedVal));
}

function setupRotaryKnob() {
  const knob = document.getElementById('rotary-tuner');
  if (!knob) return;

  let isDragging = false;
  let startY = 0;
  let startSpeed = state.speed;

  const onPointerDown = (e) => {
    isDragging = true;
    startY = e.clientY;
    startSpeed = state.speed;
    knob.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY;
    const stepDelta = Math.round(deltaY / 22);
    const newSpeed = Math.max(1, Math.min(5, startSpeed + stepDelta));
    if (newSpeed !== state.speed) {
      state.speed = newSpeed;
      document.getElementById('rng-spd').value = String(newSpeed);
      document.getElementById('lbl-spd').textContent = String(newSpeed);
      updateRotaryVisual(newSpeed);
      playDetentClick(600 + newSpeed * 80, 0.025);
      triggerHaptic(4);
      if (state.playing) {
        engine.startScheduler(() => getStepIntervalMs() / 1000, step);
      }
      syncHash();
    }
  };

  const onPointerUp = () => {
    isDragging = false;
  };

  knob.onpointerdown = onPointerDown;
  knob.onpointermove = onPointerMove;
  knob.onpointerup = onPointerUp;
  knob.onpointercancel = onPointerUp;

  knob.onkeydown = (e) => {
    let nextSpeed = state.speed;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') nextSpeed = Math.min(5, state.speed + 1);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') nextSpeed = Math.max(1, state.speed - 1);
    else return;

    e.preventDefault();
    if (nextSpeed !== state.speed) {
      state.speed = nextSpeed;
      document.getElementById('rng-spd').value = String(nextSpeed);
      document.getElementById('lbl-spd').textContent = String(nextSpeed);
      updateRotaryVisual(nextSpeed);
      playDetentClick(600 + nextSpeed * 80, 0.025);
      triggerHaptic(4);
      if (state.playing) {
        engine.startScheduler(() => getStepIntervalMs() / 1000, step);
      }
      syncHash();
    }
  };

  updateRotaryVisual(state.speed);
}

function applyHashState() {
  if (!window.location.hash || window.location.hash.length < 2) return;
  const params = new URLSearchParams(window.location.hash.slice(1));
  const tId = params.get('track');
  if (tId) {
    const idx = state.tracks.findIndex((t) => t.id === tId);
    if (idx !== -1) state.trackIdx = idx;
  }
  if (params.get('style')) state.selectedStyle = params.get('style');
  if (params.get('scale')) {
    state.scaleId = params.get('scale');
    document.getElementById('sel-scale').value = state.scaleId;
  }
  if (params.get('speed')) {
    state.speed = Number(params.get('speed')) || 3;
    document.getElementById('rng-spd').value = String(state.speed);
    document.getElementById('lbl-spd').textContent = String(state.speed);
  }
}

async function init() {
  const res = await fetch('tracks/manifest.json');
  const manifest = await res.json();
  state.tracks = manifest.tracks || [];

  applyHashState();

  buildTrackShelf(document.getElementById('track-shelf'), state.tracks, (i) => selectTrack(i, false));
  buildStyleButtons(document.getElementById('style-buttons'), (styleId) => {
    playDetentClick(880, 0.025);
    triggerHaptic(4);
    state.selectedStyle = styleId;
    analyzeCurrentCanvas();
    syncHash();
  });

  setupRotaryKnob();

  document.getElementById('btn-play').onclick = () => setPlaying(!state.playing);
  document.getElementById('btn-loop').onclick = function () {
    playDetentClick(680, 0.02);
    state.loop = !state.loop;
    this.setAttribute('aria-pressed', String(state.loop));
    this.textContent = `Loop: ${state.loop ? 'On' : 'Off'}`;
  };

  document.getElementById('sel-scale').onchange = function () {
    playDetentClick(740, 0.02);
    state.scaleId = this.value;
    syncHash();
  };
  document.getElementById('sel-scan').onchange = function () {
    playDetentClick(820, 0.02);
    state.scanMode = this.value;
    state.pos = 0;
    analyzeCurrentCanvas();
  };
  document.getElementById('rng-spd').oninput = function () {
    state.speed = Number(this.value);
    document.getElementById('lbl-spd').textContent = this.value;
    updateRotaryVisual(state.speed);
    playDetentClick(600 + state.speed * 80, 0.02);
    if (state.playing) {
      engine.startScheduler(() => getStepIntervalMs() / 1000, step);
    }
    syncHash();
  };
  document.getElementById('rng-vol').oninput = function () {
    document.getElementById('lbl-vol').textContent = `${this.value}%`;
    engine.setVolume(Number(this.value) / 100);
  };
  document.getElementById('rng-frame').oninput = function () {
    sequencer.currentIndex = Number(this.value);
    state.pos = 0;
    document.getElementById('lbl-frame').textContent =
      `${sequencer.currentIndex + 1} / ${sequencer.getFrameCount()} (${sequencer.getCurrentLabel()})`;
    playDetentClick(940, 0.02);
    renderCurrentFrame();
  };

  document.getElementById('btn-upload').onclick = () => document.getElementById('file-input').click();
  document.getElementById('file-input').onchange = async function () {
    const file = this.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    state.uploadedImage = img;
    state.uploadedName = file.name;
    state.selectedStyle = 'auto';
    state.pos = 0;
    document.getElementById('frame-slider-wrap').hidden = true;
    await renderCurrentFrame();
  };

  document.getElementById('btn-hc').onclick = function () {
    playDetentClick(1100, 0.03);
    const on = document.documentElement.classList.toggle('hc-mode');
    this.setAttribute('aria-pressed', String(on));
  };
  document.getElementById('btn-voice').onclick = function () {
    playDetentClick(900, 0.03);
    const next = !narrator.enabled;
    narrator.setEnabled(next);
    this.setAttribute('aria-pressed', String(next));
    this.textContent = `Narration: ${next ? 'On' : 'Off'}`;
  };
  document.getElementById('btn-about').onclick = function () {
    playDetentClick(800, 0.02);
    const panel = document.getElementById('panel-about');
    panel.hidden = !panel.hidden;
    this.setAttribute('aria-expanded', String(!panel.hidden));
  };
  document.getElementById('close-about').onclick = () => {
    playDetentClick(600, 0.02);
    document.getElementById('panel-about').hidden = true;
    document.getElementById('btn-about').setAttribute('aria-expanded', 'false');
  };

  await selectTrack(state.trackIdx, false);
}

init();
