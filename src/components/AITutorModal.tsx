import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, Lightbulb, BookOpen, MessageSquare } from 'lucide-react';

interface AITutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopic: string;
  context: string;
}

export const AITutorModal: React.FC<AITutorModalProps> = ({
  isOpen,
  onClose,
  initialTopic,
  context,
}) => {
  const [topic, setTopic] = useState(initialTopic);
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTopic && isOpen) {
      setTopic(initialTopic);
      handleExplain(initialTopic);
    }
  }, [initialTopic, isOpen]);

  const handleExplain = async (queryTopic: string) => {
    if (!queryTopic.trim()) return;
    setLoading(true);
    setError(null);
    setExplanation(null);

    try {
      const res = await fetch('/api/explain-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: queryTopic,
          context,
        }),
      });
      const data = await res.json();
      if (data.success && data.explanation) {
        setExplanation(data.explanation);
      } else {
        setError(data.error || 'No se pudo generar la explicación.');
      }
    } catch (err: any) {
      setError('Error al contactar con el tutor.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">Tutor Académico IA</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Explicaciones claras y analogías</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer -mr-2"
            aria-label="Cerrar modal de tutor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Query input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExplain(topic);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="¿Qué concepto te cuesta entender?"
              className="flex-1 px-3.5 py-2.5 min-h-[44px] text-base sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="px-4 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Explicar</span>
            </button>
          </form>

          {/* Loading state */}
          {loading && (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                El tutor está analizando el concepto y redactando una explicación didáctica...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Explanation content */}
          {explanation && !loading && (
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3 text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                <Lightbulb className="w-4 h-4" /> Explicación Didáctica
              </div>
              <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200">
                {explanation}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
