import React, { useEffect, useState } from 'react';
import {
  Award,
  Gamepad2,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { apiFetch, formatCoins, formatUzDate } from '../lib/api';
import { GAMES_CATALOG } from './gamesCatalog';
import { GamePlayArena } from './GamePlayArena';
import { GameThumbnail } from './GameArtwork';
import type { GameDefinition, UserProfile } from '../types/turon';

interface GamesHubViewProps {
  currentUser: UserProfile;
  initialGameId?: string | null;
  onUserUpdated: (u: UserProfile) => void;
  onShareResultInRoom?: (text: string) => void;
}

export const GamesHubView: React.FC<GamesHubViewProps> = ({
  currentUser,
  initialGameId = null,
  onUserUpdated,
  onShareResultInRoom,
}) => {
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(() =>
    initialGameId ? GAMES_CATALOG.find((g) => g.id === initialGameId) || null : null
  );
  const [filter, setFilter] = useState<'all' | 'oddiy' | 'omadli'>('all');
  const [searchQ, setSearchQ] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [refillMsg, setRefillMsg] = useState('');

  async function loadStats() {
    try {
      const res = await apiFetch<{ gamePoints: number; history: any[]; leaders: any[] }>(
        '/api/games/stats'
      );
      setHistory(res.history || []);
      setLeaders(res.leaders || []);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadStats();
  }, [selectedGame?.id]);

  async function handleRefill() {
    setRefillMsg('');
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/games/refill', {
        method: 'POST',
      });
      onUserUpdated(res.user);
      setRefillMsg('+1,500 bepul o‘yin balli qo‘shildi!');
    } catch (err: any) {
      setRefillMsg(err.message);
    }
  }

  if (selectedGame) {
    return (
      <GamePlayArena
        game={selectedGame}
        currentUser={currentUser}
        onBack={() => {
          setSelectedGame(null);
          loadStats();
        }}
        onUserUpdated={onUserUpdated}
        onShareResultInRoom={onShareResultInRoom}
      />
    );
  }

  const q = searchQ.trim().toLowerCase();
  const oddiyGames = GAMES_CATALOG.filter(
    (g) => g.category === 'oddiy' && (!q || g.title.toLowerCase().includes(q))
  );
  const omadliGames = GAMES_CATALOG.filter(
    (g) => g.category === 'omadli' && (!q || g.title.toLowerCase().includes(q))
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      {/* Header & Free Points */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0F1524] via-[#131C33] to-[#1A1330] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Bepul ko‘ngilochar o‘yinlar · Qimor va pul tikishsiz</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white mt-1">Xona o‘yini</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Oddiy stol o‘yinlari va omadli ko‘ngilochar mini-o‘yinlar bilan vaqtni maroqli o‘tkazing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-4 py-2.5 rounded-xl bg-[#080B14] border border-[#E5B84B]/30 flex items-center gap-2">
            <Award className="w-4 h-4 text-[#E5B84B]" />
            <span className="font-mono tabular-nums text-base font-bold text-[#E5B84B]">
              {formatCoins(currentUser.gamePoints)}
            </span>
            <span className="text-xs text-slate-400">ball</span>
          </div>
          {currentUser.gamePoints < 1000 && (
            <button
              type="button"
              onClick={handleRefill}
              className="min-h-[42px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Bepul to‘ldirish (+1,500)
            </button>
          )}
        </div>
      </div>

      {refillMsg && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-blue-200">
          {refillMsg}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="O‘yin nomini qidirish..."
            className="w-full min-h-[44px] pl-10 pr-4 bg-[#0F1524] border border-white/[0.08] rounded-xl text-sm text-white"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0F1524] border border-white/[0.08] rounded-xl self-start">
          {[
            { id: 'all', label: 'Barchasi (20)' },
            { id: 'oddiy', label: "Oddiy o'yinlar (6)" },
            { id: 'omadli', label: "Omadli o'yinlar (14)" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id as any)}
              className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                filter === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1: ODDIY O'YINLAR (3-column illustrated banner cards) */}
      {(filter === 'all' || filter === 'oddiy') && oddiyGames.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-blue-400" />
              <span>Oddiy o‘yinlar</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {oddiyGames.length} ta o‘yin
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {oddiyGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => setSelectedGame(game)}
                className="p-2 rounded-2xl bg-[#0F1524] border border-white/[0.08] hover:border-blue-400/50 text-center flex flex-col items-center gap-2 transition-transform hover:-translate-y-0.5 group"
              >
                <GameThumbnail
                  gameId={game.id}
                  title={game.title}
                  variant="wide"
                  className="border border-white/10 shadow-md"
                />
                <span className="font-display text-sm font-semibold text-white truncate w-full px-1 pb-0.5">
                  {game.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: OMADLI O'YINLAR (4-column vibrant square game icons) */}
      {(filter === 'all' || filter === 'omadli') && omadliGames.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#E5B84B]" />
              <span>Omadli O‘yin</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {omadliGames.length} ta o‘yin
            </span>
          </div>

          <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
            {omadliGames.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => setSelectedGame(game)}
                className="flex flex-col items-center gap-1.5 text-center group focus:outline-none"
              >
                <div className="w-full p-1 rounded-2xl bg-[#0F1524] border border-white/[0.08] group-hover:border-[#E5B84B]/60 shadow-md transition-transform group-hover:-translate-y-0.5">
                  <GameThumbnail
                    gameId={game.id}
                    title={game.title}
                    variant="square"
                    className="w-full"
                  />
                </div>
                <span className="text-xs font-medium text-slate-200 group-hover:text-[#E5B84B] leading-tight line-clamp-2 w-full">
                  {game.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent Results & Points Leaders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
        <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] space-y-3">
          <h4 className="font-display text-base font-semibold text-white">Oxirgi o‘yin natijalari</h4>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400">Hali o‘yin o‘ynalmagan. Yuqoridan o‘yin tanlang.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {history.slice(0, 6).map((h) => (
                <div key={h.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-white">{h.game_title}</div>
                    <div className="text-slate-400">
                      {h.outcome} · {formatUzDate(h.created_at)}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-emerald-400">
                    +{h.delta_points} ball
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] space-y-3">
          <h4 className="font-display text-base font-semibold text-white">O‘yin ballari reytingi</h4>
          <div className="divide-y divide-white/[0.06]">
            {leaders.slice(0, 6).map((l, idx) => (
              <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-slate-400 w-5">{idx + 1}.</span>
                  <span className="font-medium text-white">{l.nickname}</span>
                  <span className="font-mono text-slate-500">{l.public_id}</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-[#E5B84B]">
                  {formatCoins(l.game_points)} ball
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
