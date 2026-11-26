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

interface YoshPattiGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

interface PattiCard {
  rank: number; // 2..14
  suit: '♠' | '♥' | '♦' | '♣';
}

const SUITS: PattiCard['suit'][] = ['♠', '♥', '♦', '♣'];
const STAKES = [20, 50, 100, 250, 500];

function rankLabel(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}

function evaluateThreeCards(cards: PattiCard[]): { score: number; label: string } {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const [r1, r2, r3] = sorted.map((c) => c.rank);
  const sameSuit = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  const isSeq =
    (r1 - 1 === r2 && r2 - 1 === r3) || (r1 === 14 && r2 === 3 && r3 === 2);

  if (r1 === r2 && r2 === r3) {
    return { score: 60000 + r1 * 100, label: 'Uchlik (Trail)' };
  }
  if (sameSuit && isSeq) {
    return { score: 50000 + r1 * 100, label: 'Sof Ketma-ket' };
  }
  if (isSeq) {
    return { score: 40000 + r1 * 100, label: 'Ketma-ket' };
  }
  if (sameSuit) {
    return { score: 30000 + r1 * 100 + r2 * 10 + r3, label: 'Bir Rang (Flush)' };
  }
  if (r1 === r2 || r2 === r3 || r1 === r3) {
    const pairRank = r1 === r2 ? r1 : r2 === r3 ? r2 : r1;
    return { score: 20000 + pairRank * 100 + r1 + r3, label: 'Juftlik' };
  }
  return { score: 10000 + r1 * 100 + r2 * 10 + r3, label: 'Katta Karta' };
}

function drawThreeCards(): PattiCard[] {
  const deck: PattiCard[] = [];
  for (const s of SUITS) {
    for (let r = 2; r <= 14; r++) {
      deck.push({ rank: r, suit: s });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, 3);
}

export const YoshPattiGame: React.FC<YoshPattiGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedStake, setSelectedStake] = useState<number>(50);
  const [playerHand, setPlayerHand] = useState<PattiCard[] | null>(null);
  const [botHand, setBotHand] = useState<PattiCard[] | null>(null);
  const [busy, setBusy] = useState<boolean>(false);
  const [lastDelta, setLastDelta] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('3 ta karta tarqating va Yosh Patti duelida yuting!');
  const [history, setHistory] = useState<boolean[]>([true, false, true, true]);
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

  const handleDeal = async () => {
    if (busy) return;
    if (currentUser.gamePoints < selectedStake) {
      setStatusText('O‘yin ballari yetarli emas. Bepul to‘ldirishdan foydalaning.');
      return;
    }

    setBusy(true);
    playTone(340, 0.08, 'triangle');
    setStatusText('Kartalar tarqatilmoqda...');

    let pCards = drawThreeCards();
    let bCards = drawThreeCards();

    try {
      const luck = await apiFetch<{ favored?: boolean }>('/api/games/luck-target');
      if (luck?.favored) {
        pCards = [
          { rank: 14, suit: '♠' },
          { rank: 14, suit: '♥' },
          { rank: 14, suit: '♦' },
        ];
        bCards = [
          { rank: 9, suit: '♣' },
          { rank: 7, suit: '♦' },
          { rank: 4, suit: '♠' },
        ];
      }
    } catch {
      // ignore
    }

    await new Promise((r) => setTimeout(r, 420));

    setPlayerHand(pCards);
    setBotHand(bCards);

    const pEval = evaluateThreeCards(pCards);
    const bEval = evaluateThreeCards(bCards);
    const isWin = pEval.score > bEval.score;
    const isDraw = pEval.score === bEval.score;

    const bonusMult = pEval.score >= 50000 ? 4 : pEval.score >= 30000 ? 3 : 2;
    const delta = isWin
      ? Math.min(2500, selectedStake * bonusMult - selectedStake)
      : isDraw
      ? 10
      : -selectedStake;

    setLastDelta(delta);
    setStreak((prev) => (isWin ? prev + 1 : 0));
    setHistory((prev) => [isWin, ...prev].slice(0, 7));

    if (isWin) {
      playTone(860, 0.14, 'sine');
      setTimeout(() => playTone(1140, 0.2, 'sine'), 110);
      setStatusText(`G‘alaba! "${pEval.label}" (${bonusMult}×) +${formatCoins(delta)} ball!`);
    } else if (isDraw) {
      playTone(540, 0.12, 'sine');
      setStatusText(`Durang! Ikkala qo‘l ham "${pEval.label}". +10 ball!`);
    } else {
      playTone(190, 0.18, 'sawtooth');
      setStatusText(`Raqib qo‘li ("${bEval.label}") ustun keldi. Qayta urinib ko‘ring!`);
    }

    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/play', {
        method: 'POST',
        body: JSON.stringify({
          gameId: 'yosh-patti',
          gameTitle: 'Yosh Patti',
          category: 'omadli',
          deltaPoints: Math.max(-500, Math.min(2500, delta)),
          outcome: isWin
            ? `Yosh Patti: ${pEval.label} (+${delta} ball)`
            : `Raqib: ${bEval.label}`,
          isWin: isWin || isDraw,
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

  const pEval = playerHand ? evaluateThreeCards(playerHand) : null;
  const bEval = botHand ? evaluateThreeCards(botHand) : null;

  return (
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between rounded-none border-0 sm:rounded-3xl overflow-hidden sm:border sm:border-amber-400/50 shadow-[0_24px_60px_rgba(0,0,0,0.8)] bg-[#05291A] text-white select-none">
      {/* Uploaded Yosh Patti Felt Backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/assets/aistudio/file_00000000e5688210b51acf98e1bc6cc6_0df8be0d.png"
          alt="Yosh Patti fon"
          className="w-full h-full object-cover object-top opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#073A24]/70 via-[#042316]/90 to-[#02140C]" />
      </div>

      {/* Top HUD */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#093823]/90 border border-amber-400/55 shadow-lg">
          <Crown className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="font-mono text-xs font-black text-amber-200">
            {formatCoins(currentUser.gamePoints)} ball
          </span>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="px-1.5 py-0.5 rounded bg-amber-400 text-[#05291A] text-[9px] font-black"
            >
              +
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className="w-9 h-9 rounded-full bg-[#093823]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Ovoz"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          {onShareResultInRoom && (
            <button
              type="button"
              onClick={() =>
                onShareResultInRoom(`🃏 Yosh Patti o‘yinida ${streak} ketma-ket g‘alaba qozondi!`)
              }
              className="w-9 h-9 rounded-full bg-[#093823]/90 border border-amber-400/50 flex items-center justify-center text-emerald-300"
              title="Xonaga ulashish"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowRules(true)}
            className="w-9 h-9 rounded-full bg-[#093823]/90 border border-amber-400/50 flex items-center justify-center text-amber-200"
            aria-label="Qoidalar"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-[#093823]/90 hover:bg-rose-700 border border-amber-400/50 flex items-center justify-center text-white"
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
            src="/assets/aistudio/file_00000000e5688210b51acf98e1bc6cc6_0df8be0d.png"
            alt="Yosh Patti"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-black tracking-wide uppercase leading-none">
            <span className="bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              YOSH{' '}
            </span>
            <span className="text-slate-100">PATTI</span>
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            3 kartali shohona kombinatsiyalar bellashuvi
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[10px] font-bold text-amber-200">
              🔥 Seriya: {streak}
            </span>
            <div className="flex items-center gap-1">
              {history.map((w, i) => (
                <span
                  key={i}
                  className={`w-2.5 h-2.5 rounded-full ${w ? 'bg-emerald-400' : 'bg-rose-500'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Felt Card Table */}
      <div className="relative z-10 mx-3 sm:mx-5 my-2 p-4 rounded-2xl border-2 border-amber-400/60 bg-gradient-to-b from-[#0A462B]/90 via-[#062E1C]/95 to-[#041E12]/95 space-y-4">
        {/* Bot Hand */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-rose-300 font-bold uppercase tracking-wider">Raqib qo‘li</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-[11px] text-amber-200">
              {bEval ? bEval.label : 'Yopiq'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {(botHand || [null, null, null]).map((card, i) => (
              <div
                key={i}
                className={`h-20 rounded-xl border-2 flex flex-col items-center justify-center shadow-lg ${
                  card
                    ? 'bg-gradient-to-b from-white to-slate-100 border-rose-300 text-slate-900'
                    : 'bg-[#08301E] border-amber-400/35 text-amber-300/60'
                }`}
              >
                {card ? (
                  <>
                    <span className="font-mono text-2xl font-black leading-none">
                      {rankLabel(card.rank)}
                    </span>
                    <span
                      className={`text-lg leading-none mt-0.5 ${
                        card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {card.suit}
                    </span>
                  </>
                ) : (
                  <span className="text-lg font-black">♠</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Player Hand */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-300 font-bold uppercase tracking-wider">Sizning qo‘lingiz</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-[11px] text-amber-200 font-semibold">
              {pEval ? pEval.label : 'Tayyor'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {(playerHand || [null, null, null]).map((card, i) => (
              <div
                key={i}
                className={`h-24 rounded-xl border-2 flex flex-col items-center justify-center shadow-xl ${
                  card
                    ? 'bg-gradient-to-b from-amber-50 to-white border-amber-400 text-slate-900'
                    : 'bg-[#08301E] border-emerald-400/45 text-emerald-300/60'
                }`}
              >
                {card ? (
                  <>
                    <span className="font-mono text-2xl font-black leading-none">
                      {rankLabel(card.rank)}
                    </span>
                    <span
                      className={`text-xl leading-none mt-0.5 ${
                        card.suit === '♥' || card.suit === '♦' ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {card.suit}
                    </span>
                  </>
                ) : (
                  <span className="text-xl font-black">★</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-amber-100 font-medium">{statusText}</div>
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
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-[#05291A] border-white shadow-[0_0_14px_rgba(250,204,21,0.55)]'
                  : 'bg-[#093823]/90 text-emerald-100 border-amber-400/35 hover:border-amber-300'
              }`}
            >
              {stake}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#093823]/90 border border-amber-400/35 text-xs">
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
            onClick={handleDeal}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 text-[#05291A] font-display font-black tracking-wide text-sm shadow-[0_0_24px_rgba(245,158,11,0.65)] hover:brightness-105 disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{busy ? 'TARQATILMOQDA...' : 'KARTALARNI OCHISH'}</span>
          </button>
        </div>
      </div>

      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#073320] border border-amber-400/60 p-5 space-y-3 text-xs text-emerald-100">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-amber-300">Yosh Patti qoidalari</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="leading-relaxed">
              Har bir raundda sizga va raqibga 3 tadan karta tarqatiladi. Eng kuchli kombinatsiya — <strong>Uchlik (A-A-A)</strong>, so‘ng <strong>Sof Ketma-ket</strong>, <strong>Ketma-ket</strong>, <strong>Bir Rang</strong> va <strong>Juftlik</strong>.
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
