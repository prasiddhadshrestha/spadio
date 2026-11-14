# Sonification Algorithm (`src/analyzer.js`, `src/styleSelector.js`, `src/mapping.js`)

## 1. Image Preparation
1. The source frame is drawn onto a `640 × 358` canvas using scale-to-cover with black letterboxing.
2. Pixel RGBA data is read once via `getImageData`.

## 2. Per-Band Feature Extraction (`N = 48` bands)
For each band (column, row, or radial ring depending on scan mode), pixels are sampled every 2nd pixel horizontally and every 3rd pixel vertically:
- `luma = (0.299 R + 0.587 G + 0.114 B) / 255`
- `saturation = (max - min) / max`
- `hue` (0–360°) is accumulated via circular mean (`atan2(mean(sin), mean(cos))`) only when `saturation > 0.35` and `luma > 0.18` to ignore dark noise.
- Warm (`hue < 50 || hue > 330`), mid (`50..170`), and cool (`170..330`) pixel fractions and peaks (`warmPeakY`, `coolPeakB`, etc.) are computed.
- `edge = |brightness - prevBrightness| + |coverage - prevCoverage|`
- `delta` tracks brightness and coverage changes relative to the previous frame in multi-frame sequences.

## 3. Automatic Style Selection (`src/styleSelector.js`)
Using whole-frame `darkFraction`, `brightPointDensity`, `bucketShare`, and `edgeDensity`:
1. Two color buckets ≥ `0.25`, `darkFraction ≥ 0.5`, `brightPointDensity ≥ 0.015` → **Duet**
2. All three color buckets ≥ `0.05` → **Layers**
3. `darkFraction ≥ 0.55` and `brightPointDensity ≤ 0.1` → **Sparkle**
4. `edgeDensity ≥ 0.04` and `brightPointDensity ≤ 0.15` → **Flow**
5. Otherwise → **Field**

## 4. Mapping & Scheduling
`mapBandToEvents()` is a pure function (no DOM, no `AudioContext`) shared by the live Web Audio lookahead scheduler (`src/engine.js`) and the offline WAV renderer (`src/renderer.js` and `scripts/render_gallery.mjs`).
