import React, { useState } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Target, 
  Calendar, 
  BookOpen, 
  Sparkles, 
  Copy, 
  Check, 
  FileCheck,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { StudyPlan, DailyScheduleDay, DailyTask } from '../types/study.ts';

interface StudyScheduleViewProps {
  plan: StudyPlan;
  onUpdatePlan: (updatedPlan: StudyPlan) => void;
}

export const StudyScheduleView: React.FC<StudyScheduleViewProps> = ({
  plan,
  onUpdatePlan,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);

  // Toggle task completion
  const handleToggleTask = (dayNumber: number, taskId: string) => {
    let totalTasks = 0;
    let completedTasks = 0;

    const newSchedule = plan.schedule.map((day) => {
      const updatedTasks = day.tasks.map((task) => {
        totalTasks++;
        if (day.dayNumber === dayNumber && task.id === taskId) {
          const isDone = !task.completed;
          if (isDone) completedTasks++;
          return { ...task, completed: isDone };
        }
        if (task.completed) completedTasks++;
        return task;
      });
      return { ...day, tasks: updatedTasks };
    });

    const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    onUpdatePlan({
      ...plan,
      schedule: newSchedule,
      progress: newProgress,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCopyMarkdown = () => {
    let md = `# Plan de Estudio: ${plan.title}\n`;
    md += `**Meta:** ${plan.targetGrade}% | **Días restantes:** ${plan.daysLeft} días | **Horas estimadas:** ${plan.totalEstimatedHours}h\n\n`;
    md += `## Estrategia adaptada\n${plan.strategySummary}\n\n`;
    md += `## Cronograma Diario\n`;

    plan.schedule.forEach(day => {
      md += `### Día ${day.dayNumber}: ${day.title} (${day.estimatedHours}h)\n`;
      md += `*Enfoque:* ${day.focus}\n`;
      day.tasks.forEach(t => {
        md += `- [${t.completed ? 'x' : ' '}] ${t.task} (${t.timeMinutes} min)\n`;
      });
      md += `\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const totalTasksCount = plan.schedule.reduce((acc, d) => acc + d.tasks.length, 0);
  const completedTasksCount = plan.schedule.reduce(
    (acc, d) => acc + d.tasks.filter(t => t.completed).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                {plan.daysLeft} {plan.daysLeft === 1 ? 'Día Restante' : 'Días Restantes'}
              </span>
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                Meta: {plan.targetGrade}%
              </span>
              <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                ~{plan.totalEstimatedHours}h totales
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              {plan.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {plan.strategySummary}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-2 lg:pt-0">
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer active:scale-98"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>¡Cronograma Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Copiar Cronograma</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar & Stats */}
        <div className="pt-4 sm:pt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 items-center">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Tareas Completadas
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">{plan.progress}% ({completedTasksCount}/{totalTasksCount})</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${plan.progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-start sm:justify-end gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Ritmo: {plan.recommendedDailyHours}h diarias</span>
          </div>
        </div>
      </div>

      {/* Days Timeline */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Itinerario Día por Día
        </h3>

        {plan.schedule.map((day) => {
          const isExpanded = expandedDay === day.dayNumber;
          const dayCompletedTasks = day.tasks.filter(t => t.completed).length;
          const dayTotalTasks = day.tasks.length;
          const isDayDone = dayTotalTasks > 0 && dayCompletedTasks === dayTotalTasks;

          return (
            <div
              key={day.dayNumber}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                isDayDone
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {/* Day Header */}
              <div
                onClick={() => setExpandedDay(isExpanded ? null : day.dayNumber)}
                className="p-3.5 sm:p-5 flex items-center justify-between cursor-pointer select-none min-h-[56px] active:bg-slate-50 dark:active:bg-slate-800/40 rounded-2xl"
              >
                <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden pr-2">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs ${
                      isDayDone
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    D{day.dayNumber}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                        {day.title}
                      </h4>
                      {isDayDone && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          Listo
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {day.focus}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 hidden sm:flex">
                    <Clock className="w-3.5 h-3.5" /> {day.estimatedHours}h
                  </span>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {dayCompletedTasks}/{dayTotalTasks}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  )}
                </div>
              </div>

              {/* Day Expanded Details */}
              {isExpanded && (
                <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3 sm:space-y-4">
                  {/* Focus & Objectives */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Objetivos Clave:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                      {day.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tasks List */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Tareas del Día (Toca para marcar):
                    </p>
                    <div className="space-y-2">
                      {day.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(day.dayNumber, task.id)}
                          className={`flex items-start gap-2.5 sm:gap-3 p-3 sm:p-3.5 min-h-[48px] rounded-xl border cursor-pointer transition-all active:scale-[0.99] ${
                            task.completed
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-slate-500 dark:text-slate-400'
                              : 'bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <button
                            type="button"
                            className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400 w-6 h-6 flex items-center justify-center cursor-pointer"
                          >
                            {task.completed ? (
                              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs sm:text-sm font-medium leading-snug ${
                                task.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
                              }`}
                            >
                              {task.task}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                                ~{task.timeMinutes} min
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] uppercase font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {task.type === 'read' ? 'Lectura' :
                                 task.type === 'practice' ? 'Ejercicios' :
                                 task.type === 'memorize' ? 'Memorización' :
                                 task.type === 'review' ? 'Repaso' : 'Simulacro'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
