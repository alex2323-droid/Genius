import React, { useEffect } from 'react';
import { Award, Sparkles, X, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Achievement } from '../types/study.ts';

interface AchievementToastProps {
  achievement: Achievement | null;
  onClose: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  onClose,
}) => {
  useEffect(() => {
    if (achievement) {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981'],
      });
      
      const timer = setTimeout(() => {
        onClose();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [achievement, onClose]);

  if (!achievement) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full p-1 animate-bounce-in">
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-2 border-indigo-500/80 shadow-2xl shadow-indigo-500/30 backdrop-blur-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-3xl sm:text-4xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/40 ring-4 ring-indigo-400/30 animate-pulse">
            {achievement.icon}
          </div>

          <div className="flex-1 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                ¡LOGRO DESBLOQUEADO!
              </span>
            </div>

            <h4 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
              {achievement.title}
            </h4>

            <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
              {achievement.description}
            </p>

            <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{achievement.requirementText}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
