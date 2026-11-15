import { BAND_COUNT, CANVAS_HEIGHT, CANVAS_WIDTH, SPEED_INTERVALS_MS } from './presets.js';
import { analyzeImageData, drawFrameToContext } from './analyzer.js';
import { selectStyle } from './styleSelector.js';
import { mapBandToEvents } from './mapping.js';
import { AudioEngine } from './engine.js';
import { FrameSequencer } from './sequencer.js';
import { Narrator } from './narrator.js';
import { playDetentClick, triggerHaptic } from './tactileAudio.js';
import { VoiceController } from './voice.js';
import { EarthGlobe } from './globe.js';
import { CLIMATE_DATA, HOTSPOTS, getYearsList } from './climateData.js';
import { ClimateSynthesizer } from './climateAudio.js';
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
let voiceCtrl = null;

let currentChannel = 'ch2';
let globeInstance = null;
const climateSynth = new ClimateSynthesizer();
let currentYear = 2026;
let climateDroneActive = false;
let selectedHotspot = HOTSPOTS[0];

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
  updateProbeHUD(band, idxPos, mapped);

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

function updateProbeHUD(band, bandIdx, mapped) {
  if (!band) return;
  const probeBand = document.getElementById('probe-band');
  const probeLuma = document.getElementById('probe-luma');
  const probeFreq = document.getElementById('probe-freq');
  const probeHue = document.getElementById('probe-hue');

  if (probeBand) {
    probeBand.textContent = `Band ${bandIdx + 1} / ${BAND_COUNT}`;
  }

  if (probeLuma) {
    const pct = Math.round(band.brightness * 100);
    const gainVal = mapped?.events?.[0]?.gain ? (mapped.events[0].gain * 10).toFixed(2) : (band.brightness * 0.8).toFixed(2);
    probeLuma.textContent = `${pct}% (Gain: ${gainVal})`;
  }

  if (probeFreq) {
    if (mapped?.events && mapped.events.length > 0) {
      const f = Math.round(mapped.events[0].freq);
      probeFreq.textContent = `${f} Hz (${getNoteNameFromFreq(f)})`;
    } else {
      probeFreq.textContent = `Quiet / Muted`;
    }
  }

  if (probeHue) {
    const h = Math.round(band.hue || 0);
    let colorName = 'Achromatic';
    if (band.coloredFraction > 0.05) {
      if (h < 30 || h >= 330) colorName = 'Warm Red';
      else if (h < 70) colorName = 'Amber / Yellow';
      else if (h < 160) colorName = 'Forest Green';
      else if (h < 260) colorName = 'Cyan / Ocean Blue';
      else colorName = 'Violet / Magenta';
    }
    probeHue.textContent = `${h}° (${colorName})`;
  }
}

function getNoteNameFromFreq(freq) {
  if (!freq || freq < 20) return '---';
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = Math.round(12 * (Math.log2(freq / 440)) + 69);
  const noteName = notes[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
}

function setupProbeHover() {
  const strip = document.getElementById('strip');
  if (!strip) return;

  strip.addEventListener('mousemove', (e) => {
    if (!state.analysis || !state.analysis.bands) return;
    const rect = strip.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(0.999, x / rect.width));
    const bandIdx = Math.floor(fraction * BAND_COUNT);
    const band = state.analysis.bands[bandIdx];
    if (band) {
      const mapped = mapBandToEvents(band, {
        style: state.resolvedStyle,
        scaleId: state.scaleId,
        maxBrightness: state.analysis.maxBrightness,
        bandCount: BAND_COUNT,
        bandIndex: bandIdx
      });
      updateProbeHUD(band, bandIdx, mapped);
    }
  });

  strip.addEventListener('click', (e) => {
    if (!state.analysis || !state.analysis.bands) return;
    const rect = strip.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(0.999, x / rect.width));
    const bandIdx = Math.floor(fraction * BAND_COUNT);
    const band = state.analysis.bands[bandIdx];
    if (band) {
      const mapped = mapBandToEvents(band, {
        style: state.resolvedStyle,
        scaleId: state.scaleId,
        maxBrightness: state.analysis.maxBrightness,
        bandCount: BAND_COUNT,
        bandIndex: bandIdx
      });
      engine.scheduleEvents(mapped.events);
      playDetentClick(880, 0.02);
      updateProbeHUD(band, bandIdx, mapped);
    }
  });
}

function switchChannel(channelId) {
  if (currentChannel === channelId && document.getElementById(channelId === 'ch1' ? 'ch1-deck' : 'ch2-deck').hidden === false) return;
  playDetentClick(620, 0.04);
  triggerHaptic(8);
  currentChannel = channelId;

  const tabCh1 = document.getElementById('tab-ch1');
  const tabCh2 = document.getElementById('tab-ch2');
  const ch1Deck = document.getElementById('ch1-deck');
  const ch2Deck = document.getElementById('ch2-deck');

  if (channelId === 'ch1') {
    tabCh1.classList.add('active');
    tabCh1.setAttribute('aria-selected', 'true');
    tabCh2.classList.remove('active');
    tabCh2.setAttribute('aria-selected', 'false');

    ch1Deck.hidden = false;
    ch2Deck.hidden = true;

    if (state.playing) {
      setPlaying(false);
    }

    if (!globeInstance) {
      const globeWrap = document.getElementById('globe-canvas-wrap');
      globeInstance = new EarthGlobe(globeWrap, (spot) => selectHotspot(spot));
      initCh1UI();
    }
    updateClimateDisplay(currentYear);
    narrator.speak('Channel 1: 3D Climate Orbit and Time Machine. Drag the year slider from 1980 to 2026.');
  } else {
    tabCh2.classList.add('active');
    tabCh2.setAttribute('aria-selected', 'true');
    tabCh1.classList.remove('active');
    tabCh1.setAttribute('aria-selected', 'false');

    ch2Deck.hidden = false;
    ch1Deck.hidden = true;

    climateSynth.stop();
    const btnDrone = document.getElementById('btn-drone');
    if (btnDrone) {
      btnDrone.textContent = '🔊 Thermal Drone: Off';
      btnDrone.setAttribute('aria-pressed', 'false');
      climateDroneActive = false;
    }

    narrator.speak('Channel 2: Satellite Sound Lab. Press Power to sonify NASA imagery.');
  }
}

function initCh1UI() {
  const shelf = document.getElementById('hotspot-btn-shelf');
  if (shelf) {
    shelf.innerHTML = '';
    HOTSPOTS.forEach((spot, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `neu-btn ${i === 0 ? 'active' : ''}`;
      btn.style.fontSize = '12px';
      btn.style.padding = '5px 10px';
      btn.textContent = spot.name;
      btn.addEventListener('click', () => {
        selectHotspot(spot);
      });
      shelf.appendChild(btn);
    });
  }

  const rngYear = document.getElementById('rng-year');
  if (rngYear) {
    rngYear.addEventListener('input', (e) => {
      setYear(parseInt(e.target.value, 10));
    });
  }

  document.querySelectorAll('.btn-milestone').forEach(btn => {
    btn.addEventListener('click', () => {
      const yr = parseInt(btn.dataset.year, 10);
      setYear(yr);
    });
  });

  const btnDrone = document.getElementById('btn-drone');
  if (btnDrone) {
    btnDrone.addEventListener('click', () => {
      climateDroneActive = !climateDroneActive;
      btnDrone.textContent = climateDroneActive ? '🔊 Thermal Drone: On' : '🔊 Thermal Drone: Off';
      btnDrone.setAttribute('aria-pressed', String(climateDroneActive));
      playDetentClick(climateDroneActive ? 880 : 440, 0.03);
      triggerHaptic(6);
      climateSynth.setMuted(!climateDroneActive);
      if (climateDroneActive) {
        const data = getClosestClimateData(currentYear);
        climateSynth.updateAnomaly(data.tempAnomaly);
      }
    });
  }

  selectHotspot(HOTSPOTS[0]);
}

function getClosestClimateData(year) {
  const years = getYearsList();
  if (CLIMATE_DATA[year]) return CLIMATE_DATA[year];
  let closest = years[0];
  let minDiff = Math.abs(year - closest);
  for (const y of years) {
    const diff = Math.abs(year - y);
    if (diff < minDiff) {
      minDiff = diff;
      closest = y;
    }
  }
  return CLIMATE_DATA[closest];
}

function setYear(year) {
  currentYear = year;
  const rngYear = document.getElementById('rng-year');
  const lblYear = document.getElementById('lbl-year');
  const badge = document.getElementById('ch1-year-badge');
  if (rngYear) rngYear.value = String(year);
  if (lblYear) lblYear.textContent = String(year);
  if (badge) badge.textContent = `Year ${year}`;

  document.querySelectorAll('.btn-milestone').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.year, 10) === year);
  });

  playDetentClick(700 + ((year - 1980) * 12), 0.02);
  triggerHaptic(4);
  updateClimateDisplay(year);
}

function updateClimateDisplay(year) {
  const data = getClosestClimateData(year);
  const ch1Temp = document.getElementById('ch1-temp');
  const ch1Co2 = document.getElementById('ch1-co2');
  const ch1Ice = document.getElementById('ch1-ice');
  const ch1Era = document.getElementById('ch1-era-title');
  const ch1Summary = document.getElementById('ch1-summary');
  const ch1Everyday = document.getElementById('ch1-everyday');
  const ch1LiveCap = document.getElementById('ch1-live-cap');

  if (ch1Temp) {
    ch1Temp.textContent = `+${data.tempAnomaly.toFixed(2)}°C`;
    if (data.tempAnomaly < 0.4) {
      ch1Temp.style.color = '#10b981';
    } else if (data.tempAnomaly < 0.8) {
      ch1Temp.style.color = '#eab308';
    } else if (data.tempAnomaly < 1.2) {
      ch1Temp.style.color = '#f97316';
    } else {
      ch1Temp.style.color = '#ef4444';
    }
  }

  if (ch1Co2) ch1Co2.textContent = `${data.co2Ppm.toFixed(1)} ppm`;
  if (ch1Ice) ch1Ice.textContent = `${data.arcticIceMkm2.toFixed(2)} M km²`;
  if (ch1Era) ch1Era.textContent = data.eraTitle;
  if (ch1Summary) ch1Summary.textContent = data.summary;
  if (ch1Everyday) ch1Everyday.textContent = data.everydayImpact;

  if (ch1LiveCap) {
    ch1LiveCap.textContent = `Year ${year}: Temperature anomaly +${data.tempAnomaly.toFixed(2)}°C, Atmospheric CO2 ${data.co2Ppm.toFixed(1)} ppm, Arctic Sea Ice minimum ${data.arcticIceMkm2.toFixed(2)} million km². ${data.summary}`;
  }

  if (globeInstance) {
    globeInstance.updateThermalOverlay(data.tempAnomaly);
  }

  if (climateDroneActive) {
    climateSynth.updateAnomaly(data.tempAnomaly);
  }
}

function selectHotspot(spot) {
  selectedHotspot = spot;
  playDetentClick(720, 0.03);
  triggerHaptic(5);

  const nameEl = document.getElementById('hotspot-name');
  const mechEl = document.getElementById('hotspot-mechanism');
  const metricEl = document.getElementById('hotspot-metric');
  const detailEl = document.getElementById('hotspot-detail');

  if (nameEl) nameEl.textContent = spot.name;
  if (mechEl) mechEl.textContent = spot.mechanism;
  if (metricEl) metricEl.textContent = spot.metric;
  if (detailEl) detailEl.textContent = spot.detail;

  const shelf = document.getElementById('hotspot-btn-shelf');
  if (shelf) {
    Array.from(shelf.children).forEach(b => {
      b.classList.toggle('active', b.textContent === spot.name);
    });
  }

  narrator.speak(`${spot.name}. ${spot.mechanism}. ${spot.detail}`);
}

function handleVoiceCommand(cmd) {
  if (!cmd) return;
  playDetentClick(1020, 0.035);

  switch (cmd.type) {
    case 'set_channel':
      switchChannel(cmd.value);
      break;
    case 'play':
      setPlaying(true);
      break;

    case 'pause':
      setPlaying(false);
      break;

    case 'toggle_play':
      setPlaying(!state.playing);
      break;

    case 'set_loop':
      state.loop = cmd.value;
      const loopBtn = document.getElementById('btn-loop');
      loopBtn.setAttribute('aria-pressed', String(state.loop));
      loopBtn.textContent = `Loop: ${state.loop ? 'On' : 'Off'}`;
      break;

    case 'set_scale':
      state.scaleId = cmd.value;
      document.getElementById('sel-scale').value = state.scaleId;
      syncHash();
      break;

    case 'set_scan':
      state.scanMode = cmd.value;
      document.getElementById('sel-scan').value = state.scanMode;
      state.pos = 0;
      analyzeCurrentCanvas();
      break;

    case 'set_speed':
      state.speed = Math.max(1, Math.min(5, cmd.value));
      document.getElementById('rng-spd').value = String(state.speed);
      document.getElementById('lbl-spd').textContent = String(state.speed);
      updateRotaryVisual(state.speed);
      if (state.playing) {
        engine.startScheduler(() => getStepIntervalMs() / 1000, step);
      }
      syncHash();
      break;

    case 'adjust_speed':
      state.speed = Math.max(1, Math.min(5, state.speed + cmd.delta));
      document.getElementById('rng-spd').value = String(state.speed);
      document.getElementById('lbl-spd').textContent = String(state.speed);
      updateRotaryVisual(state.speed);
      if (state.playing) {
        engine.startScheduler(() => getStepIntervalMs() / 1000, step);
      }
      syncHash();
      break;

    case 'set_style':
      state.selectedStyle = cmd.value;
      analyzeCurrentCanvas();
      syncHash();
      break;

    case 'select_track_name':
      const foundIdx = state.tracks.findIndex((t) =>
        t.name.toLowerCase().includes(cmd.query) || t.id.toLowerCase().includes(cmd.query)
      );
      if (foundIdx !== -1) {
        selectTrack(foundIdx, false);
      }
      break;

    case 'next_track':
      selectTrack((state.trackIdx + 1) % state.tracks.length, false);
      break;

    case 'prev_track':
      selectTrack((state.trackIdx - 1 + state.tracks.length) % state.tracks.length, false);
      break;

    case 'toggle_contrast':
      toggleHighContrast();
      break;

    case 'set_narration':
      narrator.setEnabled(cmd.value);
      const voiceBtn = document.getElementById('btn-voice');
      voiceBtn.setAttribute('aria-pressed', String(cmd.value));
      voiceBtn.textContent = `Narration: ${cmd.value ? 'On' : 'Off'}`;
      break;

    default:
      break;
  }
}

function toggleHighContrast() {
  playDetentClick(1100, 0.03);
  const on = document.documentElement.classList.toggle('hc-mode');
  document.getElementById('btn-hc').setAttribute('aria-pressed', String(on));
}

function setupGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Skip if typing in an input or select
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      switchChannel(currentChannel === 'ch1' ? 'ch2' : 'ch1');
    } else if (currentChannel === 'ch1' && (e.key === '1' || e.key === '2')) {
      e.preventDefault();
      switchChannel(e.key === '1' ? 'ch1' : 'ch2');
    } else if (e.code === 'Space') {
      e.preventDefault();
      setPlaying(!state.playing);
    } else if (e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      if (voiceCtrl) voiceCtrl.toggle();
    } else if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      const next = !narrator.enabled;
      narrator.setEnabled(next);
      const vBtn = document.getElementById('btn-voice');
      vBtn.setAttribute('aria-pressed', String(next));
      vBtn.textContent = `Narration: ${next ? 'On' : 'Off'}`;
    } else if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      toggleHighContrast();
    } else if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      state.loop = !state.loop;
      const lBtn = document.getElementById('btn-loop');
      lBtn.setAttribute('aria-pressed', String(state.loop));
      lBtn.textContent = `Loop: ${state.loop ? 'On' : 'Off'}`;
      playDetentClick(680, 0.02);
    } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
      const spd = Number(e.key);
      state.speed = spd;
      document.getElementById('rng-spd').value = String(spd);
      document.getElementById('lbl-spd').textContent = String(spd);
      updateRotaryVisual(spd);
      playDetentClick(600 + spd * 80, 0.02);
      if (state.playing) {
        engine.startScheduler(() => getStepIntervalMs() / 1000, step);
      }
      syncHash();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const rngVol = document.getElementById('rng-vol');
      const nextVol = Math.min(100, Number(rngVol.value) + 5);
      rngVol.value = String(nextVol);
      document.getElementById('lbl-vol').textContent = `${nextVol}%`;
      engine.setVolume(nextVol / 100);
      playDetentClick(880, 0.015);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const rngVol = document.getElementById('rng-vol');
      const nextVol = Math.max(0, Number(rngVol.value) - 5);
      rngVol.value = String(nextVol);
      document.getElementById('lbl-vol').textContent = `${nextVol}%`;
      engine.setVolume(nextVol / 100);
      playDetentClick(720, 0.015);
    } else if (e.key === '?') {
      e.preventDefault();
      const panel = document.getElementById('panel-shortcuts');
      panel.hidden = !panel.hidden;
      document.getElementById('btn-shortcuts').setAttribute('aria-expanded', String(!panel.hidden));
      playDetentClick(800, 0.02);
    }
  });
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

  document.getElementById('btn-hc').onclick = toggleHighContrast;
  document.getElementById('btn-voice').onclick = function () {
    playDetentClick(900, 0.03);
    const next = !narrator.enabled;
    narrator.setEnabled(next);
    this.setAttribute('aria-pressed', String(next));
    this.textContent = `Narration: ${next ? 'On' : 'Off'}`;
  };

  // Voice Controller integration
  voiceCtrl = new VoiceController({
    onCommand: (cmd, raw) => {
      handleVoiceCommand(cmd);
    },
    onStatus: (status) => {
      const btn = document.getElementById('btn-voice-cmd');
      if (btn) {
        btn.textContent = status.listening ? '🎙️ Voice: Listening...' : '🎙️ Voice: Off';
        btn.setAttribute('aria-pressed', String(status.listening));
      }
      if (status.text) {
        narrator.updateCaption(status.text, 2500);
      }
    }
  });

  document.getElementById('btn-voice-cmd').onclick = function () {
    playDetentClick(920, 0.025);
    if (!voiceCtrl.supported) {
      narrator.speak('Web Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    voiceCtrl.toggle();
  };

  // Shortcuts panel
  document.getElementById('btn-shortcuts').onclick = function () {
    playDetentClick(800, 0.02);
    const panel = document.getElementById('panel-shortcuts');
    panel.hidden = !panel.hidden;
    this.setAttribute('aria-expanded', String(!panel.hidden));
  };
  document.getElementById('close-shortcuts').onclick = () => {
    playDetentClick(600, 0.02);
    document.getElementById('panel-shortcuts').hidden = true;
    document.getElementById('btn-shortcuts').setAttribute('aria-expanded', 'false');
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

  // Channel Tab Switching
  const tabCh1 = document.getElementById('tab-ch1');
  const tabCh2 = document.getElementById('tab-ch2');
  if (tabCh1) tabCh1.onclick = () => switchChannel('ch1');
  if (tabCh2) tabCh2.onclick = () => switchChannel('ch2');

  setupGlobalShortcuts();
  setupProbeHover();

  await selectTrack(state.trackIdx, false);
}

init();
