import React, { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface SocialLinksConfig {
  telegram: string;
  instagram: string;
  youtube: string;
}

const DEFAULT_LINKS: SocialLinksConfig = {
  telegram: 'https://t.me/',
  instagram: 'https://www.instagram.com/',
  youtube: 'https://www.youtube.com/',
};

function normalizeSocialUrl(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const SocialPortalBanner: React.FC = () => {
  const [links, setLinks] = useState<SocialLinksConfig>(() => {
    try {
      const saved = localStorage.getItem('turon_social_portal_links');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          telegram: parsed.telegram || DEFAULT_LINKS.telegram,
          instagram: parsed.instagram || DEFAULT_LINKS.instagram,
          youtube: parsed.youtube || DEFAULT_LINKS.youtube,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_LINKS;
  });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SocialLinksConfig>(links);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cleaned: SocialLinksConfig = {
      telegram: normalizeSocialUrl(draft.telegram, DEFAULT_LINKS.telegram),
      instagram: normalizeSocialUrl(draft.instagram, DEFAULT_LINKS.instagram),
      youtube: normalizeSocialUrl(draft.youtube, DEFAULT_LINKS.youtube),
    };
    setLinks(cleaned);
    setDraft(cleaned);
    try {
      localStorage.setItem('turon_social_portal_links', JSON.stringify(cleaned));
    } catch {
      // ignore
    }
    setEditing(false);
  }

  return (
    <section
      aria-label="Ijtimoiy tarmoqlar"
      className="relative rounded-3xl overflow-hidden border-2 border-purple-400/75 bg-[#09061D] shadow-[0_0_38px_rgba(168,85,247,0.35)]"
    >
      {/* Scenic Night Mountains, Sakura Glow & Water Reflection Backdrop */}
      <svg
        viewBox="0 0 800 260"
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="portalSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#090723" />
            <stop offset="55%" stopColor="#2E1065" />
            <stop offset="100%" stopColor="#831843" stopOpacity="0.85" />
          </linearGradient>
          <radialGradient id="portalSunset" cx="50%" cy="62%" r="48%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.65" />
            <stop offset="45%" stopColor="#EC4899" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="portalWater" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#07051A" />
          </linearGradient>
        </defs>
        <rect width="800" height="175" fill="url(#portalSky)" />
        <rect width="800" height="175" fill="url(#portalSunset)" />
        {/* Crescent Moon & Stars */}
        <circle cx="175" cy="40" r="14" fill="#FDE68A" fillOpacity="0.8" />
        <circle cx="180" cy="36" r="12" fill="#090723" />
        <circle cx="90" cy="32" r="1.8" fill="#FFF" />
        <circle cx="290" cy="24" r="2" fill="#E9D5FF" />
        <circle cx="480" cy="30" r="1.8" fill="#FDE68A" />
        <circle cx="620" cy="44" r="2.2" fill="#FFF" />
        <circle cx="715" cy="28" r="1.5" fill="#F9A8D4" />
        {/* Mountains */}
        <path
          d="M0 175 L0 110 L95 72 L185 118 L285 68 L395 122 L505 74 L615 112 L715 64 L800 105 L800 175 Z"
          fill="#160B38"
          fillOpacity="0.92"
        />
        <path
          d="M0 175 L130 130 L250 154 L390 120 L535 152 L670 122 L800 148 L800 175 Z"
          fill="#0F0729"
        />
        {/* Lake Water & Shimmer */}
        <rect y="175" width="800" height="85" fill="url(#portalWater)" />
        <ellipse cx="260" cy="212" rx="70" ry="18" fill="#38BDF8" fillOpacity="0.16" />
        <ellipse cx="400" cy="215" rx="75" ry="20" fill="#EC4899" fillOpacity="0.18" />
        <ellipse cx="540" cy="212" rx="70" ry="18" fill="#EF4444" fillOpacity="0.18" />
      </svg>

      {/* Optional Links Customizer Button */}
      <button
        type="button"
        onClick={() => {
          setDraft(links);
          setEditing(true);
        }}
        title="Havolalarni sozlash"
        aria-label="Ijtimoiy tarmoq havolalarini sozlash"
        className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/45 hover:bg-black/70 border border-white/20 text-slate-200 flex items-center justify-center transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {/* Center 3 Glossy Interactive Buttons: Telegram, Instagram, YouTube */}
      <div className="relative z-10 px-4 sm:px-8 py-8 sm:py-10 flex items-center justify-center gap-5 sm:gap-10">
        {/* TELEGRAM */}
        <a
          href={links.telegram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Telegramga kirish"
          className="group flex flex-col items-center gap-2 focus:outline-none"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#38BDF8] via-[#0EA5E9] to-[#0284C7] border-2 border-sky-200/75 shadow-[0_10px_28px_rgba(14,165,233,0.55)] flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform">
            <svg viewBox="0 0 64 64" className="w-11 h-11 sm:w-13 sm:h-13 -ml-1" aria-hidden="true">
              <path
                d="M52 14 L12 29.5 C9.8 30.4 9.9 32.1 11.7 32.7 L21.8 35.9 L44.8 21.5 C45.9 20.8 46.9 21.2 46.1 21.9 L27.4 38.7 L26.7 48.2 C27.7 48.2 28.2 47.7 28.8 47.1 L33.8 42.3 L44.1 49.9 C46 50.9 47.4 50.4 47.9 48.1 L54.6 16.6 C55.2 14.1 53.7 13.3 52 14 Z"
                fill="#FFFFFF"
              />
            </svg>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-black/55 border border-sky-400/40 text-xs font-semibold text-sky-100">
            Telegram
          </span>
        </a>

        {/* INSTAGRAM */}
        <a
          href={links.instagram}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagramga kirish"
          className="group flex flex-col items-center gap-2 focus:outline-none"
        >
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-[24px] border-2 border-pink-200/75 shadow-[0_10px_28px_rgba(236,72,153,0.55)] flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform"
            style={{
              background:
                'radial-gradient(circle at 28% 107%, #FDF497 0%, #FDF497 5%, #FD5949 45%, #D6249F 68%, #285AEB 95%)',
            }}
          >
            <svg viewBox="0 0 64 64" className="w-12 h-12 sm:w-14 sm:h-14" aria-hidden="true">
              <rect
                x="13"
                y="13"
                width="38"
                height="38"
                rx="11"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="4.5"
              />
              <circle cx="32" cy="32" r="9.5" fill="none" stroke="#FFFFFF" strokeWidth="4.5" />
              <circle cx="43.5" cy="20.5" r="2.8" fill="#FFFFFF" />
            </svg>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-black/55 border border-pink-400/40 text-xs font-semibold text-pink-100">
            Instagram
          </span>
        </a>

        {/* YOUTUBE */}
        <a
          href={links.youtube}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTubega kirish"
          className="group flex flex-col items-center gap-2 focus:outline-none"
        >
          <div className="w-24 h-20 sm:w-28 sm:h-24 rounded-[24px] bg-gradient-to-br from-[#FF2B2B] via-[#DC2626] to-[#991B1B] border-2 border-red-200/75 shadow-[0_10px_28px_rgba(239,68,68,0.55)] flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform">
            <svg viewBox="0 0 64 64" className="w-12 h-12 sm:w-14 sm:h-14 ml-1" aria-hidden="true">
              <polygon points="22,16 49,32 22,48" fill="#FFFFFF" />
            </svg>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-black/55 border border-red-400/40 text-xs font-semibold text-red-100">
            YouTube
          </span>
        </a>
      </div>

      {/* Edit Links Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1524] border border-purple-400/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base font-bold text-white">
                Ijtimoiy tarmoq havolalari
              </h4>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Telegram havolasi</label>
                <input
                  type="text"
                  value={draft.telegram}
                  onChange={(e) => setDraft({ ...draft, telegram: e.target.value })}
                  placeholder="https://t.me/"
                  className="w-full min-h-[42px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Instagram havolasi</label>
                <input
                  type="text"
                  value={draft.instagram}
                  onChange={(e) => setDraft({ ...draft, instagram: e.target.value })}
                  placeholder="https://www.instagram.com/"
                  className="w-full min-h-[42px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">YouTube havolasi</label>
                <input
                  type="text"
                  value={draft.youtube}
                  onChange={(e) => setDraft({ ...draft, youtube: e.target.value })}
                  placeholder="https://www.youtube.com/"
                  className="w-full min-h-[42px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[42px] rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Saqlash</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
