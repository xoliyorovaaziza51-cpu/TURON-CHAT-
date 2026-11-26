export interface DjPresetDefinition {
  key: string;
  title: string;
  artist: string;
  bpm: number;
  chords: number[][];
  bassline: number[];
}

export const DJ_PRESET_LIBRARY: DjPresetDefinition[] = [
  {
    key: 'tashkent-nights',
    title: 'Toshkent Tunlari (Lounge Mix)',
    artist: 'Turon Studio',
    bpm: 112,
    chords: [
      [220, 261.63, 329.63], // Am
      [174.61, 220, 261.63], // F
      [196, 246.94, 293.66], // G
      [164.81, 196, 246.94], // Em
    ],
    bassline: [110, 110, 87.31, 87.31, 98, 98, 82.41, 98],
  },
  {
    key: 'samarkand-chill',
    title: 'Samarqand Yulduzlari',
    artist: 'Sharq Beat',
    bpm: 98,
    chords: [
      [293.66, 349.23, 440], // Dm
      [233.08, 293.66, 349.23], // Bb
      [261.63, 329.63, 392], // C
      [220, 261.63, 329.63], // Am
    ],
    bassline: [146.83, 146.83, 116.54, 116.54, 130.81, 130.81, 110, 130.81],
  },
  {
    key: 'turon-bass',
    title: 'Turon Club Bass',
    artist: 'DJ Sardor',
    bpm: 124,
    chords: [
      [196, 233.08, 293.66], // Gm
      [155.56, 196, 233.08], // Eb
      [174.61, 220, 261.63], // F
      [146.83, 185, 220], // D
    ],
    bassline: [98, 98, 77.78, 77.78, 87.31, 87.31, 73.42, 87.31],
  },
  {
    key: 'silk-road-lofi',
    title: 'Ipak Yo‘li Lo-Fi',
    artist: 'Buxoro Beats',
    bpm: 88,
    chords: [
      [261.63, 311.13, 392], // Cm
      [207.65, 261.63, 311.13], // Ab
      [233.08, 293.66, 349.23], // Bb
      [196, 233.08, 293.66], // Gm
    ],
    bassline: [130.81, 130.81, 103.83, 103.83, 116.54, 116.54, 98, 116.54],
  },
];

export class ProceduralDjAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private stepTimer: number | null = null;
  private stepIndex = 0;
  private currentPresetKey: string | null = null;
  private playing = false;
  private volume = 0.25;

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  async start(presetKey: string): Promise<void> {
    if (this.playing && this.currentPresetKey === presetKey) return;
    this.stop();

    const preset =
      DJ_PRESET_LIBRARY.find((p) => p.key === presetKey) || DJ_PRESET_LIBRARY[0];

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch(() => {});
    }

    if (!this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }

    this.currentPresetKey = preset.key;
    this.playing = true;
    this.stepIndex = 0;

    const stepMs = Math.round((60 / preset.bpm / 2) * 1000); // 8th-note steps
    const runStep = () => {
      if (!this.playing || !this.ctx || !this.masterGain) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const step = this.stepIndex % 16;
      const chordIdx = Math.floor(step / 4) % preset.chords.length;

      // Kick on beats 0, 4, 8, 12
      if (step % 4 === 0) {
        this.triggerKick(now);
      }
      // Crisp hi-hat on off-beats
      if (step % 2 === 1) {
        this.triggerHiHat(now);
      }
      // Warm bass note every 2 steps
      if (step % 2 === 0) {
        const bassFreq = preset.bassline[Math.floor(step / 2) % preset.bassline.length];
        this.triggerBass(now, bassFreq);
      }
      // Ambient synth pad chord at bar/half-bar start
      if (step % 4 === 0) {
        this.triggerPadChord(now, preset.chords[chordIdx]);
      }

      this.stepIndex += 1;
    };

    runStep();
    this.stepTimer = window.setInterval(runStep, stepMs);
  }

  private triggerKick(now: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  private triggerHiHat(now: number): void {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  private triggerBass(now: number, freq: number): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  private triggerPadChord(now: number, freqs: number[]): void {
    if (!this.ctx || !this.masterGain) return;
    for (const freq of freqs) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.09, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.9);
    }
  }

  stop(): void {
    this.playing = false;
    this.currentPresetKey = null;
    if (this.stepTimer !== null) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
  }

  dispose(): void {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.masterGain = null;
  }
}
