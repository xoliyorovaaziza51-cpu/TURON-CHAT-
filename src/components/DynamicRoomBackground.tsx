import React from 'react';
import type { DynamicBgId } from '../types/turon';

export interface DynamicBgOption {
  id: DynamicBgId;
  title: string;
  subtitle: string;
  previewGradient: string;
  accentHex: string;
}

export const DYNAMIC_BACKGROUNDS: DynamicBgOption[] = [
  {
    id: 'campfire-night',
    title: 'Sahro gulxani',
    subtitle: 'Tungi gulxan va uchqunlar',
    previewGradient: 'from-[#161B33] via-[#3B1D12] to-[#080B14]',
    accentHex: '#F59E0B',
  },
  {
    id: 'aurora-borealis',
    title: 'Shimol yog‘dusi',
    subtitle: 'Zumrad va binafsha nurlar',
    previewGradient: 'from-[#06283D] via-[#134E4A] to-[#1E103C]',
    accentHex: '#34D399',
  },
  {
    id: 'starfall-cosmos',
    title: 'Yulduzli kosmos',
    subtitle: 'Uchar yulduzlar va tumanlik',
    previewGradient: 'from-[#090E29] via-[#1E1348] to-[#050814]',
    accentHex: '#818CF8',
  },
  {
    id: 'neon-pulse',
    title: 'Neon impuls',
    subtitle: 'Kiber to‘lqinlar va nurlar',
    previewGradient: 'from-[#0B112E] via-[#3B0764] to-[#07182B]',
    accentHex: '#22D3EE',
  },
  {
    id: 'sakura-petals',
    title: 'Sakura oqshomi',
    subtitle: 'Yumshoq suzuvchi gulbarglar',
    previewGradient: 'from-[#2A0E2E] via-[#3F1237] to-[#0C0918]',
    accentHex: '#F472B6',
  },
  {
    id: 'golden-embers',
    title: 'Oltin uchqunlar',
    subtitle: 'Shohona tilla zarralar',
    previewGradient: 'from-[#221706] via-[#38230A] to-[#0B0907]',
    accentHex: '#FBBF24',
  },
  {
    id: 'ocean-waves',
    title: 'Tungi okean',
    subtitle: 'Chuqur moviy to‘lqinlar',
    previewGradient: 'from-[#041E3A] via-[#0B3954] to-[#040B1A]',
    accentHex: '#38BDF8',
  },
];

const STAR_COORDS = [
  { x: 10, y: 14, d: '0s', s: 2.2 },
  { x: 24, y: 28, d: '0.6s', s: 1.6 },
  { x: 38, y: 10, d: '1.2s', s: 2.4 },
  { x: 52, y: 22, d: '0.3s', s: 1.8 },
  { x: 67, y: 12, d: '1.5s', s: 2.5 },
  { x: 82, y: 26, d: '0.9s', s: 1.9 },
  { x: 91, y: 16, d: '1.8s', s: 2.1 },
  { x: 15, y: 46, d: '1.1s', s: 1.7 },
  { x: 44, y: 40, d: '0.4s', s: 2.0 },
  { x: 75, y: 44, d: '1.4s', s: 1.8 },
  { x: 88, y: 52, d: '0.7s', s: 2.2 },
  { x: 31, y: 58, d: '1.6s', s: 1.5 },
];

const PARTICLE_SLOTS = [
  { left: '12%', delay: '0s', dur: '7s', size: 6 },
  { left: '24%', delay: '1.3s', dur: '8.5s', size: 5 },
  { left: '36%', delay: '0.6s', dur: '6.8s', size: 7 },
  { left: '49%', delay: '2.1s', dur: '9s', size: 5 },
  { left: '61%', delay: '0.9s', dur: '7.4s', size: 6 },
  { left: '74%', delay: '1.8s', dur: '8.2s', size: 5 },
  { left: '86%', delay: '0.4s', dur: '6.5s', size: 7 },
];

export const DynamicRoomBackground: React.FC<{ dynamicBg?: DynamicBgId }> = ({
  dynamicBg = 'campfire-night',
}) => {
  if (dynamicBg === 'campfire-night') {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src="/src/assets/images/room_night_campfire_bg_1794906404641.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-bottom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#060B19]/75 via-[#070E22]/30 to-[#050914]/80" />
        {PARTICLE_SLOTS.map((p, idx) => (
          <span
            key={idx}
            className="absolute bottom-8 rounded-full bg-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.9)] animate-bg-float-up"
            style={{
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
      </div>
    );
  }

  if (dynamicBg === 'aurora-borealis') {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-[#041427] via-[#0A2738] to-[#070A18]"
        aria-hidden="true"
      >
        <div className="absolute -inset-x-24 -top-16 h-[70%] rounded-full bg-gradient-to-r from-emerald-400/25 via-teal-300/30 to-purple-500/25 blur-3xl animate-bg-aurora" />
        <div
          className="absolute -inset-x-16 top-12 h-[55%] rounded-full bg-gradient-to-r from-cyan-400/20 via-fuchsia-500/20 to-emerald-300/25 blur-3xl animate-bg-aurora"
          style={{ animationDelay: '-4s', animationDuration: '14s' }}
        />
        {STAR_COORDS.map((st, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-white animate-bg-twinkle"
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.s}px`,
              height: `${st.s}px`,
              animationDelay: st.d,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#050814]/85" />
      </div>
    );
  }

  if (dynamicBg === 'starfall-cosmos') {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-[#070A22] via-[#130C35] to-[#050712]"
        aria-hidden="true"
      >
        <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-indigo-600/25 blur-3xl animate-bg-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-fuchsia-600/20 blur-3xl animate-bg-pulse-slow" />
        {STAR_COORDS.map((st, idx) => (
          <span
            key={idx}
            className="absolute rounded-full bg-indigo-100 animate-bg-twinkle"
            style={{
              left: `${st.x}%`,
              top: `${st.y}%`,
              width: `${st.s}px`,
              height: `${st.s}px`,
              animationDelay: st.d,
            }}
          />
        ))}
        <span className="absolute top-12 -left-24 w-28 h-[2px] rounded-full bg-gradient-to-r from-transparent via-sky-200 to-white rotate-[22deg] animate-bg-shooting-star" />
        <span
          className="absolute top-28 -left-24 w-24 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-200 to-white rotate-[22deg] animate-bg-shooting-star"
          style={{ animationDelay: '3.2s' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#050712]/80" />
      </div>
    );
  }

  if (dynamicBg === 'neon-pulse') {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-[#090D24] via-[#1B093A] to-[#060915]"
        aria-hidden="true"
      >
        <div className="absolute -top-20 -left-16 w-80 h-80 rounded-full bg-cyan-500/25 blur-3xl animate-bg-pulse-slow" />
        <div
          className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-fuchsia-500/25 blur-3xl animate-bg-pulse-slow"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(34,211,238,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(192,132,252,0.2) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#050814] via-[#050814]/55 to-transparent" />
      </div>
    );
  }

  if (dynamicBg === 'sakura-petals') {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-[#230B2C] via-[#341135] to-[#0B0714]"
        aria-hidden="true"
      >
        <div className="absolute -top-16 right-8 w-72 h-72 rounded-full bg-pink-500/20 blur-3xl animate-bg-pulse-slow" />
        {PARTICLE_SLOTS.map((p, idx) => (
          <span
            key={idx}
            className="absolute -top-6 rounded-tl-full rounded-br-full bg-gradient-to-br from-pink-200 to-rose-400/80 shadow-[0_0_8px_rgba(244,114,182,0.6)] animate-bg-petal-fall"
            style={{
              left: p.left,
              width: `${p.size + 4}px`,
              height: `${p.size + 2}px`,
              animationDelay: p.delay,
              animationDuration: `${Number.parseFloat(p.dur) + 2}s`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#0B0714]/85" />
      </div>
    );
  }

  if (dynamicBg === 'golden-embers') {
    return (
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-[#1C1406] via-[#2B1B08] to-[#0A0806]"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-amber-500/20 blur-3xl animate-bg-pulse-slow" />
        {PARTICLE_SLOTS.map((p, idx) => (
          <span
            key={idx}
            className="absolute bottom-4 rounded-full bg-gradient-to-t from-amber-500 to-yellow-200 shadow-[0_0_12px_rgba(251,191,36,0.85)] animate-bg-float-up"
            style={{
              left: p.left,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-[#0A0806]/85" />
      </div>
    );
  }

  // ocean-waves
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-b from-[#04182F] via-[#072B49] to-[#030A18]"
      aria-hidden="true"
    >
      <div className="absolute -top-20 left-1/3 w-80 h-80 rounded-full bg-sky-400/20 blur-3xl animate-bg-pulse-slow" />
      <div className="absolute -bottom-24 -left-16 w-[140%] h-44 rounded-[100%] bg-sky-500/15 border-t border-sky-300/25 animate-bg-wave" />
      <div
        className="absolute -bottom-28 -right-16 w-[140%] h-40 rounded-[100%] bg-cyan-400/15 border-t border-cyan-200/20 animate-bg-wave"
        style={{ animationDelay: '-3s', animationDuration: '11s' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#030A18]/80" />
    </div>
  );
};
