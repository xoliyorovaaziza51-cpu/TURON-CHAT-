import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Link2,
  Music,
  Play,
  Search,
  Share2,
  Tv,
  X,
  Youtube,
} from 'lucide-react';

interface YouTubePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (videoUrl: string, videoTitle: string) => Promise<void> | void;
}

interface CuratedVideoItem {
  id: string;
  title: string;
  channel: string;
  category: 'Musiqa' | 'Gaming' | 'O‘zbekcha';
  duration: string;
}

const CURATED_VIDEOS: CuratedVideoItem[] = [
  {
    id: 'jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio — Beats to Relax / Study',
    channel: 'Lofi Girl',
    category: 'Musiqa',
    duration: 'Jonli',
  },
  {
    id: '4xDzrJKXOOY',
    title: 'Synthwave Radio — Chill Synth / Retro Beats',
    channel: 'Lofi Girl Synthwave',
    category: 'Musiqa',
    duration: 'Jonli',
  },
  {
    id: '5qap5aO4i9A',
    title: 'Tungi Kafe — Relaxing Jazz & Lounge Mix',
    channel: 'Turon Music Lounge',
    category: 'Musiqa',
    duration: '1:45:00',
  },
  {
    id: 'M7lc1UVf-VE',
    title: 'Turon Ovozli Studiya — Jonli Konsert Sahna',
    channel: 'Turon Live',
    category: 'O‘zbekcha',
    duration: '18:24',
  },
  {
    id: 'hHW1oY26kxQ',
    title: 'Deep Focus & Chill Instrumental Mix 2026',
    channel: 'Chillhop Music',
    category: 'Musiqa',
    duration: '2:12:10',
  },
  {
    id: 'DWcJFNfaw9c',
    title: 'Tungi Suhbat — O‘zbekcha Akustik Gitaralar',
    channel: 'Toshkent Akustika',
    category: 'O‘zbekcha',
    duration: '42:15',
  },
  {
    id: '36YnV9STBqc',
    title: 'Good Vibes Chill Pop & Electronic Radio',
    channel: 'The Good Life Radio',
    category: 'Musiqa',
    duration: 'Jonli',
  },
  {
    id: 'n61ULEU7CO0',
    title: 'Gaming Arena — Epic Esport & Ludo Beats',
    channel: 'Turon Gaming',
    category: 'Gaming',
    duration: '54:30',
  },
];

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalized = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const parts = url.pathname.split('/').filter(Boolean);
      if (
        parts.length >= 2 &&
        ['embed', 'shorts', 'live', 'v'].includes(parts[0]) &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[1])
      ) {
        return parts[1];
      }
    }
  } catch {
    const match = trimmed.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

export function buildYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}

const VideoThumb: React.FC<{ videoId: string; title: string }> = ({ videoId, title }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-28 h-16 rounded-xl bg-gradient-to-br from-red-600/30 via-purple-700/30 to-slate-900 border border-white/10 flex items-center justify-center shrink-0">
        <Play className="w-6 h-6 text-white/90 fill-white/80" />
      </div>
    );
  }

  return (
    <div className="relative w-28 h-16 rounded-xl overflow-hidden bg-slate-900 border border-white/10 shrink-0">
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt={title}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full bg-red-600/90 flex items-center justify-center text-white shadow">
          <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
        </div>
      </div>
    </div>
  );
};

export const YouTubePickerModal: React.FC<YouTubePickerModalProps> = ({
  isOpen,
  onClose,
  onSelectVideo,
}) => {
  const [tab, setTab] = useState<'search' | 'link'>('search');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'Hammasi' | 'Musiqa' | 'Gaming' | 'O‘zbekcha'>('Hammasi');
  const [linkInput, setLinkInput] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [linkError, setLinkError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const detectedSearchId = useMemo(() => extractYouTubeId(query), [query]);

  const filteredVideos = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CURATED_VIDEOS.filter((v) => {
      const catMatch = category === 'Hammasi' || v.category === category;
      const qMatch =
        !q ||
        v.title.toLowerCase().includes(q) ||
        v.channel.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q);
      return catMatch && qMatch;
    });
  }, [query, category]);

  if (!isOpen) return null;

  async function handleChoose(videoId: string, title: string) {
    setSubmitting(true);
    setLinkError('');
    try {
      await onSelectVideo(buildYouTubeEmbedUrl(videoId), title);
      onClose();
    } catch (err: any) {
      setLinkError(err?.message || 'Videoni qo‘shishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitLink(e: React.FormEvent) {
    e.preventDefault();
    setLinkError('');
    const id = extractYouTubeId(linkInput);
    if (!id) {
      setLinkError('Iltimos, to‘g‘ri YouTube havolasini kiriting (masalan: https://youtu.be/...)');
      return;
    }
    const finalTitle = customTitle.trim() || `YouTube Video (${id})`;
    await handleChoose(id, finalTitle);
    setLinkInput('');
    setCustomTitle('');
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-lg bg-[#0D1322] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl">
        {/* Top Header matching video: < Back | Youtube qidiruvi | Yellow Havola... button */}
        <div className="px-4 py-3.5 border-b border-white/[0.08] bg-[#121A2F] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (tab === 'link') setTab('search');
                else onClose();
              }}
              className="min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center rounded-xl text-slate-200 hover:bg-white/[0.06]"
              aria-label="Orqaga"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <Youtube className="w-5 h-5 text-red-500 shrink-0" />
              <h3 className="font-display text-base font-bold text-white truncate">
                {tab === 'link' ? 'Havola orqali qo‘shish' : 'Youtube qidiruvi'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setLinkError('');
                setTab(tab === 'search' ? 'link' : 'search');
              }}
              className={`min-h-[38px] px-3.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                tab === 'link'
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-[#F5B731] hover:bg-[#ffc648] text-[#080B14] shadow-md shadow-amber-500/20'
              }`}
            >
              {tab === 'link' ? (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Qidiruv</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Havola...</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
              aria-label="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {tab === 'search' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Video nomi yoki YouTube havolasini yozing..."
                className="w-full min-h-[44px] pl-10 pr-4 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['Hammasi', 'Musiqa', 'O‘zbekcha', 'Gaming'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`min-h-[36px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    category === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#080B14] border border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick Link Detection Card if user pastes URL into search bar */}
            {detectedSearchId && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleChoose(detectedSearchId, `YouTube Video (${detectedSearchId})`)}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-[#E5B84B]/20 to-purple-600/20 border border-[#E5B84B]/50 flex items-center gap-3 text-left hover:border-[#E5B84B]"
              >
                <VideoThumb videoId={detectedSearchId} title="Havoladagi video" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">
                    Havoladagi videoni qo‘shish
                  </div>
                  <div className="text-xs text-[#E5B84B] font-mono mt-0.5 truncate">
                    ID: {detectedSearchId}
                  </div>
                </div>
                <Play className="w-5 h-5 text-[#E5B84B] shrink-0" />
              </button>
            )}

            {/* Video List */}
            <div className="space-y-2.5">
              {filteredVideos.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#080B14] border border-white/[0.06] text-center space-y-3">
                  <Music className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-sm text-slate-400">
                    Qidiruv bo‘yicha video topilmadi. Istalgan YouTube havolasini qo‘shish uchun{' '}
                    <button
                      type="button"
                      onClick={() => setTab('link')}
                      className="text-[#F5B731] font-semibold underline"
                    >
                      Havola...
                    </button>{' '}
                    bo‘limidan foydalaning.
                  </p>
                </div>
              ) : (
                filteredVideos.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleChoose(v.id, v.title)}
                    className="w-full p-2.5 rounded-2xl bg-[#080B14]/90 border border-white/[0.07] hover:border-purple-500/50 hover:bg-[#141C33] flex items-center gap-3 text-left transition-colors"
                  >
                    <VideoThumb videoId={v.id} title={v.title} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                        {v.title}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                        <span className="truncate">{v.channel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[11px] text-slate-300 shrink-0">
                          {v.duration}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitLink} className="flex-1 overflow-y-auto p-5 space-y-5">
            {linkError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200">
                {linkError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">YouTube video havolasi</label>
                <input
                  type="text"
                  required
                  value={linkInput}
                  onChange={(e) => {
                    setLinkInput(e.target.value);
                    setLinkError('');
                  }}
                  placeholder="https://www.youtube.com/watch?v=... yoki youtu.be/..."
                  className="w-full min-h-[46px] px-3.5 bg-[#080B14] border border-white/15 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5B731]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Video nomi (ixtiyoriy)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Masalan: Sevimli qo‘shiq yoki jonli efir"
                  className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#F5B731] to-amber-500 hover:brightness-105 text-[#080B14] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Tv className="w-4 h-4" />
                <span>{submitting ? 'Yuklanmoqda...' : 'Video qo‘shish'}</span>
              </button>
            </div>

            {/* 3-Step Visual Guide from Reference Video */}
            <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.08] space-y-3.5">
              <div className="text-xs font-semibold text-slate-300">
                YouTube havolasini qanday olish mumkin?
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <Youtube className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-300 leading-relaxed pt-1">
                  <span className="font-semibold text-white">1. Youtubeni oching</span> va xonada
                  qo‘ymoqchi bo‘lgan video yoki musiqani toping.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-300 leading-relaxed pt-1">
                  <span className="font-semibold text-white">
                    2. Ulashish-nusxa olish havolasini bosing
                  </span>{' '}
                  (Share → Copy link).
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Copy className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-300 leading-relaxed pt-1">
                  <span className="font-semibold text-white">
                    3. Havolani havola maydoniga qo‘shing
                  </span>{' '}
                  va «Video qo‘shish» tugmasini bosing.
                </div>
              </div>

              {extractYouTubeId(linkInput) && (
                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>YouTube havolasi aniqlandi va tayyor!</span>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
