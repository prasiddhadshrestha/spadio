let sharedClickCtx: AudioContext | null = null;

function getClickContext(): AudioContext | null {
  try {
    if (!sharedClickCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      sharedClickCtx = new Ctx();
    }
    if (sharedClickCtx.state === 'suspended') {
      sharedClickCtx.resume().catch(() => {});
    }
    return sharedClickCtx;
  } catch {
    return null;
  }
}

export function playDetentClick(freq = 900, gainPeak = 0.03): void {
  const ctx = getClickContext();
  if (!ctx) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(gainPeak, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.025);
  } catch {
    // Ignore audio errors if blocked before user gesture
  }
}

export function triggerHaptic(ms = 5): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore unsupported platforms
  }
}
