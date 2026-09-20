import React, { useState } from 'react';
import {
  Atom,
  GitMerge,
  Scale,
  Calculator,
  Quote,
  Volume2,
  HelpCircle,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  X,
  Layers,
  Workflow,
  Target,
  FileCode2,
  Stethoscope,
  BookOpen
} from 'lucide-react';
import type { CoreConcept, DocumentCitation, StudyPlan } from '../types/study.ts';
import { 
  sanitizeConceptExplanation, 
  sanitizeConceptExampleOrFormula 
} from '../utils/dayStudyMapping.ts';
import { resolveDocumentCitation } from '../utils/documentAnalyzer.ts';

interface ConceptCardProps {
  concept: CoreConcept;
  index: number;
  plan: StudyPlan;
  onAskTutor: (topic: string) => void;
  onStartAudioSummary: (trackId: string) => void;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  concept,
  index,
  plan,
  onAskTutor,
  onStartAudioSummary,
}) => {
  const [isCitationOpen, setIsCitationOpen] = useState(false);
  const [isCopiedCitation, setIsCopiedCitation] = useState(false);
  const [isCopiedExample, setIsCopiedExample] = useState(false);
  const [isExampleExpanded, setIsExampleExpanded] = useState(true);

  const dayNum = concept.dayNumber || 1;
  const citation = resolveDocumentCitation(concept, plan);
  const citationKey = `concept-${index}`;

  // Sanitize explanation to guarantee zero repetitive garbage or template leftovers
  const parsedExp = sanitizeConceptExplanation(
    concept.explanation || '', 
    concept.title, 
    plan?.subject || plan?.title || 'esta materia'
  );

  // Sanitize and structure the example or formula
  const parsedExample = sanitizeConceptExampleOrFormula(
    concept.exampleOrFormula || '', 
    concept.title, 
    plan?.subject || plan?.title || 'esta materia'
  );

  const handleCopyCitation = async () => {
    const textToCopy = `«${citation.exactQuote}»\n— Fuente Original: ${citation.fileName || 'Material del estudiante'} (${citation.sectionTitle || 'Sección'} • ${citation.pageOrSlide || 'Ubicación'})`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopiedCitation(true);
      setTimeout(() => setIsCopiedCitation(false), 2200);
    } catch (e) {
      console.error('Failed to copy citation:', e);
    }
  };

  const handleCopyExample = async () => {
    try {
      await navigator.clipboard.writeText(parsedExample.content);
      setIsCopiedExample(true);
      setTimeout(() => setIsCopiedExample(false), 2200);
    } catch (e) {
      console.error('Failed to copy example:', e);
    }
  };

  // Helper to format step-by-step paragraphs cleanly
  const formatMechanismSteps = (text: string) => {
    // If text has numbered steps or multiple sentences, split them
    const sentences = text
      .split(/(?<=[.?!])\s+(?=[A-ZÁÉÍÓÚÑ0-9\d])/)
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length > 1) {
      return (
        <div className="space-y-2.5">
          {sentences.map((step, sIdx) => (
            <div key={sIdx} className="flex items-start gap-2.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] shrink-0 mt-0.5 border border-indigo-200 dark:border-indigo-800">
                {sIdx + 1}
              </span>
              <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                {step}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return (
      <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
        {text}
      </p>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white shadow-xs">
              Día {dayNum}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                concept.importance === 'critical'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/60'
                  : concept.importance === 'high'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {concept.importance === 'critical' ? '⚡ Imprescindible' : concept.importance === 'high' ? '🔥 Alto Impacto' : '✨ Complementario'}
            </span>
          </div>
          <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-slate-100 leading-snug">
            {concept.title}
          </h4>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onStartAudioSummary(`track-concept-${index}-${concept.title}`)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Escuchar explicación en voz alta"
            aria-label={`Escuchar explicación de ${concept.title}`}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsCitationOpen(!isCitationOpen)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isCitationOpen
                ? 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-slate-800'
            }`}
            title="Ver cita textual del documento"
            aria-label={`Ver cita al documento de ${concept.title}`}
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onAskTutor(concept.title)}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Preguntar al tutor IA"
            aria-label={`Preguntar al tutor sobre ${concept.title}`}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Citation Drawer */}
      {isCitationOpen && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-xs">
          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-amber-200/80 dark:border-amber-900/60">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-xs">
              <Quote className="w-3.5 h-3.5 text-amber-600" />
              <span>Cita Verificada: {citation.fileName || 'Material del curso'}</span>
              {citation.pageOrSlide && (
                <span className="px-1.5 py-0.5 rounded bg-amber-200/60 dark:bg-amber-900/60 text-[10px]">
                  {citation.pageOrSlide}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCopyCitation}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 rounded-lg border border-amber-200 dark:border-amber-800 transition cursor-pointer"
              >
                {isCopiedCitation ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar Cita</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setIsCitationOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative pl-3.5 pr-3 py-2 my-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border-l-3 border-amber-500 text-slate-800 dark:text-slate-100 text-xs font-medium leading-relaxed italic">
            «{citation.exactQuote}»
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-1 text-[11px]">
            <div className="p-2 rounded-lg bg-amber-100/50 dark:bg-amber-950/40 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                📑 Sección / Ubicación:
              </span>
              <span>{citation.sectionTitle || 'Temario del curso'}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-100/50 dark:bg-amber-950/40 text-slate-700 dark:text-slate-300">
              <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                🎯 Justificación Académica:
              </span>
              <span>{citation.relevance || 'Fundamento literal extraído del documento del estudiante.'}</span>
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 1: ¿Qué es y de qué trata? (Fundamento Central) */}
      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/50 mb-3.5 transition-colors">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-200 text-xs sm:text-sm">
            <Atom className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>¿Qué es y de qué trata?</span>
          </div>
          <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
            Definición & Fundamento
          </span>
        </div>
        <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
          {parsedExp.whatIs}
        </p>
      </div>

      {/* DUAL-COLUMN GRID: ¿Cómo funciona? vs ¿Por qué importa en el examen? */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
        {/* PILLAR 2: ¿Cómo funciona / Paso a paso? */}
        <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-indigo-200/60 dark:border-indigo-800/40">
              <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm">
                <Workflow className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>¿Cómo funciona / Paso a paso?</span>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-md">
                Mecanismo
              </span>
            </div>
            {formatMechanismSteps(parsedExp.howWorks)}
          </div>
        </div>

        {/* PILLAR 3: ¿Por qué importa en el examen? */}
        <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/50 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-emerald-200/60 dark:border-emerald-800/40">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>¿Por qué importa en el examen?</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
                Foco Evaluativo
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                {parsedExp.whyMatters}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PILLAR 4: Structured Ejemplo / Fórmula Card */}
      {parsedExample.content && (
        <div className="rounded-xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-2xs hover:border-blue-200 dark:hover:border-blue-900/60">
          <div 
            onClick={() => setIsExampleExpanded(!isExampleExpanded)}
            className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors select-none"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                parsedExample.type === 'formula' 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40'
              }`}>
                {parsedExample.type === 'formula' ? (
                  <Calculator className="w-4 h-4" />
                ) : parsedExample.type === 'clinical_case' ? (
                  <Stethoscope className="w-4 h-4" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
              </div>
              <div>
                <span className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block tracking-tight">
                  {parsedExample.type === 'formula' ? 'Fórmula y Expresión Matemática' : 'Caso de Estudio y Aplicación Práctica'}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">
                  {parsedExample.title || 'Demostración paso a paso'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleCopyExample}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Copiar contenido"
              >
                {isCopiedExample ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsExampleExpanded(!isExampleExpanded)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                aria-label="Alternar visualización de ejemplo"
              >
                {isExampleExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isExampleExpanded && (
            <div className="p-4 pt-1.5 border-t border-slate-200/60 dark:border-slate-800/80">
              {parsedExample.type === 'formula' ? (
                <div className="space-y-3">
                  {/* Premium Math formula container */}
                  <div className="relative p-4 rounded-xl bg-gradient-to-r from-indigo-50/50 to-blue-50/30 dark:from-indigo-950/20 dark:to-blue-950/10 border border-indigo-100 dark:border-indigo-950 text-indigo-950 dark:text-indigo-200 font-mono text-sm sm:text-base font-black tracking-wide text-center flex items-center justify-center min-h-[64px] shadow-2xs select-all">
                    <span className="break-all">{parsedExample.syntax || parsedExample.content}</span>
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-100/50 dark:bg-slate-900/30 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-200/50 dark:border-slate-800/40">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">💡 Guía de Aplicación en Evaluaciones:</span>
                    Aplica directamente este principio cuantitativo para resolver problemas y preguntas tipo test de este módulo. Verifica siempre las unidades y variables de entrada recomendadas en los apuntes del curso.
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal shadow-2xs select-text">
                    {parsedExample.content}
                  </div>
                  <div className="p-3.5 rounded-lg bg-slate-100/50 dark:bg-slate-900/30 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border border-slate-200/50 dark:border-slate-800/40">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 block mb-1">🔍 Análisis del Caso Práctico:</span>
                    Este ejemplo ilustra la aplicación del concepto teórico en un escenario real del material del estudiante, ayudando a consolidar el entendimiento empírico de la materia.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
