import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Award, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Minus, 
  Info, 
  Calendar,
  AlertCircle,
  Activity,
  ThumbsUp,
  BarChart2,
  PieChart as PieIcon,
  Zap,
  RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { StudyPlan, DailyScheduleDay } from '../types/study.ts';
import { calculatePlanTaskStats } from '../utils/dayStudyMapping.ts';

interface PerformanceDashboardProps {
  plan: StudyPlan;
  onUpdatePlan: (updatedPlan: StudyPlan) => void;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  plan,
  onUpdatePlan,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'hours' | 'exercises'>('overview');
  const [editingHoursDay, setEditingHoursDay] = useState<number | null>(null);
  const [tempHours, setTempHours] = useState<string>('');

  // 1. Gather stats
  const stats = calculatePlanTaskStats(plan);
  const schedule = plan.schedule || [];
  
  // Estimate actual hours if not explicitly set
  const getDayActualHours = (day: DailyScheduleDay) => {
    if (day.actualHours !== undefined) {
      return day.actualHours;
    }
    // Fallback: sum of completed tasks in hours
    const completedMinutes = (day.tasks || [])
      .filter(t => t.completed)
      .reduce((sum, t) => sum + (t.timeMinutes || 0), 0);
    return Math.round((completedMinutes / 60) * 10) / 10;
  };

  // Update actual hours manually
  const handleUpdateActualHours = (dayNumber: number, hours: number) => {
    const safeHours = Math.max(0, Math.min(24, Math.round(hours * 10) / 10));
    const updatedSchedule = schedule.map(day => {
      if (day.dayNumber === dayNumber) {
        return { ...day, actualHours: safeHours };
      }
      return day;
    });

    onUpdatePlan({
      ...plan,
      schedule: updatedSchedule,
      updatedAt: new Date().toISOString()
    });
  };

  // 2. Format Data for Progress Chart (Progreso de Estudio)
  // We want to show Day by Day progress
  const progressData = schedule.map(day => {
    const tasks = day.tasks || [];
    const completed = tasks.filter(t => t.completed).length;
    const pct = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return {
      name: `Día ${day.dayNumber}`,
      'Progreso Tareas (%)': pct,
      'Tareas Listas': completed,
      'Total Tareas': tasks.length,
      'Título': day.title
    };
  });

  // 3. Format Data for Hours Comparison
  const hoursData = schedule.map(day => {
    const actual = getDayActualHours(day);
    return {
      name: `Día ${day.dayNumber}`,
      'Horas Planeadas': day.estimatedHours || 0,
      'Horas Reales': actual,
      'Título': day.title
    };
  });

  const totalPlannedHours = schedule.reduce((sum, d) => sum + (d.estimatedHours || 0), 0);
  const totalActualHours = schedule.reduce((sum, d) => sum + getDayActualHours(d), 0);
  const hoursSuccessRate = totalPlannedHours > 0 
    ? Math.round((totalActualHours / totalPlannedHours) * 100) 
    : 0;

  // 4. Format Data for Exercises / Quiz Accuracy
  const allExercises = plan.exercises || [];
  const mcqExercises = allExercises.filter(ex => ex.type === 'mcq' || ex.type === 'true_false');
  const answeredExercises = mcqExercises.filter(ex => ex.userAnswer !== undefined);
  const correctExercises = answeredExercises.filter(ex => ex.isCorrect);
  const incorrectExercisesCount = answeredExercises.length - correctExercises.length;
  const unansweredCount = mcqExercises.length - answeredExercises.length;

  const exerciseAccuracyRate = answeredExercises.length > 0
    ? Math.round((correctExercises.length / answeredExercises.length) * 100)
    : 0;

  const exercisePieData = [
    { name: 'Correctos', value: correctExercises.length, color: '#10b981' }, // Emerald
    { name: 'Incorrectos', value: incorrectExercisesCount, color: '#ef4444' }, // Red
    { name: 'Sin Responder', value: unansweredCount, color: '#94a3b8' } // Slate
  ].filter(d => d.value > 0);

  // Default to placeholder if no data has been created yet
  const hasExercises = mcqExercises.length > 0;

  // Exercise correct rate by difficulty
  const difficultyStats = ['basic', 'intermediate', 'advanced', 'mastery'].map(diff => {
    const diffExs = mcqExercises.filter(ex => ex.difficulty === diff);
    const diffAnswered = diffExs.filter(ex => ex.userAnswer !== undefined);
    const diffCorrect = diffAnswered.filter(ex => ex.isCorrect);
    const label = diff === 'basic' ? 'Básico' :
                  diff === 'intermediate' ? 'Intermedio' :
                  diff === 'advanced' ? 'Avanzado' : 'Máster';
    const accuracy = diffAnswered.length > 0 
      ? Math.round((diffCorrect.length / diffAnswered.length) * 100) 
      : 0;
    return {
      difficulty: label,
      'Tasa de Aciertos (%)': accuracy,
      'Respondidos': diffAnswered.length,
      'Total': diffExs.length
    };
  });

  return (
    <div className="bg-slate-50 dark:bg-slate-950 min-h-screen p-3 sm:p-6 lg:p-8 space-y-6 text-slate-900 dark:text-slate-100 antialiased" id="performance-dashboard-root">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Panel de Rendimiento Estudiantil</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Métricas de tu plan de estudio activo: <strong className="text-slate-800 dark:text-slate-200 font-bold">{plan.title}</strong>
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          Volver al Plan
        </button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Progreso Global */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">PROGRESO DEL PLAN</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400">{stats.percentage}%</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {stats.completedTasks} de {stats.totalTasks} tareas completas
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Horas Invertidas */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">TIEMPO INVERTIDO</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{totalActualHours}h <span className="text-xs font-medium text-slate-400">/ {totalPlannedHours}h</span></p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {hoursSuccessRate}% de las horas estimadas
            </p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Tasa de Aciertos */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">TASA DE ACIERTOS</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {answeredExercises.length > 0 ? `${exerciseAccuracyRate}%` : '0%'}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {correctExercises.length} correctas de {answeredExercises.length} respondidas
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Target className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Meta Recomendada */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">OBJETIVO DEL PLAN</span>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-500">{plan.targetGrade}%</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {answeredExercises.length > 0 && exerciseAccuracyRate >= plan.targetGrade 
                ? '¡Vas por buen camino!' 
                : answeredExercises.length > 0 
                ? 'Sigue practicando para subir' 
                : 'Responde ejercicios para medir'}
            </p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-500 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto scrollbar-none">
        {[
          { id: 'overview', label: 'Progreso de Estudio', icon: BarChart2 },
          { id: 'hours', label: 'Horas Planeadas vs Reales', icon: Clock },
          { id: 'exercises', label: 'Análisis de Preguntas', icon: PieIcon },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive 
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-extrabold' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chart Visualizer & Control Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Charts */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs lg:col-span-2 flex flex-col justify-between min-h-[420px]">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              {activeTab === 'overview' && (
                <>
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Progreso de Tareas Completadas por Día</span>
                </>
              )}
              {activeTab === 'hours' && (
                <>
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Análisis de Horas de Estudio Invertidas</span>
                </>
              )}
              {activeTab === 'exercises' && (
                <>
                  <Target className="w-4 h-4 text-emerald-600" />
                  <span>Precisión y Aciertos de Ejercicios</span>
                </>
              )}
            </h3>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            {activeTab === 'overview' && (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={progressData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                  <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }}
                    formatter={(value: any, name: any, props: any) => {
                      if (name === 'Progreso Tareas (%)') return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  <Area type="monotone" dataKey="Progreso Tareas (%)" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProgress)" />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'hours' && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      borderColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#f8fafc',
                      fontSize: '11px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                  <Bar dataKey="Horas Planeadas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Horas Reales" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'exercises' && (
              <div className="h-full flex flex-col md:flex-row items-center justify-center gap-6">
                {!hasExercises ? (
                  <div className="text-center p-8 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                    <Info className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                    <p className="text-xs font-semibold">No se encontraron preguntas de opción múltiple generadas en este plan de estudio.</p>
                    <p className="text-[11px] opacity-80">La IA del planificador genera exámenes que se pueden contestar en la pestaña "Ejercicios".</p>
                  </div>
                ) : answeredExercises.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 dark:text-slate-500 flex flex-col items-center gap-2">
                    <Target className="w-8 h-8 text-indigo-500" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Aún no has respondido ningún ejercicio de práctica.</p>
                    <p className="text-[11px] max-w-sm">Visita la sección de "Ejercicios y Exámenes" para contestar preguntas. Los resultados de tus aciertos se reflejarán aquí al instante.</p>
                  </div>
                ) : (
                  <>
                    <div className="w-full md:w-1/2 flex justify-center">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={exercisePieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {exercisePieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ 
                              backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                              borderColor: '#1e293b',
                              borderRadius: '12px',
                              color: '#f8fafc',
                              fontSize: '11px'
                            }}
                          />
                          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full md:w-1/2 space-y-4">
                      <h4 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resumen del Desempeño</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>Correctas:</span>
                          </span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{correctExercises.length} ({Math.round(correctExercises.length / answeredExercises.length * 100)}%)</span>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                            <span>Incorrectas:</span>
                          </span>
                          <span className="font-extrabold text-rose-500 dark:text-rose-400">{incorrectExercisesCount} ({Math.round(incorrectExercisesCount / answeredExercises.length * 100)}%)</span>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-bold text-slate-700 dark:text-slate-200">Total Respondidos:</span>
                          <span className="font-extrabold">{answeredExercises.length} / {mcqExercises.length}</span>
                        </div>

                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="font-bold text-slate-500">Aciertos Requeridos (Meta):</span>
                          <span className="font-extrabold text-amber-500">{plan.targetGrade}%</span>
                        </div>
                      </div>

                      {exerciseAccuracyRate >= plan.targetGrade ? (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 rounded-xl flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300">
                          <ThumbsUp className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                          <span>¡Felicidades! Estás logrando o superando tu meta académica de aciertos para tu examen.</span>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60 rounded-xl flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
                          <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                          <span>Tu tasa de aciertos actual está por debajo de tu meta ({plan.targetGrade}%). Te sugerimos repasar la pestaña "Trampas de Examen".</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Column: Interactive Controls for study logs or difficulty breakdown */}
        <div className="space-y-6">
          {/* Controls Block: Hour Log & Progress Status */}
          {activeTab === 'hours' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Registrar Horas Reales</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Personaliza la cantidad de horas reales dedicadas a cada día para obtener una gráfica precisa de tu esfuerzo de estudio.
              </p>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {schedule.map(day => {
                  const actual = getDayActualHours(day);
                  const isEditing = editingHoursDay === day.dayNumber;
                  return (
                    <div 
                      key={day.dayNumber}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">Día {day.dayNumber}: {day.title}</p>
                        <p className="text-[10px] text-slate-400">Meta: {day.estimatedHours}h</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="24"
                              value={tempHours}
                              onChange={(e) => setTempHours(e.target.value)}
                              className="w-14 px-1.5 py-1 text-xs text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-extrabold"
                            />
                            <button
                              onClick={() => {
                                const parsed = parseFloat(tempHours);
                                if (!isNaN(parsed)) {
                                  handleUpdateActualHours(day.dayNumber, parsed);
                                }
                                setEditingHoursDay(null);
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 rounded-md cursor-pointer hover:bg-indigo-700"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingHoursDay(null)}
                              className="px-1.5 py-1 text-[10px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                              {actual}h
                            </span>
                            <button
                              onClick={() => {
                                setEditingHoursDay(day.dayNumber);
                                setTempHours(String(actual));
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              title="Editar horas reales"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-500" />
                <span>Estado por Día</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                La tabla de abajo indica el nivel de finalización de las tareas por cada día del plan de estudio. Complete tareas en su cronograma para actualizar.
              </p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {stats.dayStats.map(day => (
                  <div 
                    key={day.dayNumber}
                    className="flex justify-between items-center text-xs py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0"
                  >
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Día {day.dayNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-blue-600 dark:text-blue-400">{day.percentage}%</span>
                      <span className="text-[10px] text-slate-400">({day.completedTasks}/{day.totalTasks} tareas)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'exercises' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Aciertos por Dificultad</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Breakdown analítico de tu tasa de aciertos según la dificultad de las preguntas que has contestado.
              </p>

              <div className="space-y-3">
                {difficultyStats.map(stat => (
                  <div key={stat.difficulty} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{stat.difficulty}</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">
                        {stat.Respondidos > 0 ? `${stat['Tasa de Aciertos (%)']}%` : 'Sin contestar'}
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          stat['Tasa de Aciertos (%)'] >= plan.targetGrade 
                            ? 'bg-emerald-500' 
                            : 'bg-amber-500'
                        }`}
                        style={{ width: stat.Respondidos > 0 ? `${stat['Tasa de Aciertos (%)']}%` : '0%' }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 leading-none">
                      <span>{stat.Respondidos} respondidos</span>
                      <span>Total: {stat.Total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tips / Recomendación de Estudio */}
          <div className="bg-gradient-to-tr from-blue-600/10 via-indigo-600/10 to-purple-600/10 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs space-y-2">
            <h4 className="font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 text-xs">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>Sugerencia Inteligente de Estudio</span>
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              {stats.percentage < 40 
                ? 'Concéntrate en completar tus tareas diarias en el cronograma. Cumplir con los plazos diarios garantiza un aprendizaje progresivo sin saturación.'
                : answeredExercises.length < 3
                ? '¡Ya llevas buen avance de estudio! Te recomendamos pasar a la pestaña de Ejercicios y Exámenes para empezar a autoevaluarte y fijar los conceptos.'
                : exerciseAccuracyRate < plan.targetGrade
                ? 'Tu tasa de aciertos es baja en comparación con tu meta. Trata de volver a repasar las Tarjetas de Memoria y la Guía de conceptos antes de reiniciar los cuestionarios.'
                : '¡Excelente rendimiento académico! Estás superando tu meta. Te aconsejamos usar el Tutor IA en preguntas libres para profundizar aún más en temas avanzados.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
