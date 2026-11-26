import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Send,
  Settings2,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { PrivateMessage, RibbonLogo, RibbonLogoCategory, UserProfile } from '../types/turon';

interface RotatingLogoRibbonProps {
  logos: RibbonLogo[];
  users: UserProfile[];
  currentUserId: string;
  isStaff?: boolean;
  onOpenManageLogos?: () => void;
  onOpenDirectChat?: (partnerId: string) => void;
}

const FALLBACK_BANNER_IMG = '/src/assets/images/turon_hero_banner_1794822313365.jpg';

function getCategoryAccent(cat: RibbonLogoCategory) {
  if (cat === 'diler') {
    return {
      border: 'border-[#FACC15]/60 hover:border-[#FEF08A]',
      glow: 'from-amber-500/25 via-[#0B1026]/55 to-[#080B14]/85',
      shadow: 'shadow-[0_0_18px_rgba(250,204,21,0.22)]',
      roleLabel: 'Rasmiy Tanga Dileri',
    };
  }
  if (cat === 'admin') {
    return {
      border: 'border-purple-400/60 hover:border-purple-200',
      glow: 'from-purple-600/30 via-[#150A33]/55 to-[#080B14]/85',
      shadow: 'shadow-[0_0_18px_rgba(192,132,252,0.22)]',
      roleLabel: 'Boshqaruv Admini',
    };
  }
  return {
    border: 'border-sky-400/60 hover:border-sky-200',
    glow: 'from-sky-500/25 via-[#091633]/55 to-[#080B14]/85',
    shadow: 'shadow-[0_0_18px_rgba(56,189,248,0.22)]',
    roleLabel: 'Rasmiy Kanal / Aloqa',
  };
}

function normalizeExternalTelegramUrl(raw: string): string | null {
  const val = raw.trim();
  if (!val) return null;
  if (/^https?:\/\/(t\.me|telegram\.me)\/?$/i.test(val)) return null;
  if (/^https?:\/\//i.test(val)) return val;
  if (val.startsWith('@') && val.length > 2) return `https://t.me/${val.slice(1)}`;
  if (/^(t\.me|telegram\.me)\/[a-zA-Z0-9_]{3,}/i.test(val)) {
    return `https://${val}`;
  }
  return null;
}

function resolvePartnerForLogo(
  logo: RibbonLogo,
  users: UserProfile[],
  currentUserId: string
): UserProfile | null {
  const others = users.filter((u) => u.id !== currentUserId);
  if (others.length === 0) return null;

  const target = (logo.targetUrl || '').trim().toLowerCase();
  if (target) {
    const direct = others.find(
      (u) =>
        u.id.toLowerCase() === target ||
        u.publicId.toLowerCase() === target ||
        target.includes(u.publicId.toLowerCase()) ||
        target.includes(u.id.toLowerCase())
    );
    if (direct) return direct;
  }

  if (logo.category === 'diler') {
    return (
      others.find((u) => u.role === 'agent') ||
      others.find((u) => u.role === 'agency_head') ||
      others.find((u) => u.role === 'founder') ||
      others.find((u) => u.role === 'super_admin') ||
      others[0]
    );
  }
  if (logo.category === 'admin') {
    return (
      others.find((u) => u.role === 'admin') ||
      others.find((u) => u.role === 'super_admin') ||
      others.find((u) => u.role === 'moderator') ||
      others.find((u) => u.role === 'founder') ||
      others[0]
    );
  }

  return (
    others.find((u) => u.role === 'founder' || u.role === 'super_admin' || u.role === 'admin') ||
    others[0]
  );
}

const CustomCategoryEmblemSvg: React.FC<{ category: RibbonLogoCategory; className?: string }> = ({
  category,
  className = 'w-14 h-14',
}) => {
  if (category === 'diler') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="em-diler" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#em-diler)" stroke="#FEF9C3" strokeWidth="2" />
        <circle cx="32" cy="32" r="19" fill="#451A03" fillOpacity="0.35" stroke="#FEF08A" strokeWidth="1.5" strokeDasharray="3 2" />
        <polygon points="32,14 45,26 32,48 19,26" fill="#FEF08A" stroke="#78350F" strokeWidth="1.5" />
        <polygon points="32,14 45,26 32,29 19,26" fill="#FFFFFF" opacity="0.55" />
      </svg>
    );
  }
  if (category === 'admin') {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
        <defs>
          <linearGradient id="em-admin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="55%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#3B0764" />
          </linearGradient>
        </defs>
        <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#em-admin)" stroke="#E9D5FF" strokeWidth="2" />
        <path
          d="M17 42 L15 24 L25 32 L32 18 L39 32 L49 24 L47 42 Z"
          fill="#FDE047"
          stroke="#78350F"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <rect x="17" y="44" width="30" height="5" rx="2.5" fill="#FEF08A" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="em-tg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#em-tg)" stroke="#BAE6FD" strokeWidth="2" />
      <path
        d="M48 18 L14 31 L25 36 L43 24 L29 38 L39 46 Z"
        fill="#FFFFFF"
        stroke="#0C4A6E"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const LogoEmblem: React.FC<{ logo: RibbonLogo; size?: 'md' | 'lg' }> = ({
  logo,
  size = 'md',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const dimClass = size === 'lg' ? 'w-16 h-16 rounded-2xl' : 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl';

  if (logo.imageUrl && !imgFailed) {
    return (
      <div className={`${dimClass} overflow-hidden border border-white/25 bg-[#0A1128] shrink-0 shadow-lg`}>
        <img
          src={logo.imageUrl}
          alt={logo.name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return <CustomCategoryEmblemSvg category={logo.category} className={`${dimClass} shrink-0 drop-shadow-md`} />;
};

export const RotatingLogoRibbon: React.FC<RotatingLogoRibbonProps> = ({
  logos,
  users,
  currentUserId,
  isStaff = false,
  onOpenManageLogos,
  onOpenDirectChat,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<RibbonLogo | null>(null);
  const [quickMessage, setQuickMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentNotice, setSentNotice] = useState('');

  const activeLogos = useMemo(() => logos.filter((l) => l.isActive), [logos]);

  useEffect(() => {
    if (activeIdx >= activeLogos.length) {
      setActiveIdx(0);
    }
  }, [activeLogos.length, activeIdx]);

  useEffect(() => {
    if (activeLogos.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % activeLogos.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [activeLogos.length, paused]);

  if (activeLogos.length === 0 && !isStaff) {
    return null;
  }

  const selectedPartner = selectedLogo
    ? resolvePartnerForLogo(selectedLogo, users, currentUserId)
    : null;
  const externalUrl = selectedLogo ? normalizeExternalTelegramUrl(selectedLogo.targetUrl) : null;

  function goPrev(e: React.MouseEvent) {
    e.stopPropagation();
    if (activeLogos.length <= 1) return;
    setActiveIdx((prev) => (prev - 1 + activeLogos.length) % activeLogos.length);
  }

  function goNext(e: React.MouseEvent) {
    e.stopPropagation();
    if (activeLogos.length <= 1) return;
    setActiveIdx((prev) => (prev + 1) % activeLogos.length);
  }

  function openLogoAction(logo: RibbonLogo) {
    setSelectedLogo(logo);
    setSendError('');
    setSentNotice('');
    setQuickMessage(
      logo.category === 'diler'
        ? 'Assalomu alaykum! Tanga xaridi bo‘yicha ma’lumot bera olasizmi?'
        : logo.category === 'admin'
        ? 'Assalomu alaykum! Yordam kerak edi.'
        : ''
    );
  }

  async function handleSendQuickChat(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPartner || !quickMessage.trim() || sending) return;
    setSending(true);
    setSendError('');
    setSentNotice('');
    try {
      await apiFetch<{ message: PrivateMessage }>(`/api/messages/${selectedPartner.id}`, {
        method: 'POST',
        body: JSON.stringify({ content: quickMessage.trim() }),
      });
      setSentNotice('Xabaringiz yuborildi!');
      setQuickMessage('');
      if (onOpenDirectChat) {
        const targetId = selectedPartner.id;
        setTimeout(() => {
          setSelectedLogo(null);
          onOpenDirectChat(targetId);
        }, 450);
      }
    } catch (err: any) {
      setSendError(err?.message || 'Xabar yuborib bo‘lmadi');
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      aria-label="Aylanma banner lentasi"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative rounded-3xl overflow-hidden border border-purple-400/40 bg-[#0B1026] shadow-[0_0_28px_rgba(124,58,237,0.2)]"
    >
      {/* Staff-only compact gear icon overlay */}
      {isStaff && onOpenManageLogos && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenManageLogos();
          }}
          className="absolute top-2.5 right-2.5 z-30 w-8 h-8 rounded-full bg-[#1E1044]/90 border border-purple-300/40 text-amber-300 hover:bg-purple-700/70 flex items-center justify-center shadow"
          title="Logotiplarni boshqarish"
          aria-label="Logotiplarni boshqarish"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      )}

      {activeLogos.length === 0 ? (
        <div className="relative h-28 sm:h-32 w-full flex items-center justify-center overflow-hidden">
          <img
            src={FALLBACK_BANNER_IMG}
            alt="TURON CHAT"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#080B14]/60" />
          <div className="relative z-10 text-xs text-slate-200 font-medium">
            Aylanma banner bo‘sh — sozlamalardan qo‘shing
          </div>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          {/* Sequential 1-by-1 Sliding Track (One full banner at a time) */}
          <div
            className="flex transition-transform duration-700 ease-in-out"
            style={{ transform: `translate3d(-${activeIdx * 100}%, 0, 0)` }}
          >
            {activeLogos.map((logo) => {
              const accent = getCategoryAccent(logo.category);
              const hasCustomPhoto = Boolean(logo.imageUrl && logo.imageUrl.trim());
              return (
                <button
                  key={logo.id}
                  type="button"
                  onClick={() => openLogoAction(logo)}
                  aria-label={logo.name}
                  className="relative w-full shrink-0 h-28 sm:h-32 text-left overflow-hidden focus:outline-none group"
                >
                  {/* Full-bleed Single Image Slide */}
                  <img
                    src={hasCustomPhoto ? logo.imageUrl : FALLBACK_BANNER_IMG}
                    alt={logo.name}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${accent.glow}`}
                  />

                  {/* Subtle centered single emblem + caption when custom image isn't a wide banner */}
                  {!hasCustomPhoto ? (
                    <div className="relative z-10 h-full px-12 sm:px-14 flex items-center justify-center gap-3.5">
                      <CustomCategoryEmblemSvg
                        category={logo.category}
                        className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 drop-shadow-lg"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#F5C451]">
                          {accent.roleLabel}
                        </div>
                        <div className="font-display text-base sm:text-lg font-extrabold text-white truncate">
                          {logo.name}
                        </div>
                        {logo.subtitle && (
                          <div className="text-xs text-slate-200/85 truncate">{logo.subtitle}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 h-full px-12 flex items-end pb-3">
                      <div className="px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/15 text-xs font-semibold text-white truncate max-w-[85%]">
                        {logo.name}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Left & Right Carousel Switcher Buttons */}
          {activeLogos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/55 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                aria-label="Oldingi rasm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/55 hover:bg-black/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                aria-label="Keyingi rasm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Sequential Indicator Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                {activeLogos.map((logo, idx) => (
                  <button
                    key={logo.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveIdx(idx);
                    }}
                    aria-label={`${idx + 1}-slayd`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activeIdx
                        ? 'w-5 bg-[#FACC15]'
                        : 'w-1.5 bg-white/45 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Interactive Chat / Contact Modal when clicking a banner slide */}
      {selectedLogo && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0F1733] border border-purple-400/45 p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <LogoEmblem logo={selectedLogo} size="lg" />
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#F5C451]">
                    {getCategoryAccent(selectedLogo.category).roleLabel}
                  </div>
                  <h3 className="font-display text-lg font-bold text-white truncate">
                    {selectedLogo.name}
                  </h3>
                  {selectedLogo.subtitle && (
                    <p className="text-xs text-slate-300 truncate">{selectedLogo.subtitle}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogo(null)}
                className="min-h-[38px] min-w-[38px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] px-4 rounded-xl bg-sky-600/25 border border-sky-400/50 text-sky-200 hover:bg-sky-600/35 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Telegram orqali ochish</span>
              </a>
            )}

            {selectedPartner && (
              <div className="space-y-3 pt-1 border-t border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={selectedPartner.avatarUrl}
                      alt={selectedPartner.nickname}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-amber-300/60"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {selectedPartner.nickname}
                      </div>
                      <div className="text-[11px] text-emerald-400">
                        {selectedLogo.category === 'diler'
                          ? 'Diler chatga yozish'
                          : 'Mas’ul bilan chatga yozish'}
                      </div>
                    </div>
                  </div>
                  {onOpenDirectChat && (
                    <button
                      type="button"
                      onClick={() => {
                        const id = selectedPartner.id;
                        setSelectedLogo(null);
                        onOpenDirectChat(id);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-amber-200 flex items-center gap-1.5 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Chatga o‘tish</span>
                    </button>
                  )}
                </div>

                {selectedLogo.category === 'diler' && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Tanga olmoqchiman',
                      'Tanga narxlari qancha?',
                      'VIP paket olmoqchi edim',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuickMessage(preset)}
                        className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/35 text-[11px] text-amber-200 hover:bg-amber-400/25"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}

                {sendError && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-400/35 text-xs text-rose-200">
                    {sendError}
                  </div>
                )}
                {sentNotice && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-xs text-emerald-200">
                    {sentNotice}
                  </div>
                )}

                <form onSubmit={handleSendQuickChat} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="Xabar matnini yozing..."
                    className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#080B14] border border-white/15 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !quickMessage.trim()}
                    className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#1A0800] font-bold text-sm flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Yuborish</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
