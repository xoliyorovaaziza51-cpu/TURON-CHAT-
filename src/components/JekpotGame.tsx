import React, { useCallback, useRef, useState } from 'react';
import {
  Crown,
  HelpCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface JekpotGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

const REEL_SYMBOLS = [
  { id: '7', label: '7', mult: 10, color: 'text-red-500' },
  { id: 'crown', label: '👑', mult: 6, color: 'text-amber-400' },
  { id: 'diamond', label: '💎', mult: 5, color: 'text-rose-400' },
  { id: 'lion', label: '🦁', mult: 4, color: 'text-amber-300' },
  { id: 'coin', label: '🪙', mult: 3, color: 'text-yellow-300' },
  { id: 'star', label: '⭐', mult: 2.5, color: 'text-yellow-200' },
] as const;

const STAKES = [20, 50, 100, 250, 500];

export const JekpotGame: React.FC<JekpotGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [reels, setReels] = useState<number[]>([0, 0, 0]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [jackpotPool, setJackpotPool] = useState<number>(48_777_320);
  const [statusText, setStatusText] = useState<string>('777 barabanini aylantiring va shohona jekpotni yuting!');
  const [history, setHistory] = useState<string[]>(['7-7-7', '👑-👑', '💎-💎-💎', '7-👑-7']);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq: number, dur = 0.09, type: OscillatorType = 'triangle') => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
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

  const handleSpin = async () => {
    if (spinning) return;
    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    setSpinning(true);
    setStatusText('Barabanlar aylanmoqda...');
    setJackpotPool((p) => p + Math.floor(selectedStake * 5));

    let favored = false;
    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      favored = Boolean(luck?.favored);
    } catch {
      // ignore
    }

    // Visual reel spinning
    for (let step = 0; step < 12; step++) {
      setReels([
        Math.floor(Math.random() * REEL_SYMBOLS.length),
        Math.floor(Math.random() * REEL_SYMBOLS.length),
        Math.floor(Math.random() * REEL_SYMBOLS.length),
      ]);
      playTone(320 + step * 35, 0.05, 'triangle');
      await new Promise((r) => setTimeout(r, 75));
    }

    let finalReels: number[];
    if (favored) {
      finalReels = [0, 0, 0]; // Triple 777
    } else {
      const r = Math.random();
      if (r < 0.08) {
        finalReels = [0, 0, 0]; // 777
      } else if (r < 0.24) {
        const s = Math.floor(Math.random() * (REEL_SYMBOLS.length - 1)) + 1;
        finalReels = [s, s, s]; // Triple match
      } else if (r < 0.56) {
        const a = Math.floor(Math.random() * REEL_SYMBOLS.length);
        const b = (a + 1 + Math.floor(Math.random() * 4)) % REEL_SYMBOLS.length;
        finalReels = [a, a, b]; // Pair match
      } else {
        finalReels = [
          Math.floor(Math.random() * REEL_SYMBOLS.length),
          Math.floor(Math.random() * REEL_SYMBOLS.length),
          Math.floor(Math.random() * REEL_SYMBOLS.length),
        ];
        if (finalReels[0] === finalReels[1] || finalReels[1] === finalReels[2] || finalReels[0] === finalReels[2]) {
          finalReels = [0, 2, 4];
        }
      }
    }

    setReels(finalReels);

    const [a, b, c] = finalReels;
    const isTriple = a === b && b === c;
    const isPair = !isTriple && (a === b || b === c || a === c);

    let delta = -selectedStake;
    let outcomeLabel = 'Keyingi safar omad!';
    if (isTriple) {
      const sym = REEL_SYMBOLS[a];
      delta = Math.min(2500, Math.round(selectedStake * sym.mult) - selectedStake);
      outcomeLabel = `${sym.label}${sym.label}${sym.label} Jekpot (+${delta} ball)`;
      setStatusText(`SHOHONA JEKPOT! ${sym.label} ${sym.label} ${sym.label} (+${formatCoins(delta)} ball)!`);
      playTone(880, 0.16, 'sine');
      setTimeout(() => playTone(1174, 0.24, 'sine'), 120);
    } else if (isPair) {
      const matchIdx = a === b ? a : b === c ? b : a;
      const sym = REEL_SYMBOLS[matchIdx];
      delta = Math.min(2500, Math.round(selectedStake * 1.8) - selectedStake);
      outcomeLabel = `Juftlik ${sym.label}${sym.label} (+${delta} ball)`;
      setStatusText(`Juftlik tushdi! ${sym.label} ${sym.label} (+${formatCoins(delta)} ball)`);
      playTone(680, 0.14, 'sine');
    } else {
      setStatusText('Moslik tushmadi. Yana aylantiring!');
      playTone(190, 0.18, 'sawtooth');
    }

    setLastDelta(delta);
    setHistory((prev) => [
      `${REEL_SYMBOLS[a].label}-${REEL_SYMBOLS[b].label}-${REEL_SYMBOLS[c].label}`,
      ...prev,
    ].slice(0, 6));

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'jekpot',
          gameTitle: 'Jekpot',
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: outcomeLabel,
          isWin: delta > 0,
        }),
      });
      onUserUpdated(res.user);
    } catch {
      // ignore
    } finally {
      setSpinning(false);
    }
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

  return (
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-amber-400/55 shadow-[0_24px_60px_rgba(0,0,0,0.8)] bg-[#140304] text-white select-none">
      {/* Uploaded Jekpot 777 Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/assets/aistudio/file_0000000007b48210b5473bdba86348d0_d64f9726.png"
          alt="Jekpot fon"
          className="w-full h-full object-cover object-top opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2A0507]/70 via-[#180405]/92 to-[#0E0203]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#2E080A]/90 border border-amber-400/60 shadow-lg">
          <Crown className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#140304] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#2E080A]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(
                  `👑 Jekpot 777 o‘yinida ${lastDelta > 0 ? `+${lastDelta}` : ''} ball natija qayd etdi!`
                )
              }
              className="w-9 h-9 rounded-full bg-[#2E080A]/90 border border-amber-400/50 flex items-center justify-center text-emerald-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#2E080A]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#2E080A]/90 hover:bg-rose-700 border border-amber-400/50 flex items-center justify-center text-white"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Artwork + Jackpot Pool */}
      <div className="relative z-10 px-4 flex items-center gap-3">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/90 shadow-[0_0_26px_rgba(245,158,11,0.5)] shrink-0">
          <img
            src="/assets/aistudio/file_0000000007b48210b5473bdba86348d0_d64f9726.png"
            alt="Jekpot 777"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-wide uppercase leading-none">
            <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              JEKPOT 777
            </span>
          </h2>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-900/90 to-amber-900/80 border border-amber-400/60">
            <span className="text-[10px] font-bold text-amber-300 uppercase">JACKPOT</span>
            <span className="font-mono text-xs sm:text-sm font-black text-amber-100">
              {jackpotPool.toLocaleString('uz-UZ').replace(/,/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
            {history.map((h, i) => (
              <span
                key={`${h}-${i}`}
                className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 font-mono text-[10px] text-amber-200 shrink-0"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3x Royal 777 Slot Machine Stage */}
      <div className="relative z-10 mx-3 sm:mx-5 my-2 p-4 rounded-2xl border-2 border-amber-400/75 bg-gradient-to-b from-[#3B0A0D]/95 via-[#210506]/95 to-[#140304]/95 shadow-[0_0_32px_rgba(245,158,11,0.3)] space-y-4">
        <div className="grid grid-cols-3 gap-2.5">
          {reels.map((symIdx, idx) => {
            const sym = REEL_SYMBOLS[symIdx];
            return (
              <div
                key={idx}
                className={`h-28 sm:h-32 rounded-2xl bg-gradient-to-b from-slate-100 via-white to-slate-200 border-4 border-amber-400 shadow-[inset_0_4px_14px_rgba(0,0,0,0.35)] flex flex-col items-center justify-center transition-transform ${
                  spinning ? 'scale-95' : 'scale-100'
                }`}
              >
                <span
                  className={`font-display text-5xl sm:text-6xl font-black drop-shadow ${sym.color}`}
                >
                  {sym.label}
                </span>
                <span className="text-[10px] font-mono font-black text-amber-800 mt-1">
                  ×{sym.mult}
                </span>
              </div>
            );
          })}
        </div>

        {/* Payout Legend */}
        <div className="flex items-center justify-center gap-2 flex-wrap text-[10px] text-amber-200/85">
          <span className="px-2 py-0.5 rounded-full bg-red-600/30 border border-red-400/40 font-bold">
            777 → ×10
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 font-bold">
            👑👑👑 → ×6
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 font-bold">
            💎💎💎 → ×5
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
            Juftlik → ×1.8
          </span>
        </div>

        <div className="text-center text-xs text-amber-100 font-medium">{statusText}</div>
      </div>

      {/* Stake & Spin Controls */}
      <div className="relative z-10 px-3 sm:px-5 pt-2 pb-4 space-y-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          {STAKES.map((stake) => (
            <button
              key={stake}
              type="button"
              disabled={spinning}
              onClick={() => setSelectedStake(stake)}
              className={`py-2 rounded-xl font-mono text-xs font-black border transition ${
                selectedStake === stake
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#140304] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#2E080A]/90 text-amber-100 border-amber-400/35 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#2E080A]/90 border border-amber-400/35 text-xs">
            <span className="text-amber-200/75">Natija: </span>
            <span
              className={`font-mono font-black ${
                lastDelta > 0 ? 'text-emerald-300' : lastDelta < 0 ? 'text-rose-300' : 'text-amber-200'
              }`}
            >
              {lastDelta > 0 ? `+${lastDelta}` : lastDelta} ball
            </span>
          </div>

          <button
            type="button"
            disabled={spinning}
            onClick={handleSpin}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-red-600 text-white font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(245,158,11,0.65)] hover:brightness-105 disabled:opacity-60 transition flex items-center justify-center gap-2 border border-amber-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>{spinning ? 'AYLANMOQDA...' : 'AYLANTIRISH (777)'}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#240709] border border-amber-400/60 p-5 space-y-3 text-xs text-amber-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Jekpot 777 qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              Ball miqdorini tanlab <strong>AYLANTIRISH</strong> tugmasini bosing. Uchta bir xil belgi (masalan 7-7-7) ×10 gacha, ikkita bir xil belgi esa ×1.8 yutuq beradi.
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
