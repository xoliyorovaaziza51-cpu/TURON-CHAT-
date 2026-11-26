import type { AppRole } from '../types/turon';
import { getFrameCatalogItem } from './framesCatalog';

const TOKEN_KEY = 'turon_chat_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Xatolik yuz berdi (${res.status})`);
  }
  return data as T;
}

export function formatCoins(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(n);
}

export function formatUzs(n: number): string {
  return `${new Intl.NumberFormat('uz-UZ').format(n)} so'm`;
}

export function formatUzTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatUzDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function getRoleShortLabel(role: AppRole): string {
  const map: Record<AppRole, string> = {
    founder: 'Asoschi',
    super_admin: 'Super Admin',
    admin: 'Admin',
    moderator: 'Moderator',
    pk_admin: 'PK Admin',
    agency_head: 'Diler',
    agent: 'Agent',
    user: 'A’zo',
  };
  return map[role] || 'A’zo';
}

export function getRoleTextColor(role: AppRole): string {
  switch (role) {
    case 'founder':
      return 'text-[#E5B84B]';
    case 'super_admin':
      return 'text-fuchsia-300';
    case 'admin':
      return 'text-sky-300';
    case 'moderator':
      return 'text-teal-300';
    case 'pk_admin':
      return 'text-orange-300';
    case 'agency_head':
      return 'text-emerald-300';
    case 'agent':
      return 'text-violet-300';
    default:
      return 'text-slate-400';
  }
}

export function getFrameRingClass(frameStyle: string, svipLevel = 0, vipLevel = 0): string {
  if (frameStyle === 'frame-ss-imperial') {
    return 'ring-2 ring-[#F5C451] shadow-[0_0_20px_rgba(168,85,247,0.6)]';
  }
  if (frameStyle === 'frame-s-cyber') {
    return 'ring-2 ring-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.55)]';
  }
  if (frameStyle === 'frame-a-speed') {
    return 'ring-2 ring-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.5)]';
  }
  if (frameStyle === 'frame-a-moon') {
    return 'ring-2 ring-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.55)]';
  }
  if (frameStyle === 'frame-a-drift') {
    return 'ring-2 ring-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.5)]';
  }
  if (frameStyle === 'frame-a-mecha') {
    return 'ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.55)]';
  }
  const catalogFrame = frameStyle?.startsWith('frame-') ? getFrameCatalogItem(frameStyle) : undefined;
  if (catalogFrame?.visual) {
    return `ring-2 ${catalogFrame.visual.ringColor}`;
  }
  if (frameStyle === 'svip-sovereign' || svipLevel >= 4) {
    return 'ring-2 ring-[#E5B84B] shadow-[0_0_18px_rgba(229,184,75,0.45)]';
  }
  if (frameStyle === 'svip-gold' || svipLevel >= 1) {
    return 'ring-2 ring-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.35)]';
  }
  if (frameStyle === 'vip-amethyst' || vipLevel >= 3) {
    return 'ring-2 ring-purple-500 shadow-[0_0_12px_rgba(124,58,237,0.35)]';
  }
  if (frameStyle === 'vip-sapphire' || vipLevel >= 1) {
    return 'ring-2 ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]';
  }
  return 'ring-1 ring-white/15';
}

