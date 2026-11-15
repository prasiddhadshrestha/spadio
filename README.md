# Spadio: The Earth Information Jukebox

**Hear a changing planet.** Spadio transforms NASA Earth Information Center (EIC) and Scientific Visualization Studio (SVS) imagery into real-time, deterministic, blind-and-low-vision-first sonifications directly in the browser.

---

## Dual-Perspective Architecture

Spadio provides two integrated environments accessible via the header switcher:

1. **2D SVS Laboratory Console (`/`)**:
   - High-precision 48-band CRT spectrometer dedicated to Cartesian satellite data (Atmospheric Rivers, DYAMOND CO2 flux, Black Marble Night Lights, GEDI Forest Canopy).
   - Real-time Web Audio DSP parameter mapping: luminance to volume, vertical latitude to quantized musical pitch (Pentatonic, Minor, Whole Tone).
   - WCAG AAA high contrast (7:1 ratio) and full tactile keyboard navigation.

2. **3D Live Earth Digital Twin (`/live-earth/index.html`)**:
   - Interactive Three.js WebGL globe providing macro planetary context, atmospheric Fresnel glow, and real-time NASA precipitation (IMERG / SVS 4285).
   - 2x2 station playlist grid with custom satellite image drag-and-drop upload.
   - Internal 3D/2D projection toggle and spoken feature narration.

---

## Quick Start

```bash
npm install
npm run dev
```

Visit:
- `http://localhost:5173/` for the 2D SVS Console
- `http://localhost:5173/live-earth/index.html` for 3D Live Earth

### Run Tests & Production Build

```bash
npm test        # Runs 15 unit tests across audio mapping & analysis
npm run build   # Compiles unified multi-page production bundle into dist/
```

---

## Official NASA Datasets Integrated
- **NASA SVS 13786**: Data Sonification Framework (Caldwell 73 reference)
- **NASA SVS 5313**: Change in Night Lights 2012–2023 (Black Marble)
- **NASA SVS 5669**: GEOS Aerosols Simulation (Dust, Smoke, Sea Salt)
- **NASA SVS 5011**: Lightning Events Detected from the ISS (2017–2023)
- **NASA SVS 4950**: GEDI Global Forest Canopy Height
- **NASA SVS 5196**: DYAMOND Global Carbon Dioxide Model
- **NASA SVS 4960**: 3D View of an Atmospheric River
- **NASA SVS 5425**: Perpetual Ocean 2 (Western Boundary Currents)
- **NASA SVS 3912**: Global Sea Surface Currents and Temperature
- **NASA SVS 5533**: Air Quality Model Runs
- **NASA SVS 4285 / EIC**: Near Real-Time Precipitation (GPM IMERG) & EIC Mosaic

---

## Team & Credits
- **Team**: Smooth Butter (NASA International Space Apps Challenge 2026)
- **Imagery & Visualizations**: NASA Scientific Visualization Studio (SVS) & Earth Information Center (EIC)
- **Audio Engine**: W3C Web Audio API deterministic DSP (zero AI hallucinations at runtime)
