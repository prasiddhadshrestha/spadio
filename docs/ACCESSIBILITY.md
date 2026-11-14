# Accessibility Documentation

## Implemented Features
- **No Autoplay:** Audio only starts after an explicit user click/keypress on **Play**.
- **Keyboard Navigation:** All controls are reachable via `Tab`; the Track Shelf supports `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `Enter`, and `Space`.
- **Live Captions (`aria-live="polite"`):** Every scan band generates a plain-language sentence describing region, loudness, pitch height, and events. At high speeds (`<= 240 ms`), updates are throttled to every 4th step so screen readers are not flooded.
- **Optional Speech Narration:** Off by default; uses `window.speechSynthesis` to read track descriptions on selection and throttled live summaries during playback.
- **High-Contrast Mode & System Preferences:** Explicit High-Contrast toggle (`#000` background, `#fff` text/borders, `#ffea00` focus/accent), plus `prefers-color-scheme` and `prefers-reduced-motion` media query support.
- **Minimum Touch Targets & Font Size:** All interactive buttons and form controls are at least `44 px` tall with `>= 14 px` text.
- **Listen Without the App:** Pre-rendered WAV files in `renders/` with standard `<audio controls>` players and text descriptions.

## Verification Checklist
- [x] Keyboard-only navigation across header, track shelf, style buttons, playback controls, and audio gallery.
- [x] `aria-pressed`, `aria-selected`, `aria-expanded`, and `aria-live="polite"` verified in DOM.
- [ ] Formal screen-reader listening session with blind/low-vision testers (see `docs/USER_TESTING.md`).
