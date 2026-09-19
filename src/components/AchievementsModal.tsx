import React, { useState } from 'react';
import { Award, Trophy, Sparkles, X, CheckCircle2, Lock, Flame, Target, BookOpen, Crown } from 'lucide-react';
import type { StudyPlan } from '../types/study.ts';
import { getPlanAchievements } from '../utils/achievementManager.ts';

interface AchievementsModalProps {
  plan: StudyPlan;
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  plan,
  isOpen,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!isOpen) return null;

  const achievements = getPlanAchievements(plan);
  const unlockedCount = achievements.filter((a) => a.unlockedAt || a.progressPercent >= 100).length;
  const totalCount = achievements.length;
  const overallPercentage = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = achievements.filter((a) => {
    if (activeCategory === 'all') return true;
    return a.category === activeCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl transition-colors cursor-pointer bg-white/10 hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 block">
                SISTEMA DE LOGROS Y MEDALLAS
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Colección de Logros
              </h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed max-w-lg">
            Desbloquea medallas acumulando constancia en el cronograma, superando objetivos teóricos y completando simulacros.
          </p>

          {/* Progress Bar */}
          <div className="mt-4 p-3 rounded-2xl bg-white/10 border border-white/10">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> {unlockedCount} de {totalCount} Medallas Desbloqueadas
              </span>
              <span className="text-white font-black">{overallPercentage}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'Todas las Medallas', icon: Trophy },
            { id: 'consistency', label: 'Constancia', icon: Flame },
            { id: 'mastery', label: 'Maestría', icon: BookOpen },
            { id: 'practice', label: 'Práctica', icon: Target },
            { id: 'milestone', label: 'Hitos', icon: Crown },
          ].map((cat) => {
            const IconComp = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Achievement Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredAchievements.map((item) => {
              const isUnlocked = Boolean(item.unlockedAt || item.progressPercent >= 100);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative overflow-hidden ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-indigo-50/90 to-purple-50/60 dark:from-indigo-950/40 dark:to-purple-950/30 border-indigo-200 dark:border-indigo-800 shadow-sm'
                      : 'bg-slate-50/80 dark:bg-slate-850/40 border-slate-200/80 dark:border-slate-800 opacity-75'
                  }`}
                >
                  {/* Badge Icon Container */}
                  <div
                    className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center shrink-0 shadow-sm ${
                      isUnlocked
                        ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-indigo-500/30 ring-2 ring-indigo-400/40'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border border-slate-300 dark:border-slate-700 grayscale'
                    }`}
                  >
                    {isUnlocked ? item.icon : <Lock className="w-5 h-5 text-slate-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className={`text-sm font-black truncate ${
                        isUnlocked ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {item.title}
                      </h4>

                      {isUnlocked && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/50 flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3" /> ¡Desbloqueado!
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                      {item.description}
                    </p>

                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                      <span>• {item.requirementText}</span>
                    </p>

                    {/* Progress indicator for locked badges */}
                    {!isUnlocked && (
                      <div className="mt-2.5">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                          <span>Progreso</span>
                          <span>{item.progressPercent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${item.progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
