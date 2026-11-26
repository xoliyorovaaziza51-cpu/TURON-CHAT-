import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { WebSocketServer, WebSocket } from 'ws';
import { db, initDatabase, generateId } from './server/db.ts';
import {
  JWT_SECRET,
  ROLE_RANK_MAP,
  signAuthToken,
  verifyAuthToken,
  mapUserRow,
  getRoomFull,
  logAdminAction,
  createNotification,
  canAccessAdminPanel,
  computeRoomRocketState,
  CP_LEVEL_RULES,
  computeCpLevel,
} from './server/helpers.ts';
import type { AppRole } from './src/types/turon.ts';
import { createGreedyProEngine } from './server/greedyPro.ts';
import { PROFILE_FRAMES_CATALOG } from './src/lib/framesCatalog.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));
const uploadsRootDir = path.resolve(process.cwd(), 'data/uploads');
const giftVideosUploadDir = path.join(uploadsRootDir, 'gifts');
const roomMusicUploadDir = path.join(uploadsRootDir, 'music');
fs.mkdirSync(giftVideosUploadDir, { recursive: true });
fs.mkdirSync(roomMusicUploadDir, { recursive: true });
app.use('/uploads', express.static(uploadsRootDir));

interface AuthedRequest extends Request {
  user?: any;
}

function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
    return;
  }
  const userId = verifyAuthToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Sessiya muddati tugagan, qayta kiring' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) {
    res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    return;
  }
  if (user.is_suspended) {
    res.status(403).json({ error: "Hisobingiz vaqtincha to'xtatilgan" });
    return;
  }
  req.user = user;
  next();
}

function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    const userId = verifyAuthToken(token);
    if (userId) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (user && !user.is_suspended) req.user = user;
    }
  }
  next();
}

// ============================================================================
// WEBSOCKET REAL-TIME HUB
// ============================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSocket {
  ws: WebSocket;
  userId: string;
  roomId: string | null;
}

const clients = new Set<ClientSocket>();

function sendToUser(userId: string, event: string, payload: unknown) {
  const data = JSON.stringify({ event, payload });
  for (const c of clients) {
    if (c.userId === userId && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  }
}

function broadcastToRoom(roomId: string, event: string, payload: unknown) {
  const data = JSON.stringify({ event, payload });
  for (const c of clients) {
    if (c.roomId === roomId && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  }
}

function broadcastAll(event: string, payload: unknown) {
  const data = JSON.stringify({ event, payload });
  for (const c of clients) {
    if (c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  }
}

const greedyPro = createGreedyProEngine({
  db,
  broadcastAll,
  sendToUser,
  generateId,
  mapUserRow,
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const token = url.searchParams.get('token');
  const userId = token ? verifyAuthToken(token) : null;

  if (!userId) {
    ws.close(4001, 'Unauthorized');
    return;
  }

  const client: ClientSocket = { ws, userId, roomId: null };
  clients.add(client);

  db.prepare("UPDATE users SET online_status = 'online' WHERE id = ?").run(userId);
  broadcastAll('presence:update', { userId, onlineStatus: 'online' });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { event: string; payload: any };
      if (msg.event === 'room:subscribe') {
        const prevRoom = client.roomId;
        const nextRoom = msg.payload?.roomId || null;
        client.roomId = nextRoom;
        if (prevRoom && prevRoom !== nextRoom) {
          db.prepare('UPDATE rooms SET viewer_count = MAX(1, viewer_count - 1) WHERE id = ?').run(prevRoom);
          const updatedPrev = getRoomFull(prevRoom);
          if (updatedPrev) broadcastToRoom(prevRoom, 'room:updated', updatedPrev);
        }
        if (nextRoom) {
          db.prepare('UPDATE rooms SET viewer_count = viewer_count + 1 WHERE id = ?').run(nextRoom);
          db.prepare("UPDATE users SET online_status = 'in_room' WHERE id = ?").run(userId);
          const updatedNext = getRoomFull(nextRoom, userId);
          if (updatedNext) broadcastToRoom(nextRoom, 'room:updated', updatedNext);
        }
      } else if (msg.event === 'room:unsubscribe') {
        if (client.roomId) {
          const rId = client.roomId;
          client.roomId = null;
          db.prepare('UPDATE rooms SET viewer_count = MAX(1, viewer_count - 1) WHERE id = ?').run(rId);
          db.prepare("UPDATE users SET online_status = 'online' WHERE id = ?").run(userId);
          const updated = getRoomFull(rId);
          if (updated) broadcastToRoom(rId, 'room:updated', updated);
        }
      } else if (msg.event === 'room:speaking') {
        if (client.roomId) {
          broadcastToRoom(client.roomId, 'room:speaking', {
            userId,
            isSpeaking: Boolean(msg.payload?.isSpeaking),
          });
        }
      } else if (msg.event === 'room:voice_effect') {
        if (client.roomId) {
          const allowedModes = ['normal', 'pitch', 'chipmunk', 'deep', 'robot', 'echo'];
          const effectMode = allowedModes.includes(String(msg.payload?.effectMode))
            ? String(msg.payload.effectMode)
            : 'normal';
          broadcastToRoom(client.roomId, 'room:voice_effect', {
            roomId: client.roomId,
            userId,
            effectMode,
          });
        }
      }
    } catch {
      // Ignore malformed socket frames
    }
  });

  ws.on('close', () => {
    const prevRoom = client.roomId;
    clients.delete(client);
    const stillConnected = Array.from(clients).some((c) => c.userId === userId);
    if (!stillConnected) {
      db.prepare("UPDATE users SET online_status = 'offline' WHERE id = ?").run(userId);
      broadcastAll('presence:update', { userId, onlineStatus: 'offline' });
    }
    if (prevRoom) {
      db.prepare('UPDATE rooms SET viewer_count = MAX(1, viewer_count - 1) WHERE id = ?').run(prevRoom);
      const updated = getRoomFull(prevRoom);
      if (updated) broadcastToRoom(prevRoom, 'room:updated', updated);
    }
  });
});

// ============================================================================
// SYSTEM CONFIG & LIVEKIT TOKEN
// ============================================================================
app.get('/api/config/status', (_req, res) => {
  res.json({
    supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
    livekitConfigured: Boolean(
      process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
    ),
    livekitUrl: process.env.LIVEKIT_URL || null,
    paymentProviderConfigured: Boolean(process.env.PAYMENT_PROVIDER_KEY),
  });
});

app.post('/api/livekit/token', authMiddleware, (req: AuthedRequest, res) => {
  const { LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET } = process.env;
  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    res.status(503).json({
      configured: false,
      error: "LiveKit jonli ovoz xizmati hali sozlanmagan (LIVEKIT_URL / API kalitlari kiritilmagan).",
    });
    return;
  }
  const { roomId, canPublish } = req.body as { roomId?: string; canPublish?: boolean };
  if (!roomId) {
    res.status(400).json({ error: 'Xona ID ko‘rsatilishi shart' });
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: req.user.id,
    nbf: now,
    exp: now + 3600 * 4,
    name: req.user.nickname,
    video: {
      roomJoin: true,
      room: roomId,
      canPublish: Boolean(canPublish),
      canSubscribe: true,
      canPublishData: true,
    },
  };
  const token = jwt.sign(payload, LIVEKIT_API_SECRET, { algorithm: 'HS256' });
  res.json({ configured: true, url: LIVEKIT_URL, token });
});

// ============================================================================
// AUTHENTICATION & PROFILES
// ============================================================================
app.post('/api/auth/register', (req, res) => {
  const { email, password, nickname, gender, country, birthYear } = req.body || {};
  if (!email || !password || !nickname) {
    res.status(400).json({ error: "Elektron pochta, parol va taxallus majburiy" });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(String(email).trim());
  if (existing) {
    res.status(409).json({ error: "Bu elektron pochta allaqachon ro'yxatdan o'tgan" });
    return;
  }

  const id = generateId('u');
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  const publicId = `TC-${10001 + count + Math.floor(Math.random() * 90)}`;
  const passwordHash = bcrypt.hashSync(String(password), 10);
  const avatars = [
    '/src/assets/images/avatar_host_male_1794822314575.jpg',
    '/src/assets/images/avatar_host_female_1794822314393.jpg',
    '/src/assets/images/avatar_host_creator_1794822315118.jpg',
  ];
  const avatarUrl =
    gender === 'female' ? avatars[1] : gender === 'male' ? avatars[0] : avatars[2];

  db.prepare(
    `INSERT INTO users (
      id, public_id, email, password_hash, nickname, avatar_url, gender, country,
      online_status, role, coin_balance, birth_year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'online', 'user', 500, ?)`
  ).run(
    id,
    publicId,
    String(email).trim().toLowerCase(),
    passwordHash,
    String(nickname).trim(),
    avatarUrl,
    gender || 'unspecified',
    country || "O'zbekiston",
    birthYear ? Number(birthYear) : null
  );

  createNotification(
    id,
    'system',
    'TURON CHAT ga xush kelibsiz!',
    "Sizga ro'yxatdan o'tganingiz uchun 500 ta boshlang'ich Tanga taqdim etildi.",
    'wallet'
  );

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signAuthToken(id);
  res.status(201).json({ token, user: mapUserRow(userRow, id) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: "Elektron pochta va parolni kiriting" });
    return;
  }
  const user = db
    .prepare('SELECT * FROM users WHERE lower(email) = lower(?)')
    .get(String(email).trim()) as any;
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    res.status(401).json({ error: "Elektron pochta yoki parol noto'g'ri" });
    return;
  }
  if (user.is_suspended) {
    res.status(403).json({ error: "Hisobingiz ma'muriyat tomonidan to'xtatilgan" });
    return;
  }
  db.prepare("UPDATE users SET online_status = 'online' WHERE id = ?").run(user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  res.json({ token: signAuthToken(user.id), user: mapUserRow(updated, user.id) });
});

app.get('/api/auth/me', authMiddleware, (req: AuthedRequest, res) => {
  res.json({ user: mapUserRow(req.user, req.user.id) });
});

app.put('/api/profile', authMiddleware, (req: AuthedRequest, res) => {
  const {
    nickname,
    bio,
    gender,
    country,
    avatarUrl,
    birthYear,
    equippedMedal,
    photos,
    privacyDm,
    privacyShowOnline,
    notifyMessages,
    notifyGifts,
    notifyRooms,
    language,
  } = req.body || {};

  db.prepare(
    `UPDATE users SET
      nickname = COALESCE(?, nickname),
      bio = COALESCE(?, bio),
      gender = COALESCE(?, gender),
      country = COALESCE(?, country),
      avatar_url = COALESCE(?, avatar_url),
      birth_year = COALESCE(?, birth_year),
      equipped_medal = COALESCE(?, equipped_medal),
      photos_json = COALESCE(?, photos_json),
      privacy_dm = COALESCE(?, privacy_dm),
      privacy_show_online = COALESCE(?, privacy_show_online),
      notify_messages = COALESCE(?, notify_messages),
      notify_gifts = COALESCE(?, notify_gifts),
      notify_rooms = COALESCE(?, notify_rooms),
      language = COALESCE(?, language)
     WHERE id = ?`
  ).run(
    nickname?.trim() || null,
    bio !== undefined ? String(bio) : null,
    gender || null,
    country || null,
    avatarUrl || null,
    birthYear !== undefined ? Number(birthYear) : null,
    equippedMedal || null,
    Array.isArray(photos) ? JSON.stringify(photos.slice(0, 12)) : null,
    privacyDm || null,
    privacyShowOnline !== undefined ? (privacyShowOnline ? 1 : 0) : null,
    notifyMessages !== undefined ? (notifyMessages ? 1 : 0) : null,
    notifyGifts !== undefined ? (notifyGifts ? 1 : 0) : null,
    notifyRooms !== undefined ? (notifyRooms ? 1 : 0) : null,
    language || null,
    req.user.id
  );

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: mapUserRow(updated, req.user.id) });
});

app.get('/api/users', optionalAuth, (req: AuthedRequest, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const rows = q
    ? (db
        .prepare(
          `SELECT * FROM users WHERE is_suspended = 0 AND (lower(nickname) LIKE ? OR lower(public_id) LIKE ?)
           ORDER BY online_status = 'online' DESC, total_received DESC LIMIT 40`
        )
        .all(`%${q}%`, `%${q}%`) as any[])
    : (db
        .prepare(
          `SELECT * FROM users WHERE is_suspended = 0
           ORDER BY online_status = 'online' DESC, total_received DESC LIMIT 40`
        )
        .all() as any[]);
  res.json({ users: rows.map((r) => mapUserRow(r, req.user?.id)) });
});

app.get('/api/users/:id', optionalAuth, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!row) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    return;
  }
  const receivedGifts = db
    .prepare(
      `SELECT gt.*, g.name as gift_name, g.icon_key as gift_icon, u.nickname as sender_nickname, u.avatar_url as sender_avatar
       FROM gift_transactions gt
       JOIN gifts g ON g.id = gt.gift_id
       JOIN users u ON u.id = gt.sender_id
       WHERE gt.receiver_id = ?
       ORDER BY gt.created_at DESC LIMIT 20`
    )
    .all(row.id);
  res.json({ user: mapUserRow(row, req.user?.id), receivedGifts });
});

// Follow, Friend, Block
app.post('/api/users/:id/follow', authMiddleware, (req: AuthedRequest, res) => {
  const targetId = req.params.id;
  if (targetId === req.user.id) {
    res.status(400).json({ error: "O'zingizga obuna bo'la olmaysiz" });
    return;
  }
  const exists = db
    .prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(req.user.id, targetId);
  if (exists) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, targetId);
    res.json({ following: false });
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, targetId);
    res.json({ following: true });
  }
});

app.post('/api/users/:id/friend-request', authMiddleware, (req: AuthedRequest, res) => {
  const targetId = req.params.id;
  if (targetId === req.user.id) {
    res.status(400).json({ error: "O'zingizga so'rov yubora olmaysiz" });
    return;
  }
  const existing = db
    .prepare(
      `SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
    )
    .get(req.user.id, targetId, targetId, req.user.id) as any;

  if (existing) {
    if (existing.status === 'pending' && existing.addressee_id === req.user.id) {
      db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(existing.id);
      const notif = createNotification(
        targetId,
        'friend_request',
        "Do'stlik tasdiqlandi",
        `${req.user.nickname} sizning do'stlik so'rovingizni qabul qildi.`,
        'messages'
      );
      sendToUser(targetId, 'notification:new', notif);
      res.json({ status: 'accepted' });
      return;
    }
    res.json({ status: existing.status });
    return;
  }

  db.prepare('INSERT INTO friendships (id, requester_id, addressee_id, status) VALUES (?, ?, ?, ?)').run(
    generateId('fr'),
    req.user.id,
    targetId,
    'pending'
  );
  const notif = createNotification(
    targetId,
    'friend_request',
    "Yangi do'stlik so'rovi",
    `${req.user.nickname} (${req.user.public_id}) sizga do'stlik so'rovi yubordi.`,
    'messages'
  );
  sendToUser(targetId, 'notification:new', notif);
  res.json({ status: 'pending' });
});

app.post('/api/friends/:id/respond', authMiddleware, (req: AuthedRequest, res) => {
  const { accept } = req.body || {};
  const fr = db.prepare('SELECT * FROM friendships WHERE id = ?').get(req.params.id) as any;
  if (!fr || fr.addressee_id !== req.user.id) {
    res.status(404).json({ error: "Do'stlik so'rovi topilmadi" });
    return;
  }
  db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run(accept ? 'accepted' : 'declined', fr.id);
  if (accept) {
    const notif = createNotification(
      fr.requester_id,
      'friend_request',
      "Do'stlik qabul qilindi",
      `${req.user.nickname} do'stlik so'rovingizni tasdiqladi.`,
      'messages'
    );
    sendToUser(fr.requester_id, 'notification:new', notif);
  }
  res.json({ ok: true });
});

app.get('/api/friends', authMiddleware, (req: AuthedRequest, res) => {
  const accepted = db
    .prepare(
      `SELECT u.* FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'`
    )
    .all(req.user.id, req.user.id, req.user.id) as any[];

  const incoming = db
    .prepare(
      `SELECT f.id as request_id, u.* FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = ? AND f.status = 'pending'`
    )
    .all(req.user.id) as any[];

  res.json({
    friends: accepted.map((u) => mapUserRow(u, req.user.id)),
    incomingRequests: incoming.map((r) => ({
      requestId: r.request_id,
      user: mapUserRow(r, req.user.id),
    })),
  });
});

app.post('/api/users/:id/block', authMiddleware, (req: AuthedRequest, res) => {
  const targetId = req.params.id;
  const exists = db
    .prepare('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?')
    .get(req.user.id, targetId);
  if (exists) {
    db.prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?').run(req.user.id, targetId);
    res.json({ blocked: false });
  } else {
    db.prepare('INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)').run(req.user.id, targetId);
    res.json({ blocked: true });
  }
});

// ============================================================================
// VOICE ROOMS
// ============================================================================
app.get('/api/rooms', optionalAuth, (req: AuthedRequest, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const category = String(req.query.category || '').trim();
  let sql = 'SELECT id FROM rooms WHERE is_active = 1';
  const params: any[] = [];
  if (q) {
    sql += ' AND (lower(title) LIKE ? OR lower(description) LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }
  if (category && category !== 'Barchasi') {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY is_featured DESC, viewer_count DESC, created_at DESC';
  const rows = db.prepare(sql).all(...params) as Array<{ id: string }>;
  const rooms = rows.map((r) => getRoomFull(r.id, req.user?.id)).filter(Boolean);
  res.json({ rooms });
});

app.post('/api/rooms', authMiddleware, (req: AuthedRequest, res) => {
  const {
    title,
    description,
    announcement,
    welcomeRoomMsg,
    welcomeUserMsg,
    publicScreenEnabled,
    sensitiveWords,
    roomType,
    micMode,
    requireMemberApproval,
    superMicEnabled,
    videoUrl,
    videoTitle,
    category,
    maxSeats,
    isPrivate,
    password,
    backgroundTheme,
    visualEffect,
    dynamicBg,
    coverUrl,
  } = req.body || {};
  if (!title || String(title).trim().length < 2) {
    res.status(400).json({ error: 'Xona nomi kamida 2 ta belgi bo‘lishi kerak' });
    return;
  }
  const existingOwned = db
    .prepare(
      'SELECT id FROM rooms WHERE owner_id = ? AND is_active = 1 AND COALESCE(is_wedding_room, 0) = 0 LIMIT 1'
    )
    .get(req.user.id) as { id: string } | undefined;
  if (existingOwned) {
    res.status(400).json({
      error: 'Sizda allaqachon shaxsiy xona mavjud. Xonaga kirish tugmasi orqali kiring.',
    });
    return;
  }
  const seatCount = Math.min(20, Math.max(2, Number(maxSeats) || 9));
  const id = generateId('room');
  const covers = [
    '/src/assets/images/turon_hero_banner_1794822313365.jpg',
    '/src/assets/images/room_cover_music_1794822313674.jpg',
    '/src/assets/images/room_cover_lounge_1794822314263.jpg',
    '/src/assets/images/room_cover_talk_1794822313757.jpg',
  ];
  const chosenCover = coverUrl || covers[Math.floor(Math.random() * covers.length)];
  const pwdHash = isPrivate && password ? bcrypt.hashSync(String(password), 8) : null;

  db.prepare(
    `INSERT INTO rooms (
      id, title, description, announcement, welcome_room_msg, welcome_user_msg,
      public_screen_enabled, sensitive_words, room_type, mic_mode,
      require_member_approval, super_mic_enabled, video_url, video_title,
      cover_url, category, owner_id, max_seats,
      is_private, password_hash, background_theme, visual_effect, dynamic_bg, is_featured, is_active, viewer_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1)`
  ).run(
    id,
    String(title).trim(),
    String(description || '').trim(),
    String(announcement || description || '').trim(),
    String(welcomeRoomMsg || '').trim(),
    String(welcomeUserMsg || '').trim(),
    publicScreenEnabled === false ? 0 : 1,
    String(sensitiveWords || '').trim(),
    roomType === 'video' ? 'video' : 'chat',
    micMode === 'request' ? 'request' : 'open',
    requireMemberApproval ? 1 : 0,
    superMicEnabled ? 1 : 0,
    String(videoUrl || '').trim(),
    String(videoTitle || '').trim(),
    chosenCover,
    category || 'Suhbat',
    req.user.id,
    seatCount,
    isPrivate ? 1 : 0,
    pwdHash,
    backgroundTheme || 'sapphire',
    visualEffect || 'aurora',
    dynamicBg || 'campfire-night'
  );

  const insertSeat = db.prepare(
    'INSERT INTO room_seats (room_id, seat_number, user_id, is_muted, is_locked) VALUES (?, ?, ?, 0, 0)'
  );
  for (let s = 1; s <= 20; s++) {
    insertSeat.run(id, s, s === 1 ? req.user.id : null);
  }

  const room = getRoomFull(id, req.user.id);
  broadcastAll('rooms:created', room);
  res.status(201).json({ room });
});

app.post('/api/rooms/:id/enter', authMiddleware, (req: AuthedRequest, res) => {
  const roomRow = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!roomRow || !roomRow.is_active) {
    res.status(404).json({ error: 'Xona topilmadi yoki yopilgan' });
    return;
  }
  const banned = db
    .prepare('SELECT 1 FROM room_bans WHERE room_id = ? AND user_id = ?')
    .get(roomRow.id, req.user.id);
  if (banned) {
    res.status(403).json({ error: 'Siz ushbu xonadan chetlatilgansiz' });
    return;
  }
  if (roomRow.is_private && roomRow.password_hash && roomRow.owner_id !== req.user.id) {
    const pwd = String(req.body?.password || '');
    if (!bcrypt.compareSync(pwd, roomRow.password_hash)) {
      res.status(403).json({ error: "Xona paroli noto'g'ri", needsPassword: true });
      return;
    }
  }
  const room = getRoomFull(roomRow.id, req.user.id);
  const messages = db
    .prepare(
      `SELECT rm.*, u.nickname as sender_nickname, u.avatar_url as sender_avatar,
              u.role as sender_role, u.vip_level as sender_vip_level, u.svip_level as sender_svip_level
       FROM room_messages rm
       JOIN users u ON u.id = rm.sender_id
       WHERE rm.room_id = ?
       ORDER BY rm.created_at DESC LIMIT 60`
    )
    .all(roomRow.id)
    .reverse()
    .map((m: any) => ({
      id: m.id,
      roomId: m.room_id,
      senderId: m.sender_id,
      senderNickname: m.sender_nickname,
      senderAvatar: m.sender_avatar,
      senderRole: m.sender_role,
      senderVipLevel: m.sender_vip_level,
      senderSvipLevel: m.sender_svip_level,
      content: m.content,
      msgType: m.msg_type,
      audioUrl: m.audio_url || null,
      audioDurationSec: Number(m.audio_duration_sec || 0),
      createdAt: m.created_at,
    }));

  const entryId = generateId('rte');
  const nowIso = new Date().toISOString();
  db.prepare(
    `INSERT INTO room_traffic_events (id, room_id, event_type, user_id, coins_amount, created_at)
     VALUES (?, ?, 'enter', ?, 0, ?)`
  ).run(entryId, roomRow.id, req.user.id, nowIso);

  const entryPayload = {
    id: entryId,
    roomId: roomRow.id,
    userId: req.user.id,
    nickname: req.user.nickname,
    avatarUrl: req.user.avatar_url || '',
    role: req.user.role,
    vipLevel: req.user.vip_level || 0,
    svipLevel: req.user.svip_level || 0,
    timestamp: nowIso,
  };
  broadcastToRoom(roomRow.id, 'room:user_entered', entryPayload);
  broadcastToRoom(roomRow.id, 'room:analytics_updated', { roomId: roomRow.id });

  res.json({ room, messages, entryEvent: entryPayload });
});

app.get('/api/rooms/:id/analytics', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  const room = db.prepare('SELECT id, viewer_count FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }

  const totalEntriesRow = db
    .prepare(`SELECT COUNT(*) as c FROM room_traffic_events WHERE room_id = ? AND event_type = 'enter'`)
    .get(roomId) as { c: number };

  const giftTotalsRow = db
    .prepare(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(total_coins), 0) as coins
       FROM gift_transactions WHERE room_id = ?`
    )
    .get(roomId) as { cnt: number; coins: number };

  // Build 12 hourly buckets over the last 12 hours
  const now = new Date();
  const buckets: Array<{ label: string; key: string; entries: number; giftsCount: number; giftCoins: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600 * 1000);
    const key = d.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const hh = String(d.getHours()).padStart(2, '0');
    buckets.push({
      label: `${hh}:00`,
      key,
      entries: 0,
      giftsCount: 0,
      giftCoins: 0,
    });
  }

  const sinceIso = new Date(now.getTime() - 12 * 3600 * 1000).toISOString();
  const eventRows = db
    .prepare(
      `SELECT event_type, coins_amount, created_at
       FROM room_traffic_events
       WHERE room_id = ? AND created_at >= ?`
    )
    .all(roomId, sinceIso) as Array<{ event_type: string; coins_amount: number; created_at: string }>;

  for (const ev of eventRows) {
    const iso = ev.created_at.includes('T') ? ev.created_at : ev.created_at.replace(' ', 'T') + 'Z';
    const key = iso.slice(0, 13);
    const bucket = buckets.find((b) => b.key === key) || buckets[buckets.length - 1];
    if (ev.event_type === 'enter') {
      bucket.entries += 1;
    } else if (ev.event_type === 'gift') {
      bucket.giftsCount += 1;
      bucket.giftCoins += Number(ev.coins_amount || 0);
    }
  }

  // Also include historical gift_transactions in the last 12h if room_traffic_events didn't have them
  const giftTxRows = db
    .prepare(
      `SELECT total_coins, created_at FROM gift_transactions
       WHERE room_id = ? AND created_at >= ?`
    )
    .all(roomId, sinceIso) as Array<{ total_coins: number; created_at: string }>;
  if (giftTxRows.length > 0 && eventRows.filter((e) => e.event_type === 'gift').length === 0) {
    for (const gtx of giftTxRows) {
      const iso = gtx.created_at.includes('T') ? gtx.created_at : gtx.created_at.replace(' ', 'T') + 'Z';
      const key = iso.slice(0, 13);
      const bucket = buckets.find((b) => b.key === key) || buckets[buckets.length - 1];
      bucket.giftsCount += 1;
      bucket.giftCoins += Number(gtx.total_coins || 0);
    }
  }

  const topGifters = db
    .prepare(
      `SELECT u.id as user_id, u.nickname, u.avatar_url,
              SUM(gt.total_coins) as total_coins, COUNT(*) as gifts_count
       FROM gift_transactions gt
       JOIN users u ON u.id = gt.sender_id
       WHERE gt.room_id = ?
       GROUP BY gt.sender_id
       ORDER BY total_coins DESC
       LIMIT 5`
    )
    .all(roomId)
    .map((r: any) => ({
      userId: r.user_id,
      nickname: r.nickname,
      avatarUrl: r.avatar_url || '',
      totalCoins: Number(r.total_coins || 0),
      giftsCount: Number(r.gifts_count || 0),
    }));

  const recentEvents = db
    .prepare(
      `SELECT rte.id, rte.event_type, rte.coins_amount, rte.created_at, u.nickname
       FROM room_traffic_events rte
       JOIN users u ON u.id = rte.user_id
       WHERE rte.room_id = ?
       ORDER BY rte.created_at DESC
       LIMIT 15`
    )
    .all(roomId)
    .map((r: any) => ({
      id: r.id,
      eventType: r.event_type as 'enter' | 'gift',
      nickname: r.nickname,
      coinsAmount: Number(r.coins_amount || 0),
      createdAt: r.created_at,
    }));

  res.json({
    roomId,
    viewerCount: room.viewer_count || 1,
    totalEntries: totalEntriesRow.c,
    totalGiftsCount: giftTotalsRow.cnt,
    totalGiftCoins: giftTotalsRow.coins,
    buckets: buckets.map(({ label, entries, giftsCount, giftCoins }) => ({
      label,
      entries,
      giftsCount,
      giftCoins,
    })),
    topGifters,
    recentEvents,
  });
});

function ensureDefaultDjTracks(roomId: string, ownerId: string) {
  const countRow = db
    .prepare('SELECT COUNT(*) as c FROM room_dj_tracks WHERE room_id = ?')
    .get(roomId) as { c: number };
  if (countRow.c > 0) return;

  const owner = db.prepare('SELECT nickname FROM users WHERE id = ?').get(ownerId) as
    | { nickname: string }
    | undefined;
  const adderName = owner?.nickname || 'Turon DJ';

  const defaults = [
    {
      id: generateId('dj'),
      title: 'Toshkent Tunlari (Lounge Mix)',
      artist: 'Turon Studio',
      source_url: 'preset://tashkent-nights',
      source_type: 'preset',
      preset_key: 'tashkent-nights',
      duration_sec: 195,
    },
    {
      id: generateId('dj'),
      title: 'Samarqand Yulduzlari',
      artist: 'Sharq Beat',
      source_url: 'preset://samarkand-chill',
      source_type: 'preset',
      preset_key: 'samarkand-chill',
      duration_sec: 210,
    },
    {
      id: generateId('dj'),
      title: 'Turon Club Bass',
      artist: 'DJ Sardor',
      source_url: 'preset://turon-bass',
      source_type: 'preset',
      preset_key: 'turon-bass',
      duration_sec: 180,
    },
  ];

  const insert = db.prepare(`
    INSERT INTO room_dj_tracks (
      id, room_id, title, artist, source_url, source_type, preset_key,
      duration_sec, added_by_id, added_by_name, is_played
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `);
  for (const d of defaults) {
    insert.run(
      d.id,
      roomId,
      d.title,
      d.artist,
      d.source_url,
      d.source_type,
      d.preset_key,
      d.duration_sec,
      ownerId,
      adderName
    );
  }
  db.prepare('UPDATE rooms SET dj_current_track_id = COALESCE(dj_current_track_id, ?) WHERE id = ?').run(
    defaults[0].id,
    roomId
  );
}

function getRoomDjState(roomId: string, viewerId?: string) {
  const room = db
    .prepare('SELECT id, owner_id, dj_current_track_id, dj_is_playing, dj_updated_at FROM rooms WHERE id = ?')
    .get(roomId) as any;
  if (!room) return null;

  ensureDefaultDjTracks(roomId, room.owner_id);
  const refreshedRoom = db
    .prepare('SELECT dj_current_track_id, dj_is_playing, dj_updated_at FROM rooms WHERE id = ?')
    .get(roomId) as any;

  const trackRows = db
    .prepare(
      `SELECT t.*,
              (SELECT COUNT(*) FROM room_dj_votes v WHERE v.track_id = t.id) as votes_count,
              (SELECT 1 FROM room_dj_votes v2 WHERE v2.track_id = t.id AND v2.user_id = ?) as has_voted
       FROM room_dj_tracks t
       WHERE t.room_id = ?
       ORDER BY t.is_played ASC, votes_count DESC, t.created_at ASC`
    )
    .all(viewerId || '', roomId) as any[];

  const queue = trackRows.map((t) => ({
    id: t.id,
    roomId: t.room_id,
    title: t.title,
    artist: t.artist,
    sourceUrl: t.source_url,
    sourceType: (t.source_type || 'preset') as 'preset' | 'audio' | 'youtube',
    presetKey: t.preset_key || 'tashkent-nights',
    durationSec: Number(t.duration_sec || 180),
    addedById: t.added_by_id,
    addedByName: t.added_by_name,
    isPlayed: Boolean(t.is_played),
    votesCount: Number(t.votes_count || 0),
    hasVoted: Boolean(t.has_voted),
    createdAt: t.created_at,
  }));

  const currentTrack =
    queue.find((t) => t.id === refreshedRoom.dj_current_track_id) ||
    queue.find((t) => !t.isPlayed) ||
    queue[0] ||
    null;

  return {
    roomId,
    currentTrackId: currentTrack?.id || null,
    isPlaying: Boolean(refreshedRoom.dj_is_playing) && Boolean(currentTrack),
    updatedAt: refreshedRoom.dj_updated_at || null,
    currentTrack,
    queue,
  };
}

app.get('/api/rooms/:id/dj', authMiddleware, (req: AuthedRequest, res) => {
  const state = getRoomDjState(req.params.id, req.user.id);
  if (!state) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  res.json({ dj: state });
});

app.post('/api/rooms/:id/dj/tracks', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  const room = db.prepare('SELECT id, owner_id FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }

  const { title, artist, sourceUrl, sourceType, presetKey, durationSec } = req.body || {};
  const cleanTitle = String(title || '').trim();
  const cleanArtist = String(artist || req.user.nickname).trim();
  const cleanType = ['preset', 'audio', 'youtube'].includes(sourceType) ? sourceType : 'preset';
  const cleanPreset = String(presetKey || 'tashkent-nights').trim();
  const cleanUrl =
    cleanType === 'preset'
      ? `preset://${cleanPreset}`
      : String(sourceUrl || '').trim();

  if (!cleanTitle) {
    res.status(400).json({ error: 'Musiqa nomi kiritilishi shart' });
    return;
  }
  if (cleanType !== 'preset' && !cleanUrl) {
    res.status(400).json({ error: 'Musiqa havolasi kiritilishi shart' });
    return;
  }

  const id = generateId('dj');
  db.prepare(
    `INSERT INTO room_dj_tracks (
      id, room_id, title, artist, source_url, source_type, preset_key,
      duration_sec, added_by_id, added_by_name, is_played
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  ).run(
    id,
    roomId,
    cleanTitle,
    cleanArtist,
    cleanUrl,
    cleanType,
    cleanPreset,
    Math.max(30, Math.min(3600, Number(durationSec) || 180)),
    req.user.id,
    req.user.nickname
  );

  // Auto-start selection if room had no current track
  db.prepare('UPDATE rooms SET dj_current_track_id = COALESCE(dj_current_track_id, ?) WHERE id = ?').run(id, roomId);

  const djState = getRoomDjState(roomId, req.user.id);
  broadcastToRoom(roomId, 'room:dj_updated', { ...djState, hasVotedMapDirty: true });
  res.status(201).json({ dj: djState });
});

app.post('/api/rooms/:id/dj/tracks/:trackId/vote', authMiddleware, (req: AuthedRequest, res) => {
  const { id: roomId, trackId } = req.params;
  const track = db
    .prepare('SELECT id FROM room_dj_tracks WHERE id = ? AND room_id = ?')
    .get(trackId, roomId);
  if (!track) {
    res.status(404).json({ error: 'Trek topilmadi' });
    return;
  }

  const existing = db
    .prepare('SELECT 1 FROM room_dj_votes WHERE track_id = ? AND user_id = ?')
    .get(trackId, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM room_dj_votes WHERE track_id = ? AND user_id = ?').run(trackId, req.user.id);
  } else {
    db.prepare('INSERT INTO room_dj_votes (track_id, user_id) VALUES (?, ?)').run(trackId, req.user.id);
  }

  const djState = getRoomDjState(roomId, req.user.id);
  broadcastToRoom(roomId, 'room:dj_updated', djState);
  res.json({ dj: djState });
});

app.post('/api/rooms/:id/dj/control', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }

  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(roomId, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  if (room.owner_id !== req.user.id && !isMod && !isStaff) {
    res.status(403).json({ error: 'Faqat xona egasi yoki moderator DJ pleyerni boshqara oladi' });
    return;
  }

  const { action, trackId } = req.body as {
    action: 'play' | 'pause' | 'next' | 'select' | 'remove';
    trackId?: string;
  };
  const nowIso = new Date().toISOString();
  const currentState = getRoomDjState(roomId, req.user.id);

  if (action === 'play') {
    const targetId = trackId || currentState?.currentTrackId || currentState?.queue[0]?.id || null;
    if (targetId) {
      db.prepare('UPDATE room_dj_tracks SET is_played = 0 WHERE id = ?').run(targetId);
    }
    db.prepare('UPDATE rooms SET dj_current_track_id = ?, dj_is_playing = 1, dj_updated_at = ? WHERE id = ?').run(
      targetId,
      nowIso,
      roomId
    );
  } else if (action === 'pause') {
    db.prepare('UPDATE rooms SET dj_is_playing = 0, dj_updated_at = ? WHERE id = ?').run(nowIso, roomId);
  } else if (action === 'select' && trackId) {
    db.prepare('UPDATE room_dj_tracks SET is_played = 0 WHERE id = ? AND room_id = ?').run(trackId, roomId);
    db.prepare('UPDATE rooms SET dj_current_track_id = ?, dj_is_playing = 1, dj_updated_at = ? WHERE id = ?').run(
      trackId,
      nowIso,
      roomId
    );
  } else if (action === 'next') {
    if (room.dj_current_track_id) {
      db.prepare('UPDATE room_dj_tracks SET is_played = 1 WHERE id = ?').run(room.dj_current_track_id);
    }
    const nextState = getRoomDjState(roomId, req.user.id);
    const nextTrack = nextState?.queue.find((t) => !t.isPlayed) || nextState?.queue[0] || null;
    if (nextTrack && nextTrack.isPlayed) {
      db.prepare('UPDATE room_dj_tracks SET is_played = 0 WHERE room_id = ?').run(roomId);
    }
    db.prepare('UPDATE rooms SET dj_current_track_id = ?, dj_is_playing = 1, dj_updated_at = ? WHERE id = ?').run(
      nextTrack?.id || null,
      nowIso,
      roomId
    );
  } else if (action === 'remove' && trackId) {
    db.prepare('DELETE FROM room_dj_votes WHERE track_id = ?').run(trackId);
    db.prepare('DELETE FROM room_dj_tracks WHERE id = ? AND room_id = ?').run(trackId, roomId);
    if (room.dj_current_track_id === trackId) {
      const nextTrack = db
        .prepare('SELECT id FROM room_dj_tracks WHERE room_id = ? ORDER BY is_played ASC, created_at ASC LIMIT 1')
        .get(roomId) as { id: string } | undefined;
      db.prepare('UPDATE rooms SET dj_current_track_id = ?, dj_updated_at = ? WHERE id = ?').run(
        nextTrack?.id || null,
        nowIso,
        roomId
      );
    }
  }

  const djState = getRoomDjState(roomId, req.user.id);
  broadcastToRoom(roomId, 'room:dj_updated', djState);
  res.json({ dj: djState });
});

function decodeHeaderText(raw: unknown, fallback = ''): string {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function getRoomMusicState(roomId: string) {
  const room = db
    .prepare(
      'SELECT id, music_current_track_id, music_is_playing, music_position_sec, music_updated_at FROM rooms WHERE id = ?'
    )
    .get(roomId) as any;
  if (!room) return null;

  const rows = db
    .prepare(
      `SELECT id, room_id, title, artist, audio_url, duration_sec, file_size, added_by_id, added_by_name, created_at
       FROM room_music_tracks
       WHERE room_id = ?
       ORDER BY created_at ASC, rowid ASC`
    )
    .all(roomId) as any[];

  const tracks = rows.map((r) => ({
    id: r.id,
    roomId: r.room_id,
    title: r.title,
    artist: r.artist || '',
    audioUrl: r.audio_url,
    durationSec: Number(r.duration_sec || 0),
    fileSize: Number(r.file_size || 0),
    addedById: r.added_by_id,
    addedByName: r.added_by_name,
    createdAt: r.created_at,
  }));

  const currentTrack =
    tracks.find((t) => t.id === room.music_current_track_id) || tracks[0] || null;

  return {
    roomId,
    currentTrackId: currentTrack?.id || null,
    isPlaying: Boolean(room.music_is_playing) && Boolean(currentTrack),
    positionSec: Number(room.music_position_sec || 0),
    updatedAt: room.music_updated_at || null,
    currentTrack,
    tracks,
  };
}

app.get('/api/rooms/:id/music', authMiddleware, (req: AuthedRequest, res) => {
  const state = getRoomMusicState(req.params.id);
  if (!state) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  res.json({ music: state });
});

app.post(
  '/api/rooms/:id/music/upload',
  authMiddleware,
  express.raw({
    type: ['audio/*', 'application/octet-stream'],
    limit: '30mb',
  }),
  (req: AuthedRequest, res) => {
    const roomId = req.params.id;
    const room = db.prepare('SELECT id, owner_id FROM rooms WHERE id = ?').get(roomId) as any;
    if (!room) {
      res.status(404).json({ error: 'Xona topilmadi' });
      return;
    }

    const isBanned = Boolean(
      db.prepare('SELECT 1 FROM room_bans WHERE room_id = ? AND user_id = ?').get(roomId, req.user.id)
    );
    if (isBanned) {
      res.status(403).json({ error: 'Bu xonaga qo‘shiq qo‘sha olmaysiz' });
      return;
    }

    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      res.status(400).json({ error: 'Audio fayl bo‘sh yoki noto‘g‘ri formatda' });
      return;
    }

    const rawFileName = decodeHeaderText(req.headers['x-file-name'], 'music.mp3');
    const ctype = String(req.headers['content-type'] || '').toLowerCase();
    const lowerName = rawFileName.toLowerCase();
    let ext = '.mp3';
    if (lowerName.endsWith('.m4a') || ctype.includes('mp4') || ctype.includes('m4a')) ext = '.m4a';
    else if (lowerName.endsWith('.aac') || ctype.includes('aac')) ext = '.aac';
    else if (lowerName.endsWith('.wav') || ctype.includes('wav')) ext = '.wav';
    else if (lowerName.endsWith('.ogg') || ctype.includes('ogg')) ext = '.ogg';
    else if (lowerName.endsWith('.opus') || ctype.includes('opus')) ext = '.opus';
    else if (lowerName.endsWith('.flac') || ctype.includes('flac')) ext = '.flac';
    else if (lowerName.endsWith('.webm') || ctype.includes('webm')) ext = '.webm';

    const fileName = `music_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const destPath = path.join(roomMusicUploadDir, fileName);
    fs.writeFileSync(destPath, buf);

    const strippedName = rawFileName.replace(/\.[a-z0-9]{1,5}$/i, '').trim();
    const cleanTitle = decodeHeaderText(req.headers['x-track-title'], strippedName || 'Qo‘shiq').slice(0, 120);
    const cleanArtist = decodeHeaderText(req.headers['x-track-artist'], req.user.nickname || '').slice(0, 80);
    const durationSec = Math.max(0, Math.min(7200, Math.round(Number(req.headers['x-track-duration']) || 0)));

    const id = generateId('mus');
    const audioUrl = `/uploads/music/${fileName}`;
    db.prepare(
      `INSERT INTO room_music_tracks (
        id, room_id, title, artist, audio_url, duration_sec, file_size, added_by_id, added_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      roomId,
      cleanTitle || 'Qo‘shiq',
      cleanArtist,
      audioUrl,
      durationSec,
      buf.length,
      req.user.id,
      req.user.nickname
    );

    const nowIso = new Date().toISOString();
    db.prepare(
      'UPDATE rooms SET music_current_track_id = COALESCE(music_current_track_id, ?), music_updated_at = COALESCE(music_updated_at, ?) WHERE id = ?'
    ).run(id, nowIso, roomId);

    const musicState = getRoomMusicState(roomId);
    broadcastToRoom(roomId, 'room:music_updated', musicState);
    res.status(201).json({ music: musicState, trackId: id });
  }
);

app.post('/api/rooms/:id/music/control', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }

  const { action, trackId, positionSec } = (req.body || {}) as {
    action: 'play' | 'pause' | 'select' | 'next' | 'prev' | 'seek' | 'remove';
    trackId?: string;
    positionSec?: number;
  };

  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(roomId, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  const canManageMusic = room.owner_id === req.user.id || isMod || isStaff;

  if (action === 'remove' && trackId) {
    const trackRow = db
      .prepare('SELECT id, audio_url, added_by_id FROM room_music_tracks WHERE id = ? AND room_id = ?')
      .get(trackId, roomId) as { id: string; audio_url: string; added_by_id: string } | undefined;
    if (!trackRow) {
      res.status(404).json({ error: 'Qo‘shiq topilmadi' });
      return;
    }
    if (!canManageMusic && trackRow.added_by_id !== req.user.id) {
      res.status(403).json({ error: 'Faqat xona egasi yoki qo‘shiq egasi o‘chira oladi' });
      return;
    }

    db.prepare('DELETE FROM room_music_tracks WHERE id = ? AND room_id = ?').run(trackId, roomId);

    if (trackRow.audio_url.startsWith('/uploads/music/')) {
      const stillUsed = db
        .prepare('SELECT 1 FROM room_music_tracks WHERE audio_url = ? LIMIT 1')
        .get(trackRow.audio_url);
      if (!stillUsed) {
        const diskPath = path.join(roomMusicUploadDir, path.basename(trackRow.audio_url));
        try {
          if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
        } catch {
          // ignore cleanup failure
        }
      }
    }

    const nowIso = new Date().toISOString();
    if (room.music_current_track_id === trackId) {
      const nextTrack = db
        .prepare('SELECT id FROM room_music_tracks WHERE room_id = ? ORDER BY created_at ASC, rowid ASC LIMIT 1')
        .get(roomId) as { id: string } | undefined;
      db.prepare(
        'UPDATE rooms SET music_current_track_id = ?, music_is_playing = ?, music_position_sec = 0, music_updated_at = ? WHERE id = ?'
      ).run(nextTrack?.id || null, nextTrack ? room.music_is_playing : 0, nowIso, roomId);
    }

    const musicState = getRoomMusicState(roomId);
    broadcastToRoom(roomId, 'room:music_updated', musicState);
    res.json({ music: musicState });
    return;
  }

  if (!canManageMusic) {
    res.status(403).json({ error: 'Faqat xona egasi yoki moderator musiqani boshqara oladi' });
    return;
  }

  const currentState = getRoomMusicState(roomId);
  const tracks = currentState?.tracks || [];
  const nowIso = new Date().toISOString();

  if (action === 'play') {
    const targetId = trackId || currentState?.currentTrackId || tracks[0]?.id || null;
    if (!targetId) {
      res.status(400).json({ error: 'Avval qo‘shiq qo‘shing' });
      return;
    }
    const pos =
      typeof positionSec === 'number' && Number.isFinite(positionSec)
        ? Math.max(0, Math.round(positionSec))
        : Number(room.music_position_sec || 0);
    db.prepare(
      'UPDATE rooms SET music_current_track_id = ?, music_is_playing = 1, music_position_sec = ?, music_updated_at = ? WHERE id = ?'
    ).run(targetId, pos, nowIso, roomId);
  } else if (action === 'pause') {
    const pos =
      typeof positionSec === 'number' && Number.isFinite(positionSec)
        ? Math.max(0, Math.round(positionSec))
        : Number(room.music_position_sec || 0);
    db.prepare(
      'UPDATE rooms SET music_is_playing = 0, music_position_sec = ?, music_updated_at = ? WHERE id = ?'
    ).run(pos, nowIso, roomId);
  } else if (action === 'select' && trackId) {
    const exists = tracks.some((t) => t.id === trackId);
    if (!exists) {
      res.status(404).json({ error: 'Qo‘shiq topilmadi' });
      return;
    }
    db.prepare(
      'UPDATE rooms SET music_current_track_id = ?, music_is_playing = 1, music_position_sec = 0, music_updated_at = ? WHERE id = ?'
    ).run(trackId, nowIso, roomId);
  } else if (action === 'next' && tracks.length > 0) {
    const curIdx = tracks.findIndex((t) => t.id === currentState?.currentTrackId);
    const nextTrack = tracks[(curIdx + 1) % tracks.length];
    db.prepare(
      'UPDATE rooms SET music_current_track_id = ?, music_is_playing = 1, music_position_sec = 0, music_updated_at = ? WHERE id = ?'
    ).run(nextTrack.id, nowIso, roomId);
  } else if (action === 'prev' && tracks.length > 0) {
    const curIdx = tracks.findIndex((t) => t.id === currentState?.currentTrackId);
    const prevIdx = curIdx <= 0 ? tracks.length - 1 : curIdx - 1;
    const prevTrack = tracks[prevIdx];
    db.prepare(
      'UPDATE rooms SET music_current_track_id = ?, music_is_playing = 1, music_position_sec = 0, music_updated_at = ? WHERE id = ?'
    ).run(prevTrack.id, nowIso, roomId);
  } else if (action === 'seek') {
    const pos = Math.max(0, Math.round(Number(positionSec) || 0));
    db.prepare('UPDATE rooms SET music_position_sec = ?, music_updated_at = ? WHERE id = ?').run(
      pos,
      nowIso,
      roomId
    );
  }

  const musicState = getRoomMusicState(roomId);
  broadcastToRoom(roomId, 'room:music_updated', musicState);
  res.json({ music: musicState });
});

app.put('/api/rooms/:id', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(room.id, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  if (room.owner_id !== req.user.id && !isMod && !isStaff) {
    res.status(403).json({ error: 'Xonani tahrirlash huquqingiz yo‘q' });
    return;
  }
  const {
    title,
    description,
    announcement,
    welcomeRoomMsg,
    welcomeUserMsg,
    publicScreenEnabled,
    sensitiveWords,
    roomType,
    micMode,
    requireMemberApproval,
    superMicEnabled,
    videoUrl,
    videoTitle,
    category,
    maxSeats,
    backgroundTheme,
    visualEffect,
    dynamicBg,
    isPrivate,
    password,
  } = req.body || {};
  const nextSeats = maxSeats ? Math.min(20, Math.max(2, Number(maxSeats))) : room.max_seats;
  const pwdHash =
    isPrivate === true && password ? bcrypt.hashSync(String(password), 8) : isPrivate === false ? null : room.password_hash;

  db.prepare(
    `UPDATE rooms SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      announcement = COALESCE(?, announcement),
      welcome_room_msg = COALESCE(?, welcome_room_msg),
      welcome_user_msg = COALESCE(?, welcome_user_msg),
      public_screen_enabled = COALESCE(?, public_screen_enabled),
      sensitive_words = COALESCE(?, sensitive_words),
      room_type = COALESCE(?, room_type),
      mic_mode = COALESCE(?, mic_mode),
      require_member_approval = COALESCE(?, require_member_approval),
      super_mic_enabled = COALESCE(?, super_mic_enabled),
      video_url = COALESCE(?, video_url),
      video_title = COALESCE(?, video_title),
      category = COALESCE(?, category),
      max_seats = ?,
      background_theme = COALESCE(?, background_theme),
      visual_effect = COALESCE(?, visual_effect),
      dynamic_bg = COALESCE(?, dynamic_bg),
      is_private = COALESCE(?, is_private),
      password_hash = ?
     WHERE id = ?`
  ).run(
    title?.trim() || null,
    description !== undefined ? String(description) : null,
    announcement !== undefined ? String(announcement) : null,
    welcomeRoomMsg !== undefined ? String(welcomeRoomMsg) : null,
    welcomeUserMsg !== undefined ? String(welcomeUserMsg) : null,
    publicScreenEnabled !== undefined ? (publicScreenEnabled ? 1 : 0) : null,
    sensitiveWords !== undefined ? String(sensitiveWords) : null,
    roomType ? (roomType === 'video' ? 'video' : 'chat') : null,
    micMode ? (micMode === 'request' ? 'request' : 'open') : null,
    requireMemberApproval !== undefined ? (requireMemberApproval ? 1 : 0) : null,
    superMicEnabled !== undefined ? (superMicEnabled ? 1 : 0) : null,
    videoUrl !== undefined ? String(videoUrl) : null,
    videoTitle !== undefined ? String(videoTitle) : null,
    category || null,
    nextSeats,
    backgroundTheme || null,
    visualEffect || null,
    dynamicBg || null,
    isPrivate !== undefined ? (isPrivate ? 1 : 0) : null,
    pwdHash,
    room.id
  );

  // Clear users from seats above new maxSeats
  db.prepare('UPDATE room_seats SET user_id = NULL WHERE room_id = ? AND seat_number > ?').run(room.id, nextSeats);

  const updated = getRoomFull(room.id, req.user.id);
  broadcastToRoom(room.id, 'room:updated', updated);
  res.json({ room: updated });
});

function canManageRoomAccess(room: any, user: any): boolean {
  if (!room || !user) return false;
  if (room.owner_id === user.id) return true;
  if (['founder', 'super_admin', 'admin', 'moderator'].includes(user.role)) return true;
  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(room.id, user.id)
  );
  return isMod;
}

function sanitizeRibbonImage(raw: unknown): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (
    s.startsWith('data:image/') ||
    s.startsWith('/src/assets/') ||
    s.startsWith('/assets/') ||
    s.startsWith('/uploads/') ||
    s.startsWith('https://') ||
    s.startsWith('http://')
  ) {
    return s;
  }
  return '';
}

app.post('/api/rooms/:id/rocket-ribbon', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  if (!canManageRoomAccess(room, req.user)) {
    res.status(403).json({ error: 'Raketa lentasiga faqat xona egasi yoki admin qo‘sha oladi' });
    return;
  }
  const { title, subtitle, imageUrl, actionType, targetUrl } = req.body || {};
  const cleanTitle = String(title || '').trim().slice(0, 24);
  if (!cleanTitle) {
    res.status(400).json({ error: 'Lenta elementi nomi kiritilishi shart' });
    return;
  }
  const cleanSubtitle = String(subtitle || '').trim().slice(0, 24);
  const cleanAction = ['gift', 'games', 'rocket', 'music', 'link'].includes(actionType)
    ? actionType
    : 'gift';
  const cleanImage = sanitizeRibbonImage(imageUrl);
  const cleanTargetUrl =
    cleanAction === 'link' && String(targetUrl || '').trim().startsWith('http')
      ? String(targetUrl).trim().slice(0, 300)
      : '';

  let items: any[] = [];
  try {
    const parsed = JSON.parse(room.rocket_ribbon_json || '[]');
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = [];
  }

  if (items.length >= 10) {
    res.status(400).json({ error: 'Raketa lentasiga ko‘pi bilan 10 ta qo‘shimcha narsa qo‘shish mumkin' });
    return;
  }

  items.push({
    id: generateId('rrb'),
    title: cleanTitle,
    subtitle: cleanSubtitle || 'Kirish',
    imageUrl: cleanImage,
    actionType: cleanAction,
    targetUrl: cleanTargetUrl,
  });

  db.prepare('UPDATE rooms SET rocket_ribbon_json = ? WHERE id = ?').run(JSON.stringify(items), room.id);
  const updated = getRoomFull(room.id, req.user.id);
  broadcastToRoom(room.id, 'room:updated', updated);
  res.status(201).json({ room: updated });
});

app.delete('/api/rooms/:id/rocket-ribbon/:itemId', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  if (!canManageRoomAccess(room, req.user)) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }

  let items: any[] = [];
  try {
    const parsed = JSON.parse(room.rocket_ribbon_json || '[]');
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = [];
  }

  const next = items.filter((it) => it.id !== req.params.itemId);
  db.prepare('UPDATE rooms SET rocket_ribbon_json = ? WHERE id = ?').run(JSON.stringify(next), room.id);
  const updated = getRoomFull(room.id, req.user.id);
  broadcastToRoom(room.id, 'room:updated', updated);
  res.json({ room: updated });
});

app.put('/api/rooms/:id/game-ribbon', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  if (!canManageRoomAccess(room, req.user)) {
    res.status(403).json({ error: 'O‘yinlar lentasini faqat xona egasi yoki admin sozlay oladi' });
    return;
  }
  const rawIds = Array.isArray(req.body?.gameIds) ? req.body.gameIds : [];
  const cleanIds = rawIds
    .filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
    .slice(0, 12);
  if (cleanIds.length === 0) {
    res.status(400).json({ error: 'Kamida 1 ta o‘yin tanlanishi kerak' });
    return;
  }

  db.prepare('UPDATE rooms SET game_ribbon_json = ? WHERE id = ?').run(JSON.stringify(cleanIds), room.id);
  const updated = getRoomFull(room.id, req.user.id);
  broadcastToRoom(room.id, 'room:updated', updated);
  res.json({ room: updated });
});

app.post('/api/rooms/:id/seats/:seatNumber/take', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  const seatNum = Number(req.params.seatNumber);
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room || seatNum < 1 || seatNum > room.max_seats) {
    res.status(400).json({ error: "Noto'g'ri mikrofon o'rni" });
    return;
  }
  if (seatNum === 1 && room.owner_id !== req.user.id) {
    res.status(403).json({ error: "Egasi o‘rniga faqat xona egasi chiqa oladi" });
    return;
  }
  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(roomId, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  if (room.mic_mode === 'request' && room.owner_id !== req.user.id && !isMod && !isStaff) {
    res.status(403).json({ error: "Mikrofon rejimi yopiq (so‘rov bilan) — xona egasi ruxsati kerak" });
    return;
  }
  const seat = db
    .prepare('SELECT * FROM room_seats WHERE room_id = ? AND seat_number = ?')
    .get(roomId, seatNum) as any;
  if (!seat || seat.is_locked) {
    res.status(403).json({ error: "Bu mikrofon o'rni qulflangan" });
    return;
  }
  if (seat.user_id && seat.user_id !== req.user.id) {
    res.status(409).json({ error: "Bu o'rin band" });
    return;
  }
  db.prepare('UPDATE room_seats SET user_id = NULL WHERE room_id = ? AND user_id = ?').run(roomId, req.user.id);
  db.prepare('UPDATE room_seats SET user_id = ?, is_muted = 0 WHERE room_id = ? AND seat_number = ?').run(
    req.user.id,
    roomId,
    seatNum
  );
  const updated = getRoomFull(roomId, req.user.id);
  broadcastToRoom(roomId, 'room:updated', updated);
  res.json({ room: updated });
});

app.post('/api/rooms/:id/seats/leave', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  db.prepare('UPDATE room_seats SET user_id = NULL, is_muted = 0 WHERE room_id = ? AND user_id = ?').run(
    roomId,
    req.user.id
  );
  const updated = getRoomFull(roomId, req.user.id);
  broadcastToRoom(roomId, 'room:updated', updated);
  res.json({ room: updated });
});

app.post('/api/rooms/:id/seats/:seatNumber/action', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  const seatNum = Number(req.params.seatNumber);
  const { action } = req.body as { action: 'mute' | 'unmute' | 'lock' | 'unlock' | 'kick' };

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const seat = db
    .prepare('SELECT * FROM room_seats WHERE room_id = ? AND seat_number = ?')
    .get(roomId, seatNum) as any;
  if (!seat) {
    res.status(404).json({ error: "O'rin topilmadi" });
    return;
  }

  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(roomId, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  const isOwnerOrMod = room.owner_id === req.user.id || isMod || isStaff;
  const isSelf = seat.user_id === req.user.id;

  if ((action === 'mute' || action === 'unmute') && (isSelf || isOwnerOrMod)) {
    db.prepare('UPDATE room_seats SET is_muted = ? WHERE room_id = ? AND seat_number = ?').run(
      action === 'mute' ? 1 : 0,
      roomId,
      seatNum
    );
  } else if (isOwnerOrMod) {
    if (action === 'lock' || action === 'unlock') {
      if (seatNum === 1 && room.owner_id !== req.user.id) {
        res.status(403).json({ error: "Egasi o‘rnini faqat xona egasi boshqarishi mumkin" });
        return;
      }
      db.prepare('UPDATE room_seats SET is_locked = ?, user_id = CASE WHEN ? = 1 THEN NULL ELSE user_id END WHERE room_id = ? AND seat_number = ?').run(
        action === 'lock' ? 1 : 0,
        action === 'lock' ? 1 : 0,
        roomId,
        seatNum
      );
    } else if (action === 'kick' && seat.user_id) {
      if (seat.user_id === room.owner_id) {
        res.status(403).json({ error: "Xona egasini o‘rindan tushirib bo‘lmaydi" });
        return;
      }
      const kickedUserId = seat.user_id;
      db.prepare('UPDATE room_seats SET user_id = NULL, is_muted = 0 WHERE room_id = ? AND seat_number = ?').run(
        roomId,
        seatNum
      );
      sendToUser(kickedUserId, 'room:kicked', { roomId, title: room.title });
    }
  } else {
    res.status(403).json({ error: 'Bu amal uchun ruxsat yo‘q' });
    return;
  }

  const updated = getRoomFull(roomId, req.user.id);
  broadcastToRoom(roomId, 'room:updated', updated);
  res.json({ room: updated });
});

app.post('/api/rooms/:id/moderators', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const isStaff = ['founder', 'super_admin', 'admin'].includes(req.user.role);
  if (room.owner_id !== req.user.id && !isStaff) {
    res.status(403).json({ error: 'Faqat xona egasi moderator tayinlay oladi' });
    return;
  }
  const { userId } = req.body || {};
  const exists = db
    .prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?')
    .get(room.id, userId);
  if (exists) {
    db.prepare('DELETE FROM room_moderators WHERE room_id = ? AND user_id = ?').run(room.id, userId);
  } else {
    db.prepare('INSERT INTO room_moderators (room_id, user_id, assigned_by) VALUES (?, ?, ?)').run(
      room.id,
      userId,
      req.user.id
    );
  }
  const updated = getRoomFull(room.id, req.user.id);
  broadcastToRoom(room.id, 'room:updated', updated);
  res.json({ room: updated });
});

app.post('/api/rooms/:id/ban', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(room.id, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  if (room.owner_id !== req.user.id && !isMod && !isStaff) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }
  const { userId, reason } = req.body || {};
  db.prepare('INSERT OR REPLACE INTO room_bans (room_id, user_id, banned_by, reason) VALUES (?, ?, ?, ?)').run(
    room.id,
    userId,
    req.user.id,
    reason || 'Xona qoidalarini buzish'
  );
  db.prepare('UPDATE room_seats SET user_id = NULL WHERE room_id = ? AND user_id = ?').run(room.id, userId);
  sendToUser(userId, 'room:banned', { roomId: room.id, title: room.title });
  const updated = getRoomFull(room.id, req.user.id);
  broadcastToRoom(room.id, 'room:updated', updated);
  res.json({ room: updated });
});

app.get('/api/rooms/:id/bans', authMiddleware, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT rb.*, u.nickname, u.public_id, u.avatar_url
       FROM room_bans rb
       JOIN users u ON u.id = rb.user_id
       WHERE rb.room_id = ?
       ORDER BY rb.created_at DESC`
    )
    .all(req.params.id) as any[];
  res.json({
    bans: rows.map((r) => ({
      userId: r.user_id,
      nickname: r.nickname,
      publicId: r.public_id,
      avatarUrl: r.avatar_url,
      reason: r.reason || '',
      createdAt: r.created_at,
    })),
  });
});

app.delete('/api/rooms/:id/bans/:userId', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(room.id, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  if (room.owner_id !== req.user.id && !isMod && !isStaff) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }
  db.prepare('DELETE FROM room_bans WHERE room_id = ? AND user_id = ?').run(room.id, req.params.userId);
  res.json({ ok: true });
});

app.post('/api/rooms/:id/clear-messages', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(room.id, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  if (room.owner_id !== req.user.id && !isMod && !isStaff) {
    res.status(403).json({ error: 'Ekranni tozalash uchun ruxsat yo‘q' });
    return;
  }
  db.prepare('DELETE FROM room_messages WHERE room_id = ?').run(room.id);
  const sysId = generateId('rm');
  const createdAt = new Date().toISOString();
  const sysText = `${req.user.nickname} ommaviy ekran xabarlarini tozaladi.`;
  db.prepare(
    'INSERT INTO room_messages (id, room_id, sender_id, content, msg_type, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(sysId, room.id, req.user.id, sysText, 'system', createdAt);
  broadcastToRoom(room.id, 'room:cleared', {
    roomId: room.id,
    systemMessage: {
      id: sysId,
      roomId: room.id,
      senderId: req.user.id,
      senderNickname: req.user.nickname,
      senderAvatar: req.user.avatar_url,
      senderRole: req.user.role,
      senderVipLevel: req.user.vip_level,
      senderSvipLevel: req.user.svip_level,
      content: sysText,
      msgType: 'system',
      createdAt,
    },
  });
  res.json({ ok: true });
});

app.post('/api/rooms/:id/invite', authMiddleware, (req: AuthedRequest, res) => {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  const { targetUserId } = req.body || {};
  if (!room || !targetUserId) {
    res.status(400).json({ error: 'Xona yoki foydalanuvchi topilmadi' });
    return;
  }
  const notif = createNotification(
    targetUserId,
    'room_invite',
    'Ovozli xonaga taklif',
    `${req.user.nickname} sizni "${room.title}" xonasiga taklif qildi.`,
    `room:${room.id}`
  );
  sendToUser(targetUserId, 'notification:new', notif);
  res.json({ ok: true });
});

app.post('/api/rooms/:id/messages', authMiddleware, (req: AuthedRequest, res) => {
  const roomId = req.params.id;
  if (req.user.is_muted_until && new Date(req.user.is_muted_until).getTime() > Date.now()) {
    res.status(403).json({ error: 'Siz vaqtincha yozishdan cheklangansiz' });
    return;
  }
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const isMod = Boolean(
    db.prepare('SELECT 1 FROM room_moderators WHERE room_id = ? AND user_id = ?').get(roomId, req.user.id)
  );
  const isStaff = ['founder', 'super_admin', 'admin', 'moderator'].includes(req.user.role);
  if (room.public_screen_enabled === 0 && room.owner_id !== req.user.id && !isMod && !isStaff) {
    res.status(403).json({ error: 'Ommaviy ekran xabarlari xona egasi tomonidan vaqtincha o‘chirilgan' });
    return;
  }

  const { content, msgType, audioUrl, audioDurationSec } = req.body || {};
  const isVoice = msgType === 'voice';

  if (isVoice) {
    if (!audioUrl || !String(audioUrl).startsWith('data:audio/')) {
      res.status(400).json({ error: 'Ovozli xabar audio ma’lumoti noto‘g‘ri' });
      return;
    }
    if (String(audioUrl).length > 3_500_000) {
      res.status(400).json({ error: 'Ovozli xabar hajmi juda katta (maksimal 15 soniya)' });
      return;
    }
  } else if (!content || !String(content).trim()) {
    res.status(400).json({ error: 'Xabar bo‘sh bo‘lmasligi kerak' });
    return;
  }

  let cleanText = isVoice
    ? String(content || 'Ovozli xabar').trim() || 'Ovozli xabar'
    : String(content).trim();
  const badWords = String(room.sensitive_words || '')
    .split(',')
    .map((w: string) => w.trim().toLowerCase())
    .filter(Boolean);
  for (const bw of badWords) {
    if (cleanText.toLowerCase().includes(bw)) {
      const escaped = bw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleanText = cleanText.replace(new RegExp(escaped, 'gi'), '***');
    }
  }

  const safeDuration = isVoice
    ? Math.min(15, Math.max(1, Math.round(Number(audioDurationSec) || 1)))
    : 0;
  const finalMsgType = isVoice ? 'voice' : 'text';
  const finalAudioUrl = isVoice ? String(audioUrl) : '';

  const id = generateId('rm');
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO room_messages (id, room_id, sender_id, content, msg_type, audio_url, audio_duration_sec, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, roomId, req.user.id, cleanText, finalMsgType, finalAudioUrl, safeDuration, createdAt);

  const msgObj = {
    id,
    roomId,
    senderId: req.user.id,
    senderNickname: req.user.nickname,
    senderAvatar: req.user.avatar_url,
    senderRole: req.user.role,
    senderVipLevel: req.user.vip_level,
    senderSvipLevel: req.user.svip_level,
    content: cleanText,
    msgType: finalMsgType,
    audioUrl: isVoice ? finalAudioUrl : null,
    audioDurationSec: safeDuration,
    createdAt,
  };
  broadcastToRoom(roomId, 'room:message', msgObj);
  res.status(201).json({ message: msgObj });
});

// ============================================================================
// PRIVATE MESSAGES
// ============================================================================
app.get('/api/messages/conversations', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const partners = db
    .prepare(
      `SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id
       FROM private_messages
       WHERE sender_id = ? OR receiver_id = ?`
    )
    .all(userId, userId, userId) as Array<{ partner_id: string }>;

  const list = partners
    .map((p) => {
      const uRow = db.prepare('SELECT * FROM users WHERE id = ?').get(p.partner_id) as any;
      if (!uRow) return null;
      const last = db
        .prepare(
          `SELECT * FROM private_messages
           WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
           ORDER BY created_at DESC LIMIT 1`
        )
        .get(userId, p.partner_id, p.partner_id, userId) as any;
      const unread = (
        db
          .prepare(
            'SELECT COUNT(*) as c FROM private_messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0'
          )
          .get(p.partner_id, userId) as { c: number }
      ).c;

      return {
        partner: mapUserRow(uRow, userId),
        lastMessage: last
          ? {
              id: last.id,
              senderId: last.sender_id,
              receiverId: last.receiver_id,
              content: last.content,
              attachmentUrl: last.attachment_url,
              attachmentType: last.attachment_type,
              attachmentName: last.attachment_name,
              audioDurationSec: Number(last.audio_duration_sec || 0),
              isRead: Boolean(last.is_read),
              createdAt: last.created_at,
            }
          : null,
        unreadCount: unread,
      };
    })
    .filter(Boolean);

  res.json({ conversations: list });
});

app.get('/api/messages/:partnerId', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const partnerId = req.params.partnerId;

  db.prepare('UPDATE private_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?').run(
    partnerId,
    userId
  );

  const rows = db
    .prepare(
      `SELECT * FROM private_messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC LIMIT 200`
    )
    .all(userId, partnerId, partnerId, userId) as any[];

  res.json({
    messages: rows.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      content: m.content,
      attachmentUrl: m.attachment_url,
      attachmentType: m.attachment_type,
      attachmentName: m.attachment_name,
      audioDurationSec: Number(m.audio_duration_sec || 0),
      isRead: Boolean(m.is_read),
      createdAt: m.created_at,
    })),
  });
});

app.post('/api/messages/:partnerId', authMiddleware, (req: AuthedRequest, res) => {
  const userId = req.user.id;
  const partnerId = req.params.partnerId;

  const blocked = db
    .prepare(
      `SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)`
    )
    .get(userId, partnerId, partnerId, userId);
  if (blocked) {
    res.status(403).json({ error: 'Siz ushbu foydalanuvchi bilan yozisha olmaysiz (bloklangan)' });
    return;
  }

  const partner = db.prepare('SELECT * FROM users WHERE id = ?').get(partnerId) as any;
  if (!partner) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    return;
  }
  if (partner.privacy_dm === 'nobody') {
    res.status(403).json({ error: 'Foydalanuvchi shaxsiy xabarlarni yopib qo‘ygan' });
    return;
  }
  if (partner.privacy_dm === 'friends') {
    const isFriend = db
      .prepare(
        `SELECT 1 FROM friendships WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) AND status = 'accepted'`
      )
      .get(userId, partnerId, partnerId, userId);
    if (!isFriend) {
      res.status(403).json({ error: "Bu foydalanuvchi faqat do'stlaridan xabar qabul qiladi" });
      return;
    }
  }

  const { content, attachmentUrl, attachmentType, attachmentName, audioDurationSec } = req.body || {};
  if (!content && !attachmentUrl) {
    res.status(400).json({ error: 'Xabar matni yoki fayl yuboring' });
    return;
  }
  if (attachmentType === 'voice') {
    if (!attachmentUrl || !String(attachmentUrl).startsWith('data:audio/')) {
      res.status(400).json({ error: 'Ovozli xabar audio ma’lumoti noto‘g‘ri' });
      return;
    }
    if (String(attachmentUrl).length > 3_500_000) {
      res.status(400).json({ error: 'Ovozli xabar hajmi juda katta (maksimal 15 soniya)' });
      return;
    }
  }

  const safeDuration =
    attachmentType === 'voice'
      ? Math.min(15, Math.max(1, Math.round(Number(audioDurationSec) || 1)))
      : 0;

  const id = generateId('pm');
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO private_messages (id, sender_id, receiver_id, content, attachment_url, attachment_type, attachment_name, audio_duration_sec, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  ).run(
    id,
    userId,
    partnerId,
    String(content || '').trim(),
    attachmentUrl || null,
    attachmentType || null,
    attachmentName || null,
    safeDuration,
    createdAt
  );

  const msg = {
    id,
    senderId: userId,
    receiverId: partnerId,
    content: String(content || '').trim(),
    attachmentUrl: attachmentUrl || null,
    attachmentType: attachmentType || null,
    attachmentName: attachmentName || null,
    audioDurationSec: safeDuration,
    isRead: false,
    createdAt,
  };

  sendToUser(partnerId, 'dm:new', msg);
  const notif = createNotification(
    partnerId,
    'message',
    `${req.user.nickname} dan yangi xabar`,
    String(content || attachmentName || 'Rasm/fayl yuborildi').slice(0, 80),
    `messages:${userId}`
  );
  sendToUser(partnerId, 'notification:new', notif);

  res.status(201).json({ message: msg });
});

// ============================================================================
// GIFTS, WALLET & VIP/SVIP
// ============================================================================
app.get('/api/gifts', (_req, res) => {
  const categories = db.prepare('SELECT * FROM gift_categories ORDER BY sort_order ASC').all();
  const gifts = db
    .prepare(
      `SELECT g.*, gc.name as category_name FROM gifts g
       JOIN gift_categories gc ON gc.id = g.category_id
       WHERE g.is_active = 1
       ORDER BY g.price_coins ASC`
    )
    .all()
    .map((g: any) => ({
      id: g.id,
      categoryId: g.category_id,
      categoryName: g.category_name,
      name: g.name,
      iconKey: g.icon_key,
      priceCoins: g.price_coins,
      isAnimated: Boolean(g.is_animated),
      tier: g.tier,
      isActive: Boolean(g.is_active),
      videoUrl: g.video_url || '',
    }));
  res.json({
    categories: categories.map((c: any) => ({ id: c.id, name: c.name, sortOrder: c.sort_order })),
    gifts,
  });
});

app.post('/api/gifts/send', authMiddleware, (req: AuthedRequest, res) => {
  const { giftId, receiverId, roomId, quantity } = req.body || {};
  const qty = Math.max(1, Math.min(999, Number(quantity) || 1));
  const gift = db.prepare('SELECT * FROM gifts WHERE id = ? AND is_active = 1').get(giftId) as any;
  const receiver = db.prepare('SELECT * FROM users WHERE id = ?').get(receiverId) as any;
  if (!gift || !receiver) {
    res.status(404).json({ error: "Sovg'a yoki qabul qiluvchi topilmadi" });
    return;
  }
  const totalCoins = gift.price_coins * qty;
  const freshSender = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (freshSender.coin_balance < totalCoins) {
    res.status(400).json({ error: "Hamyoningizda Tanga yetarli emas" });
    return;
  }

  const txId = generateId('gt');
  const receiptSent = `GFT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 999)}`;
  const receiptRecv = `RCV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 999)}`;

  const runTx = db.transaction(() => {
    let prevRocketLevel = 1;
    let nextRocketLevel = 1;
    let isWeddingRoom = false;

    const roomBefore = roomId
      ? (db.prepare('SELECT rocket_energy, is_wedding_room FROM rooms WHERE id = ?').get(roomId) as any)
      : null;

    if (roomBefore) {
      isWeddingRoom = Boolean(roomBefore.is_wedding_room);
    }

    const effectiveReceivedCoins = isWeddingRoom ? Math.round(totalCoins * 1.1) : totalCoins;
    const guardBoost = Math.max(1, Math.round(totalCoins / 5));

    db.prepare(
      'UPDATE users SET coin_balance = coin_balance - ?, total_gifted = total_gifted + ?, guard_value = guard_value + ? WHERE id = ?'
    ).run(totalCoins, totalCoins, guardBoost, req.user.id);

    db.prepare(
      'UPDATE users SET total_received = total_received + ?, guard_value = guard_value + ? WHERE id = ?'
    ).run(effectiveReceivedCoins, guardBoost, receiver.id);

    db.prepare(
      'INSERT INTO gift_transactions (id, sender_id, receiver_id, room_id, gift_id, quantity, total_coins) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(txId, req.user.id, receiver.id, roomId || null, gift.id, qty, totalCoins);

    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'gift_sent', ?, 0, 'internal', 'confirmed', ?, ?)`
    ).run(generateId('wt'), req.user.id, -totalCoins, receiptSent, `${receiver.nickname} ga ${qty}x ${gift.name}`);

    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'gift_received', ?, 0, 'internal', 'confirmed', ?, ?)`
    ).run(
      generateId('wt'),
      receiver.id,
      effectiveReceivedCoins,
      receiptRecv,
      `${req.user.nickname} dan ${qty}x ${gift.name}${isWeddingRoom ? " (To‘y 1.1× bonus)" : ''}`
    );

    // CP 3000 oltin tanga = +1 yaqinlik & +1 baraka
    let updatedCpId: string | null = null;
    const cpRow = db
      .prepare(
        `SELECT * FROM cp_relationships
         WHERE status IN ('active', 'married')
           AND ((user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?))
         LIMIT 1`
      )
      .get(req.user.id, receiver.id, receiver.id, req.user.id) as any;

    if (cpRow) {
      updatedCpId = cpRow.id;
      const accCoins = Number(cpRow.gift_coin_acc || 0) + effectiveReceivedCoins;
      const earnedUnits = Math.floor(accCoins / 3000);
      const remCoins = accCoins % 3000;
      const today = new Date().toISOString().slice(0, 10);
      const dailyUsed = cpRow.daily_date === today ? Number(cpRow.daily_intimacy_used || 0) : 0;
      const lvl = computeCpLevel(Number(cpRow.intimacy || 0));
      let intGain = earnedUnits;
      if (lvl.dailyLimit !== null) {
        intGain = Math.min(intGain, Math.max(0, lvl.dailyLimit - dailyUsed));
      }
      db.prepare(
        `UPDATE cp_relationships
         SET intimacy = intimacy + ?,
             blessing = blessing + ?,
             gift_coin_acc = ?,
             daily_intimacy_used = ?,
             daily_date = ?
         WHERE id = ?`
      ).run(intGain, earnedUnits, remCoins, dailyUsed + intGain, today, cpRow.id);
    }

    // If room is in an active PK battle, increment PK score!
    // Also charge the Room Rocket energy!
    if (roomId) {
      db.prepare(
        `INSERT INTO room_traffic_events (id, room_id, event_type, user_id, coins_amount, created_at)
         VALUES (?, ?, 'gift', ?, ?, ?)`
      ).run(generateId('rte'), roomId, req.user.id, totalCoins, new Date().toISOString());

      if (roomBefore) {
        prevRocketLevel = computeRoomRocketState(roomBefore.rocket_energy || 0).rocketLevel;
        const newEnergy = (roomBefore.rocket_energy || 0) + totalCoins;
        db.prepare('UPDATE rooms SET rocket_energy = ? WHERE id = ?').run(newEnergy, roomId);
        nextRocketLevel = computeRoomRocketState(newEnergy).rocketLevel;
      }

      const activePk = db
        .prepare(
          `SELECT * FROM pk_battles WHERE status = 'active' AND ends_at > datetime('now') AND (room_a_id = ? OR room_b_id = ?)`
        )
        .get(roomId, roomId) as any;
      if (activePk) {
        if (activePk.room_a_id === roomId) {
          db.prepare('UPDATE pk_battles SET score_a = score_a + ? WHERE id = ?').run(totalCoins, activePk.id);
        } else {
          db.prepare('UPDATE pk_battles SET score_b = score_b + ? WHERE id = ?').run(totalCoins, activePk.id);
        }
      }
    }
    return { prevRocketLevel, nextRocketLevel, isWeddingRoom, effectiveReceivedCoins, cpId: updatedCpId };
  });

  const txResult = runTx();

  const updatedSender = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;

  const giftEvent = {
    id: txId,
    roomId: roomId || '',
    senderId: req.user.id,
    senderNickname: req.user.nickname,
    senderAvatar: req.user.avatar_url,
    receiverId: receiver.id,
    receiverNickname: receiver.nickname,
    receiverAvatar: receiver.avatar_url,
    giftName: gift.name,
    giftIcon: gift.icon_key,
    isAnimated: Boolean(gift.is_animated),
    tier: gift.tier,
    quantity: qty,
    totalCoins,
    effectiveCoins: txResult.effectiveReceivedCoins,
    isWeddingBonus: txResult.isWeddingRoom,
    videoUrl: gift.video_url || '',
  };

  if (txResult.cpId) {
    sendToUser(req.user.id, 'cp:updated', { cpId: txResult.cpId });
    sendToUser(receiver.id, 'cp:updated', { cpId: txResult.cpId });
  }

  if (roomId) {
    const sysMsgId = generateId('rm');
    const bonusSuffix = txResult.isWeddingRoom
      ? ` · To‘y 1.1× bonus (${txResult.effectiveReceivedCoins} Tanga)`
      : '';
    const giftText = `${req.user.nickname} → ${receiver.nickname} ga ${qty}× ${gift.name} (${totalCoins} Tanga${bonusSuffix}) sovg'a qildi`;
    db.prepare('INSERT INTO room_messages (id, room_id, sender_id, content, msg_type) VALUES (?, ?, ?, ?, ?)').run(
      sysMsgId,
      roomId,
      req.user.id,
      giftText,
      'gift'
    );
    broadcastToRoom(roomId, 'room:gift', giftEvent);
    broadcastToRoom(roomId, 'room:message', {
      id: sysMsgId,
      roomId,
      senderId: req.user.id,
      senderNickname: req.user.nickname,
      senderAvatar: req.user.avatar_url,
      senderRole: req.user.role,
      senderVipLevel: req.user.vip_level,
      senderSvipLevel: req.user.svip_level,
      content: giftText,
      msgType: 'gift',
      createdAt: new Date().toISOString(),
    });
    const updatedRoom = getRoomFull(roomId);
    if (updatedRoom) {
      broadcastToRoom(roomId, 'room:updated', updatedRoom);
      broadcastToRoom(roomId, 'room:analytics_updated', { roomId });
      if (txResult.nextRocketLevel !== txResult.prevRocketLevel) {
        broadcastToRoom(roomId, 'room:rocket_launch', {
          roomId,
          rocketLevel: updatedRoom.rocketLevel,
          launchedBy: req.user.nickname,
        });
      }
    }
    // Broadcast updated PK if applicable
    const pkRows = db
      .prepare(`SELECT * FROM pk_battles WHERE status = 'active' AND (room_a_id = ? OR room_b_id = ?)`)
      .all(roomId, roomId) as any[];
    if (pkRows.length > 0) {
      broadcastAll('pk:updated', pkRows[0]);
    }
  }

  // Always notify online receiver so gift effect plays automatically even outside rooms
  if (receiver.id !== req.user.id) {
    sendToUser(receiver.id, 'gift:effect', giftEvent);
  }

  const notif = createNotification(
    receiver.id,
    'gift',
    "Yangi sovg'a oldingiz!",
    `${req.user.nickname} sizga ${qty}× ${gift.name} (${txResult.effectiveReceivedCoins} Tanga${
      txResult.isWeddingRoom ? ' · To‘y 1.1× bonus' : ''
    }) sovg'a yubordi.`,
    'profile'
  );
  sendToUser(receiver.id, 'notification:new', notif);

  res.json({
    user: mapUserRow(updatedSender, req.user.id),
    totalCoins,
    effectiveCoins: txResult.effectiveReceivedCoins,
    giftEvent,
  });
});

app.get('/api/gifts/history', authMiddleware, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT gt.*, g.name as gift_name, g.icon_key as gift_icon,
              s.nickname as sender_nickname, s.avatar_url as sender_avatar,
              r.nickname as receiver_nickname, r.avatar_url as receiver_avatar
       FROM gift_transactions gt
       JOIN gifts g ON g.id = gt.gift_id
       JOIN users s ON s.id = gt.sender_id
       JOIN users r ON r.id = gt.receiver_id
       WHERE gt.sender_id = ? OR gt.receiver_id = ?
       ORDER BY gt.created_at DESC LIMIT 50`
    )
    .all(req.user.id, req.user.id)
    .map((row: any) => ({
      id: row.id,
      senderId: row.sender_id,
      senderNickname: row.sender_nickname,
      senderAvatar: row.sender_avatar,
      receiverId: row.receiver_id,
      receiverNickname: row.receiver_nickname,
      receiverAvatar: row.receiver_avatar,
      roomId: row.room_id,
      giftId: row.gift_id,
      giftName: row.gift_name,
      giftIcon: row.gift_icon,
      quantity: row.quantity,
      totalCoins: row.total_coins,
      createdAt: row.created_at,
    }));
  res.json({ history: rows });
});

// Wallet & Packages
app.get('/api/wallet', authMiddleware, (req: AuthedRequest, res) => {
  const txs = db
    .prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 60')
    .all(req.user.id)
    .map((t: any) => ({
      id: t.id,
      userId: t.user_id,
      txType: t.tx_type,
      amountCoins: t.amount_coins,
      priceUzs: t.price_uzs,
      provider: t.provider,
      status: t.status,
      receiptCode: t.receipt_code,
      note: t.note,
      createdAt: t.created_at,
    }));
  res.json({
    balance: req.user.coin_balance,
    transactions: txs,
    paymentProviderConfigured: Boolean(process.env.PAYMENT_PROVIDER_KEY),
  });
});

app.post('/api/wallet/topup', authMiddleware, (req: AuthedRequest, res) => {
  const { coins, bonusCoins, priceUzs, provider } = req.body || {};
  const baseAmount = Math.floor(Number(coins));
  const bonus = Math.max(0, Math.floor(Number(bonusCoins) || 0));
  const amount = baseAmount + bonus;
  const price = Math.floor(Number(priceUzs));
  if (!baseAmount || baseAmount <= 0 || baseAmount > 500_000_000 || bonus > 50_000_000 || !price || price <= 0) {
    res.status(400).json({ error: "Noto'g'ri to'plam tanlandi" });
    return;
  }

  const receiptCode = `TRN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`;
  const status = 'confirmed';
  const amountText =
    bonus > 0
      ? `${baseAmount.toLocaleString()} + ${bonus.toLocaleString()} bonus Tanga`
      : `${baseAmount.toLocaleString()} Tanga`;

  db.transaction(() => {
    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'topup', ?, ?, ?, ?, ?, ?)`
    ).run(
      generateId('wt'),
      req.user.id,
      amount,
      price,
      provider || 'Payme',
      status,
      receiptCode,
      `${amountText} to'ldirish`
    );

    db.prepare('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?').run(amount, req.user.id);
  })();

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.status(201).json({
    user: mapUserRow(updated, req.user.id),
    receiptCode,
    status,
    message: `${amount.toLocaleString()} Tanga hisobingizga muvaffaqiyatli qo'shildi.`,
  });
});

// VIP & SVIP
app.get('/api/vip/plans', authMiddleware, (req: AuthedRequest, res) => {
  const plans = db
    .prepare('SELECT * FROM vip_plans ORDER BY tier_type ASC, level ASC')
    .all()
    .map((p: any) => ({
      id: p.id,
      tierType: p.tier_type,
      level: p.level,
      name: p.name,
      priceCoins: p.price_coins,
      durationDays: p.duration_days,
      frameStyle: p.frame_style,
      benefits: JSON.parse(p.benefits_json || '[]'),
    }));

  const purchases = db
    .prepare(
      `SELECT vp.*, p.name as plan_name FROM vip_purchases vp
       JOIN vip_plans p ON p.id = vp.plan_id
       WHERE vp.user_id = ?
       ORDER BY vp.created_at DESC`
    )
    .all(req.user.id)
    .map((vp: any) => ({
      id: vp.id,
      userId: vp.user_id,
      planId: vp.plan_id,
      planName: vp.plan_name,
      priceCoins: vp.price_coins,
      startsAt: vp.starts_at,
      expiresAt: vp.expires_at,
      createdAt: vp.created_at,
    }));

  res.json({ plans, purchases });
});

app.post('/api/vip/purchase', authMiddleware, (req: AuthedRequest, res) => {
  const { planId } = req.body || {};
  const plan = db.prepare('SELECT * FROM vip_plans WHERE id = ?').get(planId) as any;
  if (!plan) {
    res.status(404).json({ error: 'VIP rejasi topilmadi' });
    return;
  }
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (freshUser.coin_balance < plan.price_coins) {
    res.status(400).json({ error: 'VIP faollashtirish uchun Tanga yetarli emas' });
    return;
  }

  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + plan.duration_days * 86400 * 1000);
  const receiptCode = `VIP-${Date.now().toString().slice(-6)}`;

  const runTx = db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ? WHERE id = ?').run(plan.price_coins, req.user.id);
    if (plan.tier_type === 'vip') {
      db.prepare('UPDATE users SET vip_level = MAX(vip_level, ?), frame_style = ?, vip_expires_at = ? WHERE id = ?').run(
        plan.level,
        plan.frame_style,
        expiresAt.toISOString(),
        req.user.id
      );
    } else {
      db.prepare('UPDATE users SET svip_level = MAX(svip_level, ?), frame_style = ?, vip_expires_at = ? WHERE id = ?').run(
        plan.level,
        plan.frame_style,
        expiresAt.toISOString(),
        req.user.id
      );
    }
    db.prepare(
      'INSERT INTO vip_purchases (id, user_id, plan_id, price_coins, starts_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(generateId('vp'), req.user.id, plan.id, plan.price_coins, startsAt.toISOString(), expiresAt.toISOString());

    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'vip_purchase', ?, 0, 'internal', 'confirmed', ?, ?)`
    ).run(generateId('wt'), req.user.id, -plan.price_coins, receiptCode, `${plan.name} (30 kun)`);
  });

  runTx();

  const notif = createNotification(
    req.user.id,
    'membership',
    `${plan.name} faollashtirildi`,
    `Tabriklaymiz! Sizning a'zoligingiz ${expiresAt.toLocaleDateString('uz-UZ')} gacha amal qiladi.`,
    'vip'
  );
  sendToUser(req.user.id, 'notification:new', notif);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: mapUserRow(updated, req.user.id) });
});

// ============================================================================
// PK BATTLES (FRIENDLY, NO WAGERING)
// ============================================================================
app.get('/api/pk', (_req, res) => {
  // Auto-mark expired active PKs as finished
  db.prepare(`UPDATE pk_battles SET status = 'finished' WHERE status = 'active' AND ends_at <= datetime('now')`).run();

  const rows = db
    .prepare(
      `SELECT pk.*,
              ra.title as room_a_title, ra.cover_url as room_a_cover, ua.nickname as room_a_owner,
              rb.title as room_b_title, rb.cover_url as room_b_cover, ub.nickname as room_b_owner
       FROM pk_battles pk
       JOIN rooms ra ON ra.id = pk.room_a_id
       JOIN users ua ON ua.id = ra.owner_id
       JOIN rooms rb ON rb.id = pk.room_b_id
       JOIN users ub ON ub.id = rb.owner_id
       ORDER BY pk.status = 'active' DESC, pk.starts_at DESC`
    )
    .all()
    .map((r: any) => ({
      id: r.id,
      title: r.title,
      roomAId: r.room_a_id,
      roomBId: r.room_b_id,
      roomATitle: r.room_a_title,
      roomBTitle: r.room_b_title,
      roomAOwnerNickname: r.room_a_owner,
      roomBOwnerNickname: r.room_b_owner,
      roomACover: r.room_a_cover,
      roomBCover: r.room_b_cover,
      scoreA: r.score_a,
      scoreB: r.score_b,
      durationSeconds: r.duration_seconds,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      status: r.status,
      createdBy: r.created_by,
    }));

  res.json({ battles: rows });
});

app.post('/api/pk', authMiddleware, (req: AuthedRequest, res) => {
  if (!['founder', 'super_admin', 'admin', 'pk_admin'].includes(req.user.role)) {
    res.status(403).json({ error: 'PK musobaqa yaratish faqat PK Admin va Administratorlar uchun' });
    return;
  }
  const { title, roomAId, roomBId, durationMinutes } = req.body || {};
  if (!title || !roomAId || !roomBId || roomAId === roomBId) {
    res.status(400).json({ error: 'Ikki xil xona va musobaqa nomini kiriting' });
    return;
  }
  const durationSec = Math.max(180, Math.min(3600, (Number(durationMinutes) || 10) * 60));
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + durationSec * 1000);
  const id = generateId('pk');

  db.prepare(
    `INSERT INTO pk_battles (id, title, room_a_id, room_b_id, score_a, score_b, duration_seconds, starts_at, ends_at, status, created_by)
     VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, 'active', ?)`
  ).run(id, String(title).trim(), roomAId, roomBId, durationSec, startsAt.toISOString(), endsAt.toISOString(), req.user.id);

  logAdminAction(req.user.id, req.user.role, 'YARATISH_PK', 'pk_battle', id, `${title}`);
  broadcastAll('pk:created', { id });
  res.status(201).json({ id });
});

// ============================================================================
// AGENCIES
// ============================================================================
app.get('/api/agencies', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, u.nickname as head_nickname, u.avatar_url as head_avatar,
              (SELECT COUNT(*) FROM agency_members am WHERE am.agency_id = a.id) as member_count
       FROM agencies a
       JOIN users u ON u.id = a.head_user_id
       ORDER BY a.total_volume DESC`
    )
    .all()
    .map((a: any) => ({
      id: a.id,
      name: a.name,
      description: a.description,
      headUserId: a.head_user_id,
      headNickname: a.head_nickname,
      headAvatar: a.head_avatar,
      totalVolume: a.total_volume,
      memberCount: a.member_count,
      isVerified: Boolean(a.is_verified),
      createdAt: a.created_at,
    }));
  res.json({ agencies: rows });
});

app.get('/api/agencies/:id/members', authMiddleware, (req: AuthedRequest, res) => {
  const members = db
    .prepare(
      `SELECT am.*, u.nickname, u.public_id, u.avatar_url, u.online_status
       FROM agency_members am
       JOIN users u ON u.id = am.user_id
       WHERE am.agency_id = ?
       ORDER BY am.monthly_score DESC`
    )
    .all(req.params.id)
    .map((m: any) => ({
      agencyId: m.agency_id,
      userId: m.user_id,
      nickname: m.nickname,
      publicId: m.public_id,
      avatarUrl: m.avatar_url,
      memberRole: m.member_role,
      monthlyScore: m.monthly_score,
      onlineStatus: m.online_status,
      joinedAt: m.joined_at,
    }));
  res.json({ members });
});

app.post('/api/agencies', authMiddleware, (req: AuthedRequest, res) => {
  const { name, description } = req.body || {};
  if (!name || String(name).trim().length < 3) {
    res.status(400).json({ error: 'Agentlik nomi kamida 3 ta belgi bo‘lishi kerak' });
    return;
  }
  const existing = db.prepare('SELECT id FROM agencies WHERE lower(name) = lower(?)').get(String(name).trim());
  if (existing) {
    res.status(409).json({ error: 'Bu nomdagi agentlik allaqachon mavjud' });
    return;
  }
  const id = generateId('ag');
  db.prepare('INSERT INTO agencies (id, name, description, head_user_id, total_volume, is_verified) VALUES (?, ?, ?, ?, 0, 0)').run(
    id,
    String(name).trim(),
    String(description || '').trim(),
    req.user.id
  );
  db.prepare('INSERT INTO agency_members (agency_id, user_id, member_role, monthly_score) VALUES (?, ?, ?, 0)').run(
    id,
    req.user.id,
    'head'
  );
  if (req.user.role === 'user') {
    db.prepare("UPDATE users SET role = 'agency_head', agency_id = ? WHERE id = ?").run(id, req.user.id);
  } else {
    db.prepare('UPDATE users SET agency_id = ? WHERE id = ?').run(id, req.user.id);
  }
  res.status(201).json({ id });
});

app.post('/api/agencies/:id/members', authMiddleware, (req: AuthedRequest, res) => {
  const agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get(req.params.id) as any;
  if (!agency) {
    res.status(404).json({ error: 'Agentlik topilmadi' });
    return;
  }
  const isStaff = ['founder', 'super_admin', 'admin'].includes(req.user.role);
  if (agency.head_user_id !== req.user.id && !isStaff) {
    res.status(403).json({ error: 'Faqat agentlik rahbari a’zo qo‘sha oladi' });
    return;
  }
  const { publicId, memberRole } = req.body || {};
  const target = db
    .prepare('SELECT * FROM users WHERE upper(public_id) = upper(?) OR id = ?')
    .get(String(publicId || '').trim(), String(publicId || '').trim()) as any;
  if (!target) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi (TC-ID ni tekshiring)' });
    return;
  }
  db.prepare(
    'INSERT OR REPLACE INTO agency_members (agency_id, user_id, member_role, monthly_score) VALUES (?, ?, ?, 0)'
  ).run(agency.id, target.id, memberRole || 'agent');
  if (target.role === 'user') {
    db.prepare("UPDATE users SET role = 'agent', agency_id = ? WHERE id = ?").run(agency.id, target.id);
  } else {
    db.prepare('UPDATE users SET agency_id = ? WHERE id = ?').run(agency.id, target.id);
  }
  const notif = createNotification(
    target.id,
    'system',
    `${agency.name} agentligiga qo'shildingiz`,
    `${req.user.nickname} sizni agentlik jamoasiga qo'shdi.`,
    'agency'
  );
  sendToUser(target.id, 'notification:new', notif);
  res.json({ ok: true });
});

// ============================================================================
// NOTIFICATIONS & LEADERBOARDS
// ============================================================================
app.get('/api/notifications', authMiddleware, (req: AuthedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40')
    .all(req.user.id)
    .map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      notifType: n.notif_type,
      title: n.title,
      body: n.body,
      actionUrl: n.action_url,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at,
    }));
  res.json({ notifications: rows });
});

app.post('/api/notifications/read-all', authMiddleware, (req: AuthedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

app.get('/api/leaderboards', (req, res) => {
  const period = req.query.period === 'monthly' ? 'monthly' : 'weekly';
  const multiplier = period === 'monthly' ? 1 : 0.35;

  const popularUsers = db
    .prepare('SELECT * FROM users WHERE is_suspended = 0 ORDER BY total_received DESC LIMIT 10')
    .all()
    .map((u: any) => ({
      id: u.id,
      title: u.nickname,
      subtitle: `${u.public_id} · ${u.country}`,
      avatarUrl: u.avatar_url,
      score: Math.round(u.total_received * multiplier),
      vipLevel: u.vip_level,
      svipLevel: u.svip_level,
      frameStyle: u.frame_style,
    }));

  const giftSenders = db
    .prepare('SELECT * FROM users WHERE is_suspended = 0 ORDER BY total_gifted DESC LIMIT 10')
    .all()
    .map((u: any) => ({
      id: u.id,
      title: u.nickname,
      subtitle: `${u.public_id} · Saxovatpesha`,
      avatarUrl: u.avatar_url,
      score: Math.round(u.total_gifted * multiplier),
      vipLevel: u.vip_level,
      svipLevel: u.svip_level,
      frameStyle: u.frame_style,
    }));

  const popularRooms = db
    .prepare(
      `SELECT r.*, u.nickname as owner_name FROM rooms r
       JOIN users u ON u.id = r.owner_id
       WHERE r.is_active = 1
       ORDER BY r.viewer_count DESC LIMIT 10`
    )
    .all()
    .map((r: any) => ({
      id: r.id,
      title: r.title,
      subtitle: `${r.owner_name} · ${r.category}`,
      avatarUrl: r.cover_url,
      score: r.viewer_count,
    }));

  const topAgencies = db
    .prepare(
      `SELECT a.*, u.nickname as head_name, u.avatar_url as head_avatar
       FROM agencies a JOIN users u ON u.id = a.head_user_id
       ORDER BY a.total_volume DESC LIMIT 10`
    )
    .all()
    .map((a: any) => ({
      id: a.id,
      title: a.name,
      subtitle: `Rahbar: ${a.head_name}`,
      avatarUrl: a.head_avatar,
      score: Math.round(a.total_volume * multiplier),
    }));

  res.json({ period, popularUsers, giftSenders, popularRooms, topAgencies });
});

// ============================================================================
// REPORTS & ADMIN PANEL (STRICT 8-ROLE RBAC)
// ============================================================================
app.post('/api/reports', authMiddleware, (req: AuthedRequest, res) => {
  const { targetType, targetId, reason, details } = req.body || {};
  if (!targetType || !targetId || !reason) {
    res.status(400).json({ error: 'Shikoyat ma’lumotlari to‘liq emas' });
    return;
  }
  const id = generateId('rep');
  db.prepare(
    'INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, req.user.id, targetType, targetId, String(reason), String(details || ''), 'open');
  res.status(201).json({ id });
});

app.get('/api/admin/overview', authMiddleware, (req: AuthedRequest, res) => {
  if (!canAccessAdminPanel(req.user.role)) {
    res.status(403).json({ error: "Boshqaruv paneliga kirish huquqingiz yo'q" });
    return;
  }
  const users = db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT 100').all() as any[];
  const reports = db
    .prepare(
      `SELECT r.*, u.nickname as reporter_nickname, resu.nickname as resolver_nickname
       FROM reports r
       JOIN users u ON u.id = r.reporter_id
       LEFT JOIN users resu ON resu.id = r.resolved_by
       ORDER BY r.status = 'open' DESC, r.created_at DESC LIMIT 60`
    )
    .all()
    .map((r: any) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterNickname: r.reporter_nickname,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      resolvedBy: r.resolved_by,
      resolverNickname: r.resolver_nickname,
      resolutionNote: r.resolution_note,
      createdAt: r.created_at,
    }));

  const transactions = db
    .prepare(
      `SELECT wt.*, u.nickname, u.public_id FROM wallet_transactions wt
       JOIN users u ON u.id = wt.user_id
       ORDER BY wt.created_at DESC LIMIT 60`
    )
    .all();

  const auditLogs = db
    .prepare(
      `SELECT l.*, u.nickname as actor_nickname FROM admin_audit_logs l
       JOIN users u ON u.id = l.actor_id
       ORDER BY l.created_at DESC LIMIT 80`
    )
    .all()
    .map((l: any) => ({
      id: l.id,
      actorId: l.actor_id,
      actorNickname: l.actor_nickname,
      actorRole: l.actor_role,
      action: l.action,
      targetType: l.target_type,
      targetId: l.target_id,
      details: l.details,
      createdAt: l.created_at,
    }));

  res.json({
    users: users.map((u) => mapUserRow(u, req.user.id)),
    reports,
    transactions,
    auditLogs,
  });
});

app.post('/api/admin/users/:id/role', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  const targetId = req.params.id;
  const { role } = req.body as { role: AppRole };

  if (!['founder', 'super_admin', 'admin'].includes(actorRole)) {
    res.status(403).json({ error: 'Rol tayinlash huquqingiz yo‘q' });
    return;
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
  if (!target) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    return;
  }

  // ONLY Founder can assign or modify Super Admin / Founder access
  if ((role === 'founder' || role === 'super_admin' || target.role === 'founder' || target.role === 'super_admin') && actorRole !== 'founder') {
    res.status(403).json({
      error: 'Faqat Asoschi (Founder) Super Admin va yuqori darajali rollarni boshqara oladi',
    });
    return;
  }

  if (ROLE_RANK_MAP[role] >= ROLE_RANK_MAP[actorRole] && actorRole !== 'founder') {
    res.status(403).json({ error: "O'zingizdan yuqori yoki teng rol tayinlay olmaysiz" });
    return;
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, targetId);
  logAdminAction(req.user.id, actorRole, 'ROL_TAYINLASH', 'user', targetId, `${target.nickname}: ${target.role} → ${role}`);
  res.json({ ok: true });
});

app.post('/api/admin/users/:id/moderate', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!['founder', 'super_admin', 'admin', 'moderator'].includes(actorRole)) {
    res.status(403).json({ error: 'Moderatsiya huquqi yo‘q' });
    return;
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as any;
  if (!target) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    return;
  }
  if (ROLE_RANK_MAP[target.role as AppRole] >= ROLE_RANK_MAP[actorRole] && actorRole !== 'founder') {
    res.status(403).json({ error: "Yuqori lavozimli xodimga chora ko'rib bo'lmaydi" });
    return;
  }

  const { action, muteHours } = req.body as { action: 'mute' | 'unmute' | 'suspend' | 'restore'; muteHours?: number };
  if (action === 'mute') {
    const until = new Date(Date.now() + (Number(muteHours) || 24) * 3600 * 1000).toISOString();
    db.prepare('UPDATE users SET is_muted_until = ? WHERE id = ?').run(until, target.id);
    logAdminAction(req.user.id, actorRole, 'VAQTINCHA_OVOZ_OCHIRISH', 'user', target.id, `${muteHours || 24} soatga cheklandi`);
  } else if (action === 'unmute') {
    db.prepare('UPDATE users SET is_muted_until = NULL WHERE id = ?').run(target.id);
    logAdminAction(req.user.id, actorRole, 'CHEKLOV_OLISH', 'user', target.id, 'Yozish cheklovi olib tashlandi');
  } else if (action === 'suspend') {
    if (!['founder', 'super_admin', 'admin'].includes(actorRole)) {
      res.status(403).json({ error: "Hisobni to'xtatish uchun Admin yoki yuqori huquq kerak" });
      return;
    }
    db.prepare('UPDATE users SET is_suspended = 1 WHERE id = ?').run(target.id);
    logAdminAction(req.user.id, actorRole, 'HISOB_TOXTATISH', 'user', target.id, `${target.nickname} hisobi to'xtatildi`);
  } else if (action === 'restore') {
    if (!['founder', 'super_admin', 'admin'].includes(actorRole)) {
      res.status(403).json({ error: 'Hisobni tiklash uchun Admin yoki yuqori huquq kerak' });
      return;
    }
    db.prepare('UPDATE users SET is_suspended = 0 WHERE id = ?').run(target.id);
    logAdminAction(req.user.id, actorRole, 'HISOB_TIKLASH', 'user', target.id, `${target.nickname} hisobi tiklandi`);
  }
  res.json({ ok: true });
});

app.post('/api/admin/reports/:id/resolve', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!['founder', 'super_admin', 'admin', 'moderator'].includes(actorRole)) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }
  const { status, resolutionNote } = req.body || {};
  db.prepare('UPDATE reports SET status = ?, resolved_by = ?, resolution_note = ? WHERE id = ?').run(
    status || 'resolved',
    req.user.id,
    String(resolutionNote || "Ko'rib chiqildi"),
    req.params.id
  );
  logAdminAction(req.user.id, actorRole, 'SHIKOYAT_HAL_QILISH', 'report', req.params.id, `${status}: ${resolutionNote || ''}`);
  res.json({ ok: true });
});

function sanitizeGiftVideoUrl(raw: unknown): string {
  const val = String(raw || '').trim();
  if (!val) return '';
  if (
    val.startsWith('/uploads/') ||
    val.startsWith('/assets/') ||
    val.startsWith('https://') ||
    val.startsWith('http://')
  ) {
    return val;
  }
  return '';
}

app.post(
  '/api/admin/gifts/upload-video',
  authMiddleware,
  express.raw({
    type: ['video/mp4', 'video/webm', 'video/quicktime', 'video/*', 'application/octet-stream'],
    limit: '25mb',
  }),
  (req: AuthedRequest, res) => {
    const actorRole = req.user.role as AppRole;
    if (!['founder', 'super_admin', 'admin'].includes(actorRole)) {
      res.status(403).json({ error: "Video yuklash huquqi yo'q" });
      return;
    }
    const buf = req.body;
    if (!Buffer.isBuffer(buf) || buf.length === 0) {
      res.status(400).json({ error: 'Video fayl bo‘sh yoki noto‘g‘ri formatda' });
      return;
    }
    const rawName = decodeURIComponent(String(req.headers['x-file-name'] || 'gift.mp4'));
    const ctype = String(req.headers['content-type'] || '').toLowerCase();
    let ext = '.mp4';
    if (ctype.includes('webm') || rawName.toLowerCase().endsWith('.webm')) ext = '.webm';
    else if (ctype.includes('quicktime') || rawName.toLowerCase().endsWith('.mov')) ext = '.mov';

    const fileName = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const destPath = path.join(giftVideosUploadDir, fileName);
    fs.writeFileSync(destPath, buf);
    res.status(201).json({ videoUrl: `/uploads/gifts/${fileName}` });
  }
);

app.post('/api/admin/gifts', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!['founder', 'super_admin', 'admin'].includes(actorRole)) {
    res.status(403).json({ error: "Sovg'a qo'shish huquqi yo'q" });
    return;
  }
  const { name, categoryId, iconKey, priceCoins, tier, isAnimated, videoUrl } = req.body || {};
  if (!name || !categoryId || !priceCoins) {
    res.status(400).json({ error: 'Barcha maydonlarni to‘ldiring' });
    return;
  }
  const cleanVideoUrl = sanitizeGiftVideoUrl(videoUrl);
  if (String(videoUrl || '').trim() && !cleanVideoUrl) {
    res.status(400).json({ error: 'Video havolasi noto‘g‘ri formatda' });
    return;
  }
  const animatedFlag = cleanVideoUrl || isAnimated ? 1 : 0;
  const finalTier = cleanVideoUrl && (!tier || tier === 'standard') ? 'luxury' : (tier || 'standard');

  const id = generateId('g');
  db.prepare(
    'INSERT INTO gifts (id, category_id, name, icon_key, price_coins, is_animated, tier, is_active, video_url) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)'
  ).run(
    id,
    categoryId,
    String(name).trim(),
    iconKey || 'sparkles',
    Number(priceCoins),
    animatedFlag,
    finalTier,
    cleanVideoUrl
  );
  logAdminAction(
    req.user.id,
    actorRole,
    'SOVGA_QOSHISH',
    'gift',
    id,
    `${name} (${priceCoins} Tanga${cleanVideoUrl ? ' · Video' : ''})`
  );
  res.status(201).json({ id });
});

app.put('/api/admin/gifts/:id', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!['founder', 'super_admin', 'admin'].includes(actorRole)) {
    res.status(403).json({ error: "Sovg'ani tahrirlash huquqi yo'q" });
    return;
  }
  const existing = db.prepare('SELECT * FROM gifts WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "Sovg'a topilmadi" });
    return;
  }
  const { name, categoryId, iconKey, priceCoins, tier, isAnimated, videoUrl } = req.body || {};
  const cleanVideoUrl =
    videoUrl !== undefined ? sanitizeGiftVideoUrl(videoUrl) : (existing.video_url || '');
  if (videoUrl !== undefined && String(videoUrl || '').trim() && !cleanVideoUrl) {
    res.status(400).json({ error: 'Video havolasi noto‘g‘ri formatda' });
    return;
  }
  const nextTier = tier || existing.tier || 'standard';
  const animatedFlag = cleanVideoUrl || isAnimated ? 1 : 0;

  db.prepare(
    `UPDATE gifts
     SET name = ?, category_id = ?, icon_key = ?, price_coins = ?, tier = ?, is_animated = ?, video_url = ?
     WHERE id = ?`
  ).run(
    String(name || existing.name).trim(),
    categoryId || existing.category_id,
    iconKey || existing.icon_key,
    Number(priceCoins ?? existing.price_coins),
    cleanVideoUrl && nextTier === 'standard' ? 'luxury' : nextTier,
    animatedFlag,
    cleanVideoUrl,
    existing.id
  );
  logAdminAction(
    req.user.id,
    actorRole,
    'SOVGA_TAHRIRLASH',
    'gift',
    existing.id,
    `${name || existing.name}${cleanVideoUrl ? ' · Video' : ''}`
  );
  res.json({ ok: true });
});

app.delete('/api/admin/gifts/:id', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!['founder', 'super_admin', 'admin'].includes(actorRole)) {
    res.status(403).json({ error: "Sovg'ani o'chirish huquqi yo'q" });
    return;
  }
  const existing = db.prepare('SELECT id, name FROM gifts WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: "Sovg'a topilmadi" });
    return;
  }
  db.prepare('UPDATE gifts SET is_active = 0 WHERE id = ?').run(existing.id);
  logAdminAction(req.user.id, actorRole, 'SOVGA_OCHIRISH', 'gift', existing.id, existing.name);
  res.json({ ok: true });
});

app.post('/api/admin/rooms/:id/toggle', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!['founder', 'super_admin', 'admin', 'moderator'].includes(actorRole)) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
  if (!room) {
    res.status(404).json({ error: 'Xona topilmadi' });
    return;
  }
  const nextActive = room.is_active ? 0 : 1;
  db.prepare('UPDATE rooms SET is_active = ? WHERE id = ?').run(nextActive, room.id);
  logAdminAction(req.user.id, actorRole, nextActive ? 'XONA_YOQISH' : 'XONA_YOPISH', 'room', room.id, room.title);
  res.json({ ok: true, isActive: Boolean(nextActive) });
});

function mapRibbonLogoRow(r: any) {
  return {
    id: r.id,
    name: r.name,
    subtitle: r.subtitle || '',
    category: (['diler', 'admin', 'telegram'].includes(r.category) ? r.category : 'diler') as
      | 'diler'
      | 'admin'
      | 'telegram',
    imageUrl: r.image_url || '',
    targetUrl: r.target_url || '',
    sortOrder: Number(r.sort_order ?? 0),
    isActive: Boolean(r.is_active),
    createdAt: r.created_at,
  };
}

app.get('/api/ribbon-logos', optionalAuth, (req: AuthedRequest, res) => {
  const includeInactive = req.query.all === '1' && req.user && canAccessAdminPanel(req.user.role);
  const rows = includeInactive
    ? (db.prepare('SELECT * FROM ribbon_logos ORDER BY sort_order ASC, created_at DESC').all() as any[])
    : (db
        .prepare('SELECT * FROM ribbon_logos WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC')
        .all() as any[]);
  res.json({ logos: rows.map(mapRibbonLogoRow) });
});

app.post('/api/admin/ribbon-logos', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!canAccessAdminPanel(actorRole)) {
    res.status(403).json({ error: 'Logotip joylash uchun boshqaruv paneli huquqi kerak' });
    return;
  }
  const { name, subtitle, category, imageUrl, targetUrl, sortOrder, isActive } = req.body || {};
  if (!name || String(name).trim().length < 2) {
    res.status(400).json({ error: 'Logotip nomi kamida 2 ta belgi bo‘lishi kerak' });
    return;
  }
  const cat = ['diler', 'admin', 'telegram'].includes(category) ? category : 'diler';
  const id = generateId('logo');
  db.prepare(
    `INSERT INTO ribbon_logos (id, name, subtitle, category, image_url, target_url, sort_order, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    String(name).trim(),
    String(subtitle || '').trim(),
    cat,
    String(imageUrl || '').trim(),
    String(targetUrl || '').trim(),
    Number(sortOrder) || 0,
    isActive === false ? 0 : 1,
    req.user.id
  );
  const row = db.prepare('SELECT * FROM ribbon_logos WHERE id = ?').get(id);
  const logo = mapRibbonLogoRow(row);
  logAdminAction(req.user.id, actorRole, 'LOGOTIP_QOSHISH', 'ribbon_logo', id, `${logo.name} (${logo.category})`);
  const activeRows = db
    .prepare('SELECT * FROM ribbon_logos WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC')
    .all() as any[];
  broadcastAll('logos:updated', activeRows.map(mapRibbonLogoRow));
  res.status(201).json({ logo });
});

app.put('/api/admin/ribbon-logos/:id', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!canAccessAdminPanel(actorRole)) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }
  const existing = db.prepare('SELECT * FROM ribbon_logos WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Logotip topilmadi' });
    return;
  }
  const { name, subtitle, category, imageUrl, targetUrl, sortOrder, isActive } = req.body || {};
  const cat = category && ['diler', 'admin', 'telegram'].includes(category) ? category : existing.category;
  db.prepare(
    `UPDATE ribbon_logos SET
      name = COALESCE(?, name),
      subtitle = COALESCE(?, subtitle),
      category = ?,
      image_url = COALESCE(?, image_url),
      target_url = COALESCE(?, target_url),
      sort_order = COALESCE(?, sort_order),
      is_active = COALESCE(?, is_active)
     WHERE id = ?`
  ).run(
    name !== undefined && String(name).trim() ? String(name).trim() : null,
    subtitle !== undefined ? String(subtitle).trim() : null,
    cat,
    imageUrl !== undefined ? String(imageUrl).trim() : null,
    targetUrl !== undefined ? String(targetUrl).trim() : null,
    sortOrder !== undefined ? Number(sortOrder) : null,
    isActive !== undefined ? (isActive ? 1 : 0) : null,
    existing.id
  );
  const row = db.prepare('SELECT * FROM ribbon_logos WHERE id = ?').get(existing.id);
  const logo = mapRibbonLogoRow(row);
  logAdminAction(req.user.id, actorRole, 'LOGOTIP_TAHRIRLASH', 'ribbon_logo', logo.id, `${logo.name} (${logo.category})`);
  const activeRows = db
    .prepare('SELECT * FROM ribbon_logos WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC')
    .all() as any[];
  broadcastAll('logos:updated', activeRows.map(mapRibbonLogoRow));
  res.json({ logo });
});

app.delete('/api/admin/ribbon-logos/:id', authMiddleware, (req: AuthedRequest, res) => {
  const actorRole = req.user.role as AppRole;
  if (!canAccessAdminPanel(actorRole)) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }
  const existing = db.prepare('SELECT * FROM ribbon_logos WHERE id = ?').get(req.params.id) as any;
  if (!existing) {
    res.status(404).json({ error: 'Logotip topilmadi' });
    return;
  }
  db.prepare('DELETE FROM ribbon_logos WHERE id = ?').run(existing.id);
  logAdminAction(req.user.id, actorRole, 'LOGOTIP_OCHIRISH', 'ribbon_logo', existing.id, existing.name);
  const activeRows = db
    .prepare('SELECT * FROM ribbon_logos WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC')
    .all() as any[];
  broadcastAll('logos:updated', activeRows.map(mapRibbonLogoRow));
  res.json({ ok: true });
});

// ============================================================================
// FREE-PLAY ENTERTAINMENT GAMES (NO REAL-MONEY GAMBLING / NO COIN WAGERING)
// ============================================================================
app.get('/api/games/stats', authMiddleware, (req: AuthedRequest, res) => {
  const history = db
    .prepare('SELECT * FROM game_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(req.user.id);
  const leaders = db
    .prepare(
      'SELECT id, nickname, public_id, avatar_url, game_points FROM users WHERE is_suspended = 0 ORDER BY game_points DESC LIMIT 10'
    )
    .all();
  res.json({
    gamePoints: req.user.game_points ?? 2000,
    history,
    leaders,
  });
});

app.post('/api/games/play', authMiddleware, (req: AuthedRequest, res) => {
  const { gameId, gameTitle, category, deltaPoints, outcome, isWin } = req.body || {};
  if (!gameId || !gameTitle) {
    res.status(400).json({ error: "O'yin ma'lumotlari to'liq emas" });
    return;
  }
  const delta = Math.max(-500, Math.min(2500, Math.round(Number(deltaPoints) || 0)));
  const currentPts = Number(req.user.game_points ?? 2000);
  const nextPts = Math.max(0, currentPts + delta);
  const outcomeId = generateId('gm');
  const won = typeof isWin === 'boolean' ? isWin : delta > 0;

  db.prepare('UPDATE users SET game_points = ? WHERE id = ?').run(nextPts, req.user.id);
  db.prepare(
    'INSERT INTO game_history (id, user_id, game_id, game_title, category, delta_points, outcome) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(
    outcomeId,
    req.user.id,
    String(gameId),
    String(gameTitle),
    category === 'omadli' ? 'omadli' : 'oddiy',
    delta,
    String(outcome || (won ? 'G‘alaba' : 'Yutqazish'))
  );

  const toastPayload = {
    id: outcomeId,
    gameId: String(gameId),
    gameTitle: String(gameTitle),
    outcome: String(outcome || (won ? 'G‘alaba' : 'Yutqazish')),
    deltaPoints: delta,
    isWin: won,
    gamePoints: nextPts,
  };
  sendToUser(req.user.id, 'game:outcome', toastPayload);

  const override = greedyPro.getWinnerOverride();
  if (override && override.userId === req.user.id && override.mode === 'once' && won) {
    greedyPro.setWinnerOverride(null);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: mapUserRow(updated, req.user.id), gamePoints: nextPts, outcomeEvent: toastPayload });
});

app.post('/api/games/refill', authMiddleware, (req: AuthedRequest, res) => {
  const currentPts = Number(req.user.game_points ?? 0);
  if (currentPts >= 1000) {
    res.status(400).json({ error: "Sizda o'yin ballari yetarli (1,000 dan kam bo'lganda to'ldiriladi)" });
    return;
  }
  const nextPts = currentPts + 1500;
  db.prepare('UPDATE users SET game_points = ? WHERE id = ?').run(nextPts, req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: mapUserRow(updated, req.user.id), gamePoints: nextPts });
});

// Greedy Pro real-time server-authoritative endpoints
app.get('/api/games/greedy-pro/state', authMiddleware, (req: AuthedRequest, res) => {
  try {
    res.json(greedyPro.getUserState(req.user.id));
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Greedy Pro holatini yuklashda xatolik' });
  }
});

app.post('/api/games/greedy-pro/bet', authMiddleware, (req: AuthedRequest, res) => {
  try {
    const state = greedyPro.placeBet(req.user.id, req.body || {});
    res.json(state);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Tikishni amalga oshirib bo‘lmadi' });
  }
});

app.post('/api/games/greedy-pro/bonus', authMiddleware, (req: AuthedRequest, res) => {
  try {
    const state = greedyPro.claimDailyBonus(req.user.id);
    res.json(state);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Kunlik bonusni olib bo‘lmadi' });
  }
});

app.get('/api/games/luck-target', authMiddleware, (req: AuthedRequest, res) => {
  const override = greedyPro.getWinnerOverride();
  res.json({
    favored: Boolean(override && override.userId === req.user.id),
  });
});

app.get('/api/admin/game-winner', authMiddleware, (req: AuthedRequest, res) => {
  if (!canAccessAdminPanel(req.user.role)) {
    res.status(403).json({ error: "Boshqaruv paneliga kirish huquqingiz yo'q" });
    return;
  }
  res.json({ override: greedyPro.getWinnerOverride() });
});

app.post('/api/admin/game-winner', authMiddleware, (req: AuthedRequest, res) => {
  if (!canAccessAdminPanel(req.user.role)) {
    res.status(403).json({ error: "Boshqaruv paneliga kirish huquqingiz yo'q" });
    return;
  }
  const { query, mode, slotId, grantNow, grantCoins, grantGamePoints, gameTitle } = req.body || {};
  const q = String(query || '').trim();
  if (!q) {
    res.status(400).json({ error: 'Foydalanuvchi ismi, ID yoki emailini yozing' });
    return;
  }

  let target = db
    .prepare(
      `SELECT * FROM users
       WHERE id = ? OR LOWER(public_id) = LOWER(?) OR LOWER(nickname) = LOWER(?) OR LOWER(email) = LOWER(?)
       LIMIT 1`
    )
    .get(q, q, q, q) as any;

  if (!target) {
    const likeQ = `%${q}%`;
    target = db
      .prepare(
        `SELECT * FROM users
         WHERE LOWER(nickname) LIKE LOWER(?) OR LOWER(public_id) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?)
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(likeQ, likeQ, likeQ) as any;
  }

  if (!target) {
    res.status(404).json({ error: `"${q}" bo‘yicha foydalanuvchi topilmadi` });
    return;
  }

  const coinsDelta = Math.max(0, Math.min(500_000_000, Math.round(Number(grantCoins) || 0)));
  const pointsDelta = Math.max(0, Math.min(100_000, Math.round(Number(grantGamePoints) || 0)));

  if (grantNow && (coinsDelta > 0 || pointsDelta > 0)) {
    db.transaction(() => {
      if (coinsDelta > 0) {
        db.prepare('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?').run(
          coinsDelta,
          target.id
        );
      }
      if (pointsDelta > 0) {
        db.prepare('UPDATE users SET game_points = game_points + ? WHERE id = ?').run(
          pointsDelta,
          target.id
        );
      }
      db.prepare(
        `INSERT INTO game_history (id, user_id, game_id, game_title, category, delta_points, outcome)
         VALUES (?, ?, 'admin-award', ?, 'omadli', ?, ?)`
      ).run(
        generateId('gm'),
        target.id,
        String(gameTitle || "O'yin yutug'i"),
        pointsDelta || coinsDelta,
        `Maxsus o‘yin yutug‘i: ${
          coinsDelta > 0 ? `+${coinsDelta.toLocaleString()} tanga` : ''
        }${coinsDelta > 0 && pointsDelta > 0 ? ' · ' : ''}${
          pointsDelta > 0 ? `+${pointsDelta.toLocaleString()} ball` : ''
        }`
      );
    })();

    const updatedTarget = db.prepare('SELECT * FROM users WHERE id = ?').get(target.id);
    if (updatedTarget) {
      sendToUser(target.id, 'greedy:user_balance', {
        user: mapUserRow(updatedTarget, target.id),
      });
    }
    const notif = createNotification(
      target.id,
      'system',
      "O'yin yutug'i berildi!",
      `${String(gameTitle || "O'yin")} bo‘yicha maxsus yutuq hisobingizga qo‘shildi.`,
      'games'
    );
    sendToUser(target.id, 'notification:new', notif);

    logAdminAction(
      req.user.id,
      req.user.role,
      'OYIN_YUTUGI_BERISH',
      'user',
      target.id,
      `${target.nickname} (${target.public_id}): +${coinsDelta} tanga, +${pointsDelta} ball`
    );

    res.json({
      override: greedyPro.getWinnerOverride(),
      awardedUser: mapUserRow(updatedTarget || target, req.user.id),
      message: `${target.nickname} hisobiga yutuq muvaffaqiyatli berildi!`,
    });
    return;
  }

  const parsedSlot =
    slotId === null || slotId === undefined || slotId === '' || slotId === 'auto'
      ? null
      : Number(slotId);
  const nextOverride = {
    userId: String(target.id),
    nickname: String(target.nickname),
    publicId: String(target.public_id),
    mode: (mode === 'always' ? 'always' : 'once') as 'once' | 'always',
    slotId:
      parsedSlot !== null && Number.isInteger(parsedSlot) && parsedSlot >= 0 && parsedSlot <= 7
        ? parsedSlot
        : null,
    updatedBy: req.user.id,
    updatedAt: Date.now(),
  };

  greedyPro.setWinnerOverride(nextOverride);
  logAdminAction(
    req.user.id,
    req.user.role,
    'OYIN_GOLIBI_BELGILASH',
    'user',
    target.id,
    `${target.nickname} (${target.public_id}) · rejim: ${nextOverride.mode}`
  );

  res.json({
    override: nextOverride,
    message: `O‘yin yutug‘i "${target.nickname}" ga biriktirildi!`,
  });
});

app.delete('/api/admin/game-winner', authMiddleware, (req: AuthedRequest, res) => {
  if (!canAccessAdminPanel(req.user.role)) {
    res.status(403).json({ error: "Boshqaruv paneliga kirish huquqingiz yo'q" });
    return;
  }
  greedyPro.setWinnerOverride(null);
  logAdminAction(req.user.id, req.user.role, 'OYIN_GOLIBI_BEKOR', 'system', 'greedy-pro', 'Bekor qilindi');
  res.json({ override: null });
});

// ============================================================================
// CP (COUPLE PARTNER), NIKOH (MARRIAGE), LOVE STORE & TO'Y XONASI
// ============================================================================
function mapCpRow(row: any, viewerId: string) {
  if (!row) return null;
  const today = new Date().toISOString().slice(0, 10);
  const dailyIntimacyUsed = row.daily_date === today ? Number(row.daily_intimacy_used || 0) : 0;
  const dailyMicMinutes = row.daily_date === today ? Number(row.daily_mic_minutes || 0) : 0;
  const isRequester = row.user_a_id === viewerId;
  const partnerId = isRequester ? row.user_b_id : row.user_a_id;
  const partnerRow = db.prepare('SELECT * FROM users WHERE id = ?').get(partnerId) as any;
  if (!partnerRow) return null;

  const lvl = computeCpLevel(Number(row.intimacy || 0));
  const isMarried = row.marriage_status === 'married' || row.status === 'married';
  const collections = db
    .prepare(
      `SELECT cc.*, lsi.name as item_name, lsi.category, lsi.theme_key, u.nickname as sender_nickname
       FROM cp_collections cc
       JOIN love_store_items lsi ON lsi.id = cc.item_id
       JOIN users u ON u.id = cc.sender_id
       WHERE cc.cp_id = ?
       ORDER BY cc.created_at DESC`
    )
    .all(row.id)
    .map((c: any) => ({
      id: c.id,
      cpId: c.cp_id,
      itemId: c.item_id,
      itemName: c.item_name,
      category: c.category,
      themeKey: c.theme_key || null,
      senderId: c.sender_id,
      senderNickname: c.sender_nickname,
      createdAt: c.created_at,
    }));

  return {
    id: row.id,
    userAId: row.user_a_id,
    userBId: row.user_b_id,
    partner: mapUserRow(partnerRow, viewerId),
    status: row.status,
    isRequester,
    intimacy: Number(row.intimacy || 0),
    blessing: Number(row.blessing || 0),
    level: lvl.level,
    dailyLimit: lvl.dailyLimit,
    dailyIntimacyUsed,
    dailyMicMinutes,
    marriageStatus: row.marriage_status || 'none',
    proposalRingId: row.proposal_ring_id || null,
    proposedBy: row.proposed_by || null,
    marriedAt: row.married_at || null,
    weddingRoomId: row.wedding_room_id || null,
    activeTheme: row.active_theme || 'starlight-1',
    perks: {
      onlineReminder: lvl.level >= 1 || isMarried,
      micEffect: lvl.level >= 2 || isMarried,
      marryCover: isMarried,
      weddingGiftBonus: isMarried ? 1.1 : 1.0,
    },
    collections,
    createdAt: row.created_at,
  };
}

app.get('/api/cp', authMiddleware, (req: AuthedRequest, res) => {
  const activeRow = db
    .prepare(
      `SELECT * FROM cp_relationships
       WHERE (user_a_id = ? OR user_b_id = ?) AND status IN ('active', 'married')
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(req.user.id, req.user.id) as any;

  const pendingRows = db
    .prepare(
      `SELECT * FROM cp_relationships
       WHERE (user_a_id = ? OR user_b_id = ?) AND status = 'pending'
       ORDER BY created_at DESC`
    )
    .all(req.user.id, req.user.id) as any[];

  const loveStoreItems = db
    .prepare('SELECT * FROM love_store_items ORDER BY price_coins ASC')
    .all()
    .map((i: any) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      priceCoins: i.price_coins,
      intimacyGain: i.intimacy_gain,
      blessingGain: i.blessing_gain,
      guardGain: i.guard_gain,
      themeKey: i.theme_key || null,
      imageUrl: i.image_url || null,
      description: i.description || '',
    }));

  res.json({
    activeCp: activeRow ? mapCpRow(activeRow, req.user.id) : null,
    pendingRequests: pendingRows.map((r) => mapCpRow(r, req.user.id)).filter(Boolean),
    loveStoreItems,
    levelRules: CP_LEVEL_RULES.map((r) => ({
      level: r.level,
      minIntimacy: r.minIntimacy,
      dailyLimit: r.dailyLimit,
      coverName: r.coverName,
      perks: [
        r.coverName,
        ...(r.level >= 1 ? ['Onlayn eslatma'] : []),
        ...(r.level >= 2 ? ['Mikrofon harakati effekti'] : []),
      ],
    })),
  });
});

app.post('/api/cp/request', authMiddleware, (req: AuthedRequest, res) => {
  const { partnerId } = req.body || {};
  if (!partnerId || partnerId === req.user.id) {
    res.status(400).json({ error: "To'g'ri hamkor foydalanuvchini tanlang" });
    return;
  }
  const partner = db.prepare('SELECT * FROM users WHERE id = ?').get(partnerId) as any;
  if (!partner) {
    res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    return;
  }
  const busy = db
    .prepare(
      `SELECT 1 FROM cp_relationships
       WHERE status IN ('active', 'married', 'pending')
         AND (user_a_id IN (?, ?) OR user_b_id IN (?, ?))`
    )
    .get(req.user.id, partnerId, req.user.id, partnerId);
  if (busy) {
    res.status(400).json({ error: 'Sizda yoki tanlangan foydalanuvchida faol CP yoki kutilayotgan para so‘rovi mavjud' });
    return;
  }

  const cpId = generateId('cp');
  db.prepare(
    `INSERT INTO cp_relationships (id, user_a_id, user_b_id, status) VALUES (?, ?, ?, 'pending')`
  ).run(cpId, req.user.id, partnerId);

  const notif = createNotification(
    partnerId,
    'friend_request',
    'Yangi Para (CP) so‘rovi!',
    `${req.user.nickname} sizga Sevgi uyi (Para) taklifini yubordi.`,
    'cp'
  );
  sendToUser(partnerId, 'notification:new', notif);
  sendToUser(partnerId, 'cp:updated', { cpId });
  sendToUser(req.user.id, 'cp:updated', { cpId });

  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(cpId);
  res.status(201).json({ cp: mapCpRow(row, req.user.id) });
});

app.post('/api/cp/:id/cancel', authMiddleware, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || row.user_a_id !== req.user.id || row.status !== 'pending') {
    res.status(404).json({ error: 'Bekor qilinadigan kutilayotgan para so‘rovi topilmadi' });
    return;
  }
  db.prepare("UPDATE cp_relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?").run(
    row.id
  );
  sendToUser(row.user_a_id, 'cp:updated', { cpId: row.id });
  sendToUser(row.user_b_id, 'cp:updated', { cpId: row.id });
  res.json({ ok: true });
});

app.post('/api/cp/:id/respond', authMiddleware, (req: AuthedRequest, res) => {
  const { accept } = req.body || {};
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || row.user_b_id !== req.user.id || row.status !== 'pending') {
    res.status(404).json({ error: 'Kutilayotgan CP so‘rovi topilmadi' });
    return;
  }
  if (accept) {
    db.prepare("UPDATE cp_relationships SET status = 'active' WHERE id = ?").run(row.id);
    const notif = createNotification(
      row.user_a_id,
      'membership',
      'Para (CP) so‘rovi qabul qilindi!',
      `${req.user.nickname} bilan Sevgi uyi juftligingiz boshlandi.`,
      'cp'
    );
    sendToUser(row.user_a_id, 'notification:new', notif);
  } else {
    db.prepare("UPDATE cp_relationships SET status = 'ended', ended_at = datetime('now') WHERE id = ?").run(row.id);
  }
  sendToUser(row.user_a_id, 'cp:updated', { cpId: row.id });
  sendToUser(row.user_b_id, 'cp:updated', { cpId: row.id });
  const updated = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(row.id);
  res.json({ cp: mapCpRow(updated, req.user.id) });
});

app.post('/api/cp/:id/propose-marriage', authMiddleware, (req: AuthedRequest, res) => {
  const { ringItemId } = req.body || {};
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || (row.user_a_id !== req.user.id && row.user_b_id !== req.user.id)) {
    res.status(404).json({ error: 'CP munosabati topilmadi' });
    return;
  }
  if (row.status !== 'active' || row.marriage_status === 'married') {
    res.status(400).json({ error: 'Nikoh taklifi faqat faol CP juftliklar uchun' });
    return;
  }
  const lvl = computeCpLevel(Number(row.intimacy || 0));
  if (lvl.level < 1) {
    res.status(400).json({ error: 'Nikoh taklifi uchun avval CP LV1 (777 yaqinlik) darajasiga yeting' });
    return;
  }
  const ring = db
    .prepare("SELECT * FROM love_store_items WHERE id = ? AND category = 'ring'")
    .get(ringItemId) as any;
  if (!ring) {
    res.status(404).json({ error: 'Nikoh uzugi topilmadi' });
    return;
  }
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (freshUser.coin_balance < ring.price_coins) {
    res.status(400).json({ error: 'Uzuk sotib olish uchun Tanga yetarli emas' });
    return;
  }

  const receipt = `RNG-${Date.now().toString().slice(-6)}`;
  const today = new Date().toISOString().slice(0, 10);
  const dailyUsed = row.daily_date === today ? Number(row.daily_intimacy_used || 0) : 0;

  db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ?, guard_value = guard_value + ? WHERE id = ?').run(
      ring.price_coins,
      ring.guard_gain,
      req.user.id
    );
    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'gift_sent', ?, 0, 'internal', 'confirmed', ?, ?)`
    ).run(generateId('wt'), req.user.id, -ring.price_coins, receipt, `Nikoh uzugi: ${ring.name}`);

    db.prepare('INSERT INTO cp_collections (id, cp_id, item_id, sender_id) VALUES (?, ?, ?, ?)').run(
      generateId('col'),
      row.id,
      ring.id,
      req.user.id
    );
    db.prepare(
      `UPDATE cp_relationships
       SET marriage_status = 'proposed',
           proposal_ring_id = ?,
           proposed_by = ?,
           intimacy = intimacy + ?,
           blessing = blessing + ?,
           daily_intimacy_used = ?,
           daily_date = ?
       WHERE id = ?`
    ).run(
      ring.id,
      req.user.id,
      ring.intimacy_gain,
      ring.blessing_gain,
      dailyUsed + ring.intimacy_gain,
      today,
      row.id
    );
  })();

  const partnerId = row.user_a_id === req.user.id ? row.user_b_id : row.user_a_id;
  const notif = createNotification(
    partnerId,
    'membership',
    'Turmush qurish taklifi!',
    `${req.user.nickname} sizga "${ring.name}" bilan turmush qurish taklifini yubordi.`,
    'cp'
  );
  sendToUser(partnerId, 'notification:new', notif);
  sendToUser(row.user_a_id, 'cp:updated', { cpId: row.id });
  sendToUser(row.user_b_id, 'cp:updated', { cpId: row.id });

  const updated = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(row.id);
  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ cp: mapCpRow(updated, req.user.id), user: mapUserRow(updatedUser, req.user.id) });
});

app.post('/api/cp/:id/respond-marriage', authMiddleware, (req: AuthedRequest, res) => {
  const { accept } = req.body || {};
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || row.marriage_status !== 'proposed' || row.proposed_by === req.user.id) {
    res.status(400).json({ error: 'Kutilayotgan nikoh taklifi topilmadi' });
    return;
  }
  if (row.user_a_id !== req.user.id && row.user_b_id !== req.user.id) {
    res.status(403).json({ error: 'Ruxsat yo‘q' });
    return;
  }

  const partnerId = row.user_a_id === req.user.id ? row.user_b_id : row.user_a_id;
  const partnerRow = db.prepare('SELECT * FROM users WHERE id = ?').get(partnerId) as any;

  if (accept) {
    const weddingRoomId = generateId('room');
    const weddingTitle = `To‘y Xonasi · ${req.user.nickname} & ${partnerRow?.nickname || 'Juftlik'}`;

    db.transaction(() => {
      db.prepare(
        `INSERT INTO rooms (
          id, title, description, cover_url, category, owner_id, max_seats,
          is_private, password_hash, background_theme, visual_effect, is_featured, is_active, viewer_count, is_wedding_room, wedding_cp_id
        ) VALUES (?, ?, ?, ?, 'Suhbat', ?, 12, 0, NULL, 'gold', 'aurora', 1, 1, 2, 1, ?)`
      ).run(
        weddingRoomId,
        weddingTitle,
        "Nikoh marosimi va do‘stlar davrasi! Ushbu to‘y xonasida sovg‘alar 1.1× bonus beradi.",
        '/src/assets/images/turon_hero_banner_1794822313365.jpg',
        req.user.id,
        row.id
      );

      const insertSeat = db.prepare(
        'INSERT INTO room_seats (room_id, seat_number, user_id, is_muted, is_locked) VALUES (?, ?, ?, 0, 0)'
      );
      for (let s = 1; s <= 20; s++) {
        const occ = s === 1 ? row.user_a_id : s === 2 ? row.user_b_id : null;
        insertSeat.run(weddingRoomId, s, occ);
      }

      db.prepare(
        `UPDATE cp_relationships
         SET status = 'married',
             marriage_status = 'married',
             married_at = datetime('now'),
             wedding_room_id = ?,
             active_theme = 'marry-cover'
         WHERE id = ?`
      ).run(weddingRoomId, row.id);
    })();

    const roomFull = getRoomFull(weddingRoomId);
    if (roomFull) broadcastAll('rooms:created', roomFull);

    const notif = createNotification(
      partnerId,
      'membership',
      'Nikoh muborak bo‘lsin!',
      `${req.user.nickname} turmush qurish taklifingizni qabul qildi! To‘y xonangiz ochildi.`,
      `room:${weddingRoomId}`
    );
    sendToUser(partnerId, 'notification:new', notif);
  } else {
    db.prepare(
      `UPDATE cp_relationships SET marriage_status = 'none', proposed_by = NULL, proposal_ring_id = NULL WHERE id = ?`
    ).run(row.id);
  }

  sendToUser(row.user_a_id, 'cp:updated', { cpId: row.id });
  sendToUser(row.user_b_id, 'cp:updated', { cpId: row.id });
  const updated = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(row.id);
  res.json({ cp: mapCpRow(updated, req.user.id) });
});

app.post('/api/cp/:id/invite-wedding', authMiddleware, (req: AuthedRequest, res) => {
  const { friendIds } = req.body || {};
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || !row.wedding_room_id || (row.user_a_id !== req.user.id && row.user_b_id !== req.user.id)) {
    res.status(404).json({ error: 'Faol to‘y xonasi topilmadi' });
    return;
  }
  const list: string[] = Array.isArray(friendIds) ? friendIds : [];
  for (const uid of list.slice(0, 30)) {
    const notif = createNotification(
      uid,
      'room_invite',
      'To‘y marosimiga taklifnoma!',
      `${req.user.nickname} sizni To‘y xonasiga taklif qildi (Sovg‘alarga 1.1× bonus)!`,
      `room:${row.wedding_room_id}`
    );
    sendToUser(uid, 'notification:new', notif);
  }
  res.json({ invitedCount: list.length });
});

app.post('/api/cp/:id/divorce', authMiddleware, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || (row.user_a_id !== req.user.id && row.user_b_id !== req.user.id)) {
    res.status(404).json({ error: 'CP munosabati topilmadi' });
    return;
  }
  db.transaction(() => {
    db.prepare(
      `UPDATE cp_relationships
       SET status = 'ended',
           marriage_status = 'none',
           ended_at = datetime('now')
       WHERE id = ?`
    ).run(row.id);
    if (row.wedding_room_id) {
      db.prepare('UPDATE rooms SET is_active = 0 WHERE id = ?').run(row.wedding_room_id);
    }
  })();

  const partnerId = row.user_a_id === req.user.id ? row.user_b_id : row.user_a_id;
  const notif = createNotification(
    partnerId,
    'system',
    'CP va Nikoh tugatildi',
    `${req.user.nickname} CP va nikoh munosabatini yakunladi.`,
    'cp'
  );
  sendToUser(partnerId, 'notification:new', notif);
  sendToUser(row.user_a_id, 'cp:updated', { cpId: row.id });
  sendToUser(row.user_b_id, 'cp:updated', { cpId: row.id });
  res.json({ ok: true });
});

app.post('/api/cp/:id/mic-tick', authMiddleware, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || (row.user_a_id !== req.user.id && row.user_b_id !== req.user.id) || !['active', 'married'].includes(row.status)) {
    res.status(404).json({ error: 'Faol CP topilmadi' });
    return;
  }
  const now = Date.now();
  if (row.last_mic_tick_at && now - new Date(row.last_mic_tick_at).getTime() < 50000) {
    res.json({ cp: mapCpRow(row, req.user.id), added: 0 });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const dailyMic = row.daily_date === today ? Number(row.daily_mic_minutes || 0) : 0;
  const dailyIntimacy = row.daily_date === today ? Number(row.daily_intimacy_used || 0) : 0;
  const lvl = computeCpLevel(Number(row.intimacy || 0));

  if (dailyMic >= 180 || (lvl.dailyLimit !== null && dailyIntimacy >= lvl.dailyLimit)) {
    res.json({ cp: mapCpRow(row, req.user.id), added: 0, limitReached: true });
    return;
  }

  db.prepare(
    `UPDATE cp_relationships
     SET intimacy = intimacy + 1,
         daily_intimacy_used = ?,
         daily_mic_minutes = ?,
         daily_date = ?,
         last_mic_tick_at = ?
     WHERE id = ?`
  ).run(dailyIntimacy + 1, dailyMic + 1, today, new Date(now).toISOString(), row.id);

  sendToUser(row.user_a_id, 'cp:updated', { cpId: row.id });
  sendToUser(row.user_b_id, 'cp:updated', { cpId: row.id });
  const updated = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(row.id);
  res.json({ cp: mapCpRow(updated, req.user.id), added: 1 });
});

app.post('/api/cp/store/buy', authMiddleware, (req: AuthedRequest, res) => {
  const { itemId, cpId } = req.body || {};
  const item = db.prepare('SELECT * FROM love_store_items WHERE id = ?').get(itemId) as any;
  if (!item) {
    res.status(404).json({ error: 'Love Store mahsuloti topilmadi' });
    return;
  }

  let cpRow: any = null;
  if (cpId) {
    cpRow = db
      .prepare(
        `SELECT * FROM cp_relationships WHERE id = ? AND (user_a_id = ? OR user_b_id = ?) AND status IN ('active', 'married')`
      )
      .get(cpId, req.user.id, req.user.id);
  }
  if (!cpRow) {
    cpRow = db
      .prepare(
        `SELECT * FROM cp_relationships WHERE (user_a_id = ? OR user_b_id = ?) AND status IN ('active', 'married') ORDER BY created_at DESC LIMIT 1`
      )
      .get(req.user.id, req.user.id);
  }

  if (item.category === 'ring' && !cpRow) {
    res.status(403).json({
      error: 'Faqat CP: Sevgi uyi uzuklarini faqat faol CP parangiz uchun sotib olishingiz mumkin',
    });
    return;
  }

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (freshUser.coin_balance < item.price_coins) {
    res.status(400).json({ error: 'Hamyoningizda Tanga yetarli emas' });
    return;
  }

  const receipt = `LOV-${Date.now().toString().slice(-6)}`;
  const today = new Date().toISOString().slice(0, 10);

  db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ?, guard_value = guard_value + ? WHERE id = ?').run(
      item.price_coins,
      item.guard_gain,
      req.user.id
    );
    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'gift_sent', ?, 0, 'internal', 'confirmed', ?, ?)`
    ).run(generateId('wt'), req.user.id, -item.price_coins, receipt, `Love Store: ${item.name}`);

    if (cpRow) {
      const dailyUsed = cpRow.daily_date === today ? Number(cpRow.daily_intimacy_used || 0) : 0;
      const lvl = computeCpLevel(Number(cpRow.intimacy || 0));
      let intGain = Number(item.intimacy_gain || 0);
      if (lvl.dailyLimit !== null) {
        intGain = Math.min(intGain, Math.max(0, lvl.dailyLimit - dailyUsed));
      }

      db.prepare('INSERT INTO cp_collections (id, cp_id, item_id, sender_id) VALUES (?, ?, ?, ?)').run(
        generateId('col'),
        cpRow.id,
        item.id,
        req.user.id
      );

      db.prepare(
        `UPDATE cp_relationships
         SET intimacy = intimacy + ?,
             blessing = blessing + ?,
             daily_intimacy_used = ?,
             daily_date = ?,
             active_theme = COALESCE(?, active_theme)
         WHERE id = ?`
      ).run(
        intGain,
        Number(item.blessing_gain || 0),
        dailyUsed + intGain,
        today,
        item.theme_key || null,
        cpRow.id
      );
    }
  })();

  if (cpRow) {
    sendToUser(cpRow.user_a_id, 'cp:updated', { cpId: cpRow.id });
    sendToUser(cpRow.user_b_id, 'cp:updated', { cpId: cpRow.id });
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const updatedCp = cpRow ? db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(cpRow.id) : null;
  res.json({
    user: mapUserRow(updatedUser, req.user.id),
    cp: updatedCp ? mapCpRow(updatedCp, req.user.id) : null,
  });
});

app.post('/api/cp/:id/theme', authMiddleware, (req: AuthedRequest, res) => {
  const { themeKey } = req.body || {};
  const row = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(req.params.id) as any;
  if (!row || (row.user_a_id !== req.user.id && row.user_b_id !== req.user.id)) {
    res.status(404).json({ error: 'CP topilmadi' });
    return;
  }
  db.prepare('UPDATE cp_relationships SET active_theme = ? WHERE id = ?').run(String(themeKey || 'starlight-1'), row.id);
  sendToUser(row.user_a_id, 'cp:updated', { cpId: row.id });
  sendToUser(row.user_b_id, 'cp:updated', { cpId: row.id });
  const updated = db.prepare('SELECT * FROM cp_relationships WHERE id = ?').get(row.id);
  res.json({ cp: mapCpRow(updated, req.user.id) });
});

// ============================================================================
// DO'KON (PROFIL ROMKALARI VA REKVIZITLAR)
// ============================================================================
const STORE_FRAME_CATALOG = [
  ...PROFILE_FRAMES_CATALOG.map(({ visual: _visual, ...rest }) => rest),
  {
    id: 'entry-dragon',
    name: 'Oltin Ajdar Kirishi',
    tier: 'S' as const,
    category: 'entry' as const,
    priceCoins: 4500000,
    durationDays: 7,
    description: 'Xonaga kirganda oltin nur va qanotli e’lon effekti',
  },
  {
    id: 'entry-car',
    name: 'Superkar Kirishi',
    tier: 'A' as const,
    category: 'entry' as const,
    priceCoins: 1500000,
    durationDays: 7,
    description: 'Ovozli xonaga poyga bolidi bilan kirish animatsiyasi',
  },
  {
    id: 'link-royal',
    name: 'Qirollik Havolasi',
    tier: 'S' as const,
    category: 'chat_link' as const,
    priceCoins: 800000,
    durationDays: 7,
    description: 'Chatda ismingiz va havolangiz oltin ramkada ajralib turadi',
  },
  {
    id: 'bubble-aurora',
    name: 'Aurora Pufakcha',
    tier: 'A' as const,
    category: 'chat_bubble' as const,
    priceCoins: 650000,
    durationDays: 7,
    description: 'Xabar yuborganda ko‘k-binafsha nurli chat pufakchasi',
  },
  {
    id: 'mic-halo',
    name: 'Oltin Mikrofon Nuri',
    tier: 'S' as const,
    category: 'mic' as const,
    priceCoins: 1800000,
    durationDays: 7,
    description: 'Mikrofonda gapirganda yorqin oltin to‘lqinli halqa effekti',
  },
  // Sevgi Do'koni Uzuklari (Faqat CP parasi uchun)
  {
    id: 'ls-ring-twin-vows',
    name: 'Twin Vows',
    tier: 'SS' as const,
    category: 'rings' as const,
    priceCoins: 30000000,
    durationDays: 365,
    cpOnly: true,
    imageUrl: '/src/assets/images/ring_twin_vows_1794906637978.jpg',
    description: 'Two rings, one eternal love.',
  },
  {
    id: 'ls-ring-petal-promise',
    name: 'Petal Promise',
    tier: 'S' as const,
    category: 'rings' as const,
    priceCoins: 20000000,
    durationDays: 365,
    cpOnly: true,
    imageUrl: '/src/assets/images/ring_petal_promise_1794906638299.jpg',
    description: 'A diamond love, forever bright.',
  },
  {
    id: 'ls-ring-heart-ocean',
    name: 'Heart of the Ocean',
    tier: 'A' as const,
    category: 'rings' as const,
    priceCoins: 4999999,
    durationDays: 365,
    cpOnly: true,
    imageUrl: '/src/assets/images/ring_heart_ocean_1794906637866.jpg',
    description:
      'The heart of the ocean is the most beautiful dream of the deep sea. Every sparkle is a whisper of love.',
  },
  {
    id: 'ls-ring-heart-gemstone',
    name: 'Heart Gemstone Ring',
    tier: 'A' as const,
    category: 'rings' as const,
    priceCoins: 4999999,
    durationDays: 365,
    cpOnly: true,
    imageUrl: '/src/assets/images/ring_heart_gemstone_1794906638786.jpg',
    description: 'Ring Story: Love is a silent confession, every flash is a heartbeat echo.',
  },
  {
    id: 'ls-ring-burj-prestige',
    name: 'Burj Khalifa Prestige Ring',
    tier: 'SS' as const,
    category: 'rings' as const,
    priceCoins: 20000000,
    durationDays: 365,
    cpOnly: true,
    imageUrl: '/src/assets/images/ring_burj_prestige_1794906637372.jpg',
    description:
      'Ring Story: Pinnacle of Glory. Inspired by the soaring silhouette of Burj Khalifa. Symbol of supreme height and extraordinary achievement. Diamonds shine as a testament to prestige and power.',
  },
];

function getOwnedActiveFrames(userId: string) {
  const nowIso = new Date().toISOString();
  return db
    .prepare(
      `SELECT * FROM user_frames
       WHERE user_id = ? AND expires_at > ?
       ORDER BY created_at DESC`
    )
    .all(userId, nowIso)
    .map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      frameId: r.frame_id,
      pricePaid: Number(r.price_paid),
      durationDays: Number(r.duration_days),
      expiresAt: r.expires_at,
      giftedBy: r.gifted_by || null,
      createdAt: r.created_at,
    }));
}

function broadcastUserRoomsUpdated(userId: string) {
  const rooms = db
    .prepare('SELECT DISTINCT room_id FROM room_seats WHERE user_id = ?')
    .all(userId) as Array<{ room_id: string }>;
  for (const r of rooms) {
    const fullRoom = getRoomFull(r.room_id);
    if (fullRoom) {
      broadcastToRoom(r.room_id, 'room:updated', fullRoom);
    }
  }
}

app.get('/api/store/frames', optionalAuth, (req: AuthedRequest, res) => {
  const ownedFrames = req.user ? getOwnedActiveFrames(req.user.id) : [];
  res.json({
    items: STORE_FRAME_CATALOG,
    ownedFrames,
  });
});

app.post('/api/store/frames/buy', authMiddleware, (req: AuthedRequest, res) => {
  const { frameId } = req.body || {};
  const item = STORE_FRAME_CATALOG.find((f) => f.id === frameId) as any;
  if (!item) {
    res.status(404).json({ error: 'Romka yoki mahsulot topilmadi' });
    return;
  }

  let activeCp: any = null;
  if (item.category === 'rings' || item.cpOnly) {
    activeCp = db
      .prepare(
        `SELECT * FROM cp_relationships
         WHERE (user_a_id = ? OR user_b_id = ?) AND status IN ('active', 'married')
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(req.user.id, req.user.id);
    if (!activeCp) {
      res.status(403).json({
        error: 'Faqat CP: Sevgi uyi uzugini sotib olish uchun avval CP parangiz bo‘lishi kerak',
      });
      return;
    }
  }

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!freshUser || Number(freshUser.coin_balance) < item.priceCoins) {
    res.status(400).json({ error: 'Hamyoningizda Tanga yetarli emas' });
    return;
  }

  const expiresAt = new Date(Date.now() + item.durationDays * 86400 * 1000).toISOString();
  const receiptCode = `FRM-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`;

  db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ? WHERE id = ?').run(
      item.priceCoins,
      req.user.id
    );
    if (item.category === 'frames') {
      db.prepare('UPDATE users SET frame_style = ? WHERE id = ?').run(item.id, req.user.id);
    }
    db.prepare(
      `INSERT INTO user_frames (id, user_id, frame_id, price_paid, duration_days, expires_at, gifted_by)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`
    ).run(generateId('uf'), req.user.id, item.id, item.priceCoins, item.durationDays, expiresAt);

    if (activeCp && (item.category === 'rings' || item.cpOnly)) {
      const loveRing = db.prepare('SELECT * FROM love_store_items WHERE id = ?').get(item.id) as any;
      const intGain = Number(loveRing?.intimacy_gain || 2000);
      const blsGain = Number(loveRing?.blessing_gain || 750);
      db.prepare('INSERT INTO cp_collections (id, cp_id, item_id, sender_id) VALUES (?, ?, ?, ?)').run(
        generateId('col'),
        activeCp.id,
        item.id,
        req.user.id
      );
      db.prepare(
        `UPDATE cp_relationships SET intimacy = intimacy + ?, blessing = blessing + ? WHERE id = ?`
      ).run(intGain, blsGain, activeCp.id);
    }

    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'vip_purchase', ?, 0, 'internal', 'confirmed', ?, ?)`
    ).run(
      generateId('wt'),
      req.user.id,
      -item.priceCoins,
      receiptCode,
      `Do‘kon: ${item.name} (${item.durationDays} kun)`
    );
  })();

  if (activeCp) {
    sendToUser(activeCp.user_a_id, 'cp:updated', { cpId: activeCp.id });
    sendToUser(activeCp.user_b_id, 'cp:updated', { cpId: activeCp.id });
  }

  if (item.category === 'frames') {
    broadcastUserRoomsUpdated(req.user.id);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    user: mapUserRow(updated, req.user.id),
    ownedFrames: getOwnedActiveFrames(req.user.id),
    purchasedItem: item,
  });
});

app.post('/api/store/frames/send', authMiddleware, (req: AuthedRequest, res) => {
  const { frameId, recipientId } = req.body || {};
  const item = STORE_FRAME_CATALOG.find((f) => f.id === frameId) as any;
  const recipient = db.prepare('SELECT * FROM users WHERE id = ?').get(recipientId) as any;
  if (!item || !recipient) {
    res.status(404).json({ error: 'Mahsulot yoki qabul qiluvchi topilmadi' });
    return;
  }

  let activeCp: any = null;
  if (item.category === 'rings' || item.cpOnly) {
    activeCp = db
      .prepare(
        `SELECT * FROM cp_relationships
         WHERE (user_a_id = ? OR user_b_id = ?) AND status IN ('active', 'married')
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(req.user.id, req.user.id);
    if (!activeCp) {
      res.status(403).json({
        error: 'Faqat CP: Sevgi uyi uzugini yuborish uchun avval faol CP parangiz bo‘lishi kerak',
      });
      return;
    }
    const partnerId = activeCp.user_a_id === req.user.id ? activeCp.user_b_id : activeCp.user_a_id;
    if (recipient.id !== partnerId) {
      res.status(403).json({
        error: 'Sevgi uyi uzugini faqat o‘z CP parangizga olib berish mumkin (boshqalarga berilmaydi)',
      });
      return;
    }
  }

  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
  if (!freshUser || Number(freshUser.coin_balance) < item.priceCoins) {
    res.status(400).json({ error: 'Hamyoningizda Tanga yetarli emas' });
    return;
  }

  const expiresAt = new Date(Date.now() + item.durationDays * 86400 * 1000).toISOString();
  const receiptCode = `FGS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`;

  db.transaction(() => {
    db.prepare('UPDATE users SET coin_balance = coin_balance - ?, total_gifted = total_gifted + ? WHERE id = ?').run(
      item.priceCoins,
      item.priceCoins,
      req.user.id
    );
    if (item.category === 'frames') {
      db.prepare('UPDATE users SET frame_style = ? WHERE id = ?').run(item.id, recipient.id);
    }
    db.prepare(
      `INSERT INTO user_frames (id, user_id, frame_id, price_paid, duration_days, expires_at, gifted_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(generateId('uf'), recipient.id, item.id, item.priceCoins, item.durationDays, expiresAt, req.user.id);

    if (activeCp && (item.category === 'rings' || item.cpOnly)) {
      const loveRing = db.prepare('SELECT * FROM love_store_items WHERE id = ?').get(item.id) as any;
      const intGain = Number(loveRing?.intimacy_gain || 2000);
      const blsGain = Number(loveRing?.blessing_gain || 750);
      db.prepare('INSERT INTO cp_collections (id, cp_id, item_id, sender_id) VALUES (?, ?, ?, ?)').run(
        generateId('col'),
        activeCp.id,
        item.id,
        req.user.id
      );
      db.prepare(
        `UPDATE cp_relationships SET intimacy = intimacy + ?, blessing = blessing + ? WHERE id = ?`
      ).run(intGain, blsGain, activeCp.id);
    }

    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
       VALUES (?, ?, 'gift_sent', ?, 0, 'internal', 'confirmed', ?, ?)`
    ).run(
      generateId('wt'),
      req.user.id,
      -item.priceCoins,
      receiptCode,
      `${recipient.nickname} ga ${item.name} (${item.durationDays} kun) yuborildi`
    );
  })();

  if (activeCp) {
    sendToUser(activeCp.user_a_id, 'cp:updated', { cpId: activeCp.id });
    sendToUser(activeCp.user_b_id, 'cp:updated', { cpId: activeCp.id });
  }

  const notif = createNotification(
    recipient.id,
    'gift',
    item.category === 'rings' ? 'CP Sevgi uyi uzugi hadya qilindi!' : 'Sizga yangi profil romkasi sovg‘a qilindi!',
    `${req.user.nickname} sizga "${item.name}" hadya qildi.`,
    item.category === 'rings' ? 'cp' : 'profile'
  );
  sendToUser(recipient.id, 'notification:new', notif);

  if (item.category === 'frames') {
    broadcastUserRoomsUpdated(recipient.id);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({
    user: mapUserRow(updated, req.user.id),
    ownedFrames: getOwnedActiveFrames(req.user.id),
    recipientNickname: recipient.nickname,
  });
});

app.post('/api/store/frames/equip', authMiddleware, (req: AuthedRequest, res) => {
  const { frameId } = req.body || {};
  if (!frameId || frameId === 'none') {
    db.prepare('UPDATE users SET frame_style = ? WHERE id = ?').run('none', req.user.id);
    broadcastUserRoomsUpdated(req.user.id);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ user: mapUserRow(updated, req.user.id) });
    return;
  }

  const freeCatalogFrame = PROFILE_FRAMES_CATALOG.find(
    (f) => f.id === frameId && f.priceCoins === 0
  );
  if (!freeCatalogFrame) {
    const nowIso = new Date().toISOString();
    const owned = db
      .prepare('SELECT * FROM user_frames WHERE user_id = ? AND frame_id = ? AND expires_at > ? LIMIT 1')
      .get(req.user.id, frameId, nowIso);
    if (!owned) {
      res.status(403).json({ error: 'Ushbu romkani taqish uchun avval sotib olishingiz kerak' });
      return;
    }
  }

  db.prepare('UPDATE users SET frame_style = ? WHERE id = ?').run(frameId, req.user.id);
  broadcastUserRoomsUpdated(req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: mapUserRow(updated, req.user.id) });
});

// ============================================================================
// HEALTH CHECK & VITE / STATIC SERVING ON PORT 3000
// ============================================================================
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const requestedPort = isProd ? Number(process.env.APP_PORT || process.env.PORT || 3000) : 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  let currentPort = requestedPort;
  let retriedFallback = false;

  const listenOnPort = (portToListen: number) => {
    server.listen(portToListen, '0.0.0.0', () => {
      console.log(`TURON CHAT server running on http://0.0.0.0:${portToListen}`);
    });
  };

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && !retriedFallback && currentPort !== 3000) {
      retriedFallback = true;
      currentPort = 3000;
      console.warn(`Port ${requestedPort} is already in use, falling back to port 3000`);
      listenOnPort(3000);
      return;
    }
    console.error('Server listen error:', err);
    process.exit(1);
  });

  wss.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && currentPort !== 3000) {
      return;
    }
    console.error('WebSocketServer error:', err);
  });

  listenOnPort(currentPort);
}

startServer();
