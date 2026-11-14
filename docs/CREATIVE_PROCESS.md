# Creative Process & Design Transparency

## Honesty Rule
Earth Jukebox uses **parameter-mapping sonification**—image brightness, color hue, coverage, and vertical position control pitch, volume, and rhythm. While parameter-mapping is an established sonification technique, **the specific mapping rules, five style names (Sparkle, Flow, Layers, Field, Duet), and automatic selection thresholds in this project are original team design choices**, not an established scientific standard and not yet validated in formal listening studies.

## Why Five Styles?
A single fixed mapping makes very different planetary datasets sound alike. We designed five distinct styles so the sound structure matches the visual structure:
- **Sparkle:** Sudden bright points (urban night lights, lightning) become short bell-like plucks while dark oceans/space remain silent so contrast is immediately audible.
- **Flow:** Continuous swirling motion (ocean currents, atmospheric rivers) maps hue to smooth overlapping `0.9 s` sine pads.
- **Layers:** Multi-category maps (GEOS aerosols) separate warm dust, mid organic smoke, and cool sea salt into three simultaneous instruments (bass triangle, mid square, high sine).
- **Field:** Smooth intensity fields (CO₂, forest canopy height, air quality) map brightness to pitch and coverage to harmonic chord fullness.
- **Duet:** High-contrast dual-region visuals (such as cyan bioluminescent currents alongside orange city lights) give each color region its own voice playing in stereo.

## Musicality Over Noise
- **Quantized Scales:** All frequencies are quantized to Pentatonic, Minor, or Whole Tone scales (`220 * 2^(semitones/12)`) so overlapping notes remain consonant.
- **Gain Envelopes & Limiting:** Every note uses a `30 ms` attack and exponential release, routed through a master `DynamicsCompressor` and capped at 12 simultaneous voices to prevent clicks or clipping.
