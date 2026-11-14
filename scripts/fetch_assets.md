# Fetching NASA SVS / Earth Information Center Assets

All visual frames in Earth Jukebox come from the [NASA Scientific Visualization Studio (SVS) Earth Information Center Gallery](https://svs.gsfc.nasa.gov/gallery/earth-information-center/).

## Bundled NASA SVS Assets
- `night-lights`: [SVS 5313](https://svs.gsfc.nasa.gov/5313/) — Night Lights 2012–2023
- `geos-aerosols`: [SVS 5669](https://svs.gsfc.nasa.gov/5669/) — GEOS Aerosols
- `iss-lightning`: [SVS 5011](https://svs.gsfc.nasa.gov/5011/) — Lightning from the ISS 2017–2023
- `gedi-forest`: [SVS 4950](https://svs.gsfc.nasa.gov/4950/) — GEDI Forest Height

## Replacing Procedural Placeholders with Original NASA Video Frames
Tracks marked `"isPlaceholder": true` in `public/tracks/manifest.json` currently use procedural preview frames because direct SVS MP4 downloads were not bundled offline. To replace them with original SVS frames:
1. Download the MP4 or still frames from the SVS page (`3912`, `5533`, `5425`, `5196`, `4960`).
2. Run `./scripts/extract_frames.sh <video.mp4> <track_id>`.
3. Update `frames`, `labels`, and set `"isPlaceholder": false` in `public/tracks/manifest.json`.
4. Re-run `npm run render` to regenerate the offline WAV gallery.
