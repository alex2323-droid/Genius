import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Sparkles, 
  RotateCcw, 
  Award, 
  Send, 
  AlertCircle,
  Lightbulb,
  Clock,
  Check,
  Calendar,
  Layers,
  ArrowRight,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { StudyPlan, Exercise, Flashcard } from '../types/study.ts';
import { getExercisesForDay } from '../utils/dayStudyMapping.ts';

interface ExercisesViewProps {
  plan: StudyPlan;
  selectedDayNumber?: number | 'all';
  onSelectDay?: (dayNumber: number | 'all') => void;
  onUpdatePlan?: (updatedPlan: StudyPlan) => void;
  onSaveQuizResult?: (result: {
    score: number;
    total: number;
    percentage: number;
  }) => void;
  onNavigateTab?: (tab: 'schedule' | 'guide' | 'flashcards' | 'exercises', dayNumber?: number) => void;
}

export const ExercisesView: React.FC<ExercisesViewProps> = ({
  plan,
  selectedDayNumber = 'all',
  onSelectDay,
  onUpdatePlan,
  onSaveQuizResult,
  onNavigateTab,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (plan && Array.isArray(plan.exercises)) {
      plan.exercises.forEach(ex => {
        if (ex.userAnswer) {
          initial[ex.id] = ex.userAnswer;
        }
      });
    }
    return initial;
  });
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [openEvaluations, setOpenEvaluations] = useState<Record<string, any>>({});
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [isExamMode, setIsExamMode] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(() => {
    // If we already have answered exercises, let's mark it as submitted to show feedback
    if (plan && Array.isArray(plan.exercises)) {
      return plan.exercises.some(ex => ex.userAnswer !== undefined);
    }
    return false;
  });
  const [isGeneratingMore, setIsGeneratingMore] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'basic' | 'intermediate' | 'advanced' | 'mastery'>('all');

  // Countdown Timer States for Exam Mode
  const [hasTimeLimit, setHasTimeLimit] = useState<boolean>(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(300); // Default 5 minutes
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const rawExercises = Array.isArray(plan?.exercises) ? plan.exercises : [];
  const schedule = Array.isArray(plan?.schedule) ? plan.schedule : [];

  // Stable Fisher-Yates shuffle algorithm for client-side display with re-mapping of correctAnswer
  const fisherYatesShuffleOptions = React.useCallback((
    options: string[],
    correctAnswer: string
  ): { options: string[]; correctAnswer: string } => {
    if (!Array.isArray(options) || options.length < 2) {
      return { options: options || [], correctAnswer };
    }

    const rawCorrect = String(correctAnswer).trim();
    const stripPrefix = (str: string) =>
      str.replace(/^(?:Opción\s+[A-Da-d1-4]|Opci[oó]n\s+[A-Da-d1-4]|[A-Da-d1-4])\s*[\)\.\:\-]\s*/i, '').trim();

    const cleanOptions = options.map(o => stripPrefix(String(o)));
    const cleanCorrect = stripPrefix(rawCorrect);

    let correctIdx = cleanOptions.findIndex(
      (opt) => opt.toLowerCase() === cleanCorrect.toLowerCase() ||
               opt === rawCorrect ||
               stripPrefix(opt) === stripPrefix(rawCorrect)
    );

    if (correctIdx === -1) {
      correctIdx = cleanOptions.findIndex(
        (opt) => opt.length > 5 && (opt.includes(cleanCorrect) || cleanCorrect.includes(opt))
      );
    }

    if (correctIdx === -1) {
      correctIdx = options.findIndex((opt) => String(opt).toLowerCase() === rawCorrect.toLowerCase());
    }

    const correctItem = correctIdx !== -1 ? options[correctIdx] : correctAnswer;

    // Perform standard Fisher-Yates Shuffle algorithm
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Ensure correctAnswer is always present in the shuffled list
    if (!shuffled.includes(correctItem)) {
      shuffled[Math.floor(Math.random() * shuffled.length)] = correctItem;
    }

    return {
      options: shuffled,
      correctAnswer: correctItem,
    };
  }, []);

  // Memoize shuffled options mapped by exercise ID so they don't shuffle during re-renders
  const shuffledExercisesMap = React.useMemo(() => {
    const map: Record<string, { options: string[]; correctAnswer: string }> = {};
    rawExercises.forEach((ex) => {
      if (ex.type === 'mcq' && Array.isArray(ex.options) && ex.options.length > 0) {
        map[ex.id] = fisherYatesShuffleOptions(ex.options, ex.correctAnswer || '');
      } else {
        map[ex.id] = {
          options: ex.options || [],
          correctAnswer: ex.correctAnswer || '',
        };
      }
    });
    return map;
  }, [rawExercises, fisherYatesShuffleOptions]);

  // Filter exercises strictly matching the selected study day
  const { exercises: dayExercises, assignedDayMap: exerciseDayMap } = getExercisesForDay(
    rawExercises,
    selectedDayNumber,
    schedule
  );

  // Apply difficulty filtering on top of selected study day exercises
  const filteredExercises = React.useMemo(() => {
    if (difficultyFilter === 'all') return dayExercises;
    return dayExercises.filter(ex => ex.difficulty === difficultyFilter);
  }, [dayExercises, difficultyFilter]);

  const activeDayInfo = typeof selectedDayNumber === 'number'
    ? schedule.find(d => d.dayNumber === selectedDayNumber) || null
    : null;

  const handleSelectOption = (exerciseId: string, option: string) => {
    if (submitted && isExamMode) return;
    
    setSelectedAnswers(prev => {
      const nextAnswers = { ...prev, [exerciseId]: option };
      
      // Update plan exercises reactively in non-exam mode immediately
      if (!isExamMode && onUpdatePlan) {
        const updatedExercises = plan.exercises.map(ex => {
          if (ex.id === exerciseId) {
            const activeCorrect = shuffledExercisesMap[ex.id]?.correctAnswer || ex.correctAnswer;
            return {
              ...ex,
              userAnswer: option,
              isCorrect: option === activeCorrect,
            };
          }
          return ex;
        });
        setTimeout(() => {
          onUpdatePlan({
            ...plan,
            exercises: updatedExercises,
            updatedAt: new Date().toISOString()
          });
        }, 30);
      }
      
      return nextAnswers;
    });
  };

  const handleToggleHint = (exerciseId: string) => {
    setShowHints(prev => ({ ...prev, [exerciseId]: !prev[exerciseId] }));
  };

  // Evaluate open-ended answer with AI
  const handleEvaluateOpenAnswer = async (exercise: Exercise) => {
    const studentText = openAnswers[exercise.id];
    if (!studentText || !studentText.trim()) return;

    try {
      setEvaluatingId(exercise.id);
      const res = await fetch('/api/grade-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: exercise.question,
          studentAnswer: studentText,
          expectedAnswer: exercise.correctAnswer || exercise.explanation,
          targetGrade: plan.targetGrade,
        }),
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setOpenEvaluations(prev => ({
          ...prev,
          [exercise.id]: data.evaluation,
        }));
      }
    } catch (err) {
      console.error('Error evaluating open answer:', err);
    } finally {
      setEvaluatingId(null);
    }
  };

  // Generate brand-new exclusive exercises and flashcards for this specific day
  const handleGenerateMoreForDay = async () => {
    if (typeof selectedDayNumber !== 'number' || !activeDayInfo || !onUpdatePlan) return;
    setIsGeneratingMore(true);
    setGenerateError(null);

    try {
      const res = await fetch('/api/generate-day-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: plan.subject,
          dayNumber: activeDayInfo.dayNumber,
          dayTitle: activeDayInfo.title,
          dayFocus: activeDayInfo.focus,
          dayObjectives: activeDayInfo.objectives || [],
          targetGrade: plan.targetGrade,
          existingExercisesCount: dayExercises.length,
          preferredProvider: plan.providerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.practice) {
        throw new Error(data.error || 'No se pudieron generar nuevos ejercicios para este día.');
      }

      const newExs: Exercise[] = Array.isArray(data.practice.exercises)
        ? data.practice.exercises.map((e: any, idx: number) => ({
            id: `ex-d${activeDayInfo.dayNumber}-${Date.now()}-${idx + 1}`,
            type: e.type || 'mcq',
            difficulty: e.difficulty || 'intermediate',
            dayNumber: activeDayInfo.dayNumber,
            question: e.question || '',
            options: Array.isArray(e.options) ? e.options : [],
            correctAnswer: e.correctAnswer || '',
            explanation: e.explanation || '',
            hint: e.hint || '',
            points: typeof e.points === 'number' ? e.points : 10,
          }))
        : [];

      const newFlashcards: Flashcard[] = Array.isArray(data.practice.flashcards)
        ? data.practice.flashcards.map((fc: any, idx: number) => ({
            id: `fc-d${activeDayInfo.dayNumber}-${Date.now()}-${idx + 1}`,
            front: fc.front || '',
            back: fc.back || '',
            category: fc.category || activeDayInfo.title,
            dayNumber: activeDayInfo.dayNumber,
          }))
        : [];

      const updatedPlan: StudyPlan = {
        ...plan,
        exercises: [...(plan.exercises || []), ...newExs],
        studyGuide: {
          ...plan.studyGuide,
          flashcards: [...(plan.studyGuide?.flashcards || []), ...newFlashcards],
        },
        updatedAt: new Date().toISOString(),
      };

      onUpdatePlan(updatedPlan);
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } catch (err: any) {
      console.error('Error generating extra day exercises:', err);
      setGenerateError(err.message || 'Error al generar más preguntas para este día.');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  // Calculate score for MCQs within current filtered set
  const mcqExercises = dayExercises.filter(e => e.type === 'mcq' || e.type === 'true_false');
  let correctCount = 0;
  mcqExercises.forEach(e => {
    const activeCorrectAnswer = shuffledExercisesMap[e.id]?.correctAnswer || e.correctAnswer;
    if (selectedAnswers[e.id] === activeCorrectAnswer) {
      correctCount++;
    }
  });

  const mcqPercentage = mcqExercises.length > 0 
    ? Math.round((correctCount / mcqExercises.length) * 100) 
    : 0;

  const handleFinishExam = () => {
    setSubmitted(true);
    setIsTimerRunning(false);
    if (mcqPercentage >= plan.targetGrade) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }

    // Save all answers in the plan's exercises list so it gets persisted
    if (onUpdatePlan) {
      const updatedExercises = plan.exercises.map(ex => {
        // If it's part of dayExercises, update it. If not, keep original.
        const dayExIds = dayExercises.map(de => de.id);
        if (dayExIds.includes(ex.id)) {
          const selectedOpt = selectedAnswers[ex.id];
          if (selectedOpt !== undefined) {
            const activeCorrect = shuffledExercisesMap[ex.id]?.correctAnswer || ex.correctAnswer;
            return {
              ...ex,
              userAnswer: selectedOpt,
              isCorrect: selectedOpt === activeCorrect,
            };
          }
        }
        return ex;
      });

      onUpdatePlan({
        ...plan,
        exercises: updatedExercises,
        updatedAt: new Date().toISOString()
      });
    }

    if (onSaveQuizResult) {
      onSaveQuizResult({
        score: correctCount,
        total: mcqExercises.length,
        percentage: mcqPercentage,
      });
    }
  };

  // Timer Countdown Effect
  React.useEffect(() => {
    let timerId: any = null;
    if (isExamMode && isTimerRunning && hasTimeLimit && timeLeft > 0 && !submitted) {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            // Automatic finalization when countdown reaches 0
            setSubmitted(true);
            setIsTimerRunning(false);
            
            // Save answers automatically on timeout
            if (onUpdatePlan) {
              const updatedExercises = plan.exercises.map(ex => {
                const dayExIds = dayExercises.map(de => de.id);
                if (dayExIds.includes(ex.id)) {
                  const selectedOpt = selectedAnswers[ex.id];
                  if (selectedOpt !== undefined) {
                    const activeCorrect = shuffledExercisesMap[ex.id]?.correctAnswer || ex.correctAnswer;
                    return {
                      ...ex,
                      userAnswer: selectedOpt,
                      isCorrect: selectedOpt === activeCorrect,
                    };
                  }
                }
                return ex;
              });

              onUpdatePlan({
                ...plan,
                exercises: updatedExercises,
                updatedAt: new Date().toISOString()
              });
            }

            if (onSaveQuizResult) {
              onSaveQuizResult({
                score: correctCount,
                total: mcqExercises.length,
                percentage: mcqPercentage,
              });
            }

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isExamMode, isTimerRunning, hasTimeLimit, timeLeft, submitted, plan, dayExercises, selectedAnswers, shuffledExercisesMap, correctCount, mcqExercises.length, mcqPercentage, onUpdatePlan, onSaveQuizResult]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setOpenAnswers({});
    setOpenEvaluations({});
    setShowHints({});
    setSubmitted(false);
    setIsTimerRunning(false);
    setTimeLeft(0);

    // Clear answers from the plan
    if (onUpdatePlan) {
      const updatedExercises = plan.exercises.map(ex => {
        const dayExIds = dayExercises.map(de => de.id);
        if (dayExIds.includes(ex.id)) {
          const { userAnswer, isCorrect, ...rest } = ex;
          return rest as Exercise;
        }
        return ex;
      });

      onUpdatePlan({
        ...plan,
        exercises: updatedExercises,
        updatedAt: new Date().toISOString()
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Day Selector Bar */}
      {schedule.length > 0 && onSelectDay && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs transition-colors">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Selecciona el Día de Estudio (ejercicios únicos por día):
            </span>
            {selectedDayNumber !== 'all' && (
              <button
                type="button"
                onClick={() => {
                  onSelectDay('all');
                  setSubmitted(false);
                }}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Ver banco completo ({rawExercises.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                onSelectDay('all');
                setSubmitted(false);
              }}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                selectedDayNumber === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos los Días ({rawExercises.length})
            </button>
            {schedule.map((day) => {
              const isSelected = selectedDayNumber === day.dayNumber;
              const countForThisDay = rawExercises.filter((e, i) => exerciseDayMap.get(e.id || `ex-${i}`) === day.dayNumber).length;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => {
                    onSelectDay(day.dayNumber);
                    setSubmitted(false);
                  }}
                  className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Día {day.dayNumber}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                      isSelected
                        ? 'bg-indigo-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {countForThisDay}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Day Info Banner */}
      {activeDayInfo && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50/80 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-200/80 dark:border-indigo-900/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-200/60 dark:border-indigo-900/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-600 text-white">
                  EJERCICIOS • DÍA {activeDayInfo.dayNumber}
                </span>
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                  {dayExercises.length} preguntas exclusivas de este día
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {activeDayInfo.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onUpdatePlan && (
                <button
                  type="button"
                  disabled={isGeneratingMore}
                  onClick={handleGenerateMoreForDay}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-900 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {isGeneratingMore ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Generando preguntas...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Generar más preguntas para el Día {activeDayInfo.dayNumber}</span>
                    </>
                  )}
                </button>
              )}

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('guide', activeDayInfo.dayNumber)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 border border-indigo-200 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>Guía del Día</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="mt-2.5 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-bold text-indigo-950 dark:text-indigo-200">Temario específico evaluado hoy: </span>
            {activeDayInfo.focus}
          </p>
        </div>
      )}

      {generateError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{generateError}</span>
          <button onClick={() => setGenerateError(null)} className="underline font-bold">Cerrar</button>
        </div>
      )}

      {/* Exercise Mode Selector & Stats Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                {selectedDayNumber === 'all' ? 'Banco General de Práctica' : `Preguntas del Día ${selectedDayNumber}`}
              </span>

              {/* Target Grade Calibrated Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black flex items-center gap-1 border ${
                plan.targetGrade >= 90
                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                  : plan.targetGrade >= 75
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}>
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {plan.targetGrade >= 90
                    ? `Dificultad Excelencia / Máster (${plan.targetGrade}%)`
                    : plan.targetGrade >= 75
                    ? `Dificultad Intermedia / Notable (${plan.targetGrade}%)`
                    : `Dificultad Base / Fundamental (${plan.targetGrade}%)`}
                </span>
              </span>

              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                • {dayExercises.length} preguntas
              </span>

              {plan.materialComplexity && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                  <span>Escalado: {plan.materialComplexity.tierLabel}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              {isExamMode ? 'Simulacro Cronometrado' : 'Práctica Guiada con Explicaciones'}
            </h2>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => {
                const nextMode = !isExamMode;
                setIsExamMode(nextMode);
                setSubmitted(false);
                if (!nextMode) {
                  setIsTimerRunning(false);
                  setTimeLeft(0);
                }
              }}
              className={`flex-1 sm:flex-initial px-3.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                isExamMode
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isExamMode ? '⏱️ Modo Simulacro' : '💡 Modo Práctica'}
            </button>

            {(Object.keys(selectedAnswers).length > 0 || submitted) && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer active:scale-95"
                title="Reiniciar respuestas"
              >
                <RotateCcw className="w-3.5 h-3.5" /> 
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Timer Setup and Configuration Banner */}
        {isExamMode && !submitted && !isTimerRunning && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Configuración del Simulacro de Examen</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pon a prueba tus conocimientos en un simulacro real. Puedes establecer un límite de tiempo estricto que entregará tus respuestas de forma automática cuando expire.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTimeLimit}
                  onChange={(e) => setHasTimeLimit(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span>Límetro regresivo</span>
              </label>

              {hasTimeLimit && (
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-100 font-semibold"
                >
                  <option value={60}>1 minuto (Prueba rápida)</option>
                  <option value={300}>5 minutos</option>
                  <option value={600}>10 minutos</option>
                  <option value={900}>15 minutos</option>
                  <option value={1800}>30 minutos</option>
                  <option value={3600}>60 minutos</option>
                </select>
              )}

              <button
                type="button"
                onClick={() => {
                  if (hasTimeLimit) {
                    setTimeLeft(selectedDuration);
                  }
                  setIsTimerRunning(true);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                🚀 Comenzar Simulacro
              </button>
            </div>
          </div>
        )}

        {/* Live Active Timer Banner */}
        {isExamMode && !submitted && isTimerRunning && (
          <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
            hasTimeLimit && timeLeft <= 60
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 animate-pulse text-red-900 dark:text-red-200'
              : 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-150 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                hasTimeLimit && timeLeft <= 60 ? 'bg-red-200 dark:bg-red-900 text-red-800' : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600'
              }`}>
                <Clock className="w-5 h-5 shrink-0" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">
                  {hasTimeLimit ? 'Examen en Progreso (Cronometrado)' : 'Examen en Progreso (Práctica libre)'}
                </p>
                <p className="text-[11px] opacity-80 mt-0.5">
                  Preguntas respondidas: {Object.keys(selectedAnswers).filter(id => dayExercises.some(de => de.id === id)).length} de {dayExercises.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {hasTimeLimit ? (
                <div className="flex flex-col items-end">
                  <span className={`text-2xl font-black tracking-tight font-mono ${
                    timeLeft <= 30 ? 'text-red-600 dark:text-red-400' : ''
                  }`}>
                    {formatTime(timeLeft)}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-75">Tiempo restante</span>
                </div>
              ) : (
                <span className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-xs font-bold">
                  Sin límite de tiempo
                </span>
              )}

              <button
                type="button"
                onClick={handleFinishExam}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
              >
                Entregar Examen
              </button>
            </div>
          </div>
        )}

        {/* Results Banner (when submitted) */}
        {submitted && (
          <div className="mt-4 sm:mt-5 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                  mcqPercentage >= plan.targetGrade
                    ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                    : 'bg-amber-600 text-white shadow-amber-500/20'
                }`}
              >
                {mcqPercentage}%
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {mcqPercentage >= plan.targetGrade
                    ? '🎉 ¡Alcanzaste tu meta de nota!'
                    : '📈 Cerca de tu meta. Revisa los fallos.'}
                </p>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Aciertos: {correctCount} de {mcqExercises.length}. Meta deseada: {plan.targetGrade}%.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-xs font-bold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-xl shadow-sm cursor-pointer flex items-center justify-center active:scale-95"
            >
              Intentar de Nuevo
            </button>
          </div>
        )}
      </div>

      {/* Difficulty Filter Selectors */}
      {dayExercises.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 border-b border-slate-150 dark:border-slate-800/60">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0 mr-1.5">
            Filtrar nivel:
          </span>
          <button
            type="button"
            onClick={() => setDifficultyFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              difficultyFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            Todos ({dayExercises.length})
          </button>
          <button
            type="button"
            onClick={() => setDifficultyFilter('basic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              difficultyFilter === 'basic'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            Básico ({dayExercises.filter(e => e.difficulty === 'basic').length})
          </button>
          <button
            type="button"
            onClick={() => setDifficultyFilter('intermediate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              difficultyFilter === 'intermediate'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            Intermedio ({dayExercises.filter(e => e.difficulty === 'intermediate').length})
          </button>
          <button
            type="button"
            onClick={() => setDifficultyFilter('advanced')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              difficultyFilter === 'advanced'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            Avanzado ({dayExercises.filter(e => e.difficulty === 'advanced').length})
          </button>
          <button
            type="button"
            onClick={() => setDifficultyFilter('mastery')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              difficultyFilter === 'mastery'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750'
            }`}
          >
            Máster ({dayExercises.filter(e => e.difficulty === 'mastery').length})
          </button>
        </div>
      )}

      {/* Exercises List */}
      <div className="space-y-5">
        {isExamMode && !isTimerRunning && !submitted ? (
          <div className="p-8 sm:p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-800 text-slate-500 space-y-4 flex flex-col items-center justify-center min-h-[350px]">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center animate-bounce">
              <Clock className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                ⏱️ Simulacro de Examen Preparado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                El modo simulacro desactiva las explicaciones de respuestas inmediatas y las pistas para simular condiciones de evaluación reales. Configura tu temporizador y presiona el botón inferior para revelar el examen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (hasTimeLimit) {
                  setTimeLeft(selectedDuration);
                }
                setIsTimerRunning(true);
              }}
              className="px-6 py-3.5 text-xs font-black uppercase text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-2xl shadow-md hover:scale-102 active:scale-98 transition-all cursor-pointer"
            >
              Comenzar Simulacro de Examen
            </button>
          </div>
        ) : dayExercises.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 space-y-3">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No hay ejercicios registrados para el Día {selectedDayNumber}.
            </p>
            {activeDayInfo && onUpdatePlan && (
              <button
                type="button"
                onClick={handleGenerateMoreForDay}
                disabled={isGeneratingMore}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generar ejercicios exclusivos para el Día {activeDayInfo.dayNumber} con IA</span>
              </button>
            )}
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 space-y-3">
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No hay ejercicios de dificultad "{
                difficultyFilter === 'basic' ? 'Básico' :
                difficultyFilter === 'intermediate' ? 'Intermedio' :
                difficultyFilter === 'advanced' ? 'Avanzado' : 'Máster'
              }" registrados para hoy.
            </p>
            <button
              type="button"
              onClick={() => setDifficultyFilter('all')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Mostrar todos los niveles ({dayExercises.length})
            </button>
          </div>
        ) : (
          filteredExercises.map((exercise, index) => {
            const isMCQ = exercise.type === 'mcq' || exercise.type === 'true_false';
            const selectedOption = selectedAnswers[exercise.id];
            const hasSelected = selectedOption !== undefined;
            const showAnswerFeedback = !isExamMode ? hasSelected : submitted;

            const shuffledData = shuffledExercisesMap[exercise.id];
            const optionsToRender = shuffledData?.options || exercise.options || [];
            const activeCorrectAnswer = shuffledData?.correctAnswer || exercise.correctAnswer || '';
            const isCorrect = selectedOption === activeCorrectAnswer;

            const showHint = showHints[exercise.id];
            const openEval = openEvaluations[exercise.id];
            const assignedDay = exerciseDayMap.get(exercise.id || `ex-${index}`) || 1;

            return (
              <div
                key={exercise.id || index}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                      Día {assignedDay}
                    </span>
                    <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        exercise.difficulty === 'mastery'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60'
                          : exercise.difficulty === 'advanced'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/80 dark:border-purple-900/60'
                          : exercise.difficulty === 'intermediate'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/60'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-900/60'
                      }`}
                    >
                      {exercise.difficulty === 'mastery' ? '🔥 Máster (Multivariable / Casos)' :
                       exercise.difficulty === 'advanced' ? 'Avanzado (Sobresaliente 90%+)' :
                       exercise.difficulty === 'intermediate' ? 'Intermedio (Notable 75%+)' : 'Fundamental (Aprobado Base)'}
                    </span>

                    {exercise.cognitiveLevel && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/60">
                        {exercise.cognitiveLevel === 'analysis' ? 'Análisis Crítico' : exercise.cognitiveLevel === 'evaluation' ? 'Evaluación y Síntesis' : 'Aplicación Práctica'}
                      </span>
                    )}
                  </div>

                  {exercise.hint && (
                    <button
                      type="button"
                      onClick={() => handleToggleHint(exercise.id)}
                      className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium cursor-pointer py-1 px-1.5 rounded-lg active:bg-amber-50 dark:active:bg-amber-950/40"
                    >
                      <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                      <span>{showHint ? 'Ocultar' : 'Pista'}</span>
                    </button>
                  )}
                </div>

                {/* Enunciado */}
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-snug mb-3.5">
                  {exercise.question}
                </h4>

                {/* Hint Callout */}
                {showHint && exercise.hint && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Pista: </span>
                      <span>{exercise.hint}</span>
                    </div>
                  </div>
                )}

                {/* MCQ Options */}
                {isMCQ && optionsToRender.length > 0 && (
                  <div className="space-y-2 sm:space-y-2.5">
                    {optionsToRender.map((option, optIdx) => {
                      const isSelected = selectedOption === option;
                      let optionStyle = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-all duration-300';

                      if (showAnswerFeedback) {
                        if (option === activeCorrectAnswer) {
                          optionStyle = 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-semibold ring-2 ring-emerald-500/30 dark:ring-emerald-400/20 scale-[1.01] animate-[pulse_2s_infinite]';
                        } else if (isSelected && !isCorrect) {
                          optionStyle = 'border-rose-500 dark:border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-200 ring-2 ring-rose-500/30 dark:ring-rose-400/20 scale-[0.99]';
                        } else {
                          optionStyle = 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 text-slate-400 dark:text-slate-500 opacity-60';
                        }
                      } else if (isSelected) {
                        optionStyle = 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 text-blue-950 dark:text-blue-200 font-semibold ring-1 ring-blue-600';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(exercise.id, option)}
                          className={`w-full text-left p-3 sm:p-3.5 min-h-[48px] rounded-xl border text-xs sm:text-sm flex items-center justify-between cursor-pointer active:scale-[0.98] ${optionStyle}`}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <span className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="leading-snug">{option}</span>
                          </div>

                          {showAnswerFeedback && option === activeCorrectAnswer && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 animate-bounce" />
                          )}
                          {showAnswerFeedback && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Open-ended question response */}
                {!isMCQ && (
                  <div className="space-y-3">
                    <textarea
                      rows={3}
                      value={openAnswers[exercise.id] || ''}
                      onChange={(e) => setOpenAnswers({ ...openAnswers, [exercise.id]: e.target.value })}
                      placeholder="Escribe tu respuesta y justificación..."
                      className="w-full p-3.5 text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />

                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={evaluatingId === exercise.id || !openAnswers[exercise.id]}
                        onClick={() => handleEvaluateOpenAnswer(exercise)}
                        className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer active:scale-95"
                      >
                        {evaluatingId === exercise.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            <span>Evaluando con IA...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                            <span>Evaluar mi respuesta con IA</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Open Answer AI Feedback */}
                    {openEval && (
                      <div className="mt-3 p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">Calificación del Tutor IA:</span>
                          <span className="px-2 py-0.5 rounded text-xs font-black bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300">
                            {openEval.scoreOutOf10} / 10
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {openEval.feedback}
                        </p>
                        {openEval.modelAnswer && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <span className="font-bold text-emerald-800 dark:text-emerald-400">Respuesta Modelo Óptima: </span>
                            <span className="text-slate-700 dark:text-slate-300">{openEval.modelAnswer}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Immediate Learning Feedback & Explanation for MCQs */}
                {isMCQ && showAnswerFeedback && (
                  <div className={`mt-4 p-4 rounded-xl border transition-all duration-300 text-xs sm:text-sm animate-[fadeIn_0.3s_ease-out] ${
                    isCorrect
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-50/30 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/40 text-rose-950 dark:text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2 mb-2.5">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-black text-xs uppercase tracking-wide">
                            ¡RESPUESTA CORRECTA! Excelente análisis.
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
                          <span className="font-black text-xs uppercase tracking-wide">
                            RESPUESTA INCORRECTA • Revisa la explicación para asimilar este concepto
                          </span>
                        </>
                      )}
                    </div>

                    {exercise.explanation && (
                      <div className="pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800/80">
                        <p className="font-bold text-slate-900 dark:text-slate-100 mb-1">🔬 Explicación y Justificación Académica:</p>
                        <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-line">{exercise.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Finish Exam Button in Exam Mode */}
      {isExamMode && !submitted && dayExercises.length > 0 && (
        <div className="text-center pt-2 sm:pt-4">
          <button
            type="button"
            onClick={handleFinishExam}
            className="w-full sm:w-auto px-8 py-3.5 min-h-[48px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center mx-auto"
          >
            Entregar Simulacro y Ver Calificación
          </button>
        </div>
      )}
    </div>
  );
};
