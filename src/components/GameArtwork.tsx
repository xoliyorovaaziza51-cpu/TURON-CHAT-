import React from 'react';
import footballKungCover from '../assets/images/football_kung_cover_1795691343223.jpg';
import rakitaCrashCover from '../assets/images/rakita_crash_cover_1795691342653.jpg';
import jackpotSlotCover from '../assets/images/jackpot_slot_cover_1795715449981.jpg';

interface GameThumbnailProps {
  gameId: string;
  title: string;
  variant?: 'wide' | 'square';
  className?: string;
}

export const GameThumbnail: React.FC<GameThumbnailProps> = ({
  gameId,
  title,
  variant = 'square',
  className = '',
}) => {
  const uid = `${gameId}-${variant}`;
  const isWide = variant === 'wide';

  const renderGraphic = () => {
    switch (gameId) {
      case 'ludo':
        return (
          <svg viewBox="0 0 160 100" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
            </defs>
            <rect width="160" height="100" fill={`url(#${uid}-bg)`} />
            {/* 4 Ludo quadrants */}
            <rect x="20" y="10" width="38" height="36" rx="6" fill="#EF4444" stroke="#FFF" strokeWidth="2" />
            <rect x="102" y="10" width="38" height="36" rx="6" fill="#22C55E" stroke="#FFF" strokeWidth="2" />
            <rect x="20" y="54" width="38" height="36" rx="6" fill="#3B82F6" stroke="#FFF" strokeWidth="2" />
            <rect x="102" y="54" width="38" height="36" rx="6" fill="#FACC15" stroke="#FFF" strokeWidth="2" />
            {/* Center Crown Track */}
            <rect x="64" y="32" width="32" height="36" rx="6" fill="#FEF08A" stroke="#78350F" strokeWidth="2" />
            <polygon points="80,41 85,52 75,52" fill="#DC2626" />
            <polygon points="80,59 85,48 75,48" fill="#2563EB" />
            {/* Dice */}
            <rect x="112" y="60" width="24" height="24" rx="5" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2" />
            <circle cx="118" cy="66" r="2.2" fill="#0F172A" />
            <circle cx="124" cy="72" r="2.2" fill="#DC2626" />
            <circle cx="130" cy="78" r="2.2" fill="#0F172A" />
            {/* Pawns */}
            <circle cx="39" cy="28" r="7" fill="#FCA5A5" stroke="#FFF" strokeWidth="2" />
            <circle cx="121" cy="28" r="7" fill="#86EFAC" stroke="#FFF" strokeWidth="2" />
          </svg>
        );

      case 'lyudo-jamoasi':
        return (
          <svg viewBox="0 0 160 100" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4C1D95" />
                <stop offset="100%" stopColor="#9333EA" />
              </linearGradient>
            </defs>
            <rect width="160" height="100" fill={`url(#${uid}-bg)`} />
            <circle cx="48" cy="50" r="30" fill="#2563EB" fillOpacity="0.45" stroke="#60A5FA" strokeWidth="2" />
            <circle cx="112" cy="50" r="30" fill="#DB2777" fillOpacity="0.45" stroke="#F472B6" strokeWidth="2" />
            {/* Team Pawns */}
            <circle cx="40" cy="48" r="10" fill="#38BDF8" stroke="#FFF" strokeWidth="2" />
            <circle cx="58" cy="55" r="10" fill="#22C55E" stroke="#FFF" strokeWidth="2" />
            <circle cx="102" cy="55" r="10" fill="#FACC15" stroke="#FFF" strokeWidth="2" />
            <circle cx="120" cy="48" r="10" fill="#FB7185" stroke="#FFF" strokeWidth="2" />
            {/* VS 2x2 Badge */}
            <rect x="65" y="12" width="30" height="18" rx="9" fill="#FACC15" />
            <text x="80" y="25" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1E1B4B">2×2</text>
          </svg>
        );

      case 'carrom':
        return (
          <svg viewBox="0 0 160 100" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#78350F" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>
            <rect width="160" height="100" fill={`url(#${uid}-bg)`} />
            {/* Wooden Board */}
            <rect x="26" y="8" width="108" height="84" rx="10" fill="#FEF3C7" stroke="#451A03" strokeWidth="5" />
            {/* Corner Pockets */}
            <circle cx="36" cy="18" r="6" fill="#0F172A" />
            <circle cx="124" cy="18" r="6" fill="#0F172A" />
            <circle cx="36" cy="82" r="6" fill="#0F172A" />
            <circle cx="124" cy="82" r="6" fill="#0F172A" />
            {/* Center Circle & Queen */}
            <circle cx="80" cy="50" r="20" fill="none" stroke="#B45309" strokeWidth="2" />
            <circle cx="80" cy="50" r="7" fill="#DC2626" stroke="#7F1D1D" strokeWidth="2" />
            <circle cx="67" cy="44" r="5.5" fill="#1E293B" />
            <circle cx="93" cy="56" r="5.5" fill="#FDE047" stroke="#92400E" strokeWidth="1.5" />
            {/* Striker */}
            <circle cx="80" cy="76" r="7" fill="#2563EB" stroke="#FFF" strokeWidth="2" />
          </svg>
        );

      case 'umo':
        return (
          <svg viewBox="0 0 160 100" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#065F46" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <rect width="160" height="100" fill={`url(#${uid}-bg)`} />
            {/* Fanned UMO Cards */}
            <g transform="rotate(-14 60 55)">
              <rect x="34" y="20" width="38" height="58" rx="7" fill="#EF4444" stroke="#FFF" strokeWidth="2.5" />
              <ellipse cx="53" cy="49" rx="14" ry="20" fill="#FFF" fillOpacity="0.22" />
              <text x="53" y="56" textAnchor="middle" fontSize="22" fontWeight="900" fill="#FFF">7</text>
            </g>
            <g transform="rotate(2 82 50)">
              <rect x="61" y="18" width="38" height="58" rx="7" fill="#2563EB" stroke="#FFF" strokeWidth="2.5" />
              <ellipse cx="80" cy="47" rx="14" ry="20" fill="#FFF" fillOpacity="0.22" />
              <text x="80" y="54" textAnchor="middle" fontSize="22" fontWeight="900" fill="#FFF">4</text>
            </g>
            <g transform="rotate(16 105 55)">
              <rect x="88" y="20" width="38" height="58" rx="7" fill="#F59E0B" stroke="#FFF" strokeWidth="2.5" />
              <ellipse cx="107" cy="49" rx="14" ry="20" fill="#FFF" fillOpacity="0.25" />
              <text x="107" y="56" textAnchor="middle" fontSize="18" fontWeight="900" fill="#1E293B">+4</text>
            </g>
          </svg>
        );

      case 'domino':
        return (
          <svg viewBox="0 0 160 100" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#0F172A" />
                <stop offset="100%" stopColor="#1D4ED8" />
              </linearGradient>
            </defs>
            <rect width="160" height="100" fill={`url(#${uid}-bg)`} />
            {/* Domino Tile 1 */}
            <g transform="rotate(-10 55 50)">
              <rect x="34" y="16" width="38" height="68" rx="7" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2" />
              <line x1="39" y1="50" x2="67" y2="50" stroke="#334155" strokeWidth="2" />
              <circle cx="45" cy="27" r="3" fill="#0F172A" />
              <circle cx="61" cy="27" r="3" fill="#0F172A" />
              <circle cx="45" cy="39" r="3" fill="#0F172A" />
              <circle cx="61" cy="39" r="3" fill="#0F172A" />
              <circle cx="53" cy="67" r="4" fill="#DC2626" />
            </g>
            {/* Domino Tile 2 */}
            <g transform="rotate(12 108 50)">
              <rect x="88" y="18" width="38" height="68" rx="7" fill="#FEF9C3" stroke="#EAB308" strokeWidth="2" />
              <line x1="93" y1="52" x2="121" y2="52" stroke="#78350F" strokeWidth="2" />
              <circle cx="99" cy="28" r="3" fill="#1E293B" />
              <circle cx="107" cy="36" r="3" fill="#1E293B" />
              <circle cx="115" cy="44" r="3" fill="#1E293B" />
              <circle cx="99" cy="63" r="3" fill="#2563EB" />
              <circle cx="115" cy="63" r="3" fill="#2563EB" />
              <circle cx="99" cy="75" r="3" fill="#2563EB" />
              <circle cx="115" cy="75" r="3" fill="#2563EB" />
            </g>
          </svg>
        );

      case 'jackaroo':
        return (
          <svg viewBox="0 0 160 100" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#311042" />
                <stop offset="100%" stopColor="#7E22CE" />
              </linearGradient>
            </defs>
            <rect width="160" height="100" fill={`url(#${uid}-bg)`} />
            <circle cx="80" cy="50" r="34" fill="#1E1B4B" stroke="#F59E0B" strokeWidth="4" />
            <circle cx="80" cy="50" r="24" fill="none" stroke="#C084FC" strokeWidth="2" strokeDasharray="5 4" />
            {/* Marbles */}
            <circle cx="80" cy="18" r="6" fill="#EF4444" stroke="#FFF" strokeWidth="1.5" />
            <circle cx="112" cy="50" r="6" fill="#38BDF8" stroke="#FFF" strokeWidth="1.5" />
            <circle cx="80" cy="82" r="6" fill="#22C55E" stroke="#FFF" strokeWidth="1.5" />
            <circle cx="48" cy="50" r="6" fill="#FACC15" stroke="#FFF" strokeWidth="1.5" />
            {/* Jack Card Center */}
            <rect x="68" y="34" width="24" height="32" rx="4" fill="#FFF" stroke="#F59E0B" strokeWidth="2" />
            <text x="80" y="55" textAnchor="middle" fontSize="16" fontWeight="900" fill="#7E22CE">J</text>
          </svg>
        );

      case 'oltin-omad':
        return (
          <img
            src="/assets/aistudio/file_00000000f39082109b92e8d5aebfe53d_e1ad4132.png"
            alt={title}
            className="w-full h-full object-cover bg-[#1A0730]"
          />
        );

      case 'omadli-pro':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <rect width="120" height="120" fill={`url(#${uid}-bg)`} />
            <rect x="16" y="24" width="88" height="72" rx="14" fill="#1E1B4B" stroke="#FACC15" strokeWidth="4" />
            <rect x="24" y="34" width="21" height="40" rx="5" fill="#FFF" />
            <rect x="49.5" y="34" width="21" height="40" rx="5" fill="#FFF" />
            <rect x="75" y="34" width="21" height="40" rx="5" fill="#FFF" />
            <polygon points="34.5,46 39,58 30,58" fill="#EF4444" />
            <circle cx="60" cy="54" r="7" fill="#F59E0B" />
            <polygon points="85.5,45 91,54 85.5,63 80,54" fill="#3B82F6" />
            <rect x="34" y="80" width="52" height="12" rx="6" fill="#FACC15" />
            <text x="60" y="89" textAnchor="middle" fontSize="8" fontWeight="900" fill="#1E1B4B">PRO</text>
          </svg>
        );

      case 'omadli-meva':
        return (
          <img
            src="/assets/aistudio/file_00000000f39082109b92e8d5aebfe53d_e1ad4132.png"
            alt={title}
            className="w-full h-full object-cover bg-[#062216]"
          />
        );

      case 'greedy-pro':
        return (
          <img
            src="/assets/aistudio/file_00000000432481fab2e585dcd6e9fa29_fe9455c1.png"
            alt={title}
            className="w-full h-full object-cover bg-[#140B2E]"
          />
        );

      case 'jekpot':
        return (
          <img
            src="/assets/aistudio/file_0000000007b48210b5473bdba86348d0_d64f9726.png"
            alt={title}
            className="w-full h-full object-cover bg-[#140304]"
          />
        );

      case 'yosh-patti':
        return (
          <img
            src="/assets/aistudio/file_00000000e5688210b51acf98e1bc6cc6_0df8be0d.png"
            alt={title}
            className="w-full h-full object-cover bg-[#05291A]"
          />
        );

      case 'jackpot-slot':
        return (
          <img
            src={jackpotSlotCover}
            alt={title}
            className="w-full h-full object-cover bg-[#0F082C]"
          />
        );

      case 'ochkoz-quti':
        return (
          <img
            src="/assets/aistudio/file_000000001bf48210b83120ed687c2222_b4574ef8.png"
            alt={title}
            className="w-full h-full object-cover bg-[#180509]"
          />
        );

      case 'dragon-tiger-slot':
        return (
          <img
            src="/src/assets/images/dragon_tiger_vs_1795638715430.jpg"
            alt={title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover bg-[#080B14]"
          />
        );

      case 'ruletka':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#064E3B" />
                <stop offset="100%" stopColor="#0284C7" />
              </linearGradient>
            </defs>
            <rect width="120" height="120" fill={`url(#${uid}-bg)`} />
            <circle cx="60" cy="60" r="42" fill="#1E293B" stroke="#F59E0B" strokeWidth="5" />
            <circle cx="60" cy="60" r="30" fill="none" stroke="#EF4444" strokeWidth="12" strokeDasharray="10 10" />
            <circle cx="60" cy="60" r="14" fill="#FACC15" stroke="#78350F" strokeWidth="3" />
            <circle cx="80" cy="40" r="4" fill="#FFFFFF" />
          </svg>
        );

      case 'piramida-uyalari':
        return (
          <svg viewBox="0 0 120 120" className="w-full h-full" aria-label={title}>
            <defs>
              <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#78350F" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>
            <rect width="120" height="120" fill={`url(#${uid}-bg)`} />
            <circle cx="92" cy="28" r="12" fill="#FEF08A" />
            <polygon points="60,22 18,96 102,96" fill="#FBBF24" stroke="#78350F" strokeWidth="3" />
            <line x1="46" y1="48" x2="74" y2="48" stroke="#92400E" strokeWidth="2.5" />
            <line x1="34" y1="70" x2="86" y2="70" stroke="#92400E" strokeWidth="2.5" />
            <polygon points="60,30 67,42 53,42" fill="#38BDF8" />
          </svg>
        );

      case 'texas-kovboy':
        return (
          <img
            src="/assets/aistudio/file_0000000012bc8210965d5c02438d7701_ba248e87.png"
            alt={title}
            className="w-full h-full object-cover bg-[#2A1104]"
          />
        );

      case 'football-king':
        return (
          <img
            src={footballKungCover}
            alt={title}
            className="w-full h-full object-cover bg-[#06122E]"
          />
        );

      case 'raketa-toqnashuvi':
        return (
          <img
            src={rakitaCrashCover}
            alt={title}
            className="w-full h-full object-cover bg-[#090F2E]"
          />
        );

      default:
        return (
          <img
            src={rakitaCrashCover}
            alt={title}
            className="w-full h-full object-cover bg-[#090F2E]"
          />
        );
    }
  };

  return (
    <div
      className={`overflow-hidden shrink-0 select-none ${
        isWide ? 'w-full aspect-[16/10] rounded-xl' : 'aspect-square rounded-2xl'
      } ${className}`}
    >
      {renderGraphic()}
    </div>
  );
};
