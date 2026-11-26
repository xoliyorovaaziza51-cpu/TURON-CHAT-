import React, { useEffect, useState } from 'react';
import { Award, Building2, Gift, Radio, Trophy } from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import type { LeaderboardEntry } from '../types/turon';

interface LeaderboardViewProps {
  onJoinRoomById: (roomId: string) => void;
  onOpenUserById: (userId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  onJoinRoomById,
  onOpenUserById,
}) => {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [category, setCategory] = useState<'users' | 'rooms' | 'gifts' | 'agencies'>('users');
  const [data, setData] = useState<{
    popularUsers: LeaderboardEntry[];
    popularRooms: LeaderboardEntry[];
    giftSenders: LeaderboardEntry[];
    topAgencies: LeaderboardEntry[];
  }>({
    popularUsers: [],
    popularRooms: [],
    giftSenders: [],
    topAgencies: [],
  });

  useEffect(() => {
    apiFetch<typeof data>(`/api/leaderboards?period=${period}`)
      .then((res) => setData(res))
      .catch(() => {});
  }, [period]);

  const list =
    category === 'users'
      ? data.popularUsers
      : category === 'rooms'
      ? data.popularRooms
      : category === 'gifts'
      ? data.giftSenders
      : data.topAgencies;

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Reytinglar jadvali</h2>
          <p className="text-xs text-slate-400 mt-1">
            Eng faol foydalanuvchilar, mashhur xonalar, sovg‘a yetakchilari va agentliklar
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0F1524] border border-white/[0.08] rounded-xl self-start">
          <button
            type="button"
            onClick={() => setPeriod('weekly')}
            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium ${
              period === 'weekly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Haftalik
          </button>
          <button
            type="button"
            onClick={() => setPeriod('monthly')}
            className={`min-h-[38px] px-3.5 rounded-lg text-xs font-medium ${
              period === 'monthly' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Oylik
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { id: 'users', label: 'Mashhur a’zolar', icon: Trophy },
          { id: 'rooms', label: 'Mashhur xonalar', icon: Radio },
          { id: 'gifts', label: 'Sovg‘a reytingi', icon: Gift },
          { id: 'agencies', label: 'Agentliklar', icon: Building2 },
        ].map((item) => {
          const Icon = item.icon;
          const active = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.id as any)}
              className={`min-h-[44px] px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                active
                  ? 'bg-blue-600/20 border-blue-500 text-white'
                  : 'bg-[#0F1524] border-white/[0.07] text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 text-[#E5B84B]" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
        {list.map((entry, idx) => {
          const rank = idx + 1;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                if (category === 'rooms') onJoinRoomById(entry.id);
                else if (category === 'users' || category === 'gifts') onOpenUserById(entry.id);
              }}
              className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono tabular-nums text-sm font-bold shrink-0 ${
                    rank === 1
                      ? 'bg-[#E5B84B]/20 text-[#E5B84B]'
                      : rank === 2
                      ? 'bg-slate-300/15 text-slate-200'
                      : rank === 3
                      ? 'bg-amber-700/20 text-amber-400'
                      : 'bg-white/[0.04] text-slate-400'
                  }`}
                >
                  {rank}
                </div>
                <AvatarWithFrame
                  src={entry.avatarUrl}
                  alt={entry.title}
                  size="sm"
                  frameStyle={entry.frameStyle}
                  vipLevel={entry.vipLevel}
                  svipLevel={entry.svipLevel}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{entry.title}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{entry.subtitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono tabular-nums text-sm font-semibold text-[#E5B84B] shrink-0">
                <Award className="w-4 h-4" />
                <span>{formatCoins(entry.score)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
