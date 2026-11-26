import React, { useState } from 'react';
import { Crown, Shield, User } from 'lucide-react';
import { getFrameRingClass } from '../lib/api';
import { FrameSvg } from './FrameArtwork';
import { getRoleVisuals } from './RoleBadge';
import type { AppRole } from '../types/turon';

interface AvatarWithFrameProps {
  src?: string;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  frameStyle?: string;
  vipLevel?: number;
  svipLevel?: number;
  role?: AppRole;
  onlineStatus?: 'online' | 'offline' | 'in_room';
  showOnline?: boolean;
  isSpeaking?: boolean;
  hasCpMicEffect?: boolean;
}

const SIZE_MAP = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  src,
  alt,
  size = 'md',
  frameStyle = 'none',
  vipLevel = 0,
  svipLevel = 0,
  role,
  onlineStatus,
  showOnline = false,
  isSpeaking = false,
  hasCpMicEffect = false,
}) => {
  const [failed, setFailed] = useState(false);
  const roleVisuals = role ? getRoleVisuals(role) : null;
  const hasStoreFrame = Boolean(frameStyle && frameStyle.startsWith('frame-'));
  const ringClass =
    frameStyle && frameStyle !== 'none'
      ? getFrameRingClass(frameStyle, svipLevel, vipLevel)
      : roleVisuals?.isElevated
      ? roleVisuals.ringClass
      : getFrameRingClass(frameStyle, svipLevel, vipLevel);

  const RoleIcon = roleVisuals?.icon;

  return (
    <div className="relative inline-flex shrink-0">
      {isSpeaking && (
        <>
          <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400/85 animate-pulse-ring pointer-events-none" />
          <span className="absolute -inset-3.5 rounded-full border border-emerald-400/40 animate-pulse-ring-slow pointer-events-none" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 rounded-full bg-[#080B14]/95 border border-emerald-500/70 flex items-center gap-1 shadow-lg">
            <span className="w-1 h-2.5 bg-emerald-400 rounded-full animate-voice-bar" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-4 bg-emerald-400 rounded-full animate-voice-bar" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-3 bg-emerald-400 rounded-full animate-voice-bar" style={{ animationDelay: '300ms' }} />
          </div>
        </>
      )}
      {hasCpMicEffect && isSpeaking && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-full border-2 border-pink-400/75 shadow-[0_0_22px_rgba(236,72,153,0.65)] animate-[spin_6s_linear_infinite]"
          style={{ borderStyle: 'dashed' }}
        />
      )}
      <div
        className={`${SIZE_MAP[size]} rounded-full overflow-hidden bg-gradient-to-br from-blue-950 via-[#151D31] to-purple-950 flex items-center justify-center ${ringClass} ${
          hasCpMicEffect && isSpeaking
            ? 'ring-2 ring-[#E5B84B] shadow-[0_0_24px_rgba(229,184,75,0.65)]'
            : isSpeaking
            ? 'ring-2 ring-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]'
            : ''
        } transition-shadow duration-200`}
      >
        {src && !failed ? (
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-1/2 h-1/2 text-slate-400" />
        )}
      </div>

      {/* Store Ornate Frame SVG Overlay when equipped */}
      {hasStoreFrame && (
        <div className="pointer-events-none absolute -inset-[22%] z-10">
          <FrameSvg frameId={frameStyle} sizeClass="w-full h-full" />
        </div>
      )}

      {/* Elevated Role Mini Crest (Asoschi / Admin / Diler / Agent) */}
      {roleVisuals?.isElevated && RoleIcon && size !== 'xs' && (
        <span
          title={roleVisuals.label}
          className={`absolute -bottom-1 -left-1 z-20 w-5 h-5 rounded-full bg-gradient-to-br ${roleVisuals.miniCrestBg} border flex items-center justify-center shadow-md`}
        >
          <RoleIcon className="w-2.5 h-2.5" />
        </span>
      )}

      {svipLevel > 0 && (
        <span
          title={`SVIP ${svipLevel}`}
          className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-[#080B14] border border-[#E5B84B] flex items-center justify-center text-[#E5B84B]"
        >
          <Crown className="w-3 h-3" />
        </span>
      )}

      {svipLevel === 0 && vipLevel > 0 && (
        <span
          title={`VIP ${vipLevel}`}
          className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full bg-[#080B14] border border-purple-400 flex items-center justify-center text-purple-300"
        >
          <Shield className="w-3 h-3" />
        </span>
      )}

      {showOnline && onlineStatus && onlineStatus !== 'offline' && (
        <span
          title={onlineStatus === 'in_room' ? 'Xonada' : 'Onlayn'}
          className={`absolute bottom-0 right-0 z-20 w-3 h-3 rounded-full border-2 border-[#080B14] ${
            onlineStatus === 'in_room' ? 'bg-blue-400' : 'bg-emerald-400'
          }`}
        />
      )}
    </div>
  );
};

