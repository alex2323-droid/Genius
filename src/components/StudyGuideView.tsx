import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  Bookmark, 
  Lightbulb, 
  FileText,
  Search
} from 'lucide-react';
import type { StudyPlan, CoreConcept } from '../types/study.ts';

interface StudyGuideViewProps {
  plan: StudyPlan;
  onAskTutor: (topic: string) => void;
}

export const StudyGuideView: React.FC<StudyGuideViewProps> = ({
  plan,
  onAskTutor,
}) => {
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'concepts' | 'formulas' | 'traps'>('all');

  const { studyGuide } = plan;

  const handleCopyGuide = () => {
    let text = `# Guía de Estudio: ${plan.title}\n\n`;
    text += `## Resumen Ejecutivo\n${studyGuide.executiveSummary}\n\n`;
    text += `## Conceptos Fundamentales\n`;
    studyGuide.coreConcepts.forEach(c => {
      text += `### ${c.title} [Importancia: ${c.importance}]\n${c.explanation}\n`;
      if (c.exampleOrFormula) text += `*Ejemplo / Fórmula:* ${c.exampleOrFormula}\n`;
      text += `\n`;
    });
    text += `## Fórmulas y Definiciones Clave\n`;
    studyGuide.keyDefinitionsAndFormulas.forEach(f => {
      text += `- **${f.term}**: ${f.definition}`;
      if (f.formulaOrSyntax) text += ` (Fórmula: \`${f.formulaOrSyntax}\`)`;
      text += `\n`;
    });
    text += `\n## Trampas Comunes en el Examen\n`;
    studyGuide.commonExamTraps.forEach(t => {
      text += `- ⚠️ ${t}\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter concepts
  const filteredConcepts = studyGuide.coreConcepts.filter(c => 
    c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.explanation.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredFormulas = studyGuide.keyDefinitionsAndFormulas.filter(f =>
    f.term.toLowerCase().includes(searchFilter.toLowerCase()) ||
    f.definition.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredTraps = studyGuide.commonExamTraps.filter(t =>
    t.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Guide Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/50">
                <BookOpen className="w-3.5 h-3.5" /> Guía Completa de Repaso
              </span>
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                Meta: {plan.targetGrade}%
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
              Conceptos, Fórmulas y Trampas
            </h2>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <button
              type="button"
              onClick={handleCopyGuide}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer active:scale-98"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>¡Guía Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Copiar Guía Completa</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Executive summary */}
        <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
          <p className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" /> Resumen Ejecutivo de Alto Rendimiento
          </p>
          <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-200 leading-relaxed">
            {studyGuide.executiveSummary}
          </p>
        </div>

        {/* Filter bar */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1">
            {[
              { id: 'all', label: 'Todo' },
              { id: 'concepts', label: `Conceptos (${studyGuide.coreConcepts.length})` },
              { id: 'formulas', label: `Fórmulas (${studyGuide.keyDefinitionsAndFormulas.length})` },
              { id: 'traps', label: `Trampas (${studyGuide.commonExamTraps.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-3 py-2 min-h-[40px] text-xs font-semibold rounded-xl sm:rounded-lg transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95 ${
                  activeCategory === tab.id
                    ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar conceptos, trampas..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 min-h-[42px] text-base sm:text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Section 1: Core Concepts */}
      {(activeCategory === 'all' || activeCategory === 'concepts') && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Conceptos Fundamentales
          </h3>

          <div className="grid grid-cols-1 gap-4">
            {filteredConcepts.map((concept, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                      {concept.title}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        concept.importance === 'critical'
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                          : concept.importance === 'high'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {concept.importance === 'critical' ? 'Pregunta Frecuente' :
                       concept.importance === 'high' ? 'Importancia Alta' : 'Importancia Media'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onAskTutor(concept.title)}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 min-h-[38px] text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" /> Explicar con Tutor IA
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {concept.explanation}
                </p>

                {concept.exampleOrFormula && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Ejemplo / Fórmula: </span>
                    <span className="text-slate-600 dark:text-slate-400 font-mono break-all">{concept.exampleOrFormula}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Formulas & Definitions */}
      {(activeCategory === 'all' || activeCategory === 'formulas') && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Fórmulas y Definiciones Clave
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredFormulas.map((item, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    {item.term}
                  </h4>
                  <button
                    type="button"
                    onClick={() => onAskTutor(item.term)}
                    className="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 active:text-blue-600 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Preguntar al tutor"
                    aria-label={`Preguntar al tutor sobre ${item.term}`}
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                  {item.definition}
                </p>
                {item.formulaOrSyntax && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 text-xs font-mono font-bold text-indigo-900 dark:text-indigo-300">
                    {item.formulaOrSyntax}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Exam Traps */}
      {(activeCategory === 'all' || activeCategory === 'traps') && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" /> Trampas y Errores Típicos en el Examen
          </h3>

          <div className="grid grid-cols-1 gap-3">
            {filteredTraps.map((trap, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-400 uppercase">Trampa de Examen #{idx + 1}</p>
                  <p className="text-sm text-amber-950 dark:text-amber-200 mt-0.5 leading-relaxed">
                    {trap}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
