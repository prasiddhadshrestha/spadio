# Earth Jukebox

**Hear a changing planet.** Earth Jukebox transforms NASA Earth Information Center (EIC) and Scientific Visualization Studio (SVS) imagery into real-time, musical, blind-and-low-vision-first sonifications directly in the browser.

## Quick Start

```bash
npm install
npm run dev
```

Run tests and build static bundle:

```bash
npm test
npm run build
```

Re-render the offline Audio Gallery (`public/renders/*.wav` and `renders/`):

```bash
npm run render
```

## Features
- **9 NASA SVS / EIC Tracks + Aurora Duet Reference:** Keyboard-navigable track shelf with real NASA SVS frames (`5313`, `5669`, `5011`, `4950`) and clearly labeled procedural preview placeholders (`3912`, `5533`, `5425`, `5196`, `4960`).
- **5 Sound Styles + Auto Selection:** `Sparkle`, `Flow`, `Layers`, `Field`, and `Duet` — each with a plain-language "why" and live mapping cards.
- **Progressive "What the computer sees" Strip:** Reveals the 48 analyzed brightness and hue bands in real time as the scan moves across the image.
- **Blind & Low-Vision First:** `aria-live="polite"` live captions (throttled at fast speeds), optional `speechSynthesis` narration (off by default), high-contrast mode, `44 px` touch targets, and a pre-rendered **"Listen without the app"** WAV gallery.
- **Standalone Offline Build:** Open `earth_jukebox_standalone.html` directly in any modern browser without a build step, or use the full Vite app (`npm run dev`).
- **Upload Any Frame:** Click **Use another frame** to sonify any PNG/JPG/WebP image within 1 second.

## Adding a Track
1. Place frames in `public/tracks/<track-id>/frame_001.jpg` (or run `./scripts/extract_frames.sh video.mp4 <track-id>`).
2. Add an entry in `public/tracks/manifest.json`.
3. Run `npm run render` to generate the corresponding pre-rendered `.wav` file.

## Credits
- Imagery & Visualizations: NASA Scientific Visualization Studio (SVS) & NASA Earth Information Center.
- Concept Inspiration: NASA's *Data Sonification: Caldwell 73* (SVS 13786).
