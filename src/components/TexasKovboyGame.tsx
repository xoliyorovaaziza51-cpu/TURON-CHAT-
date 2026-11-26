import React, { useCallback, useRef, useState } from 'react';
import {
  HelpCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface TexasKovboyGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

type CowboyPick = 'sherif' | 'duel' | 'bandit';

const STAKES = [20, 50, 100, 250, 500];

const SUITS = ['♠', '♥', '♦', '♣'] as const;

function formatCardRank(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

export const TexasKovboyGame: React.FC<TexasKovboyGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [selectedSide, setSelectedSide] = useState<CowboyPick>('sherif');
  const [sheriffCard, setSheriffCard] = useState<{ rank: number; suit: string } | null>(null);
  const [banditCard, setBanditCard] = useState<{ rank: number; suit: string } | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Tomonni tanlang va duel kartalarini oching!');
  const [history, setHistory] = useState<CowboyPick[]>(['sherif', 'bandit', 'sherif', 'duel', 'sherif']);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq: number, dur = 0.1, type: OscillatorType = 'triangle') => {
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

  const handlePlayDuel = async (pickOverride?: CowboyPick) => {
    if (busy) return;
    const pick = pickOverride || selectedSide;
    setSelectedSide(pick);

    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    setBusy(true);
    playTone(300, 0.08, 'triangle');
    setStatusText('Kovboy dueli boshlandi...');

    let sRank = Math.floor(Math.random() * 13) + 2;
    let bRank = Math.floor(Math.random() * 13) + 2;

    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      if (luck?.favored) {
        if (pick === 'sherif') {
          sRank = 14;
          bRank = Math.floor(Math.random() * 8) + 2;
        } else if (pick === 'bandit') {
          bRank = 14;
          sRank = Math.floor(Math.random() * 8) + 2;
        } else {
          sRank = 13;
          bRank = 13;
        }
      }
    } catch {
      // ignore
    }

    await new Promise((r) => setTimeout(r, 420));

    const sSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const bSuit = SUITS[Math.floor(Math.random() * SUITS.length)];
    setSheriffCard({ rank: sRank, suit: sSuit });
    setBanditCard({ rank: bRank, suit: bSuit });

    const winnerSide: CowboyPick = sRank > bRank ? 'sherif' : bRank > sRank ? 'bandit' : 'duel';
    const isWin = winnerSide === pick;
    const mult = pick === 'duel' ? 5 : 2;
    const delta = isWin ? Math.min(2500, selectedStake * mult - selectedStake) : -selectedStake;

    setLastDelta(delta);
    setStreak((prev) => (isWin ? prev + 1 : 0));
    setHistory((prev) => [winnerSide, ...prev].slice(0, 8));

    if (isWin) {
      playTone(820, 0.14, 'sine');
      setTimeout(() => playTone(1100, 0.2, 'sine'), 110);
      setStatusText(
        `G‘alaba! ${winnerSide === 'sherif' ? 'Sherif' : winnerSide === 'bandit' ? 'Bandit' : 'Durang Duel'} (${mult}×) +${formatCoins(delta)} ball!`
      );
    } else {
      playTone(185, 0.18, 'sawtooth');
      setStatusText(
        `${winnerSide === 'sherif' ? 'Sherif' : winnerSide === 'bandit' ? 'Bandit' : 'Durang'} g‘olib chiqdi. Qayta urinib ko‘ring!`
      );
    }

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'texas-kovboy',
          gameTitle: 'Texas Kovboy',
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: isWin
            ? `Texas Kovboy g‘alabasi (+${delta} ball)`
            : `Duel yakuni (${formatCardRank(sRank)} vs ${formatCardRank(bRank)})`,
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
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-amber-400/50 shadow-[0_24px_60px_rgba(0,0,0,0.75)] bg-[#1F0B04] text-white select-none">
      {/* Wild West Sunset Background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/assets/aistudio/file_0000000012bc8210965d5c02438d7701_ba248e87.png"
          alt="Texas Kovboy fon"
          className="w-full h-full object-cover object-top opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#3A1606]/70 via-[#220C03]/90 to-[#140602]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#381606]/90 border border-amber-400/55 shadow-lg">
          <Star className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#220C03] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#381606]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(`🤠 Texas Kovboy duelida ${streak} ketma-ket g‘alaba qozondi!`)
              }
              className="w-9 h-9 rounded-full bg-[#381606]/90 border border-amber-400/50 flex items-center justify-center text-emerald-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#381606]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#381606]/90 hover:bg-rose-700 border border-amber-400/50 flex items-center justify-center text-white"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Artwork + Title */}
      <div className="relative z-10 px-4 flex items-center gap-3">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/85 shadow-[0_0_24px_rgba(245,158,11,0.45)] shrink-0">
          <img
            src="/assets/aistudio/file_0000000012bc8210965d5c02438d7701_ba248e87.png"
            alt="Texas Kovboy"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-black tracking-wide uppercase leading-none">
            <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              TEXAS{' '}
            </span>
            <span className="text-slate-100">KOVBOY</span>
          </h2>
          <p className="text-xs text-amber-200/80 mt-1">
            Yovvoyi G‘arb dueli · Sherif yoki Bandit kartasini tanlang
          </p>
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
            {history.map((h, i) => (
              <span
                key={`${h}-${i}`}
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                  h === 'sherif'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : h === 'duel'
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    : 'bg-rose-500/20 border-rose-400/50 text-rose-200'
                }`}
              >
                {h === 'sherif' ? '⭐ Sherif' : h === 'duel' ? '⚖️ Duel' : '🤠 Bandit'}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Western Card Duel Stage */}
      <div className="relative z-10 mx-3 sm:mx-5 mt-3 rounded-2xl border-2 border-amber-500/55 bg-gradient-to-b from-[#3B1808]/95 via-[#240D04]/95 to-[#170802]/95 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Sheriff Card */}
          <div className="p-3.5 rounded-2xl bg-[#190A04] border border-amber-400/45 text-center flex flex-col items-center justify-center min-h-[122px]">
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              ⭐ Sherif
            </span>
            <div className="mt-2 w-16 h-20 rounded-xl bg-gradient-to-b from-amber-50 to-amber-100 border-2 border-amber-400 shadow-lg flex flex-col items-center justify-center text-[#1F0B04]">
              <span className="font-mono text-2xl font-black leading-none">
                {sheriffCard ? formatCardRank(sheriffCard.rank) : '?'}
              </span>
              <span
                className={`text-lg leading-none mt-1 ${
                  sheriffCard?.suit === '♥' || sheriffCard?.suit === '♦' ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {sheriffCard ? sheriffCard.suit : '★'}
              </span>
            </div>
          </div>

          {/* Bandit Card */}
          <div className="p-3.5 rounded-2xl bg-[#190A04] border border-rose-400/45 text-center flex flex-col items-center justify-center min-h-[122px]">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
              🤠 Bandit
            </span>
            <div className="mt-2 w-16 h-20 rounded-xl bg-gradient-to-b from-slate-50 to-slate-200 border-2 border-rose-400 shadow-lg flex flex-col items-center justify-center text-[#1F0B04]">
              <span className="font-mono text-2xl font-black leading-none">
                {banditCard ? formatCardRank(banditCard.rank) : '?'}
              </span>
              <span
                className={`text-lg leading-none mt-1 ${
                  banditCard?.suit === '♥' || banditCard?.suit === '♦' ? 'text-rose-600' : 'text-slate-900'
                }`}
              >
                {banditCard ? banditCard.suit : '🔥'}
              </span>
            </div>
          </div>
        </div>

        {/* 3 Pick Sides */}
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'sherif' as const, label: 'Sherif', mult: '×2', cls: 'from-amber-500/30 to-amber-900/60 border-amber-400/60' },
              { id: 'duel' as const, label: 'Durang Duel', mult: '×5', cls: 'from-emerald-500/30 to-emerald-900/60 border-emerald-400/60' },
              { id: 'bandit' as const, label: 'Bandit', mult: '×2', cls: 'from-rose-500/30 to-rose-900/60 border-rose-400/60' },
            ]
          ).map((opt) => {
            const active = selectedSide === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={busy}
                onClick={() => setSelectedSide(opt.id)}
                className={`py-2.5 px-2 rounded-xl border-2 bg-gradient-to-b ${opt.cls} text-center transition ${
                  active ? 'ring-2 ring-yellow-300 scale-[1.03]' : 'opacity-80 hover:opacity-100'
                }`}
              >
                <div className="text-xs font-bold text-white">{opt.label}</div>
                <div className="font-mono text-sm font-black text-amber-300 mt-0.5">{opt.mult}</div>
              </button>
            );
          })}
        </div>

        <div className="text-center text-xs text-amber-100/90 font-medium">{statusText}</div>
      </div>

      {/* Stake & Action Controls */}
      <div className="relative z-10 px-3 sm:px-5 pt-3 pb-4 space-y-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          {STAKES.map((stake) => (
            <button
              key={stake}
              type="button"
              disabled={busy}
              onClick={() => setSelectedStake(stake)}
              className={`py-2 rounded-xl font-mono text-xs font-black border transition ${
                selectedStake === stake
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#220C03] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#381606]/90 text-amber-100 border-amber-400/35 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#381606]/90 border border-amber-400/35 text-xs">
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
            disabled={busy}
            onClick={() => handlePlayDuel()}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-[#220C03] font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(245,158,11,0.65)] hover:brightness-105 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{busy ? 'OCHILMOQDA...' : 'KARTALARNI OCHISH'}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#2A1005] border border-amber-400/60 p-5 space-y-3 text-xs text-amber-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Texas Kovboy qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              <strong>Sherif (×2)</strong>, <strong>Bandit (×2)</strong> yoki <strong>Durang Duel (×5)</strong> tomonini tanlang va kartalarni oching. Katta karta chiqqan tomon raundda g‘alaba qozonadi.
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
