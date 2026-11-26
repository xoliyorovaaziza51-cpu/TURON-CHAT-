import React, { useEffect, useState } from 'react';
import {
  AudioWaveform,
  Bot,
  ChevronDown,
  ChevronUp,
  Headphones,
  Mic,
  Radio,
  Sliders,
  Sparkles,
  Waves,
  X,
} from 'lucide-react';
import { VOICE_EFFECT_OPTIONS, getVoiceEffectShortLabel } from '../lib/voiceEffects';
import type { VoiceAudioSettings, VoiceEffectMode } from '../types/turon';

interface VoiceEffectFloatPanelProps {
  isOpen: boolean;
  activeMode: VoiceEffectMode;
  voiceSettings: VoiceAudioSettings;
  monitorEnabled: boolean;
  micError?: string;
  getInputLevel?: () => number;
  onToggleOpen: () => void;
  onSelectMode: (mode: VoiceEffectMode) => void;
  onUpdateVoiceSettings: (settings: VoiceAudioSettings) => void;
  onToggleMonitor: () => void;
  onOpenFullSettings: () => void;
}

function renderModeIcon(mode: VoiceEffectMode, className = 'w-3.5 h-3.5') {
  switch (mode) {
    case 'robot':
      return <Bot className={className} />;
    case 'echo':
      return <Waves className={className} />;
    case 'pitch':
      return <AudioWaveform className={className} />;
    case 'chipmunk':
      return <Sparkles className={className} />;
    case 'deep':
      return <Radio className={className} />;
    default:
      return <Mic className={className} />;
  }
}

const MODE_ACCENT_PILL: Record<VoiceEffectMode, string> = {
  normal: 'bg-black/50 border-white/15 text-slate-200 hover:bg-black/70',
  pitch: 'bg-violet-500/25 border-violet-400/60 text-violet-100 shadow-[0_0_14px_rgba(139,92,246,0.28)]',
  robot: 'bg-cyan-500/25 border-cyan-400/60 text-cyan-100 shadow-[0_0_14px_rgba(6,182,212,0.28)]',
  echo: 'bg-amber-500/25 border-amber-400/60 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.28)]',
  chipmunk: 'bg-pink-500/25 border-pink-400/60 text-pink-100 shadow-[0_0_14px_rgba(236,72,153,0.28)]',
  deep: 'bg-emerald-500/25 border-emerald-400/60 text-emerald-100 shadow-[0_0_14px_rgba(16,185,129,0.28)]',
};

export const VoiceEffectFloatTrigger: React.FC<{
  activeMode: VoiceEffectMode;
  voiceSettings: VoiceAudioSettings;
  isOpen: boolean;
  onClick: () => void;
}> = ({ activeMode, voiceSettings, isOpen, onClick }) => {
  const pitchSemitones = Math.round(voiceSettings.pitchSemitones ?? 5);
  const label =
    activeMode === 'pitch'
      ? `Pitch ${pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}`
      : getVoiceEffectShortLabel(activeMode);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[11px] font-semibold transition-all ${MODE_ACCENT_PILL[activeMode]}`}
      title="Ovoz effektini tez almashtirish"
    >
      {activeMode !== 'normal' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      )}
      {renderModeIcon(activeMode, 'w-3.5 h-3.5 shrink-0')}
      <span>{activeMode === 'normal' ? 'Effekt: Oddiy' : label}</span>
      {isOpen ? (
        <ChevronDown className="w-3 h-3 opacity-80" />
      ) : (
        <ChevronUp className="w-3 h-3 opacity-80" />
      )}
    </button>
  );
};

export const VoiceEffectFloatPanel: React.FC<VoiceEffectFloatPanelProps> = ({
  isOpen,
  activeMode,
  voiceSettings,
  monitorEnabled,
  micError,
  getInputLevel,
  onToggleOpen,
  onSelectMode,
  onUpdateVoiceSettings,
  onToggleMonitor,
  onOpenFullSettings,
}) => {
  const [level, setLevel] = useState(0);

  const pitchSemitones = Math.round(voiceSettings.pitchSemitones ?? 5);
  const robotPitchHz = Math.round(voiceSettings.robotPitchHz ?? 55);
  const echoMixPct = Math.round((voiceSettings.echoMix ?? 0.65) * 100);

  useEffect(() => {
    if (!isOpen || !getInputLevel || (!monitorEnabled && activeMode === 'normal')) {
      setLevel(0);
      return;
    }
    let rafId = 0;
    let last = 0;
    const tick = (now: number) => {
      if (now - last >= 65) {
        last = now;
        setLevel(getInputLevel());
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, getInputLevel, monitorEnabled, activeMode]);

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-[68px] right-3 left-3 sm:left-auto sm:right-6 sm:w-[336px] z-30 rounded-2xl bg-[#0B1224]/92 backdrop-blur-xl border border-white/15 shadow-[0_14px_40px_rgba(0,0,0,0.65)] p-3 space-y-2.5 animate-sheet-fade-in">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            {renderModeIcon(activeMode, 'w-3.5 h-3.5')}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-white leading-tight truncate">
              Ovoz effekti:{' '}
              <span className="text-emerald-300">
                {VOICE_EFFECT_OPTIONS.find((o) => o.id === activeMode)?.label || 'Oddiy'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 leading-tight">
              Tezkor almashtirish paneli
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onToggleMonitor}
            title="O‘z ovozini jonli eshitib sinash"
            className={`h-7 px-2 rounded-lg text-[10px] font-semibold border flex items-center gap-1 transition-colors ${
              monitorEnabled
                ? 'bg-blue-600/35 border-blue-400 text-blue-100'
                : 'bg-white/[0.05] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Headphones className="w-3 h-3" />
            <span>{monitorEnabled ? 'Sinov' : 'Eshitish'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenFullSettings}
            title="To‘liq ovoz sozlamalari (Gain, EQ, Shovqin)"
            className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white flex items-center justify-center"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleOpen}
            aria-label="Panelni yopish"
            className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {micError && (
        <div className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-400/35 text-[11px] text-red-200">
          {micError}
        </div>
      )}

      {/* Live Mic Level Micro-Meter */}
      {(monitorEnabled || activeMode !== 'normal') && (
        <div className="h-1.5 w-full rounded-full bg-[#060A14] overflow-hidden border border-white/5">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 transition-all duration-75"
            style={{ width: `${Math.min(100, Math.round(level * 100))}%` }}
          />
        </div>
      )}

      {/* 3x2 Quick Effect Selector Grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {VOICE_EFFECT_OPTIONS.map((opt) => {
          const selected = activeMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectMode(opt.id)}
              className={`px-2 py-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all ${
                selected
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.22)]'
                  : 'bg-[#080D1B]/80 border-white/[0.08] text-slate-300 hover:border-white/25 hover:text-white'
              }`}
            >
              {renderModeIcon(
                opt.id,
                `w-4 h-4 ${selected ? 'text-emerald-300' : 'text-slate-400'}`
              )}
              <span className="text-[11px] font-semibold leading-none truncate max-w-full">
                {opt.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Inline Fine-Tune Slider for Active Effect */}
      {activeMode === 'pitch' && (
        <div className="p-2.5 rounded-xl bg-[#080D1B]/85 border border-violet-400/30 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Ohang (Pitch Shift)</span>
            <span className="font-mono font-bold text-violet-300">
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
            className="w-full accent-violet-400 cursor-pointer h-1.5"
          />
          <div className="flex items-center justify-between gap-1">
            {[-6, -3, 0, 3, 6].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  onUpdateVoiceSettings({ ...voiceSettings, pitchSemitones: p })
                }
                className={`flex-1 py-1 rounded-md text-[10px] font-mono font-semibold border ${
                  pitchSemitones === p
                    ? 'bg-violet-500/30 border-violet-400 text-white'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {p > 0 ? `+${p}` : p}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeMode === 'robot' && (
        <div className="p-2.5 rounded-xl bg-[#080D1B]/85 border border-cyan-400/30 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Robot chastotasi</span>
            <span className="font-mono font-bold text-cyan-300">{robotPitchHz} Hz</span>
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
            className="w-full accent-cyan-400 cursor-pointer h-1.5"
          />
        </div>
      )}

      {activeMode === 'echo' && (
        <div className="p-2.5 rounded-xl bg-[#080D1B]/85 border border-amber-400/30 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Exo (Aks-sado kuchi)</span>
            <span className="font-mono font-bold text-amber-300">{echoMixPct}%</span>
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
            className="w-full accent-amber-400 cursor-pointer h-1.5"
          />
        </div>
      )}
    </div>
  );
};
