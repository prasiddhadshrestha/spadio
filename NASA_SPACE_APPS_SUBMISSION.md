# NASA Space Apps Challenge 2026: Official Project Submission
**Challenge:** The Earth Information Jukebox  
**Team:** Smooth Butter  
**Project Title:** Spadio: The Earth Information Jukebox  
**Repository:** https://github.com/prasiddhadshrestha/spadio  
**Live Interactive App:** https://prasiddhadshrestha.github.io/spadio/  

---

## 1. Project Summary
*Suggested length: 50 to 200 words. (Current: 138 words | 986 characters)*

Spadio: The Earth Information Jukebox is a blind-and-low-vision-first sonification platform that converts NASA Earth observation datasets into real-time, deterministic musical soundscapes. 

NASA's Earth Information Center (EIC) and Scientific Visualization Studio (SVS) produce high-resolution planetary visualizations, yet their reliance on visual displays excludes visually impaired communities and creates cognitive barriers. 

Spadio resolves this visual monoculture through two integrated environments:
1. 2D SVS Laboratory Console: A high-precision tactile spectrometer that scans 48 spatial bands across 10 official NASA SVS datasets (including DYAMOND CO2, Black Marble, and GEDI canopy lidar), mapping pixel luminance, latitude, and color hues into scale-quantized harmonies via the native Web Audio API.
2. 3D Live Earth: An interactive Three.js digital twin providing macro planetary context, sonifying daily NASA Worldview GHRSST sea surface temperature thermal maps and near-real-time GPM IMERG precipitation storm radar.

Spadio turns silent satellite data into an accessible stethoscope for our living planet.

---

## 2. Project Demonstration (30-Second Video Script)
*Hard rule: Must be strictly 30.0 seconds or less. This script is calibrated to 51 words (~24.5 seconds spoken time) leaving a clean 5-second buffer.*

### Single-Narrator Screen Recording Storyboard
- **0:00 - 0:08 (Clip 1 & 2: 2D SVS Console):**
  - *Visual:* Screen recording of the 2D SVS Console at `https://prasiddhadshrestha.github.io/spadio/`. Mouse clicks Play, 48-band optical spectrometer sweeps across an SVS data strip, audio visualizer dances.
  - *Voiceover:* "This is Spadio, the Earth Information Jukebox. We turn NASA satellite data into real-time sound. In our 2D console, we scan data strips from forest canopy to carbon plumes."
- **0:08 - 0:20 (Clip 3 & 4: 3D Live Earth):**
  - *Visual:* Click `🛰️ 3D Live Earth`. 3D globe rotates displaying the vibrant rainbow thermal Sea Surface Temperature map. Mouse clicks `03 Global Precipitation` and the globe immediately maps active storm fronts.
  - *Voiceover:* "In our 3D view, we sweep daily ocean temperature and global storms in real time."
- **0:20 - 0:25 (Clip 5: Interactive Sonification):**
  - *Visual:* User adjusts sweep speed knob and clicks between synthesis styles (`Layers`, `Flow`, `Sparkle`).
  - *Voiceover:* "Space science you can hear, explore, and feel."
- **0:25 - 0:28.5 (Title Card):**
  - *Visual:* Clean graphic title card:
    - **SPADIO: The Earth Information Jukebox**
    - Team: Smooth Butter | NASA Space Apps 2026
    - Live App: `prasiddhadshrestha.github.io/spadio`
  - *Audio:* Final musical chord rings out and fades to silence.
- **0:28.5 - 0:30.0:** Clean silence / black frame buffer.

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

## 5. NASA Data & Resources (Verified Citations)

1. **NASA EOSDIS / GIBS WMS EPSG:4326**  
   `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi`  
   - Layer: `GHRSST_L4_MUR_Sea_Surface_Temperature` (PO.DAAC Group for High Resolution Sea Surface Temperature L4 analysis)  
   - Layer: `IMERG_Precipitation_Rate` (Global Precipitation Measurement GPM IMERG Near Real-Time)  
   - Layer: `Coastlines_15m` and `OSM_Land_Mask`
2. **NASA Worldview Interactive Earth Data Portal**  
   `https://worldview.earthdata.nasa.gov/`
3. **NASA JPL Eyes on the Earth**  
   `https://eyes.nasa.gov/apps/earth/`  
   - 24-Hour Corrected Surface Reflectance Composite (VIIRS on Suomi NPP / NOAA-20 / NOAA-21)
4. **NASA SVS 4285: Near Real-Time Global Precipitation Composite**  
   `https://svs.gsfc.nasa.gov/4285/`
5. **NASA SVS 13786: Data Sonification Framework (Caldwell 73)**  
   `https://svs.gsfc.nasa.gov/13786/`
6. **NASA SVS 5313: Change in Night Lights 2012-2023 (Black Marble)**  
   `https://svs.gsfc.nasa.gov/5313/`
7. **NASA SVS 5669: GEOS Aerosols Simulation**  
   `https://svs.gsfc.nasa.gov/5669/`
8. **NASA SVS 5011: Lightning Events Detected from the ISS 2017-2023**  
   `https://svs.gsfc.nasa.gov/5011/`
9. **NASA SVS 4950: GEDI Global Forest Canopy Height**  
   `https://svs.gsfc.nasa.gov/4950/`
10. **NASA SVS 5196: DYAMOND Global Carbon Dioxide Model**  
    `https://svs.gsfc.nasa.gov/5196/`
11. **NASA SVS 4960: 3D View of an Atmospheric River**  
    `https://svs.gsfc.nasa.gov/4960/`
12. **NASA SVS 5425: Perpetual Ocean 2 (Western Boundary Currents)**  
    `https://svs.gsfc.nasa.gov/5425/`
13. **NASA SVS 3912: Global Sea Surface Currents and Temperature**  
    `https://svs.gsfc.nasa.gov/3912/`
14. **NASA SVS 5533: Air Quality Model Runs**  
    `https://svs.gsfc.nasa.gov/5533/`
15. **NASA Earth Information Center (EIC) Content Database**  
    `https://svs.gsfc.nasa.gov/gallery/earth-information-center/`

---

## 6. Space Agency Partner & Other Data
1. **W3C Web Audio API Specification**  
   `https://www.w3.org/TR/webaudio/`
2. **Three.js JavaScript 3D Library**  
   `https://threejs.org/`
3. **Vite Next Generation Frontend Tooling**  
   `https://vitejs.dev/`
