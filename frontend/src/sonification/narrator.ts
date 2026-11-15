export class Narrator {
  private liveEl: HTMLElement | null = null;
  private enabled: boolean = false;
  private lastSpokenAt: number = 0;
  private lastSpokenText: string = '';
  private stepCounter: number = 0;

  constructor(liveRegionEl?: HTMLElement | null) {
    this.liveEl = liveRegionEl || null;
  }

  public setLiveElement(el: HTMLElement | null) {
    this.liveEl = el;
  }

  public isVoiceEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(on: boolean) {
    this.enabled = Boolean(on);
    if (!this.enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else if (this.enabled) {
      this.speak('Sonification voice narration enabled.');
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public updateCaption(text: string, stepIntervalMs: number = 360) {
    if (this.liveEl) {
      this.stepCounter++;
      const fast = stepIntervalMs <= 240;
      if (!fast || this.stepCounter % 4 === 1) {
        this.liveEl.textContent = text;
      }
    }

    if (this.enabled) {
      const now = Date.now();
      const summaryPart = text.replace(/^(Column|Meridian) \d+ of \d+:\s*/i, '');
      if (summaryPart !== this.lastSpokenText && now - this.lastSpokenAt > 1500) {
        this.lastSpokenAt = now;
        this.lastSpokenText = summaryPart;
        this.speak(summaryPart);
      }
    }
  }

  public speak(text: string) {
    if (!this.enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      window.speechSynthesis.speak(u);
    } catch {
      // Ignore sandboxed speech synthesis errors
    }
  }
}
