import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Gift, Sparkles, X, Zap } from 'lucide-react';

export interface RocketTierConfig {
  level: number;
  label: string;
  countLabel: string;
  bodyStart: string;
  bodyEnd: string;
  flameColor: string;
  borderClass: string;
  glowStyle: string;
  badgeText: string;
}

export const ROCKET_TIERS: RocketTierConfig[] = [
  {
    level: 1,
    label: 'LV.1',
    countLabel: '1 raketa',
    bodyStart: '#F8FAFC',
    bodyEnd: '#64748B',
    flameColor: '#38BDF8',
    borderClass: 'border-slate-300/60',
    glowStyle: 'shadow-[0_0_14px_rgba(148,163,184,0.35)]',
    badgeText: 'text-slate-100',
  },
  {
    level: 2,
    label: 'LV.2',
    countLabel: '2 raketa',
    bodyStart: '#86EFAC',
    bodyEnd: '#15803D',
    flameColor: '#4ADE80',
    borderClass: 'border-emerald-400/70',
    glowStyle: 'shadow-[0_0_16px_rgba(34,197,94,0.4)]',
    badgeText: 'text-emerald-300',
  },
  {
    level: 3,
    label: 'LV.3',
    countLabel: '3 raketa',
    bodyStart: '#E9D5FF',
    bodyEnd: '#7E22CE',
    flameColor: '#C084FC',
    borderClass: 'border-purple-400/75',
    glowStyle: 'shadow-[0_0_18px_rgba(168,85,247,0.45)]',
    badgeText: 'text-purple-200',
  },
  {
    level: 4,
    label: 'LV.4',
    countLabel: '4 raketa',
    bodyStart: '#93C5FD',
    bodyEnd: '#1D4ED8',
    flameColor: '#60A5FA',
    borderClass: 'border-sky-400/80',
    glowStyle: 'shadow-[0_0_18px_rgba(59,130,246,0.45)]',
    badgeText: 'text-sky-200',
  },
  {
    level: 5,
    label: 'LV.5',
    countLabel: '5 raketa',
    bodyStart: '#FCA5A5',
    bodyEnd: '#B91C1C',
    flameColor: '#FB923C',
    borderClass: 'border-red-400/80',
    glowStyle: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
    badgeText: 'text-red-200',
  },
  {
    level: 6,
    label: 'LV.6',
    countLabel: '6 raketa',
    bodyStart: '#FEF08A',
    bodyEnd: '#B45309',
    flameColor: '#FDE047',
    borderClass: 'border-[#F5C451]',
    glowStyle: 'shadow-[0_0_24px_rgba(245,196,81,0.65)]',
    badgeText: 'text-[#FEF08A]',
  },
];

export const TuronRocketSvg: React.FC<{
  tier: RocketTierConfig;
  className?: string;
  active?: boolean;
}> = ({ tier, className = 'w-10 h-14', active = true }) => {
  const gradId = `rkt-${tier.level}-${active ? 'on' : 'off'}`;
  return (
    <svg viewBox="0 0 64 96" className={`${className} ${active ? '' : 'opacity-45 grayscale-[35%]'}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={tier.bodyStart} />
          <stop offset="100%" stopColor={tier.bodyEnd} />
        </linearGradient>
      </defs>
      {/* Thrust flame */}
      {active && (
        <path
          d="M24 68 L32 94 L40 68 Z"
          fill={tier.flameColor}
          fillOpacity="0.9"
        />
      )}
      {/* Left & Right Fins */}
      <path d="M18 48 L6 66 L20 62 Z" fill={tier.bodyEnd} stroke="#0F172A" strokeWidth="1" />
      <path d="M46 48 L58 66 L44 62 Z" fill={tier.bodyEnd} stroke="#0F172A" strokeWidth="1" />
      {/* Rocket Body */}
      <path
        d="M32 6 C44 18, 48 38, 44 66 L20 66 C16 38, 20 18, 32 6 Z"
        fill={`url(#${gradId})`}
        stroke="#FDE68A"
        strokeWidth="1.4"
      />
      {/* Nose Cone Ring */}
      <path d="M23 22 Q32 25 41 22" fill="none" stroke="#FEF08A" strokeWidth="1.6" />
      {/* Turon Emblem Circle */}
      <circle cx="32" cy="43" r="9" fill="#071333" stroke="#F5C451" strokeWidth="1.6" />
      <circle cx="28.5" cy="43" r="1.2" fill="#F5C451" />
      <circle cx="32" cy="43" r="1.2" fill="#F5C451" />
      <circle cx="35.5" cy="43" r="1.2" fill="#F5C451" />
    </svg>
  );
};

export const RoomRocketPill: React.FC<{
  level: number;
  progressPct: number;
  onClick: () => void;
}> = ({ level, progressPct, onClick }) => {
  const safeLevel = Math.min(6, Math.max(1, level || 1));
  const tier = ROCKET_TIERS[safeLevel - 1];
  const safePct = Math.min(100, Math.max(0, progressPct || 0));

  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[46px] px-3 py-1.5 rounded-2xl bg-gradient-to-r from-[#07153B]/95 via-[#181242]/95 to-[#07153B]/95 border ${tier.borderClass} ${tier.glowStyle} flex items-center gap-2.5 hover:brightness-110 transition-all`}
      title="Xona raketasini ko‘rish"
    >
      <TuronRocketSvg tier={tier} className="w-7 h-9 shrink-0" />
      <div className="text-left min-w-[92px]">
        <div className="flex items-center justify-between gap-2">
          <span className={`font-display text-xs font-extrabold tracking-wide ${tier.badgeText}`}>
            Xona raketasi · {tier.label}
          </span>
          <span className="font-mono tabular-nums text-[11px] font-bold text-[#F5C451] flex items-center gap-0.5">
            <Zap className="w-3 h-3 fill-[#F5C451]" />
            {safePct}%
          </span>
        </div>
        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-900/90 border border-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-[#F5C451] transition-all duration-500"
            style={{ width: `${safePct}%` }}
          />
        </div>
      </div>
    </button>
  );
};

export const RoomRocketLaunchBanner: React.FC<{
  launchEvent: { rocketLevel: number; launchedBy: string } | null;
}> = ({ launchEvent }) => {
  const tier = launchEvent ? ROCKET_TIERS[Math.min(6, Math.max(1, launchEvent.rocketLevel)) - 1] : null;
  return (
    <AnimatePresence>
      {launchEvent && tier && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`relative z-20 mx-4 sm:mx-6 mt-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-[#0B1E59] via-[#3B0F7A] to-[#5C3103] border ${tier.borderClass} ${tier.glowStyle} flex items-center justify-between gap-3`}
        >
          <div className="flex items-center gap-3">
            <TuronRocketSvg tier={tier} className="w-9 h-12 shrink-0" />
            <div>
              <div className="font-display text-sm font-extrabold text-white flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-[#F5C451]" />
                <span>Xona Raketasi {tier.label} darajaga ko‘tarildi!</span>
              </div>
              <div className="text-xs text-amber-200 mt-0.5">
                {launchEvent.launchedBy} sovg‘asi bilan raketa parvoz qildi!
              </div>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-[#F5C451] shrink-0" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const RoomRocketModal: React.FC<{
  level: number;
  progressPct: number;
  canManageRibbon?: boolean;
  onOpenRibbonManager?: () => void;
  onClose: () => void;
  onOpenGiftShop: () => void;
}> = ({ level, progressPct, canManageRibbon, onOpenRibbonManager, onClose, onOpenGiftShop }) => {
  const safeLevel = Math.min(6, Math.max(1, level || 1));
  const safePct = Math.min(100, Math.max(0, progressPct || 0));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg rounded-[28px] overflow-hidden border-2 border-[#E5B84B]/70 bg-gradient-to-b from-[#04123D] via-[#0B1F63] to-[#040B24] p-5 shadow-[0_0_50px_rgba(59,130,246,0.45)] space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#FEF08A] to-[#D97706] flex items-center justify-center text-[#2B1200] shadow">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold tracking-wide text-white">
                TURON CHAT · Xona Raketasi
              </h3>
              <p className="text-xs text-sky-200">
                Sovg‘alar yuboring va raketalar parvozini tomosha qiling!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cosmic Rocket Fleet Stage (LV.1 - LV.6, NO points shown) */}
        <div className="grid grid-cols-12 gap-3 items-center">
          {/* Left Vertical LV.6 -> LV.1 Rail */}
          <div className="col-span-3 space-y-1.5">
            {[...ROCKET_TIERS].reverse().map((tier) => {
              const isCurrent = tier.level === safeLevel;
              const unlocked = tier.level <= safeLevel;
              return (
                <div
                  key={tier.level}
                  className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[11px] font-display font-bold ${
                    isCurrent
                      ? 'bg-amber-500/20 border-[#F5C451] text-[#FEF08A] shadow-[0_0_12px_rgba(245,196,81,0.45)]'
                      : unlocked
                      ? 'bg-[#081A52]/80 border-sky-400/40 text-white'
                      : 'bg-[#040D2B]/80 border-white/10 text-slate-400'
                  }`}
                >
                  <span>{tier.label}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: tier.bodyStart, opacity: unlocked ? 1 : 0.35 }}
                  />
                </div>
              );
            })}
          </div>

          {/* Right Main Rocket Fleet Showcase */}
          <div className="col-span-9 p-4 rounded-2xl bg-[#030C2A]/90 border border-sky-400/35 flex flex-col items-center justify-between gap-4">
            <div className="flex items-end justify-center gap-1.5 sm:gap-2.5 pt-2">
              {[...ROCKET_TIERS].reverse().map((tier) => {
                const unlocked = tier.level <= safeLevel;
                const isCurrent = tier.level === safeLevel;
                return (
                  <div key={tier.level} className="flex flex-col items-center">
                    <TuronRocketSvg
                      tier={tier}
                      active={unlocked}
                      className={isCurrent ? 'w-12 h-20' : 'w-9 h-16'}
                    />
                    <span
                      className={`mt-1 text-[10px] font-mono font-bold ${
                        unlocked ? tier.badgeText : 'text-slate-500'
                      }`}
                    >
                      {tier.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Energy Progress Bar (Percentage Only, No Points) */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-sky-100">
                  Joriy bosqich: {safeLevel} raketa ({ROCKET_TIERS[safeLevel - 1].label})
                </span>
                <span className="font-mono tabular-nums font-bold text-[#F5C451] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-[#F5C451]" />
                  {safePct}%
                </span>
              </div>
              <div className="h-4 w-full rounded-full bg-[#071338] border-2 border-[#E5B84B]/70 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-600 via-blue-500 to-sky-400 transition-all duration-500"
                  style={{ width: `${safePct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Rocket Count Tiers List (1 raketa .. 6 raketa, strictly no point numbers) */}
        <div className="grid grid-cols-3 gap-2">
          {ROCKET_TIERS.map((tier) => {
            const unlocked = tier.level <= safeLevel;
            return (
              <div
                key={tier.level}
                className={`px-3 py-2 rounded-xl border flex items-center gap-2 ${
                  unlocked
                    ? `bg-[#091D54]/90 ${tier.borderClass}`
                    : 'bg-[#040D2B]/80 border-white/10 opacity-60'
                }`}
              >
                <TuronRocketSvg tier={tier} active={unlocked} className="w-5 h-7 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{tier.countLabel}</div>
                  <div className={`text-[10px] font-mono ${tier.badgeText}`}>{tier.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenGiftShop();
            }}
            className="w-full min-h-[48px] rounded-full bg-gradient-to-r from-[#E5B84B] via-amber-400 to-[#E5B84B] text-[#1F0B00] font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(229,184,75,0.45)] hover:brightness-105 transition-all"
          >
            <Gift className="w-4 h-4" />
            <span>Sovg‘a yuborib raketani uchiring!</span>
          </button>

          {canManageRibbon && onOpenRibbonManager && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRibbonManager();
              }}
              className="w-full min-h-[42px] rounded-full bg-white/[0.08] hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E5B84B]" />
              <span>Raketa lentasiga narsa qo‘shish</span>
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
