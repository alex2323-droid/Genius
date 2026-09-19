import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  AlertTriangle, 
  Sparkles, 
  Copy, 
  Check, 
  Bookmark, 
  Lightbulb, 
  FileText,
  Search,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Edit3,
  Trash2,
  Plus,
  Loader2,
  Save,
  X,
  RefreshCw,
  Award
} from 'lucide-react';
import type { StudyPlan, CoreConcept, DefinitionOrFormula, ExamTrapItem } from '../types/study.ts';
import {
  getConceptsForDay,
  getFormulasForDay,
  getTrapsForDay,
  type MappedTrap
} from '../utils/dayStudyMapping.ts';

interface StudyGuideViewProps {
  plan: StudyPlan;
  selectedDayNumber?: number | 'all';
  onSelectDay?: (dayNumber: number | 'all') => void;
  onAskTutor: (topic: string) => void;
  onNavigateTab?: (tab: 'schedule' | 'guide' | 'flashcards' | 'exercises' | 'traps', dayNumber?: number) => void;
  onUpdatePlan?: (updatedPlan: StudyPlan) => void;
  initialCategory?: 'all' | 'concepts' | 'formulas' | 'traps';
}

export const StudyGuideView: React.FC<StudyGuideViewProps> = ({
  plan,
  selectedDayNumber = 'all',
  onSelectDay,
  onAskTutor,
  onNavigateTab,
  onUpdatePlan,
  initialCategory = 'all',
}) => {
  const [copied, setCopied] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'concepts' | 'formulas' | 'traps'>(initialCategory);

  // Sync activeCategory if initialCategory changes
  React.useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);
  const [trapFilterStatus, setTrapFilterStatus] = useState<'all' | 'pending' | 'mastered'>('all');
  const [masteredTrapIndices, setMasteredTrapIndices] = useState<number[]>([]);
  
  // Trap creation / editing states
  const [editingTrapOriginalIndex, setEditingTrapOriginalIndex] = useState<number | null>(null);
  const [editMistake, setEditMistake] = useState('');
  const [editCorrection, setEditCorrection] = useState('');
  const [editWhyItMatters, setEditWhyItMatters] = useState('');
  const [editDayNumber, setEditDayNumber] = useState<number>(1);
  
  const [isAddingTrap, setIsAddingTrap] = useState(false);
  const [newMistake, setNewMistake] = useState('');
  const [newCorrection, setNewCorrection] = useState('');
  const [newWhyItMatters, setNewWhyItMatters] = useState('');
  const [newDayNumber, setNewDayNumber] = useState<number>(
    typeof selectedDayNumber === 'number' ? selectedDayNumber : 1
  );

  const [isGeneratingTraps, setIsGeneratingTraps] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const toggleMasteredTrap = (originalIndex: number) => {
    setMasteredTrapIndices(prev => 
      prev.includes(originalIndex) ? prev.filter(i => i !== originalIndex) : [...prev, originalIndex]
    );
  };

  const studyGuide = plan.studyGuide || {
    executiveSummary: '',
    coreConcepts: [],
    keyDefinitionsAndFormulas: [],
    commonExamTraps: [],
    flashcards: [],
  };

  const schedule = Array.isArray(plan?.schedule) ? plan.schedule : [];
  const rawConcepts = Array.isArray(studyGuide.coreConcepts) ? studyGuide.coreConcepts : [];
  const rawFormulas = Array.isArray(studyGuide.keyDefinitionsAndFormulas) ? studyGuide.keyDefinitionsAndFormulas : [];
  const rawTraps = Array.isArray(studyGuide.commonExamTraps) ? studyGuide.commonExamTraps : [];

  // Filter & sort items strictly according to the selected study day and in chronological day order
  const { concepts: dayConcepts } = getConceptsForDay(
    rawConcepts,
    selectedDayNumber,
    schedule
  );
  const { formulas: dayFormulas } = getFormulasForDay(
    rawFormulas,
    selectedDayNumber,
    schedule
  );
  const { mappedTraps: dayMappedTraps } = getTrapsForDay(
    rawTraps,
    selectedDayNumber,
    schedule
  );

  // Active day info if a specific day is selected
  const activeDayInfo = typeof selectedDayNumber === 'number'
    ? schedule.find(d => d.dayNumber === selectedDayNumber) || null
    : null;

  // Save edited trap to plan
  const handleSaveEditTrap = (originalIndex: number) => {
    if (!onUpdatePlan) return;
    const updatedRawTraps = [...rawTraps];
    const targetTrap = updatedRawTraps[originalIndex];

    const updatedItem: ExamTrapItem = {
      id: typeof targetTrap === 'object' && targetTrap?.id ? targetTrap.id : `trap-${originalIndex + 1}`,
      mistake: editMistake.trim() || 'Error común de examen',
      correction: editCorrection.trim(),
      whyItMatters: editWhyItMatters.trim() || undefined,
      dayNumber: editDayNumber,
    };

    updatedRawTraps[originalIndex] = updatedItem;

    const updatedPlan: StudyPlan = {
      ...plan,
      studyGuide: {
        ...studyGuide,
        commonExamTraps: updatedRawTraps,
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
    setEditingTrapOriginalIndex(null);
  };

  // Start editing a trap
  const handleStartEdit = (trap: MappedTrap) => {
    setEditingTrapOriginalIndex(trap.originalIndex);
    setEditMistake(trap.mistake || trap.text);
    setEditCorrection(trap.correction || '');
    setEditWhyItMatters(trap.whyItMatters || '');
    setEditDayNumber(trap.dayNumber);
  };

  // Delete trap
  const handleDeleteTrap = (originalIndex: number) => {
    if (!onUpdatePlan) return;
    const updatedRawTraps = rawTraps.filter((_, idx) => idx !== originalIndex);
    const updatedPlan: StudyPlan = {
      ...plan,
      studyGuide: {
        ...studyGuide,
        commonExamTraps: updatedRawTraps,
      },
      updatedAt: new Date().toISOString(),
    };
    onUpdatePlan(updatedPlan);
  };

  // Add new custom trap
  const handleAddNewTrap = () => {
    if (!newMistake.trim() || !onUpdatePlan) return;
    const newTrap: ExamTrapItem = {
      id: `trap-custom-${Date.now()}`,
      mistake: newMistake.trim(),
      correction: newCorrection.trim(),
      whyItMatters: newWhyItMatters.trim() || undefined,
      dayNumber: newDayNumber,
    };

    const updatedRawTraps = [...rawTraps, newTrap];
    const updatedPlan: StudyPlan = {
      ...plan,
      studyGuide: {
        ...studyGuide,
        commonExamTraps: updatedRawTraps,
      },
      updatedAt: new Date().toISOString(),
    };

    onUpdatePlan(updatedPlan);
    setNewMistake('');
    setNewCorrection('');
    setNewWhyItMatters('');
    setIsAddingTrap(false);
  };

  // Generate more traps with AI
  const handleGenerateTrapsWithAI = async () => {
    setIsGeneratingTraps(true);
    setGenerateError(null);

    const targetDay = typeof selectedDayNumber === 'number' ? selectedDayNumber : 1;
    const currentDaySchedule = schedule.find(d => d.dayNumber === targetDay);

    try {
      const response = await fetch('/api/generate-traps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: plan.subject || plan.title,
          dayNumber: targetDay,
          dayTitle: currentDaySchedule?.title || `Día ${targetDay}`,
          context: `${plan.strategySummary || ''} ${currentDaySchedule?.focus || ''}`,
          preferredProvider: plan.providerId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al generar trampas con IA');
      }

      const data = await response.json();
      const generatedList = Array.isArray(data?.traps) ? data.traps : [];

      if (generatedList.length > 0 && onUpdatePlan) {
        const formatted = generatedList.map((t: any, i: number) => ({
          id: t?.id || `trap-ai-${Date.now()}-${i}`,
          mistake: t?.mistake || t?.text || 'Error común de examen',
          correction: t?.correction || '',
          whyItMatters: t?.whyItMatters || undefined,
          dayNumber: targetDay,
        }));

        const updatedPlan: StudyPlan = {
          ...plan,
          studyGuide: {
            ...studyGuide,
            commonExamTraps: [...rawTraps, ...formatted],
          },
          updatedAt: new Date().toISOString(),
        };

        onUpdatePlan(updatedPlan);
      }
    } catch (err: any) {
      console.error('Error generating traps:', err);
      setGenerateError(err.message || 'No se pudieron generar trampas adicionales');
    } finally {
      setIsGeneratingTraps(false);
    }
  };

  const handleCopyGuide = () => {
    let text = `# Guía de Estudio: ${plan.title}\n\n`;
    if (activeDayInfo) {
      text += `## Enfoque de Estudio: Día ${activeDayInfo.dayNumber} - ${activeDayInfo.title}\n`;
      text += `*Enfoque:* ${activeDayInfo.focus}\n\n`;
    }
    text += `## Resumen Ejecutivo\n${studyGuide.executiveSummary || ''}\n\n`;
    text += `## Conceptos Fundamentales (Ordenados por Día)\n`;
    dayConcepts.forEach(c => {
      text += `### [Día ${c.dayNumber || 1}] ${c.title} [Importancia: ${c.importance}]\n${c.explanation}\n`;
      if (c.exampleOrFormula) text += `*Ejemplo / Fórmula:* ${c.exampleOrFormula}\n`;
      text += `\n`;
    });
    text += `## Fórmulas y Definiciones Clave (Ordenadas por Día)\n`;
    dayFormulas.forEach(f => {
      text += `- **[Día ${f.dayNumber || 1}] ${f.term}**: ${f.definition}`;
      if (f.formulaOrSyntax) text += ` (Fórmula: \`${f.formulaOrSyntax}\`)`;
      text += `\n`;
    });
    text += `\n## Trampas Comunes en el Examen\n`;
    dayMappedTraps.forEach(t => {
      text += `- ⚠️ [Día ${t.dayNumber}] ${t.mistake || t.text}`;
      if (t.correction) text += ` → Corrección: ${t.correction}`;
      if (t.whyItMatters) text += ` (${t.whyItMatters})`;
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Search filters
  const query = (searchFilter || '').toLowerCase().trim();
  const filteredConcepts = dayConcepts.filter(c => 
    (c.title || '').toLowerCase().includes(query) ||
    (c.explanation || '').toLowerCase().includes(query)
  );

  const filteredFormulas = dayFormulas.filter(f =>
    (f.term || '').toLowerCase().includes(query) ||
    (f.definition || '').toLowerCase().includes(query)
  );

  const filteredTraps = dayMappedTraps.filter(t => {
    const matchesSearch = 
      (t.text || '').toLowerCase().includes(query) ||
      (t.mistake || '').toLowerCase().includes(query) ||
      (t.correction || '').toLowerCase().includes(query) ||
      (t.whyItMatters || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    const isMastered = masteredTrapIndices.includes(t.originalIndex);
    if (trapFilterStatus === 'pending') return !isMastered;
    if (trapFilterStatus === 'mastered') return isMastered;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Day Selector Bar */}
      {schedule.length > 0 && onSelectDay && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 sm:p-3 shadow-xs transition-colors">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Filtrar contenido por Día de Estudio (en orden cronológico):
            </span>
            {selectedDayNumber !== 'all' && (
              <button
                type="button"
                onClick={() => onSelectDay('all')}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Ver todo el temario en orden
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
              Todos los Días ({rawConcepts.length} conceptos)
            </button>
            {schedule.map((day) => {
              const isSelected = selectedDayNumber === day.dayNumber;
              const countForThisDay = rawConcepts.filter((c) => (c.dayNumber || 1) === day.dayNumber).length;
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

      {/* Active Day Detail Banner (when specific day is selected) */}
      {activeDayInfo && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-200/60 dark:border-blue-900/50">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white">
                  DÍA {activeDayInfo.dayNumber}
                </span>
                <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  {activeDayInfo.estimatedHours}h estimadas
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                {activeDayInfo.title}
              </h3>
            </div>

            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('exercises', activeDayInfo.dayNumber)}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-200 dark:border-slate-700 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <span>Ejercicios de este Día</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-950">
              <span className="font-bold text-blue-950 dark:text-blue-200 block mb-0.5">Enfoque principal:</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{activeDayInfo.focus}</p>
            </div>
            {activeDayInfo.objectives && activeDayInfo.objectives.length > 0 && (
              <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-blue-100 dark:border-blue-950">
                <span className="font-bold text-blue-950 dark:text-blue-200 block mb-0.5">Objetivos del día:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                  {activeDayInfo.objectives.slice(0, 3).map((obj, i) => (
                    <li key={i} className="truncate">{obj}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guide Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center gap-1 border border-blue-200/50 dark:border-blue-800/50">
                <BookOpen className="w-3.5 h-3.5" /> 
                {selectedDayNumber === 'all' ? 'Guía Completa (Ordenada por Día)' : `Guía del Día ${selectedDayNumber}`}
              </span>
              
              {/* Target Grade Calibrated Difficulty Badge */}
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1 border ${
                plan.targetGrade >= 90 
                  ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800' 
                  : plan.targetGrade >= 75
                  ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              }`}>
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {plan.targetGrade >= 90 
                    ? `Dificultad Excelencia (${plan.targetGrade}%)` 
                    : plan.targetGrade >= 75 
                    ? `Dificultad Notable (${plan.targetGrade}%)` 
                    : `Dificultad Base (${plan.targetGrade}%)`}
                </span>
              </span>

              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                • {dayConcepts.length} conceptos activos
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
                  <span>Copiar Guía</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Executive summary (shown if on 'all' or day 1) */}
        {(selectedDayNumber === 'all' || selectedDayNumber === 1) && studyGuide.executiveSummary && (
          <div className="mt-4 p-3.5 sm:p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
            <p className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" /> Resumen Ejecutivo de Alto Rendimiento
            </p>
            <p className="text-xs sm:text-sm text-blue-950 dark:text-blue-200 leading-relaxed">
              {studyGuide.executiveSummary}
            </p>
          </div>
        )}

        {/* Category Filter and Search Bar */}
        <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1">
            {[
              { id: 'all', label: 'Todo' },
              { id: 'concepts', label: `Conceptos (${dayConcepts.length})` },
              { id: 'formulas', label: `Fórmulas (${dayFormulas.length})` },
              { id: 'traps', label: `Trampas (${dayMappedTraps.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-3 py-2 min-h-[40px] text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer flex items-center justify-center active:scale-95 ${
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
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" /> 
              <span>Conceptos Fundamentales {selectedDayNumber !== 'all' ? `(Día ${selectedDayNumber})` : '(Ordenados por Día 1, 2, 3...)'}</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredConcepts.length} conceptos
            </span>
          </div>

          {filteredConcepts.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              No se encontraron conceptos para este criterio de búsqueda.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredConcepts.map((concept, idx) => {
                const dayNum = concept.dayNumber || 1;
                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-600 text-white shadow-xs">
                          Día {dayNum}
                        </span>
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

                    {/* Structured, formatted concept explanation */}
                    <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed mt-2">
                      {concept.explanation ? (
                        concept.explanation.split('\n').map((paragraph, pIdx) => {
                          const trimmed = paragraph.trim();
                          if (!trimmed) return null;

                          // Format lines starting with emojis, bullets or section headers
                          const colonIdx = trimmed.indexOf(':');
                          if (colonIdx > 0 && colonIdx < 45 && (
                            trimmed.startsWith('📌') || 
                            trimmed.startsWith('⚙️') || 
                            trimmed.startsWith('💡') || 
                            trimmed.startsWith('⚠️') || 
                            trimmed.startsWith('•') ||
                            trimmed.startsWith('Definición') ||
                            trimmed.startsWith('Mecanismo')
                          )) {
                            const headerTitle = trimmed.slice(0, colonIdx + 1).trim();
                            const bodyContent = trimmed.slice(colonIdx + 1).trim();
                            return (
                              <div 
                                key={pIdx} 
                                className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 transition-colors"
                              >
                                <span className="font-extrabold text-slate-900 dark:text-slate-100 block mb-1">
                                  {headerTitle}
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {bodyContent}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <p key={pIdx} className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {trimmed}
                            </p>
                          );
                        })
                      ) : (
                        <p className="text-slate-500 italic">Sin explicación detallada disponible.</p>
                      )}
                    </div>

                    {concept.exampleOrFormula && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">Ejemplo / Fórmula: </span>
                        <span className="text-slate-600 dark:text-slate-400 font-mono break-all">{concept.exampleOrFormula}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Formulas & Definitions */}
      {(activeCategory === 'all' || activeCategory === 'formulas') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> 
              <span>Fórmulas y Definiciones Clave {selectedDayNumber !== 'all' ? `(Día ${selectedDayNumber})` : '(Ordenadas por Día 1, 2, 3...)'}</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredFormulas.length} fórmulas
            </span>
          </div>

          {filteredFormulas.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              No se encontraron fórmulas para este filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredFormulas.map((item, idx) => {
                const dayNum = item.dayNumber || 1;
                return (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-600 text-white">
                          Día {dayNum}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {item.term}
                        </h4>
                      </div>
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Exam Traps */}
      {(activeCategory === 'all' || activeCategory === 'traps') && (
        <div className="space-y-4">
          {/* Header & Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" /> 
                <span>Trampas y Errores Típicos en el Examen {selectedDayNumber !== 'all' ? `(Día ${selectedDayNumber})` : '(Ordenados por Día 1, 2, 3...)'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Identifica las confusiones comunes de parciales pasados y su método exacto de resolución.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {onUpdatePlan && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAddingTrap(prev => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{isAddingTrap ? 'Cerrar formulario' : 'Añadir trampa'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateTrapsWithAI}
                    disabled={isGeneratingTraps}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
                    title="Generar trampas clave adicionales con IA"
                  >
                    {isGeneratingTraps ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generar con IA</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Error notice if trap generation failed */}
          {generateError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{generateError}</span>
              <button
                type="button"
                onClick={() => setGenerateError(null)}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* New Trap Inline Form */}
          {isAddingTrap && (
            <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-2 border-dashed border-amber-300 dark:border-amber-800 rounded-2xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Añadir Nueva Trampa de Examen</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingTrap(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Día de Estudio
                  </label>
                  <select
                    value={newDayNumber}
                    onChange={(e) => setNewDayNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                  >
                    {schedule.map((d) => (
                      <option key={d.dayNumber} value={d.dayNumber}>
                        Día {d.dayNumber} - {d.title}
                      </option>
                    ))}
                    {schedule.length === 0 && <option value={1}>Día 1</option>}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                    Error o Confusión Común *
                  </label>
                  <input
                    type="text"
                    value={newMistake}
                    onChange={(e) => setNewMistake(e.target.value)}
                    placeholder="Ej: Olvidar cambiar radianes a grados antes de calcular la derivada"
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                  Cómo Resolverlo Correctamente (Enfoque Seguro)
                </label>
                <textarea
                  rows={2}
                  value={newCorrection}
                  onChange={(e) => setNewCorrection(e.target.value)}
                  placeholder="Ej: Verificar el modo de la calculadora y siempre aplicar la regla de la cadena paso por paso."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Criterio de Evaluación / Por qué descuenta puntos (Opcional)
                </label>
                <input
                  type="text"
                  value={newWhyItMatters}
                  onChange={(e) => setNewWhyItMatters(e.target.value)}
                  placeholder="Ej: Los profesores anulan el reactivo completo si no se especifica la unidad final."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTrap(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddNewTrap}
                  disabled={!newMistake.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Trampa</span>
                </button>
              </div>
            </div>
          )}

          {/* Filter Sub-bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTrapFilterStatus('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  trapFilterStatus === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Todas ({dayMappedTraps.length})
              </button>
              <button
                type="button"
                onClick={() => setTrapFilterStatus('pending')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  trapFilterStatus === 'pending'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Por dominar ({dayMappedTraps.filter(t => !masteredTrapIndices.includes(t.originalIndex)).length})
              </button>
              <button
                type="button"
                onClick={() => setTrapFilterStatus('mastered')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  trapFilterStatus === 'mastered'
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Dominadas ({dayMappedTraps.filter(t => masteredTrapIndices.includes(t.originalIndex)).length})
              </button>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando {filteredTraps.length} de {dayMappedTraps.length} trampas
            </div>
          </div>

          {/* Traps List */}
          {filteredTraps.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
              {trapFilterStatus === 'mastered'
                ? 'Aún no has marcado ninguna trampa como dominada. Haz clic en "Marcar como entendida" para llevar tu progreso.'
                : 'No hay trampas listadas para este filtro.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredTraps.map((trap, idx) => {
                const isMastered = masteredTrapIndices.includes(trap.originalIndex);
                const isEditing = editingTrapOriginalIndex === trap.originalIndex;
                const tutorQuestion = trap.mistake 
                  ? `¿Por qué es un error común "${trap.mistake}" en el examen de ${plan.subject} y qué método o regla debo seguir para no equivocarme?`
                  : `Explícame la trampa de examen: ${trap.text}`;

                if (isEditing) {
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border-2 border-blue-400 dark:border-blue-600 p-4 sm:p-5 bg-white dark:bg-slate-900 shadow-md space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-blue-600" />
                          <span>Editar Trampa de Examen</span>
                        </h4>
                        <span className="text-xs text-slate-400 font-mono">Día {editDayNumber}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Día
                          </label>
                          <select
                            value={editDayNumber}
                            onChange={(e) => setEditDayNumber(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
                          >
                            {schedule.map((d) => (
                              <option key={d.dayNumber} value={d.dayNumber}>
                                Día {d.dayNumber}
                              </option>
                            ))}
                            {schedule.length === 0 && <option value={1}>Día 1</option>}
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-amber-900 dark:text-amber-300 mb-1">
                            Error o Confusión Común *
                          </label>
                          <input
                            type="text"
                            value={editMistake}
                            onChange={(e) => setEditMistake(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                          Cómo Resolverlo Correctamente (Enfoque Seguro)
                        </label>
                        <textarea
                          rows={2}
                          value={editCorrection}
                          onChange={(e) => setEditCorrection(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Criterio de Evaluación / Por qué descuenta puntos
                        </label>
                        <input
                          type="text"
                          value={editWhyItMatters}
                          onChange={(e) => setEditWhyItMatters(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingTrapOriginalIndex(null)}
                          className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditTrap(trap.originalIndex)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar Cambios</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                      isMastered
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80'
                        : 'bg-white dark:bg-slate-900 border-amber-200/90 dark:border-amber-900/60 hover:border-amber-400 dark:hover:border-amber-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-600 text-white shadow-xs">
                          Día {trap.dayNumber}
                        </span>
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wide">
                          Trampa de Examen #{idx + 1}
                        </span>
                        {isMastered && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Dominada
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                        {onUpdatePlan && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartEdit(trap)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Editar o corregir trampa"
                              aria-label="Editar trampa"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTrap(trap.originalIndex)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar trampa"
                              aria-label="Eliminar trampa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleMasteredTrap(trap.originalIndex)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                            isMastered
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isMastered ? 'Dominada' : 'Marcar como entendida'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onAskTutor(tutorQuestion)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors cursor-pointer"
                          title="Pedir explicación detallada al Tutor IA"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Explicar con IA</span>
                        </button>
                      </div>
                    </div>

                    {/* The Common Mistake / Trap */}
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 mb-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase">
                            Error o Confusión Común:
                          </p>
                          <p className="text-xs sm:text-sm text-amber-950 dark:text-amber-100 mt-0.5 leading-relaxed">
                            {trap.mistake || trap.text}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* The Correction / Right Approach */}
                    {trap.correction ? (
                      <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 mb-2.5">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                              Cómo resolverlo correctamente / Enfoque Seguro:
                            </p>
                            <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-100 mt-0.5 leading-relaxed">
                              {trap.correction}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Why it matters / Evaluation Criterion */}
                    {trap.whyItMatters && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span><strong>Criterio de Evaluación:</strong> {trap.whyItMatters}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

