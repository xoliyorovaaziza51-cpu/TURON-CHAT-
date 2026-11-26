import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'turon_chat.sqlite');

function removeCorruptDbFiles(): void {
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${dbPath}${suffix}`;
    try {
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    } catch {
      // ignore unlink errors
    }
  }
}

function openHealthyDatabase(): Database.Database {
  try {
    const candidate = new Database(dbPath);
    const check = candidate.pragma('quick_check', { simple: true });
    if (check !== 'ok') {
      candidate.close();
      removeCorruptDbFiles();
      const fresh = new Database(dbPath);
      fresh.pragma('journal_mode = WAL');
      fresh.pragma('foreign_keys = ON');
      return fresh;
    }
    candidate.pragma('journal_mode = WAL');
    candidate.pragma('foreign_keys = ON');
    return candidate;
  } catch {
    removeCorruptDbFiles();
    const fresh = new Database(dbPath);
    fresh.pragma('journal_mode = WAL');
    fresh.pragma('foreign_keys = ON');
    return fresh;
  }
}

export const db = openHealthyDatabase();

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      gender TEXT DEFAULT 'unspecified',
      country TEXT DEFAULT 'O''zbekiston',
      bio TEXT DEFAULT '',
      online_status TEXT DEFAULT 'offline',
      role TEXT NOT NULL DEFAULT 'user',
      vip_level INTEGER NOT NULL DEFAULT 0,
      svip_level INTEGER NOT NULL DEFAULT 0,
      vip_expires_at TEXT,
      frame_style TEXT DEFAULT 'none',
      coin_balance INTEGER NOT NULL DEFAULT 500,
      total_gifted INTEGER NOT NULL DEFAULT 0,
      total_received INTEGER NOT NULL DEFAULT 0,
      agency_id TEXT,
      is_muted_until TEXT,
      is_suspended INTEGER NOT NULL DEFAULT 0,
      privacy_dm TEXT NOT NULL DEFAULT 'everyone',
      privacy_show_online INTEGER NOT NULL DEFAULT 1,
      notify_messages INTEGER NOT NULL DEFAULT 1,
      notify_gifts INTEGER NOT NULL DEFAULT 1,
      notify_rooms INTEGER NOT NULL DEFAULT 1,
      language TEXT NOT NULL DEFAULT 'uz',
      birth_year INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      addressee_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (requester_id, addressee_id)
    );

    CREATE TABLE IF NOT EXISTS blocks (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Suhbat',
      owner_id TEXT NOT NULL,
      max_seats INTEGER NOT NULL DEFAULT 8,
      is_private INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      background_theme TEXT NOT NULL DEFAULT 'sapphire',
      visual_effect TEXT NOT NULL DEFAULT 'aurora',
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      viewer_count INTEGER NOT NULL DEFAULT 1,
      rocket_energy INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_seats (
      room_id TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      user_id TEXT,
      is_muted INTEGER NOT NULL DEFAULT 0,
      is_locked INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, seat_number)
    );

    CREATE TABLE IF NOT EXISTS room_moderators (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      assigned_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS room_bans (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      banned_by TEXT NOT NULL,
      reason TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS room_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      msg_type TEXT NOT NULL DEFAULT 'text',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS private_messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT DEFAULT '',
      attachment_url TEXT,
      attachment_type TEXT,
      attachment_name TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gift_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gifts (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      icon_key TEXT NOT NULL,
      price_coins INTEGER NOT NULL,
      is_animated INTEGER NOT NULL DEFAULT 0,
      tier TEXT NOT NULL DEFAULT 'standard',
      is_active INTEGER NOT NULL DEFAULT 1,
      video_url TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS gift_transactions (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      room_id TEXT,
      gift_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      total_coins INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tx_type TEXT NOT NULL,
      amount_coins INTEGER NOT NULL,
      price_uzs INTEGER DEFAULT 0,
      provider TEXT DEFAULT 'internal',
      status TEXT NOT NULL DEFAULT 'confirmed',
      receipt_code TEXT UNIQUE NOT NULL,
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vip_plans (
      id TEXT PRIMARY KEY,
      tier_type TEXT NOT NULL,
      level INTEGER NOT NULL,
      name TEXT NOT NULL,
      price_coins INTEGER NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 30,
      frame_style TEXT NOT NULL,
      benefits_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS vip_purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      price_coins INTEGER NOT NULL,
      starts_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pk_battles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      room_a_id TEXT NOT NULL,
      room_b_id TEXT NOT NULL,
      score_a INTEGER NOT NULL DEFAULT 0,
      score_b INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 300,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      head_user_id TEXT NOT NULL,
      total_volume INTEGER NOT NULL DEFAULT 0,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agency_members (
      agency_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      member_role TEXT NOT NULL DEFAULT 'agent',
      monthly_score INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (agency_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      notif_type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      action_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'open',
      resolved_by TEXT,
      resolution_note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      game_id TEXT NOT NULL,
      game_title TEXT NOT NULL,
      category TEXT NOT NULL,
      delta_points INTEGER NOT NULL,
      outcome TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cp_relationships (
      id TEXT PRIMARY KEY,
      user_a_id TEXT NOT NULL,
      user_b_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      intimacy INTEGER NOT NULL DEFAULT 0,
      blessing INTEGER NOT NULL DEFAULT 0,
      gift_coin_acc INTEGER NOT NULL DEFAULT 0,
      daily_intimacy_used INTEGER NOT NULL DEFAULT 0,
      daily_mic_minutes INTEGER NOT NULL DEFAULT 0,
      daily_date TEXT NOT NULL DEFAULT (date('now')),
      last_mic_tick_at TEXT,
      marriage_status TEXT NOT NULL DEFAULT 'none',
      proposal_ring_id TEXT,
      proposed_by TEXT,
      married_at TEXT,
      wedding_room_id TEXT,
      active_theme TEXT NOT NULL DEFAULT 'starlight-1',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT
    );

    CREATE TABLE IF NOT EXISTS love_store_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price_coins INTEGER NOT NULL,
      intimacy_gain INTEGER NOT NULL DEFAULT 0,
      blessing_gain INTEGER NOT NULL DEFAULT 0,
      guard_gain INTEGER NOT NULL DEFAULT 0,
      theme_key TEXT,
      description TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS cp_collections (
      id TEXT PRIMARY KEY,
      cp_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ribbon_logos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subtitle TEXT DEFAULT '',
      category TEXT NOT NULL DEFAULT 'diler',
      image_url TEXT DEFAULT '',
      target_url TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_frames (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      frame_id TEXT NOT NULL,
      price_paid INTEGER NOT NULL,
      duration_days INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      gifted_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_traffic_events (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      user_id TEXT NOT NULL,
      coins_amount INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_dj_tracks (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      source_url TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'preset',
      preset_key TEXT DEFAULT 'tashkent-nights',
      duration_sec INTEGER NOT NULL DEFAULT 180,
      added_by_id TEXT NOT NULL,
      added_by_name TEXT NOT NULL,
      is_played INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS room_dj_votes (
      track_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (track_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS room_music_tracks (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '',
      audio_url TEXT NOT NULL,
      duration_sec INTEGER NOT NULL DEFAULT 0,
      file_size INTEGER NOT NULL DEFAULT 0,
      added_by_id TEXT NOT NULL,
      added_by_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS greedy_pro_rounds (
      id TEXT PRIMARY KEY,
      round_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'betting',
      started_at INTEGER NOT NULL,
      betting_ends_at INTEGER NOT NULL,
      spinning_ends_at INTEGER NOT NULL,
      result_ends_at INTEGER NOT NULL,
      winning_slot INTEGER,
      jackpot_pool INTEGER NOT NULL DEFAULT 21221382,
      total_pool INTEGER NOT NULL DEFAULT 0,
      jackpot_won INTEGER NOT NULL DEFAULT 0,
      settled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS greedy_pro_bets (
      id TEXT PRIMARY KEY,
      round_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      slot_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      payout INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (round_id, user_id, slot_id)
    );

    CREATE TABLE IF NOT EXISTS greedy_pro_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Safe migration for existing SQLite databases
  const userCols = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  if (!userCols.some((c) => c.name === 'game_points')) {
    db.exec('ALTER TABLE users ADD COLUMN game_points INTEGER NOT NULL DEFAULT 2000');
  }
  if (!userCols.some((c) => c.name === 'equipped_medal')) {
    db.exec("ALTER TABLE users ADD COLUMN equipped_medal TEXT NOT NULL DEFAULT 'Turon Yulduzi'");
  }
  if (!userCols.some((c) => c.name === 'photos_json')) {
    db.exec("ALTER TABLE users ADD COLUMN photos_json TEXT NOT NULL DEFAULT '[]'");
  }
  if (!userCols.some((c) => c.name === 'guard_value')) {
    db.exec('ALTER TABLE users ADD COLUMN guard_value INTEGER NOT NULL DEFAULT 0');
    db.exec("UPDATE users SET guard_value = 2400 WHERE id = 'u-founder'");
    db.exec("UPDATE users SET guard_value = 1850 WHERE id = 'u-superadmin'");
    db.exec("UPDATE users SET guard_value = 1200 WHERE id = 'u-agencyhead'");
    db.exec("UPDATE users SET guard_value = 920 WHERE id = 'u-pkadmin'");
    db.exec("UPDATE users SET guard_value = 780 WHERE id = 'u-user1'");
    db.exec("UPDATE users SET guard_value = 680 WHERE id = 'u-mod'");
  }

  const roomCols = db.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>;
  if (!roomCols.some((c) => c.name === 'rocket_energy')) {
    db.exec('ALTER TABLE rooms ADD COLUMN rocket_energy INTEGER NOT NULL DEFAULT 0');
    db.exec("UPDATE rooms SET rocket_energy = 2650 WHERE id = 'room-toshkent-kechasi'");
    db.exec("UPDATE rooms SET rocket_energy = 950 WHERE id = 'room-samarqand-terrasa'");
  }
  if (!roomCols.some((c) => c.name === 'is_wedding_room')) {
    db.exec('ALTER TABLE rooms ADD COLUMN is_wedding_room INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomCols.some((c) => c.name === 'wedding_cp_id')) {
    db.exec('ALTER TABLE rooms ADD COLUMN wedding_cp_id TEXT');
  }
  if (!roomCols.some((c) => c.name === 'announcement')) {
    db.exec("ALTER TABLE rooms ADD COLUMN announcement TEXT NOT NULL DEFAULT ''");
  }
  if (!roomCols.some((c) => c.name === 'welcome_room_msg')) {
    db.exec("ALTER TABLE rooms ADD COLUMN welcome_room_msg TEXT NOT NULL DEFAULT ''");
  }
  if (!roomCols.some((c) => c.name === 'welcome_user_msg')) {
    db.exec("ALTER TABLE rooms ADD COLUMN welcome_user_msg TEXT NOT NULL DEFAULT ''");
  }
  if (!roomCols.some((c) => c.name === 'public_screen_enabled')) {
    db.exec('ALTER TABLE rooms ADD COLUMN public_screen_enabled INTEGER NOT NULL DEFAULT 1');
  }
  if (!roomCols.some((c) => c.name === 'sensitive_words')) {
    db.exec("ALTER TABLE rooms ADD COLUMN sensitive_words TEXT NOT NULL DEFAULT ''");
  }
  if (!roomCols.some((c) => c.name === 'room_type')) {
    db.exec("ALTER TABLE rooms ADD COLUMN room_type TEXT NOT NULL DEFAULT 'chat'");
  }
  if (!roomCols.some((c) => c.name === 'mic_mode')) {
    db.exec("ALTER TABLE rooms ADD COLUMN mic_mode TEXT NOT NULL DEFAULT 'open'");
  }
  if (!roomCols.some((c) => c.name === 'require_member_approval')) {
    db.exec('ALTER TABLE rooms ADD COLUMN require_member_approval INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomCols.some((c) => c.name === 'super_mic_enabled')) {
    db.exec('ALTER TABLE rooms ADD COLUMN super_mic_enabled INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomCols.some((c) => c.name === 'video_url')) {
    db.exec("ALTER TABLE rooms ADD COLUMN video_url TEXT NOT NULL DEFAULT ''");
  }
  if (!roomCols.some((c) => c.name === 'video_title')) {
    db.exec("ALTER TABLE rooms ADD COLUMN video_title TEXT NOT NULL DEFAULT ''");
  }
  if (!roomCols.some((c) => c.name === 'dj_current_track_id')) {
    db.exec('ALTER TABLE rooms ADD COLUMN dj_current_track_id TEXT');
  }
  if (!roomCols.some((c) => c.name === 'dj_is_playing')) {
    db.exec('ALTER TABLE rooms ADD COLUMN dj_is_playing INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomCols.some((c) => c.name === 'dj_updated_at')) {
    db.exec('ALTER TABLE rooms ADD COLUMN dj_updated_at TEXT');
  }
  if (!roomCols.some((c) => c.name === 'dynamic_bg')) {
    db.exec("ALTER TABLE rooms ADD COLUMN dynamic_bg TEXT NOT NULL DEFAULT 'campfire-night'");
  }
  if (!roomCols.some((c) => c.name === 'rocket_ribbon_json')) {
    db.exec("ALTER TABLE rooms ADD COLUMN rocket_ribbon_json TEXT NOT NULL DEFAULT '[]'");
  }
  if (!roomCols.some((c) => c.name === 'game_ribbon_json')) {
    db.exec("ALTER TABLE rooms ADD COLUMN game_ribbon_json TEXT NOT NULL DEFAULT '[]'");
  }

  const roomMsgCols = db.prepare("PRAGMA table_info(room_messages)").all() as Array<{ name: string }>;
  if (!roomMsgCols.some((c) => c.name === 'audio_url')) {
    db.exec("ALTER TABLE room_messages ADD COLUMN audio_url TEXT NOT NULL DEFAULT ''");
  }
  if (!roomMsgCols.some((c) => c.name === 'audio_duration_sec')) {
    db.exec('ALTER TABLE room_messages ADD COLUMN audio_duration_sec INTEGER NOT NULL DEFAULT 0');
  }

  const pmCols = db.prepare("PRAGMA table_info(private_messages)").all() as Array<{ name: string }>;
  if (!pmCols.some((c) => c.name === 'audio_duration_sec')) {
    db.exec('ALTER TABLE private_messages ADD COLUMN audio_duration_sec INTEGER NOT NULL DEFAULT 0');
  }

  const loveStoreCols = db.prepare("PRAGMA table_info(love_store_items)").all() as Array<{ name: string }>;
  if (!loveStoreCols.some((c) => c.name === 'image_url')) {
    db.exec("ALTER TABLE love_store_items ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");
  }

  const giftCols = db.prepare("PRAGMA table_info(gifts)").all() as Array<{ name: string }>;
  if (!giftCols.some((c) => c.name === 'video_url')) {
    db.exec("ALTER TABLE gifts ADD COLUMN video_url TEXT DEFAULT ''");
  }

  if (!roomCols.some((c) => c.name === 'music_current_track_id')) {
    db.exec('ALTER TABLE rooms ADD COLUMN music_current_track_id TEXT DEFAULT NULL');
  }
  if (!roomCols.some((c) => c.name === 'music_is_playing')) {
    db.exec('ALTER TABLE rooms ADD COLUMN music_is_playing INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomCols.some((c) => c.name === 'music_position_sec')) {
    db.exec('ALTER TABLE rooms ADD COLUMN music_position_sec INTEGER NOT NULL DEFAULT 0');
  }
  if (!roomCols.some((c) => c.name === 'music_updated_at')) {
    db.exec('ALTER TABLE rooms ADD COLUMN music_updated_at TEXT DEFAULT NULL');
  }

  seedLoveStoreIfEmpty();
  seedOrUpdateLuxuryRings();
  seedRibbonLogosIfEmpty();
  seedOrUpdateLuxuryGifts();

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    seedInitialData();
  }
}

function seedOrUpdateLuxuryGifts(): void {
  db.prepare(`INSERT OR IGNORE INTO gift_categories (id, name, sort_order) VALUES (?, ?, ?)`).run(
    'cat-anim',
    'Animatsiyali VIP',
    3
  );

  const luxuryGifts = [
    {
      id: 'g-wolf',
      category_id: 'cat-anim',
      name: 'Buri',
      icon_key: 'flame',
      price_coins: 550000,
      is_animated: 1,
      tier: 'luxury',
      video_url: '/assets/aistudio/VID_20261110_013047_655_d7c30818.mp4',
    },
    {
      id: 'g-eagle',
      category_id: 'cat-anim',
      name: 'Burgut',
      icon_key: 'sparkles',
      price_coins: 800000,
      is_animated: 1,
      tier: 'luxury',
      video_url: '/assets/aistudio/VID_20261109_231221_935_58b0ccff.mp4',
    },
    {
      id: 'g-dragon',
      category_id: 'cat-anim',
      name: 'Ajdar',
      icon_key: 'flame',
      price_coins: 1200000,
      is_animated: 1,
      tier: 'luxury',
      video_url: '/assets/aistudio/VID_20261110_013047_655_d7c30818.mp4',
    },
    {
      id: 'g-dubai',
      category_id: 'cat-anim',
      name: 'Dubay sovgʻasi',
      icon_key: 'crown',
      price_coins: 2500000,
      is_animated: 1,
      tier: 'luxury',
      video_url: '/assets/aistudio/VID_20261109_231025_775_de245d3c.mp4',
    },
    {
      id: 'g-lion',
      category_id: 'cat-anim',
      name: 'Sher',
      icon_key: 'shield',
      price_coins: 4000000,
      is_animated: 1,
      tier: 'luxury',
      video_url: '/assets/aistudio/VID_20261107_101711_889_5ea3080b.mp4',
    },
  ];

  const upsert = db.prepare(`
    INSERT INTO gifts (id, category_id, name, icon_key, price_coins, is_animated, tier, is_active, video_url)
    VALUES (@id, @category_id, @name, @icon_key, @price_coins, @is_animated, @tier, 1, @video_url)
    ON CONFLICT(id) DO UPDATE SET
      category_id = excluded.category_id,
      name = excluded.name,
      icon_key = excluded.icon_key,
      price_coins = excluded.price_coins,
      is_animated = excluded.is_animated,
      tier = excluded.tier,
      is_active = 1,
      video_url = excluded.video_url
  `);

  for (const g of luxuryGifts) {
    upsert.run(g);
  }
}

function seedRibbonLogosIfEmpty(): void {
  const count = (db.prepare('SELECT COUNT(*) as c FROM ribbon_logos').get() as { c: number }).c;
  if (count > 0) return;

  const logos = [
    {
      id: 'logo-diler-1',
      name: 'Rasmiy Tanga Dileri',
      subtitle: '24/7 tezkor tanga savdosi',
      category: 'diler',
      image_url: '',
      target_url: 'https://t.me/',
      sort_order: 1,
    },
    {
      id: 'logo-admin-1',
      name: 'Bosh Admin Xizmati',
      subtitle: 'Rasmiy boshqaruv va yordam',
      category: 'admin',
      image_url: '',
      target_url: 'https://t.me/',
      sort_order: 2,
    },
    {
      id: 'logo-tg-1',
      name: 'TURON CHAT Kanali',
      subtitle: 'Yangiliklar va aksiyalar',
      category: 'telegram',
      image_url: '',
      target_url: 'https://t.me/',
      sort_order: 3,
    },
    {
      id: 'logo-diler-2',
      name: 'VIP Hamkor Diler',
      subtitle: 'Kafolatlangan hamyon to‘ldirish',
      category: 'diler',
      image_url: '',
      target_url: 'https://t.me/',
      sort_order: 4,
    },
    {
      id: 'logo-admin-2',
      name: 'Moderatorlar Jamoasi',
      subtitle: 'Xonalar tartibi nazorati',
      category: 'admin',
      image_url: '',
      target_url: 'https://t.me/',
      sort_order: 5,
    },
    {
      id: 'logo-tg-2',
      name: 'Turnirlar Telegrami',
      subtitle: 'PK va o‘yin sovrinlari',
      category: 'telegram',
      image_url: '',
      target_url: 'https://t.me/',
      sort_order: 6,
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO ribbon_logos (id, name, subtitle, category, image_url, target_url, sort_order, is_active, created_by)
    VALUES (@id, @name, @subtitle, @category, @image_url, @target_url, @sort_order, 1, 'u-founder')
  `);
  for (const item of logos) stmt.run(item);
}

function seedLoveStoreIfEmpty(): void {
  const count = (db.prepare('SELECT COUNT(*) as c FROM love_store_items').get() as { c: number }).c;
  if (count > 0) return;

  const items = [
    {
      id: 'ls-ring-silver',
      name: 'Kumush Nikoh Uzugi',
      category: 'ring',
      price_coins: 1500,
      intimacy_gain: 150,
      blessing_gain: 50,
      guard_gain: 100,
      theme_key: null,
      description: 'CP LV1 darajasiga chiqqach turmush qurish taklifini yuborish uchun nafis kumush uzuk.',
    },
    {
      id: 'ls-ring-gold',
      name: 'Oltin Turon Uzugi',
      category: 'ring',
      price_coins: 4500,
      intimacy_gain: 450,
      blessing_gain: 150,
      guard_gain: 250,
      theme_key: null,
      description: 'Nikoh marosimi uchun oltin uzuk. Yaqinlik va Baraka qiymatini sezilarli oshiradi.',
    },
    {
      id: 'ls-ring-imperial',
      name: 'Imperator Olmos Uzugi',
      category: 'ring',
      price_coins: 12000,
      intimacy_gain: 1200,
      blessing_gain: 400,
      guard_gain: 600,
      theme_key: null,
      description: 'Oliy toifadagi olmos nikoh uzugi — Sevgi uyida abadiy kolleksiya sifatida saqlanadi.',
    },
    {
      id: 'ls-bouquet',
      name: 'Muhabbat Guldastasi',
      category: 'intimacy',
      price_coins: 300,
      intimacy_gain: 60,
      blessing_gain: 20,
      guard_gain: 50,
      theme_key: null,
      description: 'CP juftingizga yaqinlik va baraka ulashuvchi romantik guldasta.',
    },
    {
      id: 'ls-lantern',
      name: 'Abadiy Shamchiroq',
      category: 'intimacy',
      price_coins: 900,
      intimacy_gain: 200,
      blessing_gain: 80,
      guard_gain: 120,
      theme_key: null,
      description: 'Sevgi uyi nurini kuchaytirib, kunlik yaqinlikni tez oshiradi.',
    },
    {
      id: 'ls-guard-shield',
      name: 'Himoya Qalqoni (+350)',
      category: 'guard',
      price_coins: 350,
      intimacy_gain: 0,
      blessing_gain: 0,
      guard_gain: 350,
      theme_key: null,
      description: 'CP so‘rovi ochish uchun zarur bo‘lgan Himoya qiymatini (+350) oshiradi.',
    },
    {
      id: 'ls-theme-starlight',
      name: 'Yulduzli Tun Muqovasi',
      category: 'theme',
      price_coins: 1200,
      intimacy_gain: 250,
      blessing_gain: 100,
      guard_gain: 150,
      theme_key: 'starlight-violet',
      description: 'Sevgi uyi uchun yulduzcha muqova foni va yuqori yaqinlik bonusi.',
    },
    {
      id: 'ls-theme-marry',
      name: 'Marry Cover · Oltin To‘y Mavzusi',
      category: 'theme',
      price_coins: 2500,
      intimacy_gain: 550,
      blessing_gain: 220,
      guard_gain: 300,
      theme_key: 'marry-cover',
      description: 'Nikoh juftliklari uchun maxsus Marry Cover hashamatli to‘y foni.',
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO love_store_items (
      id, name, category, price_coins, intimacy_gain, blessing_gain, guard_gain, theme_key, description
    ) VALUES (
      @id, @name, @category, @price_coins, @intimacy_gain, @blessing_gain, @guard_gain, @theme_key, @description
    )
  `);
  for (const item of items) stmt.run(item);
}

function seedOrUpdateLuxuryRings(): void {
  const luxuryRings = [
    {
      id: 'ls-ring-twin-vows',
      name: 'Twin Vows',
      category: 'ring',
      price_coins: 30000000,
      intimacy_gain: 10000,
      blessing_gain: 3500,
      guard_gain: 5000,
      theme_key: null,
      image_url: '/src/assets/images/ring_twin_vows_1794906637978.jpg',
      description: 'Two rings, one eternal love.',
    },
    {
      id: 'ls-ring-petal-promise',
      name: 'Petal Promise',
      category: 'ring',
      price_coins: 20000000,
      intimacy_gain: 6800,
      blessing_gain: 2200,
      guard_gain: 3200,
      theme_key: null,
      image_url: '/src/assets/images/ring_petal_promise_1794906638299.jpg',
      description: 'A diamond love, forever bright.',
    },
    {
      id: 'ls-ring-heart-ocean',
      name: 'Heart of the Ocean',
      category: 'ring',
      price_coins: 4999999,
      intimacy_gain: 2000,
      blessing_gain: 750,
      guard_gain: 1200,
      theme_key: null,
      image_url: '/src/assets/images/ring_heart_ocean_1794906637866.jpg',
      description:
        'The heart of the ocean is the most beautiful dream of the deep sea. Every sparkle is a whisper of love.',
    },
    {
      id: 'ls-ring-heart-gemstone',
      name: 'Heart Gemstone Ring',
      category: 'ring',
      price_coins: 4999999,
      intimacy_gain: 2000,
      blessing_gain: 750,
      guard_gain: 1200,
      theme_key: null,
      image_url: '/src/assets/images/ring_heart_gemstone_1794906638786.jpg',
      description: 'Ring Story: Love is a silent confession, every flash is a heartbeat echo.',
    },
    {
      id: 'ls-ring-burj-prestige',
      name: 'Burj Khalifa Prestige Ring',
      category: 'ring',
      price_coins: 20000000,
      intimacy_gain: 7500,
      blessing_gain: 2500,
      guard_gain: 3500,
      theme_key: null,
      image_url: '/src/assets/images/ring_burj_prestige_1794906637372.jpg',
      description:
        'Ring Story: Pinnacle of Glory. Inspired by the soaring silhouette of Burj Khalifa. Symbol of supreme height and extraordinary achievement. Diamonds shine as a testament to prestige and power.',
    },
  ];

  const upsert = db.prepare(`
    INSERT INTO love_store_items (
      id, name, category, price_coins, intimacy_gain, blessing_gain, guard_gain, theme_key, image_url, description
    ) VALUES (
      @id, @name, @category, @price_coins, @intimacy_gain, @blessing_gain, @guard_gain, @theme_key, @image_url, @description
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      price_coins = excluded.price_coins,
      intimacy_gain = excluded.intimacy_gain,
      blessing_gain = excluded.blessing_gain,
      guard_gain = excluded.guard_gain,
      image_url = excluded.image_url,
      description = excluded.description
  `);

  for (const ring of luxuryRings) {
    upsert.run(ring);
  }
}

function seedInitialData(): void {
  const passHash = bcrypt.hashSync('turon2026', 10);

  const users = [
    {
      id: 'u-founder',
      public_id: 'TC-10001',
      email: 'asoschi@turonchat.uz',
      nickname: 'Sardorbek Turon',
      avatar_url: '/src/assets/images/avatar_host_male_1794822314575.jpg',
      gender: 'male',
      country: "O'zbekiston",
      bio: "TURON CHAT asoschisi. O'zbekiston va Markaziy Osiyo ovozli hamjamiyati.",
      online_status: 'online',
      role: 'founder',
      vip_level: 5,
      svip_level: 5,
      frame_style: 'svip-sovereign',
      coin_balance: 150000,
      total_gifted: 48200,
      total_received: 96500,
      agency_id: 'ag-turon-elite',
    },
    {
      id: 'u-superadmin',
      public_id: 'TC-10002',
      email: 'superadmin@turonchat.uz',
      nickname: 'Madina Karimova',
      avatar_url: '/src/assets/images/avatar_host_female_1794822314393.jpg',
      gender: 'female',
      country: "O'zbekiston",
      bio: 'Hamjamiyat xavfsizligi va jonli musiqiy kechalar boshqaruvchisi.',
      online_status: 'online',
      role: 'super_admin',
      vip_level: 4,
      svip_level: 3,
      frame_style: 'svip-gold',
      coin_balance: 72000,
      total_gifted: 31500,
      total_received: 64200,
      agency_id: 'ag-turon-elite',
    },
    {
      id: 'u-agencyhead',
      public_id: 'TC-10003',
      email: 'agentlik@turonchat.uz',
      nickname: 'Dilnoza Rahimova',
      avatar_url: '/src/assets/images/avatar_host_creator_1794822315118.jpg',
      gender: 'female',
      country: "O'zbekiston",
      bio: 'Samarqand Yulduzlari agentligi rahbari va jonli suhbat boshlovchisi.',
      online_status: 'online',
      role: 'agency_head',
      vip_level: 3,
      svip_level: 2,
      frame_style: 'vip-amethyst',
      coin_balance: 38400,
      total_gifted: 22100,
      total_received: 51400,
      agency_id: 'ag-samarqand',
    },
    {
      id: 'u-pkadmin',
      public_id: 'TC-10004',
      email: 'pk@turonchat.uz',
      nickname: 'Jasur Alimov',
      avatar_url: '/src/assets/images/avatar_host_male_1794822314575.jpg',
      gender: 'male',
      country: "O'zbekiston",
      bio: 'PK Arena hakami va turnirlar tashkilotchisi.',
      online_status: 'online',
      role: 'pk_admin',
      vip_level: 2,
      svip_level: 0,
      frame_style: 'vip-sapphire',
      coin_balance: 18500,
      total_gifted: 14200,
      total_received: 24900,
      agency_id: 'ag-turon-elite',
    },
    {
      id: 'u-user1',
      public_id: 'TC-10005',
      email: 'mehmon@turonchat.uz',
      nickname: 'Azizbek Toshkent',
      avatar_url: '/src/assets/images/avatar_host_male_1794822314575.jpg',
      gender: 'male',
      country: "O'zbekiston",
      bio: 'Toshkent kechalari va akustik musiqa muxlisi.',
      online_status: 'online',
      role: 'user',
      vip_level: 1,
      svip_level: 0,
      frame_style: 'vip-sapphire',
      coin_balance: 4500,
      total_gifted: 3400,
      total_received: 2900,
      agency_id: null,
    },
    {
      id: 'u-mod',
      public_id: 'TC-10006',
      email: 'moderator@turonchat.uz',
      nickname: 'Nigora Sodiqova',
      avatar_url: '/src/assets/images/avatar_host_female_1794822314393.jpg',
      gender: 'female',
      country: "O'zbekiston",
      bio: 'Xonalar tartibi va hamjamiyat qoidalari moderatori.',
      online_status: 'offline',
      role: 'moderator',
      vip_level: 2,
      svip_level: 0,
      frame_style: 'vip-amethyst',
      coin_balance: 12000,
      total_gifted: 6100,
      total_received: 8700,
      agency_id: 'ag-samarqand',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (
      id, public_id, email, password_hash, nickname, avatar_url, gender, country, bio,
      online_status, role, vip_level, svip_level, vip_expires_at, frame_style,
      coin_balance, total_gifted, total_received, agency_id, birth_year
    ) VALUES (
      @id, @public_id, @email, @password_hash, @nickname, @avatar_url, @gender, @country, @bio,
      @online_status, @role, @vip_level, @svip_level, @vip_expires_at, @frame_style,
      @coin_balance, @total_gifted, @total_received, @agency_id, @birth_year
    )
  `);

  const futureDate = new Date(Date.now() + 28 * 86400 * 1000).toISOString();
  for (const u of users) {
    insertUser.run({
      ...u,
      password_hash: passHash,
      vip_expires_at: u.vip_level > 0 || u.svip_level > 0 ? futureDate : null,
      birth_year: 1998,
    });
  }

  // Agencies
  db.prepare(`
    INSERT INTO agencies (id, name, description, head_user_id, total_volume, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'ag-turon-elite',
    'Turon Elite Media',
    "O'zbekistondagi yetakchi ovozli boshlovchilar va musiqiy studiyalar agentligi.",
    'u-founder',
    285000,
    1
  );
  db.prepare(`
    INSERT INTO agencies (id, name, description, head_user_id, total_volume, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'ag-samarqand',
    'Samarqand Yulduzlari',
    'Madaniy suhbatlar, podkastlar va kechki jonli efirlar jamoasi.',
    'u-agencyhead',
    194000,
    1
  );

  db.prepare(`INSERT INTO agency_members (agency_id, user_id, member_role, monthly_score) VALUES (?, ?, ?, ?)`).run('ag-turon-elite', 'u-founder', 'head', 96500);
  db.prepare(`INSERT INTO agency_members (agency_id, user_id, member_role, monthly_score) VALUES (?, ?, ?, ?)`).run('ag-turon-elite', 'u-superadmin', 'agent', 64200);
  db.prepare(`INSERT INTO agency_members (agency_id, user_id, member_role, monthly_score) VALUES (?, ?, ?, ?)`).run('ag-turon-elite', 'u-pkadmin', 'host', 24900);
  db.prepare(`INSERT INTO agency_members (agency_id, user_id, member_role, monthly_score) VALUES (?, ?, ?, ?)`).run('ag-samarqand', 'u-agencyhead', 'head', 51400);
  db.prepare(`INSERT INTO agency_members (agency_id, user_id, member_role, monthly_score) VALUES (?, ?, ?, ?)`).run('ag-samarqand', 'u-mod', 'agent', 18700);

  // Gift Categories & Gifts
  const categories = [
    { id: 'cat-std', name: 'Oddiy', sort_order: 1 },
    { id: 'cat-lux', name: 'Hashamatli', sort_order: 2 },
    { id: 'cat-anim', name: 'Animatsiyali VIP', sort_order: 3 },
    { id: 'cat-pk', name: 'PK Kuchaytirgich', sort_order: 4 },
  ];
  const insertCat = db.prepare(`INSERT INTO gift_categories (id, name, sort_order) VALUES (?, ?, ?)`);
  for (const c of categories) insertCat.run(c.id, c.name, c.sort_order);

  const gifts = [
    { id: 'g-tulip', category_id: 'cat-std', name: 'Lola guli', icon_key: 'flower', price_coins: 10, is_animated: 0, tier: 'standard', video_url: '' },
    { id: 'g-tea', category_id: 'cat-std', name: 'Choynak choy', icon_key: 'coffee', price_coins: 25, is_animated: 0, tier: 'standard', video_url: '' },
    { id: 'g-heart', category_id: 'cat-std', name: 'Moviy yurak', icon_key: 'heart', price_coins: 50, is_animated: 0, tier: 'standard', video_url: '' },
    { id: 'g-mic', category_id: 'cat-lux', name: 'Oltin mikrofon', icon_key: 'mic', price_coins: 250, is_animated: 1, tier: 'premium', video_url: '' },
    { id: 'g-crown', category_id: 'cat-lux', name: 'Turon toji', icon_key: 'crown', price_coins: 999, is_animated: 1, tier: 'luxury', video_url: '' },
    { id: 'g-wolf', category_id: 'cat-anim', name: 'Buri', icon_key: 'flame', price_coins: 550000, is_animated: 1, tier: 'luxury', video_url: '/assets/aistudio/VID_20261110_013047_655_d7c30818.mp4' },
    { id: 'g-eagle', category_id: 'cat-anim', name: 'Burgut', icon_key: 'sparkles', price_coins: 800000, is_animated: 1, tier: 'luxury', video_url: '/assets/aistudio/VID_20261109_231221_935_58b0ccff.mp4' },
    { id: 'g-dubai', category_id: 'cat-anim', name: 'Dubay sovgʻasi', icon_key: 'crown', price_coins: 2500000, is_animated: 1, tier: 'luxury', video_url: '/assets/aistudio/VID_20261109_231025_775_de245d3c.mp4' },
    { id: 'g-lion', category_id: 'cat-anim', name: 'Sher', icon_key: 'shield', price_coins: 4000000, is_animated: 1, tier: 'luxury', video_url: '/assets/aistudio/VID_20261107_101711_889_5ea3080b.mp4' },
    { id: 'g-dragon', category_id: 'cat-anim', name: 'Ajdar', icon_key: 'flame', price_coins: 1200000, is_animated: 1, tier: 'luxury', video_url: '/assets/aistudio/VID_20261110_013047_655_d7c30818.mp4' },
    { id: 'g-pk-boost', category_id: 'cat-pk', name: 'PK Qalqoni (+500)', icon_key: 'shield', price_coins: 500, is_animated: 1, tier: 'premium', video_url: '' },
  ];
  const insertGift = db.prepare(`
    INSERT INTO gifts (id, category_id, name, icon_key, price_coins, is_animated, tier, is_active, video_url)
    VALUES (@id, @category_id, @name, @icon_key, @price_coins, @is_animated, @tier, 1, @video_url)
  `);
  for (const g of gifts) insertGift.run(g);

  // VIP & SVIP Plans
  const vipPlans = [
    {
      id: 'vip-1',
      tier_type: 'vip',
      level: 1,
      name: 'VIP 1 · Kumush Nur',
      price_coins: 1200,
      duration_days: 30,
      frame_style: 'vip-sapphire',
      benefits: ['Moviy profil ramkasi', 'Xonaga kirish belgisi', '+10% kunlik sovg‘a tajribasi'],
    },
    {
      id: 'vip-3',
      tier_type: 'vip',
      level: 3,
      name: 'VIP 3 · Ametist Ziyo',
      price_coins: 3500,
      duration_days: 30,
      frame_style: 'vip-amethyst',
      benefits: ['Ametist profil ramkasi', 'Shaxsiy xonada ustuvor o‘rin', 'Maxsus chat rangi va stikerlar'],
    },
    {
      id: 'vip-5',
      tier_type: 'vip',
      level: 5,
      name: 'VIP 5 · Turon Olmos',
      price_coins: 7500,
      duration_days: 30,
      frame_style: 'vip-gold',
      benefits: ['Oltin VIP nishoni', 'Barcha yopiq tadbirlarga taklif', 'Xonada maxsus kirish effekti'],
    },
    {
      id: 'svip-2',
      tier_type: 'svip',
      level: 2,
      name: 'SVIP 2 · Samarqand Oltini',
      price_coins: 15000,
      duration_days: 30,
      frame_style: 'svip-gold',
      benefits: ['Oltin SVIP toji', 'Xonaga animatsiyali kirish effekti', 'Shaxsiy qo‘llab-quvvatlash xizmati', 'Maksimal maxfiylik nazorati'],
    },
    {
      id: 'svip-5',
      tier_type: 'svip',
      level: 5,
      name: 'SVIP 5 · Imperator Turon',
      price_coins: 35000,
      duration_days: 30,
      frame_style: 'svip-sovereign',
      benefits: ['Eksklyuziv SVIP Sovereign ramkasi', 'Butun xona uchun oltin aurora effekti', 'Reytingda maxsus ajratib ko‘rsatish', 'Cheksiz xona fon mavzulari'],
    },
  ];
  const insertPlan = db.prepare(`
    INSERT INTO vip_plans (id, tier_type, level, name, price_coins, duration_days, frame_style, benefits_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of vipPlans) {
    insertPlan.run(p.id, p.tier_type, p.level, p.name, p.price_coins, p.duration_days, p.frame_style, JSON.stringify(p.benefits));
  }

  // Voice Rooms
  const rooms = [
    {
      id: 'room-toshkent-kechasi',
      title: 'Toshkent Oqshomi · Jonli Akustika',
      description: "Jonli musiqa, she'riyat va samimiy kechki suhbatlar xonasi.",
      cover_url: '/src/assets/images/turon_hero_banner_1794822313365.jpg',
      category: 'Musiqa',
      owner_id: 'u-founder',
      max_seats: 12,
      is_private: 0,
      background_theme: 'gold',
      visual_effect: 'aurora',
      is_featured: 1,
      viewer_count: 148,
    },
    {
      id: 'room-samarqand-terrasa',
      title: 'Samarqand Terrasasi · Tanishuv va Suhbat',
      description: "Yangi do'stlar orttirish, sayohat va madaniyat haqida erkin muloqot.",
      cover_url: '/src/assets/images/room_cover_lounge_1794822314263.jpg',
      category: 'Suhbat',
      owner_id: 'u-agencyhead',
      max_seats: 8,
      is_private: 0,
      background_theme: 'amethyst',
      visual_effect: 'stars',
      is_featured: 1,
      viewer_count: 94,
    },
    {
      id: 'room-vokal-studiya',
      title: 'Turon Vokal Studiyasi · Mikrofon Ochiq',
      description: "Qo'shiq kuylash, ovoz mashqlari va musiqiy tanlovlar.",
      cover_url: '/src/assets/images/room_cover_music_1794822313674.jpg',
      category: 'Musiqa',
      owner_id: 'u-superadmin',
      max_seats: 16,
      is_private: 0,
      background_theme: 'sapphire',
      visual_effect: 'waves',
      is_featured: 0,
      viewer_count: 76,
    },
    {
      id: 'room-it-podkast',
      title: 'Texnologiya va Startaplar Podkasti',
      description: "Dasturlash, dizayn va zamonaviy kasblar bo'yicha savol-javob.",
      cover_url: '/src/assets/images/room_cover_talk_1794822313757.jpg',
      category: 'Podkast',
      owner_id: 'u-pkadmin',
      max_seats: 20,
      is_private: 0,
      background_theme: 'obsidian',
      visual_effect: 'aurora',
      is_featured: 0,
      viewer_count: 63,
    },
  ];

  const insertRoom = db.prepare(`
    INSERT INTO rooms (
      id, title, description, cover_url, category, owner_id, max_seats,
      is_private, password_hash, background_theme, visual_effect, is_featured, is_active, viewer_count
    ) VALUES (
      @id, @title, @description, @cover_url, @category, @owner_id, @max_seats,
      @is_private, NULL, @background_theme, @visual_effect, @is_featured, 1, @viewer_count
    )
  `);
  const insertSeat = db.prepare(`
    INSERT INTO room_seats (room_id, seat_number, user_id, is_muted, is_locked)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const r of rooms) {
    insertRoom.run(r);
    for (let s = 1; s <= 20; s++) {
      let occupant: string | null = null;
      if (s === 1) occupant = r.owner_id;
      if (r.id === 'room-toshkent-kechasi' && s === 2) occupant = 'u-superadmin';
      if (r.id === 'room-toshkent-kechasi' && s === 3) occupant = 'u-user1';
      if (r.id === 'room-samarqand-terrasa' && s === 2) occupant = 'u-mod';
      insertSeat.run(r.id, s, occupant, 0, 0);
    }
  }

  // Room Moderators & Initial Chat
  db.prepare(`INSERT INTO room_moderators (room_id, user_id, assigned_by) VALUES (?, ?, ?)`).run('room-toshkent-kechasi', 'u-superadmin', 'u-founder');
  db.prepare(`INSERT INTO room_messages (id, room_id, sender_id, content, msg_type) VALUES (?, ?, ?, ?, ?)`).run(
    'rm-1',
    'room-toshkent-kechasi',
    'u-founder',
    "Assalomu alaykum! TURON CHAT kechki jonli suhbat xonasiga xush kelibsiz.",
    'text'
  );
  db.prepare(`INSERT INTO room_messages (id, room_id, sender_id, content, msg_type) VALUES (?, ?, ?, ?, ?)`).run(
    'rm-2',
    'room-toshkent-kechasi',
    'u-superadmin',
    "Mikrofon o'rinlari ochiq — navbat bilan suhbatga qo'shilishingiz mumkin.",
    'text'
  );

  // Active Friendly PK Battle
  const pkEnd = new Date(Date.now() + 18 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO pk_battles (id, title, room_a_id, room_b_id, score_a, score_b, duration_seconds, starts_at, ends_at, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'pk-toshkent-samarqand',
    "Toshkent vs Samarqand · Do'stona Musiqiy PK",
    'room-toshkent-kechasi',
    'room-samarqand-terrasa',
    12450,
    10800,
    1200,
    new Date().toISOString(),
    pkEnd,
    'active',
    'u-pkadmin'
  );

  // Friendships & Follows
  db.prepare(`INSERT INTO friendships (id, requester_id, addressee_id, status) VALUES (?, ?, ?, ?)`).run('fr-1', 'u-founder', 'u-superadmin', 'accepted');
  db.prepare(`INSERT INTO friendships (id, requester_id, addressee_id, status) VALUES (?, ?, ?, ?)`).run('fr-2', 'u-agencyhead', 'u-founder', 'accepted');
  db.prepare(`INSERT INTO friendships (id, requester_id, addressee_id, status) VALUES (?, ?, ?, ?)`).run('fr-3', 'u-user1', 'u-founder', 'pending');

  db.prepare(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`).run('u-user1', 'u-founder');
  db.prepare(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`).run('u-superadmin', 'u-founder');
  db.prepare(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`).run('u-founder', 'u-superadmin');

  // Private messages
  db.prepare(`INSERT INTO private_messages (id, sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, ?, ?)`).run(
    'pm-1',
    'u-superadmin',
    'u-founder',
    "Bugungi kechki jonli efir uchun yangi sovg'alar to'plami tayyor.",
    0
  );
  db.prepare(`INSERT INTO private_messages (id, sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, ?, ?)`).run(
    'pm-2',
    'u-agencyhead',
    'u-founder',
    "Samarqand Yulduzlari jamoasi PK musobaqaga tayyor!",
    1
  );

  // Sample Gift Transactions & Wallet Transactions
  db.prepare(`
    INSERT INTO gift_transactions (id, sender_id, receiver_id, room_id, gift_id, quantity, total_coins)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('gt-1', 'u-superadmin', 'u-founder', 'room-toshkent-kechasi', 'g-crown', 2, 1998);
  db.prepare(`
    INSERT INTO gift_transactions (id, sender_id, receiver_id, room_id, gift_id, quantity, total_coins)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('gt-2', 'u-founder', 'u-agencyhead', 'room-samarqand-terrasa', 'g-falcon', 1, 2500);

  db.prepare(`
    INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('wt-1', 'u-founder', 'topup', 50000, 625000, 'Payme', 'confirmed', 'TRN-2026-88412', '50,000 Tanga to‘plami');

  // Notifications
  db.prepare(`
    INSERT INTO notifications (id, user_id, notif_type, title, body, action_url, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'n-1',
    'u-founder',
    'friend_request',
    "Yangi do'stlik so'rovi",
    "Azizbek Toshkent (TC-10005) sizga do'stlik so'rovi yubordi.",
    'messages',
    0
  );
  db.prepare(`
    INSERT INTO notifications (id, user_id, notif_type, title, body, action_url, is_read)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'n-2',
    'u-founder',
    'system',
    'TURON CHAT tizim e’loni',
    'Do‘stona PK Arena va yangi SVIP profillar muvaffaqiyatli ishga tushirildi.',
    'pk',
    0
  );

  // Sample Report & Audit Log
  db.prepare(`
    INSERT INTO reports (id, reporter_id, target_type, target_id, reason, details, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'rep-1',
    'u-user1',
    'room',
    'room-it-podkast',
    'Spam xabarlar',
    "Chatda reklama havolalari ko'payib ketdi.",
    'open'
  );

  db.prepare(`
    INSERT INTO admin_audit_logs (id, actor_id, actor_role, action, target_type, target_id, details)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'log-1',
    'u-founder',
    'founder',
    'TASDIQLASH_AGENTLIK',
    'agency',
    'ag-samarqand',
    'Samarqand Yulduzlari agentligi rasmiy tasdiqlandi'
  );
}

export function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
