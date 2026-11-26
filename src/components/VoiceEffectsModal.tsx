import React, { useEffect, useState } from 'react';
import {
  AudioWaveform,
  Bot,
  Check,
  Headphones,
  Mic,
  Radio,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  Waves,
  X,
} from 'lucide-react';
import { DEFAULT_VOICE_AUDIO_SETTINGS, VOICE_EFFECT_OPTIONS } from '../lib/voiceEffects';
import type { NoiseSuppressionLevel, VoiceAudioSettings, VoiceEffectMode } from '../types/turon';

interface VoiceEffectsModalProps {
  activeMode: VoiceEffectMode;
  voiceSettings: VoiceAudioSettings;
  monitorEnabled: boolean;
  micError: string;
  livekitActive: boolean;
  getInputLevel?: () => number;
  onSelectMode: (mode: VoiceEffectMode) => void;
  onUpdateVoiceSettings: (settings: VoiceAudioSettings) => void;
  onToggleMonitor: () => void;
  onClose: () => void;
}

const NOISE_LEVELS: Array<{ id: NoiseSuppressionLevel; label: string; hint: string }> = [
  { id: 'off', label: 'O‘chiq', hint: 'Tabiiy signal' },
  { id: 'low', label: 'Past', hint: 'Yengil fon tozalash' },
  { id: 'high', label: 'Yuqori', hint: 'Kuchli shovqin filtri' },
];

const PITCH_QUICK_PRESETS = [-8, -4, 0, 4, 8];

function renderEffectIcon(mode: VoiceEffectMode, selected: boolean) {
  const cls = `w-4 h-4 ${selected ? 'text-emerald-300' : 'text-slate-400'}`;
  switch (mode) {
    case 'robot':
      return <Bot className={cls} />;
    case 'echo':
      return <Waves className={cls} />;
    case 'pitch':
      return <AudioWaveform className={cls} />;
    case 'chipmunk':
      return <Sparkles className={cls} />;
    case 'deep':
      return <Radio className={cls} />;
    default:
      return <Mic className={cls} />;
  }
}

export const VoiceEffectsModal: React.FC<VoiceEffectsModalProps> = ({
  activeMode,
  voiceSettings,
  monitorEnabled,
  micError,
  livekitActive,
  getInputLevel,
  onSelectMode,
  onUpdateVoiceSettings,
  onToggleMonitor,
  onClose,
}) => {
  const [tab, setTab] = useState<'effects' | 'settings'>('effects');
  const [inputLevel, setInputLevel] = useState(0);

  const gainPercent = Math.round(voiceSettings.gain * 100);
  const pitchSemitones = Math.round(voiceSettings.pitchSemitones ?? 5);
  const robotPitchHz = Math.round(voiceSettings.robotPitchHz ?? 55);
  const echoDelayMs = Math.round(voiceSettings.echoDelayMs ?? 270);
  const echoMixPct = Math.round((voiceSettings.echoMix ?? 0.65) * 100);

  useEffect(() => {
    if (!getInputLevel || (!monitorEnabled && activeMode === 'normal')) {
      setInputLevel(0);
      return;
    }
    let rafId = 0;
    let lastTick = 0;
    const loop = (now: number) => {
      if (now - lastTick >= 60) {
        lastTick = now;
        setInputLevel(getInputLevel());
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [getInputLevel, monitorEnabled, activeMode]);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-fade-in">
      <div className="w-full max-w-md bg-[#0B101D] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col animate-sheet-fade-in">
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0F1524]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/35 flex items-center justify-center text-emerald-300">
              <AudioWaveform className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Ovoz effektlari va sozlamalar
              </h3>
              <p className="text-xs text-slate-400">
                Real vaqt rejimida Pitch Shift, Robot va Exo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Switcher Tabs */}
        <div className="px-5 pt-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0F1524] border border-white/[0.07]">
            <button
              type="button"
              onClick={() => setTab('effects')}
              className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                tab === 'effects'
                  ? 'bg-emerald-500 text-[#05101F]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <AudioWaveform className="w-3.5 h-3.5" />
              <span>Ovoz effektlari</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                tab === 'settings'
                  ? 'bg-emerald-500 text-[#05101F]'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Mikrofon va EQ</span>
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {micError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {micError}
            </div>
          )}

          {/* Real-time Voice Level Meter */}
          {(monitorEnabled || activeMode !== 'normal') && (
            <div className="p-3 rounded-xl bg-[#0F1524] border border-emerald-500/25 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Jonli mikrofon signali</span>
                </span>
                <span className="font-mono text-slate-400">
                  {Math.round(inputLevel * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#080B14] overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.round(inputLevel * 100))}%` }}
                />
              </div>
            </div>
          )}

          {tab === 'effects' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {VOICE_EFFECT_OPTIONS.map((opt) => {
                  const selected = activeMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectMode(opt.id)}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${
                        selected
                          ? 'bg-emerald-500/15 border-emerald-400/60 text-white'
                          : 'bg-[#0F1524] border-white/[0.08] text-slate-200 hover:border-white/25'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {renderEffectIcon(opt.id, selected)}
                          <span>{opt.label}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{opt.description}</div>
                      </div>
                      {selected && (
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-[#080B14] flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Fine-tuning controls for active effect */}
              {activeMode === 'pitch' && (
                <div className="p-4 rounded-2xl bg-[#0F1524] border border-violet-400/35 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Ohang balandligi (Pitch Shift)</span>
                    <span className="font-mono tabular-nums font-bold text-violet-300">
                      {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} yarim ton
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={pitchSemitones}
                    onChange={(e) =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        pitchSemitones: Number(e.target.value),
                      })
                    }
                    className="w-full accent-violet-400 cursor-pointer"
                  />
                  <div className="grid grid-cols-5 gap-1.5">
                    {PITCH_QUICK_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() =>
                          onUpdateVoiceSettings({
                            ...voiceSettings,
                            pitchSemitones: p,
                          })
                        }
                        className={`py-1.5 rounded-lg text-[11px] font-mono font-semibold border transition-colors ${
                          pitchSemitones === p
                            ? 'bg-violet-500/25 border-violet-400 text-white'
                            : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {p > 0 ? `+${p}` : p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeMode === 'robot' && (
                <div className="p-4 rounded-2xl bg-[#0F1524] border border-cyan-400/35 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">Robot modulyatsiya chastotasi</span>
                    <span className="font-mono tabular-nums font-bold text-cyan-300">
                      {robotPitchHz} Hz
                    </span>
                  </div>
                  <input
                    type="range"
                    min={35}
                    max={120}
                    step={5}
                    value={robotPitchHz}
                    onChange={(e) =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        robotPitchHz: Number(e.target.value),
                      })
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>35 Hz (Chuqur)</span>
                    <span>55 Hz (Standart)</span>
                    <span>120 Hz (Yuqori)</span>
                  </div>
                </div>
              )}

              {activeMode === 'echo' && (
                <div className="p-4 rounded-2xl bg-[#0F1524] border border-amber-400/35 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Aks-sado kechikishi (Delay)</span>
                      <span className="font-mono tabular-nums font-bold text-amber-300">
                        {echoDelayMs} ms
                      </span>
                    </div>
                    <input
                      type="range"
                      min={120}
                      max={550}
                      step={10}
                      value={echoDelayMs}
                      onChange={(e) =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          echoDelayMs: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Aks-sado kuchi (Mix)</span>
                      <span className="font-mono tabular-nums font-bold text-amber-300">
                        {echoMixPct}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={90}
                      step={5}
                      value={echoMixPct}
                      onChange={(e) =>
                        onUpdateVoiceSettings({
                          ...voiceSettings,
                          echoMix: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Microphone Gain Slider */}
              <div className="p-4 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Mic className="w-4 h-4 text-emerald-400" />
                    <span>Mikrofon kuchaytirish (Gain)</span>
                  </span>
                  <span className="font-mono tabular-nums font-bold text-emerald-300">
                    {gainPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={250}
                  step={5}
                  value={gainPercent}
                  onChange={(e) =>
                    onUpdateVoiceSettings({
                      ...voiceSettings,
                      gain: Number(e.target.value) / 100,
                    })
                  }
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>20%</span>
                  <span>100% (Asl)</span>
                  <span>250%</span>
                </div>
              </div>

              {/* Noise Suppression Level */}
              <div className="p-4 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-2.5">
                <div className="text-xs font-semibold text-white">
                  Shovqinni kamaytirish (Noise Suppression)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {NOISE_LEVELS.map((lvl) => {
                    const active = voiceSettings.noiseSuppression === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() =>
                          onUpdateVoiceSettings({
                            ...voiceSettings,
                            noiseSuppression: lvl.id,
                          })
                        }
                        className={`p-2.5 rounded-xl border text-center transition-colors ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div className="text-xs font-bold">{lvl.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{lvl.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Output Equalizer: Bass / Treble */}
              <div className="p-4 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-sky-400" />
                    <span>Chiqish ekvalayzeri (EQ)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateVoiceSettings({ ...DEFAULT_VOICE_AUDIO_SETTINGS })}
                    className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Asliga qaytarish</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Bass (Past chastotalar)</span>
                    <span className="font-mono tabular-nums font-bold text-sky-300">
                      {voiceSettings.bassDb > 0 ? `+${voiceSettings.bassDb}` : voiceSettings.bassDb} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={voiceSettings.bassDb}
                    onChange={(e) =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        bassDb: Number(e.target.value),
                      })
                    }
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Treble (Yuqori chastotalar)</span>
                    <span className="font-mono tabular-nums font-bold text-amber-300">
                      {voiceSettings.trebleDb > 0
                        ? `+${voiceSettings.trebleDb}`
                        : voiceSettings.trebleDb}{' '}
                      dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={voiceSettings.trebleDb}
                    onChange={(e) =>
                      onUpdateVoiceSettings({
                        ...voiceSettings,
                        trebleDb: Number(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Local Audio Monitor / Test Toggle */}
          <div className="p-3.5 rounded-xl bg-[#0F1524] border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-blue-400" />
                <span>O‘z ovozini jonli eshitib sinash</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {livekitActive
                  ? 'Effektlar jonli ovoz kanaliga real vaqtda uzatilmoqda'
                  : 'Quloqchinda effektlarni jonli tekshiring'}
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleMonitor}
              className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
                monitorEnabled
                  ? 'bg-blue-600 border-blue-400 text-white'
                  : 'bg-[#080B14] border-white/15 text-slate-300 hover:text-white'
              }`}
            >
              {monitorEnabled ? 'Yoqilgan' : 'Sinab ko‘rish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
