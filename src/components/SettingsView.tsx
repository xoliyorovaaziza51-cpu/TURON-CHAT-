import React, { useState } from 'react';
import { Bell, Globe, HelpCircle, Lock, LogOut, Shield, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { ServiceConfigStatus, UserProfile } from '../types/turon';

interface SettingsViewProps {
  currentUser: UserProfile;
  serviceStatus: ServiceConfigStatus;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  serviceStatus,
  onUserUpdated,
  onLogout,
}) => {
  const [privacyDm, setPrivacyDm] = useState(currentUser.privacyDm);
  const [showOnline, setShowOnline] = useState(currentUser.privacyShowOnline);
  const [notifyMsg, setNotifyMsg] = useState(currentUser.notifyMessages);
  const [notifyGifts, setNotifyGifts] = useState(currentUser.notifyGifts);
  const [notifyRooms, setNotifyRooms] = useState(currentUser.notifyRooms);
  const [language, setLanguage] = useState(currentUser.language);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(false);
    const res = await apiFetch<{ user: UserProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify({
        privacyDm,
        privacyShowOnline: showOnline,
        notifyMessages: notifyMsg,
        notifyGifts,
        notifyRooms,
        language,
      }),
    });
    onUserUpdated(res.user);
    setSaved(true);
  }

  return (
    <div className="space-y-6 max-w-3xl pb-24 lg:pb-10">
      <div>
        <h2 className="font-display text-2xl font-bold text-white">Sozlamalar va Xavfsizlik</h2>
        <p className="text-xs text-slate-400 mt-1">
          Hisob maxfiyligi, bildirishnomalar, hamjamiyat qoidalari va xavfsizlik nazorati
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Sozlamalar saqlandi.</span>
        </div>
      )}

      {/* Privacy Settings */}
      <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Lock className="w-4 h-4 text-blue-400" />
          <span>Maxfiylik sozlamalari</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-white">Shaxsiy xabarlarni kim yozishi mumkin</div>
            <div className="text-xs text-slate-400">Begonalar xabarlarini cheklash</div>
          </div>
          <select
            value={privacyDm}
            onChange={(e) => setPrivacyDm(e.target.value as any)}
            className="min-h-[40px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
          >
            <option value="everyone">Hamma</option>
            <option value="friends">Faqat do‘stlar</option>
            <option value="nobody">Hech kim</option>
          </select>
        </div>

        <label className="flex items-center justify-between cursor-pointer pt-3 border-t border-white/[0.06]">
          <div>
            <div className="text-sm text-white">Onlayn holatni ko‘rsatish</div>
            <div className="text-xs text-slate-400">Boshqa foydalanuvchilar sizning faolligingizni ko‘radi</div>
          </div>
          <input
            type="checkbox"
            checked={showOnline}
            onChange={(e) => setShowOnline(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
        </label>
      </div>

      {/* Notification Settings */}
      <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold mb-1">
          <Bell className="w-4 h-4 text-purple-400" />
          <span>Bildirishnoma sozlamalari</span>
        </div>
        {[
          { label: 'Yangi shaxsiy xabarlar', val: notifyMsg, set: setNotifyMsg },
          { label: 'Qabul qilingan sovg‘alar', val: notifyGifts, set: setNotifyGifts },
          { label: 'Ovozli xonalarga takliflar', val: notifyRooms, set: setNotifyRooms },
        ].map((item, idx) => (
          <label key={idx} className="flex items-center justify-between py-1.5 cursor-pointer">
            <span className="text-sm text-slate-200">{item.label}</span>
            <input
              type="checkbox"
              checked={item.val}
              onChange={(e) => item.set(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
          </label>
        ))}
      </div>

      {/* Language & Integrations Info */}
      <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Globe className="w-4 h-4 text-[#E5B84B]" />
            <span>Ilova tili</span>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="min-h-[40px] px-3 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white"
          >
            <option value="uz">O‘zbekcha (Lotin)</option>
          </select>
        </div>

        <div className="pt-3 border-t border-white/[0.06] text-xs text-slate-400 space-y-1">
          <div>
            Ma’lumotlar bazasi: {serviceStatus.supabaseConfigured ? 'Supabase PostgreSQL ulangan' : 'Mahalliy server bazasi + Supabase tayyor sxemasi'}
          </div>
          <div>
            Jonli ovoz (LiveKit): {serviceStatus.livekitConfigured ? 'Faol va sozlangan' : 'Sozlanmagan (ovoz uzatish uchun LIVEKIT kalitlari kerak)'}
          </div>
        </div>
      </div>

      {/* Community Guidelines & Age Protections */}
      <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Hamjamiyat qoidalari va xavfsizlik</span>
        </div>
        <ul className="text-xs text-slate-300 space-y-2 leading-relaxed list-disc pl-4">
          <li>Barcha ishtirokchilarga hurmat bilan munosabatda bo‘ling; haqorat, tahdid va diskriminatsiya qat’iyan taqiqlanadi.</li>
          <li>Yoshga mos himoya: 18 yoshdan kichik foydalanuvchilar uchun nomaqbul kontent taqiqlanadi va moderatorlar tomonidan nazorat qilinadi.</li>
          <li>Shaxsiy ma’lumotlar (telefon raqami, bank karta ma’lumotlari, manzil) uchinchi shaxslarga oshkor qilinmaydi.</li>
          <li>Platformada qimor, pul garovlari yoki naqd pul yutuqlari mutlaqo mavjud emas.</li>
        </ul>
      </div>

      {/* Help & Actions */}
      <div className="p-5 rounded-2xl bg-[#0F1524] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <div className="text-sm font-medium text-white">Yordam va qo‘llab-quvvatlash</div>
            <div className="text-xs text-slate-400">yordam@turonchat.uz · Shikoyatlar 24 soat ichida ko‘rib chiqiladi</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold"
          >
            Saqlash
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Chiqish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
