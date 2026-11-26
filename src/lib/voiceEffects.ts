import type { NoiseSuppressionLevel, VoiceAudioSettings, VoiceEffectMode } from '../types/turon';

export interface VoiceEffectOption {
  id: VoiceEffectMode;
  label: string;
  shortLabel: string;
  description: string;
  badgeColor: string;
}

export const VOICE_EFFECT_OPTIONS: VoiceEffectOption[] = [
  {
    id: 'normal',
    label: 'Oddiy ovoz',
    shortLabel: 'Oddiy',
    description: 'Tabiiy mikrofon ovozi (filtrsiz)',
    badgeColor: 'text-slate-300 border-white/15 bg-white/5',
  },
  {
    id: 'pitch',
    label: 'Pitch Shift (Ohang)',
    shortLabel: 'Pitch',
    description: 'Ovoz balandligini -12 dan +12 yarim tongacha real vaqtda o‘zgartirish',
    badgeColor: 'text-violet-200 border-violet-400/50 bg-violet-500/20',
  },
  {
    id: 'robot',
    label: 'Robot',
    shortLabel: 'Robot',
    description: 'Kiber ring-modulyatsiya va metall vokoder rezonansi',
    badgeColor: 'text-cyan-200 border-cyan-400/50 bg-cyan-500/20',
  },
  {
    id: 'echo',
    label: 'Exo (Echo)',
    shortLabel: 'Exo',
    description: 'Keng zal aks-sadosi va chuqur stereo atmosfera',
    badgeColor: 'text-amber-200 border-amber-400/50 bg-amber-500/20',
  },
  {
    id: 'chipmunk',
    label: 'Chipmunk (+7)',
    shortLabel: 'Chipmunk',
    description: 'Yuqori ohangli quvnoq va tezlashtirilgan ovoz',
    badgeColor: 'text-pink-200 border-pink-400/50 bg-pink-500/20',
  },
  {
    id: 'deep',
    label: 'Chuqur / Bas (-6)',
    shortLabel: 'Bas',
    description: 'Yo‘g‘on, salobatli va kino qahramoni ovozi',
    badgeColor: 'text-emerald-200 border-emerald-400/50 bg-emerald-500/20',
  },
];

export function getVoiceEffectShortLabel(mode: VoiceEffectMode): string {
  return VOICE_EFFECT_OPTIONS.find((o) => o.id === mode)?.shortLabel || 'Oddiy';
}

export const VOICE_SETTINGS_STORAGE_KEY = 'turon_voice_settings';
export const VOICE_EFFECT_MODE_STORAGE_KEY = 'turon_voice_effect_mode';

export const DEFAULT_VOICE_AUDIO_SETTINGS: VoiceAudioSettings = {
  gain: 1.0,
  noiseSuppression: 'low',
  bassDb: 0,
  trebleDb: 0,
  pitchSemitones: 5,
  robotPitchHz: 55,
  echoDelayMs: 270,
  echoMix: 0.65,
};

export function loadVoiceEffectMode(): VoiceEffectMode {
  try {
    const raw = window.localStorage.getItem(VOICE_EFFECT_MODE_STORAGE_KEY);
    if (
      raw === 'normal' ||
      raw === 'pitch' ||
      raw === 'chipmunk' ||
      raw === 'deep' ||
      raw === 'robot' ||
      raw === 'echo'
    ) {
      return raw;
    }
    return 'normal';
  } catch {
    return 'normal';
  }
}

export function saveVoiceEffectMode(mode: VoiceEffectMode): void {
  try {
    window.localStorage.setItem(VOICE_EFFECT_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore storage errors
  }
}

export function loadVoiceAudioSettings(): VoiceAudioSettings {
  try {
    const raw = window.localStorage.getItem(VOICE_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_VOICE_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw);
    const ns: NoiseSuppressionLevel =
      parsed?.noiseSuppression === 'off' ||
      parsed?.noiseSuppression === 'low' ||
      parsed?.noiseSuppression === 'high'
        ? parsed.noiseSuppression
        : 'low';
    return {
      gain: Math.min(2.5, Math.max(0.2, Number(parsed?.gain ?? 1.0) || 1.0)),
      noiseSuppression: ns,
      bassDb: Math.min(12, Math.max(-12, Number(parsed?.bassDb ?? 0) || 0)),
      trebleDb: Math.min(12, Math.max(-12, Number(parsed?.trebleDb ?? 0) || 0)),
      pitchSemitones: Math.min(12, Math.max(-12, Number(parsed?.pitchSemitones ?? 5))),
      robotPitchHz: Math.min(120, Math.max(35, Number(parsed?.robotPitchHz ?? 55) || 55)),
      echoDelayMs: Math.min(550, Math.max(120, Number(parsed?.echoDelayMs ?? 270) || 270)),
      echoMix: Math.min(0.9, Math.max(0.15, Number(parsed?.echoMix ?? 0.65) || 0.65)),
    };
  } catch {
    return { ...DEFAULT_VOICE_AUDIO_SETTINGS };
  }
}

export function saveVoiceAudioSettings(settings: VoiceAudioSettings): void {
  try {
    window.localStorage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

// Inline AudioWorklet source for click-free Hann-windowed overlap-add real-time pitch shifting
const PITCH_WORKLET_CODE = `
class TuronPitchShiftProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'pitchRatio', defaultValue: 1.0, minValue: 0.4, maxValue: 2.5, automationRate: 'k-rate' }
    ];
  }
  constructor() {
    super();
    this.bufSize = 4096;
    this.mask = this.bufSize - 1;
    this.grainSize = 2048;
    this.ring = new Float32Array(this.bufSize);
    this.writeIdx = 0;
    this.phase0 = 0;
    this.phase1 = 0.5;
  }
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];
    if (!output || output.length === 0) return true;
    const outCh0 = output[0];
    if (!input || input.length === 0) {
      outCh0.fill(0);
      return true;
    }
    const inCh0 = input[0];
    const ratioArr = parameters.pitchRatio;
    const ratio = ratioArr && ratioArr.length > 0 ? ratioArr[0] : 1.0;

    // Rate at which the read pointer drifts relative to write pointer
    const deltaPhase = (1.0 - ratio) / this.grainSize;

    for (let i = 0; i < outCh0.length; i++) {
      this.ring[this.writeIdx] = inCh0[i];

      const d0 = this.phase0 * this.grainSize;
      const d1 = this.phase1 * this.grainSize;

      const r0 = (this.writeIdx - d0 + this.bufSize) & this.mask;
      const r1 = (this.writeIdx - d1 + this.bufSize) & this.mask;

      const idx0A = Math.floor(r0);
      const frac0 = r0 - idx0A;
      const idx0B = (idx0A + 1) & this.mask;
      const s0 = this.ring[idx0A] * (1 - frac0) + this.ring[idx0B] * frac0;

      const idx1A = Math.floor(r1);
      const frac1 = r1 - idx1A;
      const idx1B = (idx1A + 1) & this.mask;
      const s1 = this.ring[idx1A] * (1 - frac1) + this.ring[idx1B] * frac1;

      const w0 = 0.5 * (1 - Math.cos(2 * Math.PI * this.phase0));
      const w1 = 0.5 * (1 - Math.cos(2 * Math.PI * this.phase1));

      outCh0[i] = s0 * w0 + s1 * w1;

      this.writeIdx = (this.writeIdx + 1) & this.mask;
      this.phase0 += deltaPhase;
      this.phase1 += deltaPhase;
      if (this.phase0 >= 1) this.phase0 -= 1;
      if (this.phase0 < 0) this.phase0 += 1;
      if (this.phase1 >= 1) this.phase1 -= 1;
      if (this.phase1 < 0) this.phase1 += 1;
    }

    for (let c = 1; c < output.length; c++) {
      output[c].set(outCh0);
    }
    return true;
  }
}
registerProcessor('turon-pitch-shift', TuronPitchShiftProcessor);
`;

export class VoiceEffectProcessor {
  private ctx: AudioContext | null = null;
  private rawStream: MediaStream | null = null;
  private ownsRawStream = true;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private monitorGain: GainNode | null = null;
  private micInputGain: GainNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserData: Uint8Array<ArrayBuffer> | null = null;
  private pitchWorkletLoaded = false;
  private pitchWorkletFailed = false;
  private pitchWorkletNode: AudioWorkletNode | null = null;
  private robotCarrierOsc: OscillatorNode | null = null;
  private echoDelayNode: DelayNode | null = null;
  private echoWetNode: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private mode: VoiceEffectMode = 'normal';
  private isMonitoring = false;
  private audioSettings: VoiceAudioSettings = { ...DEFAULT_VOICE_AUDIO_SETTINGS };

  async init(existingStream?: MediaStream): Promise<MediaStream> {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.pitchWorkletLoaded && !this.pitchWorkletFailed && this.ctx.audioWorklet) {
      try {
        const blob = new Blob([PITCH_WORKLET_CODE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        try {
          await this.ctx.audioWorklet.addModule(url);
          this.pitchWorkletLoaded = true;
        } finally {
          URL.revokeObjectURL(url);
        }
      } catch {
        this.pitchWorkletFailed = true;
      }
    }

    if (!this.rawStream) {
      if (existingStream) {
        this.rawStream = existingStream;
        this.ownsRawStream = false;
      } else {
        this.rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: this.audioSettings.noiseSuppression !== 'off',
            autoGainControl: this.audioSettings.noiseSuppression !== 'off',
          },
        });
        this.ownsRawStream = true;
      }
    }

    if (!this.sourceNode) {
      this.sourceNode = this.ctx.createMediaStreamSource(this.rawStream);
    }
    if (!this.destNode) {
      this.destNode = this.ctx.createMediaStreamDestination();
    }
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyserData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    }
    if (!this.monitorGain) {
      this.monitorGain = this.ctx.createGain();
      this.monitorGain.gain.value = this.isMonitoring ? 0.85 : 0;

      this.bassFilter = this.ctx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 180;
      this.bassFilter.gain.value = this.audioSettings.bassDb;

      this.trebleFilter = this.ctx.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 3500;
      this.trebleFilter.gain.value = this.audioSettings.trebleDb;

      this.monitorGain.connect(this.bassFilter);
      this.bassFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.ctx.destination);
    }

    this.rebuildGraph();
    return this.destNode.stream;
  }

  setMode(mode: VoiceEffectMode): void {
    this.mode = mode;
    if (this.ctx && this.sourceNode && this.destNode) {
      this.rebuildGraph();
    }
  }

  getMode(): VoiceEffectMode {
    return this.mode;
  }

  getInputLevel(): number {
    if (!this.analyser || !this.analyserData) return 0;
    this.analyser.getByteTimeDomainData(this.analyserData);
    let sumSq = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      const norm = (this.analyserData[i] - 128) / 128;
      sumSq += norm * norm;
    }
    const rms = Math.sqrt(sumSq / this.analyserData.length);
    return Math.min(1, rms * 3.8);
  }

  setAudioSettings(next: VoiceAudioSettings): void {
    const prevNs = this.audioSettings.noiseSuppression;
    this.audioSettings = { ...this.audioSettings, ...next };

    if (this.micInputGain && this.ctx) {
      this.micInputGain.gain.setTargetAtTime(
        Math.min(2.5, Math.max(0.2, next.gain)),
        this.ctx.currentTime,
        0.02
      );
    }
    if (this.bassFilter && this.ctx) {
      this.bassFilter.gain.setTargetAtTime(next.bassDb, this.ctx.currentTime, 0.02);
    }
    if (this.trebleFilter && this.ctx) {
      this.trebleFilter.gain.setTargetAtTime(next.trebleDb, this.ctx.currentTime, 0.02);
    }

    // Live-update active effect parameters without rebuilding graph
    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.pitchWorkletNode && this.mode === 'pitch') {
        const semi = Math.min(12, Math.max(-12, Number(next.pitchSemitones ?? 5)));
        const param = this.pitchWorkletNode.parameters.get('pitchRatio');
        param?.setTargetAtTime(Math.pow(2, semi / 12), now, 0.02);
      }
      if (this.robotCarrierOsc && this.mode === 'robot') {
        const hz = Math.min(120, Math.max(35, Number(next.robotPitchHz ?? 55)));
        this.robotCarrierOsc.frequency.setTargetAtTime(hz, now, 0.02);
      }
      if (this.echoDelayNode && this.mode === 'echo') {
        const delaySec = Math.min(0.55, Math.max(0.12, Number(next.echoDelayMs ?? 270) / 1000));
        this.echoDelayNode.delayTime.setTargetAtTime(delaySec, now, 0.03);
      }
      if (this.echoWetNode && this.mode === 'echo') {
        const mix = Math.min(0.9, Math.max(0.15, Number(next.echoMix ?? 0.65)));
        this.echoWetNode.gain.setTargetAtTime(mix, now, 0.02);
      }
    }

    if (this.rawStream) {
      const track = this.rawStream.getAudioTracks()[0];
      if (track && typeof track.applyConstraints === 'function') {
        track
          .applyConstraints({
            echoCancellation: true,
            noiseSuppression: next.noiseSuppression !== 'off',
            autoGainControl: next.noiseSuppression !== 'off',
          })
          .catch(() => {});
      }
    }

    if (prevNs !== next.noiseSuppression && this.ctx && this.sourceNode && this.destNode) {
      this.rebuildGraph();
    }
  }

  setMonitorEnabled(enabled: boolean): void {
    this.isMonitoring = enabled;
    if (this.monitorGain && this.ctx) {
      this.monitorGain.gain.setTargetAtTime(enabled ? 0.85 : 0, this.ctx.currentTime, 0.02);
    }
  }

  getProcessedTrack(): MediaStreamTrack | null {
    return this.destNode?.stream.getAudioTracks()[0] || null;
  }

  private clearGraph(): void {
    for (const osc of this.oscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore
      }
    }
    this.oscillators = [];

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
    }

    for (const node of this.activeNodes) {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    }
    this.activeNodes = [];
    this.micInputGain = null;
    this.pitchWorkletNode = null;
    this.robotCarrierOsc = null;
    this.echoDelayNode = null;
    this.echoWetNode = null;
  }

  private connectOutput(node: AudioNode): void {
    if (this.analyser) node.connect(this.analyser);
    if (this.destNode) node.connect(this.destNode);
    if (this.monitorGain) node.connect(this.monitorGain);
  }

  private buildPitchShiftChain(ctx: AudioContext, input: AudioNode, semitones: number): void {
    const ratio = Math.pow(2, Math.min(12, Math.max(-12, semitones)) / 12);

    // Subtle formant & presence shaping for natural shifted voice
    const clarityFilter = ctx.createBiquadFilter();
    clarityFilter.type = 'peaking';
    clarityFilter.frequency.value = semitones >= 0 ? 2200 : 280;
    clarityFilter.Q.value = 1.1;
    clarityFilter.gain.value = semitones === 0 ? 0 : 4;

    if (this.pitchWorkletLoaded) {
      const worklet = new AudioWorkletNode(ctx, 'turon-pitch-shift', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      const param = worklet.parameters.get('pitchRatio');
      if (param) {
        param.value = ratio;
      }
      const outGain = ctx.createGain();
      outGain.gain.value = 1.15;

      input.connect(worklet);
      worklet.connect(clarityFilter);
      clarityFilter.connect(outGain);
      this.connectOutput(outGain);

      this.pitchWorkletNode = worklet;
      this.activeNodes.push(worklet, clarityFilter, outGain);
      return;
    }

    // Fallback: dual-delay modulated pitch shifter if AudioWorklet unavailable
    const windowSec = 0.055;
    const lfoFreq = Math.max(0.5, Math.abs(1 - ratio) / windowSec);
    const depth = (ratio >= 1 ? -1 : 1) * (windowSec * 0.48);

    const delayA = ctx.createDelay(0.25);
    const delayB = ctx.createDelay(0.25);
    delayA.delayTime.value = windowSec * 0.5;
    delayB.delayTime.value = windowSec * 0.5;

    const gainA = ctx.createGain();
    const gainB = ctx.createGain();
    gainA.gain.value = 0.55;
    gainB.gain.value = 0.55;

    const lfo = ctx.createOscillator();
    lfo.type = 'triangle';
    lfo.frequency.value = lfoFreq;

    const lfoDepthA = ctx.createGain();
    lfoDepthA.gain.value = depth;
    const lfoDepthB = ctx.createGain();
    lfoDepthB.gain.value = -depth;

    lfo.connect(lfoDepthA);
    lfoDepthA.connect(delayA.delayTime);
    lfo.connect(lfoDepthB);
    lfoDepthB.connect(delayB.delayTime);

    const outGain = ctx.createGain();
    outGain.gain.value = 1.1;

    input.connect(clarityFilter);
    clarityFilter.connect(delayA);
    clarityFilter.connect(delayB);
    delayA.connect(gainA);
    delayB.connect(gainB);
    gainA.connect(outGain);
    gainB.connect(outGain);
    this.connectOutput(outGain);

    lfo.start();
    this.oscillators.push(lfo);
    this.activeNodes.push(
      clarityFilter,
      delayA,
      delayB,
      gainA,
      gainB,
      lfoDepthA,
      lfoDepthB,
      outGain
    );
  }

  private rebuildGraph(): void {
    if (!this.ctx || !this.sourceNode || !this.destNode) return;
    this.clearGraph();

    const ctx = this.ctx;
    const rawSrc = this.sourceNode;

    // Input Stage: Mic Gain + Noise Suppression HPF / Compressor
    const micGain = ctx.createGain();
    micGain.gain.value = Math.min(2.5, Math.max(0.2, this.audioSettings.gain));
    this.micInputGain = micGain;

    let stageOut: AudioNode = micGain;
    rawSrc.connect(micGain);
    this.activeNodes.push(micGain);

    if (this.audioSettings.noiseSuppression !== 'off') {
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = this.audioSettings.noiseSuppression === 'high' ? 145 : 85;
      stageOut.connect(hpf);
      this.activeNodes.push(hpf);
      stageOut = hpf;

      if (this.audioSettings.noiseSuppression === 'high') {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -36;
        comp.knee.value = 18;
        comp.ratio.value = 4;
        comp.attack.value = 0.005;
        comp.release.value = 0.12;
        stageOut.connect(comp);
        this.activeNodes.push(comp);
        stageOut = comp;
      }
    }

    if (this.mode === 'normal') {
      this.connectOutput(stageOut);
      return;
    }

    if (this.mode === 'pitch') {
      const semitones = Number(this.audioSettings.pitchSemitones ?? 5);
      this.buildPitchShiftChain(ctx, stageOut, semitones);
      return;
    }

    if (this.mode === 'chipmunk') {
      this.buildPitchShiftChain(ctx, stageOut, 7);
      return;
    }

    if (this.mode === 'deep') {
      this.buildPitchShiftChain(ctx, stageOut, -6);
      return;
    }

    if (this.mode === 'robot') {
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 1150;
      bandpass.Q.value = 1.05;

      const modGain = ctx.createGain();
      modGain.gain.value = 0.0;

      const carrier = ctx.createOscillator();
      carrier.type = 'sawtooth';
      carrier.frequency.value = Math.min(120, Math.max(35, Number(this.audioSettings.robotPitchHz ?? 55)));
      this.robotCarrierOsc = carrier;

      const carrierDepth = ctx.createGain();
      carrierDepth.gain.value = 0.92;

      // Short metallic comb delay for vocoder texture
      const combDelay = ctx.createDelay(0.05);
      combDelay.delayTime.value = 0.0085;
      const combFeedback = ctx.createGain();
      combFeedback.gain.value = 0.36;

      const dryMix = ctx.createGain();
      dryMix.gain.value = 0.24;

      const outGain = ctx.createGain();
      outGain.gain.value = 1.3;

      stageOut.connect(bandpass);
      bandpass.connect(modGain);
      bandpass.connect(dryMix);

      carrier.connect(carrierDepth);
      carrierDepth.connect(modGain.gain);

      modGain.connect(combDelay);
      combDelay.connect(combFeedback);
      combFeedback.connect(combDelay);

      modGain.connect(outGain);
      combDelay.connect(outGain);
      dryMix.connect(outGain);
      this.connectOutput(outGain);

      carrier.start();
      this.oscillators.push(carrier);
      this.activeNodes.push(
        bandpass,
        modGain,
        carrierDepth,
        combDelay,
        combFeedback,
        dryMix,
        outGain
      );
      return;
    }

    if (this.mode === 'echo') {
      const dry = ctx.createGain();
      dry.gain.value = 0.88;

      const delayMs = Math.min(550, Math.max(120, Number(this.audioSettings.echoDelayMs ?? 270)));
      const mix = Math.min(0.9, Math.max(0.15, Number(this.audioSettings.echoMix ?? 0.65)));

      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = delayMs / 1000;
      this.echoDelayNode = delay;

      const slapback = ctx.createDelay(0.5);
      slapback.delayTime.value = Math.max(0.08, (delayMs / 1000) * 0.48);

      const feedback = ctx.createGain();
      feedback.gain.value = 0.46;

      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2600;

      const wet = ctx.createGain();
      wet.gain.value = mix;
      this.echoWetNode = wet;

      const slapGain = ctx.createGain();
      slapGain.gain.value = mix * 0.42;

      const outGain = ctx.createGain();
      outGain.gain.value = 1.0;

      stageOut.connect(dry);
      stageOut.connect(delay);
      stageOut.connect(slapback);

      delay.connect(damp);
      damp.connect(feedback);
      feedback.connect(delay);
      damp.connect(wet);

      slapback.connect(slapGain);

      dry.connect(outGain);
      wet.connect(outGain);
      slapGain.connect(outGain);
      this.connectOutput(outGain);

      this.activeNodes.push(dry, delay, slapback, feedback, damp, wet, slapGain, outGain);
    }
  }

  dispose(): void {
    this.clearGraph();
    if (this.rawStream && this.ownsRawStream) {
      this.rawStream.getTracks().forEach((t) => t.stop());
    }
    this.rawStream = null;
    this.sourceNode = null;
    this.destNode = null;
    this.analyser = null;
    this.analyserData = null;
    this.monitorGain = null;
    this.bassFilter = null;
    this.trebleFilter = null;
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

/**
 * Output Equalizer (Bass / Treble) applied to HTMLMediaElement audio outputs (DJ audio or remote LiveKit audio elements).
 */
export class OutputEqProcessor {
  private ctx: AudioContext | null = null;
  private attachedElements = new WeakSet<HTMLMediaElement>();
  private bassFilters: BiquadFilterNode[] = [];
  private trebleFilters: BiquadFilterNode[] = [];
  private bassDb = 0;
  private trebleDb = 0;

  attachMediaElement(el: HTMLMediaElement): void {
    if (this.attachedElements.has(el)) return;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const source = this.ctx.createMediaElementSource(el);
      const bass = this.ctx.createBiquadFilter();
      bass.type = 'lowshelf';
      bass.frequency.value = 180;
      bass.gain.value = this.bassDb;

      const treble = this.ctx.createBiquadFilter();
      treble.type = 'highshelf';
      treble.frequency.value = 3500;
      treble.gain.value = this.trebleDb;

      source.connect(bass);
      bass.connect(treble);
      treble.connect(this.ctx.destination);

      this.attachedElements.add(el);
      this.bassFilters.push(bass);
      this.trebleFilters.push(treble);
    } catch {
      // Cross-origin or already connected media elements fail gracefully without breaking playback
    }
  }

  setEq(bassDb: number, trebleDb: number): void {
    this.bassDb = Math.min(12, Math.max(-12, bassDb));
    this.trebleDb = Math.min(12, Math.max(-12, trebleDb));
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const b of this.bassFilters) {
      try {
        b.gain.setTargetAtTime(this.bassDb, now, 0.02);
      } catch {
        // ignore
      }
    }
    for (const t of this.trebleFilters) {
      try {
        t.gain.setTargetAtTime(this.trebleDb, now, 0.02);
      } catch {
        // ignore
      }
    }
  }

  dispose(): void {
    this.bassFilters = [];
    this.trebleFilters = [];
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
