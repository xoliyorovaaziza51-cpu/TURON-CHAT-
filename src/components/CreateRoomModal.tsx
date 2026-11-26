import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Play,
  SlidersHorizontal,
  Tv,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { VoiceRoom } from '../types/turon';

interface CreateRoomModalProps {
  onClose: () => void;
  onRoomCreatedAndEnter: (room: VoiceRoom) => void;
}

const COVER_OPTIONS = [
  { label: 'Turon Studiya', url: '/src/assets/images/turon_hero_banner_1794822313365.jpg' },
  { label: 'Vokal Mikrofon', url: '/src/assets/images/room_cover_music_1794822313674.jpg' },
  { label: 'Toshkent Terrasa', url: '/src/assets/images/room_cover_lounge_1794822314263.jpg' },
  { label: 'Podkast Stol', url: '/src/assets/images/room_cover_talk_1794822313757.jpg' },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  onClose,
  onRoomCreatedAndEnter,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [welcomeRoomMsg, setWelcomeRoomMsg] = useState('');
  const [roomType, setRoomType] = useState<'chat' | 'video'>('chat');
  const [micMode, setMicMode] = useState<'open' | 'request'>('open');
  const [requireMemberApproval, setRequireMemberApproval] = useState(false);
  const [category, setCategory] = useState('Suhbat');
  const [maxSeats, setMaxSeats] = useState(9);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [backgroundTheme, setBackgroundTheme] = useState<
    'sapphire' | 'amethyst' | 'gold' | 'obsidian'
  >('sapphire');
  const [coverUrl, setCoverUrl] = useState(COVER_OPTIONS[0].url);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await apiFetch<{ room: VoiceRoom }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: announcement || description,
          announcement: announcement || description,
          welcomeRoomMsg,
          roomType,
          micMode,
          requireMemberApproval,
          category,
          maxSeats,
          isPrivate,
          password,
          backgroundTheme,
          coverUrl,
        }),
      });
      onRoomCreatedAndEnter(res.room);
    } catch (err: any) {
      setError(err.message || 'Xona yaratishda xatolik');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-lg bg-[#0F1524] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            <h3 className="font-display text-lg font-semibold text-white flex items-center gap-2">
              <span aria-hidden="true">🏛️</span>
              <span>Yangi ovozli xona</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateRoom} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Xona turi (Chat vs Video 2-card selector) */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Xona turi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRoomType('chat')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                  roomType === 'chat'
                    ? 'bg-gradient-to-br from-amber-500/25 to-orange-600/15 border-amber-400 text-white'
                    : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center relative shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                  <Heart className="w-2.5 h-2.5 text-white fill-white absolute -top-0.5 -right-0.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold">Chat</div>
                  <div className="text-[11px] text-slate-300/80 truncate">Ovozli xona</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRoomType('video')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 text-left transition-all ${
                  roomType === 'video'
                    ? 'bg-gradient-to-br from-purple-500/30 to-fuchsia-600/20 border-fuchsia-400 text-white'
                    : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center relative shrink-0">
                  <Tv className="w-5 h-5 text-white" />
                  <Play className="w-2.5 h-2.5 text-white fill-white absolute" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold">Video</div>
                  <div className="text-[11px] text-slate-300/80 truncate">YouTube kino</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Xona nomi</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masalan: Samarqand Oqshomlari"
              className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Xona e&apos;loni</label>
            <textarea
              rows={2}
              value={announcement}
              onChange={(e) => {
                setAnnouncement(e.target.value);
                setDescription(e.target.value);
              }}
              placeholder="Xona qoidalari va e'lon matnini kiriting..."
              className="w-full p-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Xona uchun xush kelibsiz xabar
            </label>
            <input
              type="text"
              value={welcomeRoomMsg}
              onChange={(e) => setWelcomeRoomMsg(e.target.value)}
              placeholder="Xush kelibsiz! Xonamizda maroqli suhbat tilaymiz."
              className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Toifa</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              >
                <option value="Suhbat">Suhbat</option>
                <option value="Musiqa">Musiqa</option>
                <option value="Podkast">Podkast</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Bug&apos;doy rejimi</label>
              <select
                value={maxSeats}
                onChange={(e) => setMaxSeats(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white font-mono"
              >
                {[4, 8, 9, 12, 16, 20].map((n) => (
                  <option key={n} value={n}>
                    {n} kishi
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Mikrofon rejimi</label>
              <select
                value={micMode}
                onChange={(e) => setMicMode(e.target.value as 'open' | 'request')}
                className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              >
                <option value="open">Ochiq rejim</option>
                <option value="request">So‘rov bilan</option>
              </select>
            </div>
            <label className="flex items-center justify-between px-3.5 min-h-[44px] mt-5 rounded-xl bg-[#080B14] border border-white/10 cursor-pointer">
              <span className="text-xs text-white truncate pr-2">A&apos;zo tasdiqlash</span>
              <input
                type="checkbox"
                checked={requireMemberApproval}
                onChange={(e) => setRequireMemberApproval(e.target.checked)}
                className="w-4 h-4 accent-blue-600 shrink-0"
              />
            </label>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Xona foni</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'sapphire', label: 'Moviy' },
                { id: 'amethyst', label: 'Binafsha' },
                { id: 'gold', label: 'Oltin' },
                { id: 'obsidian', label: 'Tungi' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setBackgroundTheme(t.id as any)}
                  className={`min-h-[40px] rounded-xl text-xs font-medium border ${
                    backgroundTheme === t.id
                      ? 'bg-blue-600/20 border-blue-500 text-white'
                      : 'bg-[#080B14] border-white/10 text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Muqova rasmi</label>
            <div className="grid grid-cols-4 gap-2">
              {COVER_OPTIONS.map((c) => (
                <button
                  key={c.url}
                  type="button"
                  onClick={() => setCoverUrl(c.url)}
                  className={`relative h-14 rounded-xl overflow-hidden border ${
                    coverUrl === c.url ? 'border-[#E5B84B]' : 'border-white/10'
                  }`}
                >
                  <img
                    src={c.url}
                    alt={c.label}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#080B14] border border-white/[0.07] space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-white">Yopiq xona (Parol bilan kirish)</span>
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Xona parolini kiriting"
                className="w-full min-h-[44px] px-3.5 bg-[#0F1524] border border-white/10 rounded-xl text-sm text-white"
              />
            )}
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#080B14] font-bold text-sm flex items-center justify-center gap-2"
          >
            <span aria-hidden="true">🏛️</span>
            <span>{creating ? 'Yaratilmoqda...' : 'Xonani ochish va kirish'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
