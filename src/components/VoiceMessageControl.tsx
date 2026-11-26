import React, { useEffect, useRef, useState } from 'react';
import { Mic, Pause, Play, Send, Square, Trash2 } from 'lucide-react';
import {
  DEFAULT_VOICE_AUDIO_SETTINGS,
  VoiceEffectProcessor,
  getVoiceEffectShortLabel,
} from '../lib/voiceEffects';
import type { VoiceAudioSettings, VoiceEffectMode } from '../types/turon';

const MAX_VOICE_SECONDS = 15;

export function formatVoiceDuration(sec: number): string {
  const s = Math.max(0, Math.min(MAX_VOICE_SECONDS, Math.round(sec)));
  return `0:${String(s).padStart(2, '0')}`;
}

interface VoiceRecorderButtonProps {
  disabled?: boolean;
  compact?: boolean;
  voiceEffectMode?: VoiceEffectMode;
  voiceSettings?: VoiceAudioSettings;
  onRecorded: (payload: { audioUrl: string; durationSec: number }) => Promise<void> | void;
  onError?: (message: string) => void;
}

export const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  disabled = false,
  compact = false,
  voiceEffectMode = 'normal',
  voiceSettings = DEFAULT_VOICE_AUDIO_SETTINGS,
  onRecorded,
  onError,
}) => {
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [busySending, setBusySending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<VoiceEffectProcessor | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startMsRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, []);

  function cleanupStream() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.dispose();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }

  async function startRecording() {
    if (disabled || recording || busySending) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onError?.('Qurilmangizda ovoz yozish qo‘llab-quvvatlanmaydi');
      return;
    }

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: voiceSettings.noiseSuppression !== 'off',
          autoGainControl: voiceSettings.noiseSuppression !== 'off',
        },
      });
      streamRef.current = rawStream;
      chunksRef.current = [];
      cancelledRef.current = false;

      let recordStream = rawStream;
      if (voiceEffectMode !== 'normal' || voiceSettings.gain !== 1.0) {
        const proc = new VoiceEffectProcessor();
        proc.setMonitorEnabled(false);
        proc.setAudioSettings(voiceSettings);
        proc.setMode(voiceEffectMode);
        recordStream = await proc.init(rawStream);
        processorRef.current = proc;
      }

      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      const supportedType = preferredTypes.find((t) =>
        MediaRecorder.isTypeSupported ? MediaRecorder.isTypeSupported(t) : false
      );

      const recorder = supportedType
        ? new MediaRecorder(recordStream, { mimeType: supportedType, audioBitsPerSecond: 32000 })
        : new MediaRecorder(recordStream);

      mediaRecorderRef.current = recorder;
      startMsRef.current = Date.now();
      setElapsedSec(0);
      setRecording(true);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const wasCancelled = cancelledRef.current;
        const durationSec = Math.max(
          1,
          Math.min(MAX_VOICE_SECONDS, Math.round((Date.now() - startMsRef.current) / 1000))
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        cleanupStream();
        setRecording(false);
        setElapsedSec(0);

        if (wasCancelled || blob.size === 0) return;

        setBusySending(true);
        try {
          const audioUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Ovoz faylini o‘qib bo‘lmadi'));
            reader.readAsDataURL(blob);
          });
          await onRecorded({ audioUrl, durationSec });
        } catch (err: any) {
          onError?.(err?.message || 'Ovozli xabarni yuborib bo‘lmadi');
        } finally {
          setBusySending(false);
        }
      };

      recorder.start(250);

      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startMsRef.current) / 1000);
        setElapsedSec(Math.min(MAX_VOICE_SECONDS, sec));
        if (sec >= MAX_VOICE_SECONDS) {
          stopAndSend();
        }
      }, 200);
    } catch (err: any) {
      cleanupStream();
      setRecording(false);
      onError?.(
        err?.message || 'Mikrofonga ruxsat berilmadi. Brauzer ruxsatini yoqing.'
      );
    }
  }

  function stopAndSend() {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    }
  }

  function cancelRecording() {
    cancelledRef.current = true;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      rec.stop();
    } else {
      cleanupStream();
      setRecording(false);
      setElapsedSec(0);
    }
  }

  if (recording) {
    const pct = Math.min(100, Math.round((elapsedSec / MAX_VOICE_SECONDS) * 100));
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-rose-950/85 border border-rose-400/50 text-white shadow-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
        <div className="flex flex-col min-w-[78px]">
          <span className="font-mono tabular-nums text-[11px] font-bold leading-none flex items-center gap-1.5">
            <span>{formatVoiceDuration(elapsedSec)} / 0:15</span>
            {voiceEffectMode !== 'normal' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-sans">
                {getVoiceEffectShortLabel(voiceEffectMode)}
              </span>
            )}
          </span>
          <div className="mt-1 h-1 w-full rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-rose-400 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={cancelRecording}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200"
          title="Bekor qilish"
          aria-label="Ovoz yozishni bekor qilish"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={stopAndSend}
          className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#05101F] flex items-center justify-center font-bold"
          title="Yuborish"
          aria-label="Ovozli xabarni yuborish"
        >
          {compact ? <Square className="w-3.5 h-3.5 fill-current" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || busySending}
      onClick={startRecording}
      className={`${
        compact ? 'min-h-[40px] min-w-[40px]' : 'min-h-[44px] min-w-[44px]'
      } rounded-full bg-[#091022]/90 hover:bg-rose-600/30 border border-white/15 hover:border-rose-400/60 text-slate-200 hover:text-rose-200 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0`}
      title="15 soniyalik ovozli xabar yozish"
      aria-label="15 soniyalik ovozli xabar yozish"
    >
      <Mic className="w-4 h-4" />
    </button>
  );
};

interface VoiceMessagePlayerProps {
  audioUrl: string;
  durationSec?: number;
  tone?: 'dark' | 'blue';
}

const WAVE_BARS = [40, 75, 55, 95, 65, 85, 48, 90, 60, 78, 52, 84, 62, 46];

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  durationSec = 0,
  tone = 'dark',
}) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [totalSec, setTotalSec] = useState(durationSec || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  function ensureAudio(): HTMLAudioElement {
    if (!audioRef.current) {
      const el = new Audio(audioUrl);
      el.onloadedmetadata = () => {
        if (Number.isFinite(el.duration) && el.duration > 0) {
          setTotalSec(Math.max(1, Math.round(el.duration)));
        }
      };
      el.ontimeupdate = () => {
        const dur = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : totalSec || 1;
        setCurrentSec(Math.round(el.currentTime));
        setProgress(Math.min(100, (el.currentTime / dur) * 100));
      };
      el.onended = () => {
        setPlaying(false);
        setProgress(0);
        setCurrentSec(0);
      };
      el.onerror = () => {
        setPlaying(false);
      };
      audioRef.current = el;
    }
    return audioRef.current;
  }

  function togglePlay() {
    const el = ensureAudio();
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  }

  const displaySec = playing ? currentSec : totalSec || durationSec || 1;

  return (
    <div
      className={`inline-flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl min-w-[185px] max-w-full ${
        tone === 'blue'
          ? 'bg-black/20 border border-white/15'
          : 'bg-[#080B14]/70 border border-white/10'
      }`}
    >
      <button
        type="button"
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
          tone === 'blue'
            ? 'bg-white text-blue-700'
            : 'bg-gradient-to-br from-amber-400 to-orange-500 text-[#1A0800]'
        }`}
        aria-label={playing ? 'Pauza' : 'Ovozli xabarni tinglash'}
      >
        {playing ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-[3px] h-6 min-w-[76px]">
        {WAVE_BARS.map((h, idx) => {
          const barPct = ((idx + 1) / WAVE_BARS.length) * 100;
          const active = progress >= barPct;
          return (
            <span
              key={idx}
              className={`flex-1 rounded-full transition-colors ${
                active
                  ? tone === 'blue'
                    ? 'bg-white'
                    : 'bg-amber-300'
                  : 'bg-white/30'
              }`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>

      <span className="font-mono tabular-nums text-[11px] font-semibold text-slate-200 shrink-0">
        {formatVoiceDuration(displaySec)}
      </span>
    </div>
  );
};
