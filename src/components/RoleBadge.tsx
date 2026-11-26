import React from 'react';
import { Award, Crown, Gem, ShieldCheck, Sparkles, Star, Swords } from 'lucide-react';
import type { AppRole } from '../types/turon';

export interface RoleVisualSpec {
  isElevated: boolean;
  label: string;
  shortLabel: string;
  badgeClass: string;
  ringClass: string;
  nameColorClass: string;
  cardBorderClass: string;
  miniCrestBg: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_SPECS: Record<AppRole, RoleVisualSpec> = {
  founder: {
    isElevated: true,
    label: 'ASOSCHI',
    shortLabel: 'Asoschi',
    badgeClass:
      'bg-gradient-to-r from-[#FFF3B0] via-[#F5C451] to-[#D97706] text-[#281000] border border-[#FEF08A] shadow-[0_0_16px_rgba(245,158,11,0.55)]',
    ringClass:
      'ring-2 ring-[#F5C451] shadow-[0_0_20px_rgba(245,158,11,0.65)]',
    nameColorClass: 'text-[#FEF08A] font-extrabold drop-shadow-[0_0_8px_rgba(245,158,11,0.45)]',
    cardBorderClass: 'border-[#E5B84B]/65 bg-gradient-to-br from-[#2B1702]/50 to-[#0F1524]',
    miniCrestBg: 'from-[#FEF08A] to-[#B45309] text-[#281000] border-[#FFFBEB]',
    icon: Crown,
  },
  super_admin: {
    isElevated: true,
    label: 'SUPER ADMIN',
    shortLabel: 'S-Admin',
    badgeClass:
      'bg-gradient-to-r from-rose-500 via-fuchsia-600 to-purple-700 text-white border border-pink-300/80 shadow-[0_0_14px_rgba(217,70,239,0.5)]',
    ringClass:
      'ring-2 ring-fuchsia-400 shadow-[0_0_18px_rgba(217,70,239,0.55)]',
    nameColorClass: 'text-fuchsia-200 font-bold',
    cardBorderClass: 'border-fuchsia-400/55 bg-gradient-to-br from-[#2E0836]/45 to-[#0F1524]',
    miniCrestBg: 'from-rose-400 to-purple-600 text-white border-pink-200',
    icon: Sparkles,
  },
  admin: {
    isElevated: true,
    label: 'ADMIN',
    shortLabel: 'Admin',
    badgeClass:
      'bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-700 text-white border border-sky-300/80 shadow-[0_0_14px_rgba(56,189,248,0.45)]',
    ringClass:
      'ring-2 ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.55)]',
    nameColorClass: 'text-sky-200 font-bold',
    cardBorderClass: 'border-sky-400/55 bg-gradient-to-br from-[#08224A]/50 to-[#0F1524]',
    miniCrestBg: 'from-sky-300 to-blue-700 text-white border-sky-100',
    icon: ShieldCheck,
  },
  pk_admin: {
    isElevated: true,
    label: 'PK ADMIN',
    shortLabel: 'PK',
    badgeClass:
      'bg-gradient-to-r from-orange-400 via-amber-500 to-red-600 text-white border border-amber-200/80 shadow-[0_0_12px_rgba(249,115,22,0.45)]',
    ringClass:
      'ring-2 ring-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.5)]',
    nameColorClass: 'text-orange-200 font-bold',
    cardBorderClass: 'border-orange-400/50 bg-gradient-to-br from-[#2E1105]/45 to-[#0F1524]',
    miniCrestBg: 'from-orange-300 to-red-600 text-white border-amber-100',
    icon: Swords,
  },
  moderator: {
    isElevated: true,
    label: 'MODERATOR',
    shortLabel: 'Mod',
    badgeClass:
      'bg-gradient-to-r from-teal-400 to-cyan-600 text-[#031F1D] border border-teal-200/80 shadow-[0_0_12px_rgba(45,212,191,0.4)]',
    ringClass:
      'ring-2 ring-teal-400 shadow-[0_0_14px_rgba(45,212,191,0.45)]',
    nameColorClass: 'text-teal-200 font-bold',
    cardBorderClass: 'border-teal-400/45 bg-gradient-to-br from-[#062B2B]/45 to-[#0F1524]',
    miniCrestBg: 'from-teal-300 to-cyan-600 text-[#042220] border-teal-100',
    icon: Award,
  },
  agency_head: {
    isElevated: true,
    label: 'DILER',
    shortLabel: 'Diler',
    badgeClass:
      'bg-gradient-to-r from-emerald-300 via-emerald-500 to-teal-700 text-[#022014] border border-[#FDE68A]/90 shadow-[0_0_14px_rgba(16,185,129,0.5)]',
    ringClass:
      'ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.55)]',
    nameColorClass: 'text-emerald-200 font-bold',
    cardBorderClass: 'border-emerald-400/55 bg-gradient-to-br from-[#05291D]/50 to-[#0F1524]',
    miniCrestBg: 'from-emerald-300 to-emerald-700 text-[#022014] border-[#FEF08A]',
    icon: Gem,
  },
  agent: {
    isElevated: true,
    label: 'AGENT',
    shortLabel: 'Agent',
    badgeClass:
      'bg-gradient-to-r from-violet-400 via-purple-600 to-indigo-700 text-white border border-violet-200/80 shadow-[0_0_12px_rgba(167,139,250,0.45)]',
    ringClass:
      'ring-2 ring-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.5)]',
    nameColorClass: 'text-violet-200 font-bold',
    cardBorderClass: 'border-violet-400/50 bg-gradient-to-br from-[#1C0E3A]/50 to-[#0F1524]',
    miniCrestBg: 'from-violet-300 to-indigo-600 text-white border-violet-100',
    icon: Star,
  },
  user: {
    isElevated: false,
    label: '',
    shortLabel: 'A’zo',
    badgeClass: '',
    ringClass: 'ring-1 ring-white/15',
    nameColorClass: 'text-white',
    cardBorderClass: 'border-white/[0.07] bg-[#0F1524]',
    miniCrestBg: '',
    icon: Star,
  },
};

export function getRoleVisuals(role: AppRole): RoleVisualSpec {
  return ROLE_SPECS[role] || ROLE_SPECS.user;
}

export const RoleBadge: React.FC<{
  role: AppRole;
  size?: 'xs' | 'sm' | 'md';
}> = ({ role, size = 'sm' }) => {
  const spec = getRoleVisuals(role);
  if (!spec.isElevated) return null;
  const Icon = spec.icon;

  if (size === 'xs') {
    return (
      <span
        className={`inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded-md text-[9px] font-black tracking-wider uppercase leading-tight shrink-0 ${spec.badgeClass}`}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span>{spec.shortLabel}</span>
      </span>
    );
  }

  if (size === 'md') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase shrink-0 ${spec.badgeClass}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{spec.label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase shrink-0 ${spec.badgeClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{spec.label}</span>
    </span>
  );
};
