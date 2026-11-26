import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  Coins,
  Crown,
  Gamepad2,
  Heart,
  Home,
  Menu,
  MessageSquare,
  Settings,
  ShieldAlert,
  Swords,
  Trophy,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins, getRoleShortLabel, getStoredToken, setStoredToken } from './lib/api';
import { AuthModal } from './components/AuthModal';
import { AvatarWithFrame } from './components/AvatarWithFrame';
import { CreateRoomModal } from './components/CreateRoomModal';
import { RoleBadge } from './components/RoleBadge';
import { HomeView } from './components/HomeView';
import { VoiceRoomView } from './components/VoiceRoomView';
import { MessagesView } from './components/MessagesView';
import { WalletVipView } from './components/WalletVipView';
import { PkAgencyView } from './components/PkAgencyView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProfileView } from './components/ProfileView';
import { AdminPanelView } from './components/AdminPanelView';
import { SettingsView } from './components/SettingsView';
import { NotificationsView } from './components/NotificationsView';
import { GamesHubView } from './components/GamesHubView';
import { CpLoveHouseView } from './components/CpLoveHouseView';
import { GameOutcomeToastContainer, type GameOutcomeToastItem } from './components/GameOutcomeToast';
import { OnboardingModal } from './components/OnboardingModal';
import { Gift3DEffectOverlay, type RoomGiftEffectEvent } from './components/Gift3DEffectOverlay';
import type {
  AppNotification,
  CpRelationship,
  PkBattle,
  PrivateMessage,
  RibbonLogo,
  RoomMessage,
  RoomMusicState,
  RoomUserEntryEvent,
  ServiceConfigStatus,
  UserProfile,
  VoiceEffectMode,
  VoiceRoom,
} from './types/turon';

type NavTab =
  | 'home'
  | 'room'
  | 'messages'
  | 'wallet'
  | 'vip'
  | 'cp'
  | 'pk'
  | 'agency'
  | 'games'
  | 'leaderboard'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'admin';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [bootLoading, setBootLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ribbonLogos, setRibbonLogos] = useState<RibbonLogo[]>([]);
  const [adminInitialTab, setAdminInitialTab] = useState<
    'users' | 'reports' | 'rooms' | 'gifts' | 'logos' | 'transactions' | 'logs'
  >('users');
  const [pkBattles, setPkBattles] = useState<PkBattle[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [serviceStatus, setServiceStatus] = useState<ServiceConfigStatus>({
    supabaseConfigured: false,
    livekitConfigured: false,
    livekitUrl: null,
    paymentProviderConfigured: false,
  });

  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<RoomMessage[]>([]);
  const [lastGiftEvent, setLastGiftEvent] = useState<RoomGiftEffectEvent | null>(null);
  const [giftEffectQueue, setGiftEffectQueue] = useState<RoomGiftEffectEvent[]>([]);
  const [lastUserEntry, setLastUserEntry] = useState<RoomUserEntryEvent | null>(null);
  const [analyticsSyncTick, setAnalyticsSyncTick] = useState(0);
  const [djSyncTick, setDjSyncTick] = useState(0);
  const [liveMusicState, setLiveMusicState] = useState<RoomMusicState | null>(null);
  const [roomVoiceEffects, setRoomVoiceEffects] = useState<Record<string, VoiceEffectMode>>({});
  const [lastRocketLaunch, setLastRocketLaunch] = useState<{
    roomId: string;
    rocketLevel: number;
    launchedBy: string;
  } | null>(null);
  const giftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenGiftIdsRef = useRef<Set<string>>(new Set());
  const entryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [inspectedUser, setInspectedUser] = useState<UserProfile | null>(null);
  const [dmPartnerId, setDmPartnerId] = useState<string | null>(null);
  const [incomingDm, setIncomingDm] = useState<PrivateMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Private room password prompt
  const [passwordPromptRoom, setPasswordPromptRoom] = useState<VoiceRoom | null>(null);
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [roomEnterError, setRoomEnterError] = useState('');
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [gameToasts, setGameToasts] = useState<GameOutcomeToastItem[]>([]);
  const toastTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [cpSyncTick, setCpSyncTick] = useState(0);
  const [cpOnlineToast, setCpOnlineToast] = useState<string | null>(null);
  const activeCpRef = useRef<{
    partnerId: string;
    partnerName: string;
    onlineReminder: boolean;
  } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  activeRoomIdRef.current = activeRoom?.id || null;

  const dismissGameToast = useCallback((id: string) => {
    if (toastTimersRef.current[id]) {
      clearTimeout(toastTimersRef.current[id]);
      delete toastTimersRef.current[id];
    }
    setGameToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushGameToast = useCallback(
    (toast: GameOutcomeToastItem) => {
      setGameToasts((prev) => {
        if (prev.some((t) => t.id === toast.id)) return prev;
        return [toast, ...prev].slice(0, 3);
      });
      if (toastTimersRef.current[toast.id]) {
        clearTimeout(toastTimersRef.current[toast.id]);
      }
      toastTimersRef.current[toast.id] = setTimeout(() => {
        dismissGameToast(toast.id);
      }, 4500);
    },
    [dismissGameToast]
  );

  const enqueueGiftEffect = useCallback((rawEvent: RoomGiftEffectEvent) => {
    if (!rawEvent?.id || seenGiftIdsRef.current.has(rawEvent.id)) return;
    seenGiftIdsRef.current.add(rawEvent.id);
    if (seenGiftIdsRef.current.size > 120) {
      const first = seenGiftIdsRef.current.values().next().value;
      if (first) seenGiftIdsRef.current.delete(first);
    }
    const normalized: RoomGiftEffectEvent = {
      ...rawEvent,
      roomId: rawEvent.roomId || activeRoomIdRef.current || '',
    };
    setGiftEffectQueue((prev) => [...prev, normalized]);
    setLastGiftEvent(normalized);
    if (giftTimerRef.current) clearTimeout(giftTimerRef.current);
    giftTimerRef.current = setTimeout(
      () => setLastGiftEvent(null),
      normalized.videoUrl ? 17000 : 5800
    );
  }, []);

  const dismissActiveGiftEffect = useCallback(() => {
    setGiftEffectQueue((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    return () => {
      Object.values(toastTimersRef.current).forEach(clearTimeout);
      if (giftTimerRef.current) clearTimeout(giftTimerRef.current);
    };
  }, []);

  const loadWorkspaceData = useCallback(async () => {
    try {
      const [roomsRes, usersRes, pkRes, notifRes, cfgRes, logosRes] = await Promise.all([
        apiFetch<{ rooms: VoiceRoom[] }>('/api/rooms'),
        apiFetch<{ users: UserProfile[] }>('/api/users'),
        apiFetch<{ battles: PkBattle[] }>('/api/pk'),
        apiFetch<{ notifications: AppNotification[] }>('/api/notifications'),
        apiFetch<ServiceConfigStatus>('/api/config/status'),
        apiFetch<{ logos: RibbonLogo[] }>('/api/ribbon-logos'),
      ]);
      setRooms(roomsRes.rooms);
      setUsers(usersRes.users);
      setPkBattles(pkRes.battles);
      setNotifications(notifRes.notifications);
      setServiceStatus(cfgRes);
      setRibbonLogos(logosRes.logos || []);
    } catch {
      // ignore initial errors
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setBootLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    apiFetch<{ user: UserProfile }>('/api/auth/me', { signal: controller.signal })
      .then((res) => {
        setCurrentUser(res.user);
      })
      .catch((err: any) => {
        if (err?.name !== 'AbortError') {
          setStoredToken(null);
        }
      })
      .finally(() => {
        clearTimeout(timer);
        setBootLoading(false);
      });
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const key = `turon_onboarded_${currentUser.id}`;
    if (!localStorage.getItem(key)) {
      setShowOnboarding(true);
    }
  }, [currentUser?.id]);

  // Keep active CP partner info synced for LV1+ online reminder
  useEffect(() => {
    if (!currentUser) {
      activeCpRef.current = null;
      return;
    }
    apiFetch<{ activeCp: CpRelationship | null }>('/api/cp')
      .then((res) => {
        if (res.activeCp) {
          activeCpRef.current = {
            partnerId: res.activeCp.partner.id,
            partnerName: res.activeCp.partner.nickname,
            onlineReminder: res.activeCp.perks.onlineReminder,
          };
        } else {
          activeCpRef.current = null;
        }
      })
      .catch(() => {});
  }, [currentUser?.id, cpSyncTick]);

  // Load data & establish WebSocket when signed in
  useEffect(() => {
    if (!currentUser) return;
    loadWorkspaceData();

    const token = getStoredToken();
    if (!token) return;

    let closedByCleanup = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connectWs() {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws?token=${encodeURIComponent(token!)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (activeRoomIdRef.current) {
          ws.send(JSON.stringify({ event: 'room:subscribe', payload: { roomId: activeRoomIdRef.current } }));
        }
      };

      ws.onmessage = (evt) => {
        try {
          const { event, payload } = JSON.parse(evt.data);
          if (event === 'presence:update') {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === payload.userId ? { ...u, onlineStatus: payload.onlineStatus } : u
              )
            );
            if (
              payload.onlineStatus === 'online' &&
              activeCpRef.current &&
              activeCpRef.current.partnerId === payload.userId &&
              activeCpRef.current.onlineReminder
            ) {
              setCpOnlineToast(`Onlayn eslatma: CP juftingiz ${activeCpRef.current.partnerName} hozir onlayn bo‘ldi!`);
              setTimeout(() => setCpOnlineToast(null), 5000);
            }
          } else if (event === 'cp:updated') {
            setCpSyncTick((t) => t + 1);
            apiFetch<{ user: UserProfile }>('/api/auth/me')
              .then((me) => setCurrentUser(me.user))
              .catch(() => {});
          } else if (event === 'room:updated') {
            setRooms((prev) => prev.map((r) => (r.id === payload.id ? payload : r)));
            if (activeRoomIdRef.current === payload.id) {
              setActiveRoom(payload);
            }
          } else if (event === 'rooms:created') {
            setRooms((prev) =>
              prev.some((r) => r.id === payload.id) ? prev : [payload, ...prev]
            );
          } else if (event === 'room:message') {
            if (activeRoomIdRef.current === payload.roomId) {
              setRoomMessages((prev) =>
                prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]
              );
            }
          } else if (event === 'room:cleared') {
            if (activeRoomIdRef.current === payload.roomId) {
              setRoomMessages(payload.systemMessage ? [payload.systemMessage] : []);
            }
          } else if (event === 'room:gift' || event === 'gift:effect') {
            enqueueGiftEffect({
              ...(payload as RoomGiftEffectEvent),
              roomId: payload?.roomId || activeRoomIdRef.current || '',
            });
          } else if (event === 'room:user_entered') {
            if (activeRoomIdRef.current === payload.roomId) {
              setLastUserEntry(payload as RoomUserEntryEvent);
              if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
              entryTimerRef.current = setTimeout(() => setLastUserEntry(null), 4600);
            }
          } else if (event === 'room:analytics_updated') {
            if (activeRoomIdRef.current === payload.roomId) {
              setAnalyticsSyncTick((t) => t + 1);
            }
          } else if (event === 'room:dj_updated') {
            if (activeRoomIdRef.current === payload.roomId) {
              setDjSyncTick((t) => t + 1);
            }
          } else if (event === 'room:music_updated') {
            if (activeRoomIdRef.current === payload?.roomId) {
              setLiveMusicState(payload as RoomMusicState);
            }
          } else if (event === 'room:voice_effect') {
            if (activeRoomIdRef.current === payload?.roomId && payload?.userId) {
              setRoomVoiceEffects((prev) => ({
                ...prev,
                [String(payload.userId)]: (payload.effectMode || 'normal') as VoiceEffectMode,
              }));
            }
          } else if (event === 'room:rocket_launch') {
            setLastRocketLaunch(payload);
            setTimeout(() => setLastRocketLaunch(null), 5000);
          } else if (event === 'room:kicked' || event === 'room:banned') {
            if (activeRoomIdRef.current === payload.roomId) {
              setActiveRoom(null);
              setActiveTab('home');
            }
          } else if (event === 'dm:new') {
            setIncomingDm(payload);
          } else if (event === 'notification:new') {
            setNotifications((prev) =>
              prev.some((n) => n.id === payload.id) ? prev : [payload, ...prev]
            );
          } else if (event === 'pk:updated' || event === 'pk:created') {
            apiFetch<{ battles: PkBattle[] }>('/api/pk')
              .then((res) => setPkBattles(res.battles))
              .catch(() => {});
          } else if (event === 'logos:updated') {
            if (Array.isArray(payload)) {
              setRibbonLogos(payload as RibbonLogo[]);
            }
          } else if (event === 'game:outcome') {
            pushGameToast(payload as GameOutcomeToastItem);
            if (typeof payload?.gamePoints === 'number') {
              setCurrentUser((prev) =>
                prev ? { ...prev, gamePoints: payload.gamePoints } : prev
              );
            }
          } else if (event === 'greedy:state') {
            window.dispatchEvent(new CustomEvent('turon:greedy_state', { detail: payload }));
          } else if (event === 'greedy:user_balance') {
            if (payload?.user) {
              setCurrentUser(payload.user as UserProfile);
            }
            window.dispatchEvent(new CustomEvent('turon:greedy_balance', { detail: payload }));
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        if (!closedByCleanup) {
          reconnectTimer = setTimeout(connectWs, 3000);
        }
      };
    }

    connectWs();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [currentUser?.id, loadWorkspaceData, pushGameToast, enqueueGiftEffect]);

  async function enterRoom(room: VoiceRoom, password?: string) {
    setRoomEnterError('');
    try {
      const res = await apiFetch<{
        room: VoiceRoom;
        messages: RoomMessage[];
        entryEvent?: RoomUserEntryEvent;
      }>(`/api/rooms/${room.id}/enter`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setPasswordPromptRoom(null);
      setRoomPasswordInput('');
      setActiveRoom(res.room);
      setRoomMessages(res.messages);
      setRoomVoiceEffects({});
      setActiveTab('room');
      if (res.entryEvent) {
        setLastUserEntry(res.entryEvent);
        if (entryTimerRef.current) clearTimeout(entryTimerRef.current);
        entryTimerRef.current = setTimeout(() => setLastUserEntry(null), 4600);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({ event: 'room:subscribe', payload: { roomId: res.room.id } })
        );
      }
    } catch (err: any) {
      if (room.isPrivate && !password) {
        setPasswordPromptRoom(room);
      } else {
        setRoomEnterError(err.message);
      }
    }
  }

  function exitRoom() {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event: 'room:unsubscribe', payload: {} }));
    }
    setActiveRoom(null);
    setRoomVoiceEffects({});
    setActiveTab('home');
    loadWorkspaceData();
  }

  async function handleJoinRoomById(roomId: string) {
    let found = rooms.find((r) => r.id === roomId);
    if (!found) {
      try {
        const res = await apiFetch<{ rooms: VoiceRoom[] }>('/api/rooms');
        setRooms(res.rooms);
        found = res.rooms.find((r) => r.id === roomId);
      } catch {
        // ignore
      }
    }
    if (found) enterRoom(found);
  }

  function handleOpenUserById(userId: string) {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setInspectedUser(found);
      setActiveTab('profile');
    }
  }

  function handleLogout() {
    wsRef.current?.close();
    setStoredToken(null);
    setCurrentUser(null);
    setActiveRoom(null);
    setActiveTab('home');
  }

  if (bootLoading) {
    return (
      <div className="min-h-screen bg-[#080B14] flex items-center justify-center text-slate-300 text-sm">
        TURON CHAT yuklanmoqda...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal isFullScreen onSuccess={(u) => setCurrentUser(u)} />;
  }

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator', 'pk_admin'].includes(
    currentUser.role
  );
  const myOwnedRoom =
    rooms.find((r) => r.ownerId === currentUser.id && !r.isWeddingRoom) || null;

  const navItems: Array<{ id: NavTab; label: string; icon: React.ComponentType<any>; badge?: number }> = [
    { id: 'home', label: 'Bosh sahifa', icon: Home },
    { id: 'games', label: 'O‘yinlar', icon: Gamepad2 },
    { id: 'messages', label: 'Xabarlar', icon: MessageSquare },
    { id: 'wallet', label: 'Hamyon', icon: Wallet },
    { id: 'vip', label: 'VIP / SVIP', icon: Crown },
    { id: 'cp', label: 'Sevgi uyi · CP', icon: Heart },
    { id: 'pk', label: 'PK Arena', icon: Swords },
    { id: 'agency', label: 'Agentliklar', icon: Building2 },
    { id: 'leaderboard', label: 'Reyting', icon: Trophy },
    { id: 'notifications', label: 'Bildirishnomalar', icon: Bell, badge: unreadNotifs },
    { id: 'profile', label: 'Profil', icon: UserIcon },
    { id: 'settings', label: 'Sozlamalar', icon: Settings },
  ];
  if (isStaff) {
    navItems.push({ id: 'admin', label: 'Boshqaruv paneli', icon: ShieldAlert });
  }

  function navigateTo(tab: NavTab) {
    if (tab === 'profile') setInspectedUser(currentUser);
    if (tab !== 'room' && activeRoom) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: 'room:unsubscribe', payload: {} }));
      }
      setActiveRoom(null);
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  }

  const isInRoomFullscreen = activeTab === 'room' && Boolean(activeRoom);

  return (
    <div
      className={`bg-[#080B14] text-slate-100 flex flex-col lg:flex-row ${
        isInRoomFullscreen ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0B101D] border-r border-white/[0.07] z-30">
        <div className="h-16 px-6 flex items-center border-b border-white/[0.07]">
          <button
            type="button"
            onClick={() => navigateTo('home')}
            className="font-display text-xl font-extrabold tracking-tight text-white whitespace-nowrap"
          >
            TURON <span className="text-[#E5B84B]">CHAT</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateTo(item.id)}
                className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600/20 text-white border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#E5B84B]' : ''}`} />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge && item.badge > 0 ? (
                  <span className="font-mono tabular-nums text-xs font-semibold text-[#E5B84B]">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.07]">
          <button
            type="button"
            onClick={() => navigateTo('profile')}
            className="w-full p-2.5 rounded-xl bg-[#0F1524] border border-white/[0.06] flex items-center gap-3 text-left hover:border-white/15"
          >
            <AvatarWithFrame
              src={currentUser.avatarUrl}
              alt={currentUser.nickname}
              size="sm"
              frameStyle={currentUser.frameStyle}
              vipLevel={currentUser.vipLevel}
              svipLevel={currentUser.svipLevel}
              role={currentUser.role}
              onlineStatus={currentUser.onlineStatus}
              showOnline
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-white truncate">
                  {currentUser.nickname}
                </span>
                <RoleBadge role={currentUser.role} size="xs" />
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {getRoleShortLabel(currentUser.role)} ·{' '}
                <span className="font-mono text-[#E5B84B]">{formatCoins(currentUser.coinBalance)}</span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 lg:pl-64 flex flex-col ${
          isInRoomFullscreen ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
        }`}
      >
        {/* Top Header (hidden in full-screen room view) */}
        {!isInRoomFullscreen && (
        <header className="sticky top-0 z-20 h-14 bg-[#080B14]/90 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-slate-300"
              aria-label="Menyu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="lg:hidden font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap"
            >
              TURON <span className="text-[#E5B84B]">CHAT</span>
            </button>
            <span className="hidden lg:inline text-sm font-medium text-slate-300">
              {activeTab === 'room' && activeRoom
                ? activeRoom.title
                : navItems.find((n) => n.id === activeTab)?.label || 'Bosh sahifa'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (myOwnedRoom) {
                  if (activeTab !== 'room' || activeRoom?.id !== myOwnedRoom.id) {
                    enterRoom(myOwnedRoom);
                  }
                } else {
                  setShowCreateRoomModal(true);
                }
              }}
              className="relative min-h-[40px] min-w-[46px] px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-[#080B14] font-bold flex items-center justify-center shadow-md shadow-orange-500/25"
              title={myOwnedRoom ? 'Xonaga kirish' : 'Xona yaratish'}
              aria-label={myOwnedRoom ? 'Xonaga kirish' : 'Xona yaratish'}
            >
              <span aria-hidden="true" className="text-lg leading-none">
                🏛️
              </span>
              <span
                aria-hidden="true"
                className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#080B14] text-amber-300 text-xs font-black leading-none"
              >
                +
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('wallet')}
              className="min-h-[40px] px-3 rounded-xl bg-[#0F1524] border border-white/10 flex items-center gap-1.5 text-xs font-mono tabular-nums text-[#E5B84B]"
            >
              <Coins className="w-4 h-4" />
              <span>{formatCoins(currentUser.coinBalance)}</span>
            </button>
            <button
              type="button"
              onClick={() => navigateTo('notifications')}
              className="min-h-[40px] min-w-[40px] rounded-xl bg-[#0F1524] border border-white/10 flex items-center justify-center text-slate-300 relative"
              aria-label="Bildirishnomalar"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-[10px] font-mono text-white flex items-center justify-center">
                  {unreadNotifs}
                </span>
              )}
            </button>
          </div>
        </header>
        )}

        {/* Active View */}
        <main
          className={
            isInRoomFullscreen
              ? 'flex-1 h-full w-full overflow-hidden p-0'
              : 'flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto'
          }
        >
          {activeTab === 'home' && (
            <HomeView
              currentUser={currentUser}
              rooms={rooms}
              users={users}
              ribbonLogos={ribbonLogos}
              isStaff={isStaff}
              onOpenManageLogos={() => {
                setAdminInitialTab('logos');
                setActiveTab('admin');
              }}
              onOpenDirectChat={(partnerId) => {
                setDmPartnerId(partnerId);
                setActiveTab('messages');
              }}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onJoinRoom={(r) => enterRoom(r)}
              onOpenUserProfile={(u) => {
                setInspectedUser(u);
                setActiveTab('profile');
              }}
            />
          )}

          {activeTab === 'room' && activeRoom && (
            <VoiceRoomView
              room={activeRoom}
              currentUser={currentUser}
              allUsers={users}
              pkBattles={pkBattles}
              serviceStatus={serviceStatus}
              messages={roomMessages}
              lastGiftEvent={lastGiftEvent}
              lastUserEntry={lastUserEntry}
              analyticsSyncTick={analyticsSyncTick}
              djSyncTick={djSyncTick}
              liveMusicState={liveMusicState?.roomId === activeRoom.id ? liveMusicState : null}
              lastRocketLaunch={lastRocketLaunch}
              cpSyncTick={cpSyncTick}
              roomVoiceEffects={roomVoiceEffects}
              onBroadcastVoiceEffect={(effectMode) => {
                if (currentUser?.id) {
                  setRoomVoiceEffects((prev) => ({ ...prev, [currentUser.id]: effectMode }));
                }
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                  wsRef.current.send(
                    JSON.stringify({ event: 'room:voice_effect', payload: { effectMode } })
                  );
                }
              }}
              onGiftSent={enqueueGiftEffect}
              onExit={exitRoom}
              onClearedChat={() => setRoomMessages([])}
              onRoomUpdated={(updated) => {
                setActiveRoom(updated);
                setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
              }}
              onUserUpdated={(u) => {
                setCurrentUser(u);
                setActiveRoom((prev) =>
                  prev
                    ? {
                        ...prev,
                        seats: prev.seats.map((s) =>
                          s.user && s.user.id === u.id ? { ...s, user: { ...s.user, ...u } } : s
                        ),
                      }
                    : prev
                );
              }}
              onOpenUserProfile={(u) => {
                setInspectedUser(u);
                setActiveTab('profile');
              }}
            />
          )}

          {activeTab === 'messages' && (
            <MessagesView
              currentUser={currentUser}
              allUsers={users}
              serviceStatus={serviceStatus}
              initialPartnerId={dmPartnerId}
              incomingDm={incomingDm}
              onOpenUserProfile={(u) => {
                setInspectedUser(u);
                setActiveTab('profile');
              }}
            />
          )}

          {(activeTab === 'wallet' || activeTab === 'vip') && (
            <WalletVipView
              currentUser={currentUser}
              initialSubTab={activeTab === 'vip' ? 'vip' : 'wallet'}
              onUserUpdated={(u) => setCurrentUser(u)}
            />
          )}

          {(activeTab === 'pk' || activeTab === 'agency') && (
            <PkAgencyView
              currentUser={currentUser}
              rooms={rooms}
              initialSubTab={activeTab === 'agency' ? 'agency' : 'pk'}
              onJoinRoomById={handleJoinRoomById}
            />
          )}

          {activeTab === 'games' && (
            <GamesHubView
              currentUser={currentUser}
              onUserUpdated={(u) => setCurrentUser(u)}
            />
          )}

          {activeTab === 'cp' && (
            <CpLoveHouseView
              currentUser={currentUser}
              allUsers={users}
              cpSyncTick={cpSyncTick}
              onUserUpdated={(u) => setCurrentUser(u)}
              onJoinRoomById={handleJoinRoomById}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView
              onJoinRoomById={handleJoinRoomById}
              onOpenUserById={handleOpenUserById}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsView
              notifications={notifications}
              onMarkAllRead={async () => {
                await apiFetch('/api/notifications/read-all', { method: 'POST' });
                setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
              }}
              onAction={(url) => {
                if (!url) return;
                if (url.startsWith('room:')) {
                  handleJoinRoomById(url.slice(5));
                } else if (url.startsWith('messages:')) {
                  setDmPartnerId(url.slice(9));
                  setActiveTab('messages');
                } else if (
                  url === 'messages' ||
                  url === 'wallet' ||
                  url === 'vip' ||
                  url === 'cp' ||
                  url === 'pk' ||
                  url === 'agency'
                ) {
                  setActiveTab(url);
                }
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              profileUser={inspectedUser || currentUser}
              currentUser={currentUser}
              onUserUpdated={(u) => {
                setCurrentUser(u);
                if (!inspectedUser || inspectedUser.id === u.id) setInspectedUser(u);
              }}
              onGiftSent={enqueueGiftEffect}
              onStartMessage={(uid) => {
                setDmPartnerId(uid);
                setActiveTab('messages');
              }}
              onBack={() => setActiveTab('home')}
              onOpenAgency={() => setActiveTab('agency')}
              onOpenSettings={() => setActiveTab('settings')}
              onOpenWallet={() => setActiveTab('wallet')}
              onOpenVip={() => setActiveTab('vip')}
              onOpenCp={() => setActiveTab('cp')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              serviceStatus={serviceStatus}
              onUserUpdated={(u) => setCurrentUser(u)}
              onLogout={handleLogout}
            />
          )}

          {activeTab === 'admin' && isStaff && (
            <AdminPanelView
              currentUser={currentUser}
              rooms={rooms}
              initialTab={adminInitialTab}
              onRefreshRooms={loadWorkspaceData}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (5 primary destinations, thumb zone) */}
      {activeTab !== 'room' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 pb-safe bg-[#0B101D]/95 backdrop-blur-md border-t border-white/[0.08] grid grid-cols-5 items-center">
          {[
            { id: 'home' as NavTab, label: 'Asosiy', icon: Home },
            { id: 'games' as NavTab, label: 'O‘yinlar', icon: Gamepad2 },
            { id: 'messages' as NavTab, label: 'Xabar', icon: MessageSquare },
            { id: 'wallet' as NavTab, label: 'Hamyon', icon: Wallet },
            { id: 'profile' as NavTab, label: 'Profil', icon: UserIcon },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigateTo(t.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] ${
                  active ? 'text-[#E5B84B]' : 'text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium mt-1 whitespace-nowrap">{t.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Mobile Slide-Over Drawer for Secondary Sections */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 max-w-[82vw] bg-[#0B101D] border-r border-white/10 h-full flex flex-col">
            <div className="h-14 px-5 flex items-center justify-between border-b border-white/[0.07]">
              <span className="font-display text-lg font-extrabold text-white">
                TURON <span className="text-[#E5B84B]">CHAT</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigateTo(item.id)}
                    className={`w-full min-h-[44px] px-3.5 rounded-xl flex items-center justify-between text-sm font-medium ${
                      active ? 'bg-blue-600/20 text-white' : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-[#E5B84B]" />
                      <span>{item.label}</span>
                    </span>
                    {item.badge && item.badge > 0 ? (
                      <span className="font-mono text-xs text-[#E5B84B]">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Private Room Password Prompt */}
      {passwordPromptRoom && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0F1524] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base font-semibold text-white">
                Yopiq xona · Parol kiriting
              </h4>
              <button
                type="button"
                onClick={() => {
                  setPasswordPromptRoom(null);
                  setRoomEnterError('');
                }}
                className="text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {roomEnterError && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {roomEnterError}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enterRoom(passwordPromptRoom, roomPasswordInput);
              }}
              className="space-y-3"
            >
              <input
                type="password"
                required
                value={roomPasswordInput}
                onChange={(e) => setRoomPasswordInput(e.target.value)}
                placeholder="Xona paroli"
                className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white"
              />
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-blue-600 text-white font-semibold text-sm"
              >
                Xonaga kirish
              </button>
            </form>
          </div>
        </div>
      )}
      {/* CP Partner Online Reminder Toast */}
      {cpOnlineToast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm px-4 py-3 rounded-2xl bg-gradient-to-r from-[#2E0A47] to-[#4C1D95] border border-pink-400/60 shadow-2xl flex items-center gap-3 text-xs text-white">
          <Heart className="w-4 h-4 text-pink-400 fill-pink-400 shrink-0" />
          <span className="flex-1 font-medium">{cpOnlineToast}</span>
          <button
            type="button"
            onClick={() => setCpOnlineToast(null)}
            className="text-pink-200 hover:text-white"
            aria-label="Yopish"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Real-Time Game Outcome Toasts */}
      <GameOutcomeToastContainer toasts={gameToasts} onDismiss={dismissGameToast} />

      {/* One-time Room Creation Modal from 🏛️ Header Button */}
      {showCreateRoomModal && (
        <CreateRoomModal
          onClose={() => setShowCreateRoomModal(false)}
          onRoomCreatedAndEnter={(room) => {
            setRooms((prev) => (prev.some((r) => r.id === room.id) ? prev : [room, ...prev]));
            setShowCreateRoomModal(false);
            enterRoom(room);
          }}
        />
      )}

      {/* Automatic Full-Screen Gift Effect Overlay (Rooms + Profiles, Queued) */}
      <Gift3DEffectOverlay
        giftEvent={giftEffectQueue[0] || null}
        queueCount={Math.max(0, giftEffectQueue.length - 1)}
        onDismiss={dismissActiveGiftEffect}
      />

      {/* Onboarding Flow for New Users */}
      {showOnboarding && currentUser && (
        <OnboardingModal
          currentUser={currentUser}
          onComplete={(updated) => {
            setCurrentUser(updated);
            localStorage.setItem(`turon_onboarded_${updated.id}`, 'true');
            setShowOnboarding(false);
          }}
          onSkip={() => {
            localStorage.setItem(`turon_onboarded_${currentUser.id}`, 'true');
            setShowOnboarding(false);
          }}
        />
      )}
    </div>
  );
}
