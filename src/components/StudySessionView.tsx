import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Circle, 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Flame, 
  Clock, 
  Maximize2, 
  Minimize2, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Layers, 
  HelpCircle,
  FileCheck,
  Check,
  Headphones,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { StudyPlan, DailyTask } from '../types/study.ts';
import { audioSynth } from '../utils/audioSynth.ts';

interface StudySessionViewProps {
  plan: StudyPlan;
  initialDayNumber?: number;
  initialTaskId?: string;
  onExitSession: () => void;
  onUpdatePlan: (updatedPlan: StudyPlan) => void;
  onNavigateTab?: (tab: 'schedule' | 'guide' | 'flashcards' | 'exercises', dayNumber?: number) => void;
}

type PomodoroMode = 'work' | 'shortBreak' | 'longBreak' | 'custom';

export const StudySessionView: React.FC<StudySessionViewProps> = ({
  plan,
  initialDayNumber,
  initialTaskId,
  onExitSession,
  onUpdatePlan,
  onNavigateTab,
}) => {
  const schedule = Array.isArray(plan.schedule) ? plan.schedule : [];

  // Find all tasks with their dayNumber
  const allTasksWithDay: Array<{ dayNumber: number; dayTitle: string; task: DailyTask }> = [];
  schedule.forEach(day => {
    (day.tasks || []).forEach(task => {
      allTasksWithDay.push({
        dayNumber: day.dayNumber,
        dayTitle: day.title || `Día ${day.dayNumber}`,
        task,
      });
    });
  });

  // Determine initial index
  const getInitialTaskIndex = (): number => {
    if (initialTaskId) {
      const idx = allTasksWithDay.findIndex(t => t.task.id === initialTaskId);
      if (idx !== -1) return idx;
    }
    if (typeof initialDayNumber === 'number') {
      const idx = allTasksWithDay.findIndex(t => t.dayNumber === initialDayNumber && !t.task.completed);
      if (idx !== -1) return idx;
      const dayIdx = allTasksWithDay.findIndex(t => t.dayNumber === initialDayNumber);
      if (dayIdx !== -1) return dayIdx;
    }
    // Find first uncompleted task across entire plan
    const uncompletedIdx = allTasksWithDay.findIndex(t => !t.task.completed);
    return uncompletedIdx !== -1 ? uncompletedIdx : 0;
  };

  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(getInitialTaskIndex);
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>('work');
  const [pomodoroCount, setPomodoroCount] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAmbientSoundOn, setIsAmbientSoundOn] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(false);

  // Timer settings in seconds
  const modeDurations: Record<PomodoroMode, number> = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
    custom: 30 * 60,
  };

  const currentTaskItem = allTasksWithDay[currentTaskIndex] || null;
  const currentTask = currentTaskItem?.task || null;
  const currentDayNumber = currentTaskItem?.dayNumber || 1;

  // Adapt custom mode to task's estimated time
  const taskMinutes = currentTask?.timeMinutes || 25;
  const initialTime = pomodoroMode === 'custom' ? taskMinutes * 60 : modeDurations[pomodoroMode];

  const [timeLeft, setTimeLeft] = useState<number>(initialTime);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Synchronize timer when changing mode or custom duration
  useEffect(() => {
    setIsRunning(false);
    if (pomodoroMode === 'custom') {
      setTimeLeft(taskMinutes * 60);
    } else {
      setTimeLeft(modeDurations[pomodoroMode]);
    }
  }, [pomodoroMode, currentTaskIndex]);

  // Main countdown loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, pomodoroMode]);

  // Cleanup ambient sound on unmount
  useEffect(() => {
    return () => {
      audioSynth.toggleFocusNoise(false);
    };
  }, []);

  const handleTimerComplete = () => {
    audioSynth.playCompletionChime();

    if (pomodoroMode === 'work' || pomodoroMode === 'custom') {
      const nextCount = pomodoroCount + 1;
      setPomodoroCount(nextCount);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      // Suggest break
      if (nextCount % 4 === 0) {
        setPomodoroMode('longBreak');
      } else {
        setPomodoroMode('shortBreak');
      }
    } else {
      setPomodoroMode('work');
    }
  };

  const toggleTimer = () => {
    audioSynth.playClickTick();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    audioSynth.playClickTick();
    setIsRunning(false);
    if (pomodoroMode === 'custom') {
      setTimeLeft(taskMinutes * 60);
    } else {
      setTimeLeft(modeDurations[pomodoroMode]);
    }
  };

  const toggleAmbientSound = () => {
    const nextState = !isAmbientSoundOn;
    setIsAmbientSoundOn(nextState);
    audioSynth.toggleFocusNoise(nextState);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Toggle current task completion
  const handleToggleCurrentTask = () => {
    if (!currentTask) return;
    const isDone = !currentTask.completed;
    audioSynth.playClickTick();

    if (isDone) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    }

    let totalTasks = 0;
    let completedTasks = 0;

    const newSchedule = schedule.map(day => {
      const dayTasks = (day.tasks || []).map(t => {
        totalTasks++;
        if (t.id === currentTask.id) {
          if (isDone) completedTasks++;
          return { ...t, completed: isDone };
        }
        if (t.completed) completedTasks++;
        return t;
      });
      return { ...day, tasks: dayTasks };
    });

    const newProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    onUpdatePlan({
      ...plan,
      schedule: newSchedule,
      progress: newProgress,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleNextTask = () => {
    if (currentTaskIndex < allTasksWithDay.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const handlePrevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(currentTaskIndex - 1);
    }
  };

  // Time calculations
  const totalDuration = pomodoroMode === 'custom' ? taskMinutes * 60 : modeDurations[pomodoroMode];
  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, ((totalDuration - timeLeft) / totalDuration) * 100)) : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const completedTasksCount = allTasksWithDay.filter(t => t.task.completed).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-y-auto selection:bg-blue-600 selection:text-white">
      {/* Immersive Top Bar */}
      <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-exit-study-session"
            onClick={onExitSession}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 border border-slate-700/60"
            title="Volver al plan completo"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Salir de Sesión</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800/60 font-black text-[11px]">
              DÍA {currentDayNumber}
            </span>
            <span className="font-semibold text-slate-200 truncate max-w-xs">{plan.title}</span>
          </div>
        </div>

        {/* Right Session Controls */}
        <div className="flex items-center gap-2">
          {/* Ambient Rain / Focus Noise Toggle */}
          <button
            type="button"
            onClick={toggleAmbientSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              isAmbientSoundOn
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-xs'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/50'
            }`}
            title="Ruido ambiental de enfoque (100% offline)"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAmbientSoundOn ? 'Sonido Enfoque: ON' : 'Sonido Enfoque'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs transition-all cursor-pointer border border-slate-700/50"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Focus Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl w-full mx-auto my-auto space-y-6 sm:space-y-8">
        
        {/* Mode Selector Pill */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner max-w-md w-full justify-center">
          {[
            { id: 'work', label: 'Pomodoro (25m)' },
            { id: 'shortBreak', label: 'Descanso (5m)' },
            { id: 'longBreak', label: 'Largo (15m)' },
            { id: 'custom', label: `Tarea (${taskMinutes}m)` },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setPomodoroMode(mode.id as PomodoroMode)}
              className={`flex-1 py-1.5 px-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all cursor-pointer ${
                pomodoroMode === mode.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Current Task Spotlight Card */}
        {currentTask && (
          <div className="w-full bg-gradient-to-b from-slate-900 to-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
            {/* Progress line indicator inside task card */}
            <div 
              className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-600 text-white">
                  Día {currentDayNumber}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700/60 uppercase">
                  {currentTask.type === 'read' ? 'Lectura' :
                   currentTask.type === 'practice' ? 'Ejercicios' :
                   currentTask.type === 'memorize' ? 'Memorización' :
                   currentTask.type === 'review' ? 'Repaso' : 'Simulacro'}
                </span>
                <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {currentTask.timeMinutes} min programados
                </span>
              </div>

              {/* Task index selector */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handlePrevTask}
                  disabled={currentTaskIndex === 0}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition cursor-pointer"
                  title="Tarea anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-400">
                  {currentTaskIndex + 1} / {allTasksWithDay.length}
                </span>
                <button
                  type="button"
                  onClick={handleNextTask}
                  disabled={currentTaskIndex === allTasksWithDay.length - 1}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition cursor-pointer"
                  title="Siguiente tarea"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task Headline */}
            <div className="py-4">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5">
                Tarea Activa de Estudio:
              </p>
              <h2 className={`text-lg sm:text-2xl font-bold leading-relaxed ${
                currentTask.completed ? 'line-through text-slate-400' : 'text-slate-100'
              }`}>
                {currentTask.task}
              </h2>
            </div>

            {/* Mark Task Complete Big Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800/80">
              <button
                type="button"
                id="btn-complete-task-in-session"
                onClick={handleToggleCurrentTask}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95 shadow-md ${
                  currentTask.completed
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {currentTask.completed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>¡Tarea Marcada como Completada!</span>
                  </>
                ) : (
                  <>
                    <Circle className="w-5 h-5 text-slate-400" />
                    <span>Marcar Tarea como Hecha</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    showNotes || sessionNotes
                      ? 'bg-slate-800 text-blue-400 border-blue-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/50'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{showNotes ? 'Ocultar Notas' : 'Bloc de Notas'}</span>
                </button>

                {currentTaskIndex < allTasksWithDay.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNextTask}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Session Scratchpad */}
            {showNotes && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 animate-in fade-in duration-200">
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Escribe tus apuntes rápidos o dudas durante esta sesión..."
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none font-sans"
                />
              </div>
            )}
          </div>
        )}

        {/* Big Pomodoro Circular Clock Display */}
        <div className="flex flex-col items-center justify-center space-y-5">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
            {/* Circular SVG Progress Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-slate-800/80"
                strokeWidth="6"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                className={`transition-all duration-1000 ${
                  pomodoroMode === 'shortBreak' || pomodoroMode === 'longBreak'
                    ? 'text-emerald-500'
                    : 'text-blue-500'
                }`}
                strokeWidth="6"
                strokeDasharray={276.46}
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            {/* Inner Digits */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className="text-5xl sm:text-6xl font-mono font-black tracking-tight text-white drop-shadow-md">
                {formattedTime}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2 flex items-center gap-1.5">
                {pomodoroMode === 'work' ? (
                  <>
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Enfoque Profundo</span>
                  </>
                ) : pomodoroMode === 'custom' ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tiempo de Tarea</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tiempo de Descanso</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Play / Pause / Reset Controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              id="btn-pomodoro-reset"
              onClick={resetTimer}
              className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
              title="Reiniciar temporizador"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              type="button"
              id="btn-pomodoro-play-pause"
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all cursor-pointer active:scale-90 ${
                isRunning
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                  : 'bg-gradient-to-tr from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white shadow-blue-600/30'
              }`}
              title={isRunning ? 'Pausar' : 'Iniciar'}
            >
              {isRunning ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 ml-0.5 fill-current" />}
            </button>

            <button
              type="button"
              id="btn-pomodoro-complete-chime"
              onClick={handleTimerComplete}
              className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 flex items-center justify-center transition cursor-pointer active:scale-95"
              title="Finalizar bloque / Siguiente descanso"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>

          {/* Pomodoro Session counter */}
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-900/80 px-4 py-1.5 rounded-full border border-slate-800">
            <span>🍅 Pomodoros completados:</span>
            <span className="text-white font-bold">{pomodoroCount}</span>
            <span className="text-slate-600">•</span>
            <span>Tareas listas:</span>
            <span className="text-emerald-400 font-bold">{completedTasksCount}/{allTasksWithDay.length}</span>
          </div>
        </div>

      </div>
    </div>
  );
};
