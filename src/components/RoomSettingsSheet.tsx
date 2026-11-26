import React, { useEffect, useState } from 'react';
import {
  Ban,
  ChevronRight,
  Eraser,
  Heart,
  Lock,
  MessageCircle,
  Music,
  Palette,
  Play,
  Shield,
  Sparkles,
  Tv,
  Unlock,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import { DYNAMIC_BACKGROUNDS } from './DynamicRoomBackground';
import type { DynamicBgId, UserProfile, VoiceRoom } from '../types/turon';

interface RoomSettingsSheetProps {
  room: VoiceRoom;
  allUsers: UserProfile[];
  isOwner: boolean;
  onClose: () => void;
  onRoomUpdated: (room: VoiceRoom) => void;
  onClearedChat: () => void;
  onOpenYouTubePicker: () => void;
  onError: (msg: string) => void;
}

interface RoomBanRow {
  userId: string;
  nickname: string;
  publicId: string;
  avatarUrl: string;
  reason: string;
  createdAt: string;
}

type SubPanel =
  | 'main'
  | 'roomType'
  | 'seats'
  | 'micMode'
  | 'effect'
  | 'theme'
  | 'dynamicBg'
  | 'lock'
  | 'bans'
  | 'admins';

export const RoomSettingsSheet: React.FC<RoomSettingsSheetProps> = ({
  room,
  allUsers,
  isOwner,
  onClose,
  onRoomUpdated,
  onClearedChat,
  onOpenYouTubePicker,
  onError,
}) => {
  const [title, setTitle] = useState(room.title);
  const [announcement, setAnnouncement] = useState(room.announcement ?? room.description ?? '');
  const [welcomeRoomMsg, setWelcomeRoomMsg] = useState(room.welcomeRoomMsg ?? '');
  const [welcomeUserMsg, setWelcomeUserMsg] = useState(room.welcomeUserMsg ?? '');
  const [publicScreenEnabled, setPublicScreenEnabled] = useState(
    room.publicScreenEnabled !== false
  );
  const [sensitiveWords, setSensitiveWords] = useState(room.sensitiveWords ?? '');
  const [roomType, setRoomType] = useState<'chat' | 'video'>(room.roomType || 'chat');
  const [micMode, setMicMode] = useState<'open' | 'request'>(room.micMode || 'open');
  const [requireMemberApproval, setRequireMemberApproval] = useState(
    Boolean(room.requireMemberApproval)
  );
  const [maxSeats, setMaxSeats] = useState(room.maxSeats || 8);
  const [superMicEnabled, setSuperMicEnabled] = useState(Boolean(room.superMicEnabled));
  const [visualEffect, setVisualEffect] = useState<VoiceRoom['visualEffect']>(
    room.visualEffect || 'aurora'
  );
  const [backgroundTheme, setBackgroundTheme] = useState<VoiceRoom['backgroundTheme']>(
    room.backgroundTheme || 'sapphire'
  );
  const [dynamicBg, setDynamicBg] = useState<DynamicBgId>(room.dynamicBg || 'campfire-night');
  const [isPrivate, setIsPrivate] = useState(Boolean(room.isPrivate));
  const [password, setPassword] = useState('');

  const [expandedWelcomeRoom, setExpandedWelcomeRoom] = useState(false);
  const [expandedWelcomeUser, setExpandedWelcomeUser] = useState(false);
  const [expandedSensitive, setExpandedSensitive] = useState(false);

  const [subPanel, setSubPanel] = useState<SubPanel>('main');
  const [saving, setSaving] = useState(false);
  const [bans, setBans] = useState<RoomBanRow[]>([]);
  const [loadingBans, setLoadingBans] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    if (subPanel === 'bans') {
      setLoadingBans(true);
      apiFetch<{ bans: RoomBanRow[] }>(`/api/rooms/${room.id}/bans`)
        .then((res) => setBans(res.bans))
        .catch((err) => onError(err.message))
        .finally(() => setLoadingBans(false));
    }
  }, [subPanel, room.id, onError]);

  async function savePartial(patch: Record<string, any>, closeAfter = false) {
    setSaving(true);
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      onRoomUpdated(res.room);
      if (closeAfter) onClose();
    } catch (err: any) {
      onError(err.message || 'Sozlamalarni saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAll() {
    await savePartial(
      {
        title: title.trim() || room.title,
        description: announcement,
        announcement,
        welcomeRoomMsg,
        welcomeUserMsg,
        publicScreenEnabled,
        sensitiveWords,
        roomType,
        micMode,
        requireMemberApproval,
        maxSeats,
        superMicEnabled,
        visualEffect,
        backgroundTheme,
        dynamicBg,
        isPrivate,
        password: password || undefined,
      },
      true
    );
  }

  async function handleClearScreen() {
    setSaving(true);
    try {
      await apiFetch(`/api/rooms/${room.id}/clear-messages`, { method: 'POST' });
      onClearedChat();
      setStatusNote('Ommaviy ekran xabarlari tozalandi');
      setTimeout(() => setStatusNote(''), 2500);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnban(userId: string) {
    try {
      await apiFetch(`/api/rooms/${room.id}/bans/${userId}`, { method: 'DELETE' });
      setBans((prev) => prev.filter((b) => b.userId !== userId));
    } catch (err: any) {
      onError(err.message);
    }
  }

  async function handleToggleModerator(userId: string) {
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}/moderators`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      onRoomUpdated(res.room);
    } catch (err: any) {
      onError(err.message);
    }
  }

  const effectLabels: Record<VoiceRoom['visualEffect'], string> = {
    aurora: 'Aurora nuri',
    stars: 'Yulduzli yog‘du',
    waves: 'Binafsha to‘lqin',
    none: 'Effektsiz',
  };

  const themeLabels: Record<VoiceRoom['backgroundTheme'], string> = {
    sapphire: 'Moviy (Sapfir)',
    amethyst: 'Binafsha (Ametist)',
    gold: 'Oltin saroy',
    obsidian: 'Tungi obsidian',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-fade-in">
      <div className="w-full max-w-md bg-[#0E1322] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[92vh] flex flex-col shadow-2xl animate-sheet-fade-in">
        {/* Sheet Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#131A2E] flex items-center justify-between gap-3">
          {subPanel !== 'main' ? (
            <button
              type="button"
              onClick={() => setSubPanel('main')}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 min-h-[36px] px-2 -ml-2"
            >
              ← Sozlamalarga qaytish
            </button>
          ) : (
            <h4 className="font-display text-base font-bold text-white">Xona sozlamalari</h4>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Panel: Xona turi (Chat vs Video 2-Card Modal matching the video) */}
        {subPanel === 'roomType' ? (
          <div key="roomType" className="p-5 space-y-4 overflow-y-auto animate-backdrop-fade-in">
            <div className="text-center space-y-1">
              <h5 className="font-display text-lg font-bold text-white">Xona turi</h5>
              <p className="text-xs text-slate-400">
                Xona formatini tanlang — o‘zgarish darhol sahnada ko‘rinadi
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Chat Card (Amber/Orange with Speech + Heart) */}
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setRoomType('chat');
                  await savePartial({ roomType: 'chat' });
                  setSubPanel('main');
                }}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.98] overflow-hidden flex flex-col items-center justify-center gap-3 min-h-[168px] ${
                  roomType === 'chat'
                    ? 'bg-gradient-to-br from-amber-500/30 via-orange-600/25 to-[#161B2E] border-amber-400 shadow-lg shadow-amber-500/15'
                    : 'bg-gradient-to-br from-amber-500/10 to-[#090D18] border-white/10 hover:border-amber-400/50'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 relative">
                  <MessageCircle className="w-8 h-8 text-white fill-white/25" />
                  <Heart className="w-4 h-4 text-rose-100 fill-rose-100 absolute -top-1 -right-1" />
                </div>
                <div className="text-center">
                  <div className="font-display text-base font-bold text-white">Chat</div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5">
                    Ovozli suhbat va mikrofon
                  </div>
                </div>
                {roomType === 'chat' && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400 text-[#080B14]">
                    Tanlangan
                  </span>
                )}
              </button>

              {/* Video Card (Purple/Pink with TV + Play) */}
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setRoomType('video');
                  await savePartial({ roomType: 'video' });
                  setSubPanel('main');
                  onClose();
                }}
                className={`relative p-4 rounded-2xl border text-left transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.98] overflow-hidden flex flex-col items-center justify-center gap-3 min-h-[168px] ${
                  roomType === 'video'
                    ? 'bg-gradient-to-br from-purple-500/35 via-fuchsia-600/25 to-[#161B2E] border-fuchsia-400 shadow-lg shadow-purple-500/20'
                    : 'bg-gradient-to-br from-purple-500/15 to-[#090D18] border-white/10 hover:border-fuchsia-400/50'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/35 relative">
                  <Tv className="w-8 h-8 text-white" />
                  <Play className="w-3.5 h-3.5 text-white fill-white absolute mt-0.5" />
                </div>
                <div className="text-center">
                  <div className="font-display text-base font-bold text-white">Video</div>
                  <div className="text-[11px] text-purple-200/80 mt-0.5">
                    YouTube kino va musiqa
                  </div>
                </div>
                {roomType === 'video' && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-fuchsia-400 text-[#080B14]">
                    Tanlangan
                  </span>
                )}
              </button>
            </div>
          </div>
        ) : subPanel === 'seats' ? (
          <div key="seats" className="p-5 space-y-3 animate-backdrop-fade-in">
            <h5 className="font-display text-base font-bold text-white">
              Bug‘doy rejimi (Mikrofon o‘rinlari soni)
            </h5>
            <div className="grid grid-cols-3 gap-2.5">
              {[4, 8, 9, 12, 16, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    setMaxSeats(count);
                    setSubPanel('main');
                  }}
                  className={`min-h-[48px] rounded-xl border text-sm font-semibold transition-all duration-150 ease-out hover:scale-[1.03] active:scale-[0.97] ${
                    maxSeats === count
                      ? 'bg-blue-600 border-blue-400 text-white'
                      : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                  }`}
                >
                  {count} kishi
                </button>
              ))}
            </div>
          </div>
        ) : subPanel === 'micMode' ? (
          <div key="micMode" className="p-5 space-y-3 animate-backdrop-fade-in">
            <h5 className="font-display text-base font-bold text-white">Mikrofon rejimi</h5>
            <button
              type="button"
              onClick={() => {
                setMicMode('open');
                setSubPanel('main');
              }}
              className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 ease-out hover:scale-[1.015] active:scale-[0.99] ${
                micMode === 'open'
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="text-sm font-bold">Ochiq rejim</div>
              <div className="text-xs text-slate-400 mt-1">
                Xonadagi barcha ishtirokchilar bo‘sh mikrofonga erkin chiqa oladi.
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setMicMode('request');
                setSubPanel('main');
              }}
              className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 ease-out hover:scale-[1.015] active:scale-[0.99] ${
                micMode === 'request'
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              <div className="text-sm font-bold">So‘rov bilan</div>
              <div className="text-xs text-slate-400 mt-1">
                Faqat xona egasi va moderatorlar mikrofonga chiqishi mumkin.
              </div>
            </button>
          </div>
        ) : subPanel === 'effect' ? (
          <div key="effect" className="p-5 space-y-2.5 animate-backdrop-fade-in">
            <h5 className="font-display text-base font-bold text-white">Effekt o‘tish</h5>
            {(['aurora', 'stars', 'waves', 'none'] as const).map((eff) => (
              <button
                key={eff}
                type="button"
                onClick={() => {
                  setVisualEffect(eff);
                  setSubPanel('main');
                }}
                className={`w-full min-h-[48px] px-4 rounded-xl border flex items-center justify-between text-sm font-medium transition-all duration-150 ease-out hover:scale-[1.015] active:scale-[0.99] ${
                  visualEffect === eff
                    ? 'bg-purple-600/20 border-purple-400 text-white'
                    : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <span>{effectLabels[eff]}</span>
                {visualEffect === eff && <span className="text-xs text-purple-300">Tanlangan</span>}
              </button>
            ))}
          </div>
        ) : subPanel === 'theme' ? (
          <div key="theme" className="p-5 space-y-2.5 animate-backdrop-fade-in">
            <h5 className="font-display text-base font-bold text-white">Xona mavzusi</h5>
            {(['sapphire', 'amethyst', 'gold', 'obsidian'] as const).map((th) => (
              <button
                key={th}
                type="button"
                onClick={async () => {
                  setBackgroundTheme(th);
                  await savePartial({ backgroundTheme: th });
                  setSubPanel('main');
                }}
                className={`w-full min-h-[48px] px-4 rounded-xl border flex items-center justify-between text-sm font-medium transition-all duration-150 ease-out hover:scale-[1.015] active:scale-[0.99] ${
                  backgroundTheme === th
                    ? 'bg-blue-600/20 border-blue-400 text-white'
                    : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <span>{themeLabels[th]}</span>
                {backgroundTheme === th && <span className="text-xs text-blue-300">Faol</span>}
              </button>
            ))}
          </div>
        ) : subPanel === 'dynamicBg' ? (
          <div key="dynamicBg" className="p-5 space-y-3 overflow-y-auto animate-backdrop-fade-in">
            <div>
              <h5 className="font-display text-base font-bold text-white">Dinamik fonlar</h5>
              <p className="text-xs text-slate-400 mt-0.5">
                Xona sahnasi uchun animatsiyali orqa fon tanlang
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {DYNAMIC_BACKGROUNDS.map((bg) => {
                const selected = dynamicBg === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    disabled={saving}
                    onClick={async () => {
                      setDynamicBg(bg.id);
                      await savePartial({ dynamicBg: bg.id });
                      setSubPanel('main');
                    }}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all ${
                      selected
                        ? 'bg-purple-600/20 border-purple-400 text-white shadow-[0_0_16px_rgba(168,85,247,0.22)]'
                        : 'bg-[#080B14] border-white/10 text-slate-200 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bg.previewGradient} border border-white/20 shrink-0 flex items-center justify-center`}
                      >
                        <span
                          className="w-3 h-3 rounded-full animate-pulse"
                          style={{ backgroundColor: bg.accentHex }}
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{bg.title}</div>
                        <div className="text-xs text-slate-400 truncate">{bg.subtitle}</div>
                      </div>
                    </div>
                    {selected && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-500/30 border border-purple-400/50 text-[11px] font-bold text-purple-100 shrink-0">
                        Faol
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : subPanel === 'lock' ? (
          <div key="lock" className="p-5 space-y-4 animate-backdrop-fade-in">
            <h5 className="font-display text-base font-bold text-white">Xonani qulflash</h5>
            <label className="flex items-center justify-between p-3.5 rounded-xl bg-[#080B14] border border-white/10 cursor-pointer">
              <span className="text-sm text-white">Parolli himoya</span>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
            </label>
            {isPrivate && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Yangi parol kiriting"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
            )}
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                await savePartial({ isPrivate, password: password || undefined });
                setSubPanel('main');
              }}
              className="w-full min-h-[46px] rounded-xl bg-blue-600 text-white font-semibold text-sm"
            >
              Qulf holatini saqlash
            </button>
          </div>
        ) : subPanel === 'bans' ? (
          <div className="p-5 space-y-3 overflow-y-auto max-h-[65vh]">
            <h5 className="font-display text-base font-bold text-white">Qora ro‘yxat</h5>
            {loadingBans ? (
              <p className="text-xs text-slate-400 py-6 text-center">Yuklanmoqda...</p>
            ) : bans.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                Qora ro‘yxatda foydalanuvchi yo‘q.
              </p>
            ) : (
              bans.map((b) => (
                <div
                  key={b.userId}
                  className="p-3 rounded-xl bg-[#080B14] border border-white/[0.08] flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <AvatarWithFrame src={b.avatarUrl} alt={b.nickname} size="sm" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{b.nickname}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {b.publicId} · {b.reason}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnban(b.userId)}
                    className="min-h-[36px] px-3 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-xs font-medium text-emerald-300 whitespace-nowrap"
                  >
                    Chiqarish
                  </button>
                </div>
              ))
            )}
          </div>
        ) : subPanel === 'admins' ? (
          <div className="p-5 space-y-3 overflow-y-auto max-h-[65vh]">
            <h5 className="font-display text-base font-bold text-white">
              Xona moderatorlari (Admin)
            </h5>
            {!isOwner ? (
              <p className="text-xs text-slate-400">
                Faqat xona egasi moderatorlarni qo‘shishi yoki olib tashlashi mumkin.
              </p>
            ) : (
              allUsers
                .filter((u) => u.id !== room.ownerId)
                .map((u) => {
                  const isMod = room.moderatorIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-[#080B14] border border-white/[0.08] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <AvatarWithFrame src={u.avatarUrl} alt={u.nickname} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">{u.nickname}</div>
                          <div className="text-xs text-slate-400 font-mono">{u.publicId}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleModerator(u.id)}
                        className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap ${
                          isMod
                            ? 'bg-red-500/15 border border-red-500/40 text-red-300'
                            : 'bg-blue-600 text-white'
                        }`}
                      >
                        {isMod ? 'Olib tashlash' : 'Tayinlash'}
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        ) : (
          /* MAIN SETTINGS SHEET (matches video layout) */
          <div key="main" className="flex-1 overflow-y-auto p-4 space-y-3 animate-backdrop-fade-in">
            {statusNote && (
              <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs text-emerald-200">
                {statusNote}
              </div>
            )}

            {/* Xona nomi */}
            <div className="p-3.5 rounded-2xl bg-[#080B14] border border-white/[0.07] space-y-1.5 transition-all duration-150 ease-out hover:scale-[1.01] hover:border-white/15">
              <label className="block text-xs font-medium text-slate-400">Xona nomi</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full min-h-[40px] px-3 bg-[#11172A] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Xona e'loni */}
            <div className="p-3.5 rounded-2xl bg-[#080B14] border border-white/[0.07] space-y-1.5 transition-all duration-150 ease-out hover:scale-[1.01] hover:border-white/15">
              <label className="block text-xs font-medium text-slate-400">Xona e&apos;loni</label>
              <textarea
                rows={2}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="Xona qoidalari yoki e'lon matnini kiriting..."
                className="w-full p-3 bg-[#11172A] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Expandable Message & Filter Rows */}
            <div className="rounded-2xl bg-[#080B14] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
              <div>
                <button
                  type="button"
                  onClick={() => setExpandedWelcomeRoom((v) => !v)}
                  className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
                >
                  <span className="text-sm text-white">Xona uchun xush kelibsiz xabar</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      expandedWelcomeRoom ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedWelcomeRoom && (
                  <div className="px-4 pb-3">
                    <textarea
                      rows={2}
                      value={welcomeRoomMsg}
                      onChange={(e) => setWelcomeRoomMsg(e.target.value)}
                      placeholder="Xonaga kirganda ko‘rinadigan xush kelibsiz xabar..."
                      className="w-full p-2.5 bg-[#11172A] border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setExpandedWelcomeUser((v) => !v)}
                  className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
                >
                  <span className="text-sm text-white">
                    Yangi foydalanuvchiga xush kelibsiz xabari
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      expandedWelcomeUser ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedWelcomeUser && (
                  <div className="px-4 pb-3">
                    <textarea
                      rows={2}
                      value={welcomeUserMsg}
                      onChange={(e) => setWelcomeUserMsg(e.target.value)}
                      placeholder="Yangi mehmonlar uchun salomlashish xabari..."
                      className="w-full p-2.5 bg-[#11172A] border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setPublicScreenEnabled((v) => !v)}
                className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
              >
                <span className="text-sm text-white">Ommaviy ekran sozlamalari</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className={publicScreenEnabled ? 'text-emerald-400' : 'text-amber-400'}>
                    {publicScreenEnabled ? 'Yoqilgan' : 'O‘chirilgan'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => setExpandedSensitive((v) => !v)}
                  className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
                >
                  <span className="text-sm text-white">Nozik so‘zlar sozlamalari</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      expandedSensitive ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {expandedSensitive && (
                  <div className="px-4 pb-3 space-y-1">
                    <input
                      type="text"
                      value={sensitiveWords}
                      onChange={(e) => setSensitiveWords(e.target.value)}
                      placeholder="So‘zlarni vergul bilan ajrating (masalan: spam, reklama)"
                      className="w-full min-h-[40px] px-3 bg-[#11172A] border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Room Mode & Controls Group */}
            <div className="rounded-2xl bg-[#080B14] border border-white/[0.07] divide-y divide-white/[0.06] overflow-hidden">
              <button
                type="button"
                onClick={() => setSubPanel('roomType')}
                className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
              >
                <span className="text-sm text-white">Xona turi</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <span>{roomType === 'video' ? 'Video' : 'Chat'}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubPanel('micMode')}
                className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
              >
                <span className="text-sm text-white">Mikrofon rejimi</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span>{micMode === 'request' ? 'so‘rov bilan' : 'ochiq rejim'}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </span>
              </button>

              <label className="w-full min-h-[48px] px-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center">
                <span className="text-sm text-white">
                  Xona a&apos;zosining tasdiqlanishi kerak
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={requireMemberApproval}
                  onClick={() => setRequireMemberApproval((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    requireMemberApproval ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      requireMemberApproval ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>

              <button
                type="button"
                onClick={() => setSubPanel('seats')}
                className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
              >
                <span className="text-sm text-white">Bug&apos;doy rejimi</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
                  <span>{maxSeats} kishi</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </span>
              </button>

              <div className="w-full min-h-[48px] px-4 flex items-center justify-between hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center">
                <span className="text-sm text-white">Super Mikrofon</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={superMicEnabled}
                  onClick={() => setSuperMicEnabled((v) => !v)}
                  className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                    superMicEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                      superMicEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSubPanel('bans')}
                className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
              >
                <span className="text-sm text-white flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400" />
                  <span>Qora ro‘yxat</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => setSubPanel('dynamicBg')}
                className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
              >
                <span className="text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Dinamik fonlar</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-purple-300 font-medium">
                  <span>
                    {DYNAMIC_BACKGROUNDS.find((b) => b.id === dynamicBg)?.title || 'Sahro gulxani'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubPanel('effect')}
                className="w-full min-h-[48px] px-4 flex items-center justify-between text-left hover:bg-white/[0.04] transition-all duration-150 ease-out hover:scale-[1.015] origin-center"
              >
                <span className="text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#E5B84B]" />
                  <span>Effekt o‘tish</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-300">
                  <span>{effectLabels[visualEffect]}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </span>
              </button>
            </div>

            {/* Bottom 5 Quick Actions Matching Reference Video */}
            <div className="grid grid-cols-5 gap-2 pt-1">
              <button
                type="button"
                onClick={handleClearScreen}
                disabled={saving}
                className="p-2 rounded-xl bg-[#080B14] border border-white/[0.07] hover:border-blue-500/40 flex flex-col items-center justify-center gap-1.5 min-h-[66px] transition-all duration-150 ease-out hover:scale-[1.05] active:scale-[0.96]"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-400 flex items-center justify-center">
                  <Eraser className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-300 truncate max-w-full">Ekran toz...</span>
              </button>

              <button
                type="button"
                onClick={() => setSubPanel('theme')}
                className="p-2 rounded-xl bg-[#080B14] border border-white/[0.07] hover:border-purple-500/40 flex flex-col items-center justify-center gap-1.5 min-h-[66px] transition-all duration-150 ease-out hover:scale-[1.05] active:scale-[0.96]"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/15 text-purple-300 flex items-center justify-center">
                  <Palette className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-300">Mavzu</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (roomType !== 'video') {
                    await savePartial({ roomType: 'video' });
                  }
                  onClose();
                  onOpenYouTubePicker();
                }}
                className="p-2 rounded-xl bg-[#080B14] border border-white/[0.07] hover:border-amber-500/40 flex flex-col items-center justify-center gap-1.5 min-h-[66px] transition-all duration-150 ease-out hover:scale-[1.05] active:scale-[0.96]"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-[#E5B84B] flex items-center justify-center">
                  <Music className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-300">Musiqa</span>
              </button>

              <button
                type="button"
                onClick={() => setSubPanel('lock')}
                className="p-2 rounded-xl bg-[#080B14] border border-white/[0.07] hover:border-emerald-500/40 flex flex-col items-center justify-center gap-1.5 min-h-[66px] transition-all duration-150 ease-out hover:scale-[1.05] active:scale-[0.96]"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </div>
                <span className="text-[10px] text-slate-300">Qulflash</span>
              </button>

              <button
                type="button"
                onClick={() => setSubPanel('admins')}
                className="p-2 rounded-xl bg-[#080B14] border border-white/[0.07] hover:border-pink-500/40 flex flex-col items-center justify-center gap-1.5 min-h-[66px] transition-all duration-150 ease-out hover:scale-[1.05] active:scale-[0.96]"
              >
                <div className="w-8 h-8 rounded-full bg-pink-500/15 text-pink-300 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-300">Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Save Button on main sheet */}
        {subPanel === 'main' && (
          <div className="p-4 border-t border-white/[0.08] bg-[#131A2E]">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAll}
              className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm disabled:opacity-50 transition-all duration-150 ease-out hover:scale-[1.015] active:scale-[0.985]"
            >
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
