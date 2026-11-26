import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioWaveform,
  Award,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Forward,
  Gamepad2,
  Gift,
  Heart,
  LayoutGrid,
  Link2,
  Lock,
  Mic,
  MicOff,
  Music,
  Play,
  Plus,
  Power,
  Rocket,
  Send,
  Settings,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  X,
  Unlock,
  UserX,
  Ban,
  Swords,
  Tv,
  MessageCircle,
  Zap,
} from 'lucide-react';
import { Room as LiveKitRoom, RoomEvent, Track } from 'livekit-client';
import { apiFetch, formatCoins, formatUzTime, getRoleShortLabel } from '../lib/api';
import { AvatarWithFrame } from './AvatarWithFrame';
import { RoleBadge, getRoleVisuals } from './RoleBadge';
import { GiftShopModal, renderGiftIcon } from './GiftShopModal';
import { GamesHubView } from './GamesHubView';
import { GAMES_CATALOG } from './gamesCatalog';
import { GameThumbnail } from './GameArtwork';
import { RocketRibbonManagerModal } from './RocketRibbonManagerModal';
import { RoomMusicModal } from './RoomMusicModal';
import { RoomSettingsSheet } from './RoomSettingsSheet';
import { YouTubePickerModal } from './YouTubePickerModal';
import type { RoomGiftEffectEvent } from './Gift3DEffectOverlay';
import { RoomEntryBannerConfetti } from './RoomEntryBannerConfetti';
import { RoomAnalyticsModal } from './RoomAnalyticsModal';
import { VoiceEffectsModal } from './VoiceEffectsModal';
import { VoiceEffectFloatPanel, VoiceEffectFloatTrigger } from './VoiceEffectFloatPanel';
import { DynamicRoomBackground } from './DynamicRoomBackground';
import { FrameStoreModal } from './FrameStoreModal';
import { VoiceMessagePlayer, VoiceRecorderButton } from './VoiceMessageControl';
import {
  OutputEqProcessor,
  VoiceEffectProcessor,
  getVoiceEffectShortLabel,
  loadVoiceAudioSettings,
  loadVoiceEffectMode,
  saveVoiceAudioSettings,
  saveVoiceEffectMode,
} from '../lib/voiceEffects';
import {
  ROCKET_TIERS,
  RoomRocketLaunchBanner,
  RoomRocketModal,
  TuronRocketSvg,
} from './RoomRocketWidget';
import type {
  CpRelationship,
  PkBattle,
  RoomMessage,
  RoomMusicState,
  RoomUserEntryEvent,
  ServiceConfigStatus,
  UserProfile,
  VoiceAudioSettings,
  VoiceEffectMode,
  VoiceRoom,
} from '../types/turon';

interface VoiceRoomViewProps {
  room: VoiceRoom;
  currentUser: UserProfile;
  allUsers: UserProfile[];
  pkBattles: PkBattle[];
  serviceStatus: ServiceConfigStatus;
  messages: RoomMessage[];
  lastGiftEvent: any;
  lastUserEntry?: RoomUserEntryEvent | null;
  analyticsSyncTick?: number;
  djSyncTick?: number;
  liveMusicState?: RoomMusicState | null;
  lastRocketLaunch?: { roomId: string; rocketLevel: number; launchedBy: string } | null;
  cpSyncTick?: number;
  roomVoiceEffects?: Record<string, VoiceEffectMode>;
  onBroadcastVoiceEffect?: (mode: VoiceEffectMode) => void;
  onGiftSent?: (event: RoomGiftEffectEvent) => void;
  onDismissGift?: () => void;
  onExit: () => void;
  onClearedChat?: () => void;
  onRoomUpdated: (room: VoiceRoom) => void;
  onUserUpdated: (user: UserProfile) => void;
  onOpenUserProfile: (user: UserProfile) => void;
}

const THEME_GRADIENTS: Record<string, string> = {
  sapphire: 'from-[#0B1633] via-[#090F22] to-[#080B14]',
  amethyst: 'from-[#1D1036] via-[#100B24] to-[#080B14]',
  gold: 'from-[#221A0B] via-[#12101A] to-[#080B14]',
  obsidian: 'from-[#111622] via-[#0A0D16] to-[#080B14]',
};

const DEFAULT_RIBBON_GAME_IDS = [
  'greedy-pro',
  'ludo',
  'carrom',
  'oltin-omad',
  'omadli-meva',
  'ochkoz-quti',
];

export const VoiceRoomView: React.FC<VoiceRoomViewProps> = ({
  room,
  currentUser,
  allUsers,
  pkBattles,
  serviceStatus,
  messages,
  lastGiftEvent,
  lastUserEntry = null,
  analyticsSyncTick = 0,
  liveMusicState = null,
  lastRocketLaunch,
  cpSyncTick = 0,
  roomVoiceEffects = {},
  onBroadcastVoiceEffect,
  onGiftSent,
  onExit,
  onClearedChat,
  onRoomUpdated,
  onUserUpdated,
  onOpenUserProfile,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [initialRibbonGameId, setInitialRibbonGameId] = useState<string | null>(null);
  const [showRocketModal, setShowRocketModal] = useState(false);
  const [showRibbonManager, setShowRibbonManager] = useState(false);
  const [ribbonManagerTab, setRibbonManagerTab] = useState<'rocket' | 'games'>('rocket');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showVoiceEffectsModal, setShowVoiceEffectsModal] = useState(false);
  const [showVoiceEffectFloat, setShowVoiceEffectFloat] = useState(false);
  const [showRoomFramesModal, setShowRoomFramesModal] = useState(false);
  const [giftTargetId, setGiftTargetId] = useState<string>(room.ownerId);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showYouTubePicker, setShowYouTubePicker] = useState(false);
  const [showRoomTools, setShowRoomTools] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const [chatFilter, setChatFilter] = useState<'all' | 'text' | 'gift'>('all');
  const [selectedSeatNum, setSelectedSeatNum] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [livekitConnected, setLivekitConnected] = useState(false);
  const [livekitError, setLivekitError] = useState('');
  const [activeCpId, setActiveCpId] = useState<string | null>(null);

  // Voice Effects & Audio Settings state
  const [voiceEffectMode, setVoiceEffectMode] = useState<VoiceEffectMode>(() =>
    loadVoiceEffectMode()
  );
  const [voiceSettings, setVoiceSettings] = useState<VoiceAudioSettings>(() =>
    loadVoiceAudioSettings()
  );
  const [voiceMonitorEnabled, setVoiceMonitorEnabled] = useState(false);
  const [voiceMicError, setVoiceMicError] = useState('');

  // Bottom-right rotating ribbons (Top: Games, Bottom: Rocket)
  const [gameRibbonIdx, setGameRibbonIdx] = useState(0);
  const [gameRibbonPaused, setGameRibbonPaused] = useState(false);
  const [rocketRibbonIdx, setRocketRibbonIdx] = useState(0);
  const [rocketRibbonPaused, setRocketRibbonPaused] = useState(false);

  // Room Muzik player state (phone audio uploads + synced playback)
  const [musicState, setMusicState] = useState<RoomMusicState | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [musicVolume, setMusicVolume] = useState<number>(0.85);
  const [musicTimeSec, setMusicTimeSec] = useState<number>(0);
  const [musicDurationSec, setMusicDurationSec] = useState<number>(0);
  const [musicAutoplayBlocked, setMusicAutoplayBlocked] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const lkRoomRef = useRef<LiveKitRoom | null>(null);
  const voiceProcessorRef = useRef<VoiceEffectProcessor | null>(null);
  const outputEqRef = useRef<OutputEqProcessor | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastMusicTrackIdRef = useRef<string | null>(null);
  const lastMusicUpdatedAtRef = useRef<string | null>(null);

  const isOwner = room.ownerId === currentUser.id;
  const isRoomMod = room.moderatorIds.includes(currentUser.id);
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(currentUser.role);
  const canManageRoom = isOwner || isRoomMod || isStaff;

  const mySeat = useMemo(
    () => room.seats.find((s) => s.userId === currentUser.id) || null,
    [room.seats, currentUser.id]
  );

  const activePk = useMemo(
    () =>
      pkBattles.find(
        (pk) =>
          pk.status === 'active' &&
          (pk.roomAId === room.id || pk.roomBId === room.id)
      ) || null,
    [pkBattles, room.id]
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Fetch room music playlist & playback state on room join
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ music: RoomMusicState }>(`/api/rooms/${room.id}/music`)
      .then((res) => {
        if (!cancelled && res.music) {
          setMusicState(res.music);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [room.id]);

  // Apply real-time WebSocket music updates
  useEffect(() => {
    if (liveMusicState && liveMusicState.roomId === room.id) {
      setMusicState(liveMusicState);
    }
  }, [liveMusicState, room.id]);

  // Keep <audio> element synced with room musicState
  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;
    audio.volume = musicVolume;
  }, [musicVolume]);

  useEffect(() => {
    const audio = musicAudioRef.current;
    if (!audio) return;

    const track = musicState?.currentTrack || null;
    if (!track) {
      audio.pause();
      if (audio.getAttribute('src')) {
        audio.removeAttribute('src');
        audio.load();
      }
      lastMusicTrackIdRef.current = null;
      lastMusicUpdatedAtRef.current = null;
      setMusicTimeSec(0);
      setMusicDurationSec(0);
      setMusicAutoplayBlocked(false);
      return;
    }

    const trackChanged = lastMusicTrackIdRef.current !== track.id;
    const stateTimestampChanged = lastMusicUpdatedAtRef.current !== (musicState?.updatedAt || null);

    if (trackChanged) {
      lastMusicTrackIdRef.current = track.id;
      audio.src = track.audioUrl;
      audio.load();
      setMusicDurationSec(track.durationSec || 0);
    }

    if (trackChanged || stateTimestampChanged) {
      lastMusicUpdatedAtRef.current = musicState?.updatedAt || null;
      const targetPos = Number(musicState?.positionSec || 0);
      if (Number.isFinite(targetPos) && Math.abs((audio.currentTime || 0) - targetPos) > 2.5) {
        try {
          audio.currentTime = targetPos;
          setMusicTimeSec(targetPos);
        } catch {
          // ignore until metadata loaded
        }
      }
    }

    if (musicState?.isPlaying) {
      audio
        .play()
        .then(() => setMusicAutoplayBlocked(false))
        .catch(() => setMusicAutoplayBlocked(true));
    } else {
      audio.pause();
      setMusicAutoplayBlocked(false);
    }
  }, [musicState]);

  // Cleanup audio on exit/unmount
  useEffect(() => {
    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
      }
    };
  }, []);

  // Connect real LiveKit audio ONLY if LiveKit is configured on the server
  useEffect(() => {
    if (!serviceStatus.livekitConfigured) return;

    let cancelled = false;
    const lkRoom = new LiveKitRoom();
    lkRoomRef.current = lkRoom;
    const remoteAudioEls = new Map<string, HTMLMediaElement>();

    lkRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.autoplay = true;
        document.body.appendChild(el);
        remoteAudioEls.set(track.sid || String(Date.now()), el);
        if (!outputEqRef.current) {
          outputEqRef.current = new OutputEqProcessor();
          outputEqRef.current.setEq(voiceSettings.bassDb, voiceSettings.trebleDb);
        }
        outputEqRef.current.attachMediaElement(el);
      }
    });

    lkRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        track.detach().forEach((el) => el.remove());
        if (track.sid && remoteAudioEls.has(track.sid)) {
          remoteAudioEls.get(track.sid)?.remove();
          remoteAudioEls.delete(track.sid);
        }
      }
    });

    async function connectLiveKit() {
      try {
        const res = await apiFetch<{ configured: boolean; url: string; token: string }>(
          '/api/livekit/token',
          {
            method: 'POST',
            body: JSON.stringify({ roomId: room.id, canPublish: Boolean(mySeat) }),
          }
        );
        if (cancelled) return;
        await lkRoom.connect(res.url, res.token);
        if (!cancelled) setLivekitConnected(true);
        lkRoom.on(RoomEvent.Disconnected, () => {
          if (!cancelled) setLivekitConnected(false);
        });
      } catch (err: any) {
        if (!cancelled) setLivekitError(err.message || 'LiveKit ulanish xatosi');
      }
    }

    connectLiveKit();

    return () => {
      cancelled = true;
      remoteAudioEls.forEach((el) => el.remove());
      remoteAudioEls.clear();
      lkRoom.disconnect();
      lkRoomRef.current = null;
      setLivekitConnected(false);
    };
  }, [room.id, serviceStatus.livekitConfigured]);

  // Sync local microphone track & active voice effect when seated / muted if LiveKit is connected
  useEffect(() => {
    const lk = lkRoomRef.current;
    if (!lk || !livekitConnected) return;
    const shouldEnableMic = Boolean(mySeat && !mySeat.isMuted);
    lk.localParticipant
      .setMicrophoneEnabled(shouldEnableMic)
      .then(async () => {
        if (
          shouldEnableMic &&
          (voiceEffectMode !== 'normal' ||
            voiceSettings.gain !== 1.0 ||
            voiceSettings.noiseSuppression !== 'low')
        ) {
          await applyVoiceEffects(voiceEffectMode, voiceMonitorEnabled, voiceSettings);
        }
      })
      .catch(() => {});
  }, [mySeat?.seatNumber, mySeat?.isMuted, livekitConnected]);

  // Broadcast active voice effect mode whenever entering room or taking a seat
  useEffect(() => {
    if (voiceEffectMode !== 'normal') {
      onBroadcastVoiceEffect?.(voiceEffectMode);
    }
  }, [room.id]);

  // Fetch active CP ID so unmuted microphone earns +1 intimacy per minute (up to 180/day)
  useEffect(() => {
    apiFetch<{ activeCp: CpRelationship | null }>('/api/cp')
      .then((res) => setActiveCpId(res.activeCp?.id || null))
      .catch(() => {});
  }, [cpSyncTick, currentUser.id]);

  useEffect(() => {
    if (!activeCpId || !mySeat || mySeat.isMuted) return;
    const timer = setInterval(() => {
      apiFetch(`/api/cp/${activeCpId}/mic-tick`, { method: 'POST' }).catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, [activeCpId, mySeat?.seatNumber, mySeat?.isMuted]);

  // Cleanup voice processor & output EQ on unmount
  useEffect(() => {
    return () => {
      voiceProcessorRef.current?.dispose();
      voiceProcessorRef.current = null;
      outputEqRef.current?.dispose();
      outputEqRef.current = null;
    };
  }, []);

  // Sync output EQ settings (Bass/Treble)
  useEffect(() => {
    if (!outputEqRef.current) {
      outputEqRef.current = new OutputEqProcessor();
    }
    outputEqRef.current.setEq(voiceSettings.bassDb, voiceSettings.trebleDb);
    voiceProcessorRef.current?.setAudioSettings(voiceSettings);
  }, [voiceSettings]);

  const ribbonGames = useMemo(() => {
    const ids =
      room.gameRibbonIds && room.gameRibbonIds.length > 0
        ? room.gameRibbonIds
        : DEFAULT_RIBBON_GAME_IDS;
    const mapped = ids
      .map((id) => GAMES_CATALOG.find((g) => g.id === id))
      .filter((g): g is (typeof GAMES_CATALOG)[number] => Boolean(g));
    return mapped.length > 0 ? mapped : GAMES_CATALOG.slice(0, 6);
  }, [room.gameRibbonIds]);

  const rocketSlidesCount = 3 + (room.rocketRibbonItems?.length || 0);

  useEffect(() => {
    setRocketRibbonIdx((prev) => (prev >= rocketSlidesCount ? 0 : prev));
  }, [rocketSlidesCount]);

  useEffect(() => {
    setGameRibbonIdx((prev) => (prev >= ribbonGames.length ? 0 : prev));
  }, [ribbonGames.length]);

  // Auto-rotate bottom-right room rocket ribbon sequentially
  useEffect(() => {
    if (rocketRibbonPaused || rocketSlidesCount <= 1) return;
    const timer = window.setInterval(() => {
      setRocketRibbonIdx((prev) => (prev + 1) % rocketSlidesCount);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [rocketRibbonPaused, rocketSlidesCount]);

  // Auto-rotate top games ribbon sequentially
  useEffect(() => {
    if (gameRibbonPaused || ribbonGames.length <= 1) return;
    const timer = window.setInterval(() => {
      setGameRibbonIdx((prev) => (prev + 1) % ribbonGames.length);
    }, 3400);
    return () => window.clearInterval(timer);
  }, [gameRibbonPaused, ribbonGames.length]);

  async function applyVoiceEffects(
    nextMode: VoiceEffectMode,
    nextMonitor: boolean,
    nextSettings: VoiceAudioSettings = voiceSettings
  ) {
    setVoiceMicError('');
    try {
      const hasCustomMicSettings =
        nextSettings.gain !== 1.0 || nextSettings.noiseSuppression !== 'low';
      if (nextMode === 'normal' && !nextMonitor && !hasCustomMicSettings) {
        if (lkRoomRef.current && livekitConnected && mySeat && !mySeat.isMuted) {
          await lkRoomRef.current.localParticipant.setMicrophoneEnabled(false);
          await lkRoomRef.current.localParticipant.setMicrophoneEnabled(true);
        }
        voiceProcessorRef.current?.dispose();
        voiceProcessorRef.current = null;
        return;
      }

      if (!voiceProcessorRef.current) {
        voiceProcessorRef.current = new VoiceEffectProcessor();
      }
      const proc = voiceProcessorRef.current;
      proc.setMonitorEnabled(nextMonitor);
      proc.setAudioSettings(nextSettings);
      proc.setMode(nextMode);
      await proc.init();

      const processedTrack = proc.getProcessedTrack();
      if (processedTrack && lkRoomRef.current && livekitConnected && mySeat && !mySeat.isMuted) {
        const micPub = lkRoomRef.current.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPub?.track) {
          await (micPub.track as any).replaceTrack(processedTrack);
        }
      }
    } catch (err: any) {
      setVoiceMicError(
        err?.message || 'Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan mikrofonni yoqing.'
      );
    }
  }

  async function handleSelectVoiceEffect(mode: VoiceEffectMode) {
    setVoiceEffectMode(mode);
    saveVoiceEffectMode(mode);
    onBroadcastVoiceEffect?.(mode);
    await applyVoiceEffects(mode, voiceMonitorEnabled, voiceSettings);
  }

  async function handleUpdateVoiceSettings(next: VoiceAudioSettings) {
    setVoiceSettings(next);
    saveVoiceAudioSettings(next);
    if (
      voiceProcessorRef.current ||
      next.gain !== 1.0 ||
      next.noiseSuppression !== 'low'
    ) {
      await applyVoiceEffects(voiceEffectMode, voiceMonitorEnabled, next);
    }
  }

  async function handleToggleVoiceMonitor() {
    const next = !voiceMonitorEnabled;
    setVoiceMonitorEnabled(next);
    await applyVoiceEffects(voiceEffectMode, next, voiceSettings);
  }

  async function handleTakeSeat(seatNumber: number) {
    setActionError('');
    if (seatNumber === 1 && !isOwner) {
      setActionError("Egasi o‘rniga faqat xona egasi chiqa oladi");
      return;
    }
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(
        `/api/rooms/${room.id}/seats/${seatNumber}/take`,
        { method: 'POST' }
      );
      onRoomUpdated(res.room);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  async function handleLeaveSeat() {
    setActionError('');
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}/seats/leave`, {
        method: 'POST',
      });
      onRoomUpdated(res.room);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  async function handleSeatAction(
    seatNumber: number,
    action: 'mute' | 'unmute' | 'lock' | 'unlock' | 'kick'
  ) {
    setActionError('');
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(
        `/api/rooms/${room.id}/seats/${seatNumber}/action`,
        {
          method: 'POST',
          body: JSON.stringify({ action }),
        }
      );
      onRoomUpdated(res.room);
      setSelectedSeatNum(null);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  async function handleToggleModerator(userId: string) {
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}/moderators`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      onRoomUpdated(res.room);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  async function handleBanUser(userId: string) {
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}/ban`, {
        method: 'POST',
        body: JSON.stringify({ userId, reason: 'Xona qoidalarini buzish' }),
      });
      onRoomUpdated(res.room);
      setSelectedSeatNum(null);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || sendingMsg) return;
    setSendingMsg(true);
    setActionError('');
    try {
      await apiFetch(`/api/rooms/${room.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: chatInput.trim() }),
      });
      setChatInput('');
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSendingMsg(false);
    }
  }

  async function handleSendVoiceMessage(payload: { audioUrl: string; durationSec: number }) {
    setActionError('');
    await apiFetch(`/api/rooms/${room.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content: 'Ovozli xabar',
        msgType: 'voice',
        audioUrl: payload.audioUrl,
        audioDurationSec: payload.durationSec,
      }),
    });
  }

  async function handleSelectYouTubeVideo(videoUrl: string, videoTitle: string) {
    setActionError('');
    const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        roomType: 'video',
        videoUrl,
        videoTitle,
      }),
    });
    onRoomUpdated(res.room);
  }

  async function handleSwitchToChatMode() {
    setActionError('');
    try {
      const res = await apiFetch<{ room: VoiceRoom }>(`/api/rooms/${room.id}`, {
        method: 'PUT',
        body: JSON.stringify({ roomType: 'chat' }),
      });
      onRoomUpdated(res.room);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  async function handleInviteUser(targetUserId: string) {
    try {
      await apiFetch(`/api/rooms/${room.id}/invite`, {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
      setShowInvite(false);
    } catch (err: any) {
      setActionError(err.message);
    }
  }

  const seatedUsers = room.seats
    .map((s) => s.user)
    .filter((u): u is UserProfile => Boolean(u));

  const giftRecipients =
    seatedUsers.length > 0
      ? seatedUsers
      : room.owner
      ? [room.owner]
      : [];

  const activeSeatObj =
    selectedSeatNum !== null
      ? room.seats.find((s) => s.seatNumber === selectedSeatNum) || null
      : null;

  const pkTotal = activePk ? Math.max(1, activePk.scoreA + activePk.scoreB) : 1;
  const pkPercentA = activePk ? Math.round((activePk.scoreA / pkTotal) * 100) : 50;

  const filteredMessages = useMemo(() => {
    if (chatFilter === 'text') {
      return messages.filter((m) => m.msgType === 'text' || m.msgType === 'voice');
    }
    if (chatFilter === 'gift') return messages.filter((m) => m.msgType === 'gift');
    return messages;
  }, [messages, chatFilter]);

  const roomScore = useMemo(
    () => (room.rocketLevel || 1) * 10000 + (room.rocketProgressPct || 0) * 100 + room.viewerCount * 150,
    [room.rocketLevel, room.rocketProgressPct, room.viewerCount]
  );

  function handleQuickTakeGuestSeat() {
    const free = room.seats.find((s) => (isOwner || s.seatNumber !== 1) && !s.userId && !s.isLocked);
    if (free) {
      handleTakeSeat(free.seatNumber);
    } else {
      setActionError("Bo'sh mikrofon o'rni qolmadi");
    }
  }

  const hostSeat = room.seats[0] || null;
  const guestSeats = room.roomType === 'video' ? room.seats : room.seats.slice(1);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-gradient-to-b ${
        THEME_GRADIENTS[room.backgroundTheme] || THEME_GRADIENTS.sapphire
      } flex flex-col justify-between`}
    >
      {/* Animated Dynamic Room Backdrop */}
      <DynamicRoomBackground dynamicBg={room.dynamicBg || 'campfire-night'} />

      {/* Top Section: Header + Score/Category/Muzik + Notifications */}
      <div className="relative z-10 shrink-0 flex flex-col">
        {/* Room Top Header */}
        <div className="px-3 sm:px-6 pt-2.5 sm:pt-3.5 pb-1 sm:pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                if (room.owner) onOpenUserProfile(room.owner);
              }}
              className="relative w-10 h-10 rounded-full p-0.5 border border-[#E5B84B]/80 shadow-[0_0_14px_rgba(229,184,75,0.3)] overflow-hidden shrink-0 bg-[#0B1224]"
              title={room.owner?.nickname || room.title}
            >
              <img
                src={room.coverUrl || room.owner?.avatarUrl}
                alt={room.title}
                referrerPolicy="no-referrer"
                className="w-full h-full rounded-full object-cover"
              />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-display text-sm sm:text-base font-bold text-white truncate max-w-[165px] sm:max-w-[300px]">
                  {room.title}
                </h2>
                {room.isPrivate && <Lock className="w-3.5 h-3.5 text-[#E5B84B] shrink-0" />}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-300/90">
                <span className="font-mono truncate max-w-[130px] sm:max-w-[200px]">
                  ID:{room.id}
                </span>
                <button
                  type="button"
                  onClick={() => setShowParticipants(true)}
                  className="inline-flex items-center gap-1 hover:text-white transition-colors font-mono tabular-nums"
                  title="Ishtirokchilar"
                >
                  <Users className="w-3 h-3 text-slate-300" />
                  <span>{room.viewerCount}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => (canManageRoom ? setShowSettings(true) : setShowRoomTools(true))}
              className="min-h-[40px] min-w-[40px] rounded-full hover:bg-white/10 text-white/90 flex items-center justify-center transition-colors"
              aria-label="Xona sozlamalari"
              title="Xona sozlamalari"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="min-h-[40px] min-w-[40px] rounded-full hover:bg-white/10 text-white/90 flex items-center justify-center transition-colors"
              aria-label="Taklif qilish"
              title="Do‘stlarni taklif qilish"
            >
              <Forward className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onExit}
              className="min-h-[40px] min-w-[40px] rounded-full hover:bg-red-500/20 text-white/90 hover:text-red-200 flex items-center justify-center transition-colors"
              aria-label="Xonadan chiqish"
              title="Xonadan chiqish"
            >
              <Power className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Second Row: Trophy Score + Category + Muzik (single line, no wrap overflow) */}
        <div className="px-3 sm:px-6 pb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto w-full">
            <button
              type="button"
              onClick={() => setShowAnalyticsModal(true)}
              className="shrink-0 min-h-[28px] px-2.5 py-0.5 rounded-full bg-black/40 hover:bg-black/55 backdrop-blur-md border border-white/10 text-[11px] sm:text-xs font-semibold text-white flex items-center gap-1 transition-colors"
              title="Xona Analitikasi"
            >
              <Trophy className="w-3.5 h-3.5 text-[#FBBF24]" />
              <span className="font-mono tabular-nums">{formatCoins(roomScore)}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <span className="shrink-0 min-h-[28px] px-2.5 py-0.5 rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-[11px] sm:text-xs font-medium text-slate-200 flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>{room.category}</span>
            </span>

            <button
              type="button"
              onClick={() => setShowMusicModal(true)}
              className={`shrink-0 min-h-[28px] px-2.5 py-0.5 rounded-full backdrop-blur-md border text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all max-w-[130px] sm:max-w-[180px] ${
                musicState?.isPlaying
                  ? 'bg-[#E5B84B]/20 border-[#E5B84B]/60 text-[#FDE68A] shadow-[0_0_12px_rgba(229,184,75,0.22)]'
                  : 'bg-black/40 hover:bg-black/55 border-white/15 text-slate-100'
              }`}
              title="Muzik"
            >
              <Music className={`w-3.5 h-3.5 shrink-0 ${musicState?.isPlaying ? 'text-[#E5B84B] animate-pulse' : 'text-amber-300'}`} />
              <span className="truncate">
                {musicState?.isPlaying && musicState.currentTrack
                  ? musicState.currentTrack.title
                  : 'Muzik'}
              </span>
              {musicState?.tracks && musicState.tracks.length > 0 && !musicState.isPlaying && (
                <span className="text-[10px] px-1.5 rounded-full bg-white/10 text-slate-300 font-mono">
                  {musicState.tracks.length}
                </span>
              )}
            </button>

            {musicAutoplayBlocked && musicState?.isPlaying && (
              <button
                type="button"
                onClick={() => {
                  musicAudioRef.current
                    ?.play()
                    .then(() => setMusicAutoplayBlocked(false))
                    .catch(() => {});
                }}
                className="shrink-0 min-h-[28px] px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-[11px] font-semibold text-emerald-200 flex items-center gap-1 animate-pulse"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Eshitish</span>
              </button>
            )}
          </div>
        </div>

        {/* Room Entry Marquee Banner & Confetti Effect */}
        <RoomEntryBannerConfetti
          entryEvent={lastUserEntry && lastUserEntry.roomId === room.id ? lastUserEntry : null}
        />

        {/* Real-Time Room Rocket Launch Celebration */}
        <RoomRocketLaunchBanner
          launchEvent={
            lastRocketLaunch && lastRocketLaunch.roomId === room.id ? lastRocketLaunch : null
          }
        />

        {/* Wedding Room 1.1x Gift Bonus Banner */}
        {room.isWeddingRoom && (
          <div className="mx-3.5 sm:mx-6 mt-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-pink-600/30 via-purple-600/25 to-[#E5B84B]/25 border border-pink-400/45 flex items-center justify-between gap-2 text-xs backdrop-blur-md">
            <div className="flex items-center gap-2 text-pink-100 font-semibold">
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400/50 shrink-0" />
              <span>To‘y Xonasi · Barcha sovg‘alarga 1.1× bonus!</span>
            </div>
            <span className="font-mono font-bold text-[#FDE68A] shrink-0">1.1× BONUS</span>
          </div>
        )}

        {/* Active PK Battle Bar */}
        {activePk && (
          <div className="mx-3.5 sm:mx-6 mt-2 p-3 rounded-xl bg-black/50 backdrop-blur-md border border-[#E5B84B]/30">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                <Swords className="w-3.5 h-3.5 text-[#E5B84B]" />
                <span>{activePk.roomATitle}</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-[#E5B84B]">
                PK · {formatCoins(activePk.scoreA)} vs {formatCoins(activePk.scoreB)}
              </span>
              <span className="font-semibold text-purple-300">{activePk.roomBTitle}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-purple-900/60 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
                style={{ width: `${pkPercentA}%` }}
              />
            </div>
          </div>
        )}

        {/* Animated Gift Splash Notification */}
        {lastGiftEvent && lastGiftEvent.roomId === room.id && (
          <div className="mx-3.5 sm:mx-6 mt-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#E5B84B]/25 via-purple-600/25 to-blue-600/25 backdrop-blur-md border border-[#E5B84B]/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#E5B84B]/20 flex items-center justify-center text-[#E5B84B]">
                {renderGiftIcon(lastGiftEvent.giftIcon, 'w-5 h-5')}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-white">
                  {lastGiftEvent.senderNickname} → {lastGiftEvent.receiverNickname}
                </div>
                <div className="text-[11px] text-[#E5B84B]">
                  {lastGiftEvent.quantity}× {lastGiftEvent.giftName} ({formatCoins(lastGiftEvent.totalCoins)} Tanga)
                </div>
              </div>
            </div>
            <Sparkles className="w-4 h-4 text-[#E5B84B]" />
          </div>
        )}

        {actionError && (
          <div className="mx-3.5 sm:mx-6 mt-2 px-3.5 py-2 rounded-xl bg-red-950/80 backdrop-blur-md border border-red-500/40 text-xs text-red-200 flex items-center justify-between gap-2">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError('')}
              className="text-red-200 underline shrink-0"
            >
              Yopish
            </button>
          </div>
        )}
      </div>

      {/* Main Stage: Seats (Left/Top) + Translucent Hammasi Chat & Floating Widgets (Right/Bottom) */}
      <div className="relative z-10 flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-1.5 sm:gap-4 px-2.5 sm:px-6 pt-0.5 pb-1 overflow-hidden">
        {/* Left/Center: Video Cinema + Egasi Seat + 4x2 Circular Seats */}
        <div className="lg:col-span-7 shrink-0 flex flex-col justify-center gap-2 sm:gap-4">
          {room.roomType === 'video' && (
            <div className="rounded-2xl overflow-hidden bg-[#060912]/90 border border-purple-500/30 shadow-xl">
              {room.videoUrl ? (
                <div className="flex flex-col">
                  <div className="px-3.5 py-2 bg-[#11172A] border-b border-white/[0.07] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tv className="w-4 h-4 text-fuchsia-400 shrink-0" />
                      <span className="text-xs font-semibold text-white truncate">
                        {room.videoTitle || 'YouTube Video'}
                      </span>
                    </div>
                    {canManageRoom && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowYouTubePicker(true)}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/25 border border-purple-400/40 text-[11px] font-semibold text-purple-200 hover:bg-purple-600/40"
                        >
                          Boshqa video
                        </button>
                        <button
                          type="button"
                          onClick={handleSwitchToChatMode}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-[11px] font-medium text-slate-300 hover:text-white flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="aspect-video w-full bg-black">
                    <iframe
                      src={room.videoUrl}
                      title={room.videoTitle || 'YouTube Video'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              ) : (
                <div className="aspect-video w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#12162A] via-[#0B0F1D] to-[#1A102C]">
                  <button
                    type="button"
                    onClick={() => {
                      if (canManageRoom) setShowYouTubePicker(true);
                      else setActionError('Faqat xona egasi yoki moderator video tanlay oladi');
                    }}
                    className="group flex flex-col items-center gap-3 focus:outline-none"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-105 transition-transform">
                      <Play className="w-8 h-8 text-white fill-white ml-0.5" />
                    </div>
                    <div>
                      <div className="font-display text-base font-bold text-white">
                        Iltimos, videoni tanlang
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        YouTube qidiruvi yoki havola orqali video qo‘shing
                      </div>
                    </div>
                  </button>
                  {canManageRoom && (
                    <button
                      type="button"
                      onClick={handleSwitchToChatMode}
                      className="mt-4 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/10 text-xs text-slate-300"
                    >
                      Chat rejimiga qaytish
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Circular Mic Seats Matching Reference Screenshot */}
          <div className="space-y-2 sm:space-y-4 py-0.5">
            {/* Top Centered Egasi Seat (Strictly Owner-Only) */}
            {room.roomType !== 'video' && hostSeat && (() => {
              const occupant = hostSeat.user;
              const isSeatOwner = occupant?.id === room.ownerId;
              return (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => {
                      if (!occupant) {
                        if (!isOwner) {
                          setActionError("Egasi o‘rniga faqat xona egasi chiqa oladi");
                          return;
                        }
                        if (!hostSeat.isLocked) {
                          handleTakeSeat(hostSeat.seatNumber);
                        } else {
                          setSelectedSeatNum(hostSeat.seatNumber);
                        }
                      } else {
                        setSelectedSeatNum(hostSeat.seatNumber);
                      }
                    }}
                    className="group flex flex-col items-center gap-0.5 sm:gap-1.5 focus:outline-none"
                  >
                    <div
                      className={`relative w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-all ${
                        occupant
                          ? 'ring-2 ring-[#E5B84B]/80 shadow-[0_0_18px_rgba(229,184,75,0.35)] bg-[#0E1832]/85'
                          : 'bg-[#0F1B36]/75 border border-white/15 group-hover:border-[#E5B84B]/60 backdrop-blur-sm'
                      }`}
                    >
                      {occupant ? (
                        <>
                          <AvatarWithFrame
                            src={occupant.avatarUrl}
                            alt={occupant.nickname}
                            size="lg"
                            frameStyle={occupant.frameStyle}
                            vipLevel={occupant.vipLevel}
                            svipLevel={occupant.svipLevel}
                            role={occupant.role}
                            isSpeaking={!hostSeat.isMuted}
                            hasCpMicEffect={Boolean(
                              ((occupant.cpLevel ?? 0) >= 2 || occupant.isMarried) &&
                                !hostSeat.isMuted
                            )}
                          />
                          {hostSeat.isMuted && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 border border-[#080B14] flex items-center justify-center text-white">
                              <MicOff className="w-3 h-3" />
                            </span>
                          )}
                        </>
                      ) : hostSeat.isLocked ? (
                        <Lock className="w-6 h-6 text-amber-400" />
                      ) : (
                        <Mic className="w-7 h-7 text-slate-300/80 group-hover:text-white transition-colors" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-200 max-w-[110px] truncate">
                      {occupant ? occupant.nickname : 'Egasi'}
                    </span>
                    {occupant && (
                      <div className="flex items-center gap-1 -mt-0.5">
                        <span className="text-[10px] font-medium text-[#E5B84B]">
                          {isSeatOwner ? 'Egasi' : '1-o‘rin'}
                        </span>
                        {(() => {
                          const eff =
                            occupant.id === currentUser.id
                              ? voiceEffectMode
                              : roomVoiceEffects[occupant.id] || 'normal';
                          if (eff === 'normal' || hostSeat.isMuted) return null;
                          return (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-semibold text-emerald-200 leading-none">
                              {getVoiceEffectShortLabel(eff)}
                            </span>
                          );
                        })()}
                      </div>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* 4-Column Numbered Seats Grid (1..8) */}
            <div className="grid grid-cols-4 gap-y-1.5 gap-x-2 sm:gap-y-3.5 sm:gap-x-4 max-w-xl mx-auto w-full">
              {guestSeats.map((seat) => {
                const occupant = seat.user;
                const displayNumber = room.roomType === 'video' ? seat.seatNumber : seat.seatNumber - 1;

                return (
                  <button
                    key={seat.seatNumber}
                    type="button"
                    onClick={() => {
                      if (!occupant && !seat.isLocked) {
                        if (seat.seatNumber === 1 && !isOwner) {
                          setActionError("Egasi o‘rniga faqat xona egasi chiqa oladi");
                          return;
                        }
                        handleTakeSeat(seat.seatNumber);
                      } else {
                        setSelectedSeatNum(seat.seatNumber);
                      }
                    }}
                    className="group flex flex-col items-center gap-0.5 sm:gap-1.5 focus:outline-none"
                  >
                    <div
                      className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
                        occupant
                          ? 'bg-[#0F1B36]/85 ring-1 ring-white/25'
                          : seat.isLocked
                          ? 'bg-[#091124]/65 border border-white/10 opacity-70'
                          : 'bg-[#0F1B36]/70 border border-white/15 group-hover:border-blue-400/60 backdrop-blur-sm'
                      }`}
                    >
                      {occupant ? (
                        <>
                          <AvatarWithFrame
                            src={occupant.avatarUrl}
                            alt={occupant.nickname}
                            size="md"
                            frameStyle={occupant.frameStyle}
                            vipLevel={occupant.vipLevel}
                            svipLevel={occupant.svipLevel}
                            role={occupant.role}
                            isSpeaking={!seat.isMuted}
                            hasCpMicEffect={Boolean(
                              ((occupant.cpLevel ?? 0) >= 2 || occupant.isMarried) &&
                                !seat.isMuted
                            )}
                          />
                          {seat.isMuted && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-600 border border-[#080B14] flex items-center justify-center text-white">
                              <MicOff className="w-3 h-3" />
                            </span>
                          )}
                          {!seat.isMuted &&
                            ((occupant.cpLevel ?? 0) >= 2 || occupant.isMarried) && (
                              <span
                                title={
                                  occupant.isMarried
                                    ? 'Nikoh mikrofon effekti'
                                    : `CP LV${occupant.cpLevel ?? 0} mikrofon effekti`
                                }
                                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-amber-400 border border-[#080B14] flex items-center justify-center text-white shadow"
                              >
                                <Heart className="w-2.5 h-2.5 fill-white" />
                              </span>
                            )}
                        </>
                      ) : seat.isLocked ? (
                        <Lock className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Mic className="w-6 h-6 text-slate-300/80 group-hover:text-white transition-colors" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-300 truncate max-w-[74px] font-mono tabular-nums">
                      {occupant
                        ? occupant.nickname
                        : seat.isLocked
                        ? 'Qulf'
                        : `${displayNumber}`}
                    </span>
                    {occupant &&
                      !seat.isMuted &&
                      (() => {
                        const eff =
                          occupant.id === currentUser.id
                            ? voiceEffectMode
                            : roomVoiceEffects[occupant.id] || 'normal';
                        if (eff === 'normal') return null;
                        return (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-semibold text-emerald-200 leading-none -mt-0.5">
                            {getVoiceEffectShortLabel(eff)}
                          </span>
                        );
                      })()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right / Lower Section: Hammasi Translucent Cards + Floating Right Widgets */}
        <div className="lg:col-span-5 flex-1 min-h-0 relative flex flex-col justify-end overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                setChatFilter((prev) =>
                  prev === 'all' ? 'text' : prev === 'text' ? 'gift' : 'all'
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-md border border-white/10 text-xs font-semibold text-white transition-colors"
              title="Xabarlar filtrini almashtirish"
            >
              <span>
                {chatFilter === 'all'
                  ? 'Hammasi'
                  : chatFilter === 'text'
                  ? 'Xabarlar'
                  : 'Sovg‘alar'}
              </span>
              {chatFilter === 'all' ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-300" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              )}
            </button>

            <VoiceEffectFloatTrigger
              activeMode={voiceEffectMode}
              voiceSettings={voiceSettings}
              isOpen={showVoiceEffectFloat}
              onClick={() => setShowVoiceEffectFloat((v) => !v)}
            />
          </div>

          <div className="relative flex-1 min-h-0 flex items-end gap-2">
            {/* Translucent Chat Cards Stream (only this area scrolls vertically) */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto space-y-1.5 pr-0.5">
              {chatFilter !== 'gift' && (
                <div className="p-3 rounded-2xl bg-[#0B1224]/55 backdrop-blur-md border border-white/[0.06] text-[13px] leading-snug text-[#F5C542] font-medium">
                  TURON CHATga xush kelibsiz. Bir-biringizni hurmat qiling va odobli muloqot qiling.
                </div>
              )}

              {chatFilter !== 'gift' &&
                (room.announcement || room.description || room.welcomeRoomMsg) && (
                  <div className="p-3 rounded-2xl bg-[#0B1224]/55 backdrop-blur-md border border-white/[0.06] text-[13px] leading-snug space-y-1">
                    <div className="font-semibold text-[#F5C542]">E&apos;lon:</div>
                    {(room.announcement || room.description) && (
                      <p className="text-[#FDE68A] whitespace-pre-line">
                        {room.announcement || room.description}
                      </p>
                    )}
                    {room.welcomeRoomMsg && (
                      <p className="text-sky-300">{room.welcomeRoomMsg}</p>
                    )}
                  </div>
                )}

              {filteredMessages.map((m) => (
                <div
                  key={m.id}
                  className={`text-xs sm:text-[13px] ${
                    m.msgType === 'gift'
                      ? 'px-3 py-2 rounded-2xl bg-[#E5B84B]/15 backdrop-blur-md border border-[#E5B84B]/30 text-[#FDE68A]'
                      : m.msgType === 'system'
                      ? 'px-3 py-1.5 rounded-xl bg-[#0B1224]/50 backdrop-blur-sm text-slate-200 flex items-center gap-2'
                      : 'px-3 py-2 rounded-2xl bg-[#0B1224]/50 backdrop-blur-sm flex items-start gap-2'
                  }`}
                >
                  {(m.msgType === 'text' || m.msgType === 'voice') && (
                    <AvatarWithFrame
                      src={m.senderAvatar}
                      alt={m.senderNickname}
                      size="xs"
                      vipLevel={m.senderVipLevel}
                      svipLevel={m.senderSvipLevel}
                      role={m.senderRole}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {(m.msgType === 'text' || m.msgType === 'voice') && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <RoleBadge role={m.senderRole} size="xs" />
                        <span
                          className={`font-semibold ${
                            getRoleVisuals(m.senderRole).isElevated
                              ? getRoleVisuals(m.senderRole).nameColorClass
                              : 'text-[#FDE68A]'
                          }`}
                        >
                          {m.senderNickname}
                        </span>
                        {m.senderRole === 'user' && (
                          <span className="text-slate-400">{getRoleShortLabel(m.senderRole)}</span>
                        )}
                        <span className="text-slate-400/80 font-mono text-[10px]">
                          {formatUzTime(m.createdAt)}
                        </span>
                      </div>
                    )}
                    {m.msgType === 'voice' && m.audioUrl ? (
                      <div className="mt-1.5">
                        <VoiceMessagePlayer
                          audioUrl={m.audioUrl}
                          durationSec={m.audioDurationSec || 1}
                        />
                      </div>
                    ) : (
                      <p className="text-slate-100 break-words leading-snug mt-0.5">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Bottom-Right Dual 64px Ribbons: Top = Games Ribbon, Bottom = Rocket Ribbon */}
            {(() => {
              const safeLevel = Math.min(6, Math.max(1, room.rocketLevel || 1));
              const safePct = Math.min(100, Math.max(0, room.rocketProgressPct || 0));
              const activeTier = ROCKET_TIERS[safeLevel - 1];

              const customRocketSlides = (room.rocketRibbonItems || []).map((item) => {
                const runAction = () => {
                  if (item.actionType === 'games') {
                    setInitialRibbonGameId(null);
                    setShowGamesModal(true);
                  } else if (item.actionType === 'rocket') {
                    setShowRocketModal(true);
                  } else {
                    setGiftTargetId(room.ownerId);
                    setShowGiftModal(true);
                  }
                };

                const renderCustomVisual = () => {
                  if (item.imageUrl) {
                    return (
                      <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#E5B84B]/55 bg-[#040D2B]">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  }
                  const icon =
                    item.actionType === 'games' ? (
                      <Gamepad2 className="w-4 h-4 text-sky-300" />
                    ) : item.actionType === 'rocket' ? (
                      <Rocket className="w-4 h-4 text-[#E5B84B]" />
                    ) : item.actionType === 'link' ? (
                      <Link2 className="w-4 h-4 text-emerald-300" />
                    ) : (
                      <Gift className="w-4 h-4 text-[#E5B84B]" />
                    );
                  return (
                    <div className="w-8 h-8 rounded-lg border border-[#E5B84B]/45 bg-gradient-to-b from-[#131D47] to-[#060B1E] flex items-center justify-center">
                      {icon}
                    </div>
                  );
                };

                return {
                  id: item.id,
                  title: item.title,
                  subtitle: item.subtitle || 'Kirish',
                  href: item.actionType === 'link' && item.targetUrl ? item.targetUrl : undefined,
                  action: runAction,
                  visual: renderCustomVisual(),
                };
              });

              const rocketSlides: Array<{
                id: string;
                title: string;
                subtitle: string;
                href?: string;
                action: () => void;
                visual: React.ReactNode;
              }> = [
                {
                  id: 'rocket',
                  title: 'Raketa',
                  subtitle: `${activeTier.label}·${safePct}%`,
                  action: () => setShowRocketModal(true),
                  visual: (
                    <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#E5B84B]/55 bg-[#040D2B] shadow-[0_0_8px_rgba(229,184,75,0.3)]">
                      <img
                        src="/src/assets/images/room_rocket_emblem_1795635861877.jpg"
                        alt="Xona raketasi"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ),
                },
                {
                  id: 'boost',
                  title: 'Sovg‘a',
                  subtitle: 'Uchirish',
                  action: () => {
                    setGiftTargetId(room.ownerId);
                    setShowGiftModal(true);
                  },
                  visual: (
                    <div
                      className={`w-8 h-8 rounded-lg border ${activeTier.borderClass} bg-gradient-to-b from-[#131D47] to-[#060B1E] flex items-center justify-center`}
                    >
                      <TuronRocketSvg tier={activeTier} className="w-5 h-7" />
                    </div>
                  ),
                },
                {
                  id: 'analytics',
                  title: 'Reyting',
                  subtitle: formatCoins(roomScore),
                  action: () => setShowAnalyticsModal(true),
                  visual: (
                    <div className="w-8 h-8 rounded-lg border border-sky-400/45 bg-gradient-to-b from-[#0E1E44] to-[#060B1E] flex flex-col items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 text-[#FBBF24]" />
                      <Zap className="w-2 h-2 text-sky-300 -mt-0.5" />
                    </div>
                  ),
                },
                ...customRocketSlides,
              ];

              return (
                <div className="shrink-0 flex flex-col items-end gap-1.5 z-10">
                  {/* TOP 64px Rotating Games Ribbon */}
                  <div
                    className="relative w-[64px] rounded-xl bg-[#091126]/88 backdrop-blur-md border border-sky-400/45 shadow-[0_4px_14px_rgba(4,9,24,0.7)] p-1 flex flex-col items-center gap-0.5"
                    onMouseEnter={() => setGameRibbonPaused(true)}
                    onMouseLeave={() => setGameRibbonPaused(false)}
                    onFocus={() => setGameRibbonPaused(true)}
                    onBlur={() => setGameRibbonPaused(false)}
                  >
                    {canManageRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          setRibbonManagerTab('games');
                          setShowRibbonManager(true);
                        }}
                        className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-sky-400 hover:bg-sky-300 text-[#041022] shadow flex items-center justify-center"
                        title="O‘yinlar lentasiga o‘yin qo‘shish"
                        aria-label="O‘yinlar lentasiga o‘yin qo‘shish"
                      >
                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    )}

                    <div className="w-full overflow-hidden rounded-lg">
                      <div
                        className="flex transition-transform duration-500 ease-out will-change-transform"
                        style={{ transform: `translate3d(-${gameRibbonIdx * 100}%, 0, 0)` }}
                      >
                        {ribbonGames.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setInitialRibbonGameId(g.id);
                              setShowGamesModal(true);
                            }}
                            className="w-full shrink-0 flex flex-col items-center text-center gap-0.5 py-0.5 focus:outline-none group"
                            title={g.title}
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-sky-400/40 bg-[#040D2B] group-hover:scale-105 transition-transform">
                              <GameThumbnail
                                gameId={g.id}
                                title={g.title}
                                className="w-full h-full"
                              />
                            </div>
                            <div className="w-full leading-none">
                              <div className="text-[9px] font-display font-bold text-white truncate">
                                {g.title}
                              </div>
                              <div className="text-[8px] font-mono text-sky-300 truncate mt-0.5">
                                O‘yin
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="w-full flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setGameRibbonIdx(
                            (prev) => (prev - 1 + ribbonGames.length) % ribbonGames.length
                          )
                        }
                        className="w-3.5 h-3.5 rounded bg-white/[0.06] hover:bg-white/15 text-slate-200 flex items-center justify-center"
                        aria-label="Oldingi o‘yin"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" />
                      </button>
                      <div className="flex items-center gap-0.5">
                        {ribbonGames.slice(0, 4).map((g, idx) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setGameRibbonIdx(idx)}
                            aria-label={g.title}
                            className={`h-[3px] rounded-full transition-all ${
                              gameRibbonIdx % Math.min(4, ribbonGames.length) === idx
                                ? 'w-2 bg-sky-400'
                                : 'w-1 bg-white/25 hover:bg-white/45'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setGameRibbonIdx((prev) => (prev + 1) % ribbonGames.length)
                        }
                        className="w-3.5 h-3.5 rounded bg-white/[0.06] hover:bg-white/15 text-slate-200 flex items-center justify-center"
                        aria-label="Keyingi o‘yin"
                      >
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* BOTTOM 64px Rotating Xona Raketasi Ribbon */}
                  <div
                    className="relative w-[64px] rounded-xl bg-[#091126]/88 backdrop-blur-md border border-[#E5B84B]/40 shadow-[0_4px_14px_rgba(4,9,24,0.7)] p-1 flex flex-col items-center gap-0.5"
                    onMouseEnter={() => setRocketRibbonPaused(true)}
                    onMouseLeave={() => setRocketRibbonPaused(false)}
                    onFocus={() => setRocketRibbonPaused(true)}
                    onBlur={() => setRocketRibbonPaused(false)}
                  >
                    {canManageRoom && (
                      <button
                        type="button"
                        onClick={() => {
                          setRibbonManagerTab('rocket');
                          setShowRibbonManager(true);
                        }}
                        className="absolute -top-1.5 -right-1.5 z-20 w-4 h-4 rounded-full bg-[#E5B84B] hover:bg-amber-300 text-[#1A0800] shadow flex items-center justify-center"
                        title="Raketa lentasiga narsa qo‘shish"
                        aria-label="Raketa lentasiga narsa qo‘shish"
                      >
                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                      </button>
                    )}

                    {/* 1-Slide Sequential Rotating Track */}
                    <div className="w-full overflow-hidden rounded-lg">
                      <div
                        className="flex transition-transform duration-500 ease-out will-change-transform"
                        style={{ transform: `translate3d(-${rocketRibbonIdx * 100}%, 0, 0)` }}
                      >
                        {rocketSlides.map((s) =>
                          s.href ? (
                            <a
                              key={s.id}
                              href={s.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full shrink-0 flex flex-col items-center text-center gap-0.5 py-0.5 focus:outline-none group"
                              title={s.title}
                            >
                              <div className="group-hover:scale-105 transition-transform">
                                {s.visual}
                              </div>
                              <div className="w-full leading-none">
                                <div className="text-[9px] font-display font-bold text-white truncate">
                                  {s.title}
                                </div>
                                <div className="text-[8px] font-mono tabular-nums text-[#FDE68A] truncate mt-0.5">
                                  {s.subtitle}
                                </div>
                              </div>
                            </a>
                          ) : (
                            <button
                              key={s.id}
                              type="button"
                              onClick={s.action}
                              className="w-full shrink-0 flex flex-col items-center text-center gap-0.5 py-0.5 focus:outline-none group"
                              title={s.title}
                            >
                              <div className="group-hover:scale-105 transition-transform">
                                {s.visual}
                              </div>
                              <div className="w-full leading-none">
                                <div className="text-[9px] font-display font-bold text-white truncate">
                                  {s.title}
                                </div>
                                <div className="text-[8px] font-mono tabular-nums text-[#FDE68A] truncate mt-0.5">
                                  {s.subtitle}
                                </div>
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Rocket Progress Micro Bar */}
                    <div className="w-full h-[2px] rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-sky-400 to-[#E5B84B] transition-all duration-300"
                        style={{ width: `${safePct}%` }}
                      />
                    </div>

                    {/* Compact Left/Right Switchers + Dots */}
                    <div className="w-full flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() =>
                          setRocketRibbonIdx(
                            (prev) => (prev - 1 + rocketSlides.length) % rocketSlides.length
                          )
                        }
                        className="w-3.5 h-3.5 rounded bg-white/[0.06] hover:bg-white/15 text-slate-200 flex items-center justify-center"
                        aria-label="Oldingi slayd"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" />
                      </button>
                      <div className="flex items-center gap-0.5">
                        {rocketSlides.slice(0, 4).map((s, idx) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setRocketRibbonIdx(idx)}
                            aria-label={s.title}
                            className={`h-[3px] rounded-full transition-all ${
                              rocketRibbonIdx % Math.min(4, rocketSlides.length) === idx
                                ? 'w-2 bg-[#E5B84B]'
                                : 'w-1 bg-white/25 hover:bg-white/45'
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setRocketRibbonIdx((prev) => (prev + 1) % rocketSlides.length)
                        }
                        className="w-3.5 h-3.5 rounded bg-white/[0.06] hover:bg-white/15 text-slate-200 flex items-center justify-center"
                        aria-label="Keyingi slayd"
                      >
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Floating In-Room Voice Effect Quick-Switch Panel */}
      <VoiceEffectFloatPanel
        isOpen={showVoiceEffectFloat}
        activeMode={voiceEffectMode}
        voiceSettings={voiceSettings}
        monitorEnabled={voiceMonitorEnabled}
        micError={voiceMicError}
        getInputLevel={() => voiceProcessorRef.current?.getInputLevel() ?? 0}
        onToggleOpen={() => setShowVoiceEffectFloat((v) => !v)}
        onSelectMode={handleSelectVoiceEffect}
        onUpdateVoiceSettings={handleUpdateVoiceSettings}
        onToggleMonitor={handleToggleVoiceMonitor}
        onOpenFullSettings={() => {
          setShowVoiceEffectFloat(false);
          setShowVoiceEffectsModal(true);
        }}
      />

      {/* Bottom Chat Composer + Bottom Icon Action Bar (Pinned at Bottom) */}
      <div className="relative z-20 shrink-0 px-3 sm:px-6 pb-2.5 pt-1 bg-gradient-to-t from-[#040711]/95 via-[#060B1A]/75 to-transparent space-y-1.5">
        <form
          onSubmit={handleSendChat}
          className={showChatInput ? 'flex items-center gap-2' : 'hidden lg:flex items-center gap-2'}
        >
          <input
            type="text"
            value={chatInput}
            disabled={room.publicScreenEnabled === false && !canManageRoom}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={
              room.publicScreenEnabled === false && !canManageRoom
                ? 'Ommaviy ekran o‘chirilgan'
                : 'Xonaga xabar yozing...'
            }
            className="flex-1 min-h-[40px] px-3.5 bg-[#091022]/85 backdrop-blur-md border border-white/15 rounded-full text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-400 disabled:opacity-50"
          />
          <VoiceRecorderButton
            compact
            disabled={room.publicScreenEnabled === false && !canManageRoom}
            voiceEffectMode={voiceEffectMode}
            voiceSettings={voiceSettings}
            onRecorded={handleSendVoiceMessage}
            onError={(msg) => setActionError(msg)}
          />
          <button
            type="submit"
            disabled={
              sendingMsg ||
              !chatInput.trim() ||
              (room.publicScreenEnabled === false && !canManageRoom)
            }
            className="min-h-[40px] min-w-[40px] rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center disabled:opacity-50"
            aria-label="Yuborish"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between gap-2">
          {/* Left: Chat Toggle + Quick Mic Control */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowChatInput((v) => !v)}
              className={`min-h-[42px] min-w-[42px] rounded-full flex items-center justify-center border transition-colors ${
                showChatInput
                  ? 'bg-blue-600/30 border-blue-400/60 text-white'
                  : 'bg-black/45 hover:bg-black/60 border-white/10 text-slate-200'
              }`}
              title="Xabar yozish"
              aria-label="Xabar yozish"
            >
              <MessageCircle className="w-5 h-5" />
            </button>

            {mySeat ? (
              <button
                type="button"
                onClick={() =>
                  handleSeatAction(mySeat.seatNumber, mySeat.isMuted ? 'unmute' : 'mute')
                }
                className={`min-h-[42px] px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold border transition-colors ${
                  mySeat.isMuted
                    ? 'bg-red-600/25 border-red-400/50 text-red-200'
                    : 'bg-emerald-600/25 border-emerald-400/50 text-emerald-200'
                }`}
                title={mySeat.isMuted ? 'Mikrofonni yoqish' : 'Ovozni o‘chirish'}
              >
                {mySeat.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {mySeat.isMuted ? 'Yoqish' : 'O‘chirish'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleQuickTakeGuestSeat}
                className="min-h-[42px] px-3 rounded-full bg-black/45 hover:bg-blue-600/30 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                title="Mikrofonga chiqish"
              >
                <Mic className="w-4 h-4 text-blue-300" />
                <span className="hidden sm:inline">Mikrofon</span>
              </button>
            )}
          </div>

          {/* Right Icon Bar: Voice Effects · Tools Grid · Games · Gift */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowVoiceEffectFloat((v) => !v)}
              className={`min-h-[42px] rounded-full border flex items-center justify-center gap-1.5 transition-colors ${
                voiceEffectMode !== 'normal' || showVoiceEffectFloat
                  ? 'px-3 bg-emerald-500/25 border-emerald-400/60 text-emerald-100'
                  : voiceSettings.gain !== 1.0 ||
                    voiceSettings.bassDb !== 0 ||
                    voiceSettings.trebleDb !== 0
                  ? 'min-w-[42px] bg-emerald-500/25 border-emerald-400/60 text-emerald-200'
                  : 'min-w-[42px] bg-black/45 hover:bg-black/60 border-white/10 text-slate-200'
              }`}
              title="Ovoz effektini tez almashtirish"
              aria-label="Ovoz effektini tez almashtirish"
            >
              {voiceEffectMode !== 'normal' ? (
                <>
                  <AudioWaveform className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-semibold">
                    {getVoiceEffectShortLabel(voiceEffectMode)}
                  </span>
                </>
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowRoomTools(true)}
              className="min-h-[42px] min-w-[42px] rounded-full bg-black/45 hover:bg-black/60 border border-white/10 text-slate-200 flex items-center justify-center transition-colors"
              title="Xona asboblari"
              aria-label="Xona asboblari"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowGamesModal(true)}
              className="min-h-[42px] min-w-[42px] rounded-full bg-black/45 hover:bg-black/60 border border-white/10 text-slate-200 flex items-center justify-center transition-colors"
              title="O‘yinlar"
              aria-label="O‘yinlar"
            >
              <Gamepad2 className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setGiftTargetId(room.ownerId);
                setShowGiftModal(true);
              }}
              className="min-h-[42px] min-w-[42px] rounded-full bg-gradient-to-br from-amber-400 via-[#E5B84B] to-rose-500 text-[#080B14] shadow-lg shadow-amber-500/25 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              title="Sovg‘a yuborish"
              aria-label="Sovg‘a yuborish"
            >
              <Gift className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Room Quick Tools Sheet (DJ, Analytics, Participants, Mic Leave/Take, Video) */}
      {showRoomTools && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="w-full max-w-sm bg-[#0F1524] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base font-semibold text-white">Xona asboblari</h4>
              <button
                type="button"
                onClick={() => setShowRoomTools(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setShowRoomTools(false);
                  setShowMusicModal(true);
                }}
                className="min-h-[48px] px-3 rounded-xl bg-[#080B14] border border-[#E5B84B]/35 text-[#FDE68A] flex items-center gap-2"
              >
                <Music className="w-4 h-4 text-[#E5B84B]" />
                <span>Muzik</span>
              </button>
              {canManageRoom && (
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomTools(false);
                    setRibbonManagerTab('rocket');
                    setShowRibbonManager(true);
                  }}
                  className="min-h-[48px] px-3 rounded-xl bg-[#080B14] border border-[#E5B84B]/30 text-[#FDE68A] flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[#E5B84B]" />
                  <span>Lenta boshqaruvi</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowRoomTools(false);
                  setShowAnalyticsModal(true);
                }}
                className="min-h-[48px] px-3 rounded-xl bg-[#080B14] border border-white/10 text-emerald-200 flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span>Analitika</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRoomTools(false);
                  setShowVoiceEffectsModal(true);
                }}
                className="min-h-[48px] px-3 rounded-xl bg-[#080B14] border border-white/10 text-sky-200 flex items-center gap-2"
              >
                <AudioWaveform className="w-4 h-4 text-sky-400" />
                <span>Ovozli sozlamalar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRoomTools(false);
                  setShowParticipants(true);
                }}
                className="min-h-[48px] px-3 rounded-xl bg-[#080B14] border border-white/10 text-slate-200 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span>Ishtirokchilar ({seatedUsers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowRoomTools(false);
                  setShowRoomFramesModal(true);
                }}
                className="min-h-[48px] px-3 rounded-xl bg-[#080B14] border border-[#E5B84B]/30 text-amber-200 flex items-center gap-2"
              >
                <Award className="w-4 h-4 text-[#F5C451]" />
                <span>Profil ramkalari (66)</span>
              </button>
              {mySeat ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomTools(false);
                    handleLeaveSeat();
                  }}
                  className="col-span-2 min-h-[44px] px-3 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 flex items-center justify-center gap-2"
                >
                  <MicOff className="w-4 h-4" />
                  <span>O‘rindan tushish</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomTools(false);
                    handleQuickTakeGuestSeat();
                  }}
                  className="col-span-2 min-h-[44px] px-3 rounded-xl bg-blue-600 text-white flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>Mikrofonga chiqish</span>
                </button>
              )}
              {canManageRoom && (
                <button
                  type="button"
                  onClick={() => {
                    setShowRoomTools(false);
                    setShowSettings(true);
                  }}
                  className="col-span-2 min-h-[44px] px-3 rounded-xl bg-white/[0.06] border border-white/10 text-slate-200 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Xona sozlamalari</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Seat Action Sheet */}
      {activeSeatObj && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="w-full max-w-sm bg-[#0F1524] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-base font-semibold text-white">
                {activeSeatObj.seatNumber}-mikrofon o‘rni
              </h4>
              <button
                type="button"
                onClick={() => setSelectedSeatNum(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeSeatObj.user && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#080B14] border border-white/[0.07]">
                <AvatarWithFrame
                  src={activeSeatObj.user.avatarUrl}
                  alt={activeSeatObj.user.nickname}
                  size="md"
                  frameStyle={activeSeatObj.user.frameStyle}
                  vipLevel={activeSeatObj.user.vipLevel}
                  svipLevel={activeSeatObj.user.svipLevel}
                  role={activeSeatObj.user.role}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-sm font-semibold truncate ${
                        getRoleVisuals(activeSeatObj.user.role).nameColorClass
                      }`}
                    >
                      {activeSeatObj.user.nickname}
                    </span>
                    <RoleBadge role={activeSeatObj.user.role} size="xs" />
                  </div>
                  <div className="text-xs text-slate-400 font-mono">{activeSeatObj.user.publicId}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onOpenUserProfile(activeSeatObj.user!);
                    setSelectedSeatNum(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-blue-400"
                >
                  Profil
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2">
              {activeSeatObj.user && activeSeatObj.user.id === currentUser.id && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeatNum(null);
                    setShowRoomFramesModal(true);
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-[#080B14] border border-[#E5B84B]/40 text-sm font-semibold text-[#F5C451] flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>Profil ramkasini almashtirish (66)</span>
                </button>
              )}

              {activeSeatObj.user && (
                <button
                  type="button"
                  onClick={() => {
                    setGiftTargetId(activeSeatObj.user!.id);
                    setSelectedSeatNum(null);
                    setShowGiftModal(true);
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-[#E5B84B] text-[#080B14] font-semibold text-sm flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  <span>Sovg‘a yuborish</span>
                </button>
              )}

              {canManageRoom && activeSeatObj.user && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleSeatAction(
                        activeSeatObj.seatNumber,
                        activeSeatObj.isMuted ? 'unmute' : 'mute'
                      )
                    }
                    className="min-h-[44px] px-4 rounded-xl bg-[#080B14] border border-white/10 text-sm text-white flex items-center justify-center gap-2"
                  >
                    {activeSeatObj.isMuted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    <span>{activeSeatObj.isMuted ? 'Mikrofonni ochish' : 'Ovozini o‘chirish'}</span>
                  </button>

                  {isOwner && activeSeatObj.user.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => handleToggleModerator(activeSeatObj.user!.id)}
                      className="min-h-[44px] px-4 rounded-xl bg-[#080B14] border border-white/10 text-sm text-purple-300 flex items-center justify-center gap-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>
                        {room.moderatorIds.includes(activeSeatObj.user.id)
                          ? 'Moderatorlikni olish'
                          : 'Moderator tayinlash'}
                      </span>
                    </button>
                  )}

                  {activeSeatObj.user.id !== room.ownerId && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSeatAction(activeSeatObj.seatNumber, 'kick')}
                        className="min-h-[44px] px-4 rounded-xl bg-[#080B14] border border-amber-500/30 text-sm text-amber-300 flex items-center justify-center gap-2"
                      >
                        <UserX className="w-4 h-4" />
                        <span>O‘rindan tushirish</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBanUser(activeSeatObj.user!.id)}
                        className="min-h-[44px] px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300 flex items-center justify-center gap-2"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Xonadan chetlatish</span>
                      </button>
                    </>
                  )}
                </>
              )}

              {canManageRoom && (activeSeatObj.seatNumber !== 1 || isOwner) && (
                <button
                  type="button"
                  onClick={() =>
                    handleSeatAction(
                      activeSeatObj.seatNumber,
                      activeSeatObj.isLocked ? 'unlock' : 'lock'
                    )
                  }
                  className="min-h-[44px] px-4 rounded-xl bg-[#080B14] border border-white/10 text-sm text-slate-300 flex items-center justify-center gap-2"
                >
                  {activeSeatObj.isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>{activeSeatObj.isLocked ? 'O‘rin qulfini ochish' : 'O‘rinni qulflash'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Room Settings Sheet (Matching Reference Video) */}
      {showSettings && (
        <RoomSettingsSheet
          room={room}
          allUsers={allUsers}
          isOwner={isOwner}
          onClose={() => setShowSettings(false)}
          onRoomUpdated={onRoomUpdated}
          onClearedChat={() => onClearedChat?.()}
          onOpenYouTubePicker={() => setShowYouTubePicker(true)}
          onError={(msg) => setActionError(msg)}
        />
      )}

      {/* YouTube Picker Modal */}
      <YouTubePickerModal
        isOpen={showYouTubePicker}
        onClose={() => setShowYouTubePicker(false)}
        onSelectVideo={handleSelectYouTubeVideo}
      />

      {/* Invite Users Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="w-full max-w-md bg-[#0F1524] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">Xonaga taklif qilish</h4>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2">
              {allUsers
                .filter((u) => u.id !== currentUser.id)
                .map((u) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-[#080B14] border border-white/[0.07] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarWithFrame src={u.avatarUrl} alt={u.nickname} size="sm" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{u.nickname}</div>
                        <div className="text-xs text-slate-400 font-mono">{u.publicId}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInviteUser(u.id)}
                      className="min-h-[38px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white whitespace-nowrap"
                    >
                      Taklif etish
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Participants Drawer Modal */}
      {showParticipants && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="w-full max-w-md bg-[#0F1524] border border-white/10 rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="font-display text-lg font-semibold text-white">
                Sahnadagi ishtirokchilar ({seatedUsers.length})
              </h4>
              <button
                type="button"
                onClick={() => setShowParticipants(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto space-y-2">
              {seatedUsers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">
                  Hozircha mikrofonda hech kim yo‘q.
                </p>
              ) : (
                seatedUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setShowParticipants(false);
                      onOpenUserProfile(u);
                    }}
                    className="w-full p-3 rounded-xl bg-[#080B14] border border-white/[0.07] flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <AvatarWithFrame
                        src={u.avatarUrl}
                        alt={u.nickname}
                        size="sm"
                        frameStyle={u.frameStyle}
                        vipLevel={u.vipLevel}
                        svipLevel={u.svipLevel}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{u.nickname}</div>
                        <div className="text-xs text-slate-400">
                          {u.id === room.ownerId
                            ? 'Xona egasi'
                            : room.moderatorIds.includes(u.id)
                            ? 'Moderator'
                            : getRoleShortLabel(u.role)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-blue-400">Profil</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gift Shop Modal */}
      {showGiftModal && (
        <GiftShopModal
          currentUser={currentUser}
          recipients={giftRecipients}
          defaultRecipientId={giftTargetId}
          roomId={room.id}
          onClose={() => setShowGiftModal(false)}
          onSent={(updatedUser, giftEvent) => {
            onUserUpdated(updatedUser);
            if (giftEvent) onGiftSent?.(giftEvent);
          }}
        />
      )}

      {/* In-Room Games Modal */}
      {showGamesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="w-full max-w-5xl bg-[#080B14] border border-white/10 rounded-t-3xl sm:rounded-2xl max-h-[94dvh] flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 sm:px-5 sm:py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#0F1524] shrink-0">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-blue-400" />
                <span className="font-display text-sm sm:text-base font-semibold text-white">Xona o‘yinlari</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGamesModal(false);
                  setInitialRibbonGameId(null);
                }}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-1.5 sm:p-5 overflow-y-auto overflow-x-hidden">
              <GamesHubView
                key={initialRibbonGameId || 'hub'}
                currentUser={currentUser}
                initialGameId={initialRibbonGameId}
                onUserUpdated={onUserUpdated}
                onShareResultInRoom={async (text) => {
                  await apiFetch(`/api/rooms/${room.id}/messages`, {
                    method: 'POST',
                    body: JSON.stringify({ content: text }),
                  });
                  setShowGamesModal(false);
                  setInitialRibbonGameId(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {/* Room Rocket Showcase Modal */}
      {showRocketModal && (
        <RoomRocketModal
          level={room.rocketLevel || 1}
          progressPct={room.rocketProgressPct || 0}
          canManageRibbon={canManageRoom}
          onOpenRibbonManager={() => {
            setRibbonManagerTab('rocket');
            setShowRibbonManager(true);
          }}
          onClose={() => setShowRocketModal(false)}
          onOpenGiftShop={() => {
            setGiftTargetId(room.ownerId);
            setShowGiftModal(true);
          }}
        />
      )}

      {/* Add/Manage Items on Rocket & Games Ribbons Modal */}
      {showRibbonManager && (
        <RocketRibbonManagerModal
          room={room}
          initialTab={ribbonManagerTab}
          defaultGameIds={DEFAULT_RIBBON_GAME_IDS}
          onRoomUpdated={onRoomUpdated}
          onClose={() => setShowRibbonManager(false)}
        />
      )}

      {/* Room Live Analytics Modal */}
      {showAnalyticsModal && (
        <RoomAnalyticsModal
          roomId={room.id}
          roomTitle={room.title}
          analyticsTick={analyticsSyncTick}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}

      {/* Voice Audio Settings & Effects Modal */}
      {showVoiceEffectsModal && (
        <VoiceEffectsModal
          activeMode={voiceEffectMode}
          voiceSettings={voiceSettings}
          monitorEnabled={voiceMonitorEnabled}
          micError={voiceMicError}
          livekitActive={livekitConnected}
          getInputLevel={() => voiceProcessorRef.current?.getInputLevel() ?? 0}
          onSelectMode={handleSelectVoiceEffect}
          onUpdateVoiceSettings={handleUpdateVoiceSettings}
          onToggleMonitor={handleToggleVoiceMonitor}
          onClose={() => setShowVoiceEffectsModal(false)}
        />
      )}

      {/* In-Room Profile Frames Store & Switcher (66+ Frames) */}
      {showRoomFramesModal && (
        <FrameStoreModal
          currentUser={currentUser}
          initialCategory="frames"
          onClose={() => setShowRoomFramesModal(false)}
          onUserUpdated={onUserUpdated}
        />
      )}

      {/* Room Muzik Player & Phone Upload Modal */}
      {showMusicModal && (
        <RoomMusicModal
          roomId={room.id}
          currentUserId={currentUser.id}
          musicState={musicState}
          canControl={canManageRoom}
          currentTimeSec={musicTimeSec}
          durationSec={musicDurationSec}
          volume={musicVolume}
          onVolumeChange={(v) => setMusicVolume(v)}
          onSeekLocal={(sec) => {
            setMusicTimeSec(sec);
            if (musicAudioRef.current) {
              try {
                musicAudioRef.current.currentTime = sec;
              } catch {
                // ignore
              }
            }
          }}
          onMusicUpdated={(next) => setMusicState(next)}
          onClose={() => setShowMusicModal(false)}
        />
      )}

      {/* Hidden Audio Element for Synced Room Music */}
      <audio
        ref={musicAudioRef}
        preload="auto"
        onTimeUpdate={(e) => {
          setMusicTimeSec(e.currentTarget.currentTime || 0);
        }}
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (Number.isFinite(dur) && dur > 0) {
            setMusicDurationSec(Math.round(dur));
          }
          const targetPos = Number(musicState?.positionSec || 0);
          if (targetPos > 0 && Math.abs((e.currentTarget.currentTime || 0) - targetPos) > 2) {
            try {
              e.currentTarget.currentTime = targetPos;
            } catch {
              // ignore
            }
          }
        }}
        onEnded={() => {
          if (canManageRoom && musicState?.tracks && musicState.tracks.length > 0) {
            apiFetch<{ music: RoomMusicState }>(`/api/rooms/${room.id}/music/control`, {
              method: 'POST',
              body: JSON.stringify({ action: 'next' }),
            })
              .then((res) => setMusicState(res.music))
              .catch(() => {});
          }
        }}
      />
    </div>
  );
};
