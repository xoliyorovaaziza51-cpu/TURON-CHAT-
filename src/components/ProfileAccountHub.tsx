import React, { useState } from 'react';
import {
  Award,
  Bell,
  Camera,
  Check,
  ChevronRight,
  Copy,
  Crown,
  Diamond,
  Gem,
  Gift,
  Globe,
  Headphones,
  Heart,
  Home,
  Layers,
  MessageCircle,
  MessageSquarePlus,
  Package,
  Pencil,
  Send,
  Settings,
  Sparkles,
  Store,
  Tag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import { UzbekistanFlagIcon } from './ProfileOrnates';
import { FrameSvg } from './FrameArtwork';
import { RoleBadge, getRoleVisuals } from './RoleBadge';
import { renderGiftIcon } from './GiftShopModal';
import type { Agency, UserProfile } from '../types/turon';

interface ProfileAccountHubProps {
  user: UserProfile;
  userAgency: Agency | null;
  receivedGifts: any[];
  onPickAvatarClick: () => void;
  onOpenEdit: () => void;
  onOpenMedal: () => void;
  onOpenWallet?: () => void;
  onOpenVip?: () => void;
  onOpenAgency?: () => void;
  onOpenCreateOila: () => void;
  onOpenSettings?: () => void;
  onOpenGiftShop: () => void;
  onOpenFrameStore: () => void;
  onOpenCp?: () => void;
  onUserUpdated: (u: UserProfile) => void;
  onStatusMessage: (msg: string) => void;
}

type HubModalType =
  | null
  | 'daraja'
  | 'invite'
  | 'warehouse'
  | 'love_house'
  | 'cp_level'
  | 'collection'
  | 'nameplate'
  | 'support'
  | 'language'
  | 'feedback';

export const ProfileAccountHub: React.FC<ProfileAccountHubProps> = ({
  user,
  userAgency,
  receivedGifts,
  onPickAvatarClick,
  onOpenEdit,
  onOpenMedal,
  onOpenWallet,
  onOpenVip,
  onOpenAgency,
  onOpenCreateOila,
  onOpenSettings,
  onOpenGiftShop: _onOpenGiftShop,
  onOpenFrameStore,
  onOpenCp,
  onUserUpdated,
  onStatusMessage,
}) => {
  const [copiedId, setCopiedId] = useState(false);
  const [activeModal, setActiveModal] = useState<HubModalType>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [supportText, setSupportText] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState(user.frameStyle || 'royal_gold');
  const [savingLang, setSavingLang] = useState(false);
  const roleVisuals = getRoleVisuals(user.role);
  const hasStoreFrame = Boolean(user.frameStyle && user.frameStyle.startsWith('frame-'));

  const levelNum = user.vipLevel + user.svipLevel;

  function handleCopyId() {
    navigator.clipboard?.writeText(user.publicId).catch(() => {});
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  }

  async function handleSaveLanguage(lang: 'uz' | 'ru' | 'en') {
    setSavingLang(true);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ language: lang }),
      });
      onUserUpdated(res.user);
      setActiveModal(null);
      onStatusMessage(
        lang === 'uz'
          ? 'Til: O‘zbekcha tanlandi'
          : lang === 'ru'
          ? 'Til: Русский tanlandi'
          : 'Til: English tanlandi'
      );
    } catch {
      // ignore
    } finally {
      setSavingLang(false);
    }
  }

  async function handleSubmitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackText.trim()) return;
    setFeedbackSaving(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'system',
          targetId: 'feedback',
          reason: 'Foydalanuvchi fikr-mulohazasi',
          details: feedbackText.trim(),
        }),
      });
      setFeedbackText('');
      setActiveModal(null);
      onStatusMessage('Fikr-mulohazangiz qabul qilindi. Rahmat!');
    } catch {
      onStatusMessage('Yuborishda xatolik yuz berdi');
    } finally {
      setFeedbackSaving(false);
    }
  }

  async function handleSubmitSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!supportText.trim()) return;
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          targetType: 'support',
          targetId: user.id,
          reason: 'Mijozlarga xizmat ko‘rsatish murojaati',
          details: supportText.trim(),
        }),
      });
      setSupportText('');
      setSupportSent(true);
      onStatusMessage('Murojaatingiz operatorlarga yuborildi');
    } catch {
      onStatusMessage('Murojaat yuborilmadi');
    }
  }

  const menuListOne = [
    {
      id: 'invite',
      label: 'Taklif qilish orqali tangalar olish',
      icon: StarIconGold,
      action: () => setActiveModal('invite'),
    },
    {
      id: 'warehouse',
      label: 'Rekvizitlar ombori',
      icon: Package,
      iconBg: 'from-cyan-400 to-blue-600 text-white',
      action: () => setActiveModal('warehouse'),
    },
    {
      id: 'love',
      label: 'Sevgi uyi',
      icon: Heart,
      iconBg: 'from-pink-400 to-rose-600 text-white',
      action: () => {
        if (onOpenCp) onOpenCp();
        else setActiveModal('love_house');
      },
    },
    {
      id: 'cp',
      label: 'CP Darajasi',
      icon: Users,
      iconBg: 'from-orange-400 to-red-600 text-white',
      action: () => {
        if (onOpenCp) onOpenCp();
        else setActiveModal('cp_level');
      },
    },
    {
      id: 'oila',
      label: 'Oila',
      icon: Home,
      iconBg: 'from-amber-300 to-amber-600 text-[#2B1200]',
      action: () => {
        if (userAgency && onOpenAgency) onOpenAgency();
        else onOpenCreateOila();
      },
    },
    {
      id: 'collection',
      label: 'Kolleksiya Zali',
      icon: Layers,
      iconBg: 'from-sky-400 to-indigo-600 text-white',
      action: () => setActiveModal('collection'),
    },
    {
      id: 'nameplate',
      label: 'Ismlik taxtasi',
      icon: Tag,
      iconBg: 'from-fuchsia-400 to-purple-600 text-white',
      action: () => setActiveModal('nameplate'),
    },
  ];

  return (
    <div className="relative w-full max-w-[460px] rounded-[28px] overflow-hidden border-2 border-[#E5B84B]/60 bg-gradient-to-b from-[#031036] via-[#071A52] to-[#030B24] shadow-[0_0_50px_rgba(37,99,235,0.4)]">
      {/* Golden Side Laurel Glow Accents */}
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(circle at 22% 10%, rgba(56,189,248,0.28), transparent 45%), radial-gradient(circle at 80% 15%, rgba(168,85,247,0.35), transparent 45%), linear-gradient(115deg, transparent 35%, rgba(59,130,246,0.16) 52%, transparent 68%)',
        }}
      />

      {/* Top Cosmic Moon & Castle Silhouette */}
      <div className="relative pt-4 pb-3 px-4 overflow-hidden">
        <svg
          viewBox="0 0 420 140"
          className="pointer-events-none absolute top-0 right-0 w-72 h-36 opacity-55"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="castleSky" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#93C5FD" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>
          </defs>
          <circle cx="170" cy="24" r="22" fill="#E0F2FE" fillOpacity="0.25" />
          <path
            d="M235 140 L235 88 L248 70 L261 88 L261 140 Z M265 140 L265 56 L282 32 L299 56 L299 140 Z M304 140 L304 72 L318 52 L332 72 L332 140 Z M336 140 L336 44 L356 18 L376 44 L376 140 Z M380 140 L380 82 L396 64 L412 82 L412 140 Z"
            fill="url(#castleSky)"
            fillOpacity="0.45"
          />
          <rect x="278" y="74" width="8" height="12" rx="3" fill="#FDE68A" fillOpacity="0.85" />
          <rect x="352" y="62" width="8" height="14" rx="3" fill="#FDE68A" fillOpacity="0.85" />
          <rect x="314" y="92" width="7" height="11" rx="3" fill="#FDE68A" fillOpacity="0.75" />
        </svg>

        {/* Top Header: Avatar + Golden Laurel Crown + Nickname + Flag + Verified + ID */}
        <div className="relative z-10 flex items-center gap-3.5">
          {/* Avatar inside Golden Laurel Wreath */}
          <div className="relative shrink-0">
            <div className="relative w-[92px] h-[92px] flex items-center justify-center">
              {hasStoreFrame ? (
                <div className="pointer-events-none absolute -inset-3 z-20">
                  <FrameSvg frameId={user.frameStyle} sizeClass="w-full h-full" />
                </div>
              ) : (
                <svg
                  viewBox="0 0 110 110"
                  className="pointer-events-none absolute inset-0 w-full h-full drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="hubLaurelGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="50%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                  </defs>
                  {/* Top Crown */}
                  <path
                    d="M36 22 L32 10 L44 17 L55 6 L66 17 L78 10 L74 22 Z"
                    fill="url(#hubLaurelGold)"
                    stroke="#78350F"
                    strokeWidth="1"
                  />
                  {/* Laurel Left & Right Arcs */}
                  <circle
                    cx="55"
                    cy="58"
                    r="40"
                    fill="none"
                    stroke="url(#hubLaurelGold)"
                    strokeWidth="4.5"
                    strokeDasharray="8 3"
                  />
                  <circle
                    cx="55"
                    cy="58"
                    r="35"
                    fill="none"
                    stroke="#FDE68A"
                    strokeWidth="1.5"
                  />
                </svg>
              )}

              <button
                type="button"
                onClick={onPickAvatarClick}
                className="relative z-10 w-[68px] h-[68px] mt-1.5 rounded-full overflow-hidden bg-[#0F172A] border-2 border-[#FDE68A] group focus:outline-none"
                title="Galereyadan profil rasmi qo‘yish"
              >
                <img
                  src={user.avatarUrl}
                  alt={user.nickname}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </span>
              </button>

              {/* Always-visible Gallery Camera Badge */}
              <button
                type="button"
                onClick={onPickAvatarClick}
                className="absolute bottom-0 right-0 z-20 w-8 h-8 rounded-full bg-gradient-to-b from-[#FDE68A] to-[#D97706] border-2 border-[#031036] text-[#281100] flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
                aria-label="Galereyadan rasm tanlash"
                title="Galereyadan rasm tanlash"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right User Info */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center flex-wrap gap-1.5">
              <span
                className={`font-display text-lg font-extrabold tracking-wide truncate drop-shadow ${
                  roleVisuals.isElevated ? roleVisuals.nameColorClass : 'text-white'
                }`}
              >
                {user.nickname}
              </span>
              <RoleBadge role={user.role} size="sm" />
              <UzbekistanFlagIcon />
              <span
                title="Tasdiqlangan"
                className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0"
              >
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1.5 text-xs text-amber-100 hover:text-[#F5C451] transition-colors"
              >
                <span className="px-1.5 py-0.5 rounded bg-gradient-to-b from-[#F5C451] to-[#B4730B] text-[#1A0800] font-mono text-[10px] font-extrabold border border-amber-200">
                  ID
                </span>
                <span className="font-mono tabular-nums font-bold text-sm text-white">
                  {copiedId ? 'Nusxalandi!' : user.publicId}
                </span>
                <Copy className="w-3.5 h-3.5 text-sky-300" />
              </button>

              <button
                type="button"
                onClick={onOpenEdit}
                className="ml-auto min-h-[36px] px-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-[11px] font-semibold text-white flex items-center gap-1"
              >
                <Pencil className="w-3 h-3 text-[#F5C451]" />
                <span>Tahrirlash</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Glowing Stat Capsules */}
        <div className="relative z-10 grid grid-cols-3 gap-2 mt-4">
          <div className="px-2 py-2 rounded-full bg-gradient-to-b from-[#0C2C78]/95 to-[#06143D]/95 border border-sky-400/70 shadow-[0_0_16px_rgba(56,189,248,0.35)] text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Users className="w-4 h-4 text-sky-300" />
              <span className="font-mono tabular-nums text-base font-extrabold text-white">
                {user.followingCount}
              </span>
            </div>
            <div className="text-[11px] font-medium text-sky-100 truncate mt-0.5">
              Obuna bo‘lish
            </div>
          </div>

          <div className="px-2 py-2 rounded-full bg-gradient-to-b from-[#1A2557]/95 to-[#0B1233]/95 border border-[#E5B84B]/80 shadow-[0_0_16px_rgba(229,184,75,0.35)] text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Bell className="w-4 h-4 text-[#F5C451] fill-[#F5C451]/40" />
              <span className="font-mono tabular-nums text-base font-extrabold text-white">
                {user.followersCount}
              </span>
            </div>
            <div className="text-[11px] font-medium text-amber-100 truncate mt-0.5">
              Obunachilar
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('love_house')}
            className="px-2 py-2 rounded-full bg-gradient-to-b from-[#4C1D95]/95 to-[#240A54]/95 border border-fuchsia-400/75 shadow-[0_0_16px_rgba(217,70,239,0.35)] text-center hover:brightness-110 transition-all"
          >
            <div className="flex items-center justify-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-pink-300 fill-pink-400/40" />
              <span className="font-mono tabular-nums text-base font-extrabold text-white">
                {receivedGifts.length}
              </span>
            </div>
            <div className="text-[11px] font-medium text-pink-100 truncate mt-0.5">
              xabar yo‘qdi
            </div>
          </button>
        </div>

        {/* 4 Quick Action Cards (Hamyon, Aristokratiya, Medal, Do'kon) */}
        <div className="relative z-10 grid grid-cols-4 gap-2 mt-3">
          <button
            type="button"
            onClick={onOpenWallet}
            className="p-2 rounded-2xl bg-gradient-to-b from-[#133A8A]/90 to-[#061847]/95 border border-sky-400/70 shadow-[0_0_14px_rgba(56,189,248,0.28)] flex flex-col items-center gap-1.5 hover:brightness-110 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center text-[#2B1200] shadow">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="w-full py-0.5 rounded-full bg-[#041238]/90 text-[11px] font-semibold text-white text-center truncate">
              Hamyon
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenVip}
            className="p-2 rounded-2xl bg-gradient-to-b from-[#581C87]/90 to-[#230945]/95 border border-fuchsia-400/75 shadow-[0_0_14px_rgba(217,70,239,0.28)] flex flex-col items-center gap-1.5 hover:brightness-110 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FDE68A] to-[#D97706] flex items-center justify-center text-[#2B1200] shadow">
              <Crown className="w-5 h-5" />
            </div>
            <span className="w-full py-0.5 rounded-full bg-[#1C073B]/90 text-[11px] font-semibold text-white text-center truncate">
              Aristokratiya
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenMedal}
            className="p-2 rounded-2xl bg-gradient-to-b from-[#133A8A]/90 to-[#061847]/95 border border-sky-400/70 shadow-[0_0_14px_rgba(56,189,248,0.28)] flex flex-col items-center gap-1.5 hover:brightness-110 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-300 to-orange-500 flex items-center justify-center text-[#2B1200] shadow">
              <Award className="w-5 h-5" />
            </div>
            <span className="w-full py-0.5 rounded-full bg-[#041238]/90 text-[11px] font-semibold text-white text-center truncate">
              Medal
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenFrameStore}
            className="p-2 rounded-2xl bg-gradient-to-b from-[#581C87]/90 to-[#230945]/95 border border-fuchsia-400/75 shadow-[0_0_14px_rgba(217,70,239,0.28)] flex flex-col items-center gap-1.5 hover:brightness-110 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-600 flex items-center justify-center text-white shadow">
              <Store className="w-5 h-5" />
            </div>
            <span className="w-full py-0.5 rounded-full bg-[#1C073B]/90 text-[11px] font-semibold text-white text-center truncate">
              Do‘kon
            </span>
          </button>
        </div>
      </div>

      {/* Main Stacked Banners & Menu Cards */}
      <div className="relative z-10 px-3.5 pb-6 space-y-3">
        {/* SVIP Gold Banner */}
        <button
          type="button"
          onClick={onOpenVip}
          className="w-full min-h-[68px] px-4 py-2.5 rounded-full bg-gradient-to-r from-[#5C3103] via-[#B4690E] to-[#4A2502] border-2 border-[#FDE68A]/85 shadow-[0_0_24px_rgba(245,158,11,0.45)] flex items-center justify-between gap-3 hover:brightness-110 transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#FEF08A] to-[#D97706] flex items-center justify-center text-[#3B1700] shrink-0 shadow">
              <Crown className="w-6 h-6 fill-amber-600/30" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-extrabold tracking-wide text-[#FEF08A]">
                SVIP {user.svipLevel > 0 ? `· ${user.svipLevel}` : ''}
              </div>
              <div className="text-xs text-amber-100/90 truncate">
                Qo‘shimcha Imtiyozlarni Ochish
              </div>
            </div>
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-gradient-to-b from-[#FDE68A] to-[#B45309] border border-amber-200 text-[#2B1200] font-display text-xs font-extrabold tracking-wider shrink-0 shadow">
            SVIP
          </div>
        </button>

        {/* Daraja (Level) Royal Blue Banner */}
        <button
          type="button"
          onClick={() => setActiveModal('daraja')}
          className="w-full min-h-[68px] px-4 py-2.5 rounded-full bg-gradient-to-r from-[#051B5A] via-[#0B43B8] to-[#041447] border-2 border-sky-300/80 shadow-[0_0_24px_rgba(56,189,248,0.4)] flex items-center justify-between gap-3 hover:brightness-110 transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-sky-300 to-blue-600 flex items-center justify-center text-white shrink-0 shadow">
              <Gem className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-extrabold tracking-wide text-white">
                Daraja · Lv.{levelNum}
              </div>
              <div className="text-xs text-sky-100/90 truncate">
                Qo‘shimcha Imtiyozlarni Ochish
              </div>
            </div>
          </div>

          <div className="w-11 h-11 rounded-full bg-[#041447]/90 border-2 border-[#E5B84B] flex items-center justify-center text-sky-300 shrink-0 shadow">
            <Diamond className="w-5 h-5 fill-sky-400/40" />
          </div>
        </button>

        {/* Menu Card 1 (7 items) */}
        <div className="rounded-3xl bg-gradient-to-b from-[#071D59]/95 to-[#041138]/95 border border-sky-400/55 shadow-[0_0_25px_rgba(37,99,235,0.28)] divide-y divide-white/[0.08] overflow-hidden">
          {menuListOne.map((item) => {
            const IconComp = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.id === 'invite' ? (
                    <StarIconGold />
                  ) : (
                    <span
                      className={`w-7 h-7 rounded-lg bg-gradient-to-br ${item.iconBg} flex items-center justify-center shrink-0 shadow`}
                    >
                      <IconComp className="w-4 h-4" />
                    </span>
                  )}
                  <span className="text-sm font-semibold text-white truncate">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-sky-200/80 shrink-0" />
              </button>
            );
          })}
        </div>

        {/* Green Customer Service Online Banner */}
        <button
          type="button"
          onClick={() => {
            setSupportSent(false);
            setActiveModal('support');
          }}
          className="w-full min-h-[68px] px-4 py-2.5 rounded-full bg-gradient-to-r from-[#063E23] via-[#0B6E3E] to-[#05351E] border-2 border-emerald-400/75 shadow-[0_0_24px_rgba(16,185,129,0.35)] flex items-center justify-between gap-3 hover:brightness-110 transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-emerald-950 border-2 border-emerald-300 flex items-center justify-center text-emerald-300 shrink-0 shadow">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-sm sm:text-base font-bold text-white truncate">
                Mijozlarga xizmat ko‘rsatish
              </div>
              <div className="text-xs font-medium text-amber-200 truncate">
                Biz har doim siz bilan!
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-300/80 text-[11px] font-extrabold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>ONLAYN</span>
            </span>
            <ChevronRight className="w-4 h-4 text-emerald-200" />
          </div>
        </button>

        {/* Menu Card 2 (Til, Fikr-mulohaza, Sozlamalar) */}
        <div className="rounded-3xl bg-gradient-to-b from-[#071D59]/95 to-[#041138]/95 border border-sky-400/55 shadow-[0_0_25px_rgba(37,99,235,0.28)] divide-y divide-white/[0.08] overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveModal('language')}
            className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center shadow">
                <Globe className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-white">Til</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-sky-200">
              <span className="uppercase font-mono">{user.language || 'uz'}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveModal('feedback')}
            className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-fuchsia-600 text-white flex items-center justify-center shadow">
                <MessageSquarePlus className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-white">Fikr-mulohaza</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 border border-purple-300/50 text-[11px] font-semibold text-white flex items-center gap-1">
                <Pencil className="w-3 h-3 text-[#FDE68A]" />
                <span>Bizga yozing</span>
              </span>
              <ChevronRight className="w-4 h-4 text-sky-200/80" />
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full min-h-[48px] px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.05] transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 to-orange-500 text-[#2B1200] flex items-center justify-center shadow">
                <Settings className="w-4 h-4" />
              </span>
              <span className="text-sm font-semibold text-white">Sozlamalar</span>
            </div>
            <ChevronRight className="w-4 h-4 text-sky-200/80" />
          </button>
        </div>
      </div>

      {/* Sub-Modals for Hub Actions */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#08153B] border border-sky-400/40 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-bold text-white">
                {activeModal === 'daraja' && `Daraja · Lv.${levelNum}`}
                {activeModal === 'invite' && 'Taklif qilish orqali tangalar olish'}
                {activeModal === 'warehouse' && 'Rekvizitlar ombori'}
                {activeModal === 'love_house' && 'Sevgi uyi va Yaqinlik'}
                {activeModal === 'cp_level' && 'CP Darajasi'}
                {activeModal === 'collection' && 'Kolleksiya Zali'}
                {activeModal === 'nameplate' && 'Ismlik taxtasi'}
                {activeModal === 'support' && 'Mijozlarga xizmat ko‘rsatish'}
                {activeModal === 'language' && 'Ilova tilini tanlang'}
                {activeModal === 'feedback' && 'Fikr-mulohaza yuborish'}
              </h4>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-sky-200 hover:text-white"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModal === 'daraja' && (
              <div className="space-y-3 text-sm text-slate-200">
                <div className="p-4 rounded-xl bg-[#041030] border border-sky-400/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-sky-300">Joriy daraja</div>
                    <div className="font-display text-2xl font-extrabold text-white">
                      Lv.{levelNum}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-amber-300">
                    <div>VIP: {user.vipLevel}</div>
                    <div>SVIP: {user.svipLevel}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ovozli xonalarda faol bo‘lish, sovg‘alar ulashish va VIP/SVIP darajalarini
                  oshirish orqali qo‘shimcha imtiyozlar hamda maxsus nishonlarni oching.
                </p>
                {onOpenVip && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      onOpenVip();
                    }}
                    className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold text-sm"
                  >
                    VIP / SVIP imtiyozlarini ko‘rish
                  </button>
                )}
              </div>
            )}

            {activeModal === 'invite' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Do‘stlaringizni TURON CHAT’ga taklif qiling va ular sizning ID raqamingiz orqali
                  ro‘yxatdan o‘tganda bonus tangalar oling.
                </p>
                <div className="p-3.5 rounded-xl bg-[#041030] border border-amber-400/40 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-amber-300">Sizning taklif ID raqamingiz</div>
                    <div className="font-mono text-lg font-bold text-white">{user.publicId}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="min-h-[40px] px-3.5 rounded-xl bg-[#E5B84B] text-[#1A0800] font-bold text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedId ? 'Nusxalandi!' : 'Nusxalash'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'warehouse' && (
              <div className="space-y-3">
                <div className="text-xs text-sky-200">
                  Taqilgan medal: <span className="font-semibold text-[#F5C451]">{user.equippedMedal}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'royal_gold', label: 'Oltin Qirollik' },
                    { id: 'violet_crown', label: 'Binafsha Toj' },
                    { id: 'sapphire_aura', label: 'Sapfir Nur' },
                    { id: 'turon_classic', label: 'Turon Klassik' },
                  ].map((fr) => (
                    <button
                      key={fr.id}
                      type="button"
                      onClick={() => setSelectedFrame(fr.id)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold ${
                        selectedFrame === fr.id
                          ? 'bg-blue-600/25 border-[#E5B84B] text-white'
                          : 'bg-[#041030] border-white/10 text-slate-300'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-[#F5C451] mb-1" />
                      <div>{fr.label}</div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      onOpenFrameStore();
                    }}
                    className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#FDE047] to-[#22D3EE] text-[#05101F] font-extrabold text-xs sm:text-sm"
                  >
                    Romkalar do‘koni
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal(null);
                      onOpenMedal();
                    }}
                    className="min-h-[44px] rounded-xl bg-blue-600 text-white font-semibold text-xs sm:text-sm"
                  >
                    Medal tanlash
                  </button>
                </div>
              </div>
            )}

            {(activeModal === 'love_house' || activeModal === 'cp_level') && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-xl bg-[#041030] border border-pink-400/30 text-center">
                    <div className="text-xs text-pink-200">Olingan sovg‘alar</div>
                    <div className="font-mono text-lg font-bold text-[#F5C451] mt-1">
                      {formatCoins(user.totalReceived)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#041030] border border-sky-400/30 text-center">
                    <div className="text-xs text-sky-200">Yuborilgan</div>
                    <div className="font-mono text-lg font-bold text-white mt-1">
                      {formatCoins(user.totalGifted)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  Do‘stlaringiz bilan sovg‘alar almashing va xonalarda birga suhbatlashib yaqinlik
                  hamda CP darajangizni oshiring.
                </p>
              </div>
            )}

            {activeModal === 'collection' && (
              <div className="space-y-3">
                {receivedGifts.length === 0 ? (
                  <p className="text-xs text-slate-300">
                    Kolleksiya zalida hozircha sovg‘alar yo‘q. Do‘kondan sovg‘a yuborish yoki qabul
                    qilish orqali to‘plang.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {receivedGifts.slice(0, 8).map((g) => (
                      <div
                        key={g.id}
                        className="p-3 rounded-xl bg-[#041030] border border-white/10 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#E5B84B]/15 text-[#F5C451] flex items-center justify-center">
                            {renderGiftIcon(g.gift_icon, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {g.quantity}× {g.gift_name}
                            </div>
                            <div className="text-[11px] text-slate-400">{g.sender_nickname}</div>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-[#F5C451]">
                          {formatCoins(g.total_coins)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeModal === 'nameplate' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#1A0636] via-[#4C1D95] to-[#1A0636] border border-[#E5B84B]/70 text-center">
                  <div className="font-display text-lg font-extrabold text-white">
                    {user.nickname}
                  </div>
                  <div className="text-xs text-amber-300 mt-1">
                    {user.equippedMedal} · ID {user.publicId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal(null);
                    onOpenEdit();
                  }}
                  className="w-full min-h-[44px] rounded-xl bg-purple-600 text-white font-semibold text-sm"
                >
                  Taxallus va tanishtiruvni tahrirlash
                </button>
              </div>
            )}

            {activeModal === 'support' && (
              <form onSubmit={handleSubmitSupport} className="space-y-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span>Operatorlar onlayn — savolingizni qoldiring.</span>
                </div>
                {supportSent ? (
                  <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-400/40 text-xs text-white">
                    Murojaatingiz yuborildi! Tez orada bildirishnomalar bo‘limida javob olasiz.
                  </div>
                ) : (
                  <>
                    <textarea
                      rows={3}
                      required
                      value={supportText}
                      onChange={(e) => setSupportText(e.target.value)}
                      placeholder="Savol yoki muammoingizni yozing..."
                      className="w-full p-3 bg-[#041030] border border-sky-400/30 rounded-xl text-sm text-white"
                    />
                    <button
                      type="submit"
                      className="w-full min-h-[44px] rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Yuborish</span>
                    </button>
                  </>
                )}
              </form>
            )}

            {activeModal === 'language' && (
              <div className="space-y-2.5">
                {[
                  { code: 'uz' as const, name: 'O‘zbekcha (Asosiy)' },
                  { code: 'ru' as const, name: 'Русский' },
                  { code: 'en' as const, name: 'English' },
                ].map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    disabled={savingLang}
                    onClick={() => handleSaveLanguage(l.code)}
                    className={`w-full min-h-[46px] px-4 rounded-xl border flex items-center justify-between text-sm font-semibold ${
                      (user.language || 'uz') === l.code
                        ? 'bg-blue-600/30 border-[#E5B84B] text-white'
                        : 'bg-[#041030] border-white/10 text-slate-300'
                    }`}
                  >
                    <span>{l.name}</span>
                    {(user.language || 'uz') === l.code && (
                      <Check className="w-4 h-4 text-[#F5C451]" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {activeModal === 'feedback' && (
              <form onSubmit={handleSubmitFeedback} className="space-y-3">
                <textarea
                  rows={4}
                  required
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Taklif yoki fikringizni yozing..."
                  className="w-full p-3 bg-[#041030] border border-sky-400/30 rounded-xl text-sm text-white"
                />
                <button
                  type="submit"
                  disabled={feedbackSaving}
                  className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold text-sm"
                >
                  {feedbackSaving ? 'Yuborilmoqda...' : 'Fikr-mulohazani yuborish'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function StarIconGold() {
  return (
    <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FEF08A] to-[#D97706] text-[#2B1200] flex items-center justify-center shrink-0 shadow">
      <Sparkles className="w-4 h-4" />
    </span>
  );
}
