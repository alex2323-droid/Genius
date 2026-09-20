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
 * Sanitizes and normalizes explanation and example data to remove repetitions,
 * unrelated copy-paste fallbacks (like thymus text on blood vessels), and raw file markers.
 */
export function sanitizeConceptExplanation(
  rawExplanation: string,
  title: string,
  subject: string = ''
): {
  whatIs: string;
  howWorks: string;
  whyMatters: string;
  fullExplanation: string;
} {
  const cleanTitle = title.replace(/^[•\s\d\.\-\)]+/, '').trim();
  const lowerTitle = cleanTitle.toLowerCase();
  
  let whatIs = '';
  let howWorks = '';
  let whyMatters = '';

  if (rawExplanation && rawExplanation.trim()) {
    const lines = rawExplanation.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < 50) {
        const header = line.slice(0, colonIdx).toLowerCase();
        const content = line.slice(colonIdx + 1).trim();
        
        if (header.includes('qué es') || header.includes('que es') || header.includes('trata') || header.includes('fundamento') || header.includes('definición')) {
          whatIs = content;
        } else if (header.includes('cómo funciona') || header.includes('como funciona') || header.includes('paso a paso') || header.includes('mecanismo') || header.includes('proceso')) {
          howWorks = content;
        } else if (header.includes('por qué importa') || header.includes('por que importa') || header.includes('examen') || header.includes('justificación') || header.includes('clave')) {
          whyMatters = content;
        }
      }
    }
  }

  // Check if whatIs is missing or has file marker
  if (!whatIs || whatIs.includes('===') || whatIs.includes('---')) {
    whatIs = `${cleanTitle} es un componente y estructura esencial de estudio en ${subject || 'esta materia'}, caracterizado por sus relaciones funcionales y anatómicas clave.`;
  }

  // Check if howWorks is missing, has file marker, or is an unrelated copy-paste fallback (e.g. thymus on non-thymus concept)
  const isTimoRelated = lowerTitle.includes('timo') || lowerTitle.includes('linf');
  const isGenericThymusCopy = howWorks.toLowerCase().includes('corteza del timo') && !isTimoRelated;
  
  if (!howWorks || howWorks.length < 15 || howWorks.includes('===') || howWorks.includes('---') || isGenericThymusCopy) {
    if (lowerTitle.includes('arteria') || lowerTitle.includes('vena') || lowerTitle.includes('tronco') || lowerTitle.includes('vaso') || lowerTitle.includes('aorta')) {
      howWorks = `Trayecto vascular y distribución: Se origina como rama principal/colateral, transporta el flujo sanguíneo con presión regulada y nutre los territorios tisulares específicos antes de subdividirse en redes capilares.`;
    } else if (lowerTitle.includes('corazón') || lowerTitle.includes('card') || lowerTitle.includes('válvula') || lowerTitle.includes('aurícula') || lowerTitle.includes('ventrículo')) {
      howWorks = `Dinámica cardíaca y contracción: Opera mediante ciclos rítmicos de sístole y diástole, coordinando la apertura valvular para mantener el gradiente hemodinámico continuo.`;
    } else if (lowerTitle.includes('médula') || lowerTitle.includes('linfo') || lowerTitle.includes('ganglio') || lowerTitle.includes('bazo')) {
      howWorks = `Filtración y respuesta inmunitaria: Capta la linfa/sangre mediante senos especializados, reteniendo antígenos y activando células efectoras maduras.`;
    } else {
      howWorks = `Mecanismo operativo paso a paso: ${cleanTitle} actúa de forma coordinada a través de sus componentes estructurales, regulando la función e interactuando con los tejidos adyacentes.`;
    }
  }

  // Check if whyMatters is missing, repetitive or generic
  const isGenericExamRepetition = whyMatters.includes('calificar el dominio de') && whyMatters.includes('al 100%');
  if (!whyMatters || whyMatters.length < 15 || whyMatters.includes('===') || whyMatters.includes('---') || isGenericExamRepetition) {
    if (lowerTitle.includes('arteria') || lowerTitle.includes('tronco') || lowerTitle.includes('aorta')) {
      whyMatters = `Pregunta obligatoria de examen sobre ramas colaterales, territorio de irrigación y consecuencias clínicas o quirúrgicas de su oclusión.`;
    } else if (lowerTitle.includes('linf') || lowerTitle.includes('timo') || lowerTitle.includes('ganglio')) {
      whyMatters = `Clave evaluativa: Diferenciación entre órganos linfoides primarios y secundarios, y sentido del flujo linfático hacia la circulación venosa.`;
    } else {
      whyMatters = `Foco de evaluación: Criterio determinante en preguntas de examen teórico-práctico para justificar principios, diagnóstico o relaciones topográficas.`;
    }
  }

  const fullExplanation = [
    `• ¿Qué es y de qué trata?: ${whatIs}`,
    `• ¿Cómo funciona / Paso a paso?: ${howWorks}`,
    `• ¿Por qué importa en el examen?: ${whyMatters}`
  ].join('\n');

  return { whatIs, howWorks, whyMatters, fullExplanation };
}

/**
 * Sanitizes and structures example/formula strings into high-clarity items.
 */
export function sanitizeConceptExampleOrFormula(
  rawExample: string,
  title: string,
  subject: string = ''
): {
  type: 'formula' | 'clinical_case' | 'practical_example';
  title: string;
  content: string;
  syntax?: string;
  variables?: string[];
  clinicalContext?: string;
} {
  const cleanTitle = title.replace(/^[•\s\d\.\-\)]+/, '').trim();
  const lowerTitle = cleanTitle.toLowerCase();

  let cleaned = (rawExample || '')
    .replace(/^===.*?===/g, '')
    .replace(/^---.*?---/g, '')
    .replace(/^Ejemplo extraído de tus apuntes:\s*---.*?---/i, '')
    .replace(/^\[.*?\]/g, '')
    .trim();

  // If clean string is invalid, contains PDF markers, or is too short
  if (!cleaned || cleaned.startsWith('===') || cleaned.startsWith('---') || cleaned.toLowerCase().includes('.pdf') || cleaned.length < 10) {
    if (lowerTitle.includes('arteria') || lowerTitle.includes('tronco') || lowerTitle.includes('aorta')) {
      cleaned = `Caso clínico / Reconocimiento: Disección y cateterismo de ${cleanTitle}, verificando el punto exacto de bifurcación y el área isquémica resultante en caso de ligadura.`;
    } else if (lowerTitle.includes('linf') || lowerTitle.includes('timo')) {
      cleaned = `Caso de correlación: Involución del timo en animales adultos frente a desarrollo marcado en animales jóvenes, y toma de biopsia en linfonodos de drenaje.`;
    } else {
      cleaned = `Aplicación práctica: Análisis de caso donde se identifica la estructura de ${cleanTitle}, delimitando sus relaciones topográficas y función fisiológica.`;
    }
  }

  const isMathOrFormula = /[=><≈±≤≥]/.test(cleaned) || /\b(kg|m\/s|mol|Pa|kPa|bar|atm|V|mV|Hz|kHz|J|kJ|W|kW|N|cal|kcal)\b/i.test(cleaned);

  if (isMathOrFormula) {
    return {
      type: 'formula',
      title: `Fórmula / Relación Cuantitativa de ${cleanTitle}`,
      content: cleaned,
      syntax: cleaned,
    };
  }

  const isClinical = lowerTitle.includes('arteria') || lowerTitle.includes('vena') || lowerTitle.includes('corazón') || lowerTitle.includes('médula') || lowerTitle.includes('timo') || cleaned.toLowerCase().includes('clínic') || cleaned.toLowerCase().includes('caso');

  return {
    type: isClinical ? 'clinical_case' : 'practical_example',
    title: isClinical ? `Caso y Aplicación Clínica de ${cleanTitle}` : `Ejemplo Práctico de ${cleanTitle}`,
    content: cleaned,
    clinicalContext: isClinical ? `Correlación funcional y topográfica en ${subject || 'la materia'}` : undefined,
  };
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
    const rawExplanation = c?.explanation || c?.description || '';
    const rawExample = c?.exampleOrFormula || c?.example || c?.keyTakeaway || '';
    
    const sanitizedExp = sanitizeConceptExplanation(rawExplanation, title);
    const sanitizedEx = sanitizeConceptExampleOrFormula(rawExample, title);

    const searchText = `${title} ${sanitizedExp.fullExplanation} ${sanitizedEx.content}`;
    const assigned = determineDayNumber(c?.dayNumber, idx, safeConcepts.length, searchText, schedule);
    assignedDayMap.set(idx, assigned);
    return {
      ...c,
      title,
      explanation: sanitizedExp.fullExplanation,
      importance: c?.importance || 'high',
      exampleOrFormula: sanitizedEx.content,
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
