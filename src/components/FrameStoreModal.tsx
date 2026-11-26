import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  ChevronLeft,
  Coins,
  CreditCard,
  Heart,
  Lock,
  MessageCircle,
  Mic,
  Play,
  Search,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import {
  FRAME_COLLECTION_LABELS,
  PROFILE_FRAMES_CATALOG,
  type FrameCollectionId,
} from '../lib/framesCatalog';
import { FrameSvg, StorePropPreview, TierCrestBadge } from './FrameArtwork';
import type {
  CpRelationship,
  OwnedFrameRecord,
  StoreCategoryId,
  StoreFrameItem,
  UserProfile,
} from '../types/turon';

interface FrameStoreModalProps {
  currentUser: UserProfile;
  onClose: () => void;
  onUserUpdated: (user: UserProfile) => void;
  onOpenCp?: () => void;
  onOpenWallet?: () => void;
  initialCategory?: StoreCategoryId;
}

const SHOP_CATEGORIES: Array<{
  id: StoreCategoryId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'frames', label: 'Romkalar', icon: Award },
  { id: 'entry', label: 'Kirish effekti', icon: Sparkles },
  { id: 'chat_link', label: 'Chat havolasi', icon: CreditCard },
  { id: 'chat_bubble', label: 'Chat Bubble', icon: MessageCircle },
  { id: 'mic', label: 'Mikrofon', icon: Mic },
];

export const FrameStoreModal: React.FC<FrameStoreModalProps> = ({
  currentUser,
  onClose,
  onUserUpdated,
  onOpenCp,
  onOpenWallet,
  initialCategory = 'frames',
}) => {
  const [items, setItems] = useState<StoreFrameItem[]>([]);
  const [ownedFrames, setOwnedFrames] = useState<OwnedFrameRecord[]>([]);
  const [activeCp, setActiveCp] = useState<CpRelationship | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'shop' | 'love'>('shop');
  const [activeCategory, setActiveCategory] = useState<StoreCategoryId>(initialCategory);
  const [activeCollection, setActiveCollection] = useState<'all' | 'free' | FrameCollectionId>('all');
  const [frameSearch, setFrameSearch] = useState('');
  const [showOwnedOnly, setShowOwnedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Modals
  const [previewItem, setPreviewItem] = useState<StoreFrameItem | null>(null);
  const [giftItem, setGiftItem] = useState<StoreFrameItem | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  async function loadStore() {
    setLoading(true);
    try {
      const [storeRes, cpRes] = await Promise.all([
        apiFetch<{
          items: StoreFrameItem[];
          ownedFrames: OwnedFrameRecord[];
        }>('/api/store/frames'),
        apiFetch<{ activeCp: CpRelationship | null }>('/api/cp').catch(() => ({
          activeCp: null,
        })),
      ]);
      setItems(storeRes.items || []);
      setOwnedFrames(storeRes.ownedFrames || []);
      setActiveCp(cpRes.activeCp || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStore();
  }, []);

  async function openGiftModal(item: StoreFrameItem) {
    const isCpRing = item.category === 'rings' || Boolean(item.cpOnly);
    if (isCpRing && !activeCp) {
      setStatusMsg({
        type: 'err',
        text: 'Uzuklarni faqat faol CP parangizga yuborish mumkin! Avval Sevgi uyida Para tashlang.',
      });
      return;
    }

    setGiftItem(item);
    if (!isCpRing && allUsers.length === 0) {
      try {
        const res = await apiFetch<{ users: UserProfile[] }>('/api/users');
        setAllUsers((res.users || []).filter((u) => u.id !== currentUser.id));
      } catch {
        // ignore
      }
    }
  }

  const ownedMap = useMemo(() => {
    const map = new Map<string, OwnedFrameRecord>();
    for (const o of ownedFrames) {
      if (!map.has(o.frameId)) map.set(o.frameId, o);
    }
    return map;
  }, [ownedFrames]);

  const collectionCounts = useMemo(() => {
    const frameItems = items.filter((it) => it.category === 'frames');
    const counts: Record<string, number> = {
      all: frameItems.length,
      free: frameItems.filter((it) => it.priceCoins === 0).length,
    };
    for (const it of frameItems) {
      if (it.collection) {
        counts[it.collection] = (counts[it.collection] || 0) + 1;
      }
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = frameSearch.trim().toLowerCase();
    return items.filter((it) => {
      if (showOwnedOnly) {
        return ownedMap.has(it.id);
      }
      if (activeMainTab === 'love') {
        return it.category === 'rings';
      }
      if (it.category !== activeCategory) return false;
      if (activeCategory === 'frames') {
        if (activeCollection === 'free' && it.priceCoins !== 0) return false;
        if (
          activeCollection !== 'all' &&
          activeCollection !== 'free' &&
          it.collection !== activeCollection
        ) {
          return false;
        }
        if (
          q &&
          !it.name.toLowerCase().includes(q) &&
          !it.description.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [items, activeMainTab, activeCategory, activeCollection, frameSearch, showOwnedOnly, ownedMap]);

  async function handleBuy(item: StoreFrameItem) {
    const isCpRing = item.category === 'rings' || Boolean(item.cpOnly);
    if (isCpRing && !activeCp) {
      setStatusMsg({
        type: 'err',
        text: 'Sevgi uyi uzuklari faqat faol CP juftliklar uchun! Avval Sevgi uyida Para tashlang.',
      });
      return;
    }

    setBusyId(item.id);
    setStatusMsg(null);
    try {
      const res = await apiFetch<{
        user: UserProfile;
        ownedFrames: OwnedFrameRecord[];
      }>('/api/store/frames/buy', {
        method: 'POST',
        body: JSON.stringify({ frameId: item.id }),
      });
      onUserUpdated(res.user);
      setOwnedFrames(res.ownedFrames || []);
      setStatusMsg({
        type: 'ok',
        text: isCpRing
          ? `"${item.name}" sotib olindi va CP kolleksiyangizga qo‘shildi!`
          : `"${item.name}" (${item.durationDays} kun) sotib olindi va profilga taqildi!`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err.message || 'Sotib olishda xatolik yuz berdi',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleEquip(frameId: string) {
    setBusyId(frameId);
    setStatusMsg(null);
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/store/frames/equip', {
        method: 'POST',
        body: JSON.stringify({ frameId }),
      });
      onUserUpdated(res.user);
      setStatusMsg({
        type: 'ok',
        text: frameId === 'none' ? 'Romka yechildi' : 'Profil romkasi muvaffaqiyatli taqildi!',
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err.message || 'Romkani taqishda xatolik',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleSendGift(recipient: UserProfile) {
    if (!giftItem) return;
    setBusyId(giftItem.id);
    setStatusMsg(null);
    try {
      const res = await apiFetch<{
        user: UserProfile;
        ownedFrames: OwnedFrameRecord[];
        recipientNickname: string;
      }>('/api/store/frames/send', {
        method: 'POST',
        body: JSON.stringify({ frameId: giftItem.id, recipientId: recipient.id }),
      });
      onUserUpdated(res.user);
      setOwnedFrames(res.ownedFrames || []);
      setGiftItem(null);
      setStatusMsg({
        type: 'ok',
        text: `"${giftItem.name}" ${res.recipientNickname} ga muvaffaqiyatli jo‘natildi!`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err.message || 'Jo‘natishda xatolik yuz berdi',
      });
    } finally {
      setBusyId(null);
    }
  }

  const isGiftCpOnly = Boolean(
    giftItem && (giftItem.category === 'rings' || giftItem.cpOnly)
  );

  const filteredRecipients = useMemo(() => {
    if (isGiftCpOnly) {
      return activeCp ? [activeCp.partner] : [];
    }
    const q = userSearch.trim().toLowerCase();
    return allUsers.filter(
      (u) =>
        !q ||
        u.nickname.toLowerCase().includes(q) ||
        u.publicId.toLowerCase().includes(q)
    );
  }, [isGiftCpOnly, activeCp, allUsers, userSearch]);

  return (
    <div className="fixed inset-0 z-50 bg-[#060914]/95 backdrop-blur-md flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="shrink-0 bg-[#080C1B] border-b border-white/[0.08] px-3 sm:px-6">
        <div className="max-w-2xl mx-auto h-14 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-white hover:text-[#F5C451] transition-colors"
            aria-label="Orqaga"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-6 sm:gap-8">
            <button
              type="button"
              onClick={() => {
                setActiveMainTab('shop');
                setShowOwnedOnly(false);
              }}
              className={`relative py-2 font-display text-base sm:text-lg font-extrabold transition-colors ${
                activeMainTab === 'shop' && !showOwnedOnly
                  ? 'text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Do‘kon</span>
              {activeMainTab === 'shop' && !showOwnedOnly && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-7 h-[3px] rounded-full bg-gradient-to-r from-[#FDE047] to-[#22D3EE]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveMainTab('love');
                setShowOwnedOnly(false);
              }}
              className={`relative py-2 font-display text-base sm:text-lg font-extrabold transition-colors flex items-center gap-1.5 ${
                activeMainTab === 'love' && !showOwnedOnly
                  ? 'text-pink-200'
                  : 'text-slate-400 hover:text-pink-300'
              }`}
            >
              <span>Sevgi Do‘koni</span>
              {activeMainTab === 'love' && !showOwnedOnly && (
                <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-9 h-[3px] rounded-full bg-gradient-to-r from-pink-400 to-[#FDE047]" />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowOwnedOnly((v) => !v)}
            className={`min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center border transition-colors ${
              showOwnedOnly
                ? 'bg-[#E5B84B]/20 border-[#E5B84B] text-[#F5C451]'
                : 'border-transparent text-slate-300 hover:text-white'
            }`}
            title="Mening romkalarim"
            aria-label="Mening romkalarim"
          >
            <Lock className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3.5">
        <div className="max-w-2xl mx-auto space-y-4 pb-8">
          {/* Balance Strip + Equipped Frame Quick Bar */}
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#0D1326] border border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FDE047] to-[#D97706] flex items-center justify-center text-[#2B1200] shrink-0">
                <Coins className="w-4 h-4" />
              </span>
              <div>
                <div className="text-[11px] text-slate-400">Balansingiz</div>
                <div className="font-mono tabular-nums text-sm font-extrabold text-[#F5C451]">
                  {formatCoins(currentUser.coinBalance)} Tanga
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentUser.frameStyle && currentUser.frameStyle !== 'none' && (
                <button
                  type="button"
                  onClick={() => handleEquip('none')}
                  className="min-h-[34px] px-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white"
                >
                  Romkani yechish
                </button>
              )}
              {onOpenWallet && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWallet();
                  }}
                  className="min-h-[34px] px-3 rounded-xl bg-blue-600/25 border border-blue-400/40 text-xs font-semibold text-sky-200 hover:bg-blue-600/40"
                >
                  To‘ldirish
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Category Strip for Main Shop */}
          {!showOwnedOnly && activeMainTab === 'shop' && (
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2">
                {SHOP_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      className={`p-2 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        active
                          ? 'bg-[#121C36] border-[#E5B84B] shadow-[0_0_16px_rgba(229,184,75,0.22)] text-white'
                          : 'bg-[#0C1224] border-white/[0.06] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          active
                            ? 'bg-gradient-to-br from-[#FEF08A] to-[#D97706] text-[#281100]'
                            : 'bg-[#151F3A] text-amber-300/80'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-semibold truncate w-full text-center">
                        {cat.id === 'frames'
                          ? `${cat.label} (${collectionCounts.all || PROFILE_FRAMES_CATALOG.length})`
                          : cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeCategory === 'frames' && (
                <div className="space-y-2.5">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={frameSearch}
                      onChange={(e) => setFrameSearch(e.target.value)}
                      placeholder="Ramka nomi bo‘yicha qidirish (66 ta ramka)..."
                      className="w-full min-h-[40px] pl-10 pr-8 bg-[#0C1224] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#E5B84B]/60"
                    />
                    {frameSearch && (
                      <button
                        type="button"
                        onClick={() => setFrameSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        aria-label="Qidiruvni tozalash"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {FRAME_COLLECTION_LABELS.map((col) => {
                      const active = activeCollection === col.id;
                      const count = collectionCounts[col.id] ?? 0;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => setActiveCollection(col.id)}
                          className={`shrink-0 min-h-[32px] px-3 rounded-xl text-[11px] font-bold border transition-colors ${
                            active
                              ? col.id === 'free'
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                : 'bg-[#E5B84B]/20 border-[#E5B84B] text-[#FEF08A]'
                              : 'bg-[#0C1224] border-white/[0.08] text-slate-400 hover:text-white'
                          }`}
                        >
                          {col.label} ({count})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sevgi Do'koni Header & Strict CP-Only Banner */}
          {!showOwnedOnly && activeMainTab === 'love' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-pink-500/20 border border-pink-400/50 text-xs font-bold text-pink-100 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
                    <span>Uzuklar (Sevgi uyi)</span>
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Faqat CP</span>
                  </span>
                </div>
                {onOpenCp && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCp();
                    }}
                    className="min-h-[34px] px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-pink-200"
                  >
                    Sevgi uyi →
                  </button>
                )}
              </div>

              {activeCp ? (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-[#0D1326] border border-pink-400/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={activeCp.partner.avatarUrl}
                      alt={activeCp.partner.nickname}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border-2 border-pink-400 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        Faqat CP parangiz: {activeCp.partner.nickname}
                      </div>
                      <div className="text-[11px] text-pink-200/85">
                        Uzuklar faqat siz va CP juftingiz uchun yuboriladi
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#F5C451] shrink-0">
                    CP LV{activeCp.level}
                  </span>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs text-amber-100">
                    <Lock className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <span>
                      <strong>Faqat CP:</strong> Sevgi uyi uzuklarini sotib olish yoki yuborish uchun
                      avval Sevgi uyida <strong>Para tashlang</strong> (boshqalarga olib berilmaydi).
                    </span>
                  </div>
                  {onOpenCp && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCp();
                      }}
                      className="min-h-[36px] px-3.5 rounded-xl bg-gradient-to-r from-pink-600 to-amber-500 text-white text-xs font-bold shrink-0"
                    >
                      Para tashlash
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {showOwnedOnly && (
            <div className="flex items-center justify-between px-1">
              <h3 className="font-display text-sm font-bold text-[#F5C451]">
                Siz sotib olgan romkalar va uzuklar ({ownedFrames.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowOwnedOnly(false)}
                className="text-xs text-sky-300 hover:underline"
              >
                Barcha do‘kon →
              </button>
            </div>
          )}

          {statusMsg && (
            <div
              className={`px-4 py-3 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                  : 'bg-red-500/15 border-red-400/40 text-red-200'
              }`}
            >
              <span>{statusMsg.text}</span>
              {statusMsg.type === 'err' && activeMainTab === 'love' && !activeCp && onOpenCp && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCp();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-pink-600 text-white text-xs font-bold shrink-0"
                >
                  Sevgi uyi
                </button>
              )}
            </div>
          )}

          {/* 2-Column Store Grid */}
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Do‘kon yuklanmoqda...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 px-4 rounded-2xl bg-[#0D1428] border border-white/[0.07] text-center space-y-3">
              <p className="text-sm text-slate-300">
                {showOwnedOnly
                  ? 'Sizda hozircha sotib olingan faol romka yoki uzuk yo‘q.'
                  : 'Ushbu bo‘limda hozircha mahsulotlar mavjud emas.'}
              </p>
              {showOwnedOnly && (
                <button
                  type="button"
                  onClick={() => setShowOwnedOnly(false)}
                  className="min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-[#FDE047] to-[#22D3EE] text-[#05101F] text-xs font-extrabold"
                >
                  Do‘konni ko‘rish
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const owned = ownedMap.get(item.id);
                const isEquipped = currentUser.frameStyle === item.id;
                const isBusy = busyId === item.id;
                const isCpRing = item.category === 'rings' || Boolean(item.cpOnly);
                const lockedNoCp = isCpRing && !activeCp;
                const isFreeFrame = item.category === 'frames' && item.priceCoins === 0;
                const canEquipFrame = item.category === 'frames' && (Boolean(owned) || isFreeFrame);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl bg-[#11192E] border p-3 flex flex-col justify-between gap-2.5 transition-all ${
                      isEquipped
                        ? 'border-[#22D3EE] shadow-[0_0_18px_rgba(34,211,238,0.22)]'
                        : isCpRing
                        ? 'border-pink-400/30 hover:border-pink-400/60'
                        : 'border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: Tier Crest + CP Lock / Play Preview */}
                    <div className="flex items-center justify-between">
                      <TierCrestBadge tier={item.tier} />
                      <div className="flex items-center gap-1">
                        {isCpRing && (
                          <span className="px-1.5 py-0.5 rounded-md bg-pink-500/20 border border-pink-400/40 text-[10px] font-bold text-pink-200 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Faqat CP</span>
                          </span>
                        )}
                        {isFreeFrame && (
                          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-200">
                            Bepul
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewItem(item)}
                          className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                          title="Jonli ko‘rish"
                          aria-label={`${item.name} ko'rinishi`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                      </div>
                    </div>

                    {/* Center Artwork */}
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="flex flex-col items-center justify-center py-1 group focus:outline-none"
                    >
                      <div className="group-hover:scale-105 transition-transform">
                        <StorePropPreview item={item} sizeClass="w-28 h-28" />
                      </div>
                      <div className="mt-1.5 text-xs font-bold text-slate-100 truncate max-w-full">
                        {item.name}
                      </div>
                      {isCpRing && (
                        <div className="text-[10px] text-slate-400 line-clamp-2 text-center mt-0.5 px-1">
                          {item.description}
                        </div>
                      )}
                    </button>

                    {/* Price + Duration */}
                    <div className="flex items-center justify-center gap-1.5">
                      {isFreeFrame ? (
                        <span className="text-xs font-extrabold text-emerald-300">
                          Bepul · Doimiy
                        </span>
                      ) : (
                        <>
                          <span className="w-4 h-4 rounded-full bg-gradient-to-br from-[#FEF08A] to-[#D97706] flex items-center justify-center text-[9px] font-black text-[#2B1200] shrink-0">
                            ●
                          </span>
                          <span className="font-mono tabular-nums text-xs sm:text-sm font-extrabold text-white">
                            {formatCoins(item.priceCoins)}
                          </span>
                          <span className="text-[11px] text-slate-400 whitespace-nowrap">
                            {isCpRing ? 'Tanga' : `/${item.durationDays} kun`}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Row: Jo'natish + Sotib olish / Taqish */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => openGiftModal(item)}
                        className={`min-h-[38px] px-2 rounded-full text-xs font-bold transition-colors truncate ${
                          lockedNoCp
                            ? 'bg-white/5 text-slate-500 border border-white/10'
                            : 'bg-[#242E49] hover:bg-[#2F3C5E] text-slate-100'
                        }`}
                      >
                        {lockedNoCp ? '🔒 CP' : "Jo'natish"}
                      </button>

                      {canEquipFrame ? (
                        <button
                          type="button"
                          disabled={isBusy || isEquipped}
                          onClick={() => handleEquip(item.id)}
                          className={`min-h-[38px] px-2 rounded-full text-xs font-extrabold transition-all truncate flex items-center justify-center gap-1 ${
                            isEquipped
                              ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200'
                              : 'bg-gradient-to-r from-[#FFF04D] via-[#B4FF5C] to-[#2CF6D2] text-[#05101F] hover:brightness-105'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Taqilgan</span>
                            </>
                          ) : (
                            <span>Taqish</span>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleBuy(item)}
                          className={`min-h-[38px] px-2 rounded-full text-xs font-extrabold transition-all truncate ${
                            lockedNoCp
                              ? 'bg-white/5 text-slate-400 border border-white/10'
                              : 'bg-gradient-to-r from-[#FFF04D] via-[#B4FF5C] to-[#2CF6D2] text-[#05101F] hover:brightness-105'
                          }`}
                        >
                          {isBusy ? '...' : lockedNoCp ? 'CP kerak' : 'Sotib olish'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Live Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-[#10182E] border border-[#E5B84B]/50 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TierCrestBadge tier={previewItem.tier} />
                <h4 className="font-display text-base font-bold text-white">
                  {previewItem.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-300 hover:text-white"
                aria-label="Yopish"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 rounded-2xl bg-gradient-to-b from-[#080E22] to-[#130833] border border-white/10 flex flex-col items-center justify-center gap-3">
              {previewItem.category === 'frames' ? (
                <FrameSvg
                  frameId={previewItem.id}
                  sizeClass="w-36 h-36"
                  avatarUrl={currentUser.avatarUrl}
                />
              ) : (
                <StorePropPreview
                  item={previewItem}
                  avatarUrl={currentUser.avatarUrl}
                  sizeClass="w-36 h-36"
                />
              )}
              <p className="text-xs text-slate-300 text-center px-4 leading-relaxed">
                {previewItem.description}
              </p>
              {(previewItem.category === 'rings' || previewItem.cpOnly) && (
                <span className="px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-400/40 text-[11px] font-semibold text-pink-200">
                  Faqat faol CP parangiz uchun
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 font-mono tabular-nums text-base font-extrabold text-[#F5C451]">
              {previewItem.category === 'frames' && previewItem.priceCoins === 0 ? (
                <span className="text-emerald-300 font-sans">Bepul · Doimiy</span>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>{formatCoins(previewItem.priceCoins)} Tanga</span>
                  {!(previewItem.category === 'rings' || previewItem.cpOnly) && (
                    <span className="text-xs font-sans font-normal text-slate-400">
                      / {previewItem.durationDays} kun
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const target = previewItem;
                  setPreviewItem(null);
                  openGiftModal(target);
                }}
                className="min-h-[44px] rounded-full bg-[#242E49] text-white text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Jo&apos;natish</span>
              </button>
              {previewItem.category === 'frames' &&
              (ownedMap.has(previewItem.id) || previewItem.priceCoins === 0) ? (
                <button
                  type="button"
                  disabled={busyId === previewItem.id || currentUser.frameStyle === previewItem.id}
                  onClick={async () => {
                    const target = previewItem;
                    await handleEquip(target.id);
                    setPreviewItem(null);
                  }}
                  className={`min-h-[44px] rounded-full text-sm font-extrabold flex items-center justify-center gap-1.5 ${
                    currentUser.frameStyle === previewItem.id
                      ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200'
                      : 'bg-gradient-to-r from-[#FFF04D] via-[#B4FF5C] to-[#2CF6D2] text-[#05101F]'
                  }`}
                >
                  {currentUser.frameStyle === previewItem.id ? 'Taqilgan' : 'Taqish'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyId === previewItem.id}
                  onClick={async () => {
                    const target = previewItem;
                    await handleBuy(target);
                    setPreviewItem(null);
                  }}
                  className="min-h-[44px] rounded-full bg-gradient-to-r from-[#FFF04D] via-[#B4FF5C] to-[#2CF6D2] text-[#05101F] text-sm font-extrabold"
                >
                  Sotib olish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gift / Send Recipient Picker Modal */}
      {giftItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#10182E] border border-purple-400/40 p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display text-base font-bold text-white">
                  {isGiftCpOnly ? 'Uzukni CP parangizga yuborish' : 'Romkani do‘stga jo‘natish'}
                </h4>
                <p className="text-xs text-[#F5C451] mt-0.5">
                  {giftItem.name} · {formatCoins(giftItem.priceCoins)} Tanga
                  {!isGiftCpOnly && ` / ${giftItem.durationDays} kun`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGiftItem(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isGiftCpOnly ? (
              <div className="p-3 rounded-2xl bg-pink-500/10 border border-pink-400/35 text-xs text-pink-200">
                Sevgi uyi uzugi qoidasi: boshqa foydalanuvchilarga olib berilmaydi — faqat faol CP
                parangizga jo‘natiladi.
              </div>
            ) : (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Foydalanuvchi ismi yoki ID raqami..."
                  className="w-full min-h-[42px] pl-10 pr-3.5 bg-[#070C1B] border border-white/10 rounded-xl text-sm text-white"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] rounded-2xl bg-[#070C1B] border border-white/[0.07]">
              {filteredRecipients.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {isGiftCpOnly ? 'Faol CP parangiz topilmadi.' : 'Foydalanuvchi topilmadi.'}
                </div>
              ) : (
                filteredRecipients.map((u) => (
                  <div
                    key={u.id}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={u.avatarUrl}
                        alt={u.nickname}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {u.nickname}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {u.publicId}
                          {isGiftCpOnly && ' · CP juftingiz'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === giftItem.id}
                      onClick={() => handleSendGift(u)}
                      className="min-h-[36px] px-3.5 rounded-full bg-gradient-to-r from-[#FFF04D] to-[#2CF6D2] text-[#05101F] text-xs font-extrabold shrink-0"
                    >
                      Jo&apos;natish
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
