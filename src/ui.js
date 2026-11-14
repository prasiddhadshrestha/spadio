import { BAND_COUNT, CANVAS_WIDTH, STYLES } from './presets.js';

export function buildTrackShelf(container, tracks, onSelect) {
  container.innerHTML = '';
  tracks.forEach((track, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'option';
    btn.className = 'track-btn';
    btn.setAttribute('aria-selected', 'false');
    btn.innerHTML = `
      <span class="track-top">
        <span>${track.icon} ${track.svsId}</span>
        <span class="track-badge">${track.defaultStyle}</span>
      </span>
      <span class="track-name">${track.name}</span>
    `;
    btn.onclick = () => onSelect(idx);
    btn.onkeydown = (e) => {
      const cols = 2;
      let next = -1;
      if (e.key === 'ArrowRight') next = (idx + 1) % tracks.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + tracks.length) % tracks.length;
      else if (e.key === 'ArrowDown') next = (idx + cols) % tracks.length;
      else if (e.key === 'ArrowUp') next = (idx - cols + tracks.length) % tracks.length;
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(idx);
        return;
      }
      if (next !== -1) {
        e.preventDefault();
        container.children[next].focus();
      }
    };
    container.appendChild(btn);
  });
}

export function updateTrackShelfSelection(container, activeIdx) {
  Array.from(container.children).forEach((btn, idx) => {
    btn.setAttribute('aria-selected', String(idx === activeIdx));
  });
}

export function buildStyleButtons(container, onSelect) {
  container.innerHTML = '';
  Object.values(STYLES).forEach((st) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.dataset.style = st.id;
    btn.textContent = st.name;
    btn.setAttribute('aria-pressed', 'false');
    btn.onclick = () => onSelect(st.id);
    container.appendChild(btn);
  });
}

export function updateStyleDisplay(selectedStyle, resolvedStyle) {
  const s = STYLES[resolvedStyle] || STYLES.sparkle;
  const selObj = STYLES[selectedStyle] || STYLES.auto;

  document.getElementById('auto-badge').textContent =
    selectedStyle === 'auto' ? `Auto → ${s.name}` : s.name;
  document.getElementById('style-why').textContent = selObj.why;
  document.getElementById('map-pitch').textContent = s.mapping.pitch;
  document.getElementById('map-vol').textContent = s.mapping.volume;
  document.getElementById('map-rhythm').textContent = s.mapping.rhythm;

  document.querySelectorAll('#style-buttons button').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.style === selectedStyle));
  });
}

export function drawProgressiveStrip(stripCtx, bands, maxBrightness, scannedFlags, activeIdx) {
  const w = CANVAS_WIDTH;
  const h = 44;
  const cw = w / BAND_COUNT;
  stripCtx.clearRect(0, 0, w, h);

  bands.forEach((b, i) => {
    if (scannedFlags[i]) {
      const bh = Math.max(3, (b.brightness / Math.max(0.01, maxBrightness)) * (h - 4));
      stripCtx.fillStyle = b.coloredFraction > 0.01 ? `hsl(${Math.round(b.hue)}, 78%, 55%)` : '#64748b';
      stripCtx.fillRect(i * cw + 1, h - bh, cw - 2, bh);
      if (i === activeIdx) {
        stripCtx.fillStyle = '#ffffff';
        stripCtx.fillRect(i * cw + 1, Math.max(0, h - bh - 2), cw - 2, 2);
      }
    } else {
      stripCtx.fillStyle = 'rgba(148, 163, 184, 0.22)';
      stripCtx.fillRect(i * cw + 1, h - 2, cw - 2, 2);
    }
  });
}

let radarTurns = 0;
let lastRadarIdx = -1;

export function updateScanOverlay(scanMode, idxPos, progressPos, visible, stepMs = 360) {
  const sl = document.getElementById('scan-line');
  const sh = document.getElementById('scan-hline');
  const sr = document.getElementById('scan-ring');
  const srad = document.getElementById('scan-radar');

  if (!visible) {
    sl.style.opacity = 0;
    sh.style.opacity = 0;
    sr.style.opacity = 0;
    if (srad) srad.style.opacity = 0;
    radarTurns = 0;
    lastRadarIdx = -1;
    return;
  }

  const snap = progressPos === 0;
  if (snap) {
    sl.style.transition = 'none';
    sh.style.transition = 'none';
    sr.style.transition = 'none';
    sl.style.left = scanMode === 'rl' ? '100%' : '0%';
    sh.style.top = '0%';
    sr.style.width = '0%';
    sr.style.height = '0%';
    if (srad && radarTurns === 0 && lastRadarIdx === -1) {
      srad.style.transition = 'none';
      srad.style.transform = 'rotate(0deg)';
    }
    void sl.offsetWidth;
  }

  sl.style.transition = `left ${stepMs}ms linear, opacity 120ms ease`;
  sh.style.transition = `top ${stepMs}ms linear, opacity 120ms ease`;
  sr.style.transition = `width ${stepMs}ms linear, height ${stepMs}ms linear, opacity 120ms ease`;

  sl.style.opacity = scanMode === 'lr' || scanMode === 'rl' ? 1 : 0;
  sh.style.opacity = scanMode === 'tb' ? 1 : 0;
  sr.style.opacity = scanMode === 'rad' ? 1 : 0;
  if (srad) {
    if (lastRadarIdx > idxPos && scanMode === 'radar') radarTurns++;
    lastRadarIdx = idxPos;
    srad.style.transition = `transform ${stepMs}ms linear, opacity 120ms ease`;
    srad.style.opacity = scanMode === 'radar' ? 1 : 0;
    const deg = (radarTurns + (idxPos + 1) / BAND_COUNT) * 360;
    srad.style.transform = `rotate(${deg}deg)`;
  }

  sl.style.left = `${((scanMode === 'rl' ? idxPos : idxPos + 1) / BAND_COUNT) * 100}%`;
  sh.style.top = `${((idxPos + 1) / BAND_COUNT) * 100}%`;
  const pct = ((progressPos + 1) / BAND_COUNT) * 100;
  sr.style.width = `${pct}%`;
  sr.style.height = `${pct}%`;
}

export function buildAudioGallery(container, tracks) {
  container.innerHTML = '';
  tracks.forEach((track) => {
    const card = document.createElement('article');
    card.className = 'gallery-card';
    const wavPath = `renders/${track.id}.wav`;
    card.innerHTML = `
      <div>
        <strong>${track.icon} ${track.name}</strong>
        <div class="muted" style="font-size:13px">${track.svsId} · Style: ${track.defaultStyle}</div>
      </div>
      <p class="muted" style="margin:0;font-size:13px">${track.description}</p>
      <audio controls preload="none" src="${wavPath}" aria-label="Pre-rendered audio for ${track.name}"></audio>
    `;
    container.appendChild(card);
  });
}

const activePulses = [];
let pulseRaf = null;

function renderPulses() {
  const fx = document.getElementById('fx');
  if (!fx) return;
  const ctx = fx.getContext('2d');
  ctx.clearRect(0, 0, fx.width, fx.height);

  for (let i = activePulses.length - 1; i >= 0; i--) {
    const p = activePulses[i];
    p.radius += 0.65;
    p.alpha *= 0.9;
    if (p.alpha < 0.03 || p.radius > p.maxRadius) {
      activePulses.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = p.alpha * 0.7;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (activePulses.length > 0) {
    pulseRaf = requestAnimationFrame(renderPulses);
  } else {
    pulseRaf = null;
  }
}

const pulseTimers = [];

export function spawnPulses(hotspots, stepMs = 360) {
  if (!hotspots || !hotspots.length) return;
  for (const h of hotspots) {
    const delay = Math.round((h.frac || 0) * stepMs);
    const id = setTimeout(() => {
      activePulses.push({
        x: h.x,
        y: h.y,
        color: `rgb(${h.r}, ${h.g}, ${h.b})`,
        radius: 2.5,
        maxRadius: 12 + h.luma * 14,
        alpha: 0.95
      });
      if (!pulseRaf) {
        pulseRaf = requestAnimationFrame(renderPulses);
      }
    }, delay);
    pulseTimers.push(id);
  }
}

export function clearPulses() {
  while (pulseTimers.length) clearTimeout(pulseTimers.pop());
  activePulses.length = 0;
  if (pulseRaf) {
    cancelAnimationFrame(pulseRaf);
    pulseRaf = null;
  }
  const fx = document.getElementById('fx');
  if (fx) fx.getContext('2d').clearRect(0, 0, fx.width, fx.height);
}
