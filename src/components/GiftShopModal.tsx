import React, { useEffect, useState } from 'react';
import {
  Coffee,
  Crown,
  Flame,
  Flower2,
  Gem,
  Gift,
  Heart,
  Mic,
  Shield,
  Sparkles,
  X,
  Coins,
} from 'lucide-react';
import { apiFetch, formatCoins } from '../lib/api';
import type { RoomGiftEffectEvent } from './Gift3DEffectOverlay';
import type { GiftCategory, GiftItem, UserProfile } from '../types/turon';

interface GiftShopModalProps {
  currentUser: UserProfile;
  recipients: UserProfile[];
  defaultRecipientId?: string;
  roomId?: string;
  onClose: () => void;
  onSent: (updatedUser: UserProfile, giftEvent?: RoomGiftEffectEvent) => void;
}

export function renderGiftIcon(iconKey: string, className = 'w-6 h-6') {
  switch (iconKey) {
    case 'flower':
      return <Flower2 className={className} />;
    case 'coffee':
      return <Coffee className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'mic':
      return <Mic className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'shield':
      return <Shield className={className} />;
    case 'gem':
      return <Gem className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export const GiftShopModal: React.FC<GiftShopModalProps> = ({
  currentUser,
  recipients,
  defaultRecipientId,
  roomId,
  onClose,
  onSent,
}) => {
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>('all');
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [recipientId, setRecipientId] = useState<string>(
    defaultRecipientId || recipients[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ categories: GiftCategory[]; gifts: GiftItem[] }>('/api/gifts')
      .then((res) => {
        setCategories(res.categories);
        setGifts(res.gifts);
        if (res.gifts.length > 0) setSelectedGift(res.gifts[0]);
      })
      .catch(() => {});
  }, []);

  const filteredGifts =
    activeCat === 'all' ? gifts : gifts.filter((g) => g.categoryId === activeCat);
  const totalCost = (selectedGift?.priceCoins || 0) * quantity;

  async function handleSend() {
    if (!selectedGift || !recipientId) return;
    setError('');
    setSending(true);
    try {
      const res = await apiFetch<{ user: UserProfile; giftEvent?: RoomGiftEffectEvent }>(
        '/api/gifts/send',
        {
          method: 'POST',
          body: JSON.stringify({
            giftId: selectedGift.id,
            receiverId: recipientId,
            roomId: roomId || null,
            quantity,
          }),
        }
      );
      onClose();
      onSent(res.user, res.giftEvent);
    } catch (err: any) {
      setError(err.message || "Sovg'a yuborishda xatolik");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="w-full max-w-2xl bg-[#0F1524] border border-white/10 rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Gift className="w-5 h-5 text-[#E5B84B]" />
            <h3 className="font-display text-lg font-semibold text-white">Sovg‘alar do‘koni</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-mono tabular-nums text-[#E5B84B]">
              <Coins className="w-4 h-4" />
              <span>{formatCoins(currentUser.coinBalance)}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5"
              aria-label="Yopish"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 sm:space-y-4">
          {recipients.length > 0 && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Qabul qiluvchi</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recipients.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRecipientId(r.id)}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium border shrink-0 transition-colors ${
                      recipientId === r.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-[#080B14] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    {r.nickname}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCat('all')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeCat === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#080B14] text-slate-400 hover:text-white'
              }`}
            >
              Barchasi
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  activeCat === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-[#080B14] text-slate-400 hover:text-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
            {filteredGifts.map((g) => {
              const selected = selectedGift?.id === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGift(g)}
                  className={`p-1.5 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center ${
                    selected
                      ? 'bg-gradient-to-b from-blue-600/25 to-purple-600/25 border-[#E5B84B] shadow-[0_0_12px_rgba(229,184,75,0.25)]'
                      : 'bg-[#080B14] border-white/[0.07] hover:border-white/20'
                  }`}
                >
                  <div
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden flex items-center justify-center mb-1.5 shrink-0 ${
                      g.videoUrl
                        ? 'bg-black border border-[#E5B84B]/45 shadow-[0_0_10px_rgba(229,184,75,0.2)]'
                        : g.tier === 'luxury'
                        ? 'bg-gradient-to-br from-[#E5B84B]/20 to-amber-600/10 text-[#E5B84B] border border-[#E5B84B]/30'
                        : g.tier === 'premium'
                        ? 'bg-gradient-to-br from-purple-500/25 to-blue-600/15 text-purple-300 border border-purple-400/30'
                        : 'bg-blue-500/15 text-blue-300 border border-blue-400/20'
                    }`}
                  >
                    {g.videoUrl ? (
                      <>
                        <video
                          src={g.videoUrl}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-0.5 right-0.5 px-1 rounded bg-black/75 text-[8px] font-bold text-[#FDE68A] leading-tight">
                          3D
                        </span>
                      </>
                    ) : (
                      <>
                        {renderGiftIcon(g.iconKey, 'w-5 h-5 sm:w-6 sm:h-6')}
                        {g.isAnimated && (
                          <span className="absolute top-0.5 right-0.5 px-1 rounded bg-purple-600/80 text-[8px] font-bold text-white leading-tight">
                            3D
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="text-[11px] sm:text-xs font-semibold text-white line-clamp-1 leading-tight w-full">
                    {g.name}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-purple-300/90 leading-tight truncate w-full mt-0.5">
                    {g.videoUrl ? 'Video effekt' : g.isAnimated ? '3D effekt' : 'Oddiy'}
                  </div>
                  <div className="mt-1 text-[9px] sm:text-[11px] font-mono tabular-nums font-bold text-[#E5B84B] tracking-tight truncate w-full">
                    {formatCoins(g.priceCoins)}
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-white/[0.07] bg-[#080B14]/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {[1, 5, 10, 99].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuantity(q)}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-mono tabular-nums border transition-colors ${
                  quantity === q
                    ? 'bg-[#E5B84B]/20 border-[#E5B84B] text-[#E5B84B]'
                    : 'bg-[#0F1524] border-white/10 text-slate-300'
                }`}
              >
                {q}×
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={sending || !selectedGift || !recipientId}
            onClick={handleSend}
            className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-sm font-semibold whitespace-nowrap disabled:opacity-50"
          >
            {sending
              ? 'Yuborilmoqda...'
              : `Yuborish · ${formatCoins(totalCost)} Tanga`}
          </button>
        </div>
      </div>
    </div>
  );
};
