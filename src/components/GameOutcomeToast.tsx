import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Award, ShieldAlert, Sparkles, Trophy, X } from 'lucide-react';
import { formatCoins } from '../lib/api';

export interface GameOutcomeToastItem {
  id: string;
  gameTitle: string;
  outcome: string;
  deltaPoints: number;
  isWin: boolean;
  gamePoints: number;
}

interface GameOutcomeToastProps {
  toasts: GameOutcomeToastItem[];
  onDismiss: (id: string) => void;
}

export const GameOutcomeToastContainer: React.FC<GameOutcomeToastProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-16 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2.5"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 shadow-2xl ${
              toast.isWin
                ? 'bg-gradient-to-r from-[#0F1F1C]/95 via-[#11192B]/95 to-[#1E1910]/95 border-[#E5B84B]/60 shadow-[0_12px_32px_rgba(229,184,75,0.25)]'
                : 'bg-gradient-to-r from-[#240D18]/95 via-[#181026]/95 to-[#121324]/95 border-rose-500/50 shadow-[0_12px_32px_rgba(244,63,94,0.2)]'
            }`}
          >
            {/* Subtle Animated Progress Bar */}
            <motion.div
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 4.5, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
              className={`absolute bottom-0 left-0 right-0 h-[3px] ${
                toast.isWin ? 'bg-[#E5B84B]' : 'bg-rose-500'
              }`}
            />

            <div className="flex items-start gap-3">
              <motion.div
                initial={{ rotate: toast.isWin ? -18 : 10, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  toast.isWin
                    ? 'bg-[#E5B84B]/20 border-[#E5B84B]/50 text-[#E5B84B]'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                }`}
              >
                {toast.isWin ? (
                  <Trophy className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </motion.div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      toast.isWin ? 'text-[#E5B84B]' : 'text-rose-400'
                    }`}
                  >
                    {toast.isWin ? 'Yutuq!' : 'Yutqazish'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-xs font-semibold text-white truncate">
                    {toast.gameTitle}
                  </span>
                  {toast.isWin && <Sparkles className="w-3.5 h-3.5 text-[#E5B84B] shrink-0" />}
                </div>

                <p className="text-xs text-slate-200 mt-0.5 line-clamp-2">{toast.outcome}</p>

                <div className="mt-2 flex items-center gap-3 text-xs font-mono tabular-nums">
                  <span
                    className={`font-bold ${
                      toast.deltaPoints > 0
                        ? 'text-emerald-400'
                        : toast.deltaPoints < 0
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {toast.deltaPoints > 0 ? '+' : ''}
                    {formatCoins(toast.deltaPoints)} ball
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-[#E5B84B]" />
                    Jami: {formatCoins(toast.gamePoints)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="min-h-[44px] min-w-[44px] -mr-1.5 -mt-1.5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                aria-label="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
