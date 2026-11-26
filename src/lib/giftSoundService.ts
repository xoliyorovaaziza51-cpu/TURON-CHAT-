export function playGiftEffectSound(
  tier: 'standard' | 'premium' | 'luxury' | string,
  giftName?: string
): void {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.22, now);
    master.connect(ctx.destination);

    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      type: OscillatorType = 'sine',
      gainVal = 0.35
    ) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + startOffset);
      g.gain.setValueAtTime(0.0001, now + startOffset);
      g.gain.exponentialRampToValueAtTime(gainVal, now + startOffset + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(g);
      g.connect(master);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.05);
    };

    const nameLower = (giftName || '').toLowerCase();
    const isBeastOrRoyal =
      tier === 'luxury' ||
      nameLower.includes('sher') ||
      nameLower.includes('buri') ||
      nameLower.includes('burgut') ||
      nameLower.includes('ajdar') ||
      nameLower.includes('dubay');

    if (isBeastOrRoyal) {
      // Deep golden sub swell + triumphant royal fanfare arpeggio
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(65, now);
      subOsc.frequency.exponentialRampToValueAtTime(110, now + 0.45);
      subOsc.frequency.exponentialRampToValueAtTime(55, now + 1.3);
      const subFilter = ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(260, now);
      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.4, now + 0.12);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(master);
      subOsc.start(now);
      subOsc.stop(now + 1.45);

      // Royal golden chord fanfare
      const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, idx) => {
        playTone(f, idx * 0.075, 0.75, 'triangle', 0.25);
      });
      playTone(1318.5, 0.55, 0.9, 'sine', 0.22);
    } else if (tier === 'premium') {
      const notes = [392.0, 493.88, 587.33, 783.99, 987.77];
      notes.forEach((f, idx) => {
        playTone(f, idx * 0.065, 0.45, 'triangle', 0.24);
      });
    } else {
      playTone(587.33, 0, 0.28, 'sine', 0.22);
      playTone(880.0, 0.09, 0.35, 'sine', 0.2);
    }

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 2000);
  } catch {
    // Ignore audio context errors when autoplay is restricted
  }
}
