export type AppRole =
  | 'founder'
  | 'super_admin'
  | 'admin'
  | 'moderator'
  | 'pk_admin'
  | 'agency_head'
  | 'agent'
  | 'user';

export const ROLE_LABELS: Record<AppRole, string> = {
  founder: 'Asoschi (Founder)',
  super_admin: 'Super Admin',
  admin: 'Administrator',
  moderator: 'Moderator',
  pk_admin: 'PK Administrator',
  agency_head: 'Agentlik Rahbari',
  agent: 'Agent',
  user: 'Foydalanuvchi',
};

export const ROLE_RANK: Record<AppRole, number> = {
  founder: 100,
  super_admin: 90,
  admin: 75,
  moderator: 60,
  pk_admin: 55,
  agency_head: 45,
  agent: 30,
  user: 10,
};

export interface UserProfile {
  id: string;
  publicId: string;
  email: string;
  nickname: string;
  avatarUrl: string;
  gender: 'male' | 'female' | 'unspecified';
  country: string;
  bio: string;
  onlineStatus: 'online' | 'offline' | 'in_room';
  role: AppRole;
  vipLevel: number;
  svipLevel: number;
  vipExpiresAt: string | null;
  frameStyle: string;
  coinBalance: number;
  gamePoints: number;
  totalGifted: number;
  totalReceived: number;
  agencyId: string | null;
  isMutedUntil: string | null;
  isSuspended: boolean;
  privacyDm: 'everyone' | 'friends' | 'nobody';
  privacyShowOnline: boolean;
  notifyMessages: boolean;
  notifyGifts: boolean;
  notifyRooms: boolean;
  language: string;
  birthYear: number | null;
  equippedMedal: string;
  photos: string[];
  guardValue: number;
  cpLevel?: number;
  isMarried?: boolean;
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
  friendStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted';
  isBlocked?: boolean;
  createdAt: string;
}

export type GameCategory = 'oddiy' | 'omadli';

export type GameMechanic =
  | 'ludo'
  | 'ludo_team'
  | 'carrom'
  | 'umo'
  | 'domino'
  | 'jackaroo'
  | 'wheel'
  | 'fruit'
  | 'box'
  | 'slot'
  | 'card_compare'
  | 'pyramid'
  | 'football'
  | 'rocket'
  | 'greedy_pro';

export interface GameDefinition {
  id: string;
  title: string;
  category: GameCategory;
  mechanic: GameMechanic;
  subtitle: string;
  accent: 'blue' | 'purple' | 'gold' | 'emerald';
}

export interface RoomSeat {
  roomId: string;
  seatNumber: number;
  userId: string | null;
  isMuted: boolean;
  isLocked: boolean;
  user?: UserProfile | null;
  isSpeaking?: boolean;
}

export type DynamicBgId =
  | 'campfire-night'
  | 'aurora-borealis'
  | 'starfall-cosmos'
  | 'neon-pulse'
  | 'sakura-petals'
  | 'golden-embers'
  | 'ocean-waves';

export type RocketRibbonActionType = 'gift' | 'games' | 'rocket' | 'music' | 'link';

export interface RoomRocketRibbonItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  actionType: RocketRibbonActionType;
  targetUrl?: string;
}

export interface VoiceRoom {
  id: string;
  title: string;
  description: string;
  announcement?: string;
  welcomeRoomMsg?: string;
  welcomeUserMsg?: string;
  publicScreenEnabled?: boolean;
  sensitiveWords?: string;
  roomType?: 'chat' | 'video';
  micMode?: 'open' | 'request';
  requireMemberApproval?: boolean;
  superMicEnabled?: boolean;
  videoUrl?: string;
  videoTitle?: string;
  coverUrl: string;
  category: string;
  ownerId: string;
  owner?: UserProfile;
  maxSeats: number;
  isPrivate: boolean;
  hasPassword?: boolean;
  backgroundTheme: 'sapphire' | 'amethyst' | 'gold' | 'obsidian';
  visualEffect: 'aurora' | 'stars' | 'waves' | 'none';
  dynamicBg?: DynamicBgId;
  isFeatured: boolean;
  isActive: boolean;
  viewerCount: number;
  rocketLevel: number;
  rocketProgressPct: number;
  rocketRibbonItems?: RoomRocketRibbonItem[];
  gameRibbonIds?: string[];
  isWeddingRoom?: boolean;
  weddingCpId?: string | null;
  seats: RoomSeat[];
  moderatorIds: string[];
  createdAt: string;
}

export interface RoomMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  senderAvatar: string;
  senderRole: AppRole;
  senderVipLevel: number;
  senderSvipLevel: number;
  content: string;
  msgType: 'text' | 'system' | 'gift' | 'voice';
  audioUrl?: string | null;
  audioDurationSec?: number;
  createdAt: string;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'file' | 'voice' | null;
  attachmentName?: string | null;
  audioDurationSec?: number;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationSummary {
  partner: UserProfile;
  lastMessage: PrivateMessage | null;
  unreadCount: number;
}

export interface GiftCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface GiftItem {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  iconKey: string;
  priceCoins: number;
  isAnimated: boolean;
  tier: 'standard' | 'premium' | 'luxury';
  isActive: boolean;
  videoUrl?: string;
}

export interface GiftTransaction {
  id: string;
  senderId: string;
  senderNickname: string;
  senderAvatar: string;
  receiverId: string;
  receiverNickname: string;
  receiverAvatar: string;
  roomId: string | null;
  giftId: string;
  giftName: string;
  giftIcon: string;
  quantity: number;
  totalCoins: number;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  txType: 'topup' | 'gift_sent' | 'gift_received' | 'vip_purchase' | 'refund' | 'admin_adjust';
  amountCoins: number;
  priceUzs: number;
  provider: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  receiptCode: string;
  note: string;
  createdAt: string;
}

export interface VipPlan {
  id: string;
  tierType: 'vip' | 'svip';
  level: number;
  name: string;
  priceCoins: number;
  durationDays: number;
  frameStyle: string;
  benefits: string[];
}

export interface VipPurchase {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  priceCoins: number;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface PkBattle {
  id: string;
  title: string;
  roomAId: string;
  roomBId: string;
  roomATitle: string;
  roomBTitle: string;
  roomAOwnerNickname: string;
  roomBOwnerNickname: string;
  roomACover: string;
  roomBCover: string;
  scoreA: number;
  scoreB: number;
  durationSeconds: number;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'finished' | 'cancelled';
  createdBy: string;
}

export interface Agency {
  id: string;
  name: string;
  description: string;
  headUserId: string;
  headNickname: string;
  headAvatar: string;
  totalVolume: number;
  memberCount: number;
  isVerified: boolean;
  createdAt: string;
}

export interface AgencyMember {
  agencyId: string;
  userId: string;
  nickname: string;
  publicId: string;
  avatarUrl: string;
  memberRole: 'head' | 'agent' | 'host';
  monthlyScore: number;
  onlineStatus: string;
  joinedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  notifType: 'friend_request' | 'message' | 'room_invite' | 'gift' | 'membership' | 'system';
  title: string;
  body: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterNickname: string;
  targetType: 'user' | 'room' | 'message';
  targetId: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolvedBy: string | null;
  resolverNickname?: string | null;
  resolutionNote: string;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorId: string;
  actorNickname: string;
  actorRole: AppRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  title: string;
  subtitle: string;
  avatarUrl: string;
  score: number;
  vipLevel?: number;
  svipLevel?: number;
  frameStyle?: string;
}

export interface ServiceConfigStatus {
  supabaseConfigured: boolean;
  livekitConfigured: boolean;
  livekitUrl: string | null;
  paymentProviderConfigured: boolean;
}

export interface CpLevelRule {
  level: number;
  minIntimacy: number;
  dailyLimit: number | null;
  coverName: string;
  perks: string[];
}

export interface LoveStoreItem {
  id: string;
  name: string;
  category: 'ring' | 'intimacy' | 'guard' | 'theme';
  priceCoins: number;
  intimacyGain: number;
  blessingGain: number;
  guardGain: number;
  themeKey: string | null;
  imageUrl?: string | null;
  description: string;
}

export interface CpCollectionEntry {
  id: string;
  cpId: string;
  itemId: string;
  itemName: string;
  category: string;
  themeKey: string | null;
  senderId: string;
  senderNickname: string;
  createdAt: string;
}

export interface CpRelationship {
  id: string;
  userAId: string;
  userBId: string;
  partner: UserProfile;
  status: 'pending' | 'active' | 'married' | 'ended';
  isRequester: boolean;
  intimacy: number;
  blessing: number;
  level: number;
  dailyLimit: number | null;
  dailyIntimacyUsed: number;
  dailyMicMinutes: number;
  marriageStatus: 'none' | 'proposed' | 'married';
  proposalRingId: string | null;
  proposedBy: string | null;
  marriedAt: string | null;
  weddingRoomId: string | null;
  activeTheme: string;
  perks: {
    onlineReminder: boolean;
    micEffect: boolean;
    marryCover: boolean;
    weddingGiftBonus: number;
  };
  collections: CpCollectionEntry[];
  createdAt: string;
}

export type RibbonLogoCategory = 'diler' | 'admin' | 'telegram';

export interface RibbonLogo {
  id: string;
  name: string;
  subtitle: string;
  category: RibbonLogoCategory;
  imageUrl: string;
  targetUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export type StoreFrameTier = 'SS' | 'S' | 'A';
export type StoreCategoryId = 'frames' | 'entry' | 'chat_link' | 'chat_bubble' | 'mic' | 'rings';

export interface StoreFrameItem {
  id: string;
  name: string;
  tier: StoreFrameTier;
  category: StoreCategoryId;
  priceCoins: number;
  durationDays: number;
  imageUrl?: string;
  cpOnly?: boolean;
  collection?: string;
  description: string;
}

export interface OwnedFrameRecord {
  id: string;
  userId: string;
  frameId: string;
  pricePaid: number;
  durationDays: number;
  expiresAt: string;
  giftedBy: string | null;
  createdAt: string;
}

export interface RoomUserEntryEvent {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  avatarUrl: string;
  role: AppRole;
  vipLevel: number;
  svipLevel: number;
  timestamp: string;
}

export interface RoomAnalyticsBucket {
  label: string;
  entries: number;
  giftsCount: number;
  giftCoins: number;
}

export interface RoomAnalyticsData {
  roomId: string;
  viewerCount: number;
  totalEntries: number;
  totalGiftsCount: number;
  totalGiftCoins: number;
  buckets: RoomAnalyticsBucket[];
  topGifters: Array<{
    userId: string;
    nickname: string;
    avatarUrl: string;
    totalCoins: number;
    giftsCount: number;
  }>;
  recentEvents: Array<{
    id: string;
    eventType: 'enter' | 'gift';
    nickname: string;
    coinsAmount: number;
    createdAt: string;
  }>;
}

export type VoiceEffectMode = 'normal' | 'pitch' | 'chipmunk' | 'deep' | 'robot' | 'echo';
export type NoiseSuppressionLevel = 'off' | 'low' | 'high';

export interface VoiceAudioSettings {
  gain: number; // 0.2 .. 2.5
  noiseSuppression: NoiseSuppressionLevel;
  bassDb: number; // -12 .. 12
  trebleDb: number; // -12 .. 12
  pitchSemitones?: number; // -12 .. 12
  robotPitchHz?: number; // 35 .. 120
  echoDelayMs?: number; // 120 .. 550
  echoMix?: number; // 0.15 .. 0.9
}

export interface RoomDjTrack {
  id: string;
  roomId: string;
  title: string;
  artist: string;
  sourceUrl: string;
  sourceType: 'preset' | 'audio' | 'youtube';
  presetKey: string;
  durationSec: number;
  addedById: string;
  addedByName: string;
  isPlayed: boolean;
  votesCount: number;
  hasVoted: boolean;
  createdAt: string;
}

export interface RoomDjState {
  roomId: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  updatedAt: string | null;
  currentTrack: RoomDjTrack | null;
  queue: RoomDjTrack[];
}

export interface RoomMusicTrack {
  id: string;
  roomId: string;
  title: string;
  artist: string;
  audioUrl: string;
  durationSec: number;
  fileSize: number;
  addedById: string;
  addedByName: string;
  createdAt: string;
}

export interface RoomMusicState {
  roomId: string;
  currentTrackId: string | null;
  isPlaying: boolean;
  positionSec: number;
  updatedAt: string | null;
  currentTrack: RoomMusicTrack | null;
  tracks: RoomMusicTrack[];
}

export type GreedySlotKey =
  | 'pomidor'
  | 'karam'
  | 'baliq'
  | 'sabzi'
  | 'hotdog'
  | 'krevetka'
  | 'tovuq'
  | 'steyk';

export interface GreedyProSlot {
  id: number;
  key: GreedySlotKey;
  label: string;
  multiplier: number;
  group: 'salad' | 'pizza';
  weight: number;
}

export interface GreedyProRound {
  id: string;
  roundNumber: number;
  status: 'betting' | 'spinning' | 'result';
  startedAt: number;
  bettingEndsAt: number;
  spinningEndsAt: number;
  resultEndsAt: number;
  winningSlot: number | null;
  totalPool: number;
  jackpotWon: number;
}

export interface GreedyProHistoryItem {
  roundId: string;
  roundNumber: number;
  slotId: number;
  slotKey: GreedySlotKey;
  label: string;
  multiplier: number;
}

export interface GreedyProWinner {
  userId: string;
  nickname: string;
  avatarUrl: string;
  vipLevel: number;
  svipLevel: number;
  payout: number;
  betAmount: number;
}

export interface GreedyProPublicState {
  serverNowMs: number;
  jackpotPool: number;
  maxBetPerRound: number;
  chips: number[];
  slots: GreedyProSlot[];
  round: GreedyProRound;
  slotTotals: Record<number, number>;
  history: GreedyProHistoryItem[];
  topWinners: GreedyProWinner[];
}

export interface GreedyProUserState extends GreedyProPublicState {
  userSlotBets: Record<number, number>;
  userTotalBet: number;
  userRoundPayout: number;
  todayWin: number;
  canClaimDailyBonus: boolean;
  user: UserProfile | null;
}



