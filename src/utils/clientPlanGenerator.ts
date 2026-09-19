import type { ParsedFile } from './fileParser.ts';

export interface ClientPlanGenerationParams {
  subject: string;
  daysLeft: number;
  targetGrade: number;
  studyHoursPerDay: number;
  files: ParsedFile[];
  customNotes?: string;
}

export function generateClientFallbackPlan(params: ClientPlanGenerationParams) {
  const { subject, daysLeft, targetGrade, studyHoursPerDay, files, customNotes } = params;
  const numDays = Math.min(Math.max(Number(daysLeft) || 3, 1), 14);
  const dailyHours = Number(studyHoursPerDay) || 2;

  let allText = (files || []).map(f => f.text || '').join('\n');
  if (customNotes) allText += '\n' + customNotes;

  const lines = allText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 10 && !l.startsWith('[Documento') && !l.startsWith('---'));

  const mainSubject = subject || (files && files[0]?.name ? files[0].name.replace(/\.[^/.]+$/, '') : 'Material de Estudio');

  const schedule: any[] = [];
  const coreConcepts: any[] = [];
  const keyDefinitionsAndFormulas: any[] = [];
  const commonExamTraps: any[] = [];
  const flashcards: any[] = [];
  const exercises: any[] = [];

  const conceptsPerDay = targetGrade >= 90 
    ? (numDays <= 3 ? 8 : 6) 
    : targetGrade >= 75 
    ? (numDays <= 3 ? 6 : 4) 
    : (numDays <= 3 ? 4 : 3);

  const trapCount = targetGrade >= 90 
    ? (numDays <= 3 ? 6 : 4) 
    : targetGrade >= 75 
    ? (numDays <= 3 ? 4 : 3) 
    : (numDays <= 3 ? 2 : 1);

  const flashcardCount = targetGrade >= 90 
    ? (numDays <= 3 ? 8 : 6) 
    : targetGrade >= 75 
    ? (numDays <= 3 ? 6 : 4) 
    : (numDays <= 3 ? 4 : 3);

  const exerciseCount = targetGrade >= 90 
    ? (numDays <= 3 ? 6 : 5) 
    : targetGrade >= 75 
    ? (numDays <= 3 ? 4 : 3) 
    : (numDays <= 3 ? 3 : 2);

  for (let day = 1; day <= numDays; day++) {
    const primaryLine = lines[(day - 1) * conceptsPerDay] || `Fundamentos Centrales de ${mainSubject}`;
    const topic1 = primaryLine.length > 60 ? primaryLine.slice(0, 57) + '...' : primaryLine;
    const dayTitle = `Día ${day}: ${topic1}`;

    schedule.push({
      dayNumber: day,
      title: dayTitle,
      focus: `Dominio de ${topic1} para la meta de ${targetGrade}%.`,
      estimatedHours: dailyHours,
      objectives: [
        `Comprender los mecanismos y teorías de ${topic1}`,
        `Analizar aplicaciones prácticas y fórmulas`,
        `Superar trampas de examen y consolidar memorización activa`
      ],
      tasks: [
        {
          id: `task-${day}-1`,
          task: `Estudio e interpretación de ${topic1}`,
          type: 'read',
          timeMinutes: Math.round(dailyHours * 30),
          completed: false,
        },
        {
          id: `task-${day}-2`,
          task: `Repaso de fórmulas, ecuaciones e interconexiones`,
          type: 'summary',
          timeMinutes: Math.round(dailyHours * 15),
          completed: false,
        },
        {
          id: `task-${day}-3`,
          task: `Práctica de ejercicios y tarjetas de memorización`,
          type: 'practice',
          timeMinutes: Math.round(dailyHours * 15),
          completed: false,
        }
      ]
    });

    for (let cIdx = 0; cIdx < conceptsPerDay; cIdx++) {
      const lineIdx = (day - 1) * conceptsPerDay + cIdx;
      const rawText = lines[lineIdx] || `Principio Clave ${cIdx + 1} de ${mainSubject} (Día ${day})`;
      const conceptTitle = rawText.length > 50 ? rawText.slice(0, 47) + '...' : rawText;

      coreConcepts.push({
        title: conceptTitle,
        explanation: `• Fundamentos: ${rawText}.\n• Análisis: Concepto clave para la nota meta de ${targetGrade}%. Requiere dominar supuestos, fórmulas asociadas y aplicaciones de examen.\n• Justificación: Explicación directa de los procesos de ${mainSubject}.`,
        importance: cIdx === 0 ? 'critical' : cIdx === 1 ? 'high' : 'medium',
        exampleOrFormula: `Ecuación o caso de aplicación clave para ${conceptTitle}`,
        dayNumber: day,
      });

      keyDefinitionsAndFormulas.push({
        term: `Regla de ${conceptTitle}`,
        definition: `Regla conceptual formal para la aplicación de ${conceptTitle} en ${mainSubject}.`,
        formulaOrSyntax: `Formulación asociativa del Día ${day} (#${cIdx + 1})`,
        dayNumber: day,
      });
    }

    for (let tIdx = 0; tIdx < trapCount; tIdx++) {
      commonExamTraps.push({
        id: `trap-client-${day}-${tIdx + 1}`,
        mistake: `Error Típico #${tIdx + 1} (Día ${day}): Confundir supuestos o simplificar variables en ${topic1}`,
        correction: `Método Correcto: Verificar las condiciones iniciales y la consistencia lógica de las unidades.`,
        whyItMatters: `Trampa clásica utilizada para restar puntos en preguntas de opción múltiple.`,
        dayNumber: day,
      });
    }

    for (let fIdx = 0; fIdx < flashcardCount; fIdx++) {
      flashcards.push({
        id: `fc-client-${day}-${fIdx + 1}`,
        front: `¿Cuál es el principio clave #${fIdx + 1} del Día ${day} (${topic1})?`,
        back: `Aplica la regla esencial de ${mainSubject} verificando las condiciones para la nota objetivo de ${targetGrade}%.`,
        category: `Día ${day}`,
        dayNumber: day,
      });
    }

    const calcDifficulty = targetGrade >= 90 ? 'advanced' : targetGrade >= 75 ? 'intermediate' : 'basic';
    const pointsValue = targetGrade >= 90 ? 15 : targetGrade >= 75 ? 10 : 5;

    for (let eIdx = 0; eIdx < exerciseCount; eIdx++) {
      exercises.push({
        id: `ex-client-${day}-${eIdx + 1}`,
        type: 'mcq',
        difficulty: calcDifficulty,
        dayNumber: day,
        question: targetGrade >= 90
          ? `[Exigencia Sobresaliente 90-100% • Día ${day} - Q#${eIdx + 1}] En el sistema de ${topic1}, ¿cuál es la deducción analítica correcta?`
          : targetGrade >= 75
          ? `[Nivel Notable 75-89% • Día ${day} - Q#${eIdx + 1}] Respecto a ${topic1}, ¿cuál es el procedimiento correcto?`
          : `[Base Esencial • Día ${day} - Q#${eIdx + 1}] ¿Cuál es la regla básica que aplica en ${topic1}?`,
        options: [
          `Es la propiedad analizada en la sesión que rige de manera determinante el comportamiento de ${mainSubject}.`,
          `Aplica únicamente al ignorar las variables principales del sistema.`,
          `Depende exclusivamente del porcentaje objetivo (${targetGrade}%).`,
          `Ninguna de las opciones anteriores es correcta.`
        ],
        correctAnswer: `Es la propiedad analizada en la sesión que rige de manera determinante el comportamiento de ${mainSubject}.`,
        explanation: `Análisis de la respuesta: La opción correcta demuestra dominio de ${topic1} según la guía del Día ${day}.`,
        hint: `Revisa la definición del Día ${day}.`,
        points: pointsValue,
      });
    }
  }

  return {
    title: `Plan de Estudio Intensivo: ${mainSubject}`,
    subject: mainSubject,
    strategySummary: `Plan estructurado para ${numDays} días y meta de ${targetGrade}%. Generado en modo de alta disponibilidad.`,
    recommendedDailyHours: dailyHours,
    totalEstimatedHours: numDays * dailyHours,
    schedule,
    studyGuide: {
      executiveSummary: `Guía sintética y profunda para dominar ${mainSubject} en ${numDays} días.`,
      coreConcepts,
      keyDefinitionsAndFormulas,
      commonExamTraps,
      flashcards,
    },
    exercises,
    providerUsed: 'Motor de Generación Local (Modo Respaldo)',
  };
}
