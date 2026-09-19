import type {
  StudyPlan,
  DailyScheduleDay,
  CoreConcept,
  DefinitionOrFormula,
  Flashcard,
  Exercise,
} from '../types/study.ts';

export interface PlanTaskStats {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  completedDays: number;
  totalDays: number;
  isAllCompleted: boolean;
  dayStats: Array<{
    dayNumber: number;
    title: string;
    totalTasks: number;
    completedTasks: number;
    isCompleted: boolean;
    percentage: number;
  }>;
}

/**
 * Calculates complete task statistics for the entire study plan schedule.
 */
export function calculatePlanTaskStats(plan: StudyPlan | null): PlanTaskStats {
  if (!plan || !Array.isArray(plan.schedule) || plan.schedule.length === 0) {
    return {
      totalTasks: 0,
      completedTasks: 0,
      percentage: 0,
      completedDays: 0,
      totalDays: 0,
      isAllCompleted: false,
      dayStats: [],
    };
  }

  let totalTasks = 0;
  let completedTasks = 0;
  let completedDays = 0;

  const dayStats = plan.schedule.map((day) => {
    const tasks = Array.isArray(day?.tasks) ? day.tasks : [];
    const dayTotal = tasks.length;
    const dayCompleted = tasks.filter((t) => t.completed).length;
    const isCompleted = dayTotal > 0 && dayCompleted === dayTotal;

    totalTasks += dayTotal;
    completedTasks += dayCompleted;
    if (isCompleted) completedDays++;

    return {
      dayNumber: day.dayNumber,
      title: day.title || `Día ${day.dayNumber}`,
      totalTasks: dayTotal,
      completedTasks: dayCompleted,
      isCompleted,
      percentage: dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0,
    };
  });

  const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    completedTasks,
    percentage,
    completedDays,
    totalDays: plan.schedule.length,
    isAllCompleted: totalTasks > 0 && completedTasks === totalTasks,
    dayStats,
  };
}

/**
 * Normalizes text for keyword search safely converting any value into a string.
 */
function cleanText(text: any): string {
  if (typeof text !== 'string') {
    if (text === null || text === undefined) return '';
    if (typeof text === 'object') {
      try {
        if (text.text && typeof text.text === 'string') return cleanText(text.text);
        if (text.mistake || text.correction) return cleanText(`${text.mistake || ''} ${text.correction || ''}`);
        return cleanText(JSON.stringify(text));
      } catch {
        return '';
      }
    }
    return String(text)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Maps an item to a specific study day based on valid schedule range, explicit dayNumber, keywords, or non-overlapping distribution.
 */
function determineDayNumber(
  explicitDayNumber: number | undefined,
  itemIndex: number,
  totalItems: number,
  itemSearchText: any,
  schedule: DailyScheduleDay[]
): number {
  if (!schedule || schedule.length === 0) return 1;

  const maxScheduleDay = Math.max(...schedule.map((d) => d.dayNumber || 1), 1);
  const minScheduleDay = Math.min(...schedule.map((d) => d.dayNumber || 1), 1);

  // 1. Explicit dayNumber check (ensure within schedule bounds)
  if (
    typeof explicitDayNumber === 'number' &&
    !isNaN(explicitDayNumber) &&
    explicitDayNumber >= 1
  ) {
    if (explicitDayNumber >= minScheduleDay && explicitDayNumber <= maxScheduleDay) {
      return explicitDayNumber;
    }
    // If explicit day is out of range (e.g. Day 26 in a 5-day plan), map within 1..maxScheduleDay
    const mappedDay = ((explicitDayNumber - 1) % maxScheduleDay) + 1;
    return mappedDay;
  }

  if (schedule.length === 1) return schedule[0].dayNumber;

  const cleanItem = cleanText(itemSearchText);
  let bestDay = -1;
  let maxScore = 0;

  schedule.forEach((day) => {
    let score = 0;
    const dayTopics = Array.isArray(day.keyTopics) ? day.keyTopics : [];
    const dayObjectives = Array.isArray(day.objectives) ? day.objectives : [];
    const keywords = [
      ...dayTopics,
      ...dayObjectives,
      day.title || '',
      day.focus || '',
    ];

    for (const kw of keywords) {
      const cleanKw = cleanText(kw);
      if (cleanKw.length > 3 && cleanItem.includes(cleanKw)) {
        score += 3;
      } else if (cleanKw.length > 3) {
        const words = cleanKw.split(/\s+/).filter((w) => w.length > 3);
        for (const word of words) {
          if (cleanItem.includes(word)) {
            score += 1;
          }
        }
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestDay = day.dayNumber;
    }
  });

  // If a clear keyword match was found (score >= 2), assign to that day
  if (bestDay > 0 && maxScore >= 2 && bestDay <= maxScheduleDay) {
    return bestDay;
  }

  // 2. Strict non-overlapping proportional distribution across schedule days
  const safeTotal = Math.max(1, totalItems);
  const ratio = itemIndex / safeTotal;
  const distributedDayIndex = Math.min(
    schedule.length - 1,
    Math.floor(ratio * schedule.length)
  );
  return schedule[distributedDayIndex]?.dayNumber || 1;
}

/**
 * Filters and strictly sorts Concepts by dayNumber in ascending order
 */
export function getConceptsForDay(
  concepts: CoreConcept[],
  dayNumber: number | 'all',
  schedule: DailyScheduleDay[]
): { concepts: CoreConcept[]; assignedDayMap: Map<number, number> } {
  const safeConcepts = Array.isArray(concepts) ? concepts : [];
  const assignedDayMap = new Map<number, number>();

  const mapped = safeConcepts.map((c: any, idx) => {
    const title = c?.title || c?.concept || 'Concepto clave';
    const explanation = c?.explanation || c?.description || '';
    const example = c?.exampleOrFormula || c?.example || c?.keyTakeaway || '';
    const searchText = `${title} ${explanation} ${example}`;
    const assigned = determineDayNumber(c?.dayNumber, idx, safeConcepts.length, searchText, schedule);
    assignedDayMap.set(idx, assigned);
    return {
      ...c,
      title,
      explanation,
      importance: c?.importance || 'high',
      exampleOrFormula: example,
      dayNumber: assigned,
      _originalIndex: idx,
    };
  });

  // Sort strictly by dayNumber ascending, then original index
  mapped.sort((a, b) => (a.dayNumber || 1) - (b.dayNumber || 1) || a._originalIndex - b._originalIndex);

  if (dayNumber === 'all') {
    return { concepts: mapped, assignedDayMap };
  }

  const filtered = mapped.filter((c) => c.dayNumber === dayNumber);
  return { concepts: filtered, assignedDayMap };
}

/**
 * Filters and strictly sorts Formulas and Definitions by dayNumber in ascending order
 */
export function getFormulasForDay(
  formulas: DefinitionOrFormula[],
  dayNumber: number | 'all',
  schedule: DailyScheduleDay[]
): { formulas: DefinitionOrFormula[]; assignedDayMap: Map<number, number> } {
  const safeFormulas = Array.isArray(formulas) ? formulas : [];
  const assignedDayMap = new Map<number, number>();

  const mapped = safeFormulas.map((f: any, idx) => {
    const term = f?.term || f?.termOrName || f?.name || 'Término / Fórmula';
    const definition = f?.definition || f?.definitionOrFormula || f?.description || '';
    const formulaOrSyntax = f?.formulaOrSyntax || f?.formula || f?.syntax || f?.whenToUse || '';
    const searchText = `${term} ${definition} ${formulaOrSyntax}`;
    const assigned = determineDayNumber(f?.dayNumber, idx, safeFormulas.length, searchText, schedule);
    assignedDayMap.set(idx, assigned);
    return {
      ...f,
      term,
      definition,
      formulaOrSyntax,
      dayNumber: assigned,
      _originalIndex: idx,
    };
  });

  // Sort strictly by dayNumber ascending, then original index
  mapped.sort((a, b) => (a.dayNumber || 1) - (b.dayNumber || 1) || a._originalIndex - b._originalIndex);

  if (dayNumber === 'all') {
    return { formulas: mapped, assignedDayMap };
  }

  const filtered = mapped.filter((f) => f.dayNumber === dayNumber);
  return { formulas: filtered, assignedDayMap };
}

/**
 * Filters and strictly sorts Traps by dayNumber in ascending order
 */
export interface MappedTrap {
  mistake: string;
  correction: string;
  whyItMatters?: string;
  text: string;
  dayNumber: number;
  originalIndex: number;
}

export function getTrapsForDay(
  traps: any[],
  dayNumber: number | 'all',
  schedule: DailyScheduleDay[]
): { traps: string[]; mappedTraps: MappedTrap[]; assignedDayMap: Map<number, number> } {
  const safeTraps = Array.isArray(traps) ? traps : [];
  const assignedDayMap = new Map<number, number>();

  const mapped: MappedTrap[] = safeTraps.map((t, idx) => {
    let mistake = '';
    let correction = '';
    let whyItMatters = '';
    let fullText = '';
    let explicitDayNumber: number | undefined = undefined;

    if (typeof t === 'string') {
      const raw = t.trim();
      fullText = raw;

      // Check if string contains "→ Corrección:" or "Corrección:" or "-> Corrección:"
      const arrowSplit = raw.split(/\s*(?:→|->|Corrección:|\bSolución:|\bForma correcta:)\s*/i);
      if (arrowSplit.length > 1) {
        mistake = arrowSplit[0].replace(/^(?:Error común|Trampa|Error|Cuidado con)[:\s-]*/i, '').trim();
        correction = arrowSplit[1].replace(/^(?:Corrección|Solución|Forma correcta)[:\s-]*/i, '').trim();
        
        // Check if there is whyItMatters in parentheses
        const whyMatch = correction.match(/\(([^)]+)\)$/);
        if (whyMatch) {
          whyItMatters = whyMatch[1].trim();
          correction = correction.replace(/\(([^)]+)\)$/, '').trim();
        }
      } else {
        mistake = raw;
      }
    } else if (t && typeof t === 'object') {
      if (typeof t.dayNumber === 'number') {
        explicitDayNumber = t.dayNumber;
      }
      mistake = t.mistake || t.trap || t.error || (typeof t.text === 'string' ? t.text : '') || 'Error común de examen';
      correction = t.correction || t.solution || t.correctApproach || '';
      whyItMatters = t.whyItMatters || t.tip || t.why || '';

      const parts: string[] = [mistake];
      if (correction) parts.push(`→ Corrección: ${correction}`);
      if (whyItMatters) parts.push(`(${whyItMatters})`);
      fullText = parts.join(' ');
    } else {
      mistake = String(t || '');
      fullText = mistake;
    }

    const assigned = determineDayNumber(explicitDayNumber, idx, safeTraps.length, fullText, schedule);
    assignedDayMap.set(idx, assigned);
    return {
      mistake: mistake || 'Error típico',
      correction: correction,
      whyItMatters: whyItMatters || undefined,
      text: fullText,
      dayNumber: assigned,
      originalIndex: idx,
    };
  });

  // Sort strictly by dayNumber ascending, then original index
  mapped.sort((a, b) => a.dayNumber - b.dayNumber || a.originalIndex - b.originalIndex);

  if (dayNumber === 'all') {
    return {
      traps: mapped.map((m) => m.text),
      mappedTraps: mapped,
      assignedDayMap,
    };
  }

  const filtered = mapped.filter((m) => m.dayNumber === dayNumber);
  return {
    traps: filtered.map((m) => m.text),
    mappedTraps: filtered,
    assignedDayMap,
  };
}

/**
 * Filters and strictly sorts Flashcards by dayNumber in ascending order
 */
export function getFlashcardsForDay(
  flashcards: Flashcard[],
  dayNumber: number | 'all',
  schedule: DailyScheduleDay[]
): { flashcards: Flashcard[]; assignedDayMap: Map<number, number> } {
  const safeCards = Array.isArray(flashcards) ? flashcards : [];
  const assignedDayMap = new Map<number, number>();

  const mapped = safeCards.map((c: any, idx) => {
    const front = c?.front || c?.question || 'Pregunta';
    const back = c?.back || c?.answer || 'Respuesta';
    const category = c?.category || c?.topic || 'General';
    const searchText = `${front} ${back} ${category}`;
    const assigned = determineDayNumber(c?.dayNumber, idx, safeCards.length, searchText, schedule);
    assignedDayMap.set(idx, assigned);
    return {
      ...c,
      front,
      back,
      category,
      dayNumber: assigned,
      _originalIndex: idx,
    };
  });

  // Sort strictly by dayNumber ascending, then original index
  mapped.sort((a, b) => (a.dayNumber || 1) - (b.dayNumber || 1) || a._originalIndex - b._originalIndex);

  if (dayNumber === 'all') {
    return { flashcards: mapped, assignedDayMap };
  }

  const filtered = mapped.filter((c) => c.dayNumber === dayNumber);
  return { flashcards: filtered, assignedDayMap };
}

/**
 * Filters and strictly sorts Exercises by dayNumber in ascending order
 */
export function getExercisesForDay(
  exercises: Exercise[],
  dayNumber: number | 'all',
  schedule: DailyScheduleDay[]
): { exercises: Exercise[]; assignedDayMap: Map<string, number> } {
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  const assignedDayMap = new Map<string, number>();

  const mapped = safeExercises.map((e: any, idx) => {
    const question = e?.question || 'Pregunta de práctica';
    const optionsText = Array.isArray(e?.options) ? e.options.join(' ') : '';
    const explanation = e?.explanation || '';
    const searchText = `${question} ${optionsText} ${explanation}`;
    const assigned = determineDayNumber(e?.dayNumber, idx, safeExercises.length, searchText, schedule);
    const id = e?.id || `ex-${idx}`;
    assignedDayMap.set(id, assigned);
    return {
      ...e,
      id,
      question,
      dayNumber: assigned,
      _originalIndex: idx,
    };
  });

  // Sort strictly by dayNumber ascending, then original index
  mapped.sort((a, b) => (a.dayNumber || 1) - (b.dayNumber || 1) || a._originalIndex - b._originalIndex);

  if (dayNumber === 'all') {
    return { exercises: mapped, assignedDayMap };
  }

  const filtered = mapped.filter((e) => e.dayNumber === dayNumber);
  return { exercises: filtered, assignedDayMap };
}
