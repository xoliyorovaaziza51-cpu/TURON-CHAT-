import React, { useCallback, useRef, useState } from 'react';
import {
  HelpCircle,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import footballKungCover from '../assets/images/football_kung_cover_1795691343223.jpg';
import { apiFetch, formatCoins } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface FootballKungGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

type GoalZoneId = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-right';

const GOAL_ZONES: {
  id: GoalZoneId;
  label: string;
  mult: number;
  ballPos: string;
  gkPos: string;
}[] = [
  { id: 'top-left', label: 'Chap yuqori', mult: 3, ballPos: 'left-[18%] top-[24%]', gkPos: 'left-[22%] top-[34%] -rotate-12' },
  { id: 'top-center', label: 'Markaziy to‘sin', mult: 4, ballPos: 'left-[50%] top-[22%]', gkPos: 'left-[50%] top-[32%]' },
  { id: 'top-right', label: 'O‘ng yuqori', mult: 3, ballPos: 'left-[82%] top-[24%]', gkPos: 'left-[78%] top-[34%] rotate-12' },
  { id: 'bottom-left', label: 'Chap burchak', mult: 2, ballPos: 'left-[18%] top-[68%]', gkPos: 'left-[22%] top-[62%] -rotate-24' },
  { id: 'bottom-right', label: 'O‘ng burchak', mult: 2, ballPos: 'left-[82%] top-[68%]', gkPos: 'left-[78%] top-[62%] rotate-24' },
];

const STAKES = [25, 50, 100, 250, 500];

export const FootballKungGame: React.FC<FootballKungGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [selectedZone, setSelectedZone] = useState<GoalZoneId>('top-right');
  const [keeperZone, setKeeperZone] = useState<GoalZoneId | null>(null);
  const [kickedZone, setKickedZone] = useState<GoalZoneId | null>(null);
  const [phase, setPhase] = useState<'ready' | 'kicking' | 'goal' | 'saved'>('ready');
  const [streak, setStreak] = useState<number>(0);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Darvozadan burchakni tanlang va zarba bering!');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [recentGoals, setRecentGoals] = useState<boolean[]>([true, true, false, true, true]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = useCallback(
    (freq: number, dur = 0.12) => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
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

  const handleShoot = async (targetZone?: GoalZoneId) => {
    if (phase === 'kicking') return;
    const chosen = targetZone || selectedZone;
    setSelectedZone(chosen);

    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    setPhase('kicking');
    setKickedZone(chosen);
    playSound(320, 0.08);

    let gkPick = GOAL_ZONES[Math.floor(Math.random() * GOAL_ZONES.length)].id;
    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      if (luck?.favored) {
        const others = GOAL_ZONES.filter((z) => z.id !== chosen);
        gkPick = others[Math.floor(Math.random() * others.length)].id;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 420));
    setKeeperZone(gkPick);

    const zoneMeta = GOAL_ZONES.find((z) => z.id === chosen)!;
    const isGoal = gkPick !== chosen;
    const nextStreak = isGoal ? streak + 1 : 0;
    const streakBonus = isGoal ? Math.min(200, (nextStreak - 1) * 30) : 0;
    const delta = isGoal
      ? Math.min(2500, selectedStake * zoneMeta.mult + streakBonus - selectedStake)
      : -selectedStake;

    setStreak(nextStreak);
    setLastDelta(delta);
    setPhase(isGoal ? 'goal' : 'saved');
    setRecentGoals((prev) => [isGoal, ...prev].slice(0, 8));

    if (isGoal) {
      playSound(784, 0.14);
      setTimeout(() => playSound(1046, 0.2), 110);
      setStatusText(`GOOOL! ${zoneMeta.label} (${zoneMeta.mult}×) +${formatCoins(delta)} ball!`);
    } else {
      playSound(190, 0.18);
      setStatusText(`Darvozabon to‘pni qaytardi! Yana zarba bering.`);
    }

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'football-king',
          gameTitle: 'Football Kung',
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: isGoal ? `GOL! ${zoneMeta.label} (+${delta} ball)` : 'Darvozabon to‘pni ushladi',
          isWin: isGoal,
        }),
      });
      onUserUpdated(res.user);
    } catch {
      // ignore
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

  const activeBallClass =
    kickedZone ? GOAL_ZONES.find((z) => z.id === kickedZone)?.ballPos || 'left-1/2 top-[84%]' : 'left-1/2 top-[84%]';
  const activeGkClass =
    keeperZone ? GOAL_ZONES.find((z) => z.id === keeperZone)?.gkPos || 'left-1/2 top-[48%]' : 'left-1/2 top-[48%]';

  return (
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-amber-400/45 shadow-[0_24px_60px_rgba(0,0,0,0.75)] bg-[#06122E] text-white select-none">
      {/* Stadium Background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src={footballKungCover}
          alt="Football Kung stadium"
          className="w-full h-full object-cover object-top opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#071842]/70 via-[#051029]/90 to-[#041812]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#091D4A]/90 border border-amber-400/50 shadow-lg">
          <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#06122E] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#091D4A]/90 border border-sky-300/40 flex items-center justify-center text-sky-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(`⚽ Football Kung o‘yinida ${streak} ketma-ket gol urdi!`)
              }
              className="w-9 h-9 rounded-full bg-[#091D4A]/90 border border-sky-300/40 flex items-center justify-center text-emerald-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#091D4A]/90 border border-sky-300/40 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#091D4A]/90 hover:bg-rose-600 border border-sky-300/40 flex items-center justify-center text-white"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Artwork + Title Crest */}
      <div className="relative z-10 px-4 flex items-center gap-3">
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-[0_0_24px_rgba(250,204,21,0.4)] shrink-0">
          <img src={footballKungCover} alt="Football Kung" className="w-full h-full object-cover" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-black tracking-wide uppercase leading-none">
            <span className="text-slate-100">FOOTBALL </span>
            <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              KUNG
            </span>
          </h2>
          <p className="text-xs text-sky-200/80 mt-1">
            Penalti zarbasi · Darvozabonni chalg‘itib kubokni yuting
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[10px] font-bold text-amber-200">
              🔥 Seriya: {streak}
            </span>
            <div className="flex items-center gap-1">
              {recentGoals.map((g, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${g ? 'bg-emerald-400' : 'bg-rose-500'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Stadium Pitch & Penalty Goal */}
      <div className="relative z-10 mx-3 sm:mx-5 mt-3 rounded-2xl overflow-hidden border-2 border-amber-400/60 bg-gradient-to-b from-[#081A45] via-[#0B2C52] to-[#0B4F28] p-3">
        {/* Goal Frame */}
        <div className="relative h-48 sm:h-52 rounded-xl border-4 border-b-0 border-white/85 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:14px_14px] shadow-[inset_0_0_30px_rgba(0,0,0,0.55)]">
          {/* Target Zone Buttons */}
          {GOAL_ZONES.map((zone) => {
            const active = selectedZone === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                disabled={phase === 'kicking'}
                onClick={() => handleShoot(zone.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-xl border text-[10px] font-black transition-all ${
                  zone.ballPos
                } ${
                  active
                    ? 'bg-amber-400 text-[#06122E] border-white scale-110 shadow-[0_0_16px_rgba(250,204,21,0.9)]'
                    : 'bg-[#091D4A]/80 text-sky-100 border-sky-300/45 hover:border-amber-300'
                }`}
              >
                <div>{zone.label}</div>
                <div className="font-mono text-[11px]">×{zone.mult}</div>
              </button>
            );
          })}

          {/* Animated Goalkeeper */}
          <div
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-10 ${activeGkClass}`}
          >
            <div className="w-11 h-11 rounded-full bg-gradient-to-b from-amber-300 to-orange-600 border-2 border-white flex items-center justify-center shadow-lg text-lg">
              🧤
            </div>
          </div>

          {/* Animated Soccer Ball */}
          <div
            className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-20 ${activeBallClass}`}
          >
            <div className="w-9 h-9 rounded-full bg-white border-2 border-amber-400 shadow-[0_0_16px_rgba(250,204,21,0.85)] flex items-center justify-center text-lg">
              ⚽
            </div>
          </div>
        </div>

        {/* Pitch Penalty Spot */}
        <div className="h-7 bg-gradient-to-b from-emerald-700/80 to-emerald-900/90 border-t border-white/40 flex items-center justify-center text-[11px] font-medium text-emerald-100">
          {statusText}
        </div>
      </div>

      {/* Stake Selector & Shoot Button */}
      <div className="relative z-10 px-3 sm:px-5 pt-3 pb-4 space-y-2.5">
        <div className="grid grid-cols-5 gap-1.5">
          {STAKES.map((stake) => (
            <button
              key={stake}
              type="button"
              disabled={phase === 'kicking'}
              onClick={() => setSelectedStake(stake)}
              className={`py-2 rounded-xl font-mono text-xs font-black border transition ${
                selectedStake === stake
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#06122E] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#091D4A]/90 text-sky-100 border-sky-400/30 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#091D4A]/90 border border-sky-400/30 text-xs">
            <span className="text-sky-200/75">Natija: </span>
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
            disabled={phase === 'kicking'}
            onClick={() => handleShoot()}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 text-[#06122E] font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(250,204,21,0.55)] hover:brightness-105 active:scale-98 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{phase === 'kicking' ? 'ZARBA BERILMOQDA...' : 'ZARBA BERISH'}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#091D4A] border border-amber-400/60 p-5 space-y-3 text-xs text-sky-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Football Kung qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              Darvozadan 5 ta nuqtadan birini tanlang va zarba bering. Darvozabon boshqa burchakka sakrasa — GOL (2×, 3× yoki 4× ball + ketma-ket gol bonusi)!
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
