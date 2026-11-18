export const playSound = (
  tone: 'chime' | 'alarm' | 'beep' | 'custom',
  vol: number = 0.6,
  customAudioUrl?: string
) => {
  if (tone === 'custom' && customAudioUrl) {
    try {
      const a = new Audio(customAudioUrl);
      a.volume = Math.max(0, Math.min(1, vol));
      a.play().catch((err) => console.log('Audio playback prevented:', err));
      return;
    } catch (e) {
      console.warn('Custom audio failed, fallback to synth', e);
    }
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const tones: Record<string, number[]> = {
      chime: [880, 1320],
      alarm: [600, 900, 600, 900],
      beep: [800],
    };

    const freqList = tones[tone] || [880];
    const duration = 0.16;

    freqList.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone === 'alarm' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.18);
      gain.gain.setValueAtTime(vol * 0.8, ctx.currentTime + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + idx * 0.18 + duration
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.18);
      osc.stop(ctx.currentTime + idx * 0.18 + duration + 0.05);
    });
  } catch (err) {
    console.warn('AudioContext error:', err);
  }
};
