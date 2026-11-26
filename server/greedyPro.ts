import type Database from 'better-sqlite3';

export interface GreedySlotDef {
  id: number;
  key: 'pomidor' | 'karam' | 'baliq' | 'sabzi' | 'hotdog' | 'krevetka' | 'tovuq' | 'steyk';
  label: string;
  multiplier: number;
  group: 'salad' | 'pizza';
  weight: number;
}

export const GREEDY_SLOTS: GreedySlotDef[] = [
  { id: 0, key: 'pomidor', label: 'Pomidor', multiplier: 5, group: 'salad', weight: 18 },
  { id: 1, key: 'karam', label: 'Karam', multiplier: 5, group: 'salad', weight: 18 },
  { id: 2, key: 'baliq', label: 'Baliq', multiplier: 5, group: 'salad', weight: 18 },
  { id: 3, key: 'sabzi', label: 'Sabzi', multiplier: 5, group: 'salad', weight: 18 },
  { id: 4, key: 'hotdog', label: 'Hot-dog', multiplier: 10, group: 'pizza', weight: 11 },
  { id: 5, key: 'krevetka', label: 'Krevetka', multiplier: 15, group: 'pizza', weight: 8 },
  { id: 6, key: 'tovuq', label: 'Tovuq', multiplier: 25, group: 'pizza', weight: 5 },
  { id: 7, key: 'steyk', label: 'Steyk', multiplier: 45, group: 'pizza', weight: 4 },
];

export const GREEDY_CHIPS = [
  5_000,
  50_000,
  200_000,
  1_000_000,
  5_000_000,
  10_000_000,
] as const;

export const GREEDY_MAX_ROUND_BET = 35_000_000;
export const BETTING_DURATION_MS = 35_000;
export const SPINNING_DURATION_MS = 10_000;
export const RESULT_DURATION_MS = 5_000;
const INITIAL_JACKPOT_POOL = 21_221_382;

interface GreedyDeps {
  db: Database.Database;
  broadcastAll: (event: string, payload: unknown) => void;
  sendToUser: (userId: string, event: string, payload: unknown) => void;
  generateId: (prefix: string) => string;
  mapUserRow: (row: any, viewerId?: string) => any;
}

function pickWeightedSlot(): number {
  const totalWeight = GREEDY_SLOTS.reduce((s, slot) => s + slot.weight, 0);
  let r = Math.random() * totalWeight;
  for (const slot of GREEDY_SLOTS) {
    r -= slot.weight;
    if (r <= 0) return slot.id;
  }
  return 0;
}

export function createGreedyProEngine(deps: GreedyDeps) {
  const { db, broadcastAll, sendToUser, generateId, mapUserRow } = deps;

  function getJackpotPool(): number {
    const row = db
      .prepare("SELECT value FROM greedy_pro_meta WHERE key = 'jackpot_pool'")
      .get() as { value: string } | undefined;
    if (!row) {
      db.prepare("INSERT OR IGNORE INTO greedy_pro_meta (key, value) VALUES ('jackpot_pool', ?)").run(
        String(INITIAL_JACKPOT_POOL)
      );
      return INITIAL_JACKPOT_POOL;
    }
    return Math.max(1_000_000, Number(row.value) || INITIAL_JACKPOT_POOL);
  }

  function setJackpotPool(val: number) {
    db.prepare(
      `INSERT INTO greedy_pro_meta (key, value) VALUES ('jackpot_pool', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(String(Math.max(1_000_000, Math.round(val))));
  }

  function getWinnerOverride(): {
    userId: string;
    nickname: string;
    publicId: string;
    mode: 'once' | 'always';
    slotId: number | null;
    updatedBy: string;
    updatedAt: number;
  } | null {
    const row = db
      .prepare("SELECT value FROM greedy_pro_meta WHERE key = 'winner_override_user'")
      .get() as { value: string } | undefined;
    if (!row?.value) return null;
    try {
      const parsed = JSON.parse(row.value);
      if (parsed && typeof parsed.userId === 'string') return parsed;
      return null;
    } catch {
      return null;
    }
  }

  function setWinnerOverride(
    data: {
      userId: string;
      nickname: string;
      publicId: string;
      mode: 'once' | 'always';
      slotId: number | null;
      updatedBy: string;
      updatedAt: number;
    } | null
  ) {
    if (!data) {
      db.prepare("DELETE FROM greedy_pro_meta WHERE key = 'winner_override_user'").run();
      return;
    }
    db.prepare(
      `INSERT INTO greedy_pro_meta (key, value) VALUES ('winner_override_user', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(JSON.stringify(data));
  }

  function getCurrentRoundRow(): any {
    return db
      .prepare('SELECT * FROM greedy_pro_rounds ORDER BY round_number DESC LIMIT 1')
      .get();
  }

  function createNextRound(): any {
    const now = Date.now();
    const last = getCurrentRoundRow();
    const nextNumber = last ? Number(last.round_number) + 1 : 1;
    const jackpotPool = getJackpotPool();
    const id = generateId('gp');
    const bettingEndsAt = now + BETTING_DURATION_MS;
    const spinningEndsAt = bettingEndsAt + SPINNING_DURATION_MS;
    const resultEndsAt = spinningEndsAt + RESULT_DURATION_MS;

    db.prepare(
      `INSERT INTO greedy_pro_rounds (
        id, round_number, status, started_at, betting_ends_at, spinning_ends_at, result_ends_at,
        winning_slot, jackpot_pool, total_pool, jackpot_won, settled
      ) VALUES (?, ?, 'betting', ?, ?, ?, ?, NULL, ?, 0, 0, 0)`
    ).run(id, nextNumber, now, bettingEndsAt, spinningEndsAt, resultEndsAt, jackpotPool);

    return getCurrentRoundRow();
  }

  function ensureActiveRound(): any {
    const current = getCurrentRoundRow();
    if (!current) {
      return createNextRound();
    }
    return current;
  }

  function getSlotTotals(roundId: string): Record<number, number> {
    const totals: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const rows = db
      .prepare('SELECT slot_id, SUM(amount) as total FROM greedy_pro_bets WHERE round_id = ? GROUP BY slot_id')
      .all(roundId) as Array<{ slot_id: number; total: number }>;
    for (const r of rows) {
      totals[Number(r.slot_id)] = Number(r.total) || 0;
    }
    return totals;
  }

  function getRecentHistory() {
    const rows = db
      .prepare(
        `SELECT id, round_number, winning_slot, result_ends_at
         FROM greedy_pro_rounds
         WHERE settled = 1 AND winning_slot IS NOT NULL
         ORDER BY round_number DESC
         LIMIT 12`
      )
      .all() as Array<{ id: string; round_number: number; winning_slot: number; result_ends_at: number }>;

    return rows.map((r) => {
      const slot = GREEDY_SLOTS[Number(r.winning_slot)] || GREEDY_SLOTS[0];
      return {
        roundId: r.id,
        roundNumber: Number(r.round_number),
        slotId: slot.id,
        slotKey: slot.key,
        label: slot.label,
        multiplier: slot.multiplier,
      };
    });
  }

  function getRoundTopWinners(roundId: string) {
    const rows = db
      .prepare(
        `SELECT b.user_id, SUM(b.payout) as total_payout, SUM(b.amount) as total_bet,
                u.nickname, u.avatar_url, u.vip_level, u.svip_level
         FROM greedy_pro_bets b
         JOIN users u ON u.id = b.user_id
         WHERE b.round_id = ? AND b.payout > 0
         GROUP BY b.user_id
         ORDER BY total_payout DESC
         LIMIT 5`
      )
      .all(roundId) as Array<any>;

    return rows.map((r) => ({
      userId: r.user_id,
      nickname: r.nickname,
      avatarUrl: r.avatar_url,
      vipLevel: Number(r.vip_level || 0),
      svipLevel: Number(r.svip_level || 0),
      payout: Number(r.total_payout || 0),
      betAmount: Number(r.total_bet || 0),
    }));
  }

  function getPublicPayload(round: any) {
    const jackpotPool = getJackpotPool();
    const isReveal = round.status === 'spinning' || round.status === 'result';
    return {
      serverNowMs: Date.now(),
      jackpotPool,
      maxBetPerRound: GREEDY_MAX_ROUND_BET,
      chips: [...GREEDY_CHIPS],
      slots: GREEDY_SLOTS,
      round: {
        id: round.id,
        roundNumber: Number(round.round_number),
        status: round.status as 'betting' | 'spinning' | 'result',
        startedAt: Number(round.started_at),
        bettingEndsAt: Number(round.betting_ends_at),
        spinningEndsAt: Number(round.spinning_ends_at),
        resultEndsAt: Number(round.result_ends_at),
        winningSlot: isReveal && round.winning_slot !== null ? Number(round.winning_slot) : null,
        totalPool: Number(round.total_pool || 0),
        jackpotWon: Number(round.jackpot_won || 0),
      },
      slotTotals: getSlotTotals(round.id),
      history: getRecentHistory(),
      topWinners: round.status === 'result' ? getRoundTopWinners(round.id) : [],
    };
  }

  function getUserState(userId: string) {
    const round = ensureActiveRound();
    const publicState = getPublicPayload(round);

    const userBetRows = db
      .prepare('SELECT slot_id, amount, payout FROM greedy_pro_bets WHERE round_id = ? AND user_id = ?')
      .all(round.id, userId) as Array<{ slot_id: number; amount: number; payout: number }>;

    const userSlotBets: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    let userTotalBet = 0;
    let userRoundPayout = 0;
    for (const r of userBetRows) {
      const amt = Number(r.amount) || 0;
      userSlotBets[Number(r.slot_id)] = amt;
      userTotalBet += amt;
      userRoundPayout += Number(r.payout) || 0;
    }

    const todayRow = db
      .prepare(
        `SELECT COALESCE(SUM(payout), 0) as total_win
         FROM greedy_pro_bets
         WHERE user_id = ? AND payout > 0 AND date(created_at) = date('now')`
      )
      .get(userId) as { total_win: number } | undefined;

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const bonusRow = db
      .prepare('SELECT value FROM greedy_pro_meta WHERE key = ?')
      .get(`bonus:${userId}`) as { value: string } | undefined;
    const lastBonusMs = bonusRow ? Number(bonusRow.value) || 0 : 0;
    const canClaimDailyBonus = Date.now() - lastBonusMs >= 24 * 60 * 60 * 1000;

    return {
      ...publicState,
      userSlotBets,
      userTotalBet,
      userRoundPayout,
      todayWin: Number(todayRow?.total_win || 0),
      canClaimDailyBonus,
      user: userRow ? mapUserRow(userRow, userId) : null,
    };
  }

  function settleRound(round: any) {
    const winSlotId = Number(round.winning_slot ?? 0);
    const slot = GREEDY_SLOTS[winSlotId] || GREEDY_SLOTS[0];
    const currentJackpot = getJackpotPool();

    const affectedUserIds = new Set<string>();
    let totalJackpotBonus = 0;

    db.transaction(() => {
      const freshRound = db
        .prepare('SELECT * FROM greedy_pro_rounds WHERE id = ?')
        .get(round.id) as any;
      if (!freshRound || freshRound.settled) return;

      const winningBets = db
        .prepare('SELECT * FROM greedy_pro_bets WHERE round_id = ? AND slot_id = ?')
        .all(round.id, winSlotId) as Array<any>;

      let jackpotBonusPool = 0;
      if (winSlotId === 7 && winningBets.length > 0 && Math.random() < 0.25) {
        jackpotBonusPool = Math.round(currentJackpot * 0.15);
      }
      const totalWinningStake = winningBets.reduce((s, b) => s + Number(b.amount || 0), 0);

      for (const bet of winningBets) {
        const stake = Number(bet.amount || 0);
        const basePayout = stake * slot.multiplier;
        const jpShare =
          jackpotBonusPool > 0 && totalWinningStake > 0
            ? Math.round((stake / totalWinningStake) * jackpotBonusPool)
            : 0;
        const payout = basePayout + jpShare;
        totalJackpotBonus += jpShare;

        db.prepare('UPDATE greedy_pro_bets SET payout = ? WHERE id = ?').run(payout, bet.id);
        db.prepare('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?').run(
          payout,
          bet.user_id
        );
        db.prepare(
          `INSERT INTO game_history (id, user_id, game_id, game_title, category, delta_points, outcome)
           VALUES (?, ?, 'greedy-pro', 'Greedy Pro', 'omadli', ?, ?)`
        ).run(
          generateId('gm'),
          bet.user_id,
          payout,
          `${slot.label} (×${slot.multiplier}) yutuq: +${payout.toLocaleString()} tanga`
        );
        affectedUserIds.add(bet.user_id);
      }

      if (totalJackpotBonus > 0) {
        setJackpotPool(Math.max(5_000_000, currentJackpot - totalJackpotBonus));
      }

      db.prepare(
        `UPDATE greedy_pro_rounds
         SET status = 'result', settled = 1, jackpot_won = ?
         WHERE id = ?`
      ).run(totalJackpotBonus, round.id);
    })();

    for (const uid of affectedUserIds) {
      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
      if (updatedUser) {
        sendToUser(uid, 'greedy:user_balance', {
          user: mapUserRow(updatedUser, uid),
        });
      }
    }
  }

  function tick() {
    const now = Date.now();
    const current = ensureActiveRound();
    if (!current) return;

    if (current.status === 'betting' && now >= Number(current.betting_ends_at)) {
      let winningSlot = pickWeightedSlot();
      const override = getWinnerOverride();
      if (override) {
        if (
          typeof override.slotId === 'number' &&
          Number.isInteger(override.slotId) &&
          override.slotId >= 0 &&
          override.slotId <= 7
        ) {
          winningSlot = override.slotId;
        } else if (override.userId) {
          const targetBets = db
            .prepare('SELECT slot_id, amount FROM greedy_pro_bets WHERE round_id = ? AND user_id = ?')
            .all(current.id, override.userId) as Array<{ slot_id: number; amount: number }>;
          if (targetBets.length > 0) {
            targetBets.sort((a, b) => {
              const multA = GREEDY_SLOTS[Number(a.slot_id)]?.multiplier || 5;
              const multB = GREEDY_SLOTS[Number(b.slot_id)]?.multiplier || 5;
              return Number(b.amount) * multB - Number(a.amount) * multA;
            });
            winningSlot = Number(targetBets[0].slot_id);
          }
        }
        if (override.mode === 'once') {
          setWinnerOverride(null);
        }
      }
      db.prepare(
        `UPDATE greedy_pro_rounds
         SET status = 'spinning', winning_slot = ?
         WHERE id = ? AND status = 'betting'`
      ).run(winningSlot, current.id);
      const updated = getCurrentRoundRow();
      broadcastAll('greedy:state', getPublicPayload(updated));
      return;
    }

    if (current.status === 'spinning' && now >= Number(current.spinning_ends_at)) {
      settleRound(current);
      const updated = getCurrentRoundRow();
      broadcastAll('greedy:state', getPublicPayload(updated));
      return;
    }

    if (current.status === 'result' && now >= Number(current.result_ends_at)) {
      const next = createNextRound();
      broadcastAll('greedy:state', getPublicPayload(next));
    }
  }

  function placeBet(
    userId: string,
    payload: { slotId?: number; combo?: 'pizza' | 'salad'; amount?: number }
  ) {
    const amount = Number(payload?.amount);
    if (!GREEDY_CHIPS.includes(amount as any)) {
      throw new Error('Noto‘g‘ri tanga chipi tanlandi (5K, 50K, 200K, 1M, 5M, 10M)');
    }

    let targetSlots: number[] = [];
    if (payload?.combo === 'salad') {
      targetSlots = [0, 1, 2, 3];
    } else if (payload?.combo === 'pizza') {
      targetSlots = [4, 5, 6, 7];
    } else if (
      typeof payload?.slotId === 'number' &&
      Number.isInteger(payload.slotId) &&
      payload.slotId >= 0 &&
      payload.slotId <= 7
    ) {
      targetSlots = [payload.slotId];
    } else {
      throw new Error('Ovqat uyasi noto‘g‘ri ko‘rsatildi');
    }

    const totalCost = targetSlots.length * amount;
    const round = ensureActiveRound();
    const now = Date.now();

    if (round.status !== 'betting' || now >= Number(round.betting_ends_at)) {
      throw new Error('Tikish vaqti tugadi! Lotereya boshlanmoqda.');
    }

    db.transaction(() => {
      const freshRound = db
        .prepare('SELECT * FROM greedy_pro_rounds WHERE id = ?')
        .get(round.id) as any;
      if (!freshRound || freshRound.status !== 'betting' || Date.now() >= Number(freshRound.betting_ends_at)) {
        throw new Error('Tikish vaqti tugadi! Keyingi turni kuting.');
      }

      const existingRow = db
        .prepare(
          'SELECT COALESCE(SUM(amount), 0) as total FROM greedy_pro_bets WHERE round_id = ? AND user_id = ?'
        )
        .get(round.id, userId) as { total: number };
      const existingTotal = Number(existingRow?.total || 0);

      if (existingTotal + totalCost > GREEDY_MAX_ROUND_BET) {
        const remainingLimit = Math.max(0, GREEDY_MAX_ROUND_BET - existingTotal);
        throw new Error(
          `Maksimal tikish limiti 35M! Bu turda yana ko‘pi bilan ${remainingLimit.toLocaleString()} tanga tikishingiz mumkin.`
        );
      }

      const freshUser = db.prepare('SELECT coin_balance FROM users WHERE id = ?').get(userId) as
        | { coin_balance: number }
        | undefined;
      if (!freshUser || Number(freshUser.coin_balance) < totalCost) {
        throw new Error('Tangalar yetarli emas! Hisobingizni to‘ldiring.');
      }

      db.prepare('UPDATE users SET coin_balance = coin_balance - ? WHERE id = ?').run(
        totalCost,
        userId
      );

      for (const sId of targetSlots) {
        db.prepare(
          `INSERT INTO greedy_pro_bets (id, round_id, user_id, slot_id, amount, payout)
           VALUES (?, ?, ?, ?, ?, 0)
           ON CONFLICT(round_id, user_id, slot_id) DO UPDATE SET
             amount = amount + excluded.amount`
        ).run(generateId('gb'), round.id, userId, sId, amount);
      }

      const jpContribution = Math.max(100, Math.round(totalCost * 0.02));
      const newJackpot = getJackpotPool() + jpContribution;
      setJackpotPool(newJackpot);

      db.prepare(
        'UPDATE greedy_pro_rounds SET total_pool = total_pool + ?, jackpot_pool = ? WHERE id = ?'
      ).run(totalCost, newJackpot, round.id);
    })();

    const latestRound = getCurrentRoundRow();
    broadcastAll('greedy:state', getPublicPayload(latestRound));
    return getUserState(userId);
  }

  function claimDailyBonus(userId: string) {
    const bonusKey = `bonus:${userId}`;
    const existing = db
      .prepare('SELECT value FROM greedy_pro_meta WHERE key = ?')
      .get(bonusKey) as { value: string } | undefined;
    const lastMs = existing ? Number(existing.value) || 0 : 0;
    const now = Date.now();
    if (now - lastMs < 24 * 60 * 60 * 1000) {
      throw new Error('Kunlik Greedy Pro bonusi allaqachon olingan (har 24 soatda 1 marta)');
    }

    const bonusCoins = 50_000;
    db.transaction(() => {
      db.prepare('UPDATE users SET coin_balance = coin_balance + ? WHERE id = ?').run(
        bonusCoins,
        userId
      );
      db.prepare(
        `INSERT INTO greedy_pro_meta (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).run(bonusKey, String(now));
      db.prepare(
        `INSERT INTO wallet_transactions (id, user_id, tx_type, amount_coins, price_uzs, provider, status, receipt_code, note)
         VALUES (?, ?, 'topup', ?, 0, 'GreedyBonus', 'confirmed', ?, ?)`
      ).run(
        generateId('wt'),
        userId,
        bonusCoins,
        `GPB-${now.toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`,
        'Greedy Pro kunlik o‘yin bonusi (+50,000 Tanga)'
      );
    })();

    return getUserState(userId);
  }

  // Ensure initial round exists and start loop
  ensureActiveRound();
  const timer = setInterval(() => {
    try {
      tick();
    } catch (err) {
      console.error('GreedyPro tick error:', err);
    }
  }, 500);

  return {
    getUserState,
    placeBet,
    claimDailyBonus,
    getWinnerOverride,
    setWinnerOverride,
    stop: () => clearInterval(timer),
  };
}
