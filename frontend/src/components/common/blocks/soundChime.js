/**
 * Pure Web Audio API Singing Bowl & Liturgical Chime Synthesizer
 * Zero external audio dependencies — works offline and in all modern browsers.
 */

export function playChime(type = 'singing_bowl') {
  if (typeof window === 'undefined') return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'candle_spark') {
      // Gentle warm chime when lighting a candle
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35); // A5
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.25);
      return;
    }

    if (type === 'church_bell') {
      // Deep cathedral bell harmonics
      const freqs = [220, 440, 659.25, 880];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        const amp = 0.16 / (idx + 1);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(amp, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5 - idx * 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 3.6);
      });
      return;
    }

    // Default: Tibetan / Christian contemplative singing bowl (528 Hz & harmonics)
    const harmonics = [
      { freq: 432, amp: 0.18, decay: 4.2 },
      { freq: 864, amp: 0.07, decay: 3.1 },
      { freq: 1296, amp: 0.03, decay: 2.2 },
    ];

    harmonics.forEach((h) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(h.freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(h.amp, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + h.decay);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + h.decay + 0.1);
    });
  } catch (_) {
    // Ignore audio context autoplay restrictions if triggered without gesture
  }
}
