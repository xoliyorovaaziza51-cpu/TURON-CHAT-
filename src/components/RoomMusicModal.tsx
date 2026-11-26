import React, { useRef, useState } from 'react';
import {
  Check,
  Disc3,
  FolderOpen,
  ListMusic,
  Music,
  Pause,
  Play,
  Plus,
  SkipBack,
  SkipForward,
  Smartphone,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { apiFetch, getStoredToken } from '../lib/api';
import type { RoomMusicState } from '../types/turon';

interface StagedSongFile {
  localId: string;
  file: File;
  title: string;
  durationSec: number;
  selected: boolean;
}

interface RoomMusicModalProps {
  roomId: string;
  currentUserId: string;
  musicState: RoomMusicState | null;
  canControl: boolean;
  currentTimeSec: number;
  durationSec: number;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onSeekLocal: (sec: number) => void;
  onMusicUpdated: (next: RoomMusicState) => void;
  onClose: () => void;
}

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function cleanTitleFromFile(fileName: string): string {
  return fileName
    .replace(/\.[a-z0-9]{1,6}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Qo‘shiq';
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const objUrl = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;
    const done = (dur: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objUrl);
      resolve(Number.isFinite(dur) && dur > 0 ? Math.round(dur) : 0);
    };
    const timer = setTimeout(() => done(0), 2500);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      clearTimeout(timer);
      done(audio.duration);
    };
    audio.onerror = () => {
      clearTimeout(timer);
      done(0);
    };
    audio.src = objUrl;
  });
}

export const RoomMusicModal: React.FC<RoomMusicModalProps> = ({
  roomId,
  currentUserId,
  musicState,
  canControl,
  currentTimeSec,
  durationSec,
  volume,
  onVolumeChange,
  onSeekLocal,
  onMusicUpdated,
  onClose,
}) => {
  const [showAddWindow, setShowAddWindow] = useState(false);
  const [stagedSongs, setStagedSongs] = useState<StagedSongFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tracks = musicState?.tracks || [];
  const currentTrack = musicState?.currentTrack || null;
  const isPlaying = Boolean(musicState?.isPlaying);
  const effectiveDuration =
    durationSec > 0 ? durationSec : Number(currentTrack?.durationSec || 0);
  const clampedTime = Math.min(currentTimeSec, effectiveDuration || currentTimeSec);

  async function sendControl(
    action: 'play' | 'pause' | 'select' | 'next' | 'prev' | 'seek' | 'remove',
    payload: { trackId?: string; positionSec?: number } = {}
  ) {
    setError('');
    setBusyAction(true);
    try {
      const res = await apiFetch<{ music: RoomMusicState }>(
        `/api/rooms/${roomId}/music/control`,
        {
          method: 'POST',
          body: JSON.stringify({ action, ...payload }),
        }
      );
      onMusicUpdated(res.music);
    } catch (err: any) {
      setError(err?.message || 'Musiqa boshqaruvida xatolik');
    } finally {
      setBusyAction(false);
    }
  }

  async function handlePickedPhoneFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setError('');

    const files = Array.from(fileList);
    const additions: StagedSongFile[] = [];
    for (const file of files) {
      if (file.size > 29 * 1024 * 1024) {
        setError(`"${file.name}" fayli juda katta (maksimal 29 MB)`);
        continue;
      }
      const dur = await readAudioDuration(file);
      additions.push({
        localId: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file,
        title: cleanTitleFromFile(file.name),
        durationSec: dur,
        selected: true,
      });
    }

    if (additions.length > 0) {
      setStagedSongs((prev) => [...prev, ...additions]);
    }
    e.target.value = '';
  }

  async function handleConfirmAddSongs() {
    const toUpload = stagedSongs.filter((s) => s.selected);
    if (toUpload.length === 0) {
      setError('Kamida bitta qo‘shiq tanlang');
      return;
    }

    setError('');
    setUploading(true);
    const token = getStoredToken();
    let latestState: RoomMusicState | null = null;

    try {
      for (let i = 0; i < toUpload.length; i += 1) {
        const item = toUpload[i];
        setUploadProgressText(`Yuklanmoqda (${i + 1}/${toUpload.length}): ${item.title}`);
        const res = await fetch(`/api/rooms/${roomId}/music/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': item.file.type || 'audio/mpeg',
            'x-file-name': encodeURIComponent(item.file.name || 'song.mp3'),
            'x-track-title': encodeURIComponent(item.title.trim() || 'Qo‘shiq'),
            'x-track-artist': '',
            'x-track-duration': String(item.durationSec || 0),
          },
          body: item.file,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `"${item.title}" yuklanmadi`);
        }
        if (data.music) {
          latestState = data.music as RoomMusicState;
        }
      }

      if (latestState) {
        onMusicUpdated(latestState);
      }
      setStagedSongs([]);
      setShowAddWindow(false);
    } catch (err: any) {
      setError(err?.message || 'Qo‘shiqlarni qo‘shishda xatolik');
    } finally {
      setUploading(false);
      setUploadProgressText('');
    }
  }

  const selectedUploadCount = stagedSongs.filter((s) => s.selected).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-fade-in">
      <div className="w-full max-w-lg bg-[#0B101D] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden animate-sheet-fade-in shadow-2xl">
        {/* Hidden Phone Music File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus"
          multiple
          onChange={handlePickedPhoneFiles}
          className="hidden"
        />

        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-2 bg-[#0F1524]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/25 to-fuchsia-500/25 border border-[#E5B84B]/40 flex items-center justify-center text-[#FDE68A] shrink-0">
              {showAddWindow ? (
                <FolderOpen className="w-5 h-5" />
              ) : (
                <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-white truncate">
                {showAddWindow ? 'Qo‘shiq qo‘shish' : 'Muzik'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {showAddWindow
                  ? 'Telefoningiz pleyeridagi qo‘shiqlardan tanlang'
                  : `${tracks.length} ta qo‘shiq xonada`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {!showAddWindow ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowAddWindow(true);
                }}
                className="min-h-[36px] px-3 rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#080B14] text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:brightness-105 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Qo‘shiq qo‘shish</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!uploading) setShowAddWindow(false);
                }}
                className="min-h-[36px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-200 text-xs font-medium"
              >
                Orqaga
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] min-w-[38px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
              aria-label="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/35 text-xs text-red-200 flex items-center justify-between gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-200 underline shrink-0"
              >
                Yopish
              </button>
            </div>
          )}

          {showAddWindow ? (
            /* ===== ADD SONG WINDOW (TELEFON PLEYERIDAN TANLASH) ===== */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full p-5 rounded-2xl bg-gradient-to-br from-[#131B31] to-[#0E1426] hover:from-[#18223D] hover:to-[#121931] border-2 border-dashed border-[#E5B84B]/50 hover:border-[#E5B84B] transition-all flex flex-col items-center text-center gap-2.5 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#E5B84B]/15 border border-[#E5B84B]/40 flex items-center justify-center text-[#FDE68A] group-hover:scale-105 transition-transform">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {stagedSongs.length > 0
                      ? 'Telefondan yana qo‘shiq tanlash'
                      : 'Telefon pleyeridan qo‘shiq tanlash'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Bosing — telefoningizdagi barcha MP3 / audio qo‘shiqlar chiqadi. Keraklilarini belgilab tanlang.
                  </div>
                </div>
              </button>

              {stagedSongs.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">
                      Tanlangan qo‘shiqlar ({selectedUploadCount}/{stagedSongs.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setStagedSongs((prev) => {
                          const allSelected = prev.every((s) => s.selected);
                          return prev.map((s) => ({ ...s, selected: !allSelected }));
                        })
                      }
                      className="text-[#FDE68A] hover:underline"
                    >
                      {stagedSongs.every((s) => s.selected)
                        ? 'Hammasini bekor qilish'
                        : 'Hammasini tanlash'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-0.5">
                    {stagedSongs.map((item) => (
                      <div
                        key={item.localId}
                        className={`p-2.5 rounded-xl border transition-colors flex items-center gap-2.5 ${
                          item.selected
                            ? 'bg-[#121A2F] border-[#E5B84B]/40'
                            : 'bg-[#090D18] border-white/[0.06] opacity-60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setStagedSongs((prev) =>
                              prev.map((s) =>
                                s.localId === item.localId ? { ...s, selected: !s.selected } : s
                              )
                            )
                          }
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                            item.selected
                              ? 'bg-[#E5B84B] border-[#E5B84B] text-[#080B14]'
                              : 'bg-white/5 border-white/20 text-transparent'
                          }`}
                          aria-label="Tanlash"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>

                        <div className="min-w-0 flex-1 space-y-1">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) =>
                              setStagedSongs((prev) =>
                                prev.map((s) =>
                                  s.localId === item.localId ? { ...s, title: e.target.value } : s
                                )
                              )
                            }
                            disabled={uploading}
                            className="w-full bg-black/30 border border-white/10 focus:border-[#E5B84B]/60 rounded-lg px-2.5 py-1 text-xs font-semibold text-white outline-none"
                            placeholder="Qo‘shiq nomi"
                          />
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 px-0.5">
                            {item.durationSec > 0 && <span>{formatSec(item.durationSec)}</span>}
                            <span>{formatFileSize(item.file.size)}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setStagedSongs((prev) => prev.filter((s) => s.localId !== item.localId))
                          }
                          disabled={uploading}
                          className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                          title="Olib tashlash"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {uploading && uploadProgressText && (
                    <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 flex items-center gap-2">
                      <Upload className="w-4 h-4 animate-bounce shrink-0" />
                      <span className="truncate">{uploadProgressText}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleConfirmAddSongs}
                    disabled={uploading || selectedUploadCount === 0}
                    className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#080B14] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {uploading
                        ? 'Qo‘shilmoqda...'
                        : `Muzik ro‘yxatiga qo‘shish (${selectedUploadCount} ta)`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ===== MAIN MUZIK PLAYER & PLAYLIST ===== */
            <>
              {tracks.length === 0 ? (
                <div className="py-10 px-4 rounded-2xl bg-[#0F1524] border border-white/[0.07] flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#E5B84B]/15 border border-[#E5B84B]/35 flex items-center justify-center text-[#FDE68A]">
                    <Music className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-bold text-white">Hozircha qo‘shiqlar yo‘q</div>
                    <p className="text-xs text-slate-400 max-w-xs">
                      «Qo‘shiq qo‘shish» tugmasini bosing va telefoningizdagi qo‘shiqlardan tanlab xonaga qo‘shing.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setShowAddWindow(true);
                    }}
                    className="mt-1 min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#080B14] font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Qo‘shiq qo‘shish</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Active Player Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-[#141C33] via-[#10172A] to-[#0D1221] border border-[#E5B84B]/25 space-y-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/25 to-purple-500/25 border border-[#E5B84B]/35 flex items-center justify-center text-[#FDE68A] shrink-0">
                        <Disc3 className={`w-6 h-6 ${isPlaying ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white truncate">
                          {currentTrack?.title || tracks[0].title}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">
                          {isPlaying ? 'Hozir ijro etilmoqda' : 'To‘xtatilgan'} ·{' '}
                          {currentTrack?.addedByName || tracks[0].addedByName}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <input
                        type="range"
                        min={0}
                        max={Math.max(1, effectiveDuration || 100)}
                        value={Math.min(clampedTime, Math.max(1, effectiveDuration || 100))}
                        disabled={!canControl || effectiveDuration <= 0}
                        onChange={(e) => {
                          const sec = Number(e.target.value);
                          onSeekLocal(sec);
                        }}
                        onMouseUp={(e) => {
                          if (canControl) {
                            sendControl('seek', {
                              positionSec: Number((e.target as HTMLInputElement).value),
                            });
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (canControl) {
                            sendControl('seek', {
                              positionSec: Number((e.target as HTMLInputElement).value),
                            });
                          }
                        }}
                        className="w-full accent-[#E5B84B] cursor-pointer h-1.5"
                      />
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{formatSec(clampedTime)}</span>
                        <span>{effectiveDuration > 0 ? formatSec(effectiveDuration) : '--:--'}</span>
                      </div>
                    </div>

                    {/* Transport Controls */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={!canControl || busyAction || tracks.length < 2}
                          onClick={() => sendControl('prev')}
                          className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-200 flex items-center justify-center disabled:opacity-40"
                          title="Oldingi qo‘shiq"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={!canControl || busyAction}
                          onClick={() =>
                            sendControl(isPlaying ? 'pause' : 'play', {
                              trackId: currentTrack?.id,
                              positionSec: Math.round(currentTimeSec),
                            })
                          }
                          className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E5B84B] to-amber-500 text-[#080B14] flex items-center justify-center shadow-lg shadow-amber-500/25 disabled:opacity-50 active:scale-95 transition-transform"
                          title={isPlaying ? 'To‘xtatish' : 'Qo‘yish'}
                        >
                          {isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                          ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={!canControl || busyAction || tracks.length < 2}
                          onClick={() => sendControl('next')}
                          className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-200 flex items-center justify-center disabled:opacity-40"
                          title="Keyingi qo‘shiq"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Personal Volume Control */}
                      <div className="flex items-center gap-2 min-w-[115px] max-w-[150px] flex-1">
                        <button
                          type="button"
                          onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
                          className="text-slate-300 hover:text-white shrink-0"
                          aria-label="Ovoz"
                        >
                          {volume === 0 ? (
                            <VolumeX className="w-4 h-4 text-slate-500" />
                          ) : (
                            <Volume2 className="w-4 h-4 text-[#E5B84B]" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={volume}
                          onChange={(e) => onVolumeChange(Number(e.target.value))}
                          className="w-full accent-[#E5B84B] h-1.5 cursor-pointer"
                          aria-label="Musiqa ovozi"
                        />
                      </div>
                    </div>

                    {!canControl && (
                      <div className="text-[11px] text-slate-400 text-center pt-1">
                        Ijroni xona egasi yoki adminlar boshqaradi · Ovoz balandligini o‘zingizga moslashingiz mumkin
                      </div>
                    )}
                  </div>

                  {/* Playlist */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 px-0.5">
                      <span className="font-semibold flex items-center gap-1.5">
                        <ListMusic className="w-4 h-4 text-[#E5B84B]" />
                        <span>Qo‘shiqlar ({tracks.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setError('');
                          setShowAddWindow(true);
                        }}
                        className="text-[#FDE68A] hover:underline font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Yana qo‘shish</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-[34vh] overflow-y-auto pr-0.5">
                      {tracks.map((track, idx) => {
                        const isActive = currentTrack?.id === track.id;
                        const canRemove = canControl || track.addedById === currentUserId;
                        return (
                          <div
                            key={track.id}
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
                              isActive
                                ? 'bg-[#E5B84B]/12 border-[#E5B84B]/45'
                                : 'bg-[#0F1524] border-white/[0.06] hover:border-white/15'
                            }`}
                          >
                            <button
                              type="button"
                              disabled={!canControl || busyAction}
                              onClick={() => {
                                if (isActive && isPlaying) {
                                  sendControl('pause', { positionSec: Math.round(currentTimeSec) });
                                } else {
                                  sendControl('select', { trackId: track.id });
                                }
                              }}
                              className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                isActive
                                  ? 'bg-[#E5B84B] text-[#080B14]'
                                  : 'bg-white/[0.06] text-slate-300 hover:bg-white/10'
                              }`}
                              title={canControl ? 'Qo‘yish' : ''}
                            >
                              {isActive && isPlaying ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : isActive ? (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={!canControl || busyAction}
                              onClick={() => sendControl('select', { trackId: track.id })}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div
                                className={`text-xs font-semibold truncate ${
                                  isActive ? 'text-[#FDE68A]' : 'text-white'
                                }`}
                              >
                                {track.title}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {track.durationSec > 0 ? `${formatSec(track.durationSec)} · ` : ''}
                                {track.addedByName}
                              </div>
                            </button>

                            {canRemove && (
                              <button
                                type="button"
                                disabled={busyAction}
                                onClick={() => sendControl('remove', { trackId: track.id })}
                                className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-500/10 flex items-center justify-center shrink-0"
                                title="O‘chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
