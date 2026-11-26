import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { AvatarWithFrame } from './AvatarWithFrame';
import type { RoomUserEntryEvent } from '../types/turon';

interface RoomEntryBannerConfettiProps {
  entryEvent: RoomUserEntryEvent | null;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  life: number;
  maxLife: number;
}

const CONFETTI_COLORS = ['#E5B84B', '#3B82F6', '#A855F7', '#10B981', '#F472B6', '#FDE68A'];

export const RoomEntryBannerConfetti: React.FC<RoomEntryBannerConfettiProps> = ({
  entryEvent,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!entryEvent) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = Math.min(parent?.clientHeight || 420, 420);
    canvas.width = width;
    canvas.height = height;

    const particles: ConfettiParticle[] = Array.from({ length: 48 }, (_, i) => {
      const fromLeft = i % 2 === 0;
      return {
        x: fromLeft ? width * 0.12 : width * 0.88,
        y: 36 + Math.random() * 24,
        vx: (fromLeft ? 1 : -1) * (1.8 + Math.random() * 4.2),
        vy: -2.5 - Math.random() * 3.0,
        size: 5 + Math.random() * 5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        life: 0,
        maxLife: 110 + Math.random() * 45,
      };
    });

    let rafId = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      let alive = false;
      for (const p of particles) {
        p.life += 1;
        if (p.life >= p.maxLife) continue;
        alive = true;
        p.vy += 0.11; // subtle gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
        ctx.restore();
      }
      if (alive) {
        rafId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [entryEvent?.id]);

  if (!entryEvent) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-30 overflow-hidden h-96">
      {/* Subtle Confetti Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Horizontal Gliding Entry Banner */}
      <div
        key={entryEvent.id}
        className="absolute top-3 left-0 right-0 flex items-center overflow-hidden"
      >
        <div className="animate-entry-glide flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#E5B84B]/90 via-amber-500/90 to-purple-600/90 border border-amber-200/60 shadow-lg shadow-amber-500/20 whitespace-nowrap">
          <AvatarWithFrame
            src={entryEvent.avatarUrl}
            alt={entryEvent.nickname}
            size="xs"
            vipLevel={entryEvent.vipLevel}
            svipLevel={entryEvent.svipLevel}
            role={entryEvent.role}
          />
          <Sparkles className="w-4 h-4 text-[#080B14] shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-[#080B14]">
            {entryEvent.nickname} xonaga kirdi!
          </span>
        </div>
      </div>
    </div>
  );
};
