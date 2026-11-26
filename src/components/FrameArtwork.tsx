import React from 'react';
import type { StoreFrameItem, StoreFrameTier } from '../types/turon';
import { getFrameCatalogItem, type FrameVisualSpec } from '../lib/framesCatalog';

export const TierCrestBadge: React.FC<{ tier: StoreFrameTier }> = ({ tier }) => {
  if (tier === 'SS') {
    return (
      <svg viewBox="0 0 44 36" className="w-9 h-7 drop-shadow-[0_2px_6px_rgba(245,158,11,0.5)]" aria-label="SS daraja">
        <defs>
          <linearGradient id="crestSSGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
        </defs>
        <path d="M5 10 L14 14 L12 22 L4 18 Z M39 10 L30 14 L32 22 L40 18 Z" fill="url(#crestSSGold)" />
        <path d="M13 7 L22 3 L31 7 L29 24 L22 32 L15 24 Z" fill="#991B1B" stroke="url(#crestSSGold)" strokeWidth="2" />
        <text x="22" y="21" textAnchor="middle" fill="#FEF08A" fontSize="11" fontWeight="900" fontFamily="sans-serif">
          SS
        </text>
      </svg>
    );
  }
  if (tier === 'S') {
    return (
      <svg viewBox="0 0 44 36" className="w-9 h-7 drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]" aria-label="S daraja">
        <defs>
          <linearGradient id="crestSGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF9C3" />
            <stop offset="55%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
        </defs>
        <path d="M6 12 L14 15 L12 21 L6 18 Z M38 12 L30 15 L32 21 L38 18 Z" fill="url(#crestSGold)" />
        <path d="M14 7 L22 4 L30 7 L28 24 L22 31 L16 24 Z" fill="#B45309" stroke="#FEF08A" strokeWidth="1.8" />
        <text x="22" y="21" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900" fontFamily="sans-serif">
          S
        </text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 36" className="w-8 h-7 drop-shadow-[0_2px_5px_rgba(148,163,184,0.35)]" aria-label="A daraja">
      <defs>
        <linearGradient id="crestASilver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="55%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <path d="M11 7 L20 3 L29 7 L27 24 L20 31 L13 24 Z" fill="#334155" stroke="url(#crestASilver)" strokeWidth="2" />
      <text x="20" y="21" textAnchor="middle" fill="#E2E8F0" fontSize="12" fontWeight="900" fontFamily="sans-serif">
        A
      </text>
    </svg>
  );
};

export const FrameSvg: React.FC<{
  frameId: string;
  sizeClass?: string;
  avatarUrl?: string;
}> = ({ frameId, sizeClass = 'w-28 h-28', avatarUrl }) => {
  return (
    <div className={`relative flex items-center justify-center ${sizeClass} select-none`}>
      {/* Center Avatar inside Preview if provided */}
      {avatarUrl && (
        <div className="w-[62%] h-[62%] rounded-full overflow-hidden bg-[#0F172A] border border-white/20">
          <img
            src={avatarUrl}
            alt="Profil"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {frameId === 'frame-ss-imperial' && (
        <svg viewBox="0 0 140 140" className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_12px_rgba(168,85,247,0.55)]">
          <defs>
            <linearGradient id="ssGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
            <linearGradient id="ssViolet" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F3E8FF" />
              <stop offset="50%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#4C1D95" />
            </linearGradient>
          </defs>
          {/* Violet crystal wings */}
          <path d="M26 78 L8 58 L22 60 L14 40 L34 56 Z" fill="url(#ssViolet)" stroke="#E9D5FF" strokeWidth="1" />
          <path d="M114 78 L132 58 L118 60 L126 40 L106 56 Z" fill="url(#ssViolet)" stroke="#E9D5FF" strokeWidth="1" />
          <path d="M24 92 L12 108 L34 106 L44 122 L56 112 Z" fill="url(#ssViolet)" stroke="#FDE68A" strokeWidth="1" />
          <path d="M116 92 L128 108 L106 106 L96 122 L84 112 Z" fill="url(#ssViolet)" stroke="#FDE68A" strokeWidth="1" />
          {/* Top Winged Crown */}
          <path d="M40 34 L30 16 L54 26 L70 10 L86 26 L110 16 L100 34 Z" fill="url(#ssGold)" stroke="#451A03" strokeWidth="1.2" />
          <polygon points="70,18 76,28 70,38 64,28" fill="url(#ssViolet)" stroke="#FEF08A" strokeWidth="1" />
          {/* Ornate Outer Frame */}
          <circle cx="70" cy="74" r="44" fill="none" stroke="url(#ssGold)" strokeWidth="7" />
          <circle cx="70" cy="74" r="48" fill="none" stroke="#C084FC" strokeWidth="1.8" strokeDasharray="10 4" />
          {/* Bottom Heart Jewel */}
          <polygon points="70,111 78,120 70,129 62,120" fill="url(#ssViolet)" stroke="#FEF08A" strokeWidth="1.4" />
          {/* Sparkles */}
          <circle cx="22" cy="34" r="2" fill="#FEF08A" />
          <circle cx="118" cy="34" r="2" fill="#E9D5FF" />
          <circle cx="126" cy="84" r="1.8" fill="#FEF08A" />
        </svg>
      )}

      {frameId === 'frame-s-cyber' && (
        <svg viewBox="0 0 140 140" className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_12px_rgba(56,189,248,0.55)]">
          <defs>
            <linearGradient id="sSilver" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="45%" stopColor="#CBD5E1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
            <linearGradient id="sIce" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          {/* Cyber Ice Wings */}
          <path d="M26 70 L8 48 L24 52 L16 32 L36 48 Z" fill="url(#sIce)" stroke="#E0F2FE" strokeWidth="1" />
          <path d="M114 70 L132 48 L116 52 L124 32 L104 48 Z" fill="url(#sIce)" stroke="#E0F2FE" strokeWidth="1" />
          <path d="M22 86 L12 104 L34 102 L48 118 L54 106 Z" fill="url(#sSilver)" stroke="#38BDF8" strokeWidth="1" />
          <path d="M118 86 L128 104 L106 102 L92 118 L86 106 Z" fill="url(#sSilver)" stroke="#38BDF8" strokeWidth="1" />
          {/* Top Diamond Crest */}
          <path d="M44 30 L56 16 L70 24 L84 16 L96 30 Z" fill="url(#sSilver)" stroke="#0F172A" strokeWidth="1" />
          <polygon points="70,13 77,24 70,35 63,24" fill="url(#sIce)" stroke="#FFFFFF" strokeWidth="1.2" />
          {/* Metallic Silver + Cyan Ring */}
          <circle cx="70" cy="72" r="43" fill="none" stroke="url(#sSilver)" strokeWidth="6.5" />
          <circle cx="70" cy="72" r="47" fill="none" stroke="#38BDF8" strokeWidth="2" />
          <polygon points="70,109 77,118 70,127 63,118" fill="url(#sIce)" stroke="#FFFFFF" strokeWidth="1.2" />
          <circle cx="24" cy="40" r="2" fill="#BAE6FD" />
          <circle cx="116" cy="40" r="2" fill="#BAE6FD" />
        </svg>
      )}

      {frameId === 'frame-a-speed' && (
        <svg viewBox="0 0 140 140" className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_12px_rgba(249,115,22,0.45)]">
          <defs>
            <linearGradient id="spdRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FB923C" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
          {/* Checkered Flags Top Left & Right */}
          <g transform="translate(18,22) rotate(-25)">
            <rect width="22" height="14" rx="2" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />
            <rect width="7" height="7" fill="#0F172A" />
            <rect x="14" width="8" height="7" fill="#0F172A" />
            <rect x="7" y="7" width="7" height="7" fill="#0F172A" />
          </g>
          <g transform="translate(100,13) rotate(25)">
            <rect width="22" height="14" rx="2" fill="#FFFFFF" stroke="#1E293B" strokeWidth="1" />
            <rect width="7" height="7" fill="#0F172A" />
            <rect x="14" width="8" height="7" fill="#0F172A" />
            <rect x="7" y="7" width="7" height="7" fill="#0F172A" />
          </g>
          {/* Ring */}
          <circle cx="70" cy="70" r="43" fill="none" stroke="url(#spdRing)" strokeWidth="7" />
          <circle cx="70" cy="70" r="47" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Top SPEED Banner */}
          <rect x="44" y="18" width="52" height="15" rx="5" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
          <text x="70" y="29" textAnchor="middle" fill="#FDE047" fontSize="9.5" fontWeight="900" fontFamily="sans-serif">
            SPEED
          </text>
          {/* Bottom Orange Supercar Silhouette */}
          <path d="M40 116 L48 102 L92 102 L100 116 L96 123 L44 123 Z" fill="#F97316" stroke="#FEF08A" strokeWidth="1.3" />
          <path d="M53 102 L60 95 L80 95 L87 102 Z" fill="#1E293B" />
          <ellipse cx="49" cy="115" rx="4" ry="2.2" fill="#FEF08A" />
          <ellipse cx="91" cy="115" rx="4" ry="2.2" fill="#FEF08A" />
        </svg>
      )}

      {frameId === 'frame-a-moon' && (
        <svg viewBox="0 0 140 140" className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_12px_rgba(37,99,235,0.55)]">
          <defs>
            <linearGradient id="moonBlue" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="55%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>
          </defs>
          {/* Starry Blue Frame Ring */}
          <circle cx="70" cy="72" r="44" fill="none" stroke="url(#moonBlue)" strokeWidth="7.5" />
          <circle cx="70" cy="72" r="48" fill="none" stroke="#93C5FD" strokeWidth="1.3" strokeDasharray="5 4" />
          {/* Golden Crescent Moon Top */}
          <path d="M62 12 A15 15 0 1 0 84 28 A11 11 0 1 1 62 12 Z" fill="#FDE047" stroke="#B45309" strokeWidth="1" />
          {/* Hanging Lanterns Left & Right */}
          <line x1="25" y1="54" x2="25" y2="66" stroke="#FDE68A" strokeWidth="1.2" />
          <rect x="21" y="66" width="8" height="12" rx="3" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1" />
          <line x1="115" y1="54" x2="115" y2="66" stroke="#FDE68A" strokeWidth="1.2" />
          <rect x="111" y="66" width="8" height="12" rx="3" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1" />
          {/* Bottom Ribbon Banner */}
          <rect x="42" y="110" width="56" height="14" rx="7" fill="#0F172A" stroke="#60A5FA" strokeWidth="1.4" />
          <text x="70" y="120" textAnchor="middle" fill="#BAE6FD" fontSize="8" fontWeight="800" fontFamily="sans-serif">
            HILOL NUR
          </text>
          <circle cx="34" cy="30" r="2" fill="#FEF08A" />
          <circle cx="104" cy="28" r="2" fill="#BAE6FD" />
        </svg>
      )}

      {frameId === 'frame-a-drift' && (
        <svg viewBox="0 0 140 140" className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
          <defs>
            <linearGradient id="driftGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
          </defs>
          {/* Golden Laurel Wings */}
          <path d="M24 94 C12 72, 16 42, 36 26 C26 48, 24 72, 34 94 Z" fill="url(#driftGold)" />
          <path d="M116 94 C128 72, 124 42, 104 26 C114 48, 116 72, 106 94 Z" fill="url(#driftGold)" />
          {/* Ring */}
          <circle cx="70" cy="68" r="43" fill="none" stroke="url(#driftGold)" strokeWidth="6.5" />
          <circle cx="70" cy="68" r="47" fill="none" stroke="#38BDF8" strokeWidth="1.5" />
          <polygon points="70,18 76,26 70,34 64,26" fill="#38BDF8" stroke="#FEF08A" strokeWidth="1.2" />
          {/* Twin Drift Cars Bottom */}
          <path d="M35 117 L43 106 L72 106 L78 117 L75 123 L38 123 Z" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.2" />
          <path d="M68 117 L75 107 L101 107 L107 117 L104 123 L70 123 Z" fill="#2563EB" stroke="#93C5FD" strokeWidth="1.2" />
        </svg>
      )}

      {frameId === 'frame-a-mecha' && (
        <svg viewBox="0 0 140 140" className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]">
          <defs>
            <linearGradient id="mechaCyan" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="50%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>
          <polygon
            points="44,19 96,19 121,44 121,96 96,121 44,121 19,96 19,44"
            fill="none"
            stroke="url(#mechaCyan)"
            strokeWidth="6.5"
          />
          <polygon
            points="47,23 93,23 117,47 117,93 93,117 47,117 23,93 23,47"
            fill="none"
            stroke="#93C5FD"
            strokeWidth="1.6"
          />
          <rect x="52" y="13" width="36" height="8" rx="2" fill="#0F172A" stroke="#22D3EE" strokeWidth="1.4" />
          <rect x="54" y="119" width="32" height="8" rx="2" fill="#0F172A" stroke="#22D3EE" strokeWidth="1.4" />
          <circle cx="22" cy="46" r="3.5" fill="#22D3EE" />
          <circle cx="118" cy="46" r="3.5" fill="#22D3EE" />
          <circle cx="22" cy="94" r="3.5" fill="#38BDF8" />
          <circle cx="118" cy="94" r="3.5" fill="#38BDF8" />
        </svg>
      )}

      {(() => {
        const catalogItem = getFrameCatalogItem(frameId);
        if (catalogItem?.visual) {
          return <ArchetypeFrameSvg frameId={frameId} visual={catalogItem.visual} />;
        }
        return null;
      })()}
    </div>
  );
};

const ArchetypeFrameSvg: React.FC<{ frameId: string; visual: FrameVisualSpec }> = ({
  frameId,
  visual,
}) => {
  const uid = frameId.replace(/[^a-zA-Z0-9_-]/g, '');
  const gradMain = `gMain-${uid}`;
  const gradAlt = `gAlt-${uid}`;
  const { archetype, primary, secondary, accent, glow, labelTag } = visual;

  return (
    <svg
      viewBox="0 0 140 140"
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ filter: `drop-shadow(0 0 10px ${glow})` }}
    >
      <defs>
        <linearGradient id={gradMain} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={accent} />
          <stop offset="50%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
        <linearGradient id={gradAlt} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>

      {archetype === 'crown' && (
        <>
          <circle cx="70" cy="74" r="44" fill="none" stroke={`url(#${gradMain})`} strokeWidth="6.5" />
          <circle cx="70" cy="74" r="49" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="7 4" />
          <path
            d="M42 33 L33 14 L55 25 L70 9 L85 25 L107 14 L98 33 Z"
            fill={`url(#${gradMain})`}
            stroke={secondary}
            strokeWidth="1.2"
          />
          <polygon points="70,17 75,26 70,35 65,26" fill={accent} stroke={secondary} strokeWidth="1" />
          <circle cx="48" cy="24" r="2.3" fill={accent} />
          <circle cx="92" cy="24" r="2.3" fill={accent} />
          <polygon points="70,111 77,119 70,127 63,119" fill={`url(#${gradAlt})`} stroke={accent} strokeWidth="1.2" />
        </>
      )}

      {archetype === 'wings' && (
        <>
          <path d="M27 72 L7 48 L22 52 L14 32 L36 49 Z" fill={`url(#${gradMain})`} stroke={accent} strokeWidth="1" />
          <path d="M113 72 L133 48 L118 52 L126 32 L104 49 Z" fill={`url(#${gradMain})`} stroke={accent} strokeWidth="1" />
          <path d="M24 92 L12 108 L34 105 L46 121 L55 109 Z" fill={`url(#${gradAlt})`} stroke={accent} strokeWidth="0.9" />
          <path d="M116 92 L128 108 L106 105 L94 121 L85 109 Z" fill={`url(#${gradAlt})`} stroke={accent} strokeWidth="0.9" />
          <circle cx="70" cy="72" r="43" fill="none" stroke={`url(#${gradMain})`} strokeWidth="6.5" />
          <circle cx="70" cy="72" r="47" fill="none" stroke={accent} strokeWidth="1.6" />
          <polygon points="70,18 77,28 70,37 63,28" fill={accent} stroke={secondary} strokeWidth="1.2" />
          <polygon points="70,108 77,118 70,128 63,118" fill={`url(#${gradMain})`} stroke={accent} strokeWidth="1.2" />
        </>
      )}

      {archetype === 'orbit' && (
        <>
          <ellipse
            cx="70"
            cy="72"
            rx="58"
            ry="22"
            transform="rotate(-24 70 72)"
            fill="none"
            stroke={accent}
            strokeWidth="2.2"
            strokeDasharray="10 4"
            opacity="0.9"
          />
          <circle cx="70" cy="72" r="43" fill="none" stroke={`url(#${gradMain})`} strokeWidth="6.5" />
          <circle cx="70" cy="72" r="48" fill="none" stroke={primary} strokeWidth="1.4" strokeDasharray="3 5" />
          <circle cx="24" cy="48" r="4.5" fill={accent} stroke={secondary} strokeWidth="1.2" />
          <circle cx="116" cy="96" r="4" fill={primary} stroke={accent} strokeWidth="1.2" />
          <polygon points="70,17 73,24 80,25 74,30 76,37 70,33 64,37 66,30 60,25 67,24" fill={accent} />
        </>
      )}

      {archetype === 'floral' && (
        <>
          <circle cx="70" cy="72" r="43" fill="none" stroke={`url(#${gradMain})`} strokeWidth="6" />
          <circle cx="70" cy="72" r="48" fill="none" stroke={accent} strokeWidth="1.4" strokeDasharray="4 6" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <g key={deg} transform={`rotate(${deg} 70 72)`}>
              <ellipse cx="70" cy="24" rx="6" ry="9" fill={`url(#${gradMain})`} stroke={accent} strokeWidth="1" />
              <circle cx="70" cy="24" r="2.2" fill={accent} />
            </g>
          ))}
        </>
      )}

      {archetype === 'cyber' && (
        <>
          <polygon
            points="44,19 96,19 121,44 121,96 96,121 44,121 19,96 19,44"
            fill="none"
            stroke={`url(#${gradMain})`}
            strokeWidth="6.5"
          />
          <polygon
            points="47,23 93,23 117,47 117,93 93,117 47,117 23,93 23,47"
            fill="none"
            stroke={accent}
            strokeWidth="1.8"
          />
          <circle cx="22" cy="46" r="3.8" fill={accent} />
          <circle cx="118" cy="46" r="3.8" fill={accent} />
          <circle cx="22" cy="94" r="3.8" fill={primary} />
          <circle cx="118" cy="94" r="3.8" fill={primary} />
          <path d="M52 17 H88" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        </>
      )}

      {archetype === 'flame' && (
        <>
          <circle cx="70" cy="72" r="43" fill="none" stroke={`url(#${gradMain})`} strokeWidth="7" />
          <path
            d="M25 84 C14 66, 22 44, 34 32 C28 48, 30 62, 34 74 Z"
            fill={`url(#${gradMain})`}
          />
          <path
            d="M115 84 C126 66, 118 44, 106 32 C112 48, 110 62, 106 74 Z"
            fill={`url(#${gradMain})`}
          />
          <path
            d="M62 28 C64 16, 70 10, 72 10 C75 18, 80 20, 78 29 Z"
            fill={accent}
            stroke={primary}
            strokeWidth="1"
          />
          <circle cx="32" cy="108" r="2.5" fill={accent} />
          <circle cx="108" cy="108" r="2.5" fill={accent} />
        </>
      )}

      {archetype === 'prism' && (
        <>
          <polygon
            points="70,15 112,38 124,74 112,110 70,127 28,110 16,74 28,38"
            fill="none"
            stroke={`url(#${gradMain})`}
            strokeWidth="6"
          />
          <circle cx="70" cy="72" r="43" fill="none" stroke={accent} strokeWidth="1.6" />
          <polygon points="70,11 76,22 70,33 64,22" fill={accent} stroke={secondary} strokeWidth="1" />
          <polygon points="70,112 76,122 70,132 64,122" fill={primary} stroke={accent} strokeWidth="1" />
          <polygon points="15,72 25,77 25,67" fill={accent} />
          <polygon points="125,72 115,77 115,67" fill={accent} />
        </>
      )}

      {archetype === 'music' && (
        <>
          <circle cx="70" cy="72" r="44" fill="none" stroke={`url(#${gradMain})`} strokeWidth="7" />
          <circle cx="70" cy="72" r="49" fill="none" stroke={accent} strokeWidth="1.5" strokeDasharray="6 3" />
          <rect x="20" y="60" width="4" height="24" rx="2" fill={accent} />
          <rect x="14" y="66" width="4" height="12" rx="2" fill={primary} />
          <rect x="116" y="60" width="4" height="24" rx="2" fill={accent} />
          <rect x="122" y="66" width="4" height="12" rx="2" fill={primary} />
          <circle cx="70" cy="22" r="7" fill={secondary} stroke={accent} strokeWidth="1.5" />
          <circle cx="70" cy="22" r="2.5" fill={accent} />
        </>
      )}

      {archetype === 'heart' && (
        <>
          <circle cx="70" cy="72" r="43" fill="none" stroke={`url(#${gradMain})`} strokeWidth="6.5" />
          <circle cx="70" cy="72" r="48" fill="none" stroke={accent} strokeWidth="1.4" strokeDasharray="5 5" />
          <path
            d="M70 34 C62 24, 50 26, 50 35 C50 43, 62 49, 70 55 C78 49, 90 43, 90 35 C90 26, 78 24, 70 34 Z"
            transform="translate(0,-14) scale(0.85)"
            style={{ transformOrigin: '70px 30px' }}
            fill={primary}
            stroke={accent}
            strokeWidth="1.4"
          />
          <path
            d="M70 112 C65 106, 58 108, 58 113 C58 118, 65 122, 70 126 C75 122, 82 118, 82 113 C82 108, 75 106, 70 112 Z"
            fill={`url(#${gradMain})`}
            stroke={accent}
            strokeWidth="1"
          />
        </>
      )}

      {archetype === 'laurel' && (
        <>
          <path
            d="M25 96 C14 74, 16 44, 34 26 C26 48, 25 72, 34 96 Z"
            fill={`url(#${gradMain})`}
            stroke={accent}
            strokeWidth="0.9"
          />
          <path
            d="M115 96 C126 74, 124 44, 106 26 C114 48, 115 72, 106 96 Z"
            fill={`url(#${gradMain})`}
            stroke={accent}
            strokeWidth="0.9"
          />
          <circle cx="70" cy="70" r="43" fill="none" stroke={`url(#${gradMain})`} strokeWidth="6" />
          <circle cx="70" cy="70" r="47" fill="none" stroke={accent} strokeWidth="1.4" />
          <polygon points="70,17 76,26 70,35 64,26" fill={accent} stroke={secondary} strokeWidth="1.2" />
        </>
      )}

      {labelTag && (
        <>
          <rect
            x="45"
            y="112"
            width="50"
            height="14"
            rx="7"
            fill="#090F22"
            stroke={primary}
            strokeWidth="1.4"
          />
          <text
            x="70"
            y="122"
            textAnchor="middle"
            fill={accent}
            fontSize="7.5"
            fontWeight="900"
            fontFamily="sans-serif"
          >
            {labelTag}
          </text>
        </>
      )}
    </svg>
  );
};


export const StorePropPreview: React.FC<{
  item: StoreFrameItem;
  avatarUrl?: string;
  sizeClass?: string;
}> = ({ item, avatarUrl, sizeClass = 'w-28 h-28' }) => {
  if (item.category === 'frames') {
    return <FrameSvg frameId={item.id} sizeClass={sizeClass} avatarUrl={avatarUrl} />;
  }

  if (item.imageUrl || item.category === 'rings') {
    return (
      <div
        className={`relative flex items-center justify-center ${sizeClass} rounded-2xl overflow-hidden bg-gradient-to-br from-[#2B123F] via-[#131A34] to-[#090D1A] border border-pink-400/45 shadow-[0_0_20px_rgba(236,72,153,0.28)]`}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-3xl">💍</div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${sizeClass}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.45)]">
        <defs>
          <linearGradient id="propGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="42" fill="#0F172A" stroke="url(#propGold)" strokeWidth="3" />
        {item.category === 'entry' && (
          <path d="M34 72 L46 44 L62 56 L78 36 L88 72 Z" fill="url(#propGold)" />
        )}
        {item.category === 'chat_link' && (
          <rect x="30" y="45" width="60" height="30" rx="8" fill="#1E293B" stroke="url(#propGold)" strokeWidth="2.5" />
        )}
        {item.category === 'chat_bubble' && (
          <path d="M32 42 H88 V72 H52 L38 84 V72 H32 Z" fill="#4C1D95" stroke="#38BDF8" strokeWidth="2.5" />
        )}
        {item.category === 'mic' && (
          <>
            <rect x="51" y="34" width="18" height="32" rx="9" fill="url(#propGold)" />
            <path d="M40 58 A20 20 0 0 0 80 58 M60 78 V88 M48 88 H72" stroke="#FEF08A" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        )}
      </svg>
    </div>
  );
};
