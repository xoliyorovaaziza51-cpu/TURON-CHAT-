import React, { useCallback, useRef, useState } from 'react';
import {
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

interface OmadliMevaGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

const FRUITS = [
  { id: 'olma', name: 'Olma', emoji: '🍎', mult: 3, grad: 'from-rose-500/35 to-red-950/80 border-rose-400/50' },
  { id: 'tarvuz', name: 'Tarvuz', emoji: '🍉', mult: 5, grad: 'from-emerald-500/35 to-green-950/80 border-emerald-400/50' },
  { id: 'gilos', name: 'Gilos', emoji: '🍒', mult: 8, grad: 'from-pink-500/35 to-rose-950/80 border-pink-400/50' },
  { id: 'ananas', name: 'Ananas', emoji: '🍍', mult: 10, grad: 'from-amber-400/40 to-yellow-950/80 border-amber-300/60' },
  { id: 'uzum', name: 'Uzum', emoji: '🍇', mult: 5, grad: 'from-purple-500/35 to-indigo-950/80 border-purple-400/50' },
  { id: 'limon', name: 'Limon', emoji: '🍋', mult: 3, grad: 'from-lime-400/35 to-emerald-950/80 border-lime-400/50' },
] as const;

const STAKES = [20, 50, 100, 250, 500];

export const OmadliMevaGame: React.FC<OmadliMevaGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [selectedFruitId, setSelectedFruitId] = useState<string>('tarvuz');
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Sevimli mevangizni tanlang va BOSHLASH tugmasini bosing!');
  const [history, setHistory] = useState<string[]>(['🍉', '🍍', '🍒', '🍎', '🍇']);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq: number, dur = 0.08, type: OscillatorType = 'triangle') => {
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

  const handlePlay = async () => {
    if (busy) return;
    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    setBusy(true);
    setWinnerId(null);
    setStatusText('Mevalar aylanmoqda...');

    let chosenIdx = Math.floor(Math.random() * FRUITS.length);
    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      if (luck?.favored) {
        const favoredIdx = FRUITS.findIndex((f) => f.id === selectedFruitId);
        if (favoredIdx >= 0) chosenIdx = favoredIdx;
      }
    } catch {
      // ignore
    }

    const totalSteps = 12 + chosenIdx;
    for (let s = 0; s <= totalSteps; s++) {
      const fruit = FRUITS[s % FRUITS.length];
      setHighlightId(fruit.id);
      playTone(340 + (s % 6) * 45, 0.05, 'sine');
      await new Promise((r) => setTimeout(r, 65 + s * 6));
    }

    const winFruit = FRUITS[chosenIdx];
    setHighlightId(null);
    setWinnerId(winFruit.id);

    const isWin = winFruit.id === selectedFruitId;
    const delta = isWin ? Math.min(2500, selectedStake * winFruit.mult - selectedStake) : -selectedStake;
    setLastDelta(delta);
    setHistory((prev) => [winFruit.emoji, ...prev].slice(0, 7));

    if (isWin) {
      playTone(880, 0.16, 'sine');
      setTimeout(() => playTone(1174, 0.2, 'sine'), 110);
      setStatusText(`Ajoyib! ${winFruit.emoji} ${winFruit.name} (×${winFruit.mult}) +${formatCoins(delta)} ball!`);
    } else {
      playTone(210, 0.18, 'sawtooth');
      setStatusText(`Bu turda ${winFruit.emoji} ${winFruit.name} tushdi. Yana urinib ko‘ring!`);
    }

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'omadli-meva',
          gameTitle: 'Omadli meva',
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: isWin ? `${winFruit.name} ×${winFruit.mult} (+${delta} ball)` : `${winFruit.name} chiqdi`,
          isWin,
        }),
      });
      onUserUpdated(res.user);
    } catch {
      // ignore
    } finally {
      setBusy(false);
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
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-emerald-400/45 shadow-[0_24px_60px_rgba(0,0,0,0.75)] bg-[#062216] text-white select-none">
      {/* Lush Orchard & Golden Clover Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/assets/aistudio/file_00000000f39082109b92e8d5aebfe53d_e1ad4132.png"
          alt="Omadli meva fon"
          className="w-full h-full object-cover object-center opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0C3823]/75 via-[#072417]/92 to-[#04140D]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#0A3120]/90 border border-emerald-400/50 shadow-lg">
          <span className="text-sm">🍉</span>
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#062216] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#0A3120]/90 border border-emerald-400/45 flex items-center justify-center text-emerald-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(
                  `🍉 Omadli meva o‘yinida ${lastDelta > 0 ? `+${lastDelta}` : ''} ball natija qayd etdi!`
                )
              }
              className="w-9 h-9 rounded-full bg-[#0A3120]/90 border border-emerald-400/45 flex items-center justify-center text-amber-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#0A3120]/90 border border-emerald-400/45 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#0A3120]/90 hover:bg-rose-700 border border-emerald-400/45 flex items-center justify-center text-white"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title & History */}
      <div className="relative z-10 px-4 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-black tracking-wide uppercase leading-none">
          <span className="text-emerald-300">OMADLI </span>
          <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            MEVA
          </span>
        </h2>
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {history.map((em, i) => (
            <span
              key={`${em}-${i}`}
              className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm"
            >
              {em}
            </span>
          ))}
        </div>
      </div>

      {/* 6 Fruit Grid */}
      <div className="relative z-10 mx-3 sm:mx-5 my-2 p-2.5 rounded-2xl bg-[#072619]/90 border-2 border-emerald-400/50">
        <div className="grid grid-cols-3 gap-2.5">
          {FRUITS.map((fruit) => {
            const isSelected = selectedFruitId === fruit.id;
            const isGlow = highlightId === fruit.id;
            const isWin = winnerId === fruit.id;
            return (
              <button
                key={fruit.id}
                type="button"
                disabled={busy}
                onClick={() => setSelectedFruitId(fruit.id)}
                className={`aspect-square rounded-2xl border-2 p-2 flex flex-col items-center justify-center gap-1 bg-gradient-to-b ${fruit.grad} transition-all ${
                  isWin
                    ? 'border-yellow-200 scale-105 ring-2 ring-amber-300 shadow-[0_0_24px_rgba(250,204,21,0.9)]'
                    : isGlow
                    ? 'border-amber-300 scale-105 shadow-[0_0_16px_rgba(250,204,21,0.7)]'
                    : isSelected
                    ? 'border-emerald-300 ring-2 ring-emerald-300'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <span className="text-3xl sm:text-4xl drop-shadow">{fruit.emoji}</span>
                <span className="text-xs font-bold text-white">{fruit.name}</span>
                <span className="font-mono text-[11px] font-black text-amber-300">×{fruit.mult}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2.5 text-center text-xs text-emerald-100 font-medium">{statusText}</div>
      </div>

      {/* Controls */}
      <div className="relative z-10 px-3 sm:px-5 pt-2 pb-4 space-y-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          {STAKES.map((stake) => (
            <button
              key={stake}
              type="button"
              disabled={busy}
              onClick={() => setSelectedStake(stake)}
              className={`py-2 rounded-xl font-mono text-xs font-black border transition ${
                selectedStake === stake
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#062216] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#0A3120]/90 text-emerald-100 border-emerald-400/35 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#0A3120]/90 border border-emerald-400/35 text-xs">
            <span className="text-emerald-200/75">Natija: </span>
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
            disabled={busy}
            onClick={handlePlay}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-400 text-[#062216] font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(52,211,153,0.6)] hover:brightness-105 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{busy ? 'TANLANMOQDA...' : 'BOSHLASH'}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#092C1C] border border-emerald-400/60 p-5 space-y-3 text-xs text-emerald-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Omadli meva qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              6 ta mevadan birini tanlang va <strong>BOSHLASH</strong> tugmasini bosing. Agar nur siz tanlagan mevada to‘xtasa, ×3 dan ×10 gacha ball yutasiz.
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
