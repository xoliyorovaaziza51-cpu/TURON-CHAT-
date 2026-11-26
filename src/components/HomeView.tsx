import React, { useState } from 'react';
import {
  Bell,
  Crown,
  Eye,
  Lock,
  Mic,
  MicOff,
  Search,
  Sparkles,
  Users,
  ArrowRight,
  X,
} from 'lucide-react';
import { formatCoins } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import { RotatingLogoRibbon } from './RotatingLogoRibbon';
import { RoleBadge, getRoleVisuals } from './RoleBadge';
import { FrameSvg } from './FrameArtwork';
import type { RibbonLogo, UserProfile, VoiceRoom } from '../types/turon';

interface HomeViewProps {
  currentUser: UserProfile;
  rooms: VoiceRoom[];
  users: UserProfile[];
  ribbonLogos: RibbonLogo[];
  isStaff?: boolean;
  onOpenManageLogos?: () => void;
  onOpenDirectChat?: (partnerId: string) => void;
  onJoinRoom: (room: VoiceRoom) => void;
  onOpenUserProfile: (user: UserProfile) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const ROOM_CATEGORIES = ['Barchasi', 'Musiqa', 'Suhbat', 'Podkast'];

function getTopActiveParticipants(
  room: VoiceRoom,
  allUsers: UserProfile[]
): Array<{ user: UserProfile; isMuted: boolean; seatNumber: number }> {
  const seated = room.seats
    .filter((s) => Boolean(s.user) && s.userId !== room.ownerId)
    .map((s) => ({
      user: s.user as UserProfile,
      isMuted: Boolean(s.isMuted),
      seatNumber: s.seatNumber,
    }))
    .sort((a, b) => {
      if (a.isMuted !== b.isMuted) return a.isMuted ? 1 : -1;
      const scoreA = (a.user.totalReceived || 0) + (a.user.vipLevel || 0) * 1000;
      const scoreB = (b.user.totalReceived || 0) + (b.user.vipLevel || 0) * 1000;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.seatNumber - b.seatNumber;
    });

  if (seated.length >= 3) {
    return seated.slice(0, 3);
  }

  // Fill remaining slots up to 3 only with users actively in_room if seats are sparse, preserving seated users first
  const usedIds = new Set<string>([
    room.ownerId,
    ...seated.map((entry) => entry.user.id),
  ]);
  const extraActive = allUsers
    .filter((u) => !usedIds.has(u.id) && u.onlineStatus === 'in_room')
    .sort((a, b) => (b.totalReceived || 0) - (a.totalReceived || 0))
    .slice(0, 3 - seated.length)
    .map((u, idx) => ({
      user: u,
      isMuted: true,
      seatNumber: 90 + idx,
    }));

  return [...seated, ...extraActive].slice(0, 3);
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentUser,
  rooms,
  users,
  ribbonLogos,
  isStaff,
  onOpenManageLogos,
  onOpenDirectChat,
  onJoinRoom,
  onOpenUserProfile,
  searchQuery,
  onSearchChange,
}) => {
  const [selectedCat, setSelectedCat] = useState('Barchasi');
  const [notifyToast, setNotifyToast] = useState<string | null>(null);
  const [previewRoom, setPreviewRoom] = useState<VoiceRoom | null>(null);

  const filteredRooms = rooms.filter((r) => {
    const matchCat = selectedCat === 'Barchasi' || r.category === selectedCat;
    const q = searchQuery.trim().toLowerCase();
    const matchQ =
      !q ||
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.owner?.nickname.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  const featuredRoom = rooms.find((r) => r.isFeatured) || rooms[0];
  const onlineFriends = users.filter((u) => u.id !== currentUser.id && u.onlineStatus !== 'offline');
  const filteredUsers = users.filter((u) => {
    if (u.id === currentUser.id) return false;
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      u.nickname.toLowerCase().includes(q) ||
      u.publicId.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 pb-24 lg:pb-10">
      {/* Search Bar */}
      <div className="flex items-center">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Xonalar, foydalanuvchilar yoki TC-ID bo‘yicha qidirish..."
            className="w-full min-h-[44px] pl-10 pr-4 bg-[#0F1524] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Rotating Ribbon Banner (Logos Only -> Click to Chat) */}
      {!searchQuery && (
        <RotatingLogoRibbon
          logos={ribbonLogos}
          users={users}
          currentUserId={currentUser.id}
          isStaff={isStaff}
          onOpenManageLogos={onOpenManageLogos}
          onOpenDirectChat={onOpenDirectChat}
        />
      )}

      {/* Glowing 4-Column Circular Profiles Grid */}
      {filteredUsers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">Faol profillar</h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {filteredUsers.length} ta foydalanuvchi
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {filteredUsers.slice(0, 12).map((u, idx) => {
              const roleSpec = getRoleVisuals(u.role);
              const hasStoreFrame = Boolean(u.frameStyle && u.frameStyle.startsWith('frame-'));
              const ringColors = [
                'border-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.3)]',
                'border-fuchsia-400/70 shadow-[0_0_12px_rgba(232,121,249,0.3)]',
                'border-[#E5B84B]/70 shadow-[0_0_12px_rgba(229,184,75,0.3)]',
                'border-violet-400/70 shadow-[0_0_12px_rgba(167,139,250,0.3)]',
              ];
              const ringStyle = roleSpec.isElevated
                ? roleSpec.ringClass
                : ringColors[idx % ringColors.length];
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onOpenUserProfile(u)}
                  className="flex flex-col items-center gap-1.5 group focus:outline-none"
                >
                  <div className="relative">
                    <div
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-0.5 border bg-[#0B1024] overflow-hidden group-hover:scale-105 transition-transform ${ringStyle}`}
                    >
                      <img
                        src={u.avatarUrl}
                        alt={u.nickname}
                        referrerPolicy="no-referrer"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    {hasStoreFrame && (
                      <div className="pointer-events-none absolute -inset-[20%] z-10">
                        <FrameSvg frameId={u.frameStyle} sizeClass="w-full h-full" />
                      </div>
                    )}
                    {roleSpec.isElevated && (
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-20">
                        <RoleBadge role={u.role} size="xs" />
                      </div>
                    )}
                  </div>
                  <div
                    className={`w-full px-1.5 py-0.5 rounded-full bg-[#120D24] border text-[11px] truncate text-center ${
                      roleSpec.isElevated
                        ? `border-[#E5B84B]/80 ${roleSpec.nameColorClass}`
                        : 'border-white/15 font-semibold text-white'
                    }`}
                  >
                    {u.nickname.split(' ')[0]}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Hero Featured Voice Room */}
      {featuredRoom && !searchQuery && (
        <section className="relative rounded-2xl overflow-hidden border border-white/10 min-h-[260px] flex items-end">
          <img
            src={featuredRoom.coverUrl}
            alt={featuredRoom.title}
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080B14] via-[#080B14]/70 to-[#080B14]/25" />
          <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="text-xs font-medium text-[#E5B84B] mb-2">
                Tavsiya etilgan xona · {featuredRoom.category}
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight [text-wrap:balance]">
                {featuredRoom.title}
              </h2>
              <p className="text-sm text-slate-300 mt-2 line-clamp-2">
                {featuredRoom.description}
              </p>
              <div className="flex items-center gap-3 mt-4 text-xs text-slate-300">
                <span>Boshlovchi: {featuredRoom.owner?.nickname}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{featuredRoom.viewerCount} tinglovchi</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{featuredRoom.maxSeats} mikrofon o‘rni</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewRoom(featuredRoom)}
                className="min-h-[48px] px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap backdrop-blur-md transition-colors"
              >
                <Eye className="w-4 h-4 text-[#E5B84B]" />
                <span>Vizitka</span>
              </button>
              <button
                type="button"
                onClick={() => onJoinRoom(featuredRoom)}
                className="min-h-[48px] px-6 rounded-xl bg-[#E5B84B] hover:bg-[#f0c55d] text-[#080B14] font-semibold text-sm flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-colors"
              >
                <Mic className="w-4 h-4" />
                <span>Xonaga kirish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Online Friends Strip */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-white">Onlayn do‘stlar va faol boshlovchilar</h3>
          <span className="text-xs text-slate-400 font-mono tabular-nums">{onlineFriends.length} faol</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {onlineFriends.map((u) => {
            const roleSpec = getRoleVisuals(u.role);
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onOpenUserProfile(u)}
                className="flex flex-col items-center gap-1.5 min-w-[80px] p-2 rounded-xl hover:bg-white/[0.04] transition-colors shrink-0"
              >
                <AvatarWithFrame
                  src={u.avatarUrl}
                  alt={u.nickname}
                  size="md"
                  frameStyle={u.frameStyle}
                  vipLevel={u.vipLevel}
                  svipLevel={u.svipLevel}
                  role={u.role}
                  onlineStatus={u.onlineStatus}
                  showOnline
                />
                <div className={`text-xs font-medium truncate max-w-[76px] ${roleSpec.nameColorClass}`}>
                  {u.nickname.split(' ')[0]}
                </div>
                {roleSpec.isElevated && <RoleBadge role={u.role} size="xs" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* Voice Rooms Section */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-white">Mashhur va yangi ovozli xonalar</h3>
          <div className="flex items-center gap-1 p-1 bg-[#0F1524] border border-white/[0.07] rounded-xl overflow-x-auto">
            {ROOM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  selectedCat === cat
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#0F1524] border border-white/[0.07] text-center">
            <p className="text-sm text-slate-400">So‘rov bo‘yicha ovozli xona topilmadi.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRooms.map((room) => {
              const occupiedCount = room.seats.filter((s) => s.userId).length;
              const topActive = getTopActiveParticipants(room, users);
              return (
                <div
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onJoinRoom(room)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onJoinRoom(room);
                    }
                  }}
                  className="group text-left rounded-2xl bg-[#0F1524] border border-white/[0.07] hover:border-blue-500/40 overflow-hidden transition-colors flex flex-col cursor-pointer focus:outline-none focus:border-blue-500"
                >
                  <div className="relative h-40 w-full overflow-hidden bg-[#151D31]">
                    <img
                      src={room.coverUrl}
                      alt={room.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F1524] via-transparent to-black/30" />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 text-xs text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg font-mono tabular-nums">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{room.viewerCount}</span>
                    </div>
                    {room.isPrivate && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 text-xs text-[#E5B84B] bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-lg">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Parolli</span>
                      </div>
                    )}

                    {/* Live Preview Button (Xona vizitkasi) */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewRoom(room);
                      }}
                      className="absolute bottom-2.5 right-3 min-h-[30px] px-2.5 py-1 rounded-lg bg-[#080B14]/80 hover:bg-[#131C35] backdrop-blur-md border border-[#E5B84B]/45 text-[11px] font-semibold text-[#FDE68A] flex items-center gap-1.5 shadow transition-colors"
                      title="Xona vizitkasi (xonaga kirmasdan ko‘rish)"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E5B84B]" />
                      <span>Vizitka</span>
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-400">
                        {room.category} · {occupiedCount}/{room.maxSeats} mikrofon band
                      </div>
                      <h4 className="font-display text-base font-semibold text-white mt-1 line-clamp-1">
                        {room.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{room.description}</p>
                    </div>

                    {/* Inline Xona Vizitkasi Strip: Host + Top 3 Active Live Participants */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewRoom(room);
                      }}
                      className="p-2.5 rounded-xl bg-[#080B14]/80 border border-white/[0.06] hover:border-[#E5B84B]/35 flex items-center justify-between gap-2 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="relative shrink-0">
                          <AvatarWithFrame
                            src={room.owner?.avatarUrl}
                            alt={room.owner?.nickname || 'Egasi'}
                            size="xs"
                            frameStyle={room.owner?.frameStyle}
                            vipLevel={room.owner?.vipLevel}
                            svipLevel={room.owner?.svipLevel}
                            role={room.owner?.role}
                          />
                          <span
                            title="Xona egasi"
                            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E5B84B] text-[#080B14] flex items-center justify-center"
                          >
                            <Crown className="w-2.5 h-2.5" />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-semibold text-white truncate max-w-[90px]">
                              {room.owner?.nickname || 'Boshlovchi'}
                            </span>
                            {room.owner?.role && <RoleBadge role={room.owner.role} size="xs" />}
                          </div>
                          <div className="text-[10px] text-slate-400">Xona egasi</div>
                        </div>
                      </div>

                      {/* Top 3 Live Active Participants Avatars */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {topActive.length > 0 ? (
                          <div className="flex items-center -space-x-2">
                            {topActive.map(({ user, isMuted }) => (
                              <div key={user.id} className="relative">
                                <img
                                  src={user.avatarUrl}
                                  alt={user.nickname}
                                  title={`${user.nickname} (${isMuted ? 'Tinglovchi' : 'Efirda'})`}
                                  referrerPolicy="no-referrer"
                                  className={`w-7 h-7 rounded-full object-cover border-2 bg-[#0F1524] ${
                                    isMuted ? 'border-[#0F1524]' : 'border-emerald-400'
                                  }`}
                                />
                                {!isMuted && (
                                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-[#080B14]" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Efir bo‘sh</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewRoom(room);
                        }}
                        className="min-h-[34px] px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#E5B84B]" />
                        <span>Xona vizitkasi</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Xona bildirishnoma qo‘ng‘irog‘i"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotifyToast(`"${room.title}" xonasi uchun bildirishnomalar yoqildi.`);
                            setTimeout(() => setNotifyToast(null), 3500);
                          }}
                          className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors"
                        >
                          <Bell className="w-3.5 h-3.5 text-[#E5B84B]" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJoinRoom(room);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-xs font-semibold text-blue-300 whitespace-nowrap flex items-center gap-1"
                        >
                          <span>Kirish</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {notifyToast && (
        <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 px-4 py-3 rounded-xl bg-[#0F1524] border border-[#E5B84B]/50 shadow-2xl flex items-center gap-2.5 text-xs text-white">
          <Bell className="w-4 h-4 text-[#E5B84B] shrink-0" />
          <span>{notifyToast}</span>
        </div>
      )}

      {/* Xona Vizitkasi (Room Preview) Modal */}
      {previewRoom && (() => {
        const top3 = getTopActiveParticipants(previewRoom, users);
        const occupiedSeatsCount = previewRoom.seats.filter((s) => s.userId).length;
        return (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-fade-in"
            onClick={() => setPreviewRoom(null)}
          >
            <div
              className="w-full max-w-md bg-[#0E1424] border border-[#E5B84B]/35 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-sheet-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cover Header */}
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={previewRoom.coverUrl}
                  alt={previewRoom.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E1424] via-[#0E1424]/55 to-black/30" />
                <button
                  type="button"
                  onClick={() => setPreviewRoom(null)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                  aria-label="Yopish"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-semibold text-[#FDE68A] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#E5B84B]" />
                    <span>Xona vizitkasi</span>
                  </span>
                  {previewRoom.isPrivate && (
                    <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Parolli</span>
                    </span>
                  )}
                </div>

                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium text-sky-300">
                      {previewRoom.category} · ID: {previewRoom.id}
                    </div>
                    <h3 className="font-display text-lg font-extrabold text-white truncate">
                      {previewRoom.title}
                    </h3>
                  </div>
                  <div className="px-2.5 py-1 rounded-lg bg-black/65 border border-white/10 text-xs font-mono tabular-nums text-white flex items-center gap-1 shrink-0">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                    <span>{previewRoom.viewerCount}</span>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {(previewRoom.announcement || previewRoom.description) && (
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#080B14] border border-white/[0.06] rounded-xl p-3">
                    {previewRoom.announcement || previewRoom.description}
                  </p>
                )}

                {/* Xona egasi (Host) */}
                {previewRoom.owner && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-[#E5B84B]" />
                      <span>Xona egasi</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewRoom(null);
                        onOpenUserProfile(previewRoom.owner!);
                      }}
                      className="w-full p-3 rounded-2xl bg-[#131B30] border border-[#E5B84B]/30 hover:border-[#E5B84B]/60 flex items-center justify-between gap-3 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarWithFrame
                          src={previewRoom.owner.avatarUrl}
                          alt={previewRoom.owner.nickname}
                          size="md"
                          frameStyle={previewRoom.owner.frameStyle}
                          vipLevel={previewRoom.owner.vipLevel}
                          svipLevel={previewRoom.owner.svipLevel}
                          role={previewRoom.owner.role}
                          onlineStatus={previewRoom.owner.onlineStatus}
                          showOnline
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-white truncate">
                              {previewRoom.owner.nickname}
                            </span>
                            <RoleBadge role={previewRoom.owner.role} size="xs" />
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {previewRoom.owner.publicId} · Sovg‘alar: {formatCoins(previewRoom.owner.totalReceived)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#FDE68A] shrink-0">Profil →</span>
                    </button>
                  </div>
                )}

                {/* Top 3 Live Active Participants */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold uppercase tracking-wider text-slate-400">
                      Jonli efirdagi eng faol 3 ishtirokchi
                    </span>
                    <span className="font-mono tabular-nums text-slate-400">
                      {occupiedSeatsCount}/{previewRoom.maxSeats} o‘rin band
                    </span>
                  </div>

                  {top3.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.06] text-center text-xs text-slate-400">
                      Hozircha jonli mikrofonda boshqa faol ishtirokchilar yo‘q.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {top3.map(({ user, isMuted }, idx) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setPreviewRoom(null);
                            onOpenUserProfile(user);
                          }}
                          className="p-2.5 rounded-2xl bg-[#080B14] border border-white/[0.08] hover:border-emerald-400/45 flex flex-col items-center text-center gap-1.5 transition-colors"
                        >
                          <div className="relative">
                            <AvatarWithFrame
                              src={user.avatarUrl}
                              alt={user.nickname}
                              size="sm"
                              frameStyle={user.frameStyle}
                              vipLevel={user.vipLevel}
                              svipLevel={user.svipLevel}
                              role={user.role}
                              isSpeaking={!isMuted}
                            />
                            <span
                              className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-[#080B14] flex items-center justify-center ${
                                isMuted
                                  ? 'bg-slate-700 text-slate-300'
                                  : 'bg-emerald-500 text-[#05101F]'
                              }`}
                              title={isMuted ? 'Mikrofon o‘chiq' : 'Efirda gapirmoqda'}
                            >
                              {isMuted ? (
                                <MicOff className="w-2.5 h-2.5" />
                              ) : (
                                <Mic className="w-2.5 h-2.5" />
                              )}
                            </span>
                          </div>
                          <div className="w-full text-xs font-semibold text-white truncate">
                            {idx + 1}. {user.nickname.split(' ')[0]}
                          </div>
                          <div
                            className={`text-[10px] font-medium ${
                              isMuted ? 'text-slate-400' : 'text-emerald-300'
                            }`}
                          >
                            {isMuted ? 'Tinglovchi' : 'Jonli efirda'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setPreviewRoom(null)}
                    className="min-h-[44px] rounded-xl bg-white/[0.06] hover:bg-white/10 text-sm font-semibold text-slate-200"
                  >
                    Yopish
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = previewRoom;
                      setPreviewRoom(null);
                      onJoinRoom(target);
                    }}
                    className="min-h-[44px] rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#1A0800] text-sm font-extrabold flex items-center justify-center gap-1.5"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Xonaga kirish</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
