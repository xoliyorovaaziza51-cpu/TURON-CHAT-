import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  Swords,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import type { Agency, AgencyMember, PkBattle, UserProfile, VoiceRoom } from '../types/turon';

interface PkAgencyViewProps {
  currentUser: UserProfile;
  rooms: VoiceRoom[];
  initialSubTab?: 'pk' | 'agency';
  onJoinRoomById: (roomId: string) => void;
}

export const PkAgencyView: React.FC<PkAgencyViewProps> = ({
  currentUser,
  rooms,
  initialSubTab = 'pk',
  onJoinRoomById,
}) => {
  const [subTab, setSubTab] = useState<'pk' | 'agency'>(initialSubTab);
  const [battles, setBattles] = useState<PkBattle[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const [members, setMembers] = useState<AgencyMember[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());

  // Create PK modal
  const [showCreatePk, setShowCreatePk] = useState(false);
  const [pkTitle, setPkTitle] = useState('');
  const [roomAId, setRoomAId] = useState(rooms[0]?.id || '');
  const [roomBId, setRoomBId] = useState(rooms[1]?.id || '');
  const [durationMin, setDurationMin] = useState(15);

  // Create Agency modal
  const [showCreateAgency, setShowCreateAgency] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [agencyDesc, setAgencyDesc] = useState('');

  // Add Agent input
  const [newAgentTcId, setNewAgentTcId] = useState('');
  const [newAgentRole, setNewAgentRole] = useState<'agent' | 'host'>('agent');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const canCreatePk = ['founder', 'super_admin', 'admin', 'pk_admin'].includes(currentUser.role);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    try {
      const [pkRes, agRes] = await Promise.all([
        apiFetch<{ battles: PkBattle[] }>('/api/pk'),
        apiFetch<{ agencies: Agency[] }>('/api/agencies'),
      ]);
      setBattles(pkRes.battles);
      setAgencies(agRes.agencies);
      if (agRes.agencies.length > 0 && !selectedAgency) {
        const mine =
          agRes.agencies.find((a) => a.id === currentUser.agencyId) || agRes.agencies[0];
        setSelectedAgency(mine);
        loadMembers(mine.id);
      }
    } catch {
      // ignore
    }
  }

  async function loadMembers(agencyId: string) {
    try {
      const res = await apiFetch<{ members: AgencyMember[] }>(
        `/api/agencies/${agencyId}/members`
      );
      setMembers(res.members);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function formatCountdown(endsAt: string): string {
    const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - nowMs) / 1000));
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async function handleCreatePk(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/pk', {
        method: 'POST',
        body: JSON.stringify({
          title: pkTitle,
          roomAId,
          roomBId,
          durationMinutes: durationMin,
        }),
      });
      setShowCreatePk(false);
      setPkTitle('');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleCreateAgency(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/agencies', {
        method: 'POST',
        body: JSON.stringify({ name: agencyName, description: agencyDesc }),
      });
      setShowCreateAgency(false);
      setAgencyName('');
      setAgencyDesc('');
      setMsg('Agentlik muvaffaqiyatli yaratildi.');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAgency) return;
    setError('');
    setMsg('');
    try {
      await apiFetch(`/api/agencies/${selectedAgency.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ publicId: newAgentTcId, memberRole: newAgentRole }),
      });
      setNewAgentTcId('');
      setMsg('Yangi a’zo agentlikka qo‘shildi.');
      loadMembers(selectedAgency.id);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const canManageSelectedAgency =
    selectedAgency &&
    (selectedAgency.headUserId === currentUser.id ||
      ['founder', 'super_admin', 'admin'].includes(currentUser.role));

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">
            {subTab === 'pk' ? 'Do‘stona PK Musobaqalar' : 'Agentliklar Tizimi'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {subTab === 'pk'
              ? 'Xonalar o‘rtasida do‘stona sovg‘a bellashuvlari — qimor va pul garovlarisiz'
              : 'Boshlovchilar va agentlar jamoalari, faoliyat statistikasi va hisobotlar'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#0F1524] border border-white/[0.08] rounded-xl">
            <button
              type="button"
              onClick={() => setSubTab('pk')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                subTab === 'pk' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              PK Arena
            </button>
            <button
              type="button"
              onClick={() => setSubTab('agency')}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                subTab === 'agency' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Agentliklar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}
      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">
          {msg}
        </div>
      )}

      {subTab === 'pk' ? (
        <div className="space-y-4">
          {canCreatePk && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowCreatePk(true)}
                className="min-h-[44px] px-4 rounded-xl bg-[#E5B84B] text-[#080B14] font-semibold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi PK boshlash</span>
              </button>
            </div>
          )}

          {battles.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#0F1524] border border-white/[0.07] text-center text-sm text-slate-400">
              Hozircha PK bellashuvlari mavjud emas.
            </div>
          ) : (
            <div className="space-y-4">
              {battles.map((pk) => {
                const total = Math.max(1, pk.scoreA + pk.scoreB);
                const pctA = Math.round((pk.scoreA / total) * 100);
                const isActive = pk.status === 'active';
                return (
                  <div
                    key={pk.id}
                    className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Swords className="w-4 h-4 text-[#E5B84B]" />
                        <h3 className="font-display text-base font-semibold text-white">
                          {pk.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                          {isActive ? formatCountdown(pk.endsAt) : 'Yakunlangan'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl bg-[#080B14] border border-blue-500/25 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-blue-400">A Jamoa</div>
                          <div className="text-sm font-semibold text-white truncate">
                            {pk.roomATitle}
                          </div>
                          <div className="text-xs text-slate-400">{pk.roomAOwnerNickname}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums text-lg font-bold text-blue-400">
                            {formatCoins(pk.scoreA)}
                          </div>
                          <button
                            type="button"
                            onClick={() => onJoinRoomById(pk.roomAId)}
                            className="text-xs text-blue-300 underline mt-1"
                          >
                            Xonaga kirish
                          </button>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-[#080B14] border border-purple-500/25 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-purple-400">B Jamoa</div>
                          <div className="text-sm font-semibold text-white truncate">
                            {pk.roomBTitle}
                          </div>
                          <div className="text-xs text-slate-400">{pk.roomBOwnerNickname}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono tabular-nums text-lg font-bold text-purple-300">
                            {formatCoins(pk.scoreB)}
                          </div>
                          <button
                            type="button"
                            onClick={() => onJoinRoomById(pk.roomBId)}
                            className="text-xs text-purple-300 underline mt-1"
                          >
                            Xonaga kirish
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="h-3 w-full rounded-full bg-purple-900/60 overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
                        style={{ width: `${pctA}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Agencies List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white">Ro‘yxatdagi agentliklar</h3>
              <button
                type="button"
                onClick={() => setShowCreateAgency(true)}
                className="min-h-[40px] px-3.5 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agentlik ochish</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {agencies.map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => {
                    setSelectedAgency(ag);
                    loadMembers(ag.id);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left transition-colors ${
                    selectedAgency?.id === ag.id
                      ? 'bg-blue-600/15 border-blue-500'
                      : 'bg-[#0F1524] border-white/[0.07] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-[#E5B84B] shrink-0" />
                      <span className="font-display font-semibold text-white truncate">
                        {ag.name}
                      </span>
                    </div>
                    {ag.isVerified && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ag.description}</p>
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-300">
                    <span>Rahbar: {ag.headNickname}</span>
                    <span className="font-mono tabular-nums text-[#E5B84B]">
                      {formatCoins(ag.totalVolume)} Tanga
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Agency Head Dashboard */}
          <div className="lg:col-span-7">
            {selectedAgency ? (
              <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[#E5B84B]">Agentlik boshqaruv paneli</div>
                    <h3 className="font-display text-xl font-bold text-white mt-0.5">
                      {selectedAgency.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">{selectedAgency.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Oylik aylanma</div>
                    <div className="font-mono tabular-nums text-xl font-bold text-[#E5B84B]">
                      {formatCoins(selectedAgency.totalVolume)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#080B14] border border-white/[0.06]">
                    <div className="text-xs text-slate-400">Jami a’zolar</div>
                    <div className="font-mono tabular-nums text-lg font-bold text-white mt-1">
                      {members.length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#080B14] border border-white/[0.06]">
                    <div className="text-xs text-slate-400">Onlayn</div>
                    <div className="font-mono tabular-nums text-lg font-bold text-emerald-400 mt-1">
                      {members.filter((m) => m.onlineStatus !== 'offline').length}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#080B14] border border-white/[0.06]">
                    <div className="text-xs text-slate-400">Holat</div>
                    <div className="text-sm font-semibold text-blue-400 mt-1.5">
                      {selectedAgency.isVerified ? 'Tasdiqlangan' : 'Faol'}
                    </div>
                  </div>
                </div>

                {canManageSelectedAgency && (
                  <form
                    onSubmit={handleAddMember}
                    className="p-4 rounded-xl bg-[#080B14] border border-white/[0.07] space-y-3"
                  >
                    <div className="text-xs font-medium text-white">
                      Yangi agent yoki boshlovchi qo‘shish
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        required
                        value={newAgentTcId}
                        onChange={(e) => setNewAgentTcId(e.target.value)}
                        placeholder="Foydalanuvchi ID (masalan: TC-10005)"
                        className="flex-1 min-h-[42px] px-3 bg-[#0F1524] border border-white/10 rounded-xl text-xs text-white font-mono"
                      />
                      <select
                        value={newAgentRole}
                        onChange={(e) => setNewAgentRole(e.target.value as any)}
                        className="min-h-[42px] px-3 bg-[#0F1524] border border-white/10 rounded-xl text-xs text-white"
                      >
                        <option value="agent">Agent</option>
                        <option value="host">Boshlovchi</option>
                      </select>
                      <button
                        type="submit"
                        className="min-h-[42px] px-4 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Qo‘shish</span>
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Agentlar va a’zolar hisoboti</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="divide-y divide-white/[0.06] bg-[#080B14] rounded-xl border border-white/[0.06]">
                    {members.map((m) => (
                      <div key={m.userId} className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AvatarWithFrame src={m.avatarUrl} alt={m.nickname} size="sm" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {m.nickname}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {m.publicId} ·{' '}
                              {m.memberRole === 'head'
                                ? 'Rahbar'
                                : m.memberRole === 'agent'
                                ? 'Agent'
                                : 'Boshlovchi'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono tabular-nums text-xs text-[#E5B84B] shrink-0">
                          {formatCoins(m.monthlyScore)} ball
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Create PK Modal */}
      {showCreatePk && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1524] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">Yangi PK musobaqa</h4>
              <button type="button" onClick={() => setShowCreatePk(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePk} className="space-y-3">
              <input
                type="text"
                required
                value={pkTitle}
                onChange={(e) => setPkTitle(e.target.value)}
                placeholder="Musobaqa nomi"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
              <select
                value={roomAId}
                onChange={(e) => setRoomAId(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    A: {r.title}
                  </option>
                ))}
              </select>
              <select
                value={roomBId}
                onChange={(e) => setRoomBId(e.target.value)}
                className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    B: {r.title}
                  </option>
                ))}
              </select>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full min-h-[44px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              >
                <option value={5}>5 daqiqa</option>
                <option value={15}>15 daqiqa</option>
                <option value={30}>30 daqiqa</option>
              </select>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-[#E5B84B] text-[#080B14] font-semibold text-sm"
              >
                Musobaqani boshlash
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Create Agency Modal */}
      {showCreateAgency && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1524] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">Yangi agentlik ochish</h4>
              <button
                type="button"
                onClick={() => setShowCreateAgency(false)}
                className="text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAgency} className="space-y-3">
              <input
                type="text"
                required
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder="Agentlik nomi"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
              <textarea
                rows={3}
                value={agencyDesc}
                onChange={(e) => setAgencyDesc(e.target.value)}
                placeholder="Agentlik faoliyati haqida..."
                className="w-full p-3 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-blue-600 text-white font-semibold text-sm"
              >
                Yaratish
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
