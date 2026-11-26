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
  Zap,
} from 'lucide-react';
import jackpotSlotCover from '../assets/images/jackpot_slot_cover_1795715449981.jpg';
import { apiFetch, formatCoins } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface JackpotSlotGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

const SYMBOLS = [
  { id: 'diamond', icon: '💎', label: 'Olmos', mult: 12 },
  { id: 'seven', icon: '7️⃣', label: 'Olovli 7', mult: 8 },
  { id: 'star', icon: '⭐', label: 'Yulduz', mult: 5 },
  { id: 'crown', icon: '👑', label: 'Toj', mult: 4 },
  { id: 'bolt', icon: '⚡', label: 'Chaqmoq', mult: 3 },
] as const;

const STAKES = [20, 50, 100, 250, 500];

export const JackpotSlotGame: React.FC<JackpotSlotGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [grid, setGrid] = useState<number[][]>([
    [0, 1, 2],
    [0, 0, 0],
    [2, 4, 3],
  ]);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [jackpotPool, setJackpotPool] = useState<number>(64_250_800);
  const [statusText, setStatusText] = useState<string>('Neon barabanlarni aylantiring — markaziy qatorda 3 bir xil belgi yutadi!');
  const [history, setHistory] = useState<string[]>(['💎💎💎', '⚡⚡', '7️⃣7️⃣7️⃣', '⭐⭐']);
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

  const randomRow = (): number[] => [
    Math.floor(Math.random() * SYMBOLS.length),
    Math.floor(Math.random() * SYMBOLS.length),
    Math.floor(Math.random() * SYMBOLS.length),
  ];

  const handleSpin = async () => {
    if (spinning) return;
    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    setSpinning(true);
    setStatusText('Barabanlar aylanmoqda...');
    setJackpotPool((p) => p + selectedStake * 6);

    let favored = false;
    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      favored = Boolean(luck?.favored);
    } catch {
      // ignore
    }

    for (let s = 0; s < 12; s++) {
      setGrid([randomRow(), randomRow(), randomRow()]);
      playTone(360 + s * 32, 0.045, 'triangle');
      await new Promise((r) => setTimeout(r, 70));
    }

    let centerRow: number[];
    if (favored) {
      centerRow = [0, 0, 0]; // Triple diamonds!
    } else {
      const r = Math.random();
      if (r < 0.08) {
        centerRow = [0, 0, 0];
      } else if (r < 0.25) {
        const pick = Math.floor(Math.random() * (SYMBOLS.length - 1)) + 1;
        centerRow = [pick, pick, pick];
      } else if (r < 0.56) {
        const a = Math.floor(Math.random() * SYMBOLS.length);
        const b = (a + 1 + Math.floor(Math.random() * 3)) % SYMBOLS.length;
        centerRow = [a, a, b];
      } else {
        centerRow = [0, 2, 4];
      }
    }

    setGrid([randomRow(), centerRow, randomRow()]);

    const [c0, c1, c2] = centerRow;
    const isTriple = c0 === c1 && c1 === c2;
    const isPair = !isTriple && (c0 === c1 || c1 === c2 || c0 === c2);

    let delta = -selectedStake;
    let outcomeText = 'Keyingi safar omad!';
    if (isTriple) {
      const sym = SYMBOLS[c0];
      delta = Math.min(2500, Math.round(selectedStake * sym.mult) - selectedStake);
      outcomeText = `${sym.icon}${sym.icon}${sym.icon} Jackpot Slot (+${delta} ball)`;
      setStatusText(`MEGA YUTUQ! ${sym.icon} ${sym.icon} ${sym.icon} (+${formatCoins(delta)} ball)!`);
      playTone(880, 0.16, 'sine');
      setTimeout(() => playTone(1174, 0.22, 'sine'), 110);
    } else if (isPair) {
      const idx = c0 === c1 ? c0 : c1 === c2 ? c1 : c0;
      const sym = SYMBOLS[idx];
      delta = Math.min(2500, Math.round(selectedStake * 1.8) - selectedStake);
      outcomeText = `Juftlik ${sym.icon}${sym.icon} (+${delta} ball)`;
      setStatusText(`Juftlik tushdi! ${sym.icon}${sym.icon} (+${formatCoins(delta)} ball)`);
      playTone(680, 0.13, 'sine');
    } else {
      setStatusText('Moslik tushmadi. Qayta aylantiring!');
      playTone(190, 0.18, 'sawtooth');
    }

    setLastDelta(delta);
    setHistory((prev) => [
      `${SYMBOLS[c0].icon}${SYMBOLS[c1].icon}${SYMBOLS[c2].icon}`,
      ...prev,
    ].slice(0, 6));

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'jackpot-slot',
          gameTitle: 'Jackpot slot',
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: outcomeText,
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
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-cyan-400/50 shadow-[0_24px_60px_rgba(0,0,0,0.8)] bg-[#0F082C] text-white select-none">
      {/* Neon Stage Artwork Background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={jackpotSlotCover}
          alt="Jackpot slot fon"
          className="w-full h-full object-cover object-top opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1E1054]/70 via-[#120938]/92 to-[#09051F]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#1C104F]/90 border border-cyan-400/55 shadow-lg">
          <Zap className="w-4 h-4 text-cyan-300 shrink-0" />
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#0F082C] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#1C104F]/90 border border-cyan-400/50 flex items-center justify-center text-cyan-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(
                  `⚡ Jackpot Slot o‘yinida ${lastDelta > 0 ? `+${lastDelta}` : ''} ball natija qayd etdi!`
                )
              }
              className="w-9 h-9 rounded-full bg-[#1C104F]/90 border border-cyan-400/50 flex items-center justify-center text-emerald-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#1C104F]/90 border border-cyan-400/50 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#1C104F]/90 hover:bg-rose-700 border border-cyan-400/50 flex items-center justify-center text-white"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Artwork + Title */}
      <div className="relative z-10 px-4 flex items-center gap-3">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-cyan-300/85 shadow-[0_0_24px_rgba(56,189,248,0.45)] shrink-0">
          <img src={jackpotSlotCover} alt="Jackpot slot" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-black tracking-wide uppercase leading-none">
            <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              JACKPOT{' '}
            </span>
            <span className="text-cyan-300">SLOT</span>
          </h2>
          <div className="mt-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/90 border border-amber-400/60">
            <Crown className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-mono text-xs font-black text-amber-200">
              {jackpotPool.toLocaleString('uz-UZ').replace(/,/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
            {history.map((h, i) => (
              <span
                key={`${h}-${i}`}
                className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[10px] shrink-0"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 3x3 Neon Slot Grid */}
      <div className="relative z-10 mx-3 sm:mx-5 my-2 p-3.5 rounded-2xl border-2 border-amber-400/75 bg-gradient-to-b from-[#1E1354]/95 via-[#120B38]/95 to-[#09051F]/95 shadow-[0_0_32px_rgba(56,189,248,0.28)] space-y-3">
        <div className="space-y-2">
          {grid.map((row, rIdx) => {
            const isPayline = rIdx === 1;
            return (
              <div
                key={rIdx}
                className={`grid grid-cols-3 gap-2 p-1.5 rounded-xl transition ${
                  isPayline
                    ? 'bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-amber-500/20 border-2 border-amber-300 shadow-[0_0_18px_rgba(250,204,21,0.4)]'
                    : 'opacity-55'
                }`}
              >
                {row.map((symIdx, cIdx) => (
                  <div
                    key={cIdx}
                    className={`h-16 sm:h-20 rounded-xl bg-[#0B0624] border border-cyan-400/35 flex items-center justify-center text-3xl sm:text-4xl ${
                      spinning ? 'scale-95' : 'scale-100'
                    } transition-transform`}
                  >
                    {SYMBOLS[symIdx].icon}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div className="text-center text-xs text-cyan-100 font-medium">{statusText}</div>
      </div>

      {/* Controls */}
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
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#0F082C] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#1C104F]/90 text-cyan-100 border-cyan-400/35 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#1C104F]/90 border border-cyan-400/35 text-xs">
            <span className="text-cyan-200/75">Natija: </span>
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
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 text-white font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(56,189,248,0.55)] hover:brightness-110 disabled:opacity-60 transition flex items-center justify-center gap-2 border border-cyan-200"
          >
            <Sparkles className="w-4 h-4" />
            <span>{spinning ? 'AYLANMOQDA...' : 'BARABANNI BOSISH'}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#170D45] border border-cyan-400/60 p-5 space-y-3 text-xs text-cyan-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Jackpot Slot qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              Markaziy yorug‘lik chizig‘ida 3 ta bir xil belgi tushsa ×12 gacha (💎💎💎), 2 ta bir xil belgi tushsa ×1.8 ball yutasiz.
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
