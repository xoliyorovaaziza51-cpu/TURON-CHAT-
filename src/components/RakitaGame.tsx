import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Flame,
  HelpCircle,
  Rocket,
  Share2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import rakitaCrashCover from '../assets/images/rakita_crash_cover_1795691342653.jpg';
import { apiFetch, formatCoins } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface RakitaGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

const STAKES = [20, 50, 100, 250, 500];

export const RakitaGame: React.FC<RakitaGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [phase, setPhase] = useState<'idle' | 'flying' | 'cashed' | 'crashed'>('idle');
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Raketani uchiring va portlashdan oldin ballni saqlang!');
  const [history, setHistory] = useState<number[]>([2.45, 1.38, 5.12, 1.84, 3.6]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);

  const crashPointRef = useRef<number>(2.5);
  const timerRef = useRef<number | null>(null);
  const multRef = useRef<number>(1.0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq: number, dur = 0.1, type: OscillatorType = 'sine') => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        // ignore
      }
    },
    [soundEnabled]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const recordOutcome = async (deltaPoints: number, outcome: string, isWin: boolean) => {
    setLastDelta(deltaPoints);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'raketa-toqnashuvi',
          gameTitle: "Rakita to'qnashuvi",
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, deltaPoints)),
          outcome,
          isWin,
        }),
      });
      onUserUpdated(res.user);
    } catch {
      // ignore
    }
  };

  const handleLaunch = async () => {
    if (phase === 'flying') return;
    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    if (timerRef.current) window.clearInterval(timerRef.current);
    // Weighted crash threshold between 1.2x and 6.5x
    const r = Math.random();
    crashPointRef.current =
      r < 0.25 ? 1.2 + Math.random() * 0.6 : r < 0.78 ? 1.8 + Math.random() * 2.2 : 3.8 + Math.random() * 3.0;

    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      if (luck?.favored) {
        crashPointRef.current = 5.5 + Math.random() * 3.5;
      }
    } catch {
      // ignore
    }

    multRef.current = 1.0;
    setMultiplier(1.0);
    setPhase('flying');
    setStatusText('Raketa parvozda! Vaqtida saqlab qoling...');
    playTone(360, 0.14, 'triangle');

    timerRef.current = window.setInterval(() => {
      const next = Number((multRef.current + 0.05 + multRef.current * 0.015).toFixed(2));
      multRef.current = next;
      setMultiplier(next);

      if (next >= crashPointRef.current) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        setPhase('crashed');
        playTone(140, 0.24, 'sawtooth');
        setHistory((prev) => [next, ...prev].slice(0, 6));
        setStatusText(`To‘qnashuv! Raketa ${next.toFixed(2)}× da portladi (-${selectedStake} ball).`);
        void recordOutcome(-selectedStake, `Raketa ${next.toFixed(2)}× da to‘qnashdi`, false);
      }
    }, 100);
  };

  const handleCashOut = () => {
    if (phase !== 'flying') return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const locked = multRef.current;
    const profit = Math.min(2500, Math.max(10, Math.round(selectedStake * locked) - selectedStake));
    setPhase('cashed');
    playTone(880, 0.15, 'sine');
    setTimeout(() => playTone(1180, 0.2, 'sine'), 100);
    setHistory((prev) => [locked, ...prev].slice(0, 6));
    setStatusText(`Ajoyib parvoz! ${locked.toFixed(2)}× da saqlandi (+${formatCoins(profit)} ball)!`);
    void recordOutcome(profit, `Raketa ${locked.toFixed(2)}× da qo‘ndi (+${profit} ball)`, true);
  };

  const handleRefill = async () => {
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/refill', { method: 'POST' });
      onUserUpdated(res.user);
      setStatusText('+1 500 bepul ball qo‘shildi!');
    } catch {
      // ignore
    }
  };

  const progress = Math.min(1, (multiplier - 1) / 4);
  const rocketX = 16 + progress * 66;
  const rocketY = 76 - progress * 54;

  return (
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-amber-400/45 shadow-[0_24px_60px_rgba(0,0,0,0.75)] bg-[#090F2E] text-white select-none">
      {/* Cosmic Space Artwork Background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={rakitaCrashCover}
          alt="Rakita to'qnashuvi fon"
          className="w-full h-full object-cover object-center opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C174A]/70 via-[#080F33]/90 to-[#060B24]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#111D54]/90 border border-amber-400/50 shadow-lg">
          <Rocket className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#090F2E] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#111D54]/90 border border-cyan-300/40 flex items-center justify-center text-cyan-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(
                  `🚀 Rakita to'qnashuvida ${multiplier.toFixed(2)}× parvoz natijasi qayd etdi!`
                )
              }
              className="w-9 h-9 rounded-full bg-[#111D54]/90 border border-cyan-300/40 flex items-center justify-center text-emerald-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#111D54]/90 border border-cyan-300/40 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#111D54]/90 hover:bg-rose-600 border border-cyan-300/40 flex items-center justify-center text-white"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Artwork + Title Banner */}
      <div className="relative z-10 px-4 flex items-center gap-3">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-[0_0_24px_rgba(56,189,248,0.45)] shrink-0">
          <img src={rakitaCrashCover} alt="Rakita to'qnashuvi" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-black tracking-wide uppercase leading-none">
            <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              RAKITA{' '}
            </span>
            <span className="text-cyan-200">TO‘QNASHUVI</span>
          </h2>
          <p className="text-xs text-cyan-100/80 mt-1">
            Koinot parvozi · Turbulentlikdan oldin ballni saqlang
          </p>
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
            {history.map((h, i) => (
              <span
                key={`${h}-${i}`}
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border shrink-0 ${
                  h >= 2.5
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                }`}
              >
                {h.toFixed(2)}×
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Space Flight Stage */}
      <div className="relative z-10 mx-3 sm:mx-5 mt-3 h-48 sm:h-52 rounded-2xl overflow-hidden border-2 border-cyan-400/50 bg-gradient-to-br from-[#0B184B] via-[#131C5E] to-[#1E1448]">
        {/* Glowing Earth & Moon Orbs */}
        <div className="pointer-events-none absolute -left-8 -top-8 w-28 h-28 rounded-full bg-cyan-400/20 blur-md border border-cyan-300/30" />
        <div className="pointer-events-none absolute right-6 top-5 w-14 h-14 rounded-full bg-purple-400/20 border border-purple-300/25" />

        {/* Trajectory Arc SVG */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          <path
            d={`M 14 82 Q 48 68 ${rocketX} ${rocketY}`}
            fill="none"
            stroke={phase === 'crashed' ? '#F43F5E' : '#FACC15'}
            strokeWidth="1.6"
            strokeDasharray={phase === 'flying' ? 'none' : '3 2'}
          />
        </svg>

        {/* Live Multiplier Center */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center pointer-events-none">
          <div
            className={`font-mono tabular-nums text-4xl sm:text-5xl font-black drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)] ${
              phase === 'crashed'
                ? 'text-rose-400'
                : phase === 'cashed'
                ? 'text-emerald-300'
                : 'text-amber-300'
            }`}
          >
            {multiplier.toFixed(2)}×
          </div>
          <div className="text-[11px] font-semibold text-cyan-100/90 mt-1 px-3 py-0.5 rounded-full bg-black/40 border border-white/15">
            {phase === 'flying'
              ? `Hozirgi yutuq: +${Math.round(selectedStake * multiplier - selectedStake)} ball`
              : statusText}
          </div>
        </div>

        {/* Rocket Sprite */}
        <div
          style={{ left: `${rocketX}%`, top: `${rocketY}%`, transform: 'translate(-50%, -50%)' }}
          className="pointer-events-none absolute z-20 transition-all duration-100"
        >
          {phase === 'crashed' ? (
            <div className="w-11 h-11 rounded-full bg-rose-500/40 border-2 border-rose-300 flex items-center justify-center animate-ping">
              <Flame className="w-6 h-6 text-amber-300" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 border-2 border-white shadow-[0_0_20px_rgba(250,204,21,0.9)] flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white -rotate-12" />
            </div>
          )}
        </div>
      </div>

      {/* Controls & Action Button */}
      <div className="relative z-10 px-3 sm:px-5 pt-3 pb-4 space-y-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          {STAKES.map((stake) => (
            <button
              key={stake}
              type="button"
              disabled={phase === 'flying'}
              onClick={() => setSelectedStake(stake)}
              className={`py-2 rounded-xl font-mono text-xs font-black border transition ${
                selectedStake === stake
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#090F2E] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#111D54]/90 text-cyan-100 border-cyan-400/30 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#111D54]/90 border border-cyan-400/30 text-xs">
            <span className="text-cyan-200/75">Natija: </span>
            <span
              className={`font-mono font-black ${
                lastDelta > 0 ? 'text-emerald-300' : lastDelta < 0 ? 'text-rose-300' : 'text-amber-200'
              }`}
            >
              {lastDelta > 0 ? `+${lastDelta}` : lastDelta} ball
            </span>
          </div>

          {phase === 'flying' ? (
            <button
              type="button"
              onClick={handleCashOut}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-[#052e16] font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(52,211,153,0.7)] hover:brightness-105 transition flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>BALLNI SAQLASH ({Math.round(selectedStake * multiplier)})</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLaunch}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 text-white font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(245,158,11,0.65)] hover:brightness-105 transition flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              <span>RAKETANI UCHIRISH</span>
            </button>
          )}
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0D184A] border border-cyan-400/60 p-5 space-y-3 text-xs text-cyan-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Rakita to'qnashuvi qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              Ball miqdorini tanlab <strong>RAKETANI UCHIRISH</strong> tugmasini bosing. Ko‘paytirgich o‘sib borgan sari raketa portlashidan oldin <strong>BALLNI SAQLASH</strong> tugmasini bosishga ulguring!
            </p>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 flex items-center gap-2 text-emerald-200">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Faqat bepul o‘yin ballari ishlatiladi, haqiqiy pul tikish yo‘q.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
