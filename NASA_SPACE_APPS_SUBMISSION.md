# NASA Space Apps Challenge 2026: Official Project Submission
**Challenge:** The Earth Information Jukebox  
**Team:** Smooth Butter  
**Project Title:** Spadio: The Earth Information Jukebox  
**Repository:** https://github.com/aoiorio/smooth_butter  

---

## 1. Project Summary
*Suggested length: 50 to 200 words. (Current: 138 words | 986 characters)*

Spadio: The Earth Information Jukebox is a blind-and-low-vision-first sonification platform that converts NASA Earth observation datasets into real-time, deterministic musical soundscapes. 

NASA's Earth Information Center (EIC) and Scientific Visualization Studio (SVS) produce high-resolution planetary visualizations, yet their reliance on visual displays excludes visually impaired communities and creates cognitive barriers. 

Spadio resolves this visual monoculture through two integrated environments:
1. 2D SVS Laboratory Console: A high-precision tactile spectrometer that scans 48 spatial bands across 10 official NASA SVS datasets (including DYAMOND CO2, Black Marble, and GEDI canopy lidar), mapping pixel luminance, latitude, and color hues into scale-quantized harmonies via the native Web Audio API.
2. 3D Live Earth: An interactive Three.js digital twin providing macro planetary context and sonifying near-real-time precipitation.

Spadio turns silent satellite data into an accessible stethoscope for our living planet.

---

## 2. Project Demonstration (30-Second Video Script)
*Hard rule: Must be 30.0 seconds or less. This script runs 28.5 seconds.*

### Shot List & Storyboard
- **0:00 - 0:06 (Filmed with Aoi):**
  - *Visual:* Aoi sits with eyes closed, listening to headphones. 3D Earth runs on laptop in background.
  - *Spoken (Aoi):* "My eyes are closed, but I can hear heavy storm bands crossing the equator."
- **0:06 - 0:11 (Live Action with Prasiddha):**
  - *Visual:* Cut to Prasiddha at the desk, gesturing to the running laptop screen.
  - *Spoken (Prasiddha):* "This is Spadio. We convert NASA Earth science data into deterministic, real-time musical harmony."
- **0:11 - 0:18 (Screen Recording: 2D SVS Console):**
  - *Visual:* 48-band spectrometer sweeps across an SVS frame (Atmospheric River or Black Marble). Live spectrum jumps, frequency HUD displays exact Hz.
  - *Spoken (Prasiddha):* "Our 2D console scans 48 spatial bands across 10 official NASA SVS datasets, mapping luminance to volume and latitude to quantized pitch."
- **0:18 - 0:24 (Screen Recording: 3D Live Earth):**
  - *Visual:* Smooth mouse rotation of the Three.js 3D globe showing atmospheric glow and live precipitation textures.
  - *Spoken (Prasiddha):* "Switching to 3D Live Earth delivers global planetary context, sonifying real-time NASA precipitation and climate hotspots."
- **0:24 - 0:28.5 (Title Card):**
  - *Visual:* High-contrast card: SPADIO / Team Smooth Butter / NASA Space Apps 2026 / GitHub link. Chime fades out.
  - *Spoken (Voiceover):* "Tune in to Spadio. Listen to Earth."
- **0:28.5 - 0:29.0:** Hard cut to black (buffer).

---

## 3. Project Details

### What It Does
Spadio is an interactive data sonification platform that translates NASA Earth science imagery into real-time, multi-timbral acoustic soundscapes. Built to eliminate visual barriers in Earth observation, Spadio enables blind, low-vision, and sighted observers to explore planetary dynamics through two synchronized perspectives:
- 2D SVS Laboratory Console: A hardware-style scientific spectrometer dedicated to Cartesian satellite data (such as atmospheric river moisture corridors, DYAMOND carbon dioxide flux, and GEDI forest lidar).
- 3D Live Earth Digital Twin: A Three.js WebGL globe providing macro orbital context, rotating through global climate hotspots and near-real-time NASA precipitation streams.

### How It Works (The Causal DSP Engine)
Our audio engine operates entirely client-side using deterministic digital signal processing (DSP) built upon the W3C Web Audio API. There are zero pre-recorded audio files and zero generative AI audio models at runtime:
- Spatial Discretization: Satellite frames are divided into 48 discrete vertical bands (or radial wedges in radar scan mode).
- Luminance to Amplitude: The engine parses raw image pixel buffers via CanvasRenderingContext2D, calculating column luminance using standard perceptual ITU-R BT.601 coefficients: L = (0.299R + 0.587G + 0.114B) / 255. Average column luminance modulates the master gain envelope (GainNode), mapping brighter visual phenomena to louder acoustic volume.
- Spatial Centroid to Pitch: The vertical centroid of luminance (Y) maps inversely to fundamental frequency (1 - Y). High-latitude phenomena or high cloud tops trigger higher registers (C5 to G6), while ocean basins and equatorial baselines ground the lower fundamentals (C2 to G3).
- Scale Quantization: Continuous frequencies are snapped to discrete musical intervals (Natural Minor, Pentatonic, and Whole Tone). This eliminates chaotic, discordant noise while preserving relative scientific gradients.
- Hue to Timbre: Pixel color temperatures determine the oscillator waveform. Warm hues (<60°, wildfires, desert dust, and urban illumination) trigger rich sawtooth and triangle partials; cool hues (>160°, oceans, sea ice, and moisture plumes) trigger glassy sinusoidal waves and resonant bandpass filters.

### Benefits and Intended Impact
- Accessibility Parity: Built blind-and-low-vision-first. Non-sighted users can audibly detect storm fronts, urbanization density, and carbon emission corridors without seeing a single pixel.
- Scientific Legibility: Flat Cartesian data (such as vertical CO2 columns or atmospheric rivers) is kept on a calibrated 2D plane to prevent coordinate distortion caused by wrapping onto a 3D sphere.
- Zero Latency & Offline Integrity: All audio synthesis is computed client-side at 48kHz via the browser AudioContext, requiring zero external server calls.

### Accessibility & Design Factors
- WCAG AAA High Contrast: Includes a dedicated high-contrast toggle providing a verified 7:1 contrast ratio across all readouts.
- Tactile Keyboard Hotkeys: Complete hands-on keyboard control for screen-reader efficiency: Space (Play/Pause), [ and ] (Track Station Navigation), 1 to 5 (Scan Velocity), H (High Contrast), L (Loop), and ? (Shortcut Help).
- Tactile Hardware Metaphor: Designed with a Braun / Dieter Rams hardware aesthetic, featuring mechanical detent clicks, rotary tuning dials, and live frequency telemetry.

### Tools, Languages, and Architecture
- Languages: TypeScript, JavaScript (ES Modules), HTML5 Canvas, CSS3.
- Frameworks & Bundlers: React, Vite, Vitest (15 passing unit test suites validating audio mapping logic).
- 3D Rendering: Three.js (WebGL planetary shaders, custom Fresnel atmospheric glow).
- Audio Architecture: Native Web Audio API (OscillatorNode, GainNode, BiquadFilterNode, AnalyserNode).

---

## 4. Use of Super Intelligence (SI)
**Form Selection:** Code and data  
**Required Disclosure Statement:**
Generative AI tools (LLMs) were used strictly during the development phase as coding accelerators for component refactoring, test suite scaffolding, and accessibility audit checklists. Zero AI models or LLMs run in the production pipeline: 100% of runtime image analysis, pixel feature extraction, WebGL rendering, and Web Audio synthesis is executed deterministically by native browser algorithms.

---

## 5. NASA Data & Resources (11 Verified Links)

1. **NASA SVS 13786: Data Sonification Framework (Caldwell 73)**  
   `https://svs.gsfc.nasa.gov/13786/`
2. **NASA SVS 5313: Change in Night Lights 2012-2023 (Black Marble)**  
   `https://svs.gsfc.nasa.gov/5313/`
3. **NASA SVS 5669: GEOS Aerosols Simulation**  
   `https://svs.gsfc.nasa.gov/5669/`
4. **NASA SVS 5011: Lightning Events Detected from the ISS 2017-2023**  
   `https://svs.gsfc.nasa.gov/5011/`
5. **NASA SVS 4950: GEDI Global Forest Canopy Height**  
   `https://svs.gsfc.nasa.gov/4950/`
6. **NASA SVS 5196: DYAMOND Global Carbon Dioxide Model**  
   `https://svs.gsfc.nasa.gov/5196/`
7. **NASA SVS 4960: 3D View of an Atmospheric River**  
   `https://svs.gsfc.nasa.gov/4960/`
8. **NASA SVS 5425: Perpetual Ocean 2 (Western Boundary Currents)**  
   `https://svs.gsfc.nasa.gov/5425/`
9. **NASA SVS 3912: Global Sea Surface Currents and Temperature**  
   `https://svs.gsfc.nasa.gov/3912/#media_group_349716`
10. **NASA SVS 5533: Air Quality Model Runs**  
    `https://svs.gsfc.nasa.gov/5533/`
11. **NASA SVS: Earth Information Center Content Database**  
    `https://svs.gsfc.nasa.gov/gallery/earth-information-center/`

---

## 6. Space Agency Partner & Other Data
1. **W3C Web Audio API Specification**  
   `https://www.w3.org/TR/webaudio/`
2. **Three.js JavaScript 3D Library**  
   `https://threejs.org/`
3. **Vite Next Generation Frontend Tooling**  
   `https://vitejs.dev/`
