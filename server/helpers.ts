import jwt from 'jsonwebtoken';
import { db, generateId } from './db.ts';
import type { AppRole, UserProfile, VoiceRoom } from '../src/types/turon.ts';

export const JWT_SECRET =
  process.env.JWT_SECRET || 'turon-chat-dev-secret-key-change-in-production';

export const ROLE_RANK_MAP: Record<AppRole, number> = {
  founder: 100,
  super_admin: 90,
  admin: 75,
  moderator: 60,
  pk_admin: 55,
  agency_head: 45,
  agent: 30,
  user: 10,
};

export function signAuthToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '14d' });
}

export function verifyAuthToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub?: string };
    return decoded?.sub || null;
  } catch {
    return null;
  }
}

export function mapUserRow(row: any, viewerId?: string): UserProfile {
  const followersCount = (
    db.prepare('SELECT COUNT(*) as c FROM follows WHERE following_id = ?').get(row.id) as { c: number }
  ).c;
  const followingCount = (
    db.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').get(row.id) as { c: number }
  ).c;

  let isFollowing = false;
  let friendStatus: UserProfile['friendStatus'] = 'none';
  let isBlocked = false;

  if (viewerId && viewerId !== row.id) {
    isFollowing = Boolean(
      db
        .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
        .get(viewerId, row.id)
    );
    isBlocked = Boolean(
      db
        .prepare('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?')
        .get(viewerId, row.id)
    );
    const fr = db
      .prepare(
        `SELECT requester_id, addressee_id, status FROM friendships
         WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
      )
      .get(viewerId, row.id, row.id, viewerId) as
      | { requester_id: string; addressee_id: string; status: string }
      | undefined;

    if (fr) {
      if (fr.status === 'accepted') friendStatus = 'accepted';
      else if (fr.status === 'pending') {
        friendStatus = fr.requester_id === viewerId ? 'pending_sent' : 'pending_received';
      }
    }
  }

  return {
    id: row.id,
    publicId: row.public_id,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatar_url || '',
    gender: row.gender || 'unspecified',
    country: row.country || "O'zbekiston",
    bio: row.bio || '',
    onlineStatus: row.privacy_show_online ? row.online_status : 'offline',
    role: row.role as AppRole,
    vipLevel: row.vip_level || 0,
    svipLevel: row.svip_level || 0,
    vipExpiresAt: row.vip_expires_at || null,
    frameStyle: row.frame_style || 'none',
    coinBalance: row.coin_balance || 0,
    gamePoints: row.game_points ?? 2000,
    totalGifted: row.total_gifted || 0,
    totalReceived: row.total_received || 0,
    agencyId: row.agency_id || null,
    isMutedUntil: row.is_muted_until || null,
    isSuspended: Boolean(row.is_suspended),
    privacyDm: row.privacy_dm || 'everyone',
    privacyShowOnline: Boolean(row.privacy_show_online),
    notifyMessages: Boolean(row.notify_messages),
    notifyGifts: Boolean(row.notify_gifts),
    notifyRooms: Boolean(row.notify_rooms),
    language: row.language || 'uz',
    birthYear: row.birth_year || null,
    equippedMedal: row.equipped_medal || 'Turon Yulduzi',
    photos: (() => {
      try {
        return JSON.parse(row.photos_json || '[]');
      } catch {
        return [];
      }
    })(),
    guardValue: Number(row.guard_value ?? 0),
    ...(() => {
      const cp = db
        .prepare(
          `SELECT intimacy, marriage_status FROM cp_relationships
           WHERE (user_a_id = ? OR user_b_id = ?) AND status IN ('active', 'married')
           LIMIT 1`
        )
        .get(row.id, row.id) as { intimacy: number; marriage_status: string } | undefined;
      if (!cp) return { cpLevel: 0, isMarried: false };
      return {
        cpLevel: computeCpLevel(cp.intimacy).level,
        isMarried: cp.marriage_status === 'married',
      };
    })(),
    followersCount,
    followingCount,
    isFollowing,
    friendStatus,
    isBlocked,
    createdAt: row.created_at,
  };
}

export const CP_LEVEL_RULES = [
  { level: 1, minIntimacy: 777, dailyLimit: 1000, coverName: 'Yulduzcha I · Kumush Ziyo' },
  { level: 2, minIntimacy: 3500, dailyLimit: 5000, coverName: 'Yulduzcha II · Moviy Nur' },
  { level: 3, minIntimacy: 7777, dailyLimit: 10000, coverName: 'Yulduzcha III · Ametist Osmon' },
  { level: 4, minIntimacy: 20000, dailyLimit: 20000, coverName: 'Yulduzcha IV · Sapfir Yulduz' },
  { level: 5, minIntimacy: 50000, dailyLimit: 50000, coverName: 'Yulduzcha V · Shafaq Nuri' },
  { level: 6, minIntimacy: 77777, dailyLimit: 70000, coverName: 'Yulduzcha VI · Oltin Toj' },
  { level: 7, minIntimacy: 200000, dailyLimit: 80000, coverName: 'Yulduzcha VII · Samoviy Olmos' },
  { level: 8, minIntimacy: 400000, dailyLimit: 90000, coverName: 'Yulduzcha VIII · Qirollik Tuni' },
  { level: 9, minIntimacy: 777777, dailyLimit: 100000, coverName: 'Yulduzcha IX · Abadiy Qalb' },
  { level: 10, minIntimacy: 1777777, dailyLimit: 150000, coverName: 'Yulduzcha X · Kosmik Saroy' },
  { level: 11, minIntimacy: 4000000, dailyLimit: 200000, coverName: 'Yulduzcha XI · Imperiya Yulduzi' },
  { level: 12, minIntimacy: 7777777, dailyLimit: null, coverName: 'Yulduzcha XII · Afsonaviy Sevgi' },
];

export function computeCpLevel(intimacy: number): {
  level: number;
  dailyLimit: number | null;
  coverName: string;
} {
  let matched = { level: 0, dailyLimit: 1000 as number | null, coverName: 'Boshlang‘ich CP' };
  for (const r of CP_LEVEL_RULES) {
    if (intimacy >= r.minIntimacy) {
      matched = { level: r.level, dailyLimit: r.dailyLimit, coverName: r.coverName };
    }
  }
  return matched;
}

const ROCKET_THRESHOLDS = [0, 500, 1500, 3500, 7500, 15000, 30000];

export function computeRoomRocketState(energy: number): {
  rocketLevel: number;
  rocketProgressPct: number;
} {
  const safe = Math.max(0, Number(energy) || 0);
  const maxThreshold = ROCKET_THRESHOLDS[ROCKET_THRESHOLDS.length - 1];
  const cycleEnergy = safe >= maxThreshold ? safe % maxThreshold : safe;
  let level = 1;
  for (let i = 0; i < ROCKET_THRESHOLDS.length - 1; i++) {
    if (cycleEnergy >= ROCKET_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  const minE = ROCKET_THRESHOLDS[level - 1];
  const maxE = ROCKET_THRESHOLDS[level];
  const pct = Math.min(100, Math.max(0, Math.round(((cycleEnergy - minE) / Math.max(1, maxE - minE)) * 100)));
  return { rocketLevel: level, rocketProgressPct: pct };
}

export function getRoomFull(roomId: string, viewerId?: string): VoiceRoom | null {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!row) return null;

  const ownerRow = db.prepare('SELECT * FROM users WHERE id = ?').get(row.owner_id) as any;
  const seatRows = db
    .prepare(
      'SELECT * FROM room_seats WHERE room_id = ? AND seat_number <= ? ORDER BY seat_number ASC'
    )
    .all(roomId, row.max_seats) as any[];

  const seats = seatRows.map((s) => {
    let user: UserProfile | null = null;
    if (s.user_id) {
      const uRow = db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id) as any;
      if (uRow) user = mapUserRow(uRow, viewerId);
    }
    return {
      roomId: s.room_id,
      seatNumber: s.seat_number,
      userId: s.user_id || null,
      isMuted: Boolean(s.is_muted),
      isLocked: Boolean(s.is_locked),
      user,
    };
  });

  const modRows = db
    .prepare('SELECT user_id FROM room_moderators WHERE room_id = ?')
    .all(roomId) as Array<{ user_id: string }>;

  const rocket = computeRoomRocketState(row.rocket_energy || 0);

  let rocketRibbonItems: any[] = [];
  try {
    const parsed = JSON.parse(row.rocket_ribbon_json || '[]');
    if (Array.isArray(parsed)) rocketRibbonItems = parsed;
  } catch {
    rocketRibbonItems = [];
  }

  let gameRibbonIds: string[] = [];
  try {
    const parsed = JSON.parse(row.game_ribbon_json || '[]');
    if (Array.isArray(parsed)) gameRibbonIds = parsed.filter((x) => typeof x === 'string');
  } catch {
    gameRibbonIds = [];
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    announcement: row.announcement || '',
    welcomeRoomMsg: row.welcome_room_msg || '',
    welcomeUserMsg: row.welcome_user_msg || '',
    publicScreenEnabled: row.public_screen_enabled !== undefined ? Boolean(row.public_screen_enabled) : true,
    sensitiveWords: row.sensitive_words || '',
    roomType: row.room_type === 'video' ? 'video' : 'chat',
    micMode: row.mic_mode === 'request' ? 'request' : 'open',
    requireMemberApproval: Boolean(row.require_member_approval),
    superMicEnabled: Boolean(row.super_mic_enabled),
    videoUrl: row.video_url || '',
    videoTitle: row.video_title || '',
    coverUrl: row.cover_url || '',
    category: row.category || 'Suhbat',
    ownerId: row.owner_id,
    owner: ownerRow ? mapUserRow(ownerRow, viewerId) : undefined,
    maxSeats: row.max_seats,
    isPrivate: Boolean(row.is_private),
    hasPassword: Boolean(row.password_hash),
    backgroundTheme: row.background_theme || 'sapphire',
    visualEffect: row.visual_effect || 'aurora',
    dynamicBg: row.dynamic_bg || 'campfire-night',
    isFeatured: Boolean(row.is_featured),
    isActive: Boolean(row.is_active),
    viewerCount: row.viewer_count || 1,
    rocketLevel: rocket.rocketLevel,
    rocketProgressPct: rocket.rocketProgressPct,
    rocketRibbonItems,
    gameRibbonIds,
    isWeddingRoom: Boolean(row.is_wedding_room),
    weddingCpId: row.wedding_cp_id || null,
    seats,
    moderatorIds: modRows.map((m) => m.user_id),
    createdAt: row.created_at,
  };
}

export function logAdminAction(
  actorId: string,
  actorRole: AppRole,
  action: string,
  targetType: string,
  targetId: string,
  details: string
): void {
  db.prepare(
    `INSERT INTO admin_audit_logs (id, actor_id, actor_role, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(generateId('log'), actorId, actorRole, action, targetType, targetId, details);
}

export function createNotification(
  userId: string,
  notifType: 'friend_request' | 'message' | 'room_invite' | 'gift' | 'membership' | 'system',
  title: string,
  body: string,
  actionUrl?: string
) {
  const id = generateId('n');
  db.prepare(
    `INSERT INTO notifications (id, user_id, notif_type, title, body, action_url)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, notifType, title, body, actionUrl || null);
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
}

export function canAccessAdminPanel(role: AppRole): boolean {
  return ['founder', 'super_admin', 'admin', 'moderator', 'pk_admin'].includes(role);
}
