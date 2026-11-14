export class Narrator {
  constructor(liveRegionEl) {
    this.liveEl = liveRegionEl;
    this.enabled = false;
    this.lastLiveUpdate = 0;
    this.lastSpokenAt = 0;
    this.lastSpokenText = '';
    this.stepCounter = 0;
  }

  setEnabled(on) {
    this.enabled = Boolean(on);
    if (!this.enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else if (this.enabled) {
      this.speak('Voice narration enabled.');
    }
  }

  updateCaption(text, stepIntervalMs = 360) {
    if (!this.liveEl) return;
    this.stepCounter++;
    // Throttle screen-reader aria-live updates at fast speeds (<= 240ms: update every 4th step)
    const fast = stepIntervalMs <= 240;
    if (!fast || this.stepCounter % 4 === 1) {
      this.liveEl.textContent = text;
    }

    if (this.enabled) {
      const now = Date.now();
      const summaryPart = text.replace(/^Column \d+ of \d+:\s*/i, '');
      if (summaryPart !== this.lastSpokenText && now - this.lastSpokenAt > 1500) {
        this.lastSpokenAt = now;
        this.lastSpokenText = summaryPart;
        this.speak(summaryPart);
      }
    }
  }

  speak(text) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch {
      // ignore sandboxed speechSynthesis errors
    }
  }
}
