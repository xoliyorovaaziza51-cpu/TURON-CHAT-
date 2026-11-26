import React, { useRef, useState } from 'react';
import {
  Check,
  Gamepad2,
  Gift,
  Image as ImageIcon,
  Link2,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { GAMES_CATALOG } from './gamesCatalog';
import { GameThumbnail } from './GameArtwork';
import type {
  RocketRibbonActionType,
  RoomRocketRibbonItem,
  VoiceRoom,
} from '../types/turon';

interface RocketRibbonManagerModalProps {
  room: VoiceRoom;
  initialTab?: 'rocket' | 'games';
  defaultGameIds: string[];
  onRoomUpdated: (room: VoiceRoom) => void;
  onClose: () => void;
}

function compressRibbonImage(file: File, maxDim = 192, quality = 0.85): Promise<string> {
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

const QUICK_TEMPLATES: Array<{
  title: string;
  subtitle: string;
  actionType: RocketRibbonActionType;
  imageUrl: string;
}> = [
  {
    title: 'O‘yinlar',
    subtitle: 'Boshlash',
    actionType: 'games',
    imageUrl: '',
  },
  {
    title: 'VIP Sovg‘a',
    subtitle: 'Yuborish',
    actionType: 'gift',
    imageUrl: '/src/assets/images/ring_burj_prestige_1794906637372.jpg',
  },
  {
    title: 'Raketa',
    subtitle: 'Parvoz',
    actionType: 'rocket',
    imageUrl: '/src/assets/images/room_rocket_emblem_1795635861877.jpg',
  },
];

export const RocketRibbonManagerModal: React.FC<RocketRibbonManagerModalProps> = ({
  room,
  initialTab = 'rocket',
  defaultGameIds,
  onRoomUpdated,
  onClose,
}) => {
  const [tab, setTab] = useState<'rocket' | 'games'>(initialTab);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [actionType, setActionType] = useState<RocketRibbonActionType>('gift');
  const [targetUrl, setTargetUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedGameIds, setSelectedGameIds] = useState<string[]>(() =>
    room.gameRibbonIds && room.gameRibbonIds.length > 0 ? room.gameRibbonIds : defaultGameIds
  );

  const customItems: RoomRocketRibbonItem[] = room.rocketRibbonItems || [];

  async function handleSelectImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressRibbonImage(file, 192, 0.85);
      setImageUrl(compressed);
    } catch {
      setError('Rasmni yuklashda xatolik');
    } finally {
      e.target.value = '';
    }
  }

  async function handleAddRibbonItem(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSaving(true);
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}/rocket-ribbon`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          subtitle,
          imageUrl,
          actionType,
          targetUrl: actionType === 'link' ? targetUrl : '',
        }),
      });
      onRoomUpdated(res.room);
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setTargetUrl('');
      setFeedback('Yangi element raketa lentasiga qo‘shildi!');
    } catch (err: any) {
      setError(err.message || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    setError('');
    setFeedback('');
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(
        `/api/rooms/${room.id}/rocket-ribbon/${itemId}`,
        { method: 'DELETE' }
      );
      onRoomUpdated(res.room);
      setFeedback('Element lentadan olib tashlandi.');
    } catch (err: any) {
      setError(err.message || 'O‘chirishda xatolik');
    }
  }

  function toggleGameSelection(gameId: string) {
    setSelectedGameIds((prev) => {
      if (prev.includes(gameId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== gameId);
      }
      if (prev.length >= 12) return prev;
      return [...prev, gameId];
    });
  }

  async function handleSaveGameRibbon() {
    setError('');
    setFeedback('');
    setSaving(true);
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}/game-ribbon`, {
        method: 'PUT',
        body: JSON.stringify({ gameIds: selectedGameIds }),
      });
      onRoomUpdated(res.room);
      setFeedback('O‘yinlar lentasi yangilandi!');
    } catch (err: any) {
      setError(err.message || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  function renderPreviewIcon(type: RocketRibbonActionType) {
    switch (type) {
      case 'games':
        return <Gamepad2 className="w-4 h-4 text-sky-300" />;
      case 'rocket':
        return <Rocket className="w-4 h-4 text-[#E5B84B]" />;
      case 'link':
        return <Link2 className="w-4 h-4 text-emerald-300" />;
      default:
        return <Gift className="w-4 h-4 text-[#E5B84B]" />;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0B101E] border border-[#E5B84B]/35 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-sheet-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] bg-[#0F1524] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#E5B84B]/15 border border-[#E5B84B]/40 flex items-center justify-center text-[#E5B84B] shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-white truncate">
                Lentaga narsa qo‘shish
              </h3>
              <p className="text-xs text-slate-400 truncate">
                Raketa lentasi va yuqoridagi o‘yinlar lentasini boshqaring
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 shrink-0"
            aria-label="Yopish"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-5 pt-3 flex items-center gap-2 border-b border-white/[0.06] bg-[#0B101E]">
          <button
            type="button"
            onClick={() => {
              setTab('rocket');
              setError('');
              setFeedback('');
            }}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'rocket'
                ? 'border-[#E5B84B] text-[#FDE68A]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Raketa lentasi ({customItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('games');
              setError('');
              setFeedback('');
            }}
            className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'games'
                ? 'border-sky-400 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>O‘yinlar lentasi ({selectedGameIds.length})</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}
          {feedback && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
              {feedback}
            </div>
          )}

          {tab === 'rocket' ? (
            <>
              {/* Quick Templates */}
              <div className="space-y-1.5">
                <div className="text-xs text-slate-400">Tezkor shablonlar</div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {QUICK_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.title}
                      type="button"
                      onClick={() => {
                        setTitle(tpl.title);
                        setSubtitle(tpl.subtitle);
                        setActionType(tpl.actionType);
                        setImageUrl(tpl.imageUrl);
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-xs text-slate-200 flex items-center gap-1.5"
                    >
                      {renderPreviewIcon(tpl.actionType)}
                      <span>{tpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Item Form + Live 64px Preview */}
              <form
                onSubmit={handleAddRibbonItem}
                className="p-4 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Nomi</label>
                        <input
                          type="text"
                          required
                          maxLength={24}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Masalan: Bonus"
                          className="w-full min-h-[40px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Ostki yozuv</label>
                        <input
                          type="text"
                          maxLength={24}
                          value={subtitle}
                          onChange={(e) => setSubtitle(e.target.value)}
                          placeholder="Kirish"
                          className="w-full min-h-[40px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Bosilganda nima ochilsin?
                      </label>
                      <select
                        value={actionType}
                        onChange={(e) => setActionType(e.target.value as RocketRibbonActionType)}
                        className="w-full min-h-[40px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                      >
                        <option value="gift">Sovg‘alar do‘konini ochish</option>
                        <option value="games">Xona o‘yinlarini ochish</option>
                        <option value="rocket">Raketa oynasini ochish</option>
                        <option value="link">Tashqi havola ochish (Telegram/Sayt)</option>
                      </select>
                    </div>
                  </div>

                  {/* Live 64px Ribbon Preview */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-400">64px ko‘rinish</span>
                    <div className="w-[64px] rounded-xl bg-[#091126] border border-[#E5B84B]/50 p-1 flex flex-col items-center gap-0.5 text-center shadow-lg">
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/15 bg-[#121D3D] flex items-center justify-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt="Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          renderPreviewIcon(actionType)
                        )}
                      </div>
                      <div className="w-full leading-none">
                        <div className="text-[9px] font-display font-bold text-white truncate">
                          {title.trim() || 'Nomi'}
                        </div>
                        <div className="text-[8px] font-mono text-[#FDE68A] truncate mt-0.5">
                          {subtitle.trim() || 'Kirish'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {actionType === 'link' && (
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Havola (URL)</label>
                    <input
                      type="url"
                      required
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      placeholder="https://t.me/kanal_nomi"
                      className="w-full min-h-[40px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Rasm / Stiker (ixtiyoriy)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSelectImage}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="min-h-[38px] px-3 rounded-xl bg-[#080B14] border border-white/15 hover:border-[#E5B84B] text-xs font-medium text-white flex items-center gap-1.5 shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#E5B84B]" />
                      <span>Rasm tanlash</span>
                    </button>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Yoki rasm URL manzili..."
                      className="flex-1 min-w-0 min-h-[38px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-slate-300"
                    />
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="text-xs text-red-300 hover:text-red-200 px-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !title.trim()}
                  className="w-full min-h-[42px] rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#1A0800] text-xs font-display font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{saving ? 'Qo‘shilmoqda...' : 'Raketa lentasiga qo‘shish'}</span>
                </button>
              </form>

              {/* Existing Custom Items List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Lentaga qo‘shilgan narsalar ({customItems.length})
                </div>
                {customItems.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[#0F1524]/60 border border-white/[0.06] text-xs text-slate-400 text-center">
                    Hozircha qo‘shimcha element yo‘q. Yuqoridan istalgan tugma, rasm yoki havola qo‘shishingiz mumkin.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06] rounded-xl bg-[#0F1524] border border-white/[0.07] overflow-hidden">
                    {customItems.map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#080B14] border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                            {it.imageUrl ? (
                              <img
                                src={it.imageUrl}
                                alt={it.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              renderPreviewIcon(it.actionType)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">{it.title}</div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {it.subtitle} · {it.actionType}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(it.id)}
                          className="min-h-[34px] min-w-[34px] rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 flex items-center justify-center shrink-0"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Tab 2: Choose Games for the Top Rotating Games Ribbon */
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-slate-300">
                  Raketa ustidagi o‘yinlar lentasida aylanib turadigan o‘yinlarni tanlang (1–12 ta):
                </p>
                <span className="text-xs font-mono text-sky-300 shrink-0">
                  {selectedGameIds.length}/12
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {GAMES_CATALOG.map((g) => {
                  const active = selectedGameIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGameSelection(g.id)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        active
                          ? 'bg-sky-500/15 border-sky-400/60 text-white'
                          : 'bg-[#0F1524] border-white/[0.07] text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10">
                        <GameThumbnail gameId={g.id} title={g.title} className="w-full h-full" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{g.title}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {g.category === 'omadli' ? 'Omadli' : 'Oddiy'}
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                          active ? 'bg-sky-400 text-[#041022]' : 'border border-white/20'
                        }`}
                      >
                        {active && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleSaveGameRibbon}
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-display font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Saqlanmoqda...' : 'O‘yinlar lentasini saqlash'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
