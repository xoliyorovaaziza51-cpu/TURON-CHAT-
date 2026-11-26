import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  Gift,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  Plus,
  Shield,
  Sparkles,
  Star,
  Store,
  Trash2,
  Upload,
  User as UserIcon,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import { GiftShopModal, renderGiftIcon } from './GiftShopModal';
import type { RoomGiftEffectEvent } from './Gift3DEffectOverlay';
import { FrameStoreModal } from './FrameStoreModal';
import { FrameSvg } from './FrameArtwork';
import { RoleBadge, getRoleVisuals } from './RoleBadge';
import { ProfileAccountHub } from './ProfileAccountHub';
import {
  CrystalClusterCorner,
  GoldenWingsCrownFrame,
  UzbekistanFlagIcon,
} from './ProfileOrnates';
import type { Agency, UserProfile } from '../types/turon';

interface ProfileViewProps {
  profileUser: UserProfile;
  currentUser: UserProfile;
  onUserUpdated: (u: UserProfile) => void;
  onGiftSent?: (event: RoomGiftEffectEvent) => void;
  onStartMessage: (userId: string) => void;
  onBack?: () => void;
  onOpenAgency?: () => void;
  onOpenSettings?: () => void;
  onOpenWallet?: () => void;
  onOpenVip?: () => void;
  onOpenCp?: () => void;
}

function compressImageFile(file: File, maxDim = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

const AVATAR_CHOICES = [
  '/src/assets/images/avatar_host_male_1794822314575.jpg',
  '/src/assets/images/avatar_host_female_1794822314393.jpg',
  '/src/assets/images/avatar_host_creator_1794822315118.jpg',
];

const MEDAL_OPTIONS = [
  { id: 'Turon Yulduzi', desc: 'Faol hamjamiyat a’zosi' },
  { id: 'Oltin Ovoz', desc: 'Jonli xonalar boshlovchisi' },
  { id: 'Samarqand Toji', desc: 'Yuqori reyting sohibi' },
  { id: 'PK Qahramoni', desc: 'Do‘stona PK bellashuv g‘olibi' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profileUser,
  currentUser,
  onUserUpdated,
  onGiftSent,
  onStartMessage,
  onBack,
  onOpenAgency,
  onOpenSettings,
  onOpenWallet,
  onOpenVip,
  onOpenCp,
}) => {
  const [user, setUser] = useState<UserProfile>(profileUser);
  const [receivedGifts, setReceivedGifts] = useState<any[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'hub'>('card');
  const [profileTab, setProfileTab] = useState<'profil' | 'yaqinlik'>('profil');

  // Modals
  const [showEdit, setShowEdit] = useState(false);
  const [showMedalModal, setShowMedalModal] = useState(false);
  const [showCreateOilaModal, setShowCreateOilaModal] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showFrameStore, setShowFrameStore] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // Edit fields
  const [nickname, setNickname] = useState(user.nickname);
  const [bio, setBio] = useState(user.bio);
  const [country, setCountry] = useState(user.country);
  const [gender, setGender] = useState(user.gender);
  const [birthYear, setBirthYear] = useState(user.birthYear ? String(user.birthYear) : '1999');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);

  // Create Oila fields
  const [oilaName, setOilaName] = useState('');
  const [oilaDesc, setOilaDesc] = useState('');

  // Report fields
  const [reportReason, setReportReason] = useState('Nomaqbul xatti-harakat');
  const [reportDetails, setReportDetails] = useState('');

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const isSelf = user.id === currentUser.id;

  async function refreshProfile() {
    try {
      const [uRes, agRes] = await Promise.all([
        apiFetch<{ user: UserProfile; receivedGifts: any[] }>(`/api/users/${profileUser.id}`),
        apiFetch<{ agencies: Agency[] }>('/api/agencies'),
      ]);
      setUser(uRes.user);
      setReceivedGifts(uRes.receivedGifts || []);
      setAgencies(agRes.agencies || []);
      setNickname(uRes.user.nickname);
      setBio(uRes.user.bio);
      setCountry(uRes.user.country);
      setGender(uRes.user.gender);
      setBirthYear(uRes.user.birthYear ? String(uRes.user.birthYear) : '1999');
      setAvatarUrl(uRes.user.avatarUrl);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    refreshProfile();
  }, [profileUser.id]);

  const userAgency = agencies.find((a) => a.id === user.agencyId) || null;
  const ageNum = user.birthYear ? Math.max(18, new Date().getFullYear() - user.birthYear) : 26;
  const levelNum = user.vipLevel + user.svipLevel;

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({
          nickname,
          bio,
          country,
          gender,
          birthYear: Number(birthYear),
          avatarUrl,
        }),
      });
      setUser(res.user);
      onUserUpdated(res.user);
      setShowEdit(false);
      setStatusMsg('Profil ma’lumotlari saqlandi');
    } catch {
      // ignore
    }
  }

  async function handleSelectMedal(medalName: string) {
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ equippedMedal: medalName }),
      });
      setUser(res.user);
      onUserUpdated(res.user);
      setShowMedalModal(false);
      setStatusMsg(`"${medalName}" medali taqildi`);
    } catch {
      // ignore
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setStatusMsg('Rasm hajmi 15 MB dan oshmasligi kerak');
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, 512, 0.86);
      setAvatarUrl(dataUrl);
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: dataUrl }),
      });
      setUser(res.user);
      onUserUpdated(res.user);
      setStatusMsg('Profil rasmi galereyadan muvaffaqiyatli qo‘yildi!');
    } catch {
      setStatusMsg('Rasmni yuklashda xatolik yuz berdi');
    } finally {
      e.target.value = '';
    }
  }

  async function handleSetPhotoAsAvatar(photoUrl: string) {
    try {
      setAvatarUrl(photoUrl);
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ avatarUrl: photoUrl }),
      });
      setUser(res.user);
      onUserUpdated(res.user);
      setStatusMsg('Tanlangan foto profil rasmi qilib belgilandi!');
    } catch {
      // ignore
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setStatusMsg('Rasm hajmi 15 MB dan oshmasligi kerak');
      return;
    }
    try {
      const dataUrl = await compressImageFile(file, 1080, 0.84);
      const nextPhotos = [dataUrl, ...(user.photos || [])].slice(0, 12);
      const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ photos: nextPhotos }),
      });
      setUser(res.user);
      onUserUpdated(res.user);
      setStatusMsg('Foto qo‘shildi');
    } catch {
      setStatusMsg('Foto yuklashda xatolik yuz berdi');
    } finally {
      e.target.value = '';
    }
  }

  async function handleRemovePhoto(index: number) {
    const nextPhotos = (user.photos || []).filter((_, i) => i !== index);
    const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ photos: nextPhotos }),
    });
    setUser(res.user);
    onUserUpdated(res.user);
  }

  async function handleCreateOila(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/api/agencies', {
        method: 'POST',
        body: JSON.stringify({ name: oilaName, description: oilaDesc }),
      });
      setShowCreateOilaModal(false);
      setOilaName('');
      setOilaDesc('');
      setStatusMsg('Oila (Agentlik) muvaffaqiyatli yaratildi!');
      refreshProfile();
    } catch (err: any) {
      setStatusMsg(err.message || 'Oila yaratishda xatolik');
    }
  }

  async function handleFollow() {
    const res = await apiFetch<{ following: boolean }>(`/api/users/${user.id}/follow`, {
      method: 'POST',
    });
    setUser((prev) => ({
      ...prev,
      isFollowing: res.following,
      followersCount: prev.followersCount + (res.following ? 1 : -1),
    }));
  }

  async function handleFriend() {
    const res = await apiFetch<{ status: string }>(`/api/users/${user.id}/friend-request`, {
      method: 'POST',
    });
    setUser((prev) => ({
      ...prev,
      friendStatus: res.status === 'accepted' ? 'accepted' : 'pending_sent',
    }));
  }

  async function handleBlock() {
    const res = await apiFetch<{ blocked: boolean }>(`/api/users/${user.id}/block`, {
      method: 'POST',
    });
    setUser((prev) => ({ ...prev, isBlocked: res.blocked }));
  }

  async function handleRequestCp() {
    try {
      await apiFetch('/api/cp/request', {
        method: 'POST',
        body: JSON.stringify({ partnerId: user.id }),
      });
      setStatusMsg(`${user.nickname} ga CP so‘rovi yuborildi!`);
    } catch (err: any) {
      setStatusMsg(err.message || 'CP so‘rovini yuborishda xatolik');
    }
  }

  async function handleReport(e: React.FormEvent) {
    e.preventDefault();
    await apiFetch('/api/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'user',
        targetId: user.id,
        reason: reportReason,
        details: reportDetails,
      }),
    });
    setShowReport(false);
    setReportDetails('');
    setStatusMsg('Shikoyat moderatorlarga yuborildi');
  }

  function handleCopyId() {
    navigator.clipboard?.writeText(user.publicId).catch(() => {});
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  }

  return (
    <div className="pb-24 lg:pb-10 flex flex-col items-center gap-4">
      {/* Hidden Gallery Input for Setting Profile Avatar */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      {/* Mode Switcher when viewing own profile: Unchanged Cosmic Profile Card vs Account Hub */}
      {isSelf && (
        <div className="w-full max-w-[460px] p-1 rounded-2xl bg-[#0F1524] border border-white/10 grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'card'
                ? 'bg-gradient-to-r from-[#6D28D9] to-[#9333EA] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Profil ko‘rinishi
          </button>
          <button
            type="button"
            onClick={() => setViewMode('hub')}
            className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              viewMode === 'hub'
                ? 'bg-gradient-to-r from-blue-600 to-amber-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Shaxsiy kabinet
          </button>
        </div>
      )}

      {isSelf && viewMode === 'hub' ? (
        <div className="w-full flex flex-col items-center gap-3">
          {statusMsg && (
            <div className="w-full max-w-[460px] px-3.5 py-2 rounded-xl bg-blue-900/70 border border-amber-400/50 text-xs text-amber-100 text-center">
              {statusMsg}
            </div>
          )}
          <ProfileAccountHub
            user={user}
            userAgency={userAgency}
            receivedGifts={receivedGifts}
            onPickAvatarClick={() => avatarInputRef.current?.click()}
            onOpenEdit={() => setShowEdit(true)}
            onOpenMedal={() => setShowMedalModal(true)}
            onOpenWallet={onOpenWallet}
            onOpenVip={onOpenVip}
            onOpenAgency={onOpenAgency}
            onOpenCreateOila={() => setShowCreateOilaModal(true)}
            onOpenSettings={onOpenSettings}
            onOpenGiftShop={() => setShowGift(true)}
            onOpenFrameStore={() => setShowFrameStore(true)}
            onOpenCp={onOpenCp}
            onUserUpdated={(updated) => {
              setUser(updated);
              onUserUpdated(updated);
            }}
            onStatusMessage={(msg) => setStatusMsg(msg)}
          />
        </div>
      ) : (
      /* Main Ornate Cosmic Purple & Gold Profile Canvas (Preserved Reference Aesthetic & Layout) */
      <div className="relative w-full max-w-[460px] rounded-[28px] overflow-hidden border border-purple-400/35 bg-gradient-to-b from-[#13032B] via-[#1C0640] to-[#0A0219] shadow-[0_0_50px_rgba(124,58,237,0.35)]">
        {/* Diagonal Violet Beams & Starry Background Glows */}
        <div
          className="pointer-events-none absolute inset-0 opacity-65"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 12%, rgba(168,85,247,0.42), transparent 48%), radial-gradient(circle at 88% 68%, rgba(245,158,11,0.18), transparent 40%), linear-gradient(125deg, transparent 22%, rgba(147,51,234,0.22) 38%, transparent 55%), linear-gradient(-125deg, transparent 25%, rgba(192,132,252,0.16) 44%, transparent 62%)',
          }}
        />

        {/* Decorative Golden Ribbon Arcs Top & Bottom */}
        <div className="pointer-events-none absolute top-[188px] -left-10 right-0 h-[1px] bg-gradient-to-r from-amber-300/70 via-purple-400/40 to-amber-300/70" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-end justify-between opacity-75">
          <CrystalClusterCorner side="left" />
          <CrystalClusterCorner side="right" />
        </div>

        {/* Content Stack */}
        <div className="relative z-10 px-4 pt-4 pb-6 space-y-4">
          {/* 1. Top Header Row (< Back  ---  Edit Pencil) */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="w-11 h-11 rounded-full bg-[#1C083D]/90 border-2 border-[#E5B84B]/80 shadow-[0_0_14px_rgba(229,184,75,0.45)] flex items-center justify-center text-white hover:scale-105 transition-transform"
              aria-label="Orqaga"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {isSelf ? (
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="w-11 h-11 rounded-full bg-white/95 border-2 border-[#E5B84B] shadow-[0_0_16px_rgba(229,184,75,0.65)] flex items-center justify-center text-amber-600 hover:scale-105 transition-transform"
                aria-label="Profilni tahrirlash"
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowGift(true)}
                className="w-11 h-11 rounded-full bg-[#1C083D]/90 border-2 border-[#E5B84B] shadow-[0_0_14px_rgba(229,184,75,0.5)] flex items-center justify-center text-[#E5B84B]"
                aria-label="Sovg'a yuborish"
              >
                <Gift className="w-4 h-4" />
              </button>
            )}
          </div>

          {statusMsg && (
            <div className="px-3.5 py-2 rounded-xl bg-purple-900/70 border border-amber-400/50 text-xs text-amber-100 text-center">
              {statusMsg}
            </div>
          )}

          {/* 2. Center Avatar Inside Golden Winged Crown Frame or Store Frame + Online Capsule */}
          <div className="relative flex flex-col items-center -mt-3">
            {user.frameStyle && user.frameStyle.startsWith('frame-') ? (
              <div className="relative flex items-center justify-center w-[164px] h-[164px] my-1">
                <div className="relative z-10 w-[104px] h-[104px] rounded-full overflow-hidden bg-[#15062B] border border-white/20">
                  {isSelf ? (
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-full h-full relative group focus:outline-none"
                      title="Galereyadan profil rasmi qo‘yish"
                    >
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.nickname}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="w-10 h-10 text-purple-200 mx-auto" />
                      )}
                      <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-5 h-5 text-white" />
                      </span>
                    </button>
                  ) : user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.nickname}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-purple-200" />
                  )}
                </div>
                <div className="pointer-events-none absolute inset-0 z-20">
                  <FrameSvg frameId={user.frameStyle} sizeClass="w-full h-full" />
                </div>
              </div>
            ) : (
              <GoldenWingsCrownFrame size="lg">
                {isSelf ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full h-full relative group focus:outline-none"
                    title="Galereyadan profil rasmi qo‘yish"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.nickname}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-10 h-10 text-purple-200 mx-auto" />
                    )}
                    <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-5 h-5 text-white" />
                    </span>
                  </button>
                ) : user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.nickname}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-10 h-10 text-purple-200" />
                )}
              </GoldenWingsCrownFrame>
            )}

            {/* Right-aligned Online pill */}
            <div className="w-full flex justify-end -mt-5 pr-1">
              <div className="px-2.5 py-1 rounded-full bg-[#091815]/90 border border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
                <span
                  className={`w-2 h-2 rounded-full ${
                    user.onlineStatus === 'offline' ? 'bg-slate-400' : 'bg-emerald-400'
                  }`}
                />
                <span>{user.onlineStatus === 'offline' ? 'Offline' : 'Online'}</span>
              </div>
            </div>
          </div>

          {/* 3. Nickname + Role Crest + Verified + Age/Gender + UZ Flag */}
          <div className="text-center space-y-2 -mt-1">
            <div className="flex items-center justify-center flex-wrap gap-1.5">
              <Crown className="w-5 h-5 text-[#F5C451] fill-[#F5C451]/30" />
              <span
                className={`font-display text-xl font-extrabold italic tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] ${
                  getRoleVisuals(user.role).isElevated
                    ? getRoleVisuals(user.role).nameColorClass
                    : 'text-white'
                }`}
              >
                {user.nickname}
              </span>
              <RoleBadge role={user.role} size="sm" />
              <span
                title="Tasdiqlangan"
                className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] font-bold"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 text-white text-[11px] font-bold flex items-center gap-0.5 shadow-sm">
                <span>{user.gender === 'female' ? '♀' : '♂'}</span>
                <span className="font-mono tabular-nums">{ageNum}</span>
              </span>
              <UzbekistanFlagIcon />
            </div>

            {/* ID + Followers Line */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-200">
              <button
                type="button"
                onClick={handleCopyId}
                className="flex items-center gap-1.5 hover:text-[#F5C451] transition-colors"
                title="ID nusxalash"
              >
                <span className="px-1.5 py-0.5 rounded bg-gradient-to-b from-[#F5C451] to-[#B4730B] text-[#1A0800] font-mono text-[10px] font-extrabold border border-amber-200">
                  ID
                </span>
                <span className="font-mono tabular-nums font-semibold">
                  {copiedId ? 'Nusxalandi!' : user.publicId}
                </span>
                <Copy className="w-3 h-3 text-purple-300" />
              </button>

              <span className="text-purple-400">|</span>

              <span className="flex items-center gap-1 text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-purple-300" />
                <span className="font-mono tabular-nums">{user.followersCount}</span>
                <span>ta obunachi</span>
              </span>
            </div>

            {/* Level Crest (Lv.X) with Gold Wings */}
            <div className="flex items-center justify-center pt-0.5">
              <div className="inline-flex items-center gap-2 px-5 py-1 rounded-full bg-gradient-to-r from-[#2B0C57] via-[#4A148C] to-[#2B0C57] border border-[#E5B84B]/70 shadow-[0_0_16px_rgba(229,184,75,0.35)]">
                <Shield className="w-4 h-4 text-[#F5C451] fill-purple-600" />
                <span className="font-display text-sm font-extrabold italic text-white">
                  Lv.{levelNum}
                </span>
                <Sparkles className="w-3.5 h-3.5 text-[#F5C451]" />
              </div>
            </div>
          </div>

          {/* 4. Medal & Profil Romkalari Bars */}
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => isSelf && setShowMedalModal(true)}
              className="w-full min-h-[48px] px-4 rounded-full bg-gradient-to-r from-[#2D0C5E] via-[#6D28D9] to-[#3B0F7A] border border-purple-300/50 shadow-[0_0_22px_rgba(147,51,234,0.5)] flex items-center justify-between text-white hover:brightness-110 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#FDE68A] to-[#D97706] flex items-center justify-center text-[#3B1700] shadow">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <span className="font-display font-semibold text-sm">Medal</span>
                <span className="text-xs text-purple-200/90">· {user.equippedMedal}</span>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-purple-100">
                <span>{isSelf ? 'Kiyish' : 'Ko‘rish'}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>

            {isSelf && (
              <button
                type="button"
                onClick={() => setShowFrameStore(true)}
                className="w-full min-h-[46px] px-4 rounded-full bg-gradient-to-r from-[#0E1E4A] via-[#1C3B8B] to-[#111938] border border-sky-300/60 shadow-[0_0_20px_rgba(56,189,248,0.3)] flex items-center justify-between text-white hover:brightness-110 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-b from-[#FFF04D] to-[#2CF6D2] flex items-center justify-center text-[#05101F] shadow">
                    <Store className="w-4 h-4" />
                  </div>
                  <span className="font-display font-semibold text-sm">Do‘kon · Profil romkalari</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-[#FDE047]">
                  <span>Tanlash</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            )}
          </div>

          {/* 5. Tabs Row (Profil · Yaqinlik · Oila markazi >) */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileTab('profil')}
                className={`min-h-[38px] px-4 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  profileTab === 'profil'
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#9333EA] text-white border border-purple-200/70 shadow-[0_0_16px_rgba(168,85,247,0.65)]'
                    : 'text-purple-200/80 hover:text-white'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Profil</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileTab('yaqinlik')}
                className={`min-h-[38px] px-3 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-all ${
                  profileTab === 'yaqinlik'
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#9333EA] text-white border border-purple-200/70 shadow-[0_0_16px_rgba(168,85,247,0.65)]'
                    : 'text-purple-200/80 hover:text-white'
                }`}
              >
                <Star className="w-4 h-4 fill-purple-200/70" />
                <span>Yaqinlik</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenAgency}
              className="min-h-[38px] px-2 flex items-center gap-1.5 text-xs font-semibold text-white hover:text-[#F5C451] transition-colors"
            >
              <Crown className="w-4 h-4 text-[#F5C451]" />
              <span>Oila markazi</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {profileTab === 'profil' ? (
            <div className="space-y-4">
              {/* 6. Oila Section (OILA YARATISH) */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="w-6 h-6 rounded-lg bg-gradient-to-b from-[#FDE68A] to-[#B45309] flex items-center justify-center text-[#281100]">
                    <Shield className="w-3.5 h-3.5 fill-current" />
                  </span>
                  <span>Oila</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (userAgency && onOpenAgency) onOpenAgency();
                    else if (isSelf) setShowCreateOilaModal(true);
                    else if (onOpenAgency) onOpenAgency();
                  }}
                  className="w-full min-h-[58px] px-4 rounded-full bg-gradient-to-r from-[#1A0636] via-[#4C1D95]/80 to-[#1A0636] border-2 border-[#E5B84B]/85 shadow-[0_0_24px_rgba(229,184,75,0.35)] flex items-center justify-between gap-3 hover:brightness-110 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-[#FDE68A] to-[#B45309] flex items-center justify-center text-[#2B1200] shrink-0 shadow">
                      <Home className="w-5 h-5" />
                    </div>
                    <span className="font-display text-sm sm:text-base font-bold tracking-wide text-white uppercase truncate">
                      {userAgency ? userAgency.name : 'OILA YARATISH'}
                    </span>
                  </div>
                  <span className="w-9 h-9 rounded-full bg-[#13042B] border-2 border-[#E5B84B] flex items-center justify-center text-white shrink-0">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              </div>

              {/* 7. Shaxsiy tanishtiruv Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="w-6 h-6 rounded-full bg-purple-400/25 border border-purple-300/50 flex items-center justify-center text-purple-200">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </span>
                  <span>Shaxsiy tanishtiruv</span>
                </div>

                <div
                  onClick={() => isSelf && setShowEdit(true)}
                  className={`relative min-h-[52px] px-4 py-3 rounded-full bg-gradient-to-r from-[#2D0C5E] via-[#6D28D9] to-[#3B0F7A] border border-purple-300/50 shadow-[0_0_22px_rgba(147,51,234,0.45)] flex items-center justify-between gap-2 ${
                    isSelf ? 'cursor-pointer hover:brightness-110' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-8">
                    <span className="font-serif text-3xl leading-none text-white/90 select-none">
                      &ldquo;
                    </span>
                    <span className="text-sm italic text-purple-50 truncate">
                      - {user.bio || 'Dream big, live greater...'}
                    </span>
                    <Crown className="w-4 h-4 text-[#F5C451] shrink-0" />
                  </div>

                  {/* Decorative Golden Heart Emblem on Right */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#FDE68A] to-[#B45309] border border-amber-200 flex items-center justify-center text-purple-700 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.55)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* 8. Foto Section */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="w-6 h-6 rounded-lg bg-gradient-to-b from-[#FDE68A] to-[#D97706] flex items-center justify-center text-[#2B1200]">
                      <Camera className="w-3.5 h-3.5" />
                    </span>
                    <span>Foto</span>
                  </div>
                  {user.photos && user.photos.length > 0 && (
                    <span className="text-xs font-mono text-purple-200">
                      {user.photos.length} ta rasm
                    </span>
                  )}
                </div>

                {user.photos && user.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {user.photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="relative aspect-square rounded-xl overflow-hidden border border-[#E5B84B]/50 bg-[#15062B]"
                      >
                        <img
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {isSelf && (
                          <div className="absolute top-1 right-1 flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetPhotoAsAvatar(photo)}
                              className="w-6 h-6 rounded-full bg-purple-900/85 border border-[#E5B84B]/70 text-[#F5C451] flex items-center justify-center"
                              title="Profil rasmi qilish"
                              aria-label="Profil rasmi qilish"
                            >
                              <UserIcon className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(idx)}
                              className="w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center"
                              aria-label="O'chirish"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Bottom Centered Golden Winged '+' Photo Button */}
                {isSelf && (
                  <div className="flex justify-center pt-1">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="hover:scale-105 transition-transform focus:outline-none"
                      aria-label="Foto qo'shish"
                    >
                      <GoldenWingsCrownFrame size="md">
                        <Plus className="w-9 h-9 text-white stroke-[2.5]" />
                      </GoldenWingsCrownFrame>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Yaqinlik & Sovg'alar Tab */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-[#1A0636]/90 border border-purple-400/35 text-center">
                  <div className="text-xs text-purple-200">Kuzatuvchilar</div>
                  <div className="font-mono tabular-nums text-lg font-bold text-white mt-0.5">
                    {user.followersCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#1A0636]/90 border border-purple-400/35 text-center">
                  <div className="text-xs text-purple-200">Kuzatmoqda</div>
                  <div className="font-mono tabular-nums text-lg font-bold text-white mt-0.5">
                    {user.followingCount}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#1A0636]/90 border border-[#E5B84B]/35 text-center">
                  <div className="text-xs text-purple-200">Olingan sovg‘alar</div>
                  <div className="font-mono tabular-nums text-lg font-bold text-[#F5C451] mt-0.5">
                    {formatCoins(user.totalReceived)}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#1A0636]/90 border border-purple-400/35 text-center">
                  <div className="text-xs text-purple-200">Yuborilgan</div>
                  <div className="font-mono tabular-nums text-lg font-bold text-purple-200 mt-0.5">
                    {formatCoins(user.totalGifted)}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1A0636]/90 border border-sky-400/35 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-sky-200 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Himoya qiymati (CP sharti &gt; 600)</span>
                  </div>
                  <div className="font-mono tabular-nums text-base font-bold text-white mt-0.5">
                    {formatCoins(user.guardValue)} ·{' '}
                    <span className="text-[#F5C451]">
                      {user.isMarried
                        ? `Nikohlangan · CP LV${user.cpLevel}`
                        : `CP LV${user.cpLevel}`}
                    </span>
                  </div>
                </div>
                {onOpenCp && (
                  <button
                    type="button"
                    onClick={onOpenCp}
                    className="min-h-[38px] px-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Sevgi uyi</span>
                  </button>
                )}
              </div>

              {!isSelf && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleFollow}
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-purple-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{user.isFollowing ? 'Kuzatilmoqda' : 'Kuzatish'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFriend}
                    className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#1A0636] border border-purple-400/40 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>
                      {user.friendStatus === 'accepted'
                        ? 'Do‘st'
                        : user.friendStatus === 'pending_sent'
                        ? 'Yuborildi'
                        : 'Do‘st bo‘lish'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestCp}
                    className="min-h-[42px] px-3 rounded-xl bg-pink-600/85 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>CP so‘rovi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartMessage(user.id)}
                    className="min-h-[42px] px-3 rounded-xl bg-[#1A0636] border border-purple-400/40 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Xabar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBlock}
                    className="min-h-[42px] min-w-[42px] rounded-xl bg-[#1A0636] border border-purple-400/40 text-slate-200 flex items-center justify-center"
                    title="Bloklash"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReport(true)}
                    className="min-h-[42px] min-w-[42px] rounded-xl bg-[#1A0636] border border-amber-400/40 text-amber-300 flex items-center justify-center"
                    title="Shikoyat"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              )}

              {statusMsg && (
                <div className="p-2.5 rounded-xl bg-purple-900/60 border border-amber-400/40 text-xs text-amber-100">
                  {statusMsg}
                </div>
              )}

              {isSelf && onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="w-full min-h-[44px] rounded-xl bg-[#1A0636] border border-purple-400/40 text-xs font-semibold text-white"
                >
                  Hisob va maxfiylik sozlamalarini ochish
                </button>
              )}

              <div className="space-y-2">
                <div className="text-xs font-semibold text-purple-200">Qabul qilingan sovg‘alar</div>
                {receivedGifts.length === 0 ? (
                  <p className="text-xs text-purple-300/70">Hozircha sovg‘alar yo‘q.</p>
                ) : (
                  <div className="space-y-2">
                    {receivedGifts.slice(0, 6).map((g) => (
                      <div
                        key={g.id}
                        className="p-3 rounded-xl bg-[#1A0636]/90 border border-purple-400/25 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#E5B84B]/15 text-[#F5C451] flex items-center justify-center">
                            {renderGiftIcon(g.gift_icon, 'w-4 h-4')}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">
                              {g.quantity}× {g.gift_name}
                            </div>
                            <div className="text-[11px] text-purple-300">{g.sender_nickname}</div>
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
            </div>
          )}
        </div>
      </div>
      )}

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#13042B] border border-purple-400/40 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">Profilni tahrirlash</h4>
              <button type="button" onClick={() => setShowEdit(false)} className="text-purple-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs text-purple-200 mb-1.5">Profil rasmi</label>
                <div className="flex flex-wrap items-center gap-3">
                  {avatarUrl && !AVATAR_CHOICES.includes(avatarUrl) && (
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#E5B84B] shrink-0">
                      <img src={avatarUrl} alt="Tanlangan" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {AVATAR_CHOICES.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatarUrl(av)}
                      className={`w-14 h-14 rounded-full overflow-hidden border-2 shrink-0 ${
                        avatarUrl === av ? 'border-[#E5B84B]' : 'border-transparent'
                      }`}
                    >
                      <img src={av} alt="Avatar" className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="min-h-[44px] px-3.5 rounded-xl bg-gradient-to-r from-purple-600/80 to-amber-500/80 border border-[#E5B84B]/60 text-white text-xs font-semibold flex items-center gap-2 hover:brightness-110"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Galereyadan rasm tanlash</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-purple-200 mb-1">Taxallus</label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 bg-[#0A0219] border border-purple-400/30 rounded-xl text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-purple-200 mb-1">Jinsi</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full min-h-[44px] px-2.5 bg-[#0A0219] border border-purple-400/30 rounded-xl text-xs text-white"
                  >
                    <option value="male">Erkak</option>
                    <option value="female">Ayol</option>
                    <option value="unspecified">Boshqa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-purple-200 mb-1">Tug‘ilgan yil</label>
                  <input
                    type="number"
                    min={1940}
                    max={2010}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full min-h-[44px] px-2.5 bg-[#0A0219] border border-purple-400/30 rounded-xl text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-200 mb-1">Davlat</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full min-h-[44px] px-2.5 bg-[#0A0219] border border-purple-400/30 rounded-xl text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-purple-200 mb-1">Shaxsiy tanishtiruv</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Dream big, live greater..."
                  className="w-full p-3 bg-[#0A0219] border border-purple-400/30 rounded-xl text-sm text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 text-white font-semibold text-sm"
              >
                Saqlash
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Medal Equip Modal */}
      {showMedalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#13042B] border border-purple-400/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">Medal kiyish</h4>
              <button type="button" onClick={() => setShowMedalModal(false)} className="text-purple-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5">
              {MEDAL_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMedal(m.id)}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between ${
                    user.equippedMedal === m.id
                      ? 'bg-purple-700/40 border-[#E5B84B]'
                      : 'bg-[#0A0219] border-purple-400/25'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{m.id}</div>
                    <div className="text-xs text-purple-200/80">{m.desc}</div>
                  </div>
                  <span className="text-xs font-semibold text-[#F5C451]">
                    {user.equippedMedal === m.id ? 'Taqilgan' : 'Kiyish'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Oila Modal */}
      {showCreateOilaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#13042B] border border-[#E5B84B]/50 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">Oila (Agentlik) yaratish</h4>
              <button
                type="button"
                onClick={() => setShowCreateOilaModal(false)}
                className="text-purple-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateOila} className="space-y-3">
              <input
                type="text"
                required
                value={oilaName}
                onChange={(e) => setOilaName(e.target.value)}
                placeholder="Oila nomi (masalan: Turon Sulolasi)"
                className="w-full min-h-[44px] px-3.5 bg-[#0A0219] border border-purple-400/30 rounded-xl text-sm text-white"
              />
              <textarea
                rows={3}
                value={oilaDesc}
                onChange={(e) => setOilaDesc(e.target.value)}
                placeholder="Oila maqsadi va tavsifi..."
                className="w-full p-3 bg-[#0A0219] border border-purple-400/30 rounded-xl text-sm text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#1A0800] font-bold text-sm"
              >
                Oila yaratish
              </button>
            </form>
          </div>
        </div>
      )}

      {showGift && (
        <GiftShopModal
          currentUser={currentUser}
          recipients={[user]}
          defaultRecipientId={user.id}
          onClose={() => setShowGift(false)}
          onSent={(updated, giftEvent) => {
            onUserUpdated(updated);
            refreshProfile();
            if (giftEvent) onGiftSent?.(giftEvent);
          }}
        />
      )}

      {showFrameStore && (
        <FrameStoreModal
          currentUser={currentUser}
          onClose={() => setShowFrameStore(false)}
          onUserUpdated={(updated) => {
            setUser(updated);
            onUserUpdated(updated);
          }}
          onOpenCp={onOpenCp}
          onOpenWallet={onOpenWallet}
        />
      )}

      {showReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#13042B] border border-purple-400/40 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">Shikoyat qilish</h4>
              <button type="button" onClick={() => setShowReport(false)} className="text-purple-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReport} className="space-y-3">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#0A0219] border border-purple-400/30 rounded-xl text-sm text-white"
              >
                <option value="Nomaqbul xatti-harakat">Nomaqbul xatti-harakat</option>
                <option value="Haqorat yoki tahqirlash">Haqorat yoki tahqirlash</option>
                <option value="Soxta profil">Soxta profil</option>
              </select>
              <textarea
                rows={3}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Shikoyat tafsilotlari..."
                className="w-full p-3 bg-[#0A0219] border border-purple-400/30 rounded-xl text-sm text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-amber-600 text-white font-semibold text-sm"
              >
                Yuborish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
