import React from 'react';

export const GoldenWingsCrownFrame: React.FC<{
  children: React.ReactNode;
  size?: 'lg' | 'md';
}> = ({ children, size = 'lg' }) => {
  const isLg = size === 'lg';
  return (
    <div
      className={`relative flex items-center justify-center select-none ${
        isLg ? 'w-[300px] h-[168px]' : 'w-[240px] h-[136px]'
      }`}
    >
      {/* Purple cosmic aura */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`${
            isLg ? 'w-56 h-36' : 'w-44 h-28'
          } rounded-full bg-purple-600/35 blur-2xl`}
        />
      </div>

      {/* Ornate Golden Wings + Purple Crystals SVG */}
      <svg
        viewBox="0 0 360 200"
        className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_14px_rgba(245,158,11,0.45)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="goldWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF3B0" />
            <stop offset="35%" stopColor="#F5C451" />
            <stop offset="70%" stopColor="#D4941E" />
            <stop offset="100%" stopColor="#8A5708" />
          </linearGradient>
          <linearGradient id="purpleCrystalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E9D5FF" />
            <stop offset="50%" stopColor="#9333EA" />
            <stop offset="100%" stopColor="#3B0764" />
          </linearGradient>
        </defs>

        {/* Left Wing Feathers */}
        <g fill="url(#goldWingGrad)" stroke="#5E3705" strokeWidth="1.2">
          <path d="M132 106 C95 82, 54 52, 22 24 C45 64, 78 90, 124 114 Z" />
          <path d="M128 114 C88 98, 52 78, 24 54 C48 84, 80 105, 122 122 Z" />
          <path d="M126 122 C90 114, 58 102, 34 84 C58 108, 86 122, 124 130 Z" />
          <path d="M128 130 C96 128, 70 122, 48 112 C72 130, 98 138, 130 138 Z" />
          <path d="M136 138 C108 142, 86 142, 68 136 C90 148, 114 150, 140 146 Z" />
        </g>

        {/* Right Wing Feathers */}
        <g fill="url(#goldWingGrad)" stroke="#5E3705" strokeWidth="1.2">
          <path d="M228 106 C265 82, 306 52, 338 24 C315 64, 282 90, 236 114 Z" />
          <path d="M232 114 C272 98, 308 78, 336 54 C312 84, 280 105, 238 122 Z" />
          <path d="M234 122 C270 114, 302 102, 326 84 C302 108, 274 122, 236 130 Z" />
          <path d="M232 130 C264 128, 290 122, 312 112 C288 130, 262 138, 230 138 Z" />
          <path d="M224 138 C252 142, 274 142, 292 136 C270 148, 246 150, 220 146 Z" />
        </g>

        {/* Top Crown */}
        <path
          d="M142 52 L134 26 L158 38 L180 14 L202 38 L226 26 L218 52 Z"
          fill="url(#goldWingGrad)"
          stroke="#5E3705"
          strokeWidth="1.5"
        />
        <polygon points="180,22 186,33 180,44 174,33" fill="url(#purpleCrystalGrad)" />
        <circle cx="134" cy="24" r="3.5" fill="#FFF3B0" />
        <circle cx="180" cy="12" r="4.5" fill="#FFF3B0" />
        <circle cx="226" cy="24" r="3.5" fill="#FFF3B0" />

        {/* Outer Ring */}
        <circle
          cx="180"
          cy="112"
          r="59"
          fill="none"
          stroke="url(#goldWingGrad)"
          strokeWidth="6"
        />
        <circle
          cx="180"
          cy="112"
          r="64"
          fill="none"
          stroke="#A855F7"
          strokeOpacity="0.65"
          strokeWidth="1.5"
        />

        {/* Ring Gems */}
        <polygon points="180,164 188,173 180,182 172,173" fill="url(#purpleCrystalGrad)" stroke="#FDE68A" strokeWidth="1" />
        <polygon points="122,108 128,114 122,120 116,114" fill="url(#purpleCrystalGrad)" stroke="#FDE68A" strokeWidth="1" />
        <polygon points="238,108 244,114 238,120 232,114" fill="url(#purpleCrystalGrad)" stroke="#FDE68A" strokeWidth="1" />
      </svg>

      {/* Center Circle Content */}
      <div
        className={`relative z-10 rounded-full overflow-hidden flex items-center justify-center bg-[#15062B] ${
          isLg ? 'w-[104px] h-[104px] mt-[22px]' : 'w-[84px] h-[84px] mt-[18px]'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export const UzbekistanFlagIcon: React.FC = () => (
  <svg viewBox="0 0 28 18" className="w-6 h-4 rounded-[3px] shadow-sm shrink-0" aria-label="O'zbekiston">
    <rect width="28" height="5.5" y="0" fill="#0099B5" />
    <rect width="28" height="1" y="5.5" fill="#CE1126" />
    <rect width="28" height="5" y="6.5" fill="#FFFFFF" />
    <rect width="28" height="1" y="11.5" fill="#CE1126" />
    <rect width="28" height="5.5" y="12.5" fill="#1EB53A" />
    <circle cx="5.2" cy="2.8" r="1.6" fill="#FFFFFF" />
    <circle cx="5.9" cy="2.8" r="1.3" fill="#0099B5" />
  </svg>
);

export const CrystalClusterCorner: React.FC<{ side: 'left' | 'right' }> = ({ side }) => (
  <svg
    viewBox="0 0 120 90"
    className={`pointer-events-none w-24 h-20 opacity-85 ${side === 'right' ? 'scale-x-[-1]' : ''}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="crysGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F3E8FF" />
        <stop offset="45%" stopColor="#9333EA" />
        <stop offset="100%" stopColor="#2E1065" />
      </linearGradient>
    </defs>
    <polygon points="10,90 24,30 44,90" fill="url(#crysGrad)" stroke="#D8B4FE" strokeWidth="0.8" />
    <polygon points="34,90 54,18 72,90" fill="url(#crysGrad)" stroke="#E9D5FF" strokeWidth="0.8" />
    <polygon points="62,90 80,44 98,90" fill="url(#crysGrad)" stroke="#C084FC" strokeWidth="0.8" />
  </svg>
);
