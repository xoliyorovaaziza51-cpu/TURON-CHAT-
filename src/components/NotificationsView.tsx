import React from 'react';
import { Bell, CheckCheck, Gift, Mail, Radio, ShieldCheck, UserPlus } from 'lucide-react';
import { formatUzDate } from '../lib/api';
import type { AppNotification } from '../types/turon';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onAction: (actionUrl: string | null) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllRead,
  onAction,
}) => {
  function getIcon(type: AppNotification['notifType']) {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-4 h-4 text-blue-400" />;
      case 'message':
        return <Mail className="w-4 h-4 text-purple-300" />;
      case 'room_invite':
        return <Radio className="w-4 h-4 text-emerald-400" />;
      case 'gift':
        return <Gift className="w-4 h-4 text-[#E5B84B]" />;
      case 'membership':
        return <ShieldCheck className="w-4 h-4 text-[#E5B84B]" />;
      default:
        return <Bell className="w-4 h-4 text-slate-300" />;
    }
  }

  return (
    <div className="space-y-6 max-w-3xl pb-24 lg:pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Bildirishnomalar</h2>
          <p className="text-xs text-slate-400 mt-1">
            Do‘stlik so‘rovlari, xabarlar, xona takliflari, sovg‘alar va tizim e’lonlari
          </p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="min-h-[40px] px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5"
        >
          <CheckCheck className="w-4 h-4 text-blue-400" />
          <span>Hammasini o‘qilgan qilish</span>
        </button>
      </div>

      <div className="bg-[#0F1524] border border-white/[0.07] rounded-2xl divide-y divide-white/[0.06]">
        {notifications.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Hozircha bildirishnomalar yo‘q.
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onAction(n.actionUrl)}
              className={`w-full p-4 flex items-start justify-between gap-3 text-left transition-colors hover:bg-white/[0.02] ${
                !n.isRead ? 'bg-blue-600/[0.05]' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#080B14] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  {getIcon(n.notifType)}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{n.title}</div>
                  <p className="text-xs text-slate-300 mt-0.5">{n.body}</p>
                  <div className="text-[11px] text-slate-500 mt-1">{formatUzDate(n.createdAt)}</div>
                </div>
              </div>
              {!n.isRead && (
                <span className="text-[11px] font-medium text-blue-400 shrink-0">Yangi</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};
