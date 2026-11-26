import React, { useState } from 'react';
import {
  Disc3,
  Music,
  Pause,
  Play,
  Plus,
  SkipForward,
  ThumbsUp,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { DJ_PRESET_LIBRARY } from '../lib/djAudioEngine';
import type { RoomDjState } from '../types/turon';

interface RoomDjPlayerModalProps {
  roomId: string;
  djState: RoomDjState | null;
  canControl: boolean;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onDjUpdated: (next: RoomDjState) => void;
  onClose: () => void;
}

export const RoomDjPlayerModal: React.FC<RoomDjPlayerModalProps> = ({
  roomId,
  djState,
  canControl,
  volume,
  onVolumeChange,
  onDjUpdated,
  onClose,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [sourceType, setSourceType] = useState<'preset' | 'audio' | 'youtube'>('preset');
  const [selectedPresetKey, setSelectedPresetKey] = useState(DJ_PRESET_LIBRARY[0].key);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleControl(
    action: 'play' | 'pause' | 'next' | 'select' | 'remove',
    trackId?: string
  ) {
    setError('');
    try {
      const res = await apiFetch<{ dj: RoomDjState }>(`/api/rooms/${roomId}/dj/control`, {
        method: 'POST',
        body: JSON.stringify({ action, trackId }),
      });
      onDjUpdated(res.dj);
    } catch (err: any) {
      setError(err.message || 'DJ boshqaruvida xatolik');
    }
  }

  async function handleVote(trackId: string) {
    setError('');
    try {
      const res = await apiFetch<{ dj: RoomDjState }>(
        `/api/rooms/${roomId}/dj/tracks/${trackId}/vote`,
        { method: 'POST' }
      );
      onDjUpdated(res.dj);
    } catch (err: any) {
      setError(err.message || 'Ovoz berishda xatolik');
    }
  }

  async function handleAddTrack(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const preset = DJ_PRESET_LIBRARY.find((p) => p.key === selectedPresetKey);
      const payload =
        sourceType === 'preset'
          ? {
              sourceType: 'preset',
              presetKey: selectedPresetKey,
              title: title.trim() || preset?.title || 'Turon Mix',
              artist: artist.trim() || preset?.artist || 'Turon Studio',
              durationSec: 190,
            }
          : {
              sourceType,
              title: title.trim(),
              artist: artist.trim() || 'Ishtirokchi tanlovi',
              sourceUrl: sourceUrl.trim(),
              durationSec: 210,
            };

      const res = await apiFetch<{ dj: RoomDjState }>(`/api/rooms/${roomId}/dj/tracks`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onDjUpdated(res.dj);
      setTitle('');
      setArtist('');
      setSourceUrl('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || "Trek qo'shishda xatolik");
    } finally {
      setSubmitting(false);
    }
  }

  const currentTrack = djState?.currentTrack || null;
  const queue = djState?.queue || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-fade-in">
      <div className="w-full max-w-2xl bg-[#0B101D] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden animate-sheet-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#0F1524]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600/25 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
              <Disc3 className={`w-5 h-5 ${djState?.isPlaying ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                DJ Pleyer · Umumiy pleylist
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {canControl
                  ? 'Xona egasi boshqaruvi faol · Ishtirokchilar ovoz berishi mumkin'
                  : 'Trek qo‘shing va navbat uchun ovoz bering (egasi ijroni boshqaradi)'}
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

        <div className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Now Playing Deck */}
          <div className="p-4 rounded-2xl bg-[#0F1524] border border-purple-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shrink-0">
                  <Music className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-purple-300">
                    {djState?.isPlaying ? 'Hozir ijro etilmoqda' : 'To‘xtatilgan'}
                  </div>
                  <div className="font-display text-base font-bold text-white truncate">
                    {currentTrack ? currentTrack.title : 'Pleylist bo‘sh'}
                  </div>
                  {currentTrack && (
                    <div className="text-xs text-slate-400 truncate">
                      {currentTrack.artist} · Qo‘shgan: {currentTrack.addedByName}
                    </div>
                  )}
                </div>
              </div>

              {canControl ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!currentTrack}
                    onClick={() => handleControl(djState?.isPlaying ? 'pause' : 'play')}
                    className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {djState?.isPlaying ? (
                      <>
                        <Pause className="w-4 h-4" />
                        <span>Pauza</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        <span>Ijro etish</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={queue.length === 0}
                    onClick={() => handleControl('next')}
                    className="min-h-[44px] px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                    title="Keyingi trek"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span className="hidden sm:inline">Keyingi</span>
                  </button>
                </div>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-slate-300">
                  Faqat xona egasi boshqaradi
                </span>
              )}
            </div>

            {/* Local Listener Volume Slider */}
            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-400 shrink-0">Ovoz balandligi</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                className="flex-1 accent-purple-500"
              />
              <span className="text-xs font-mono tabular-nums text-slate-300 w-9 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          {/* Add Track Bar / Form */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-display text-sm font-semibold text-white">
              Umumiy musiqa navbati ({queue.length})
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="min-h-[40px] px-3.5 rounded-xl bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-xs font-semibold text-blue-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Bekor qilish' : 'Musiqa qo‘shish'}</span>
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddTrack}
              className="p-4 rounded-xl bg-[#0F1524] border border-white/10 space-y-3"
            >
              <div className="flex gap-2">
                {[
                  { id: 'preset' as const, label: 'Turon Studiya' },
                  { id: 'audio' as const, label: 'MP3 Havola' },
                  { id: 'youtube' as const, label: 'YouTube' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSourceType(opt.id)}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-medium border transition-colors ${
                      sourceType === opt.id
                        ? 'bg-purple-600/25 border-purple-400 text-white'
                        : 'bg-[#080B14] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {sourceType === 'preset' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DJ_PRESET_LIBRARY.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setSelectedPresetKey(p.key)}
                      className={`p-2.5 rounded-xl border text-left transition-colors ${
                        selectedPresetKey === p.key
                          ? 'bg-purple-600/20 border-purple-400 text-white'
                          : 'bg-[#080B14] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="text-xs font-semibold">{p.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {p.artist} · {p.bpm} BPM
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="url"
                  required
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={
                    sourceType === 'youtube'
                      ? 'https://www.youtube.com/watch?v=...'
                      : 'https://example.com/music.mp3'
                  }
                  className="w-full min-h-[42px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500"
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required={sourceType !== 'preset'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    sourceType === 'preset' ? 'Nomi (ixtiyoriy)' : 'Musiqa nomi *'
                  }
                  className="min-h-[42px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500"
                />
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Ijrochi (ixtiyoriy)"
                  className="min-h-[42px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[42px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {submitting ? 'Qo‘shilmoqda...' : 'Pleylistga qo‘shish'}
              </button>
            </form>
          )}

          {/* Shared Voting Queue */}
          <div className="space-y-2">
            {queue.length === 0 ? (
              <div className="p-6 rounded-xl bg-[#0F1524] border border-white/[0.07] text-center text-xs text-slate-400">
                Pleylistda hozircha musiqa yo‘q. Yuqoridagi tugma orqali trek qo‘shing.
              </div>
            ) : (
              queue.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-purple-600/15 border-purple-500/45'
                        : 'bg-[#0F1524] border-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 text-xs font-mono tabular-nums text-slate-400 text-center shrink-0">
                        {isCurrent && djState?.isPlaying ? '▶' : `#${idx + 1}`}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-white truncate">
                            {track.title}
                          </span>
                          {track.isPlayed && !isCurrent && (
                            <span className="text-[10px] text-slate-500 shrink-0">Ijro etilgan</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {track.artist} · {track.addedByName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleVote(track.id)}
                        className={`min-h-[38px] px-2.5 rounded-lg border text-xs font-mono tabular-nums flex items-center gap-1.5 transition-colors ${
                          track.hasVoted
                            ? 'bg-[#E5B84B]/20 border-[#E5B84B] text-[#E5B84B]'
                            : 'bg-[#080B14] border-white/10 text-slate-300 hover:text-white'
                        }`}
                        title="Pleylistga ovoz berish"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{track.votesCount}</span>
                      </button>

                      {canControl && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleControl('select', track.id)}
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-white/[0.06] hover:bg-purple-600/30 text-slate-200 flex items-center justify-center"
                            title="Shu trekni ijro etish"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleControl('remove', track.id)}
                            className="min-h-[38px] min-w-[38px] rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-slate-400 hover:text-red-300 flex items-center justify-center"
                            title="O‘chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
