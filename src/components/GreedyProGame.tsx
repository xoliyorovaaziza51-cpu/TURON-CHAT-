import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Coins,
  Crown,
  HelpCircle,
  Plus,
  Share2,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import type {
  GreedyProPublicState,
  GreedyProSlot,
  GreedyProUserState,
  GreedySlotKey,
  UserProfile,
} from '../types/turon';

interface GreedyProGameProps {
  currentUser: UserProfile;
  onBack: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

const CHIP_META: Record<
  number,
  { label: string; ringColor: string; bgGrad: string; centerBg: string; text: string }
> = {
  5000: {
    label: '5K',
    ringColor: '#C084FC',
    bgGrad: 'from-[#9333EA] to-[#581C87]',
    centerBg: 'bg-[#3B0764]',
    text: 'text-white',
  },
  50000: {
    label: '50K',
    ringColor: '#34D399',
    bgGrad: 'from-[#10B981] to-[#065F46]',
    centerBg: 'bg-[#064E3B]',
    text: 'text-white',
  },
  200000: {
    label: '200K',
    ringColor: '#60A5FA',
    bgGrad: 'from-[#2563EB] to-[#1E3A8A]',
    centerBg: 'bg-[#172554]',
    text: 'text-white',
  },
  1000000: {
    label: '1M',
    ringColor: '#FB7185',
    bgGrad: 'from-[#F43F5E] to-[#9F1239]',
    centerBg: 'bg-[#881337]',
    text: 'text-white',
  },
  5000000: {
    label: '5M',
    ringColor: '#FDE047',
    bgGrad: 'from-[#F59E0B] to-[#B45309]',
    centerBg: 'bg-[#78350F]',
    text: 'text-amber-50',
  },
  10000000: {
    label: '10M',
    ringColor: '#FACC15',
    bgGrad: 'from-[#EC4899] via-[#A855F7] to-[#D97706]',
    centerBg: 'bg-[#4A044E]',
    text: 'text-yellow-200',
  },
};

function formatCompactAmount(val: number): string {
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return Number.isInteger(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(val);
}

const Coin3DSvg: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
    <defs>
      <radialGradient id="gp-coin-grad" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="55%" stopColor="#F59E0B" />
        <stop offset="100%" stopColor="#B45309" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#gp-coin-grad)" stroke="#FEF9C3" strokeWidth="2" />
    <circle cx="16" cy="16" r="9.5" fill="none" stroke="#FDE047" strokeWidth="1.4" strokeDasharray="3 2" />
    <path d="M16 9 L18 14 L23 14 L19 17 L20.5 22 L16 19 L11.5 22 L13 17 L9 14 L14 14 Z" fill="#FFFBEB" />
  </svg>
);

export const FoodIllustration: React.FC<{
  slotKey: GreedySlotKey;
  className?: string;
}> = ({ slotKey, className = 'w-10 h-10' }) => {
  switch (slotKey) {
    case 'pomidor':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="gp-tom" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#FCA5A5" />
              <stop offset="35%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#991B1B" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="36" r="21" fill="url(#gp-tom)" stroke="#7F1D1D" strokeWidth="2" />
          <ellipse cx="23" cy="28" rx="6" ry="3.5" transform="rotate(-30 23 28)" fill="#FFFFFF" opacity="0.55" />
          <path
            d="M32 16 C26 10, 18 14, 22 21 C26 18, 29 19, 32 22 C35 19, 38 18, 42 21 C46 14, 38 10, 32 16 Z"
            fill="#22C55E"
            stroke="#14532D"
            strokeWidth="1.5"
          />
          <path d="M32 9 L32 17" stroke="#15803D" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
      );
    case 'karam':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="gp-cab" cx="38%" cy="32%" r="68%">
              <stop offset="0%" stopColor="#BBF7D0" />
              <stop offset="50%" stopColor="#22C55E" />
              <stop offset="100%" stopColor="#15803D" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="34" r="21" fill="url(#gp-cab)" stroke="#14532D" strokeWidth="2" />
          <path d="M14 34 C15 19, 29 15, 36 22 C44 17, 52 24, 49 37 C45 49, 20 51, 14 34 Z" fill="#4ADE80" opacity="0.85" />
          <path d="M21 36 C25 25, 39 25, 43 36 C38 45, 26 45, 21 36 Z" fill="#86EFAC" />
          <path d="M24 23 Q32 34 32 50 M40 24 Q34 35 32 50" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'baliq':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <defs>
            <linearGradient id="gp-fish" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7DD3FC" />
              <stop offset="55%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
          </defs>
          <polygon points="8,21 21,33 8,45" fill="#0284C7" stroke="#0C4A6E" strokeWidth="2" />
          <path d="M25 20 Q34 11 42 20" fill="#38BDF8" stroke="#0C4A6E" strokeWidth="2" />
          <ellipse cx="36" cy="33" rx="19" ry="12" fill="url(#gp-fish)" stroke="#0C4A6E" strokeWidth="2" />
          <path d="M25 32 Q32 28 37 33 Q32 38 25 32 Z" fill="#E0F2FE" opacity="0.75" />
          <circle cx="46" cy="30" r="3.3" fill="#FFFFFF" />
          <circle cx="47" cy="30" r="1.7" fill="#0F172A" />
        </svg>
      );
    case 'sabzi':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <path d="M41 11 C43 6, 50 7, 47 14 C52 11, 57 17, 50 21 C55 22, 52 28, 45 24 Z" fill="#22C55E" stroke="#14532D" strokeWidth="1.5" />
          <path
            d="M45 20 C50 25, 45 34, 34 43 C23 51, 14 54, 11 52 C9 49, 13 40, 22 30 C30 20, 40 15, 45 20 Z"
            fill="#FB923C"
            stroke="#9A3412"
            strokeWidth="2"
          />
          <ellipse cx="34" cy="27" rx="5" ry="2.2" transform="rotate(-40 34 27)" fill="#FED7AA" opacity="0.7" />
          <path d="M29 29 L33 34 M22 37 L26 42" stroke="#C2410C" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'hotdog':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <g transform="rotate(-16 32 33)">
            <rect x="7" y="23" width="50" height="21" rx="10.5" fill="#FBBF24" stroke="#92400E" strokeWidth="2" />
            <rect x="5" y="27.5" width="54" height="11.5" rx="5.5" fill="#DC2626" stroke="#7F1D1D" strokeWidth="1.8" />
            <path d="M11 33 Q17 28 23 33 T35 33 T47 33 T55 33" fill="none" stroke="#FEF08A" strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>
      );
    case 'krevetka':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <ellipse cx="32" cy="41" rx="23" ry="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2.2" />
          <path
            d="M19 35 C17 22, 32 17, 41 24 C47 29, 45 39, 36 40 C31 41, 28 36, 33 32"
            fill="none"
            stroke="#F97316"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          <path d="M21 34 C19 24, 32 19, 40 25" fill="none" stroke="#FFEDD5" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="19" cy="31" r="2.1" fill="#0F172A" />
        </svg>
      );
    case 'tovuq':
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <ellipse cx="32" cy="44" rx="23" ry="10.5" fill="#FEF3C7" stroke="#D97706" strokeWidth="2" />
          <ellipse cx="32" cy="33" rx="17" ry="12.5" fill="#D97706" stroke="#78350F" strokeWidth="2.2" />
          <ellipse cx="28" cy="28" rx="8" ry="4" fill="#FDE68A" opacity="0.65" />
          <path d="M44 35 L54 31" stroke="#FFFBEB" strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="55" cy="29.5" r="3.2" fill="#FFFBEB" />
          <circle cx="54" cy="33.5" r="3.2" fill="#FFFBEB" />
        </svg>
      );
    case 'steyk':
    default:
      return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
          <ellipse cx="32" cy="39" rx="24" ry="15" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2.2" />
          <path
            d="M15 34 C13 23, 28 18, 43 22 C53 26, 52 40, 40 44 C27 47, 16 43, 15 34 Z"
            fill="#B91C1C"
            stroke="#450A0A"
            strokeWidth="2.2"
          />
          <path d="M22 30 L28 39 M30 27 L36 38 M38 26 L44 35" stroke="#450A0A" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="23" cy="27" r="3.2" fill="#FEF08A" opacity="0.9" />
          <path d="M43 24 L50 18" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      );
  }
};

const GrandmaChefMascotSvg: React.FC = () => (
  <svg viewBox="0 0 110 86" className="w-[86px] h-[68px] drop-shadow-[0_4px_12px_rgba(0,0,0,0.55)]" aria-hidden="true">
    {/* Fluffy Pink/Lavender Grandma Bun Hair */}
    <circle cx="55" cy="18" r="14" fill="#F9A8D4" stroke="#831843" strokeWidth="2" />
    <circle cx="34" cy="34" r="12" fill="#FBCFE8" stroke="#831843" strokeWidth="1.8" />
    <circle cx="76" cy="34" r="12" fill="#FBCFE8" stroke="#831843" strokeWidth="1.8" />
    {/* Cute Bow / Hairpin */}
    <ellipse cx="55" cy="18" rx="18" ry="8" fill="#F472B6" opacity="0.55" />
    {/* Face */}
    <circle cx="55" cy="40" r="18" fill="#FED7AA" stroke="#9A3412" strokeWidth="2" />
    {/* Eyebrows & Happy Eyes with Glasses */}
    <circle cx="48" cy="39" r="5" fill="#FFFFFF" fillOpacity="0.35" stroke="#F59E0B" strokeWidth="1.8" />
    <circle cx="62" cy="39" r="5" fill="#FFFFFF" fillOpacity="0.35" stroke="#F59E0B" strokeWidth="1.8" />
    <line x1="53" y1="39" x2="57" y2="39" stroke="#F59E0B" strokeWidth="1.8" />
    <circle cx="48" cy="39" r="2" fill="#1E293B" />
    <circle cx="62" cy="39" r="2" fill="#1E293B" />
    {/* Rosy Cheeks & Smile */}
    <circle cx="42" cy="45" r="3" fill="#FB7185" opacity="0.6" />
    <circle cx="68" cy="45" r="3" fill="#FB7185" opacity="0.6" />
    <path d="M48 47 Q55 54 62 47" fill="none" stroke="#7C2D12" strokeWidth="2.3" strokeLinecap="round" />
    {/* Pink Outfit Collar */}
    <path d="M35 58 Q55 68 75 58 L78 72 H32 Z" fill="#EC4899" stroke="#831843" strokeWidth="2" />
    <path d="M44 58 L55 69 L66 58 Z" fill="#FFFFFF" />
    {/* Left & Right Waving Peace Hands */}
    <g transform="translate(15, 38) rotate(-14)">
      <circle cx="10" cy="14" r="6.5" fill="#FED7AA" stroke="#9A3412" strokeWidth="1.8" />
      <rect x="6" y="4" width="3.5" height="9" rx="1.7" fill="#FED7AA" stroke="#9A3412" strokeWidth="1.2" />
      <rect x="11" y="3" width="3.5" height="10" rx="1.7" fill="#FED7AA" stroke="#9A3412" strokeWidth="1.2" />
    </g>
    <g transform="translate(75, 38) rotate(14)">
      <circle cx="10" cy="14" r="6.5" fill="#FED7AA" stroke="#9A3412" strokeWidth="1.8" />
      <rect x="6" y="3" width="3.5" height="10" rx="1.7" fill="#FED7AA" stroke="#9A3412" strokeWidth="1.2" />
      <rect x="11" y="4" width="3.5" height="9" rx="1.7" fill="#FED7AA" stroke="#9A3412" strokeWidth="1.2" />
    </g>
  </svg>
);

const HandPointerSvg: React.FC = () => (
  <svg viewBox="0 0 36 36" className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_3px_6px_rgba(0,0,0,0.7)]" aria-hidden="true">
    <path
      d="M15 4 C13.5 4, 12.5 5.2, 12.5 6.8 V17.5 L10.2 15.2 C9 14, 7.2 14.2, 6.2 15.4 C5.3 16.5, 5.5 18.2, 6.6 19.3 L13.8 27.2 C15.1 28.6, 16.8 29.5, 18.8 29.5 H23.5 C26.8 29.5, 29.2 26.8, 29.2 23.4 V15.8 C29.2 14.4, 28 13.3, 26.7 13.3 C25.9 13.3, 25.2 13.7, 24.7 14.3 C24.3 13.1, 23.2 12.3, 21.9 12.3 C21.1 12.3, 20.3 12.7, 19.8 13.3 C19.4 12.1, 18.4 11.4, 17.5 11.4 V6.8 C17.5 5.2, 16.5 4, 15 4 Z"
      fill="#FFFFFF"
      stroke="#1E1B4B"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const PizzaComboSvg: React.FC = () => (
  <svg viewBox="0 0 56 56" className="w-full h-full" aria-hidden="true">
    <circle cx="28" cy="28" r="22" fill="#F59E0B" stroke="#92400E" strokeWidth="2.5" />
    <circle cx="28" cy="28" r="17" fill="#FDE047" />
    <line x1="28" y1="11" x2="28" y2="45" stroke="#B45309" strokeWidth="1.5" />
    <line x1="11" y1="28" x2="45" y2="28" stroke="#B45309" strokeWidth="1.5" />
    <circle cx="21" cy="21" r="3.2" fill="#DC2626" />
    <circle cx="35" cy="21" r="3.2" fill="#DC2626" />
    <circle cx="21" cy="35" r="3.2" fill="#DC2626" />
    <circle cx="35" cy="35" r="3.2" fill="#DC2626" />
    <circle cx="28" cy="28" r="2.6" fill="#22C55E" />
  </svg>
);

const SaladComboSvg: React.FC = () => (
  <svg viewBox="0 0 56 56" className="w-full h-full" aria-hidden="true">
    <circle cx="20" cy="24" r="9" fill="#4ADE80" stroke="#15803D" strokeWidth="1.8" />
    <circle cx="36" cy="24" r="9" fill="#22C55E" stroke="#15803D" strokeWidth="1.8" />
    <circle cx="28" cy="20" r="8" fill="#86EFAC" />
    <circle cx="23" cy="22" r="3.5" fill="#EF4444" />
    <circle cx="34" cy="23" r="3.5" fill="#FB923C" />
    <path d="M10 27 H46 C44 40, 38 46, 28 46 C18 46, 12 40, 10 27 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="2.5" />
  </svg>
);

export const GreedyProGame: React.FC<GreedyProGameProps> = ({
  currentUser,
  onBack,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [state, setState] = useState<GreedyProUserState | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(5000);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [noticeMsg, setNoticeMsg] = useState('');
  const [bettingBusy, setBettingBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);
  const [idleSweepIdx, setIdleSweepIdx] = useState<number>(4);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSpinStepRef = useRef<number>(-1);
  const lastPlayedWinRoundRef = useRef<string>('');

  const playTone = useCallback(
    (freq: number, duration = 0.055, type: OscillatorType = 'triangle', gainVal = 0.08) => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // ignore audio errors
      }
    },
    [soundEnabled]
  );

  const loadState = useCallback(async () => {
    try {
      const data = await apiFetch<GreedyProUserState>('/api/games/greedy-pro/state');
      setClockOffsetMs(data.serverNowMs - Date.now());
      setState(data);
      if (data.user) {
        onUserUpdated(data.user);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Greedy Pro yuklanmadi');
    }
  }, [onUserUpdated]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    const onGreedyState = (e: Event) => {
      const pub = (e as CustomEvent<GreedyProPublicState>).detail;
      if (!pub?.round) return;
      setClockOffsetMs(pub.serverNowMs - Date.now());
      setState((prev) => {
        if (!prev) return null;
        const isNewRound = prev.round.id !== pub.round.id;
        return {
          ...prev,
          ...pub,
          userSlotBets: isNewRound
            ? { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
            : prev.userSlotBets,
          userTotalBet: isNewRound ? 0 : prev.userTotalBet,
          userRoundPayout: isNewRound ? 0 : prev.userRoundPayout,
        };
      });
      if (pub.round.status === 'result') {
        apiFetch<GreedyProUserState>('/api/games/greedy-pro/state')
          .then((fresh) => {
            setState(fresh);
            if (fresh.user) onUserUpdated(fresh.user);
          })
          .catch(() => {});
      }
    };

    const onGreedyBalance = () => {
      loadState();
    };

    window.addEventListener('turon:greedy_state', onGreedyState);
    window.addEventListener('turon:greedy_balance', onGreedyBalance);
    return () => {
      window.removeEventListener('turon:greedy_state', onGreedyState);
      window.removeEventListener('turon:greedy_balance', onGreedyBalance);
    };
  }, [loadState, onUserUpdated]);

  const phaseStatus = state?.round?.status || 'betting';

  useEffect(() => {
    const intervalMs = phaseStatus === 'spinning' ? 35 : 200;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, intervalMs);
    return () => clearInterval(id);
  }, [phaseStatus]);

  // Subtle idle hand pointer sweep across the 8 slots during betting (matching reference video)
  useEffect(() => {
    if (phaseStatus !== 'betting') return;
    const id = setInterval(() => {
      setIdleSweepIdx((prev) => (prev + 1) % 8);
    }, 1000);
    return () => clearInterval(id);
  }, [phaseStatus]);

  const syncedNow = nowMs + clockOffsetMs;
  const round = state?.round;

  const secondsLeft = useMemo(() => {
    if (!round) return 35;
    const targetMs =
      round.status === 'betting'
        ? round.bettingEndsAt
        : round.status === 'spinning'
        ? round.spinningEndsAt
        : round.resultEndsAt;
    return Math.max(0, Math.ceil((targetMs - syncedNow) / 1000));
  }, [round, syncedNow]);

  const spinHighlightSlot = useMemo(() => {
    if (!round) return null;
    if (round.status === 'result') return round.winningSlot;
    if (round.status !== 'spinning' || round.winningSlot === null) return null;

    const totalSpinMs = Math.max(1000, round.spinningEndsAt - round.bettingEndsAt);
    const elapsed = Math.max(0, Math.min(totalSpinMs, syncedNow - round.bettingEndsAt));
    const progress = elapsed / totalSpinMs;
    if (progress >= 0.985) return round.winningSlot;

    const eased = 1 - Math.pow(1 - progress, 3);
    const totalSteps = 32 + round.winningSlot;
    const step = Math.floor(eased * totalSteps);
    return step % 8;
  }, [round, syncedNow]);

  useEffect(() => {
    if (round?.status === 'spinning' && spinHighlightSlot !== null) {
      if (lastSpinStepRef.current !== spinHighlightSlot) {
        lastSpinStepRef.current = spinHighlightSlot;
        playTone(540 + spinHighlightSlot * 35, 0.04, 'triangle', 0.05);
      }
    } else {
      lastSpinStepRef.current = -1;
    }
  }, [round?.status, spinHighlightSlot, playTone]);

  useEffect(() => {
    if (round?.status === 'result' && round.id !== lastPlayedWinRoundRef.current) {
      lastPlayedWinRoundRef.current = round.id;
      if ((state?.userRoundPayout || 0) > 0) {
        playTone(660, 0.12, 'sine', 0.1);
        setTimeout(() => playTone(880, 0.18, 'sine', 0.11), 90);
        setTimeout(() => playTone(1046, 0.25, 'sine', 0.12), 180);
      } else {
        playTone(420, 0.14, 'triangle', 0.06);
      }
    }
  }, [round?.status, round?.id, state?.userRoundPayout, playTone]);

  async function handlePlaceBet(target: { slotId?: number; combo?: 'pizza' | 'salad' }) {
    if (!state || !round || bettingBusy) return;
    setErrorMsg('');
    setNoticeMsg('');

    if (round.status !== 'betting') {
      setErrorMsg('Hozir lotereya aylanmoqda! Keyingi tikish vaqtini kuting.');
      return;
    }

    const slotCount = target.combo ? 4 : 1;
    const totalCost = selectedChip * slotCount;

    if (state.userTotalBet + totalCost > state.maxBetPerRound) {
      const rem = Math.max(0, state.maxBetPerRound - state.userTotalBet);
      setErrorMsg(
        `Maksimal limit 35M! Bu turda yana ko‘pi bilan ${formatCoins(rem)} tanga tikishingiz mumkin.`
      );
      return;
    }

    if (currentUser.coinBalance < totalCost) {
      setErrorMsg('Tangalar yetarli emas! "+" tugmasi orqali hisobingizni to‘ldiring.');
      setShowTopupModal(true);
      return;
    }

    setBettingBusy(true);
    try {
      const res = await apiFetch<GreedyProUserState>('/api/games/greedy-pro/bet', {
        method: 'POST',
        body: JSON.stringify({ ...target, amount: selectedChip }),
      });
      setState(res);
      if (res.user) onUserUpdated(res.user);
      playTone(760, 0.05, 'sine', 0.08);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Tikish amalga oshmadi');
    } finally {
      setBettingBusy(false);
    }
  }

  async function handleClaimDailyBonus() {
    setErrorMsg('');
    setNoticeMsg('');
    try {
      const res = await apiFetch<GreedyProUserState>('/api/games/greedy-pro/bonus', {
        method: 'POST',
      });
      setState(res);
      if (res.user) onUserUpdated(res.user);
      setNoticeMsg('+50,000 kunlik Greedy Pro tangasi hisobingizga qo‘shildi!');
      setShowTopupModal(false);
      playTone(880, 0.15, 'sine', 0.1);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Bonus olib bo‘lmadi');
    }
  }

  const slots: GreedyProSlot[] = state?.slots || [
    { id: 0, key: 'pomidor', label: 'Pomidor', multiplier: 5, group: 'salad', weight: 18 },
    { id: 1, key: 'karam', label: 'Karam', multiplier: 5, group: 'salad', weight: 18 },
    { id: 2, key: 'baliq', label: 'Baliq', multiplier: 5, group: 'salad', weight: 18 },
    { id: 3, key: 'sabzi', label: 'Sabzi', multiplier: 5, group: 'salad', weight: 18 },
    { id: 4, key: 'hotdog', label: 'Hot-dog', multiplier: 10, group: 'pizza', weight: 11 },
    { id: 5, key: 'krevetka', label: 'Krevetka', multiplier: 15, group: 'pizza', weight: 8 },
    { id: 6, key: 'tovuq', label: 'Tovuq', multiplier: 25, group: 'pizza', weight: 5 },
    { id: 7, key: 'steyk', label: 'Steyk', multiplier: 45, group: 'pizza', weight: 4 },
  ];

  const chips = state?.chips || [5000, 50000, 200000, 1000000, 5000000, 10000000];
  const userTotalBet = state?.userTotalBet || 0;

  const winningSlotObj =
    round?.winningSlot !== null && round?.winningSlot !== undefined
      ? slots[round.winningSlot] || slots[0]
      : null;

  const phaseLabel =
    round?.status === 'betting'
      ? 'Vaqtini tanlang'
      : round?.status === 'spinning'
      ? 'Lotereya vaqti'
      : 'Natija vaqti';

  const activePointerSlot =
    round?.status === 'betting' ? (hoveredSlotId !== null ? hoveredSlotId : idleSweepIdx) : null;

  return (
    <div className="relative w-full min-h-[100dvh] sm:min-h-0 sm:max-w-xl sm:mx-auto flex flex-col justify-between overflow-hidden rounded-none border-0 sm:rounded-3xl bg-gradient-to-b from-[#581C87] via-[#2B095B] to-[#13032B] sm:border-2 sm:border-[#C084FC]/45 shadow-[0_24px_70px_rgba(0,0,0,0.75)] text-white select-none">
      {/* Royal Starburst, Golden Rays & Celestial Sparkles Backdrop */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-[520px] h-[250px] rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute top-28 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(167,139,250,0.18),transparent_65%)]" />
        <span className="absolute top-10 left-8 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_#fde047]" />
        <span className="absolute top-20 right-9 w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#67e8f9]" />
        <span className="absolute top-14 left-1/4 w-1 h-1 rounded-full bg-white/90" />
        <span className="absolute top-16 right-1/4 w-1 h-1 rounded-full bg-amber-200/90" />
        <span className="absolute bottom-36 left-6 w-1.5 h-1.5 rounded-full bg-fuchsia-300/80" />
        <span className="absolute bottom-40 right-7 w-1.5 h-1.5 rounded-full bg-amber-300/80" />
      </div>

      {/* Non-shifting Floating Alerts */}
      {(errorMsg || noticeMsg) && (
        <div className="pointer-events-none absolute top-20 inset-x-3 z-40 flex flex-col items-center gap-1">
          {errorMsg && (
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-950/90 border border-rose-300/55 text-xs text-rose-50 text-center shadow-lg backdrop-blur-md">
              {errorMsg}
            </div>
          )}
          {noticeMsg && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-300/55 text-xs text-emerald-50 text-center shadow-lg backdrop-blur-md">
              {noticeMsg}
            </div>
          )}
        </div>
      )}

      <div className="relative z-10 px-2.5 sm:px-4 pt-2.5 sm:pt-3.5 pb-0 space-y-1.5 sm:space-y-2.5 max-w-xl mx-auto">
        {/* Top Row: Controls + Ornate Winged JACKPOT Crest */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#3B1778]/90 hover:bg-[#5B21B6] border border-purple-200/35 flex items-center justify-center text-white shadow-md transition"
              aria-label="Orqaga"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setSoundEnabled((s) => !s)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#3B1778]/90 hover:bg-[#5B21B6] border border-purple-200/35 flex items-center justify-center text-amber-200 shadow-md transition"
              aria-label={soundEnabled ? 'Ovozni o‘chirish' : 'Ovozni yoqish'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {/* Ornate Winged Golden JACKPOT Banner */}
          <div className="flex-1 max-w-[220px] sm:max-w-[276px] mx-auto flex flex-col items-center -mt-0.5 min-w-0">
            <div className="relative flex items-center justify-center w-full">
              <svg
                viewBox="0 0 240 42"
                className="w-44 h-8 sm:w-56 sm:h-10 drop-shadow-[0_3px_12px_rgba(250,204,21,0.6)]"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="gp-wing" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#FEF08A" />
                    <stop offset="55%" stopColor="#FACC15" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                  <linearGradient id="gp-banner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#3B0764" />
                  </linearGradient>
                </defs>
                {/* Layered Golden Wings */}
                <path d="M74 22 L10 10 L36 22 L18 29 L74 30 Z" fill="url(#gp-wing)" stroke="#FEF9C3" strokeWidth="1" />
                <path d="M166 22 L230 10 L204 22 L222 29 L166 30 Z" fill="url(#gp-wing)" stroke="#FEF9C3" strokeWidth="1" />
                <path d="M74 25 L26 18 L44 26 L32 32 L74 32 Z" fill="#F59E0B" opacity="0.85" />
                <path d="M166 25 L214 18 L196 26 L208 32 L166 32 Z" fill="#F59E0B" opacity="0.85" />
                {/* Top Mini Crown */}
                <path d="M108 10 L105 3 L114 7 L120 1 L126 7 L135 3 L132 10 Z" fill="#FDE047" stroke="#92400E" strokeWidth="1" />
                {/* Shield Ribbon */}
                <rect x="56" y="9" width="128" height="28" rx="14" fill="url(#gp-banner)" stroke="#FDE047" strokeWidth="2.5" />
                <text
                  x="120"
                  y="28.5"
                  textAnchor="middle"
                  fontSize="16.5"
                  fontWeight="900"
                  letterSpacing="2.4"
                  fill="#FEF08A"
                >
                  JACKPOT
                </text>
              </svg>
            </div>
            {/* Beveled Golden Number Plaque */}
            <div className="-mt-1 w-full px-3 sm:px-5 py-1 sm:py-1.5 rounded-full bg-gradient-to-b from-[#6D28D9] via-[#4C1D95] to-[#260952] border-2 sm:border-[2.5px] border-[#FACC15] shadow-[0_0_24px_rgba(250,204,21,0.45),inset_0_2px_8px_rgba(255,255,255,0.22)] text-center">
              <span className="font-mono tabular-nums text-base sm:text-2xl font-black tracking-wide text-[#FEF08A] drop-shadow-[0_2px_5px_rgba(0,0,0,0.65)]">
                {formatCoins(state?.jackpotPool || 21221382)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#3B1778]/90 hover:bg-[#5B21B6] border border-purple-200/35 flex items-center justify-center text-amber-200 shadow-md transition"
              aria-label="Qoidalar"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 8-Slot Circular Wheel Stage (Fluid Square, Never Overflows or Shifts) */}
        <div className="relative mx-auto w-[min(86vw,312px)] sm:w-[376px] aspect-square flex items-center justify-center">
          {/* Outer Glowing Gold/Violet Ferris Track */}
          <div className="absolute inset-[4%] rounded-full bg-gradient-to-b from-[#7C3AED]/70 via-[#4338CA]/50 to-[#2E1065]/90 border-[5px] sm:border-[6px] border-[#C4B5FD]/75 shadow-[0_0_45px_rgba(168,85,247,0.55),inset_0_0_30px_rgba(250,204,21,0.28)]" />
          <div className="absolute inset-[6.5%] rounded-full border-2 border-[#FDE047]/65" />

          {/* Golden Radial Ferris Wheel Spokes */}
          <svg viewBox="0 0 200 200" className="pointer-events-none absolute inset-[7%] w-[86%] h-[86%] opacity-45" aria-hidden="true">
            {Array.from({ length: 8 }, (_, idx) => {
              const rad = ((-90 + idx * 45) * Math.PI) / 180;
              return (
                <line
                  key={idx}
                  x1="100"
                  y1="100"
                  x2={100 + 82 * Math.cos(rad)}
                  y2={100 + 82 * Math.sin(rad)}
                  stroke="#FDE047"
                  strokeWidth="1.6"
                  strokeDasharray="3 3"
                />
              );
            })}
            <circle cx="100" cy="100" r="64" fill="none" stroke="#C4B5FD" strokeWidth="1" opacity="0.6" />
          </svg>

          {/* 24 Glowing Marquee LED Bulbs around the Wheel */}
          {Array.from({ length: 24 }, (_, idx) => {
            const rad = ((idx * 15 - 90) * Math.PI) / 180;
            const r = 44.6;
            return (
              <span
                key={idx}
                style={{
                  left: `${50 + r * Math.cos(rad)}%`,
                  top: `${50 + r * Math.sin(rad)}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`pointer-events-none absolute w-1.5 h-1.5 rounded-full ${
                  idx % 2 === 0
                    ? 'bg-amber-300 shadow-[0_0_8px_#fde047]'
                    : 'bg-cyan-200/90 shadow-[0_0_6px_#a5f3fc]'
                }`}
              />
            );
          })}

          {/* 8 Circular Glossy Food Medallions */}
          {slots.map((slot, idx) => {
            const angleRad = ((-90 + idx * 45) * Math.PI) / 180;
            const radiusPct = 35.8;
            const leftPct = 50 + radiusPct * Math.cos(angleRad);
            const topPct = 50 + radiusPct * Math.sin(angleRad);

            const userBet = state?.userSlotBets?.[slot.id] || 0;
            const totalSlotPool = state?.slotTotals?.[slot.id] || 0;
            const isSpinActive = spinHighlightSlot === slot.id;
            const isWinner = round?.status === 'result' && round.winningSlot === slot.id;
            const isPointed = activePointerSlot === slot.id;

            return (
              <div
                key={slot.id}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-10 w-[19.5%] h-[19.5%] flex items-center justify-center"
              >
                <button
                  type="button"
                  disabled={round?.status !== 'betting' || bettingBusy}
                  onClick={() => handlePlaceBet({ slotId: slot.id })}
                  onMouseEnter={() => setHoveredSlotId(slot.id)}
                  onMouseLeave={() => setHoveredSlotId(null)}
                  title={`${slot.label} (×${slot.multiplier})`}
                  className={`relative w-full h-full rounded-full border-[3px] flex items-center justify-center transition-transform duration-150 transform-gpu focus:outline-none ${
                    isWinner || isSpinActive
                      ? 'scale-[1.07] bg-gradient-to-b from-[#FEF08A] via-[#FACC15] to-[#EA580C] border-white shadow-[0_0_24px_rgba(250,204,21,0.95)]'
                      : isPointed
                      ? 'scale-[1.03] bg-gradient-to-b from-[#DDD6FE] via-[#8B5CF6] to-[#4C1D95] border-[#FACC15] shadow-[0_0_16px_rgba(250,204,21,0.65)]'
                      : userBet > 0
                      ? 'bg-gradient-to-b from-[#C4B5FD] via-[#6D28D9] to-[#3B0764] border-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.55)]'
                      : 'bg-gradient-to-b from-[#C4B5FD]/85 via-[#6D28D9]/90 to-[#3B0764]/95 border-[#DDD6FE]/70 hover:border-[#FACC15]'
                  }`}
                >
                  {/* Inner Dish Gloss */}
                  <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-[#EDE9FE]/90 via-[#A78BFA]/45 to-[#4C1D95]/80 flex items-center justify-center shadow-inner">
                    <FoodIllustration slotKey={slot.key} className="w-[70%] h-[70%] drop-shadow" />
                  </div>

                  {/* Multiplier Pill overlapping bottom rim */}
                  <span
                    className={`absolute -bottom-2 px-1.5 py-[1px] rounded-full text-[10px] sm:text-[11px] font-black leading-none border shadow whitespace-nowrap ${
                      isWinner || isSpinActive
                        ? 'bg-amber-950 text-amber-200 border-white'
                        : 'bg-[#2E1065] text-white border-amber-300/75'
                    }`}
                  >
                    ×{slot.multiplier}
                  </span>

                  {/* Hand Pointer on Active Slot during Betting (static offset, no bounce jitter) */}
                  {isPointed && round?.status === 'betting' && (
                    <div className="pointer-events-none absolute -bottom-2.5 -right-2.5 z-30">
                      <HandPointerSvg />
                    </div>
                  )}
                </button>

                {/* User / Pool Stake Pill (absolutely positioned so slot never jumps!) */}
                {userBet > 0 ? (
                  <span className="pointer-events-none absolute top-[calc(100%+7px)] left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full bg-emerald-400 text-[#052e16] font-mono tabular-nums text-[9px] sm:text-[10px] font-black shadow border border-white/60 whitespace-nowrap">
                    {formatCompactAmount(userBet)}
                  </span>
                ) : totalSlotPool > 0 ? (
                  <span className="pointer-events-none absolute top-[calc(100%+7px)] left-1/2 -translate-x-1/2 px-1.5 py-[1px] rounded-full bg-purple-950/90 text-amber-200 font-mono tabular-nums text-[9px] border border-purple-300/30 whitespace-nowrap">
                    {formatCompactAmount(totalSlotPool)}
                  </span>
                ) : null}
              </div>
            );
          })}

          {/* Center Grandma/Chef Hub with "Greedy Pro" Plaque */}
          <div className="relative z-10 w-[39%] h-[39%] rounded-full bg-gradient-to-b from-[#7C3AED] via-[#4C1D95] to-[#1E1B4B] border-[3px] sm:border-[4px] border-[#FDE047] shadow-[0_0_28px_rgba(167,139,250,0.65),inset_0_0_18px_rgba(255,255,255,0.2)] flex flex-col items-center justify-center text-center">
            <div className="-mt-6 sm:-mt-7 scale-[0.78] sm:scale-100 origin-bottom">
              <GrandmaChefMascotSvg />
            </div>
            <div className="-mt-2.5 sm:-mt-2 px-2 sm:px-3 py-0.5 rounded-full bg-gradient-to-r from-[#0284C7] via-[#2563EB] to-[#0284C7] border border-[#FDE047] text-[9.5px] sm:text-[11px] font-black tracking-wide text-[#FEF08A] shadow-md whitespace-nowrap">
              Greedy Pro
            </div>
            <div className="text-[9.5px] sm:text-[11px] font-semibold text-cyan-100 mt-0.5 leading-tight px-1 truncate max-w-full">
              {phaseLabel}
            </div>
            <div
              className={`min-w-[44px] font-mono tabular-nums text-xl sm:text-3xl font-black leading-none mt-0.5 drop-shadow ${
                round?.status === 'betting' && secondsLeft <= 5
                  ? 'text-rose-300'
                  : 'text-white'
              }`}
            >
              {secondsLeft}s
            </div>
          </div>

          {/* Bottom-Left Pitsa Circular Medallion */}
          <button
            type="button"
            disabled={round?.status !== 'betting' || bettingBusy}
            onClick={() => handlePlaceBet({ combo: 'pizza' })}
            title="Pitsa: Hot-dog, Krevetka, Tovuq va Steyk (4× chip)"
            className="absolute left-0 bottom-0 z-20 flex flex-col items-center group focus:outline-none disabled:opacity-50"
          >
            <div className="w-12 h-12 sm:w-15 sm:h-15 rounded-full bg-gradient-to-b from-[#DDD6FE] via-[#6D28D9] to-[#3B0764] border-2 border-[#FACC15] shadow-[0_4px_14px_rgba(0,0,0,0.45)] flex items-center justify-center transition-transform group-hover:scale-105 p-1">
              <PizzaComboSvg />
            </div>
            <span className="-mt-2 px-2.5 py-[1px] rounded-full bg-[#3B0764] border border-[#FACC15]/80 text-[10px] sm:text-[11px] font-bold text-amber-100 shadow">
              Pitsa
            </span>
          </button>

          {/* Bottom-Right Salat Circular Medallion */}
          <button
            type="button"
            disabled={round?.status !== 'betting' || bettingBusy}
            onClick={() => handlePlaceBet({ combo: 'salad' })}
            title="Salat: Pomidor, Karam, Baliq va Sabzi (4× chip)"
            className="absolute right-0 bottom-0 z-20 flex flex-col items-center group focus:outline-none disabled:opacity-50"
          >
            <div className="w-12 h-12 sm:w-15 sm:h-15 rounded-full bg-gradient-to-b from-[#DDD6FE] via-[#6D28D9] to-[#3B0764] border-2 border-[#34D399] shadow-[0_4px_14px_rgba(0,0,0,0.45)] flex items-center justify-center transition-transform group-hover:scale-105 p-1">
              <SaladComboSvg />
            </div>
            <span className="-mt-2 px-2.5 py-[1px] rounded-full bg-[#3B0764] border border-[#34D399]/80 text-[10px] sm:text-[11px] font-bold text-emerald-100 shadow">
              Salat
            </span>
          </button>

          {/* Result Overlay Modal */}
          {round?.status === 'result' && winningSlotObj && (
            <div className="absolute inset-x-1 inset-y-4 z-30 flex items-center justify-center">
              <div className="relative w-full max-w-[300px] rounded-3xl bg-gradient-to-b from-[#9333EA]/95 via-[#6B21A8]/95 to-[#3B0764]/95 border-[3px] border-[#E9D5FF] shadow-[0_0_45px_rgba(192,132,252,0.7)] px-4 pt-5 pb-4 text-center">
                {/* Floating Winning Food Medallion on Top-Left */}
                <div className="absolute -top-6 -left-2 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-[#EDE9FE] to-[#6D28D9] border-[3px] border-[#FACC15] shadow-xl flex items-center justify-center">
                  <FoodIllustration slotKey={winningSlotObj.key} className="w-10 h-10 sm:w-11 sm:h-11" />
                </div>

                {/* Result Countdown Pill Top-Right */}
                <span className="absolute top-2.5 right-3.5 font-mono text-xs font-bold text-amber-200">
                  {secondsLeft}s
                </span>

                <div className="pl-9 pr-4 text-left mb-3">
                  <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                    {winningSlotObj.label} (×{winningSlotObj.multiplier})
                  </div>
                  <div className="text-sm font-bold text-white leading-snug">
                    {userTotalBet === 0
                      ? 'Siz bu turda qatnashmadingiz'
                      : (state?.userRoundPayout || 0) > 0
                      ? `Tabriklaymiz! +${formatCoins(state?.userRoundPayout || 0)}`
                      : 'Bu turda omad kelmadi'}
                  </div>
                </div>

                {/* Top Winners Rows */}
                <div className="space-y-2 max-h-[130px] overflow-y-auto">
                  {(state?.topWinners || []).length === 0 ? (
                    <div className="py-3 rounded-2xl bg-black/20 text-xs text-purple-100/85">
                      Ushbu turda g‘olib tikishlar bo‘lmadi
                    </div>
                  ) : (
                    state!.topWinners.slice(0, 3).map((w, idx) => (
                      <div
                        key={w.userId}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#581C87]/90 to-[#4C1D95]/90 border border-purple-300/35 shadow"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                              idx === 0
                                ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-purple-950'
                                : idx === 1
                                ? 'bg-gradient-to-b from-slate-100 to-slate-400 text-slate-900'
                                : 'bg-gradient-to-b from-orange-300 to-orange-500 text-orange-950'
                            }`}
                          >
                            {idx === 0 ? <Crown className="w-3.5 h-3.5" /> : idx + 1}
                          </span>
                          <span className="truncate text-xs font-bold text-white">{w.nickname}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono tabular-nums text-sm font-black text-white">
                            {formatCoins(w.payout)}
                          </span>
                          <Coin3DSvg className="w-4 h-4" />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {onShareResultInRoom && (state?.userRoundPayout || 0) > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onShareResultInRoom(
                        `${currentUser.nickname} Greedy Pro o‘yinida ${winningSlotObj.label} (×${winningSlotObj.multiplier}) bilan +${formatCoins(
                          state?.userRoundPayout || 0
                        )} tanga yutib oldi!`
                      )
                    }
                    className="mt-2.5 mx-auto px-3.5 py-1.5 rounded-full bg-amber-300 text-purple-950 text-xs font-bold flex items-center gap-1.5 shadow"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Xonaga ulashish</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clean Centered Prompt Ribbon */}
        <div className="py-0.5 flex justify-center">
          <div className="w-full max-w-[330px] px-3 py-1 rounded-full bg-gradient-to-r from-transparent via-[#5B21B6]/75 to-transparent border-y border-purple-300/25 text-center">
            <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-purple-100 drop-shadow">
              Miqdorni tanlang → Ovqatni tanlang
            </span>
          </div>
        </div>

        {/* 6 Realistic 3D Segmented Casino Chips: 5K, 50K, 200K, 1M, 5M, 10M */}
        <div className="grid grid-cols-6 gap-1 sm:gap-2.5 py-1 px-0.5">
          {chips.map((val) => {
            const meta = CHIP_META[val] || {
              label: formatCompactAmount(val),
              ringColor: '#CBD5E1',
              bgGrad: 'from-slate-500 to-slate-800',
              centerBg: 'bg-slate-900',
              text: 'text-white',
            };
            const isSelected = selectedChip === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setSelectedChip(val);
                  playTone(620, 0.04, 'sine', 0.05);
                }}
                className={`relative mx-auto w-full max-w-[44px] sm:max-w-[54px] aspect-square rounded-full bg-gradient-to-b ${meta.bgGrad} p-[3.5px] sm:p-[4px] flex items-center justify-center transition-transform duration-150 transform-gpu ${
                  isSelected
                    ? 'scale-105 ring-2 sm:ring-[3px] ring-[#FEF08A] shadow-[0_4px_16px_rgba(250,204,21,0.85)]'
                    : 'opacity-90 hover:opacity-100 hover:scale-105 shadow-[0_4px_10px_rgba(0,0,0,0.45)]'
                }`}
                style={{
                  border: `2px dashed ${meta.ringColor}`,
                }}
              >
                <div
                  className={`w-full h-full rounded-full ${meta.centerBg} border border-white/50 flex items-center justify-center shadow-[inset_0_2px_6px_rgba(255,255,255,0.28)]`}
                >
                  <span className={`font-mono text-[10px] sm:text-xs font-black tracking-tight drop-shadow ${meta.text}`}>
                    {meta.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Qolgan tangalar (+) & Bugungi g'alaba Pills */}
        <div className="grid grid-cols-2 gap-2 pb-1">
          <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#3B1778]/95 to-[#280D58]/95 border border-purple-300/30 flex items-center justify-between gap-1.5 shadow-[inset_0_1px_6px_rgba(255,255,255,0.12)] min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Coin3DSvg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow" />
              <div className="min-w-0">
                <div className="text-[9.5px] sm:text-[10px] text-purple-200/85 leading-tight truncate">
                  Qolgan tangalar
                </div>
                <div className="font-mono tabular-nums text-xs sm:text-sm font-black text-white leading-tight truncate">
                  {formatCoins(currentUser.coinBalance)}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTopupModal(true)}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-b from-[#FEF08A] to-[#F59E0B] text-[#451A03] flex items-center justify-center shadow-[0_2px_8px_rgba(245,158,11,0.5)] hover:brightness-110 shrink-0"
              aria-label="Tangalarni to‘ldirish"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
            </button>
          </div>

          <div className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[#3B1778]/95 to-[#280D58]/95 border border-purple-300/30 flex items-center gap-2 shadow-[inset_0_1px_6px_rgba(255,255,255,0.12)] min-w-0">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400/20 border border-amber-300/70 flex items-center justify-center shrink-0">
              <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] sm:text-[10px] text-purple-200/85 leading-tight truncate">
                Bugungi g‘alaba
              </div>
              <div className="font-mono tabular-nums text-xs sm:text-sm font-black text-amber-300 leading-tight truncate">
                {formatCoins(state?.todayWin || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Natija Strip */}
      <div className="relative z-10 px-2.5 sm:px-3 py-2 bg-[#19083A]/95 border-t border-purple-400/25 flex items-center gap-2 overflow-x-auto">
        <span className="px-2.5 py-1 rounded-full bg-[#4C1D95] border border-purple-300/40 text-[11px] sm:text-xs font-bold text-white shrink-0 shadow">
          Natija
        </span>
        {!state?.history || state.history.length === 0 ? (
          <span className="text-xs text-purple-200/75">
            Birinchi tur yakunlanishi kutilmoqda...
          </span>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            {state.history.slice(0, 10).map((h, i) => (
              <div
                key={h.roundId}
                title={`${h.label} (×${h.multiplier})`}
                className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#3B1778] border border-purple-300/40 flex items-center justify-center shrink-0 shadow"
              >
                <FoodIllustration slotKey={h.slotKey} className="w-5 h-5 sm:w-6 sm:h-6" />
                {i === 0 && (
                  <span className="absolute -top-1.5 -right-1.5 px-1.5 py-[1px] rounded-full bg-rose-500 text-[8px] font-black uppercase text-white shadow">
                    new
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#1A0B3B] border border-amber-300/40 p-5 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-300" />
                <h3 className="font-display text-lg font-bold">Greedy Pro Qoidalari</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2 text-xs text-purple-100 leading-relaxed">
              <li>
                • <strong className="text-amber-300">Tikish vaqti (35 soniya):</strong> Pastdan chip tanlang
                (<span className="font-mono">5K, 50K, 200K, 1M, 5M, 10M</span>) va aylanadagi 8 ta ovqatdan birini bosing.
              </li>
              <li>
                • <strong className="text-amber-300">Maksimal limit:</strong> Bir o‘yin turida barcha uyalarga jami{' '}
                <span className="font-mono font-bold text-white">35,000,000 (35M)</span> tangadan ko‘p tikish mumkin emas.
              </li>
              <li>
                • <strong className="text-amber-300">Lotereya vaqti (10 soniya):</strong> Nur 8 ta ovqat bo‘ylab aylanadi va 10 soniya ichida 1 ta g‘olib ovqatda to‘xtaydi.
              </li>
              <li>
                • <strong className="text-amber-300">Koeffitsiyentlar:</strong> Sabzavot va baliq <span className="font-mono">×5</span>, Hot-dog <span className="font-mono">×10</span>, Krevetka <span className="font-mono">×15</span>, Tovuq <span className="font-mono">×25</span>, Steyk <span className="font-mono">×45</span> + Jackpot bonusi!
              </li>
              <li>
                • <strong className="text-amber-300">Pitsa / Salat:</strong> Bir bosishda 4 ta ovqat uyasiga baravar chip tikish imkonini beradi.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tangalar / Daily Bonus Modal */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1A0B3B] border border-amber-300/40 p-5 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-300" />
                <span>Tangalar hisobi</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTopupModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-400/30">
              <div className="text-xs text-purple-200">Joriy balansingiz</div>
              <div className="font-mono tabular-nums text-2xl font-bold text-amber-300 mt-0.5">
                {formatCoins(currentUser.coinBalance)} tanga
              </div>
            </div>
            {state?.canClaimDailyBonus ? (
              <button
                type="button"
                onClick={handleClaimDailyBonus}
                className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-purple-950 font-bold text-sm"
              >
                Kunlik Greedy Bonusi (+50,000 Tanga)
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-white/5 text-xs text-purple-200">
                Bugungi +50,000 bonus allaqachon olingan. Qo‘shimcha tangalar uchun Hamyon bo‘limidan foydalaning.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
