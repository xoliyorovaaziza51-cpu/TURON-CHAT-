import React, { useState } from 'react';
import { Sparkles, Mic, Gift, Gamepad2, User, Check, ArrowRight, X } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface OnboardingModalProps {
  currentUser: UserProfile;
  onComplete: (updatedUser: UserProfile) => void;
  onSkip: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  currentUser,
  onComplete,
  onSkip,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || PRESET_AVATARS[0]);
  const [bio, setBio] = useState(currentUser.bio || 'Salom, men Turon Chat foydalanuvchisiman!');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSaveProfileAndFinish() {
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await apiFetch<{ user: UserProfile }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          nickname: nickname.trim() || currentUser.nickname,
          avatarUrl,
          bio,
        }),
      });
      onComplete(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Profilni saqlashda xatolik');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-backdrop-fade-in">
      <div className="w-full max-w-lg bg-[#0E1322] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-sheet-fade-in">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] bg-[#131A2E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold text-white">
              TURON <span className="text-[#E5B84B]">CHAT</span>
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 font-medium">
              Qadam {step} / 3
            </span>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-white min-h-[36px] px-2 flex items-center gap-1"
          >
            <span>O&apos;tkazib yuborish</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {step === 1 && (
            <div className="space-y-6 text-center py-2 animate-backdrop-fade-in">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-[#E5B84B] flex items-center justify-center shadow-xl shadow-blue-500/25">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl font-bold text-white">
                  TURON CHAT olamiga xush kelibsiz!
                </h3>
                <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
                  O&apos;zbekistonning eng sara ovozli chat, jonli o&apos;yinlar, PK janglari va qiziqarli muloqot maskani.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.07] text-left space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-white">Ovozli Xonalar</div>
                  <div className="text-xs text-slate-400">Mikrofonda suhbatlashing va musiqadan zavqlaning</div>
                </div>

                <div className="p-4 rounded-2xl bg-[#080B14] border border-white/[0.07] text-left space-y-1">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[#E5B84B] flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div className="text-sm font-bold text-white">Sovg&apos;alar & VIP</div>
                  <div className="text-xs text-slate-400">Hashamatli sovg&apos;alar yuboring va VIP ramkalar oling</div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-backdrop-fade-in">
              <div className="text-center space-y-1">
                <h3 className="font-display text-xl font-bold text-white">Profilingizni sozlang</h3>
                <p className="text-xs text-slate-400">
                  Ismingiz va avatar rasmingizni tanlab o&apos;zingizga moslang
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={avatarUrl}
                    alt="Avatar preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-[#E5B84B] shadow-lg"
                  />
                  <div className="text-xs text-slate-400">Tayyor avatarlardan birini tanlang:</div>
                  <div className="flex items-center gap-2 justify-center flex-wrap">
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-transform ${
                          avatarUrl === preset ? 'border-[#E5B84B] scale-110' : 'border-white/20 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">Taxallusingiz (Nickname)</label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Masalan: Bekzodbek"
                    className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">O&apos;zingiz haqingizda (Bio)</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Qisqacha ma'lumot..."
                    className="w-full min-h-[44px] px-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-backdrop-fade-in">
              <div className="text-center space-y-1">
                <h3 className="font-display text-xl font-bold text-white">Xonaga qo&apos;shilish bo&apos;yicha qo'llanma</h3>
                <p className="text-xs text-slate-400">
                  Qanday qilib ovozli xonada muloqot qilish mumkin?
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#080B14] border border-white/[0.07] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Xonaga kirish</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Bosh sahifadan istalgan ovozli xonani tanlang yoki o&apos;z xonangizni yarating.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#080B14] border border-white/[0.07] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Mikrofonga chiqish</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Bo'sh o'rinni bosing va mikrofonda gaplashing. Ovozini o'chirib qo'yishingiz ham mumkin.
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#080B14] border border-white/[0.07] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[#E5B84B] flex items-center justify-center shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">Sovg'a va O'yinlar</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Do'stlaringizga sovg'alar yuboring, raketa uchiring va qiziqarli o'yinlarda qatnashing!
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/[0.08] bg-[#131A2E] flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="min-h-[46px] px-5 rounded-xl bg-white/[0.06] text-slate-200 font-semibold text-sm hover:bg-white/10"
            >
              Orqaga
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="min-h-[46px] px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25"
            >
              <span>Keyingisi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveProfileAndFinish}
              className="min-h-[46px] px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saqlanmoqda...' : 'Boshlash'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
