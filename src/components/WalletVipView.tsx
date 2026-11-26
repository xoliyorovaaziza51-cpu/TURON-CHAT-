import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Crown,
  Gift,
  Receipt,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { apiFetch, formatCoins, formatUzDate, formatUzs } from '../lib/api';
import { renderGiftIcon } from './GiftShopModal';
import type {
  GiftTransaction,
  UserProfile,
  VipPlan,
  VipPurchase,
  WalletTransaction,
} from '../types/turon';

interface WalletVipViewProps {
  currentUser: UserProfile;
  initialSubTab?: 'wallet' | 'vip' | 'gifts';
  onUserUpdated: (user: UserProfile) => void;
}

const COIN_PACKAGES = [
  {
    id: 'pkg-bonus',
    coins: 3200000,
    bonusCoins: 450000,
    priceUsd: 0.25,
    priceUzs: 3200,
    label: 'Boshlang‘ich',
  },
  {
    id: 'pkg-1',
    coins: 15700000,
    bonusCoins: 0,
    priceUsd: 1,
    priceUzs: 12800,
    label: '$1 To‘plam',
  },
  {
    id: 'pkg-10',
    coins: 78800000,
    bonusCoins: 0,
    priceUsd: 10,
    priceUzs: 128000,
    label: '$10 To‘plam',
  },
  {
    id: 'pkg-50',
    coins: 236000000,
    bonusCoins: 0,
    priceUsd: 50,
    priceUzs: 640000,
    label: '$50 To‘plam',
  },
  {
    id: 'pkg-100',
    coins: 315000000,
    bonusCoins: 0,
    priceUsd: 100,
    priceUzs: 1280000,
    label: '$100 Elita',
  },
];

export const WalletVipView: React.FC<WalletVipViewProps> = ({
  currentUser,
  initialSubTab = 'wallet',
  onUserUpdated,
}) => {
  const [subTab, setSubTab] = useState<'wallet' | 'vip' | 'gifts'>(initialSubTab);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [providerConfigured, setProviderConfigured] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState(COIN_PACKAGES[1]);
  const [provider, setProvider] = useState<'Payme' | 'Click' | 'Uzcard'>('Payme');
  const [checkoutMsg, setCheckoutMsg] = useState('');
  const [showRefundInfo, setShowRefundInfo] = useState(false);

  const [vipPlans, setVipPlans] = useState<VipPlan[]>([]);
  const [vipPurchases, setVipPurchases] = useState<VipPurchase[]>([]);
  const [giftHistory, setGiftHistory] = useState<GiftTransaction[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  async function loadAll() {
    try {
      const [wRes, vRes, gRes] = await Promise.all([
        apiFetch<{ transactions: WalletTransaction[]; paymentProviderConfigured: boolean }>(
          '/api/wallet'
        ),
        apiFetch<{ plans: VipPlan[]; purchases: VipPurchase[] }>('/api/vip/plans'),
        apiFetch<{ history: GiftTransaction[] }>('/api/gifts/history'),
      ]);
      setTransactions(wRes.transactions);
      setProviderConfigured(wRes.paymentProviderConfigured);
      setVipPlans(vRes.plans);
      setVipPurchases(vRes.purchases);
      setGiftHistory(gRes.history);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleTopup() {
    setError('');
    setCheckoutMsg('');
    try {
      const res = await apiFetch<{
        user: UserProfile;
        receiptCode: string;
        message: string;
      }>('/api/wallet/topup', {
        method: 'POST',
        body: JSON.stringify({
          coins: selectedPkg.coins,
          bonusCoins: selectedPkg.bonusCoins,
          priceUzs: selectedPkg.priceUzs,
          provider,
        }),
      });
      onUserUpdated(res.user);
      setCheckoutMsg(`${res.message} Kvitansiya: ${res.receiptCode}`);
      loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleBuyVip(planId: string) {
    setError('');
    setCheckoutMsg('');
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/vip/purchase', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      onUserUpdated(res.user);
      setCheckoutMsg('VIP / SVIP maqomi muvaffaqiyatli faollashtirildi.');
      loadAll();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-10">
      {/* Header Summary */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0F1524] via-[#131C33] to-[#1A1330] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="text-xs text-slate-400">Shaxsiy hamyon va maqom</div>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="font-mono tabular-nums text-3xl font-bold text-[#E5B84B]">
              {formatCoins(currentUser.coinBalance)}
            </span>
            <span className="text-sm text-slate-300">Tanga</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            {currentUser.svipLevel > 0
              ? `SVIP ${currentUser.svipLevel} · Amal qilish muddati: ${formatUzDate(
                  currentUser.vipExpiresAt
                )}`
              : currentUser.vipLevel > 0
              ? `VIP ${currentUser.vipLevel} · Amal qilish muddati: ${formatUzDate(
                  currentUser.vipExpiresAt
                )}`
              : 'Oddiy a’zo · VIP yoki SVIP darajalarini faollashtiring'}
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#080B14] border border-white/[0.08] rounded-xl self-start sm:self-center">
          <button
            type="button"
            onClick={() => setSubTab('wallet')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              subTab === 'wallet' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hamyon
          </button>
          <button
            type="button"
            onClick={() => setSubTab('vip')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              subTab === 'vip' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            VIP / SVIP
          </button>
          <button
            type="button"
            onClick={() => setSubTab('gifts')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              subTab === 'gifts' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sovg‘alar tarixi
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}
      {checkoutMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{checkoutMsg}</span>
        </div>
      )}

      {subTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coin Packages */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white">Virtual Tanga to‘plamlari</h3>
              <button
                type="button"
                onClick={() => setShowRefundInfo((v) => !v)}
                className="text-xs text-blue-400 hover:underline flex items-center gap-1"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Qaytarish shartlari</span>
              </button>
            </div>

            {showRefundInfo && (
              <div className="p-4 rounded-xl bg-[#0F1524] border border-blue-500/30 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-white">Shaffof to‘lov va qaytarish siyosati:</p>
                <p>
                  TURON CHAT tangalari faqat virtual sovg‘alar va VIP/SVIP obunalar uchun mo‘ljallangan. Qimor, garov yoki pul mukofotlari taqiqlanadi. Ishlatilmagan tangalar xariddan keyin 14 kun ichida texnik yordam orqali qaytarilishi mumkin.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {COIN_PACKAGES.map((pkg, idx) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPkg(pkg)}
                  className={`p-4 rounded-2xl border text-left transition-colors ${
                    idx === COIN_PACKAGES.length - 1 ? 'sm:col-span-2' : ''
                  } ${
                    selectedPkg.id === pkg.id
                      ? 'bg-blue-600/15 border-[#E5B84B]'
                      : 'bg-[#0F1524] border-white/[0.07] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{pkg.label}</span>
                    {pkg.bonusCoins > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[11px] font-bold text-emerald-300 font-mono">
                        +{formatCoins(pkg.bonusCoins)} Bonus
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-[#E5B84B]/15 border border-[#E5B84B]/35 text-[11px] font-bold text-[#F5C451] font-mono">
                        ${pkg.priceUsd}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 font-mono tabular-nums text-lg sm:text-xl font-bold text-white">
                    <Coins className="w-5 h-5 text-[#E5B84B] shrink-0" />
                    <span>{formatCoins(pkg.coins)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs sm:text-sm font-mono tabular-nums text-[#E5B84B]">
                    <span>
                      ${pkg.priceUsd} · {formatUzs(pkg.priceUzs)}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">To‘lov usuli</span>
                <div className="flex items-center gap-2">
                  {(['Payme', 'Click', 'Uzcard'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                        provider === p
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-[#080B14] border-white/10 text-slate-400'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">
                    Jami ({formatCoins(selectedPkg.coins)}
                    {selectedPkg.bonusCoins > 0 ? ` + ${formatCoins(selectedPkg.bonusCoins)} bonus` : ''} Tanga)
                  </div>
                  <div className="text-lg font-mono tabular-nums font-bold text-white">
                    ${selectedPkg.priceUsd} · {formatUzs(selectedPkg.priceUzs)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTopup}
                  className="min-h-[44px] px-5 rounded-xl bg-[#E5B84B] hover:bg-[#f0c55d] text-[#080B14] font-semibold text-sm shrink-0"
                >
                  Tangalarni qo‘shish
                </button>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="font-display text-lg font-semibold text-white">Tranzaksiyalar va kvitansiyalar</h3>
            <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06] max-h-[460px] overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Hozircha tranzaksiyalar yo‘q.</div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{tx.note}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {tx.receiptCode} · {tx.provider} ·{' '}
                        {tx.status === 'confirmed'
                          ? 'Tasdiqlangan'
                          : tx.status === 'pending'
                          ? 'Kutilmoqda'
                          : 'Bekor'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-mono tabular-nums font-semibold ${
                          tx.amountCoins >= 0 ? 'text-emerald-400' : 'text-slate-200'
                        }`}
                      >
                        {tx.amountCoins >= 0 ? '+' : ''}
                        {formatCoins(tx.amountCoins)}
                      </div>
                      <div className="text-[11px] text-slate-500">{formatUzDate(tx.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'vip' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {vipPlans.map((plan) => {
              const isSvip = plan.tierType === 'svip';
              return (
                <div
                  key={plan.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${
                    isSvip
                      ? 'bg-gradient-to-b from-[#1E1710] to-[#0F1524] border-[#E5B84B]/40'
                      : 'bg-[#0F1524] border-white/[0.08]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isSvip ? 'text-[#E5B84B]' : 'text-purple-300'
                        }`}
                      >
                        {isSvip ? 'SVIP DARAJA' : 'VIP DARAJA'} · {plan.durationDays} kun
                      </span>
                      {isSvip ? (
                        <Crown className="w-5 h-5 text-[#E5B84B]" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <h4 className="font-display text-xl font-bold text-white mt-2">{plan.name}</h4>
                    <div className="mt-3 font-mono tabular-nums text-2xl font-bold text-[#E5B84B]">
                      {formatCoins(plan.priceCoins)} <span className="text-xs font-sans text-slate-400">Tanga</span>
                    </div>

                    <ul className="mt-4 space-y-2 text-xs text-slate-300">
                      {plan.benefits.map((b, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyVip(plan.id)}
                    className={`w-full min-h-[44px] rounded-xl font-semibold text-sm transition-colors ${
                      isSvip
                        ? 'bg-[#E5B84B] hover:bg-[#f0c55d] text-[#080B14]'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    Faollashtirish
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl p-5 space-y-3">
            <h4 className="font-display text-base font-semibold text-white">Obuna xaridlari tarixi</h4>
            {vipPurchases.length === 0 ? (
              <p className="text-xs text-slate-400">Hali VIP yoki SVIP xarid qilinmagan.</p>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {vipPurchases.map((vp) => (
                  <div key={vp.id} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium text-white">{vp.planName}</div>
                      <div className="text-xs text-slate-400">
                        {formatUzDate(vp.startsAt)} — {formatUzDate(vp.expiresAt)}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums text-[#E5B84B]">
                      {formatCoins(vp.priceCoins)} Tanga
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'gifts' && (
        <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
          {giftHistory.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              Sovg‘a almashinuvi tarixi bo‘sh.
            </div>
          ) : (
            giftHistory.map((g) => {
              const isSender = g.senderId === currentUser.id;
              return (
                <div key={g.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-[#E5B84B] flex items-center justify-center shrink-0">
                      {renderGiftIcon(g.giftIcon, 'w-5 h-5')}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {isSender
                          ? `${g.receiverNickname} ga ${g.quantity}× ${g.giftName}`
                          : `${g.senderNickname} dan ${g.quantity}× ${g.giftName}`}
                      </div>
                      <div className="text-xs text-slate-400">{formatUzDate(g.createdAt)}</div>
                    </div>
                  </div>
                  <div
                    className={`font-mono tabular-nums text-sm font-semibold shrink-0 ${
                      isSender ? 'text-slate-300' : 'text-[#E5B84B]'
                    }`}
                  >
                    {isSender ? '-' : '+'}
                    {formatCoins(g.totalCoins)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
