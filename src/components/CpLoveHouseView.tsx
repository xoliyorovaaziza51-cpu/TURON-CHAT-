import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Crown,
  Flame,
  Heart,
  Home,
  Lock,
  Mic,
  Search,
  Shield,
  Sparkles,
  Star,
  Store,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins, formatUzDate } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import type {
  CpLevelRule,
  CpRelationship,
  LoveStoreItem,
  UserProfile,
} from '../types/turon';

interface CpLoveHouseViewProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  cpSyncTick?: number;
  initialSubTab?: 'house' | 'store' | 'levels' | 'rules';
  onUserUpdated: (u: UserProfile) => void;
  onJoinRoomById: (roomId: string) => void;
}

const THEME_STYLES: Record<string, { name: string; gradient: string; accent: string }> = {
  'marry-cover': {
    name: 'Marry Cover · Oltin Nikoh',
    gradient: 'from-[#3B0A2A] via-[#5B1349] to-[#23071D]',
    accent: 'border-[#E5B84B]/70 shadow-[0_0_35px_rgba(229,184,75,0.28)]',
  },
  'starlight-royal': {
    name: 'Qirollik Yulduz Tunlari',
    gradient: 'from-[#0A1642] via-[#2A1058] to-[#080E2B]',
    accent: 'border-purple-400/50 shadow-[0_0_30px_rgba(168,85,247,0.28)]',
  },
  'starlight-1': {
    name: 'Yulduzcha Muqova',
    gradient: 'from-[#0D1433] via-[#1B1247] to-[#090D24]',
    accent: 'border-sky-400/45 shadow-[0_0_25px_rgba(56,189,248,0.22)]',
  },
};

function getThemeStyle(themeKey: string) {
  if (THEME_STYLES[themeKey]) return THEME_STYLES[themeKey];
  if (themeKey.startsWith('starlight-')) {
    const lvlNum = Number(themeKey.replace('starlight-', '')) || 1;
    if (lvlNum >= 9) {
      return {
        name: `Yulduzcha Muqova LV${lvlNum}`,
        gradient: 'from-[#240B47] via-[#4C1D95] to-[#130829]',
        accent: 'border-[#E5B84B]/60 shadow-[0_0_30px_rgba(229,184,75,0.25)]',
      };
    }
    if (lvlNum >= 5) {
      return {
        name: `Yulduzcha Muqova LV${lvlNum}`,
        gradient: 'from-[#0D1D4D] via-[#2D146B] to-[#0B1230]',
        accent: 'border-purple-400/50 shadow-[0_0_25px_rgba(147,51,234,0.25)]',
      };
    }
    return {
      name: `Yulduzcha Muqova LV${lvlNum}`,
      gradient: 'from-[#0D1433] via-[#1B1247] to-[#090D24]',
      accent: 'border-sky-400/45 shadow-[0_0_25px_rgba(56,189,248,0.22)]',
    };
  }
  return THEME_STYLES['starlight-1'];
}

export const CpLoveHouseView: React.FC<CpLoveHouseViewProps> = ({
  currentUser,
  allUsers,
  cpSyncTick = 0,
  initialSubTab = 'house',
  onUserUpdated,
  onJoinRoomById,
}) => {
  const [subTab, setSubTab] = useState<'house' | 'store' | 'levels' | 'rules'>(initialSubTab);
  const [activeCp, setActiveCp] = useState<CpRelationship | null>(null);
  const [pendingRequests, setPendingRequests] = useState<CpRelationship[]>([]);
  const [storeItems, setStoreItems] = useState<LoveStoreItem[]>([]);
  const [levelRules, setLevelRules] = useState<CpLevelRule[]>([]);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [storeCat, setStoreCat] = useState<'all' | 'ring' | 'intimacy' | 'guard' | 'theme'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [selectedRingId, setSelectedRingId] = useState('ls-ring-silver');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [confirmDivorce, setConfirmDivorce] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadCpData = useCallback(async () => {
    try {
      const [cpRes, frRes] = await Promise.all([
        apiFetch<{
          activeCp: CpRelationship | null;
          pendingRequests: CpRelationship[];
          loveStoreItems: LoveStoreItem[];
          levelRules: CpLevelRule[];
        }>('/api/cp'),
        apiFetch<{ friends: UserProfile[] }>('/api/friends'),
      ]);
      setActiveCp(cpRes.activeCp);
      setPendingRequests(cpRes.pendingRequests || []);
      setStoreItems(cpRes.loveStoreItems || []);
      setLevelRules(cpRes.levelRules || []);
      setFriends(frRes.friends || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCpData();
  }, [loadCpData, cpSyncTick]);

  async function refreshCurrentUser() {
    try {
      const me = await apiFetch<{ user: UserProfile }>('/api/auth/me');
      onUserUpdated(me.user);
    } catch {
      // ignore
    }
  }

  async function handleSendCpRequest(partnerId: string) {
    setFeedback(null);
    setBusyAction(true);
    try {
      await apiFetch('/api/cp/request', {
        method: 'POST',
        body: JSON.stringify({ partnerId }),
      });
      setFeedback({ type: 'ok', text: 'CP so‘rovi muvaffaqiyatli yuborildi!' });
      await loadCpData();
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleCancelCpRequest(cpId: string) {
    setFeedback(null);
    setBusyAction(true);
    try {
      await apiFetch(`/api/cp/${cpId}/cancel`, { method: 'POST' });
      setFeedback({ type: 'ok', text: 'Para so‘rovi bekor qilindi.' });
      await loadCpData();
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleRespondCp(cpId: string, accept: boolean) {
    setFeedback(null);
    setBusyAction(true);
    try {
      await apiFetch(`/api/cp/${cpId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ accept }),
      });
      setFeedback({
        type: 'ok',
        text: accept ? 'CP juftligi boshlandi!' : 'CP so‘rovi rad etildi.',
      });
      await Promise.all([loadCpData(), refreshCurrentUser()]);
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleProposeMarriage() {
    if (!activeCp) return;
    setFeedback(null);
    setBusyAction(true);
    try {
      const res = await apiFetch<{ cp: CpRelationship; user: UserProfile }>(
        `/api/cp/${activeCp.id}/propose-marriage`,
        {
          method: 'POST',
          body: JSON.stringify({ ringItemId: selectedRingId }),
        }
      );
      setActiveCp(res.cp);
      onUserUpdated(res.user);
      setFeedback({ type: 'ok', text: 'Turmush qurish taklifi va nikoh uzugi yuborildi!' });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleRespondMarriage(accept: boolean) {
    if (!activeCp) return;
    setFeedback(null);
    setBusyAction(true);
    try {
      const res = await apiFetch<{ cp: CpRelationship }>(
        `/api/cp/${activeCp.id}/respond-marriage`,
        {
          method: 'POST',
          body: JSON.stringify({ accept }),
        }
      );
      setActiveCp(res.cp);
      await refreshCurrentUser();
      setFeedback({
        type: 'ok',
        text: accept
          ? 'Nikoh muborak bo‘lsin! To‘y xonangiz ochildi (sovg‘alarga 1.1× bonus).'
          : 'Turmush qurish taklifi rad etildi.',
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleInviteFriendsToWedding() {
    if (!activeCp || selectedFriendIds.length === 0) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ invitedCount: number }>(
        `/api/cp/${activeCp.id}/invite-wedding`,
        {
          method: 'POST',
          body: JSON.stringify({ friendIds: selectedFriendIds }),
        }
      );
      setShowInviteModal(false);
      setSelectedFriendIds([]);
      setFeedback({
        type: 'ok',
        text: `${res.invitedCount} nafar do‘stingizga To‘y xonasi taklifnomasi yuborildi!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleDivorce() {
    if (!activeCp) return;
    setBusyAction(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/cp/${activeCp.id}/divorce`, { method: 'POST' });
      setConfirmDivorce(false);
      setActiveCp(null);
      await Promise.all([loadCpData(), refreshCurrentUser()]);
      setFeedback({ type: 'ok', text: 'CP va nikoh munosabatlari yakunlandi.' });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleBuyStoreItem(item: LoveStoreItem) {
    setBusyAction(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ user: UserProfile; cp: CpRelationship | null }>(
        '/api/cp/store/buy',
        {
          method: 'POST',
          body: JSON.stringify({ itemId: item.id, cpId: activeCp?.id || null }),
        }
      );
      onUserUpdated(res.user);
      if (res.cp) setActiveCp(res.cp);
      await loadCpData();
      setFeedback({
        type: 'ok',
        text: `"${item.name}" muvaffaqiyatli sotib olindi!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  async function handleSwitchTheme(themeKey: string) {
    if (!activeCp) return;
    setBusyAction(true);
    try {
      const res = await apiFetch<{ cp: CpRelationship }>(`/api/cp/${activeCp.id}/theme`, {
        method: 'POST',
        body: JSON.stringify({ themeKey }),
      });
      setActiveCp(res.cp);
      setFeedback({ type: 'ok', text: 'Sevgi uyi muqova foni yangilandi.' });
    } catch (err: any) {
      setFeedback({ type: 'err', text: err.message });
    } finally {
      setBusyAction(false);
    }
  }

  const ringItems = storeItems.filter((i) => i.category === 'ring');
  const nextRule = activeCp
    ? levelRules.find((r) => r.level === activeCp.level + 1) || null
    : null;
  const currentRule = activeCp
    ? levelRules.find((r) => r.level === activeCp.level) || null
    : null;
  const themeStyle = getThemeStyle(activeCp?.activeTheme || 'starlight-1');

  const availableThemes = activeCp
    ? [
        {
          key: `starlight-${Math.max(1, activeCp.level)}`,
          label: `Yulduzcha Muqova LV${Math.max(1, activeCp.level)}`,
        },
        ...(activeCp.marriageStatus === 'married'
          ? [{ key: 'marry-cover', label: 'Marry Cover (Nikoh foni)' }]
          : []),
        ...activeCp.collections
          .filter((c) => c.themeKey)
          .map((c) => ({ key: c.themeKey as string, label: c.itemName })),
      ].filter((t, idx, arr) => arr.findIndex((x) => x.key === t.key) === idx)
    : [];

  const candidateUsers = allUsers.filter(
    (u) =>
      u.id !== currentUser.id &&
      (!userSearch.trim() ||
        u.nickname.toLowerCase().includes(userSearch.trim().toLowerCase()) ||
        u.publicId.toLowerCase().includes(userSearch.trim().toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#140A2E] via-[#271054] to-[#0D1A47] border border-purple-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-pink-300 font-medium">
            <Heart className="w-4 h-4 text-pink-400" />
            <span>CP · Nikoh · Sevgi uyi</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-white mt-1">Sevgi uyi va CP</h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Istalgan foydalanuvchiga Para tashlang, yaqinlikni LV1–LV12 gacha oshiring va nikoh quring
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-3.5 py-2 rounded-xl bg-[#080B14]/85 border border-sky-400/35 flex items-center gap-2 text-xs">
            <Shield className="w-4 h-4 text-sky-400" />
            <span className="text-slate-300">Himoya:</span>
            <span className="font-mono tabular-nums font-bold text-white">
              {formatCoins(currentUser.guardValue)}
            </span>
          </div>
          {activeCp && (
            <div className="px-3.5 py-2 rounded-xl bg-[#080B14]/85 border border-[#E5B84B]/45 flex items-center gap-2 text-xs">
              <Crown className="w-4 h-4 text-[#E5B84B]" />
              <span className="font-mono font-bold text-[#E5B84B]">CP LV{activeCp.level}</span>
            </div>
          )}
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#0F1524] border border-white/[0.08] rounded-xl w-fit">
        {[
          { id: 'house', label: 'Sevgi uyi', icon: Home },
          { id: 'store', label: 'Love Store', icon: Store },
          { id: 'levels', label: 'Darajalar (LV1–12)', icon: Star },
          { id: 'rules', label: 'CP Qoidalari', icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                active ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-400/35 text-emerald-200'
              : 'bg-red-500/10 border-red-400/35 text-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-current underline">
            Yopish
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">Ma’lumotlar yuklanmoqda...</div>
      ) : (
        <>
          {/* TAB 1: SEVGI UYI */}
          {subTab === 'house' && (
            <div className="space-y-5">
              {activeCp ? (
                <>
                  {/* Starlight / Marry Cover Couple Hero Card */}
                  <div
                    className={`relative rounded-3xl overflow-hidden border p-6 sm:p-8 bg-gradient-to-br ${themeStyle.gradient} ${themeStyle.accent}`}
                  >
                    {/* Starry SVG backdrop */}
                    <svg
                      viewBox="0 0 600 240"
                      className="pointer-events-none absolute inset-0 w-full h-full opacity-55"
                      aria-hidden="true"
                    >
                      <circle cx="65" cy="40" r="2" fill="#FDE047" />
                      <circle cx="140" cy="85" r="1.5" fill="#FFF" />
                      <circle cx="220" cy="30" r="2.2" fill="#E9D5FF" />
                      <circle cx="310" cy="52" r="2" fill="#FDE047" />
                      <circle cx="420" cy="28" r="1.8" fill="#FFF" />
                      <circle cx="510" cy="70" r="2.4" fill="#FDE047" />
                      <circle cx="555" cy="40" r="1.5" fill="#93C5FD" />
                      <circle cx="90" cy="180" r="2" fill="#E9D5FF" />
                      <circle cx="480" cy="195" r="2" fill="#FDE047" />
                    </svg>

                    <div className="relative z-10 flex flex-col items-center text-center gap-5">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-[#080B14]/70 border border-[#E5B84B]/50 text-xs font-mono font-bold text-[#E5B84B]">
                          CP LV{activeCp.level}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-slate-200">
                          {themeStyle.name}
                        </span>
                        {activeCp.marriageStatus === 'married' && (
                          <span className="px-3 py-1 rounded-full bg-pink-500/25 border border-pink-400/50 text-xs font-semibold text-pink-200 flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-[#E5B84B]" />
                            <span>Nikohlangan</span>
                          </span>
                        )}
                      </div>

                      {/* Couple Avatars */}
                      <div className="flex items-center justify-center gap-5 sm:gap-10">
                        <div className="flex flex-col items-center gap-2">
                          <AvatarWithFrame
                            src={currentUser.avatarUrl}
                            alt={currentUser.nickname}
                            size="lg"
                            frameStyle={currentUser.frameStyle}
                            vipLevel={currentUser.vipLevel}
                            svipLevel={currentUser.svipLevel}
                            onlineStatus={currentUser.onlineStatus}
                            showOnline
                          />
                          <div className="text-sm font-bold text-white">{currentUser.nickname}</div>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-amber-400 flex items-center justify-center text-white shadow-[0_0_24px_rgba(236,72,153,0.5)]">
                            <Heart className="w-6 h-6 fill-white" />
                          </div>
                          <span className="font-mono text-xs text-amber-200 font-bold">
                            {formatCoins(activeCp.intimacy)}
                          </span>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <AvatarWithFrame
                            src={activeCp.partner.avatarUrl}
                            alt={activeCp.partner.nickname}
                            size="lg"
                            frameStyle={activeCp.partner.frameStyle}
                            vipLevel={activeCp.partner.vipLevel}
                            svipLevel={activeCp.partner.svipLevel}
                            onlineStatus={activeCp.partner.onlineStatus}
                            showOnline
                          />
                          <div className="text-sm font-bold text-white">
                            {activeCp.partner.nickname}
                          </div>
                        </div>
                      </div>

                      {/* 4 Core CP Metrics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full max-w-2xl">
                        <div className="p-3 rounded-2xl bg-[#080B14]/70 border border-white/10">
                          <div className="text-[11px] text-slate-400">Yaqinlik</div>
                          <div className="font-mono tabular-nums text-base font-bold text-pink-300 mt-0.5">
                            {formatCoins(activeCp.intimacy)}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#080B14]/70 border border-white/10">
                          <div className="text-[11px] text-slate-400">Baraka</div>
                          <div className="font-mono tabular-nums text-base font-bold text-[#E5B84B] mt-0.5">
                            {formatCoins(activeCp.blessing)}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#080B14]/70 border border-white/10">
                          <div className="text-[11px] text-slate-400">Kunlik chegara</div>
                          <div className="font-mono tabular-nums text-base font-bold text-sky-300 mt-0.5">
                            {formatCoins(activeCp.dailyIntimacyUsed)} /{' '}
                            {activeCp.dailyLimit === null
                              ? 'Cheksiz'
                              : formatCoins(activeCp.dailyLimit)}
                          </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-[#080B14]/70 border border-white/10">
                          <div className="text-[11px] text-slate-400">Mikrofon (kunlik)</div>
                          <div className="font-mono tabular-nums text-base font-bold text-emerald-300 mt-0.5">
                            {activeCp.dailyMicMinutes} / 180 daq
                          </div>
                        </div>
                      </div>

                      {/* Level Progress Bar */}
                      {nextRule && (
                        <div className="w-full max-w-xl space-y-1.5">
                          <div className="flex justify-between text-xs text-slate-300">
                            <span>Keyingi daraja: LV{nextRule.level}</span>
                            <span className="font-mono tabular-nums">
                              {formatCoins(activeCp.intimacy)} / {formatCoins(nextRule.minIntimacy)}
                            </span>
                          </div>
                          <div className="h-2.5 rounded-full bg-[#080B14]/80 overflow-hidden border border-white/10">
                            <div
                              className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-[#E5B84B] transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((activeCp.intimacy / nextRule.minIntimacy) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Active Perks Strip */}
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                        {currentRule && (
                          <span className="px-3 py-1 rounded-xl bg-white/10 text-slate-200">
                            {currentRule.coverName}
                          </span>
                        )}
                        {activeCp.perks.onlineReminder && (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/35 text-emerald-200">
                            Onlayn eslatma faol
                          </span>
                        )}
                        {activeCp.perks.micEffect && (
                          <span className="px-3 py-1 rounded-xl bg-purple-500/25 border border-purple-400/40 text-purple-200 flex items-center gap-1">
                            <Mic className="w-3.5 h-3.5" />
                            <span>Mikrofon harakati effekti</span>
                          </span>
                        )}
                        {activeCp.marriageStatus === 'married' && (
                          <span className="px-3 py-1 rounded-xl bg-[#E5B84B]/20 border border-[#E5B84B]/50 text-[#FDE68A]">
                            To‘y xonasi 1.1× sovg‘a bonusi
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Marriage / Wedding Controls */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-4">
                      <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                        <Crown className="w-5 h-5 text-[#E5B84B]" />
                        <span>Nikoh va To‘y marosimi</span>
                      </h3>

                      {activeCp.marriageStatus === 'none' && (
                        <div className="space-y-3">
                          {activeCp.level < 1 ? (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 flex items-start gap-2.5">
                              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                Turmush qurish taklifini yuborish uchun avval{' '}
                                <strong>CP LV1 (777 yaqinlik)</strong> darajasiga yeting. Hozirda
                                yana <strong>{formatCoins(Math.max(0, 777 - activeCp.intimacy))}</strong>{' '}
                                yaqinlik kerak.
                              </span>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs text-slate-300">
                                CP LV1 ga yetdingiz! Nikoh uzugini tanlab, juftingizga turmush
                                qurish taklifini yuboring:
                              </p>
                              <div className="space-y-2">
                                {ringItems.map((ring) => (
                                  <button
                                    key={ring.id}
                                    type="button"
                                    onClick={() => setSelectedRingId(ring.id)}
                                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors ${
                                      selectedRingId === ring.id
                                        ? 'bg-pink-500/15 border-[#E5B84B] text-white'
                                        : 'bg-[#080B14] border-white/10 text-slate-300'
                                    }`}
                                  >
                                    <div>
                                      <div className="text-sm font-semibold">{ring.name}</div>
                                      <div className="text-[11px] text-slate-400">
                                        +{ring.intimacyGain} yaqinlik · +{ring.blessingGain} baraka
                                      </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-[#E5B84B]">
                                      {formatCoins(ring.priceCoins)} Tanga
                                    </span>
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                disabled={busyAction}
                                onClick={handleProposeMarriage}
                                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-pink-600 to-amber-500 text-white font-semibold text-sm disabled:opacity-50"
                              >
                                Uzuk bilan turmush qurishni taklif qilish
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {activeCp.marriageStatus === 'proposed' && (
                        <div className="space-y-3">
                          {activeCp.proposedBy === currentUser.id ? (
                            <div className="p-4 rounded-xl bg-purple-500/15 border border-purple-400/35 text-xs text-purple-100">
                              Turmush qurish taklifingiz yuborildi. {activeCp.partner.nickname}{' '}
                              javobini kuting!
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-pink-500/15 border border-pink-400/40 space-y-3">
                              <div className="text-sm font-semibold text-white">
                                {activeCp.partner.nickname} sizga turmush qurish taklifini yubordi!
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => handleRespondMarriage(true)}
                                  className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                                >
                                  Qabul qilish va To‘y ochish
                                </button>
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => handleRespondMarriage(false)}
                                  className="min-h-[44px] px-4 rounded-xl bg-white/10 text-slate-200 text-xs font-semibold"
                                >
                                  Rad etish
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {activeCp.marriageStatus === 'married' && (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl bg-[#E5B84B]/10 border border-[#E5B84B]/35 text-xs text-amber-100">
                            To‘y xonangizda barcha sovg‘alar uchun{' '}
                            <strong>1.1× bonus</strong> amal qiladi. Do‘stlaringizni to‘yga
                            taklif qilishingiz mumkin.
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeCp.weddingRoomId && (
                              <button
                                type="button"
                                onClick={() => onJoinRoomById(activeCp.weddingRoomId!)}
                                className="flex-1 min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#E5B84B] to-amber-500 text-[#1A0800] font-bold text-xs"
                              >
                                To‘y Xonasiga kirish
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowInviteModal(true)}
                              className="flex-1 min-h-[44px] px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Do‘stlarni to‘yga taklif qilish</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="pt-2 border-t border-white/[0.06] flex justify-end">
                        <button
                          type="button"
                          onClick={() => setConfirmDivorce(true)}
                          className="min-h-[38px] px-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/35 text-xs font-semibold text-red-200"
                        >
                          {activeCp.marriageStatus === 'married'
                            ? 'Parani bekor qilish (Ajralish)'
                            : 'Parani bekor qilish'}
                        </button>
                      </div>
                    </div>

                    {/* Sevgi uyi: Themes & Collected Rings/Gifts */}
                    <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-4">
                      <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                        <span>Mavzular va Kolleksiya</span>
                      </h3>

                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">Muqova fonini tanlash</div>
                        <div className="flex flex-wrap gap-2">
                          {availableThemes.map((th) => (
                            <button
                              key={th.key}
                              type="button"
                              disabled={busyAction}
                              onClick={() => handleSwitchTheme(th.key)}
                              className={`min-h-[38px] px-3 rounded-xl border text-xs font-medium ${
                                activeCp.activeTheme === th.key
                                  ? 'bg-purple-600 border-purple-400 text-white'
                                  : 'bg-[#080B14] border-white/10 text-slate-300 hover:text-white'
                              }`}
                            >
                              {th.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-slate-400">
                          Yig‘ilgan nikoh uzuklari va Sevgi uyi buyumlari (
                          {activeCp.collections.length})
                        </div>
                        {activeCp.collections.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            Hozircha kolleksiya bo‘sh. Love Store’dan uzuk yoki mavzu yuboring.
                          </p>
                        ) : (
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {activeCp.collections.map((c) => (
                              <div
                                key={c.id}
                                className="p-2.5 rounded-xl bg-[#080B14] border border-white/[0.06] flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-semibold text-white">{c.itemName}</div>
                                  <div className="text-[11px] text-slate-400">
                                    Yuboruvchi: {c.senderNickname}
                                  </div>
                                </div>
                                <span className="text-[11px] text-slate-500">
                                  {formatUzDate(c.createdAt)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* NO ACTIVE CP YET */
                <div className="space-y-5">
                  {/* Para Info Card */}
                  <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Heart className="w-5 h-5 text-pink-400" />
                        <span>Sevgi uyi · Para tashlash ochiq</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Quyidan do‘stingizga Para tashlashingiz yoki yuborilgan so‘rovni bekor qilishingiz mumkin. Himoya qiymatingiz: {formatCoins(currentUser.guardValue)}.
                      </p>
                    </div>
                  </div>

                  {/* Pending CP Requests */}
                  {pendingRequests.length > 0 && (
                    <div className="p-5 rounded-2xl bg-[#0F1524] border border-pink-400/30 space-y-3">
                      <h3 className="font-display text-base font-bold text-white">
                        Kutilayotgan Para (CP) so‘rovlari
                      </h3>
                      <div className="space-y-2.5">
                        {pendingRequests.map((reqItem) => (
                          <div
                            key={reqItem.id}
                            className="p-3.5 rounded-xl bg-[#080B14] border border-white/10 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <AvatarWithFrame
                                src={reqItem.partner.avatarUrl}
                                alt={reqItem.partner.nickname}
                                size="sm"
                                frameStyle={reqItem.partner.frameStyle}
                              />
                              <div>
                                <div className="text-sm font-semibold text-white">
                                  {reqItem.partner.nickname}
                                </div>
                                <div className="text-xs text-slate-400 font-mono">
                                  ID {reqItem.partner.publicId} · Himoya:{' '}
                                  {formatCoins(reqItem.partner.guardValue)}
                                </div>
                              </div>
                            </div>
                            {reqItem.isRequester ? (
                              <div className="flex items-center gap-2.5">
                                <span className="text-xs text-amber-300 font-medium">
                                  Javob kutilmoqda...
                                </span>
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => handleCancelCpRequest(reqItem.id)}
                                  className="min-h-[38px] px-3.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 text-xs font-semibold text-red-200"
                                >
                                  Parani bekor qilish
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => handleRespondCp(reqItem.id, true)}
                                  className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
                                >
                                  Qabul qilish
                                </button>
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() => handleRespondCp(reqItem.id, false)}
                                  className="min-h-[38px] px-3.5 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
                                >
                                  Rad etish
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Send CP Request Directory */}
                  <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-pink-400" />
                        <span>CP jufti tanlash</span>
                      </h3>
                      <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Ism yoki ID..."
                          className="w-full min-h-[40px] pl-9 pr-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {candidateUsers.slice(0, 12).map((u) => (
                        <div
                          key={u.id}
                          className="p-3.5 rounded-xl bg-[#080B14] border border-white/[0.07] flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarWithFrame
                              src={u.avatarUrl}
                              alt={u.nickname}
                              size="sm"
                              frameStyle={u.frameStyle}
                              onlineStatus={u.onlineStatus}
                              showOnline
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {u.nickname}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">
                                ID {u.publicId}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={busyAction}
                            onClick={() => handleSendCpRequest(u.id)}
                            className="min-h-[38px] px-3.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0"
                          >
                            Para tashlash
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOVE STORE */}
          {subTab === 'store' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Barchasi' },
                  { id: 'ring', label: 'Nikoh uzuklari' },
                  { id: 'intimacy', label: 'Yaqinlik sovg‘alari' },
                  { id: 'guard', label: 'Himoya qiymati' },
                  { id: 'theme', label: 'Mavzular' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setStoreCat(c.id as any)}
                    className={`min-h-[38px] px-3.5 rounded-xl text-xs font-semibold border ${
                      storeCat === c.id
                        ? 'bg-[#E5B84B] border-[#E5B84B] text-[#1A0800]'
                        : 'bg-[#0F1524] border-white/10 text-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {storeItems
                  .filter((i) => storeCat === 'all' || i.category === storeCat)
                  .map((item) => {
                    const isRing = item.category === 'ring';
                    const ringLocked = isRing && !activeCp;
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl bg-[#0F1524] border border-white/[0.08] flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {item.imageUrl && (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                referrerPolicy="no-referrer"
                                className="w-14 h-14 rounded-xl object-cover border border-pink-400/40 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="font-display text-base font-bold text-white">
                                  {item.name}
                                </div>
                                {isRing && (
                                  <span className="px-1.5 py-0.5 rounded bg-pink-500/20 border border-pink-400/40 text-[10px] font-bold text-pink-200">
                                    Faqat CP
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 rounded-lg bg-[#080B14] border border-[#E5B84B]/40 font-mono text-xs font-bold text-[#E5B84B] shrink-0">
                            {formatCoins(item.priceCoins)} Tanga
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            {item.intimacyGain > 0 && (
                              <span className="px-2 py-0.5 rounded bg-pink-500/15 text-pink-300">
                                +{formatCoins(item.intimacyGain)} yaqinlik
                              </span>
                            )}
                            {item.blessingGain > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                                +{formatCoins(item.blessingGain)} baraka
                              </span>
                            )}
                            {item.guardGain > 0 && (
                              <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300">
                                +{formatCoins(item.guardGain)} himoya
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={busyAction || ringLocked}
                            onClick={() => handleBuyStoreItem(item)}
                            title={ringLocked ? 'Faqat faol CP parangiz uchun' : 'Sotib olish'}
                            className="min-h-[38px] px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-45"
                          >
                            {ringLocked ? '🔒 Faqat CP' : 'Sotib olish'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* TAB 3: YAQINLIK DARAJALARI (LV1-LV12) */}
          {subTab === 'levels' && (
            <div className="rounded-2xl bg-[#0F1524] border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#080B14] text-slate-400 border-b border-white/[0.08]">
                    <tr>
                      <th className="py-3 px-4">Daraja</th>
                      <th className="py-3 px-4">Kerakli Yaqinlik</th>
                      <th className="py-3 px-4">Kunlik chegara</th>
                      <th className="py-3 px-4">Imtiyozlar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {levelRules.map((rule) => {
                      const unlocked = activeCp ? activeCp.level >= rule.level : false;
                      return (
                        <tr
                          key={rule.level}
                          className={unlocked ? 'bg-purple-500/10' : 'hover:bg-white/[0.02]'}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-[#E5B84B]">
                            LV{rule.level}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-white">
                            {formatCoins(rule.minIntimacy)}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-sky-300">
                            {rule.dailyLimit === null ? 'cheksiz' : formatCoins(rule.dailyLimit)}
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {rule.perks.join(' · ')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CP QOIDALARI */}
          {subTab === 'rules' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-2">
                <h4 className="font-display text-base font-bold text-[#E5B84B]">1. CP NIMA?</h4>
                <p>
                  Har bir tomonning himoya qiymati <strong>600 dan oshsa</strong>, CP so‘rovi
                  boshlanishi mumkin. CP nikoh uchun zarur shartdir.
                </p>
                <p className="font-mono text-pink-300">Yaqinlik: 3000 oltin tanga = +1 yaqinlik.</p>
                <p className="font-mono text-amber-300">Baraka: 3000 oltin tanga = +1 baraka.</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-2">
                <h4 className="font-display text-base font-bold text-[#E5B84B]">2. NIKOH NIMA?</h4>
                <p>
                  <strong>CP LV1</strong> bo‘lgandan so‘ng uzuk sotib olib, turmush qurish taklifini
                  boshlash mumkin. Taklif muvaffaqiyatli bo‘lsa, do‘stlarni to‘yga taklif qilish
                  mumkin. To‘y xonasida sovg‘alar uchun <strong>1.1 bonus</strong> beriladi. Sevgi
                  uyida mavzular va nikoh uzuklarini yuborish hamda yig‘ish mumkin. Ajralishdan
                  keyin CP va nikoh munosabatlari tugatiladi.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-2">
                <h4 className="font-display text-base font-bold text-[#E5B84B]">
                  3. YAQINLIKNI OSHIRISH
                </h4>
                <p>3000 oltin tanga sovg‘a = +1 yaqinlik.</p>
                <p>Mikrofon: 1 daqiqa = 1 yaqinlik, kuniga 180 gacha.</p>
                <p>Love Store mahsulotlari ham yaqinlikni oshiradi.</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.08] space-y-2">
                <h4 className="font-display text-base font-bold text-[#E5B84B]">5. IMTIYOZLAR</h4>
                <p>
                  <strong>LV1–LV12:</strong> Har bir darajaga mos yulduzcha muqova foni.
                </p>
                <p>
                  <strong>LV1:</strong> Onlayn eslatma.
                </p>
                <p>
                  <strong>LV2–LV12:</strong> Mikrofon harakati effekti.
                </p>
                <p>
                  <strong>Uylanish:</strong> Marry Cover fon, onlayn eslatma va mikrofon effekti.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite Friends to Wedding Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1524] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base font-bold text-white">
                Do‘stlarni to‘yga taklif qilish
              </h4>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {friends.length === 0 ? (
              <p className="text-xs text-slate-400">
                Hozircha do‘stlar ro‘yxati bo‘sh. Profillar orqali do‘st qo‘shishingiz mumkin.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.map((f) => {
                  const checked = selectedFriendIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() =>
                        setSelectedFriendIds((prev) =>
                          checked ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                        )
                      }
                      className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        checked
                          ? 'bg-purple-600/25 border-purple-400 text-white'
                          : 'bg-[#080B14] border-white/10 text-slate-300'
                      }`}
                    >
                      <span>{f.nickname}</span>
                      {checked && <Check className="w-4 h-4 text-[#E5B84B]" />}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              disabled={busyAction || selectedFriendIds.length === 0}
              onClick={handleInviteFriendsToWedding}
              className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-pink-600 to-amber-500 text-white font-semibold text-sm disabled:opacity-50"
            >
              Taklifnoma yuborish ({selectedFriendIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Divorce Confirmation Modal */}
      {confirmDivorce && activeCp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0F1524] border border-red-500/35 rounded-2xl p-5 space-y-4">
            <h4 className="font-display text-base font-bold text-white">
              {activeCp.marriageStatus === 'married' ? 'Ajralishni tasdiqlash' : 'CP ni tugatish'}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Ajralishdan keyin CP va nikoh munosabatlari hamda faol to‘y xonasi tugatiladi. Davom
              etishni xohlaysizmi?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyAction}
                onClick={handleDivorce}
                className="flex-1 min-h-[42px] rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Tasdiqlash
              </button>
              <button
                type="button"
                onClick={() => setConfirmDivorce(false)}
                className="flex-1 min-h-[42px] rounded-xl bg-white/10 text-slate-200 text-xs font-semibold"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
