import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Gift,
  HelpCircle,
  Hourglass,
  RotateCcw,
  Share2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Wand2,
  Rocket,
  Search,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface OchkuzSandiqGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

interface ChestConfig {
  id: number;
  title: string;
  theme: 'blue' | 'red' | 'purple' | 'green' | 'gold';
  multiplier: number;
  hasCrown?: boolean;
  crowdTag: string;
  weight: number;
}

const CHESTS: ChestConfig[] = [
  { id: 0, title: 'Ko‘k Olmos Sandiq', theme: 'blue', multiplier: 5, crowdTag: '250K', weight: 20 },
  { id: 1, title: 'Qizil Toj Sandiq', theme: 'red', multiplier: 20, hasCrown: true, crowdTag: '130K', weight: 6 },
  { id: 2, title: 'Binafsha Ametist', theme: 'purple', multiplier: 25, crowdTag: '230K', weight: 4 },
  { id: 3, title: 'Binafsha Sandiq', theme: 'purple', multiplier: 5, crowdTag: '250K', weight: 18 },
  { id: 4, title: 'Shohona Oltin Toj', theme: 'gold', multiplier: 35, hasCrown: true, crowdTag: 'JACKPOT', weight: 3 },
  { id: 5, title: 'Yashil Zumrad Sandiq', theme: 'green', multiplier: 15, crowdTag: '250K', weight: 8 },
  { id: 6, title: 'Yashil Omad Sandiq', theme: 'green', multiplier: 5, crowdTag: '250K', weight: 17 },
  { id: 7, title: 'Moviy Samoviy Sandiq', theme: 'blue', multiplier: 5, crowdTag: '250K', weight: 15 },
  { id: 8, title: 'Qizil Shohona Sandiq', theme: 'red', multiplier: 10, hasCrown: true, crowdTag: '530K', weight: 9 },
];

const CHIP_TIERS = [
  { stake: 10, label: '10', sub: '10K', icon: 'glass' as const, ring: 'border-amber-200 bg-gradient-to-b from-amber-300/35 to-amber-900/70' },
  { stake: 25, label: '25', sub: '50K', icon: 'glass' as const, ring: 'border-rose-300/60 bg-gradient-to-b from-rose-500/25 to-slate-900/80' },
  { stake: 50, label: '50', sub: '100K', icon: 'glass' as const, ring: 'border-sky-300/60 bg-gradient-to-b from-sky-500/25 to-slate-900/80' },
  { stake: 100, label: '100', sub: '200K', icon: 'glass' as const, ring: 'border-indigo-300/60 bg-gradient-to-b from-indigo-500/25 to-slate-900/80' },
  { stake: 200, label: '200', sub: '500K', icon: 'glass' as const, ring: 'border-purple-300/60 bg-gradient-to-b from-purple-500/25 to-slate-900/80' },
  { stake: 350, label: '350', sub: '1M', icon: 'wand' as const, ring: 'border-yellow-300/70 bg-gradient-to-b from-yellow-500/30 to-amber-950/85' },
  { stake: 500, label: '500', sub: '5M', icon: 'rocket' as const, ring: 'border-red-300/70 bg-gradient-to-b from-red-500/30 to-rose-950/85' },
];

const CHEST_PALETTE: Record<
  ChestConfig['theme'],
  { body: string; lid: string; gem: string; aura: string }
> = {
  blue: { body: '#1D4ED8', lid: '#38BDF8', gem: '#67E8F9', aura: 'from-sky-500/30 to-blue-950/80' },
  red: { body: '#B91C1C', lid: '#EF4444', gem: '#FDA4AF', aura: 'from-rose-500/35 to-red-950/80' },
  purple: { body: '#6D28D9', lid: '#A855F7', gem: '#E879F9', aura: 'from-purple-500/35 to-indigo-950/80' },
  green: { body: '#15803D', lid: '#22C55E', gem: '#86EFAC', aura: 'from-emerald-500/30 to-green-950/80' },
  gold: { body: '#991B1B', lid: '#F59E0B', gem: '#FEF08A', aura: 'from-amber-400/50 via-yellow-500/30 to-amber-950/90' },
};

const ChestIllustrationSvg: React.FC<{ chest: ChestConfig; isWinner: boolean }> = ({ chest, isWinner }) => {
  const pal = CHEST_PALETTE[chest.theme];
  return (
    <svg viewBox="0 0 96 86" className="w-full h-full drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]" aria-hidden="true">
      <defs>
        <linearGradient id={`chest-gold-${chest.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {isWinner && <circle cx="48" cy="46" r="40" fill="#FACC15" opacity="0.22" />}
      {chest.theme === 'gold' && (
        <g opacity="0.65">
          <line x1="48" y1="6" x2="48" y2="18" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="16" y1="22" x2="26" y2="30" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" />
          <line x1="80" y1="22" x2="70" y2="30" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" />
        </g>
      )}
      {chest.hasCrown && (
        <path
          d="M32 24 L29 12 L40 18 L48 8 L56 18 L67 12 L64 24 Z"
          fill={`url(#chest-gold-${chest.id})`}
          stroke="#78350F"
          strokeWidth="1.8"
        />
      )}
      {/* Chest Lid */}
      <path
        d="M15 41 C15 22 81 22 81 41 Z"
        fill={pal.lid}
        stroke={`url(#chest-gold-${chest.id})`}
        strokeWidth="3.5"
      />
      {/* Chest Body */}
      <rect
        x="16"
        y="41"
        width="64"
        height="34"
        rx="6"
        fill={pal.body}
        stroke={`url(#chest-gold-${chest.id})`}
        strokeWidth="3.5"
      />
      {/* Golden Ribs */}
      <rect x="27" y="29" width="6" height="45" rx="2" fill={`url(#chest-gold-${chest.id})`} opacity="0.9" />
      <rect x="63" y="29" width="6" height="45" rx="2" fill={`url(#chest-gold-${chest.id})`} opacity="0.9" />
      {/* Center Lock Plate + Gem */}
      <polygon
        points="48,33 58,44 48,58 38,44"
        fill={`url(#chest-gold-${chest.id})`}
        stroke="#451A03"
        strokeWidth="1.5"
      />
      <polygon points="48,38 54,44 48,51 42,44" fill={pal.gem} stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
};

export const OchkuzSandiqGame: React.FC<OchkuzSandiqGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(50);
  const [stakes, setStakes] = useState<Record<number, number>>({});
  const [countdown, setCountdown] = useState<number>(10);
  const [spinningIdx, setSpinningIdx] = useState<number | null>(null);
  const [winningIdx, setWinningIdx] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState<number>(0);
  const [openedGifts, setOpenedGifts] = useState<number>(0);
  const [jackpotPool, setJackpotPool] = useState<number>(75_680_320);
  const [busy, setBusy] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Sandiqni tanlang va OCHISH tugmasini bosing!');
  const [recentHistory, setRecentHistory] = useState<number[]>([4, 1, 8, 2, 5]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const totalStake = useMemo(
    () => Object.values(stakes).reduce((acc, v) => acc + v, 0),
    [stakes]
  );

  const playTone = useCallback(
    (freq: number, duration = 0.09, type: OscillatorType = 'triangle') => {
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
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // ignore audio restriction
      }
    },
    [soundEnabled]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setJackpotPool((prev) => prev + Math.floor(Math.random() * 48) + 12);
      setCountdown((prev) => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const pickWeightedChest = (): number => {
    const totalWeight = CHESTS.reduce((sum, c) => sum + c.weight, 0);
    let r = Math.random() * totalWeight;
    for (const c of CHESTS) {
      r -= c.weight;
      if (r <= 0) return c.id;
    }
    return 0;
  };

  const handleToggleChest = (chestId: number) => {
    if (busy) return;
    playTone(540, 0.06, 'sine');
    setWinningIdx(null);
    setStakes((prev) => {
      const currentOnChest = prev[chestId] || 0;
      if (currentOnChest > 0 && currentOnChest === selectedChip) {
        const copy = { ...prev };
        delete copy[chestId];
        return copy;
      }
      const nextTotal = totalStake - currentOnChest + selectedChip;
      if (nextTotal > 500) {
        setStatusMessage('Bir raundda maksimal 500 ball tikish mumkin');
        return prev;
      }
      if (nextTotal > currentUser.gamePoints) {
        setStatusMessage('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
        return prev;
      }
      return { ...prev, [chestId]: selectedChip };
    });
  };

  const handleOpenChests = async () => {
    if (busy) return;
    let activeStakes = stakes;
    if (Object.keys(activeStakes).length === 0) {
      const fallbackStake = Math.min(selectedChip, Math.max(10, currentUser.gamePoints));
      if (currentUser.gamePoints < 10) {
        setStatusMessage('O‘yin ballaringiz kam. Pastdagi + To‘ldirish tugmasini bosing.');
        return;
      }
      const defaultChest = 4; // Center golden crown chest
      activeStakes = { [defaultChest]: fallbackStake };
      setStakes(activeStakes);
    }

    const roundCost = Math.min(
      500,
      Object.values(activeStakes).reduce((acc, v) => acc + v, 0)
    );
    if (roundCost > currentUser.gamePoints) {
      setStatusMessage('O‘yin ballaringiz yetarli emas!');
      return;
    }

    setBusy(true);
    setWinningIdx(null);
    setStatusMessage('Sandiqlar ochilmoqda...');

    let chosenWinner = pickWeightedChest();
    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      const stakedIds = Object.keys(activeStakes).map(Number).filter((id) => (activeStakes[id] || 0) > 0);
      if (luck?.favored && stakedIds.length > 0) {
        stakedIds.sort((a, b) => (CHESTS[b]?.multiplier || 0) - (CHESTS[a]?.multiplier || 0));
        chosenWinner = stakedIds[0];
      }
    } catch {
      // ignore
    }
    const totalSteps = 14 + chosenWinner;

    for (let step = 0; step <= totalSteps; step++) {
      const idx = step % 9;
      setSpinningIdx(idx);
      playTone(300 + idx * 35, 0.05, 'triangle');
      await new Promise((res) => setTimeout(res, 65 + step * 6));
    }

    setSpinningIdx(null);
    setWinningIdx(chosenWinner);
    const winningChest = CHESTS[chosenWinner];
    const stakeOnWinner = activeStakes[chosenWinner] || 0;
    const rawReward = stakeOnWinner > 0 ? Math.min(2500, stakeOnWinner * Math.min(winningChest.multiplier, 15)) : 0;
    const delta = stakeOnWinner > 0 ? Math.min(2500, rawReward - roundCost + stakeOnWinner) : -roundCost;
    const isWin = delta > 0;

    if (isWin) {
      playTone(880, 0.16, 'sine');
      setTimeout(() => playTone(1174, 0.22, 'sine'), 120);
      setLastWin(delta);
      setOpenedGifts((g) => g + 1);
      setStatusMessage(`G‘alaba! ${winningChest.title} (×${winningChest.multiplier}) +${formatCoins(delta)} ball!`);
    } else {
      playTone(220, 0.18, 'sawtooth');
      setLastWin(0);
      setStatusMessage(`${winningChest.title} (×${winningChest.multiplier}) ochildi. Yana urinib ko‘ring!`);
    }

    setRecentHistory((prev) => [chosenWinner, ...prev].slice(0, 7));

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'ochkoz-quti',
          gameTitle: "Ochko'z sandiq",
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: isWin
            ? `${winningChest.title} ×${winningChest.multiplier} (+${delta} ball)`
            : `${winningChest.title} ochildi`,
          isWin,
        }),
      });
      onUserUpdated(res.user);
    } catch {
      // ignore transient network
    } finally {
      setBusy(false);
    }
  };

  const handleRefillPoints = async () => {
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/refill', { method: 'POST' });
      onUserUpdated(res.user);
      setStatusMessage('+1 500 bepul o‘yin balli qo‘shildi!');
      playTone(720, 0.15, 'sine');
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Ballar yetarli');
    }
  };

  return (
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-amber-400/45 shadow-[0_24px_60px_rgba(0,0,0,0.7)] bg-[#190408] text-white select-none">
      {/* Uploaded Ochko'z Sandiq Atmospheric Samurai & Dragon Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/assets/aistudio/file_000000001bf48210b83120ed687c2222_b4574ef8.png"
          alt="Ochko'z sandiq fon"
          className="w-full h-full object-cover object-top opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2A050B]/60 via-[#1B0308]/88 to-[#120205]" />
      </div>

      {/* Top HUD Bar matching screenshot */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-1.5">
        <div className="flex items-center gap-2 min-w-0 px-2.5 py-1.5 rounded-full bg-[#2A0910]/90 border border-amber-400/50 shadow-lg backdrop-blur-md">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.nickname}
              className="w-8 h-8 rounded-full object-cover border-2 border-amber-300 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border-2 border-amber-300 flex items-center justify-center text-xs font-bold text-amber-200 shrink-0">
              {currentUser.nickname.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-amber-100 truncate leading-tight">
              {currentUser.nickname}
            </div>
            <div className="flex items-center gap-1 text-xs font-mono font-black text-amber-300 leading-tight">
              <span className="inline-block w-3.5 h-3.5 rounded-full bg-gradient-to-b from-yellow-200 to-amber-500 border border-amber-900 text-[8px] text-amber-950 text-center leading-[12px]">
                ★
              </span>
              <span>{formatCoins(currentUser.gamePoints)}</span>
              {currentUser.gamePoints < 1000 && (
                <button
                  type="button"
                  onClick={handleRefillPoints}
                  className="ml-1 px-1.5 py-0.5 rounded bg-amber-400 text-[#1B0308] text-[9px] font-black"
                  title="Bepul ball olish"
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#3A0B14]/90 hover:bg-[#52101D] border border-amber-400/60 flex items-center justify-center text-amber-200 shadow-md"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(
                  `🏆 Ochko'z sandiq o‘yinida ${formatCoins(lastWin || currentUser.gamePoints)} ball natija qayd etdi!`
                )
              }
              className="w-9 h-9 rounded-full bg-[#3A0B14]/90 hover:bg-[#52101D] border border-amber-400/60 flex items-center justify-center text-emerald-300 shadow-md"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#3A0B14]/90 hover:bg-[#52101D] border border-amber-400/60 flex items-center justify-center text-amber-200 font-black shadow-md"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#3A0B14]/90 hover:bg-rose-700 border border-amber-400/60 flex items-center justify-center text-amber-200 shadow-md"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Artwork Window + OCHKUZ SANDIQ Title + JACKPOT Plaque */}
      <div className="relative z-10 px-3 sm:px-5 pt-1 text-center">
        <div className="mx-auto w-28 h-20 sm:w-32 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/75 shadow-[0_0_24px_rgba(251,191,36,0.4)] mb-1.5">
          <img
            src="/assets/aistudio/file_000000001bf48210b83120ed687c2222_b4574ef8.png"
            alt="Ochko'z sandiq"
            className="w-full h-full object-cover object-top"
          />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-black tracking-wider uppercase leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]">
          <span className="text-slate-100">OCHKUZ </span>
          <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            SANDIQ
          </span>
        </h2>

        {/* JACKPOT Plaque */}
        <div className="mt-1.5 mx-auto max-w-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-t-xl bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-[#2A050B] text-[10px] font-black tracking-[0.2em] uppercase shadow">
            <span>👑</span>
            <span>JACKPOT</span>
            <span>👑</span>
          </div>
          <div className="px-4 py-1.5 rounded-full bg-gradient-to-b from-[#991B1B] via-[#6B0F1A] to-[#3B060D] border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.45),inset_0_2px_8px_rgba(255,255,255,0.2)]">
            <span className="font-mono tabular-nums text-xl sm:text-2xl font-black text-amber-200 tracking-wider">
              {jackpotPool.toLocaleString('uz-UZ').replace(/,/g, ' ')}
            </span>
          </div>
        </div>

        {/* Timer & Status Pill */}
        <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#24060D]/90 border border-amber-400/50 text-xs">
          <Hourglass className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-amber-100 font-medium">Vaqtni tanlang</span>
          <span className="font-mono font-black text-amber-300">{countdown}s</span>
        </div>
      </div>

      {/* 3x3 Treasure Chest Grid Frame */}
      <div className="relative z-10 mx-3 sm:mx-5 mt-2.5 p-2 sm:p-2.5 rounded-2xl bg-gradient-to-b from-[#450A14]/90 to-[#1E0408]/95 border-2 border-amber-400/80 shadow-[0_0_30px_rgba(245,158,11,0.28)]">
        <div className="grid grid-cols-3 gap-2">
          {CHESTS.map((chest) => {
            const myStake = stakes[chest.id] || 0;
            const isSpin = spinningIdx === chest.id;
            const isWinner = winningIdx === chest.id;
            const pal = CHEST_PALETTE[chest.theme];

            return (
              <button
                key={chest.id}
                type="button"
                disabled={busy}
                onClick={() => handleToggleChest(chest.id)}
                className={`relative aspect-[1.08/1] rounded-xl border-2 p-1.5 flex flex-col items-center justify-between transition-all overflow-hidden bg-gradient-to-b ${pal.aura} ${
                  isWinner
                    ? 'border-yellow-200 scale-[1.04] shadow-[0_0_24px_rgba(250,204,21,0.95)] ring-2 ring-amber-300'
                    : isSpin
                    ? 'border-amber-300 scale-[1.03] shadow-[0_0_16px_rgba(251,191,36,0.75)]'
                    : myStake > 0
                    ? 'border-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.55)]'
                    : 'border-amber-400/45 hover:border-amber-300'
                }`}
              >
                {/* Crowd tag pill */}
                <div className="w-full flex items-center justify-center">
                  <span className="px-1.5 py-[1px] rounded-full bg-black/55 text-[9px] font-mono font-bold text-amber-200 border border-amber-300/30">
                    👥 {chest.crowdTag}
                  </span>
                </div>

                {/* Chest Artwork */}
                <div className="w-12 h-11 sm:w-14 sm:h-12 flex items-center justify-center">
                  <ChestIllustrationSvg chest={chest} isWinner={isWinner} />
                </div>

                {/* Multiplier & User Stake */}
                <div className="w-full flex items-center justify-between gap-1 px-0.5">
                  {myStake > 0 ? (
                    <span className="px-1.5 py-[1px] rounded-full bg-emerald-400 text-[#052e16] font-mono text-[9px] font-black shadow">
                      {myStake}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="font-mono text-xs sm:text-sm font-black text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                    x{chest.multiplier}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="relative z-10 px-4 mt-2 flex items-center justify-between text-[11px]">
        <span className="text-amber-100/90 font-medium truncate">{statusMessage}</span>
        {totalStake > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setStakes({})}
            className="text-amber-300 hover:text-white flex items-center gap-1 shrink-0 ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Tozalash</span>
          </button>
        )}
      </div>

      {/* Chip / Tool Selector Bar */}
      <div className="relative z-10 mx-3 sm:mx-5 mt-2 p-1.5 rounded-2xl bg-[#2A070F]/95 border border-amber-400/55 grid grid-cols-7 gap-1">
        {CHIP_TIERS.map((tier) => {
          const active = selectedChip === tier.stake;
          return (
            <button
              key={tier.stake}
              type="button"
              disabled={busy}
              onClick={() => {
                setSelectedChip(tier.stake);
                playTone(620, 0.05, 'sine');
              }}
              className={`py-1.5 px-0.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all ${
                tier.ring
              } ${
                active
                  ? 'ring-2 ring-yellow-300 scale-105 shadow-[0_0_12px_rgba(250,204,21,0.6)]'
                  : 'opacity-80 hover:opacity-100'
              }`}
              title={`${tier.stake} ball`}
            >
              {tier.icon === 'wand' ? (
                <Wand2 className="w-3.5 h-3.5 text-yellow-200" />
              ) : tier.icon === 'rocket' ? (
                <Rocket className="w-3.5 h-3.5 text-rose-200" />
              ) : (
                <Search className="w-3.5 h-3.5 text-amber-100" />
              )}
              <span className="font-mono text-[10px] font-black text-white leading-none">
                {tier.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom Bar: Natija | OCHISH | Gifts */}
      <div className="relative z-10 px-3 sm:px-5 pt-2.5 pb-3.5 flex items-center justify-between gap-2">
        <div className="flex-1 px-3 py-2 rounded-full bg-[#24060D]/95 border border-amber-400/50 flex items-center justify-center gap-1.5 text-xs">
          <span className="text-amber-100/80 font-medium">Natija:</span>
          <span className="font-mono font-black text-amber-300">{formatCoins(lastWin)}</span>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleOpenChests}
          className="px-6 sm:px-8 py-2.5 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-red-700 hover:brightness-110 active:scale-95 border-2 border-yellow-200 text-white font-display font-black tracking-wider text-sm sm:text-base shadow-[0_0_24px_rgba(245,158,11,0.65)] disabled:opacity-60 transition"
        >
          {busy ? 'OCHILMOQDA...' : 'OCHISH'}
        </button>

        <div className="flex-1 px-3 py-2 rounded-full bg-[#24060D]/95 border border-amber-400/50 flex items-center justify-center gap-1.5 text-xs">
          <Gift className="w-4 h-4 text-amber-300" />
          <span className="font-mono font-black text-amber-200">{openedGifts}</span>
        </div>
      </div>

      {/* Recent Results Strip */}
      <div className="relative z-10 px-4 pb-3 flex items-center justify-between gap-2 border-t border-amber-400/20 pt-2 text-[10px] text-amber-200/75">
        <span className="flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-300" />
          <span>Oxirgi natijalar:</span>
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {recentHistory.map((idx, i) => (
            <span
              key={`${idx}-${i}`}
              className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 font-mono font-bold text-amber-200 shrink-0"
            >
              ×{CHESTS[idx]?.multiplier || 5}
            </span>
          ))}
        </div>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1F060C] border border-amber-400/60 p-5 space-y-3 text-xs text-amber-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Ochko'z sandiq qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed text-amber-100/85">
              Pastki paneldan ball miqdorini (10 dan 500 ballgacha) tanlang, bir yoki bir nechta sandiqni belgilang va <strong>OCHISH</strong> tugmasini bosing. Oltin tojli va ko‘paytirgichli sandiqlar (x5 dan x35 gacha) sizga qo‘shimcha o‘yin ballari keltiradi.
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
