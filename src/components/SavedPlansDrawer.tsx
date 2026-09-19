import React from 'react';
import { X, FolderKanban, Trash2, Calendar, Target, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { useCustomLogo } from '../utils/logoStorage.ts';
import type { StudyPlan } from '../types/study.ts';

interface SavedPlansDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plans: StudyPlan[];
  activePlanId: string | null;
  onSelectPlan: (plan: StudyPlan) => void;
  onDeletePlan: (planId: string) => void;
}

export const SavedPlansDrawer: React.FC<SavedPlansDrawerProps> = ({
  isOpen,
  onClose,
  plans,
  activePlanId,
  onSelectPlan,
  onDeletePlan,
}) => {
  const currentLogo = useCustomLogo();
  if (!isOpen) return null;

  const safePlans = Array.isArray(plans) ? plans : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-colors">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
              <img 
                src={currentLogo} 
                alt="Genius" 
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Mis Planes de Estudio</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{safePlans.length} planes guardados en Genius</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer -mr-2"
            aria-label="Cerrar panel de planes guardados"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Plans list */}
        <div className="p-4 sm:p-5 pb-8 sm:pb-5 overflow-y-auto flex-1 space-y-3">
          {safePlans.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto opacity-40 text-slate-500 dark:text-slate-400" />
              <p className="text-sm font-medium">Aún no tienes planes guardados.</p>
              <p className="text-xs">Sube tus archivos y crea tu primer plan adaptado.</p>
            </div>
          ) : (
            safePlans.map((plan) => {
              const isActive = plan.id === activePlanId;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between active:scale-[0.99] ${
                    isActive
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/60'
                  }`}
                  onClick={() => {
                    onSelectPlan(plan);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {plan.title}
                    </h4>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePlan(plan.id);
                      }}
                      className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer shrink-0 -mr-1 -mt-1"
                      title="Eliminar plan"
                      aria-label={`Eliminar plan ${plan.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <span className="flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200/50 dark:border-blue-800/50">
                      <Calendar className="w-3 h-3" /> {plan.daysLeft}d restantes
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200/50 dark:border-indigo-800/50">
                      <Target className="w-3 h-3" /> {plan.targetGrade}% meta
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <span>Progreso de tareas</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{plan.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full"
                        style={{ width: `${plan.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
