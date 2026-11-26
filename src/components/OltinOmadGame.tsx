import React, { useCallback, useRef, useState } from 'react';
import {
  Crown,
  HelpCircle,
  RotateCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface OltinOmadGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

const WHEEL_SECTORS = [
  { id: 0, label: '×2 Oltin', mult: 2, color: '#D97706', weight: 28 },
  { id: 1, label: '×3 Omad', mult: 3, color: '#7C3AED', weight: 20 },
  { id: 2, label: '×0 Bo‘sh', mult: 0, color: '#334155', weight: 22 },
  { id: 3, label: '×5 Toj', mult: 5, color: '#B45309', weight: 12 },
  { id: 4, label: '×1.5 Tanga', mult: 1.5, color: '#059669', weight: 12 },
  { id: 5, label: '×10 Jackpot', mult: 10, color: '#DC2626', weight: 6 },
];

const STAKES = [20, 50, 100, 250, 500];

export const OltinOmadGame: React.FC<OltinOmadGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [spinning, setSpinning] = useState<boolean>(false);
  const [wheelAngle, setWheelAngle] = useState<number>(0);
  const [activeSector, setActiveSector] = useState<number | null>(null);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('Oltin omad charxpalagini aylantiring!');
  const [history, setHistory] = useState<number[]>([2, 3, 5, 0, 10]);
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

  const handleSpin = async () => {
    if (spinning) return;
    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    setSpinning(true);
    playTone(380, 0.1, 'triangle');
    setStatusText('Charxpalak aylanmoqda...');

    let pickedIdx = 0;
    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      if (luck?.favored) {
        pickedIdx = Math.random() < 0.5 ? 5 : 3; // x10 or x5
      } else {
        const totalW = WHEEL_SECTORS.reduce((s, x) => s + x.weight, 0);
        let r = Math.random() * totalW;
        for (const sec of WHEEL_SECTORS) {
          r -= sec.weight;
          if (r <= 0) {
            pickedIdx = sec.id;
            break;
          }
        }
      }
    } catch {
      pickedIdx = Math.floor(Math.random() * WHEEL_SECTORS.length);
    }

    const sectorAngle = 360 / WHEEL_SECTORS.length;
    const targetRotation = wheelAngle + 1440 + (360 - pickedIdx * sectorAngle);
    setWheelAngle(targetRotation);

    await new Promise((r) => setTimeout(r, 1450));

    const sector = WHEEL_SECTORS[pickedIdx];
    setActiveSector(pickedIdx);
    const delta =
      sector.mult > 0
        ? Math.min(2500, Math.round(selectedStake * sector.mult) - selectedStake)
        : -selectedStake;
    const isWin = delta > 0;

    setLastDelta(delta);
    setHistory((prev) => [sector.mult, ...prev].slice(0, 7));

    if (isWin) {
      playTone(880, 0.16, 'sine');
      setTimeout(() => playTone(1174, 0.2, 'sine'), 120);
      setStatusText(`Tabriklaymiz! ${sector.label} tushdi (+${formatCoins(delta)} ball)!`);
    } else {
      playTone(210, 0.18, 'sawtooth');
      setStatusText(`Bu safar ${sector.label} tushdi. Yana aylantiring!`);
    }

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'oltin-omad',
          gameTitle: 'Oltin omad',
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: isWin ? `${sector.label} (+${delta} ball)` : `${sector.label}`,
          isWin,
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
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-amber-400/50 shadow-[0_24px_60px_rgba(0,0,0,0.75)] bg-[#1A0730] text-white select-none">
      {/* Uploaded Oltin Omad Background */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/assets/aistudio/file_00000000f39082109b92e8d5aebfe53d_e1ad4132.png"
          alt="Oltin omad fon"
          className="w-full h-full object-cover object-top opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#2A0B4B]/70 via-[#1B0733]/90 to-[#110421]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#2E0F54]/90 border border-amber-400/55 shadow-lg">
          <Crown className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#1A0730] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#2E0F54]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(
                  `🍀 Oltin omad charxpalagida ${lastDelta > 0 ? `+${lastDelta}` : ''} ball natija qayd etdi!`
                )
              }
              className="w-9 h-9 rounded-full bg-[#2E0F54]/90 border border-amber-400/50 flex items-center justify-center text-emerald-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#2E0F54]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#2E0F54]/90 hover:bg-rose-700 border border-amber-400/50 flex items-center justify-center text-white"
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
            src="/assets/aistudio/file_00000000f39082109b92e8d5aebfe53d_e1ad4132.png"
            alt="Oltin omad"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-black tracking-wide uppercase leading-none">
            <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              OLTIN{' '}
            </span>
            <span className="text-slate-100">OMAD</span>
          </h2>
          <p className="text-xs text-purple-200/80 mt-1">
            Omad charxpalagi · ×1.5 dan ×10 Jackpotgacha ball yuting
          </p>
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto">
            {history.map((m, i) => (
              <span
                key={`${m}-${i}`}
                className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold border shrink-0 ${
                  m > 0
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-white/10 border-white/20 text-slate-300'
                }`}
              >
                ×{m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Golden Fortune Wheel */}
      <div className="relative z-10 my-2 flex flex-col items-center justify-center px-4">
        <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
          {/* Top Pointer */}
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_2px_8px_rgba(250,204,21,0.9)]" />

          {/* Spinning SVG Wheel */}
          <div
            style={{ transform: `rotate(${wheelAngle}deg)` }}
            className="w-full h-full rounded-full border-4 border-amber-300 shadow-[0_0_40px_rgba(250,204,21,0.45)] transition-transform duration-[1400ms] ease-out overflow-hidden"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full">
              {WHEEL_SECTORS.map((sec, idx) => {
                const startDeg = idx * 60 - 120;
                const endDeg = startDeg + 60;
                const rad1 = (startDeg * Math.PI) / 180;
                const rad2 = (endDeg * Math.PI) / 180;
                const x1 = 100 + 98 * Math.cos(rad1);
                const y1 = 100 + 98 * Math.sin(rad1);
                const x2 = 100 + 98 * Math.cos(rad2);
                const y2 = 100 + 98 * Math.sin(rad2);
                const midRad = ((startDeg + 30) * Math.PI) / 180;
                const tx = 100 + 62 * Math.cos(midRad);
                const ty = 100 + 62 * Math.sin(midRad);
                return (
                  <g key={sec.id}>
                    <path
                      d={`M 100 100 L ${x1} ${y1} A 98 98 0 0 1 ${x2} ${y2} Z`}
                      fill={sec.color}
                      stroke="#FDE047"
                      strokeWidth="1.5"
                    />
                    <text
                      x={tx}
                      y={ty}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="12"
                      fontWeight="900"
                      fill="#FEF9C3"
                    >
                      ×{sec.mult}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Center Emblem */}
          <button
            type="button"
            disabled={spinning}
            onClick={handleSpin}
            className="absolute z-10 w-16 h-16 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-orange-600 border-2 border-white shadow-[0_0_20px_rgba(250,204,21,0.8)] flex flex-col items-center justify-center text-[#1A0730] font-black text-[10px]"
          >
            <RotateCw className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
            <span>AYLANTIR</span>
          </button>
        </div>

        <div className="mt-2.5 text-xs text-amber-100 font-medium text-center px-3 py-1 rounded-full bg-black/35 border border-amber-400/30">
          {activeSector !== null && !spinning
            ? `${WHEEL_SECTORS[activeSector].label} · ${statusText}`
            : statusText}
        </div>
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
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#1A0730] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#2E0F54]/90 text-purple-100 border-amber-400/35 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#2E0F54]/90 border border-amber-400/35 text-xs">
            <span className="text-purple-200/75">Natija: </span>
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
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 text-[#1A0730] font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(245,158,11,0.65)] hover:brightness-105 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{spinning ? 'AYLANMOQDA...' : 'CHARXPALAKNI AYLANTIRISH'}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#23093F] border border-amber-400/60 p-5 space-y-3 text-xs text-purple-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Oltin omad qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              O‘yin ballarini tanlang va <strong>CHARXPALAKNI AYLANTIRISH</strong> tugmasini bosing. Strelka to‘xtagan sektor bo‘yicha ×1.5 dan ×10 gacha ball yutasiz.
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
