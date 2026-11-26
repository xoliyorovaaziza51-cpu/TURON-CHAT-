import React, { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Coins,
  Gift,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins, formatUzTime } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import type { RoomAnalyticsData } from '../types/turon';

interface RoomAnalyticsModalProps {
  roomId: string;
  roomTitle: string;
  analyticsTick: number;
  onClose: () => void;
}

export const RoomAnalyticsModal: React.FC<RoomAnalyticsModalProps> = ({
  roomId,
  roomTitle,
  analyticsTick,
  onClose,
}) => {
  const [data, setData] = useState<RoomAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch<RoomAnalyticsData>(`/api/rooms/${roomId}/analytics`);
      setData(res);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Analitika yuklanmadi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [roomId, analyticsTick]);

  const buckets = data?.buckets || [];
  const maxEntries = Math.max(1, ...buckets.map((b) => b.entries));
  const maxGifts = Math.max(1, ...buckets.map((b) => b.giftsCount));

  // SVG chart dimensions
  const svgW = 600;
  const svgH = 210;
  const padL = 34;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const slotW = buckets.length > 0 ? chartW / buckets.length : chartW;

  const giftLinePoints = buckets
    .map((b, i) => {
      const x = padL + i * slotW + slotW / 2;
      const y = padT + chartH - (b.giftsCount / maxGifts) * chartH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const hoveredBucket = hoveredIdx !== null ? buckets[hoveredIdx] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-backdrop-fade-in">
      <div className="w-full max-w-3xl bg-[#0B101D] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden animate-sheet-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#0F1524]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                Xona Analitikasi
              </h3>
              <p className="text-xs text-slate-400 truncate">{roomTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={fetchAnalytics}
              className="min-h-[40px] px-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Yangilash</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5"
              aria-label="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0F1524] border border-white/[0.08]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Hozir xonada</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-xl font-bold text-white">
                {loading ? '—' : data?.viewerCount ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0F1524] border border-white/[0.08]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Jami kirishlar</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-xl font-bold text-white">
                {loading ? '—' : data?.totalEntries ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0F1524] border border-white/[0.08]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Sovg‘alar soni</span>
                <Gift className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-xl font-bold text-white">
                {loading ? '—' : data?.totalGiftsCount ?? 0}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0F1524] border border-white/[0.08]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Sovg‘a hajmi</span>
                <Coins className="w-4 h-4 text-[#E5B84B]" />
              </div>
              <div className="mt-2 font-mono tabular-nums text-xl font-bold text-[#E5B84B] truncate">
                {loading ? '—' : formatCoins(data?.totalGiftCoins ?? 0)}
              </div>
            </div>
          </div>

          {/* Live Traffic Chart */}
          <div className="p-4 rounded-xl bg-[#0F1524] border border-white/[0.08] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-display text-sm font-semibold text-white">
                  So‘nggi 12 soatlik jonli trafik grafigi
                </h4>
                <p className="text-xs text-slate-400">
                  Kiruvchi foydalanuvchilar va yuborilgan sovg‘alar miqdori
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                  Kirishlar
                </span>
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#E5B84B] inline-block" />
                  Sovg‘alar
                </span>
              </div>
            </div>

            {hoveredBucket && (
              <div className="px-3 py-1.5 rounded-lg bg-[#080B14] border border-white/10 text-xs flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums">
                <span className="text-slate-300">Vaqt: {hoveredBucket.label}</span>
                <span className="text-blue-400">Kirishlar: {hoveredBucket.entries}</span>
                <span className="text-[#E5B84B]">
                  Sovg‘alar: {hoveredBucket.giftsCount} ({formatCoins(hoveredBucket.giftCoins)} Tanga)
                </span>
              </div>
            )}

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full h-52 min-w-[440px] select-none"
                role="img"
                aria-label="Xona trafigi grafigi"
              >
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = padT + chartH * (1 - ratio);
                  const val = Math.round(maxEntries * ratio);
                  return (
                    <g key={ratio}>
                      <line
                        x1={padL}
                        x2={svgW - padR}
                        y1={y}
                        y2={y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padL - 6}
                        y={y + 4}
                        textAnchor="end"
                        fill="#64748B"
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Bars for entries */}
                {buckets.map((b, i) => {
                  const barW = Math.max(12, slotW * 0.46);
                  const barX = padL + i * slotW + (slotW - barW) / 2;
                  const barH = (b.entries / maxEntries) * chartH;
                  const barY = padT + chartH - barH;
                  const isHovered = hoveredIdx === i;

                  return (
                    <g
                      key={b.label}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      className="cursor-pointer"
                    >
                      <rect
                        x={padL + i * slotW}
                        y={padT}
                        width={slotW}
                        height={chartH}
                        fill={isHovered ? 'rgba(255,255,255,0.03)' : 'transparent'}
                      />
                      <rect
                        x={barX}
                        y={barY}
                        width={barW}
                        height={Math.max(2, barH)}
                        rx={4}
                        fill={isHovered ? '#60A5FA' : '#3B82F6'}
                        opacity={0.85}
                      />
                      <text
                        x={padL + i * slotW + slotW / 2}
                        y={svgH - 8}
                        textAnchor="middle"
                        fill={isHovered ? '#F8FAFC' : '#64748B'}
                        fontSize="10"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {b.label.slice(0, 2)}
                      </text>
                    </g>
                  );
                })}

                {/* Gift Count Line + Nodes */}
                {buckets.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#E5B84B"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={giftLinePoints}
                  />
                )}
                {buckets.map((b, i) => {
                  const cx = padL + i * slotW + slotW / 2;
                  const cy = padT + chartH - (b.giftsCount / maxGifts) * chartH;
                  return (
                    <circle
                      key={`pt-${b.label}`}
                      cx={cx}
                      cy={cy}
                      r={hoveredIdx === i ? 5 : 3.5}
                      fill="#E5B84B"
                      stroke="#0F1524"
                      strokeWidth="1.5"
                      className="pointer-events-none"
                    />
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Two-Column Breakdown: Top Gifters & Recent Events */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Gifters */}
            <div className="p-4 rounded-xl bg-[#0F1524] border border-white/[0.08] space-y-3">
              <h4 className="font-display text-sm font-semibold text-white">
                Eng saxiy sovg‘achilar
              </h4>
              {!data || data.topGifters.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Hozircha bu xonada sovg‘a yuborilmagan.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {data.topGifters.map((g, idx) => (
                    <div key={g.userId} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-xs font-mono tabular-nums text-slate-400">
                          #{idx + 1}
                        </span>
                        <AvatarWithFrame src={g.avatarUrl} alt={g.nickname} size="xs" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-white truncate">{g.nickname}</div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {g.giftsCount} ta sovg‘a
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-mono tabular-nums font-semibold text-[#E5B84B] shrink-0">
                        {formatCoins(g.totalCoins)} Tanga
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Traffic Activity */}
            <div className="p-4 rounded-xl bg-[#0F1524] border border-white/[0.08] space-y-3">
              <h4 className="font-display text-sm font-semibold text-white">
                So‘nggi jonli harakatlar
              </h4>
              {!data || data.recentEvents.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Foydalanuvchilar kirishi va sovg‘alar shu yerda ko‘rinadi.
                </p>
              ) : (
                <div className="divide-y divide-white/[0.06] max-h-56 overflow-y-auto">
                  {data.recentEvents.map((ev) => (
                    <div key={ev.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-medium text-white">{ev.nickname}</span>{' '}
                        <span className="text-slate-400">
                          {ev.eventType === 'enter'
                            ? 'xonaga kirdi'
                            : `${formatCoins(ev.coinsAmount)} Tanga sovg‘a yubordi`}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono tabular-nums shrink-0">
                        {formatUzTime(ev.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
