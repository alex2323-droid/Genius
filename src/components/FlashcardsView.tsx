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
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { Flashcard } from '../types/study.ts';

interface FlashcardsViewProps {
  flashcards: Flashcard[];
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ flashcards }) => {
  const [cards, setCards] = useState<Flashcard[]>(flashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [needsReviewCards, setNeedsReviewCards] = useState<Set<number>>(new Set());

  if (!cards || cards.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">No hay tarjetas de memoria disponibles para este plan.</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = Math.round((knownCards.size / cards.length) * 100);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Controls & Progress */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm flex items-center justify-between transition-colors gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tarjeta {currentIndex + 1} de {cards.length}
            </span>
            {currentCard.category && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50 truncate max-w-[120px]">
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
    </div>
  );
};
