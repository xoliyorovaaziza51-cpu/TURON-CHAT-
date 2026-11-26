import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  CheckCircle,
  Edit3,
  Gift,
  Image as ImageIcon,
  Plus,
  Radio,
  Receipt,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  Users,
  Video,
} from 'lucide-react';
import { apiFetch, formatCoins, formatUzDate, getRoleShortLabel, getStoredToken } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import { RoleBadge, getRoleVisuals } from './RoleBadge';
import { renderGiftIcon } from './GiftShopModal';
import {
  ROLE_LABELS,
  type AdminAuditLog,
  type AppRole,
  type GiftCategory,
  type GiftItem,
  type ReportItem,
  type RibbonLogo,
  type RibbonLogoCategory,
  type UserProfile,
  type VoiceRoom,
} from '../types/turon';

interface AdminPanelViewProps {
  currentUser: UserProfile;
  rooms: VoiceRoom[];
  initialTab?: 'users' | 'game_winner' | 'reports' | 'rooms' | 'gifts' | 'logos' | 'transactions' | 'logs';
  onRefreshRooms: () => void;
}

function compressLogoImage(file: File, maxDim = 256, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Rasmni o‘qib bo‘lmadi'));
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
        resolve(canvas.toDataURL('image/png', quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

const ALL_ROLES: AppRole[] = [
  'founder',
  'super_admin',
  'admin',
  'moderator',
  'pk_admin',
  'agency_head',
  'agent',
  'user',
];

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  currentUser,
  rooms,
  initialTab = 'users',
  onRefreshRooms,
}) => {
  const [tab, setTab] = useState<
    'users' | 'game_winner' | 'reports' | 'rooms' | 'gifts' | 'logos' | 'transactions' | 'logs'
  >(initialTab);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [giftCats, setGiftCats] = useState<GiftCategory[]>([]);
  const [giftsList, setGiftsList] = useState<GiftItem[]>([]);
  const [ribbonLogos, setRibbonLogos] = useState<RibbonLogo[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Game winner control state
  const [winnerOverride, setWinnerOverride] = useState<{
    userId: string;
    nickname: string;
    publicId: string;
    mode: 'once' | 'always';
    slotId: number | null;
  } | null>(null);
  const [winnerQuery, setWinnerQuery] = useState('');
  const [winnerMode, setWinnerMode] = useState<'once' | 'always'>('once');
  const [winnerSlotId, setWinnerSlotId] = useState<string>('auto');
  const [awardCoins, setAwardCoins] = useState<number>(50000);
  const [awardPoints, setAwardPoints] = useState<number>(500);
  const [awardGameTitle, setAwardGameTitle] = useState<string>('Greedy Pro');
  const [savingWinner, setSavingWinner] = useState(false);

  // Create / Edit gift form
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [giftName, setGiftName] = useState('');
  const [giftPrice, setGiftPrice] = useState(150);
  const [giftCatId, setGiftCatId] = useState('cat-std');
  const [giftTier, setGiftTier] = useState<'standard' | 'premium' | 'luxury'>('standard');
  const [giftIconKey, setGiftIconKey] = useState('sparkles');
  const [giftVideoUrl, setGiftVideoUrl] = useState('');
  const [uploadingGiftVideo, setUploadingGiftVideo] = useState(false);
  const [savingGift, setSavingGift] = useState(false);
  const giftVideoInputRef = useRef<HTMLInputElement | null>(null);

  // Create/Edit ribbon logo form
  const [editingLogoId, setEditingLogoId] = useState<string | null>(null);
  const [logoName, setLogoName] = useState('');
  const [logoSubtitle, setLogoSubtitle] = useState('');
  const [logoCategory, setLogoCategory] = useState<RibbonLogoCategory>('diler');
  const [logoTargetUrl, setLogoTargetUrl] = useState('');
  const [logoImageUrl, setLogoImageUrl] = useState('');
  const [logoSortOrder, setLogoSortOrder] = useState(0);
  const [logoActive, setLogoActive] = useState(true);
  const [savingLogo, setSavingLogo] = useState(false);
  const [logoFilterCat, setLogoFilterCat] = useState<'all' | RibbonLogoCategory>('all');
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  async function loadOverview() {
    setError('');
    try {
      const [ov, gRes, lRes, gwRes] = await Promise.all([
        apiFetch<{
          users: UserProfile[];
          reports: ReportItem[];
          transactions: any[];
          auditLogs: AdminAuditLog[];
        }>('/api/admin/overview'),
        apiFetch<{ categories: GiftCategory[]; gifts: GiftItem[] }>('/api/gifts'),
        apiFetch<{ logos: RibbonLogo[] }>('/api/ribbon-logos?all=1'),
        apiFetch<{ override: any }>('/api/admin/game-winner').catch(() => ({ override: null })),
      ]);
      setUsers(ov.users);
      setReports(ov.reports);
      setTransactions(ov.transactions);
      setAuditLogs(ov.auditLogs);
      setGiftCats(gRes.categories);
      setGiftsList(gRes.gifts || []);
      setRibbonLogos(lRes.logos || []);
      setWinnerOverride(gwRes?.override || null);
      if (gRes.categories[0] && !editingGiftId) setGiftCatId(gRes.categories[0].id);
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleChangeRole(userId: string, role: AppRole) {
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      setFeedback('Foydalanuvchi roli yangilandi va jurnalga yozildi.');
      loadOverview();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleModerateUser(userId: string, action: 'mute' | 'unmute' | 'suspend' | 'restore') {
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/admin/users/${userId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, muteHours: 24 }),
      });
      setFeedback('Moderatsiya amali bajarildi.');
      loadOverview();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleResolveReport(reportId: string, status: 'resolved' | 'dismissed') {
    setError('');
    try {
      await apiFetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          resolutionNote: status === 'resolved' ? 'Chora ko‘rildi' : 'Asossiz deb topildi',
        }),
      });
      loadOverview();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleRoom(roomId: string) {
    setError('');
    try {
      await apiFetch(`/api/admin/rooms/${roomId}/toggle`, { method: 'POST' });
      onRefreshRooms();
      loadOverview();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function resetGiftForm() {
    setEditingGiftId(null);
    setGiftName('');
    setGiftPrice(150);
    setGiftTier('standard');
    setGiftIconKey('sparkles');
    setGiftVideoUrl('');
    if (giftCats[0]) setGiftCatId(giftCats[0].id);
  }

  function startEditGift(g: GiftItem) {
    setEditingGiftId(g.id);
    setGiftName(g.name);
    setGiftCatId(g.categoryId);
    setGiftPrice(g.priceCoins);
    setGiftTier(g.tier);
    setGiftIconKey(g.iconKey || 'sparkles');
    setGiftVideoUrl(g.videoUrl || '');
  }

  async function handleGiftVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      setError('Video fayl hajmi 25 MB dan oshmasligi kerak');
      return;
    }
    setError('');
    setUploadingGiftVideo(true);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/admin/gifts/upload-video', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': file.type || 'video/mp4',
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Video yuklashda xatolik');
      }
      setGiftVideoUrl(data.videoUrl);
      if (giftTier === 'standard') setGiftTier('luxury');
      setFeedback('Sovg‘a video effekti yuklandi.');
    } catch (err: any) {
      setError(err.message || 'Video yuklashda xatolik');
    } finally {
      setUploadingGiftVideo(false);
      e.target.value = '';
    }
  }

  async function handleSaveGift(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSavingGift(true);
    try {
      const payload = {
        name: giftName,
        categoryId: giftCatId,
        priceCoins: giftPrice,
        tier: giftVideoUrl.trim() && giftTier === 'standard' ? 'luxury' : giftTier,
        isAnimated: Boolean(giftVideoUrl.trim()) || giftTier !== 'standard',
        iconKey: giftIconKey || (giftTier === 'luxury' ? 'crown' : 'sparkles'),
        videoUrl: giftVideoUrl.trim(),
      };
      if (editingGiftId) {
        await apiFetch(`/api/admin/gifts/${editingGiftId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setFeedback('Sovg‘a ko‘rinishi va video effekti yangilandi.');
      } else {
        await apiFetch('/api/admin/gifts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback('Yangi sovg‘a do‘konga qo‘shildi.');
      }
      resetGiftForm();
      loadOverview();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingGift(false);
    }
  }

  async function handleDeleteGift(id: string) {
    setError('');
    try {
      await apiFetch(`/api/admin/gifts/${id}`, { method: 'DELETE' });
      if (editingGiftId === id) resetGiftForm();
      setFeedback('Sovg‘a do‘kondan olib tashlandi.');
      loadOverview();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function resetLogoForm() {
    setEditingLogoId(null);
    setLogoName('');
    setLogoSubtitle('');
    setLogoCategory('diler');
    setLogoTargetUrl('');
    setLogoImageUrl('');
    setLogoSortOrder(0);
    setLogoActive(true);
  }

  function startEditLogo(logo: RibbonLogo) {
    setEditingLogoId(logo.id);
    setLogoName(logo.name);
    setLogoSubtitle(logo.subtitle);
    setLogoCategory(logo.category);
    setLogoTargetUrl(logo.targetUrl);
    setLogoImageUrl(logo.imageUrl);
    setLogoSortOrder(logo.sortOrder);
    setLogoActive(logo.isActive);
  }

  async function handleLogoFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressLogoImage(file, 256, 0.88);
      setLogoImageUrl(compressed);
    } catch {
      setError('Logotip rasmini yuklashda xatolik');
    } finally {
      e.target.value = '';
    }
  }

  async function handleSaveLogo(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSavingLogo(true);
    try {
      const payload = {
        name: logoName.trim(),
        subtitle: logoSubtitle.trim(),
        category: logoCategory,
        targetUrl: logoTargetUrl.trim(),
        imageUrl: logoImageUrl.trim(),
        sortOrder: Number(logoSortOrder) || 0,
        isActive: logoActive,
      };
      if (editingLogoId) {
        await apiFetch(`/api/admin/ribbon-logos/${editingLogoId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setFeedback('Logotip muvaffaqiyatli yangilandi va lentaga chiqarildi.');
      } else {
        await apiFetch('/api/admin/ribbon-logos', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setFeedback('Yangi logotip aylanma lentaga qo‘shildi.');
      }
      resetLogoForm();
      await loadOverview();
      onRefreshRooms();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingLogo(false);
    }
  }

  async function handleToggleLogoActive(logo: RibbonLogo) {
    setError('');
    try {
      await apiFetch(`/api/admin/ribbon-logos/${logo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !logo.isActive }),
      });
      loadOverview();
      onRefreshRooms();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteLogo(logoId: string) {
    setError('');
    setFeedback('');
    try {
      await apiFetch(`/api/admin/ribbon-logos/${logoId}`, { method: 'DELETE' });
      if (editingLogoId === logoId) resetLogoForm();
      setFeedback('Logotip o‘chirildi.');
      loadOverview();
      onRefreshRooms();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQ.trim().toLowerCase();
    return (
      !q ||
      u.nickname.toLowerCase().includes(q) ||
      u.publicId.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const isFounder = currentUser.role === 'founder';

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Boshqaruv paneli</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sizning rolingiz: <span className="text-[#E5B84B]">{ROLE_LABELS[currentUser.role]}</span> ·
            Barcha harakatlar tizim jurnalida qayd etiladi
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'users', label: 'Foydalanuvchilar', icon: Users },
          { id: 'game_winner', label: "O‘yin yutug‘i", icon: Trophy },
          { id: 'logos', label: `Logotiplar (${ribbonLogos.length})`, icon: Sparkles },
          { id: 'reports', label: `Shikoyatlar (${reports.filter((r) => r.status === 'open').length})`, icon: ShieldAlert },
          { id: 'rooms', label: 'Xonalar', icon: Radio },
          { id: 'gifts', label: 'Sovg‘alar', icon: Gift },
          { id: 'transactions', label: 'Tranzaksiyalar', icon: Receipt },
          { id: 'logs', label: 'Harakatlar jurnali', icon: Activity },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 whitespace-nowrap shrink-0 ${
                tab === t.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-[#0F1524] border-white/[0.07] text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}
      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">
          {feedback}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Ism, TC-ID yoki email bo‘yicha qidirish..."
              className="w-full min-h-[44px] pl-10 pr-4 bg-[#0F1524] border border-white/10 rounded-xl text-sm text-white"
            />
          </div>

          <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06] overflow-x-auto">
            {filteredUsers.map((u) => {
              const targetProtected = (u.role === 'founder' || u.role === 'super_admin') && !isFounder;
              return (
                <div
                  key={u.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <AvatarWithFrame src={u.avatarUrl} alt={u.nickname} size="sm" role={u.role} frameStyle={u.frameStyle} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-sm font-semibold truncate ${getRoleVisuals(u.role).nameColorClass}`}>
                          {u.nickname}
                        </span>
                        <RoleBadge role={u.role} size="xs" />
                        {u.isSuspended && (
                          <span className="text-xs text-red-400 font-normal">· To‘xtatilgan</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono truncate">
                        {u.publicId} · {u.email} · {formatCoins(u.coinBalance)} Tanga
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      disabled={targetProtected || u.id === currentUser.id}
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as AppRole)}
                      className="min-h-[38px] px-2.5 bg-[#080B14] border border-white/10 rounded-lg text-xs text-white disabled:opacity-50"
                    >
                      {ALL_ROLES.map((r) => (
                        <option
                          key={r}
                          value={r}
                          disabled={(r === 'founder' || r === 'super_admin') && !isFounder}
                        >
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>

                    {!targetProtected && u.id !== currentUser.id && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleModerateUser(u.id, u.isMutedUntil ? 'unmute' : 'mute')
                          }
                          className="min-h-[38px] px-3 rounded-lg bg-[#080B14] border border-white/10 text-xs text-amber-300"
                        >
                          {u.isMutedUntil ? 'Cheklovni olish' : '24s Mute'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleModerateUser(u.id, u.isSuspended ? 'restore' : 'suspend')
                          }
                          className={`min-h-[38px] px-3 rounded-lg text-xs font-medium ${
                            u.isSuspended
                              ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/15 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {u.isSuspended ? 'Tiklash' : 'To‘xtatish'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'reports' && (
        <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Shikoyatlar yo‘q.</div>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">
                    {r.reason} ·{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({r.targetType}: {r.targetId})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{r.details || 'Izoh yo‘q'}</p>
                  <div className="text-xs text-slate-500 mt-1">
                    Yuboruvchi: {r.reporterNickname} · Holat:{' '}
                    {r.status === 'open' ? 'Ochiq' : r.status === 'resolved' ? 'Hal qilingan' : 'Rad etilgan'}
                  </div>
                </div>
                {r.status === 'open' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleResolveReport(r.id, 'resolved')}
                      className="min-h-[38px] px-3.5 rounded-lg bg-emerald-600 text-white text-xs font-medium flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Hal qilish</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolveReport(r.id, 'dismissed')}
                      className="min-h-[38px] px-3.5 rounded-lg bg-white/10 text-slate-300 text-xs"
                    >
                      Rad etish
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'rooms' && (
        <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
          {rooms.map((rm) => (
            <div key={rm.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{rm.title}</div>
                <div className="text-xs text-slate-400">
                  Egasi: {rm.owner?.nickname} · {rm.viewerCount} ishtirokchi · {rm.maxSeats} o‘rin
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleRoom(rm.id)}
                className="min-h-[38px] px-3.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium"
              >
                {rm.isActive ? 'Xonani yopish' : 'Xonani ochish'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'gifts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleSaveGift}
            className="lg:col-span-5 p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-4 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-white">
                {editingGiftId ? 'Sovg‘ani tahrirlash' : 'Yangi virtual sovg‘a qo‘shish'}
              </h3>
              {editingGiftId && (
                <button
                  type="button"
                  onClick={resetGiftForm}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Sovg‘a nomi</label>
              <input
                type="text"
                required
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                placeholder="Masalan: Buxoro Chirog‘i"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Kategoriya</label>
                <select
                  value={giftCatId}
                  onChange={(e) => setGiftCatId(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
                >
                  {giftCats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Narxi (Tanga)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={giftPrice}
                  onChange={(e) => setGiftPrice(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Daraja (Effekt)</label>
                <select
                  value={giftTier}
                  onChange={(e) => setGiftTier(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
                >
                  <option value="standard">Oddiy</option>
                  <option value="premium">Premium (3D Animatsiya)</option>
                  <option value="luxury">Hashamatli (VIP Effekt)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Do‘kon ikonasi</label>
                <select
                  value={giftIconKey}
                  onChange={(e) => setGiftIconKey(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
                >
                  <option value="sparkles">Yulduzcha (Sparkles)</option>
                  <option value="crown">Toj (Crown)</option>
                  <option value="flame">Olov (Flame)</option>
                  <option value="heart">Yurak (Heart)</option>
                  <option value="shield">Qalqon (Shield)</option>
                  <option value="gem">Olmos (Gem)</option>
                  <option value="mic">Mikrofon (Mic)</option>
                  <option value="flower">Gul (Flower)</option>
                  <option value="coffee">Choy (Coffee)</option>
                </select>
              </div>
            </div>

            {/* Video Effect Upload / URL Field */}
            <div className="p-3.5 rounded-xl bg-[#080B14] border border-[#E5B84B]/25 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#FDE68A] flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  <span>Sovg‘a video effekti (MP4 / WebM)</span>
                </span>
                {giftVideoUrl && (
                  <button
                    type="button"
                    onClick={() => setGiftVideoUrl('')}
                    className="text-[11px] text-red-300 hover:text-red-200"
                  >
                    Olib tashlash
                  </button>
                )}
              </div>

              <input
                ref={giftVideoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleGiftVideoUpload}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={uploadingGiftVideo}
                  onClick={() => giftVideoInputRef.current?.click()}
                  className="min-h-[40px] px-3.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 border border-purple-400/40 text-xs font-semibold text-purple-100 flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 text-[#E5B84B]" />
                  <span>{uploadingGiftVideo ? 'Yuklanmoqda...' : 'Video yuklash'}</span>
                </button>
                <input
                  type="text"
                  value={giftVideoUrl}
                  onChange={(e) => setGiftVideoUrl(e.target.value)}
                  placeholder="Yoki video havolasini kiriting (/uploads/... yoki https://...)"
                  className="flex-1 min-w-0 min-h-[40px] px-3 bg-[#0F1524] border border-white/10 rounded-xl text-xs text-slate-200"
                />
              </div>

              {giftVideoUrl && (
                <div className="relative rounded-xl overflow-hidden border border-[#E5B84B]/40 bg-black aspect-video">
                  <video
                    key={giftVideoUrl}
                    src={giftVideoUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-[10px] font-semibold text-[#FDE68A] border border-[#E5B84B]/30">
                    Sovg‘a effekti ko‘rinishi
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Video biriktirilgan sovg‘a xonada yuborilganda avtomatik ravishda to‘liq ekran sovg‘a effekti ko‘rinishida chiqadi.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingGift || uploadingGiftVideo}
              className="w-full min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>
                {savingGift
                  ? 'Saqlanmoqda...'
                  : editingGiftId
                  ? 'Sovg‘ani saqlash'
                  : 'Sovg‘a qo‘shish'}
              </span>
            </button>
          </form>

          {/* Existing Gifts List */}
          <div className="lg:col-span-7 bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06] h-fit">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="font-display text-sm font-semibold text-white">
                Mavjud sovg‘alar ({giftsList.length})
              </span>
              <span className="text-xs text-slate-400">Video biriktirish uchun tahrirlang</span>
            </div>
            {giftsList.map((g) => (
              <div
                key={g.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      g.videoUrl
                        ? 'bg-[#E5B84B]/15 border-[#E5B84B]/40 text-[#E5B84B]'
                        : 'bg-[#080B14] border-white/10 text-purple-300'
                    }`}
                  >
                    {renderGiftIcon(g.iconKey, 'w-5 h-5')}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{g.name}</span>
                      {g.videoUrl && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-600/30 border border-purple-400/40 text-[10px] font-semibold text-purple-200 flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          <span>Video effekt</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 font-mono tabular-nums mt-0.5">
                      {formatCoins(g.priceCoins)} Tanga · {g.categoryName || g.tier}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditGift(g)}
                    className="min-h-[34px] px-3 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs text-slate-200 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Tahrirlash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGift(g.id)}
                    className="min-h-[34px] px-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center justify-center"
                    title="O‘chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'logos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Add / Edit Logo Form */}
          <form
            onSubmit={handleSaveLogo}
            className="lg:col-span-5 p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-4 h-fit"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-white">
                {editingLogoId ? 'Logotipni tahrirlash' : 'Aylanma lentaga logotip qo‘shish'}
              </h3>
              {editingLogoId && (
                <button
                  type="button"
                  onClick={resetLogoForm}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Logotip nomi</label>
              <input
                type="text"
                required
                value={logoName}
                onChange={(e) => setLogoName(e.target.value)}
                placeholder="Masalan: Turon Gold Diler"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Yo‘nalish</label>
                <select
                  value={logoCategory}
                  onChange={(e) => setLogoCategory(e.target.value as RibbonLogoCategory)}
                  className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
                >
                  <option value="diler">Diler logotipi</option>
                  <option value="admin">Admin logotipi</option>
                  <option value="telegram">Telegram kanal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Tartib raqami</label>
                <input
                  type="number"
                  value={logoSortOrder}
                  onChange={(e) => setLogoSortOrder(Number(e.target.value))}
                  className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Qisqa izoh / lavozim</label>
              <input
                type="text"
                value={logoSubtitle}
                onChange={(e) => setLogoSubtitle(e.target.value)}
                placeholder="Masalan: Rasmiy tanga dileri · @turondiler"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Havola (ixtiyoriy)</label>
              <input
                type="text"
                value={logoTargetUrl}
                onChange={(e) => setLogoTargetUrl(e.target.value)}
                placeholder="https://t.me/kanal_nomi"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Logotip rasmi (galereyadan yoki URL)
              </label>
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#080B14] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {logoImageUrl ? (
                    <img
                      src={logoImageUrl}
                      alt="Logotip"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="min-h-[42px] px-3.5 rounded-xl bg-[#080B14] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 hover:border-blue-400 shrink-0"
                >
                  <Upload className="w-4 h-4 text-[#E5B84B]" />
                  <span>Rasm tanlash</span>
                </button>
                {logoImageUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoImageUrl('')}
                    className="text-xs text-red-300 hover:text-red-200"
                  >
                    Tozalash
                  </button>
                )}
              </div>
              <input
                type="text"
                value={logoImageUrl}
                onChange={(e) => setLogoImageUrl(e.target.value)}
                placeholder="Yoki rasm URL manzilini kiriting..."
                className="w-full min-h-[40px] mt-2 px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-slate-300"
              />
            </div>

            <label className="flex items-center justify-between px-3.5 min-h-[44px] rounded-xl bg-[#080B14] border border-white/10 cursor-pointer">
              <span className="text-sm text-white">Lentada ko‘rinsin (Faol)</span>
              <input
                type="checkbox"
                checked={logoActive}
                onChange={(e) => setLogoActive(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
            </label>

            <button
              type="submit"
              disabled={savingLogo}
              className="w-full min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>
                {savingLogo
                  ? 'Saqlanmoqda...'
                  : editingLogoId
                  ? 'O‘zgarishlarni saqlash'
                  : 'Logotipni joylash'}
              </span>
            </button>
          </form>

          {/* Existing Logos List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'all' as const, label: 'Hammasi' },
                { id: 'diler' as const, label: 'Dilerlar' },
                { id: 'admin' as const, label: 'Adminlar' },
                { id: 'telegram' as const, label: 'Telegram kanallar' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setLogoFilterCat(c.id)}
                  className={`min-h-[36px] px-3 rounded-xl text-xs font-semibold whitespace-nowrap ${
                    logoFilterCat === c.id
                      ? 'bg-[#E5B84B] text-[#1A0800]'
                      : 'bg-[#0F1524] border border-white/10 text-slate-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
              {ribbonLogos
                .filter((l) => logoFilterCat === 'all' || l.category === logoFilterCat)
                .map((logo) => (
                  <div
                    key={logo.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#080B14] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {logo.imageUrl ? (
                          <img
                            src={logo.imageUrl}
                            alt={logo.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Sparkles className="w-4 h-4 text-[#E5B84B]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {logo.name}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {logo.category === 'diler'
                            ? 'Diler'
                            : logo.category === 'admin'
                            ? 'Admin'
                            : 'Telegram kanal'}{' '}
                          · {logo.subtitle || 'Izohsiz'} · Tartib: {logo.sortOrder}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleLogoActive(logo)}
                        className={`min-h-[36px] px-2.5 rounded-lg text-xs font-medium border ${
                          logo.isActive
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-slate-400'
                        }`}
                      >
                        {logo.isActive ? 'Faol' : 'Nofaol'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditLogo(logo)}
                        className="min-h-[36px] min-w-[36px] rounded-lg bg-[#080B14] border border-white/10 text-slate-200 flex items-center justify-center"
                        aria-label="Tahrirlash"
                        title="Tahrirlash"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLogo(logo.id)}
                        className="min-h-[36px] min-w-[36px] rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 flex items-center justify-center"
                        aria-label="O'chirish"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              {ribbonLogos.filter((l) => logoFilterCat === 'all' || l.category === logoFilterCat)
                .length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">
                  Tanlangan yo‘nalishda logotiplar mavjud emas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
          {transactions.map((t) => (
            <div key={t.id} className="p-3.5 flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="text-white font-medium">
                  {t.nickname} ({t.public_id}) · {t.note}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {t.receipt_code} · {t.provider} · {t.status}
                </div>
              </div>
              <div className="font-mono tabular-nums text-[#E5B84B] font-semibold">
                {t.amount_coins >= 0 ? '+' : ''}
                {formatCoins(t.amount_coins)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'game_winner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0F1524] border border-amber-400/25 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  O‘yin yutug‘ini yozilgan o‘yinchiga berish
                </h3>
                <p className="text-xs text-slate-400">
                  Yozilgan foydalanuvchi Greedy Pro, Ochko‘z sandiq, Football Kung va Rakita o‘yinlarida yutadi
                </p>
              </div>
            </div>

            {winnerOverride && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-400/35 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <div className="font-semibold text-emerald-300">
                    Faol g‘olib: {winnerOverride.nickname} ({winnerOverride.publicId})
                  </div>
                  <div className="text-slate-300 mt-0.5">
                    Rejim: {winnerOverride.mode === 'always' ? 'Doimiy' : 'Keyingi 1 raund'}
                    {winnerOverride.slotId !== null ? ` · Uya #${winnerOverride.slotId + 1}` : ' · Avto'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setError('');
                    setFeedback('');
                    try {
                      await apiFetch('/api/admin/game-winner', { method: 'DELETE' });
                      setWinnerOverride(null);
                      setFeedback('G‘olib belgilash bekor qilindi.');
                      loadOverview();
                    } catch (err: any) {
                      setError(err.message);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 text-xs font-semibold shrink-0"
                >
                  Bekor qilish
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                Foydalanuvchi ismi, TC-ID yoki emailini yozing
              </label>
              <input
                type="text"
                value={winnerQuery}
                onChange={(e) => setWinnerQuery(e.target.value)}
                placeholder="Masalan: JIMJIT yoki TC-1001"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/15 rounded-xl text-sm text-white"
              />
              {users.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {users.slice(0, 6).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setWinnerQuery(u.nickname)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 text-[11px] text-slate-200"
                    >
                      {u.nickname} ({u.publicId})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Amal qilish muddati</label>
                <select
                  value={winnerMode}
                  onChange={(e) => setWinnerMode(e.target.value as 'once' | 'always')}
                  className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/15 rounded-xl text-sm text-white"
                >
                  <option value="once">Faqat keyingi 1 o‘yin</option>
                  <option value="always">Doimiy (o‘chirilguncha)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Greedy Pro uyasi</label>
                <select
                  value={winnerSlotId}
                  onChange={(e) => setWinnerSlotId(e.target.value)}
                  className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/15 rounded-xl text-sm text-white"
                >
                  <option value="auto">Avto (yozilgan o‘yinchi tikkan katak)</option>
                  <option value="0">Pomidor (×5)</option>
                  <option value="1">Karam (×5)</option>
                  <option value="2">Baliq (×5)</option>
                  <option value="3">Sabzi (×5)</option>
                  <option value="4">Hot-dog (×10)</option>
                  <option value="5">Krevetka (×15)</option>
                  <option value="6">Tovuq (×25)</option>
                  <option value="7">Steyk (×45)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={savingWinner || !winnerQuery.trim()}
              onClick={async () => {
                setError('');
                setFeedback('');
                setSavingWinner(true);
                try {
                  const res = await apiFetch<{ override: any; message: string }>('/api/admin/game-winner', {
                    method: 'POST',
                    body: JSON.stringify({
                      query: winnerQuery.trim(),
                      mode: winnerMode,
                      slotId: winnerSlotId === 'auto' ? null : Number(winnerSlotId),
                    }),
                  });
                  setWinnerOverride(res.override);
                  setFeedback(res.message);
                  loadOverview();
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setSavingWinner(false);
                }
              }}
              className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-[#080B14] font-bold text-sm disabled:opacity-50"
            >
              {savingWinner ? 'Saqlanmoqda...' : 'Men yozgan o‘yinchiga yutuqni biriktirish'}
            </button>
          </div>

          <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-4 h-fit">
            <h3 className="font-display text-lg font-bold text-white">
              Yozilgan o‘yinchiga hozirning o‘zida yutuq yuborish
            </h3>
            <p className="text-xs text-slate-400">
              Chapdagi qatorga yozilgan foydalanuvchiga darhol o‘yin yutug‘i (tanga va ball) qo‘shish:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">O‘yin nomi</label>
                <input
                  type="text"
                  value={awardGameTitle}
                  onChange={(e) => setAwardGameTitle(e.target.value)}
                  className="w-full min-h-[42px] px-3 bg-[#080B14] border border-white/15 rounded-xl text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Yutuq (Tanga)</label>
                <input
                  type="number"
                  min={0}
                  value={awardCoins}
                  onChange={(e) => setAwardCoins(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 bg-[#080B14] border border-white/15 rounded-xl text-sm text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">O‘yin balli</label>
                <input
                  type="number"
                  min={0}
                  value={awardPoints}
                  onChange={(e) => setAwardPoints(Number(e.target.value))}
                  className="w-full min-h-[42px] px-3 bg-[#080B14] border border-white/15 rounded-xl text-sm text-white font-mono"
                />
              </div>
            </div>

            <button
              type="button"
              disabled={savingWinner || !winnerQuery.trim()}
              onClick={async () => {
                setError('');
                setFeedback('');
                setSavingWinner(true);
                try {
                  const res = await apiFetch<{ message: string }>('/api/admin/game-winner', {
                    method: 'POST',
                    body: JSON.stringify({
                      query: winnerQuery.trim(),
                      grantNow: true,
                      grantCoins: awardCoins,
                      grantGamePoints: awardPoints,
                      gameTitle: awardGameTitle.trim() || "O'yin yutug'i",
                    }),
                  });
                  setFeedback(res.message);
                  loadOverview();
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setSavingWinner(false);
                }
              }}
              className="w-full min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm disabled:opacity-50"
            >
              {savingWinner ? 'Yuborilmoqda...' : 'Yozilgan foydalanuvchiga darhol yutuq berish'}
            </button>
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 flex items-start justify-between gap-3 text-sm">
              <div>
                <div className="text-white font-medium">
                  {log.actorNickname} ({getRoleShortLabel(log.actorRole)}) ·{' '}
                  <span className="text-blue-400 font-mono text-xs">{log.action}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{log.details}</div>
              </div>
              <span className="text-xs text-slate-500 font-mono shrink-0">
                {formatUzDate(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
