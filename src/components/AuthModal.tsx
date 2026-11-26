import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ArrowRight, Globe, ShieldCheck } from 'lucide-react';
import { apiFetch, setStoredToken } from '../lib/api';
import type { UserProfile } from '../types/turon';

interface AuthModalProps {
  onSuccess: (user: UserProfile) => void;
  onClose?: () => void;
  isFullScreen?: boolean;
}

const DEMO_ACCOUNTS = [
  { label: 'Asoschi (Founder)', email: 'asoschi@turonchat.uz' },
  { label: 'Super Admin', email: 'superadmin@turonchat.uz' },
  { label: 'Agentlik Rahbari', email: 'agentlik@turonchat.uz' },
  { label: 'PK Admin', email: 'pk@turonchat.uz' },
  { label: 'Oddiy Foydalanuvchi', email: 'mehmon@turonchat.uz' },
];

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess, onClose, isFullScreen }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('asoschi@turonchat.uz');
  const [password, setPassword] = useState('turon2026');
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'unspecified'>('male');
  const [country, setCountry] = useState("O'zbekiston");
  const [birthYear, setBirthYear] = useState('1999');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email, password }
          : { email, password, nickname, gender, country, birthYear: Number(birthYear) };
      const res = await apiFetch<{ token: string; user: UserProfile }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setStoredToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={
        isFullScreen
          ? 'min-h-screen bg-[#080B14] flex items-center justify-center p-4'
          : 'fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4'
      }
    >
      <div className="w-full max-w-md bg-[#0F1524] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="relative h-32 overflow-hidden">
          <img
            src="/src/assets/images/turon_hero_banner_1794822313365.jpg"
            alt="TURON CHAT studiya"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F1524] via-[#0F1524]/70 to-transparent" />
          <div className="absolute bottom-3 left-6 right-6 flex items-end justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-white">TURON CHAT</h1>
              <p className="text-xs text-slate-300 mt-0.5">O‘zbekiston ovozli suhbat platformasi</p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-3 text-xs text-slate-300 hover:text-white rounded-lg border border-white/10"
              >
                Yopish
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#080B14] rounded-xl border border-white/[0.07] mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Kirish
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setEmail('');
                setPassword('');
              }}
              className={`min-h-[44px] rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ro‘yxatdan o‘tish
            </button>
          </div>

          {error && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Taxallus (Nickname)</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Masalan: Dilshod Turon"
                    className="w-full min-h-[44px] pl-10 pr-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Elektron pochta</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sizning@pochta.uz"
                  className="w-full min-h-[44px] pl-10 pr-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Parol</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kamida 6 ta belgi"
                  className="w-full min-h-[44px] pl-10 pr-3.5 bg-[#080B14] border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Jinsi</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full min-h-[44px] px-2.5 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="male">Erkak</option>
                    <option value="female">Ayol</option>
                    <option value="unspecified">Ko‘rsatilmasin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Davlat</label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full min-h-[44px] pl-8 pr-2 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Tug‘ilgan yil</label>
                  <input
                    type="number"
                    min={1940}
                    max={2012}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full min-h-[44px] px-2.5 bg-[#080B14] border border-white/10 rounded-xl text-xs text-white font-mono tabular-nums focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              <span>
                {loading
                  ? 'Yuklanmoqda...'
                  : mode === 'login'
                  ? 'Hisobga kirish'
                  : 'Ro‘yxatdan o‘tish (+500 Tanga)'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-5 pt-4 border-t border-white/[0.07]">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#E5B84B]" />
                <span>Rollarni tekshirish uchun tezkor kirish (parol: turon2026)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword('turon2026');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors whitespace-nowrap ${
                      email === acc.email
                        ? 'bg-[#E5B84B]/15 border-[#E5B84B]/50 text-[#E5B84B]'
                        : 'bg-[#080B14] border-white/10 text-slate-300 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
