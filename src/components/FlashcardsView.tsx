import React, { useState } from 'react';
import { 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Shuffle, 
  Sparkles, 
  Layers, 
  Award, 
  Calendar,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Flashcard, DailyScheduleDay, StudyPlan, Exercise } from '../types/study.ts';
import { getFlashcardsForDay } from '../utils/dayStudyMapping.ts';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
  schedule?: DailyScheduleDay[];
  selectedDayNumber?: number | 'all';
  onSelectDay?: (dayNumber: number | 'all') => void;
  plan?: StudyPlan | null;
  onUpdatePlan?: (updatedPlan: StudyPlan) => void;
  onNavigateTab?: (tab: 'schedule' | 'guide' | 'flashcards' | 'exercises', dayNumber?: number) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  flashcards,
  schedule = [],
  selectedDayNumber = 'all',
  onSelectDay,
  plan,
  onUpdatePlan,
  onNavigateTab,
}) => {
  const safeCards = Array.isArray(flashcards) ? flashcards : [];
  const { flashcards: filteredFlashcards, assignedDayMap: cardDayMap } = getFlashcardsForDay(
    safeCards,
    selectedDayNumber,
    schedule
  );

  const [cards, setCards] = useState<Flashcard[]>(filteredFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [needsReviewCards, setNeedsReviewCards] = useState<Set<number>>(new Set());
  const [isGeneratingMore, setIsGeneratingMore] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const activeDayInfo = typeof selectedDayNumber === 'number'
    ? schedule.find(d => d.dayNumber === selectedDayNumber) || null
    : null;

  React.useEffect(() => {
    setCards(filteredFlashcards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
    setNeedsReviewCards(new Set());
  }, [selectedDayNumber, flashcards]);

  const handleGenerateMoreForDay = async () => {
    if (typeof selectedDayNumber !== 'number' || !activeDayInfo || !plan || !onUpdatePlan) return;
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
          existingExercisesCount: plan.exercises?.length || 0,
          preferredProvider: plan.providerId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.practice) {
        throw new Error(data.error || 'No se pudieron generar nuevas tarjetas para este día.');
      }

      const newFlashcards: Flashcard[] = Array.isArray(data.practice.flashcards)
        ? data.practice.flashcards.map((fc: any, idx: number) => ({
            id: `fc-d${activeDayInfo.dayNumber}-${Date.now()}-${idx + 1}`,
            front: fc.front || '',
            back: fc.back || '',
            category: fc.category || activeDayInfo.title,
            dayNumber: activeDayInfo.dayNumber,
          }))
        : [];

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
      console.error('Error generating extra day flashcards:', err);
      setGenerateError(err.message || 'Error al generar más flashcards para este día.');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (cards.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % cards.length);
    }
  };

  const handlePrev = () => {
    setIsFlipped(false);
    if (cards.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCards([...cards].sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
  };

  const markKnown = () => {
    const nextSet = new Set(knownCards);
    nextSet.add(currentIndex);
    setKnownCards(nextSet);

    const reviewSet = new Set(needsReviewCards);
    reviewSet.delete(currentIndex);
    setNeedsReviewCards(reviewSet);

    if (nextSet.size === cards.length) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }

    handleNext();
  };

  const markNeedsReview = () => {
    const reviewSet = new Set(needsReviewCards);
    reviewSet.add(currentIndex);
    setNeedsReviewCards(reviewSet);

    const nextSet = new Set(knownCards);
    nextSet.delete(currentIndex);
    setKnownCards(nextSet);

    handleNext();
  };

  const currentCard = cards[currentIndex] || null;
  const assignedDay = currentCard ? (currentCard.dayNumber || (typeof selectedDayNumber === 'number' ? selectedDayNumber : 1)) : 1;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Day Selector Bar */}
      {schedule.length > 0 && onSelectDay && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs transition-colors">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Filtrar Flashcards por Día de Estudio (únicas por día):
            </span>
            {selectedDayNumber !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectDay('all')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Ver todas ({safeCards.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => onSelectDay('all')}
              className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                selectedDayNumber === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas ({safeCards.length})
            </button>
            {schedule.map((day) => {
              const isSelected = selectedDayNumber === day.dayNumber;
              const countForThisDay = safeCards.filter((_, i) => cardDayMap.get(i) === day.dayNumber).length;
              return (
                <button
                  key={day.dayNumber}
                  type="button"
                  onClick={() => onSelectDay(day.dayNumber)}
                  className={`px-3 py-1.5 min-h-[36px] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>Día {day.dayNumber}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                      isSelected
                        ? 'bg-blue-700 text-white'
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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white">
                  FLASHCARDS • DÍA {activeDayInfo.dayNumber}
                </span>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  {cards.length} tarjetas de memorización hoy
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {activeDayInfo.title}
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {plan && onUpdatePlan && (
                <button
                  type="button"
                  disabled={isGeneratingMore}
                  onClick={handleGenerateMoreForDay}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {isGeneratingMore ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Generando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Más tarjetas Día {activeDayInfo.dayNumber}</span>
                    </>
                  )}
                </button>
              )}

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('exercises', activeDayInfo.dayNumber)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  <span>Ejercicios del Día</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {generateError && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{generateError}</span>
          <button onClick={() => setGenerateError(null)} className="underline font-bold">Cerrar</button>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <p className="text-slate-500 dark:text-slate-400 text-sm">No hay tarjetas de memoria registradas para el Día {selectedDayNumber}.</p>
          {activeDayInfo && plan && onUpdatePlan && (
            <button
              type="button"
              onClick={handleGenerateMoreForDay}
              disabled={isGeneratingMore}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generar Flashcards exclusivas para el Día {activeDayInfo.dayNumber} con IA</span>
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Top Controls & Progress */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex items-center justify-between transition-colors gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                  Día {assignedDay}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Tarjeta {currentIndex + 1} de {cards.length}
                </span>
                {currentCard?.category && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 truncate max-w-[140px]">
                    {currentCard.category}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dominadas: <span className="font-bold text-emerald-600 dark:text-emerald-400">{knownCards.size}</span> | Repasar: <span className="font-bold text-amber-600 dark:text-amber-400">{needsReviewCards.size}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleShuffle}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer shrink-0 active:scale-95"
              title="Barajar tarjetas"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Barajar</span>
            </button>
          </div>

          {/* 3D Flip Card Container */}
          {currentCard && (
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full h-72 sm:h-80 perspective-1000 cursor-pointer select-none"
            >
              <div
                className={`relative w-full h-full rounded-2xl p-5 sm:p-8 border text-center transition-all duration-300 shadow-md flex flex-col justify-between active:scale-[0.99] ${
                  isFlipped
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50/80 dark:from-slate-900 dark:to-blue-950/50 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                {/* Card Top Pill */}
                <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                  <span className="font-semibold uppercase tracking-wider text-[11px] sm:text-xs">
                    {isFlipped ? '💡 Respuesta / Concepto' : '❓ Pregunta / Término'}
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium text-xs">
                    <RotateCw className="w-3.5 h-3.5" /> Girar
                  </span>
                </div>

                {/* Card Main Content */}
                <div className="my-auto overflow-y-auto max-h-48 py-2">
                  <p className={`font-bold leading-relaxed transition-all ${
                    isFlipped ? 'text-base sm:text-xl text-slate-800 dark:text-slate-200' : 'text-lg sm:text-2xl text-slate-900 dark:text-slate-100'
                  }`}>
                    {isFlipped ? currentCard.back : currentCard.front}
                  </p>
                </div>

                {/* Card Bottom Hint */}
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {isFlipped ? 'Toca para volver a la pregunta' : 'Toca para ver la respuesta'}
                </p>
              </div>
            </div>
          )}

          {/* Navigation & Knowledge Assessment */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <button
              type="button"
              onClick={handlePrev}
              className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Tarjeta anterior"
              aria-label="Tarjeta anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center">
              <button
                type="button"
                onClick={markNeedsReview}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 min-h-[48px] text-xs sm:text-sm font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-900/60 rounded-xl active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4 shrink-0" /> 
                <span>Repasar</span>
              </button>

              <button
                type="button"
                onClick={markKnown}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 min-h-[48px] text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-900/60 rounded-xl active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4 shrink-0" /> 
                <span>¡Dominada!</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shadow-xs"
              title="Siguiente tarjeta"
              aria-label="Siguiente tarjeta"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
