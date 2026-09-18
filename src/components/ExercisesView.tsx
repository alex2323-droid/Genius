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
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { StudyPlan, Exercise } from '../types/study.ts';

interface ExercisesViewProps {
  plan: StudyPlan;
  onSaveQuizResult?: (result: {
    score: number;
    total: number;
    percentage: number;
  }) => void;
}

export const ExercisesView: React.FC<ExercisesViewProps> = ({
  plan,
  onSaveQuizResult,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [openEvaluations, setOpenEvaluations] = useState<Record<string, any>>({});
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});
  const [isExamMode, setIsExamMode] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const exercises = plan.exercises;

  const handleSelectOption = (exerciseId: string, option: string) => {
    if (submitted && isExamMode) return;
    setSelectedAnswers(prev => ({ ...prev, [exerciseId]: option }));
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

  // Calculate score for MCQs
  const mcqExercises = exercises.filter(e => e.type === 'mcq' || e.type === 'true_false');
  let correctCount = 0;
  mcqExercises.forEach(e => {
    if (selectedAnswers[e.id] === e.correctAnswer) {
      correctCount++;
    }
  });

  const mcqPercentage = mcqExercises.length > 0 
    ? Math.round((correctCount / mcqExercises.length) * 100) 
    : 0;

  const handleFinishExam = () => {
    setSubmitted(true);
    if (mcqPercentage >= plan.targetGrade) {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }
    if (onSaveQuizResult) {
      onSaveQuizResult({
        score: correctCount,
        total: mcqExercises.length,
        percentage: mcqPercentage,
      });
    }
  };

  const handleReset = () => {
    setSelectedAnswers({});
    setOpenAnswers({});
    setOpenEvaluations({});
    setShowHints({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-6">
      {/* Exercise Mode Selector & Stats Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                Banco de Práctica
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {exercises.length} preguntas calibradas ({plan.targetGrade}%)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              Ejercicios y Simulacro
            </h2>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={() => {
                setIsExamMode(!isExamMode);
                setSubmitted(false);
              }}
              className={`flex-1 sm:flex-initial px-3.5 py-2.5 min-h-[44px] text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                isExamMode
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {isExamMode ? '⏱️ Simulacro Activo' : '💡 Práctica Libre'}
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

        {/* Results Banner (when submitted or in free practice) */}
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

      {/* Exercises List */}
      <div className="space-y-5">
        {exercises.map((exercise, index) => {
          const isMCQ = exercise.type === 'mcq' || exercise.type === 'true_false';
          const selectedOption = selectedAnswers[exercise.id];
          const hasSelected = selectedOption !== undefined;
          const showAnswerFeedback = !isExamMode ? hasSelected : submitted;
          const isCorrect = selectedOption === exercise.correctAnswer;
          const showHint = showHints[exercise.id];
          const openEval = openEvaluations[exercise.id];

          return (
            <div
              key={exercise.id || index}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      exercise.difficulty === 'advanced'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                        : exercise.difficulty === 'intermediate'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    Nivel: {exercise.difficulty === 'advanced' ? 'Avanzado' :
                            exercise.difficulty === 'intermediate' ? 'Intermedio' : 'Básico'}
                  </span>
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
              {isMCQ && exercise.options && (
                <div className="space-y-2 sm:space-y-2.5">
                  {exercise.options.map((option, optIdx) => {
                    const isSelected = selectedOption === option;
                    let optionStyle = 'border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200';

                    if (showAnswerFeedback) {
                      if (option === exercise.correctAnswer) {
                        optionStyle = 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-semibold';
                      } else if (isSelected && !isCorrect) {
                        optionStyle = 'border-red-400 dark:border-red-500 bg-red-50/80 dark:bg-red-950/50 text-red-950 dark:text-red-200';
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
                        className={`w-full text-left p-3 sm:p-3.5 min-h-[48px] rounded-xl border text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <span className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 text-xs font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-snug">{option}</span>
                        </div>

                        {showAnswerFeedback && option === exercise.correctAnswer && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                        )}
                        {showAnswerFeedback && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-red-500 dark:text-red-400 shrink-0 ml-2" />
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

              {/* Explanation section (for MCQs when answered) */}
              {isMCQ && showAnswerFeedback && exercise.explanation && (
                <div className="mt-3.5 p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                  <p className="font-bold text-slate-900 dark:text-slate-100 mb-0.5">Explicación Paso a Paso:</p>
                  <p className="leading-relaxed">{exercise.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Finish Exam Button in Exam Mode */}
      {isExamMode && !submitted && (
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
