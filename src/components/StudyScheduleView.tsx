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
  ChevronUp,
  HelpCircle,
  Layers,
  ArrowRight,
  CheckSquare,
  Play,
  Timer,
  Trophy
} from 'lucide-react';
import type { StudyPlan, DailyScheduleDay, DailyTask } from '../types/study.ts';
import { calculatePlanTaskStats } from '../utils/dayStudyMapping.ts';
import { getPlanAchievements } from '../utils/achievementManager.ts';

interface StudyScheduleViewProps {
  plan: StudyPlan;
  selectedDayNumber?: number | 'all';
  onSelectDay?: (dayNumber: number | 'all') => void;
  onUpdatePlan: (updatedPlan: StudyPlan) => void;
  onNavigateTab?: (tab: 'schedule' | 'guide' | 'flashcards' | 'exercises', dayNumber?: number) => void;
  onStartSession?: (dayNumber?: number, taskId?: string) => void;
  onOpenAchievements?: () => void;
}

export const StudyScheduleView: React.FC<StudyScheduleViewProps> = ({
  plan,
  selectedDayNumber = 'all',
  onSelectDay,
  onUpdatePlan,
  onNavigateTab,
  onStartSession,
  onOpenAchievements,
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedDay, setExpandedDay] = useState<number | null>(
    typeof selectedDayNumber === 'number' ? selectedDayNumber : 1
  );

  const schedule = Array.isArray(plan?.schedule) ? plan.schedule : [];
  const stats = calculatePlanTaskStats(plan);
  const achievements = getPlanAchievements(plan);
  const unlockedAchievementsCount = achievements.filter(a => a.unlockedAt || a.progressPercent >= 100).length;

  // Toggle single task completion
  const handleToggleTask = (dayNumber: number, taskId: string) => {
    let totalTasks = 0;
    let completedTasks = 0;

    const newSchedule = schedule.map((day) => {
      const dayTasks = Array.isArray(day?.tasks) ? day.tasks : [];
      const updatedTasks = dayTasks.map((task) => {
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

  // Mark all tasks of a specific day as completed / uncompleted
  const handleToggleAllDayTasks = (dayNumber: number) => {
    const targetDay = schedule.find(d => d.dayNumber === dayNumber);
    if (!targetDay) return;
    const allCurrentlyDone = targetDay.tasks.every(t => t.completed);

    let totalTasks = 0;
    let completedTasks = 0;

    const newSchedule = schedule.map((day) => {
      const dayTasks = Array.isArray(day?.tasks) ? day.tasks : [];
      const updatedTasks = dayTasks.map((task) => {
        totalTasks++;
        if (day.dayNumber === dayNumber) {
          const isDone = !allCurrentlyDone;
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
    md += `## Estrategia adaptada\n${plan.strategySummary || ''}\n\n`;
    md += `## Cronograma Diario\n`;

    schedule.forEach(day => {
      md += `### Día ${day.dayNumber}: ${day.title} (${day.estimatedHours}h)\n`;
      md += `*Enfoque:* ${day.focus}\n`;
      const dayTasks = Array.isArray(day?.tasks) ? day.tasks : [];
      dayTasks.forEach(t => {
        md += `- [${t.completed ? 'x' : ' '}] ${t.task} (${t.timeMinutes} min)\n`;
      });
      md += `\n`;
    });

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

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
              {plan.providerUsed && (
                <span className="px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>IA: {plan.providerUsed}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              {plan.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {plan.strategySummary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0 pt-2 lg:pt-0">
            {onOpenAchievements && (
              <button
                type="button"
                id="btn-view-achievements-schedule"
                onClick={onOpenAchievements}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 border border-amber-300 dark:border-amber-800 rounded-xl transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Logros y Medallas ({unlockedAchievementsCount}/{achievements.length})</span>
              </button>
            )}

            {onStartSession && (
              <button
                type="button"
                id="btn-start-focus-session-header"
                onClick={() => onStartSession()}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Timer className="w-4 h-4" />
                <span>Modo Sesión Pomodoro</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer active:scale-98"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Copiar</span>
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
                <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Tareas Totales Completadas
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {stats.percentage}% ({stats.completedTasks}/{stats.totalTasks} tareas)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-start sm:justify-end gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{stats.completedDays} de {stats.totalDays} días completados</span>
          </div>
        </div>
      </div>

      {/* Days Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 
            <span>Itinerario Día por Día</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {schedule.length} sesiones de estudio
          </span>
        </div>

        {schedule.map((day) => {
          const isExpanded = expandedDay === day.dayNumber;
          const dayTasks = Array.isArray(day?.tasks) ? day.tasks : [];
          const dayObjectives = Array.isArray(day?.objectives) ? day.objectives : [];
          const dayCompletedTasks = dayTasks.filter(t => t.completed).length;
          const dayTotalTasks = dayTasks.length;
          const isDayDone = dayTotalTasks > 0 && dayCompletedTasks === dayTotalTasks;
          const isSelected = selectedDayNumber === day.dayNumber;

          return (
            <div
              key={day.dayNumber}
              className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                isSelected
                  ? 'border-blue-500 dark:border-blue-500 shadow-md ring-1 ring-blue-500/20'
                  : isDayDone
                  ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {/* Day Header */}
              <div
                onClick={() => {
                  setExpandedDay(isExpanded ? null : day.dayNumber);
                  if (onSelectDay) onSelectDay(day.dayNumber);
                }}
                className="p-3.5 sm:p-5 flex items-center justify-between cursor-pointer select-none min-h-[56px] active:bg-slate-50 dark:active:bg-slate-800/40 rounded-2xl"
              >
                <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden pr-2">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs ${
                      isDayDone
                        ? 'bg-emerald-600 text-white'
                        : isSelected
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-slate-800 dark:bg-slate-700 text-white'
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
                          Completado
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
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isDayDone
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
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
                  {/* Quick Action Navigation for this Day */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {onStartSession && (
                      <button
                        type="button"
                        onClick={() => onStartSession(day.dayNumber)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                      >
                        <Timer className="w-3.5 h-3.5 shrink-0" />
                        <span>Estudiar Día {day.dayNumber} con Pomodoro</span>
                      </button>
                    )}

                    {onNavigateTab && (
                      <>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('guide', day.dayNumber)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl border border-blue-200/60 dark:border-blue-800/60 transition-all cursor-pointer active:scale-95"
                        >
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>Ver Guía del Día {day.dayNumber}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigateTab('exercises', day.dayNumber)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 transition-all cursor-pointer active:scale-95"
                        >
                          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Ejercicios del Día {day.dayNumber}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigateTab('flashcards', day.dayNumber)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl border border-purple-200/60 dark:border-purple-800/60 transition-all cursor-pointer active:scale-95"
                        >
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                          <span>Flashcards del Día {day.dayNumber}</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleAllDayTasks(day.dayNumber)}
                      className="ml-auto text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline p-1 cursor-pointer"
                    >
                      {isDayDone ? 'Desmarcar tareas' : 'Marcar todas como hechas'}
                    </button>
                  </div>

                  {/* Focus & Objectives */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Objetivos Clave:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-600 dark:text-slate-400">
                      {dayObjectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Tasks List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Tareas del Día:
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {dayCompletedTasks} de {dayTotalTasks} completadas
                      </span>
                    </div>

                    <div className="space-y-2">
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`flex items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 min-h-[48px] rounded-xl border transition-all ${
                            task.completed
                              ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-slate-500 dark:text-slate-400'
                              : 'bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div 
                            onClick={() => handleToggleTask(day.dayNumber, task.id)}
                            className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0 cursor-pointer"
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

                          {/* Action Button: Start Focus Mode for this task */}
                          {onStartSession && (
                            <button
                              type="button"
                              onClick={() => onStartSession(day.dayNumber, task.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 text-xs font-bold border border-blue-200/60 dark:border-blue-800/60 transition-all cursor-pointer shrink-0 active:scale-95"
                              title="Iniciar sesión de estudio con Pomodoro para esta tarea"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span className="hidden sm:inline">Estudiar</span>
                            </button>
                          )}
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
