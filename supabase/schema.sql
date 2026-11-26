-- ============================================================================
-- TURON CHAT — SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Apply this script in your Supabase SQL Editor when connecting a live
-- Supabase project (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROLE ENUM & HELPER FUNCTIONS
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'founder',
    'super_admin',
    'admin',
    'moderator',
    'pk_admin',
    'agency_head',
    'agent',
    'user'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. PROFILES (Linked 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  gender TEXT DEFAULT 'unspecified' CHECK (gender IN ('male', 'female', 'unspecified')),
  country TEXT DEFAULT 'O''zbekiston',
  bio TEXT DEFAULT '',
  online_status TEXT DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'in_room')),
  role public.app_role NOT NULL DEFAULT 'user',
  vip_level INTEGER NOT NULL DEFAULT 0 CHECK (vip_level BETWEEN 0 AND 5),
  svip_level INTEGER NOT NULL DEFAULT 0 CHECK (svip_level BETWEEN 0 AND 5),
  vip_expires_at TIMESTAMPTZ,
  frame_style TEXT DEFAULT 'none',
  coin_balance BIGINT NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
  total_gifted BIGINT NOT NULL DEFAULT 0,
  total_received BIGINT NOT NULL DEFAULT 0,
  agency_id UUID,
  is_muted_until TIMESTAMPTZ,
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  privacy_dm TEXT NOT NULL DEFAULT 'everyone' CHECK (privacy_dm IN ('everyone', 'friends', 'nobody')),
  privacy_show_online BOOLEAN NOT NULL DEFAULT TRUE,
  notify_messages BOOLEAN NOT NULL DEFAULT TRUE,
  notify_gifts BOOLEAN NOT NULL DEFAULT TRUE,
  notify_rooms BOOLEAN NOT NULL DEFAULT TRUE,
  language TEXT NOT NULL DEFAULT 'uz',
  birth_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SOCIAL GRAPH (Follows, Friendships, Blocks)
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- 4. VOICE ROOMS, SEATS, MODERATORS & CHAT
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Suhbat',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_seats INTEGER NOT NULL DEFAULT 8 CHECK (max_seats BETWEEN 2 AND 20),
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  password_hash TEXT,
  background_theme TEXT NOT NULL DEFAULT 'sapphire',
  visual_effect TEXT NOT NULL DEFAULT 'aurora',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_seats (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL CHECK (seat_number BETWEEN 1 AND 20),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, seat_number)
);

CREATE TABLE IF NOT EXISTS public.room_moderators (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.room_bans (
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES public.profiles(id),
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  msg_type TEXT NOT NULL DEFAULT 'text' CHECK (msg_type IN ('text', 'system', 'gift')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PRIVATE MESSAGES
CREATE TABLE IF NOT EXISTS public.private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'file')),
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. GIFTS & GIFT CATEGORIES
CREATE TABLE IF NOT EXISTS public.gift_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.gift_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  price_coins INTEGER NOT NULL CHECK (price_coins > 0),
  is_animated BOOLEAN NOT NULL DEFAULT FALSE,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'premium', 'luxury')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  gift_id UUID NOT NULL REFERENCES public.gifts(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_coins BIGINT NOT NULL CHECK (total_coins > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WALLET & VIP/SVIP
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('topup', 'gift_sent', 'gift_received', 'vip_purchase', 'refund', 'admin_adjust')),
  amount_coins BIGINT NOT NULL,
  price_uzs BIGINT DEFAULT 0,
  provider TEXT DEFAULT 'internal',
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  receipt_code TEXT UNIQUE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.vip_plans (
  id TEXT PRIMARY KEY,
  tier_type TEXT NOT NULL CHECK (tier_type IN ('vip', 'svip')),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  price_coins BIGINT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  frame_style TEXT NOT NULL,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.vip_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.vip_plans(id),
  price_coins BIGINT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PK COMPETITIONS (FRIENDLY, NO WAGERING)
CREATE TABLE IF NOT EXISTS public.pk_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  room_a_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_b_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  score_a BIGINT NOT NULL DEFAULT 0,
  score_b BIGINT NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 300,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'cancelled')),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

-- 9. AGENCIES
CREATE TABLE IF NOT EXISTS public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  head_user_id UUID NOT NULL REFERENCES public.profiles(id),
  total_volume BIGINT NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agency_members (
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL DEFAULT 'agent' CHECK (member_role IN ('head', 'agent', 'host')),
  monthly_score BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (agency_id, user_id)
);

-- 10. NOTIFICATIONS, REPORTS & ADMIN AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notif_type TEXT NOT NULL CHECK (notif_type IN ('friend_request', 'message', 'room_invite', 'gift', 'membership', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'room', 'message')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_note TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  actor_role public.app_role NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS & POLICIES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin', 'admin', 'moderator')
      AND is_suspended = FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_high_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('founder', 'super_admin')
      AND is_suspended = FALSE
  );
$$;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pk_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND coin_balance = (SELECT coin_balance FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_admin_manage" ON public.profiles
  FOR UPDATE USING (public.is_high_admin() OR (public.current_user_role() = 'admin'))
  WITH CHECK (
    CASE
      WHEN role IN ('founder', 'super_admin') THEN public.current_user_role() = 'founder'
      ELSE public.is_high_admin() OR public.current_user_role() = 'admin'
    END
  );

-- PRIVATE MESSAGES RLS (Only sender/receiver, respecting blocks)
CREATE POLICY "dm_select_participants" ON public.private_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "dm_insert_not_blocked" ON public.private_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks
      WHERE (blocker_id = receiver_id AND blocked_id = auth.uid())
         OR (blocker_id = auth.uid() AND blocked_id = receiver_id)
    )
  );

-- ROOMS & SEATS RLS
CREATE POLICY "rooms_select_all" ON public.rooms
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "rooms_insert_auth" ON public.rooms
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "rooms_update_owner_or_admin" ON public.rooms
  FOR UPDATE USING (auth.uid() = owner_id OR public.is_staff());

CREATE POLICY "room_seats_select" ON public.room_seats
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "room_messages_select" ON public.room_messages
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND NOT EXISTS (
      SELECT 1 FROM public.room_bans WHERE room_id = room_messages.room_id AND user_id = auth.uid()
    )
  );

-- WALLET & VIP RLS
CREATE POLICY "wallet_select_owner_or_high_admin" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.is_high_admin());

CREATE POLICY "vip_purchases_select_owner" ON public.vip_purchases
  FOR SELECT USING (auth.uid() = user_id OR public.is_high_admin());

-- NOTIFICATIONS RLS
CREATE POLICY "notifications_owner" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- REPORTS & AUDIT LOGS RLS
CREATE POLICY "reports_insert_any_auth" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_select_staff_or_reporter" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.is_staff());

CREATE POLICY "reports_update_staff" ON public.reports
  FOR UPDATE USING (public.is_staff());

CREATE POLICY "audit_logs_select_staff" ON public.admin_audit_logs
  FOR SELECT USING (public.is_staff());
