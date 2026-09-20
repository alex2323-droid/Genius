import { Router, Request, Response } from 'express';
import { 
  generateStudyPlanWithAI, 
  generateDayPracticeWithAI,
  generateTrapsWithAI,
  explainTopicWithAI, 
  gradeOpenAnswerWithAI,
  getProvidersStatus 
} from './gemini.ts';
import { generalLimiter, expensiveAiLimiter } from './rateLimiter.ts';

export const apiRouter = Router();

function formatFriendlyErrorMessage(error: any): string {
  const raw = (error?.message || '') + ' ' + (typeof error === 'string' ? error : '') + ' ' + JSON.stringify(error || '');
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand') || raw.includes('overloaded')) {
    return 'Los servidores de IA están experimentando alta demanda momentánea. Por favor, reintenta en unos segundos.';
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED') || raw.includes('rate limit')) {
    return 'Se ha alcanzado temporalmente el límite de solicitudes. Por favor, espera un momento antes de reintentar.';
  }
  if (error?.message && !error.message.includes('{')) {
    return error.message;
  }
  return 'Error al procesar la solicitud con el tutor de IA. Los agentes con tolerancia a fallos intentaron resolverla pero falló la conexión.';
}

// Check configured AI providers status
apiRouter.get('/providers-status', generalLimiter, (_req: Request, res: Response) => {
  try {
    const providers = getProvidersStatus();
    return res.json({ success: true, providers });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Error al obtener estado de proveedores' });
  }
});

const handleGeneratePlanRequest = async (req: Request, res: Response) => {
  try {
    const { 
      subject, 
      daysLeft, 
      targetGrade, 
      studyHoursPerDay, 
      dailyAvailableHours,
      files, 
      customNotes,
      preferredProvider,
      customStyleInstructions
    } = req.body;

    let processedFiles = Array.isArray(files) ? files : [];
    
    // Filter out corrupted or zero-length files on server side
    processedFiles = processedFiles.filter((f: any) => {
      if (!f || typeof f !== 'object') return false;
      const hasText = typeof f.text === 'string' && f.text.trim().length > 0;
      const hasBase64 = typeof f.base64 === 'string' && f.base64.trim().length > 0;
      const hasValidSize = typeof f.size === 'number' ? f.size > 0 : true;
      return (hasText || hasBase64) && hasValidSize;
    });

    if (processedFiles.length === 0) {
      processedFiles = [
        {
          name: subject ? `${subject}.txt` : 'Notas_de_estudio.txt',
          type: 'text/plain',
          text: customNotes || subject || 'Temario de estudio general',
        },
      ];
    }

    const parsedDays = Number(daysLeft) || 3;
    const parsedTarget = Number(targetGrade) || 85;
    const parsedHours = Number(studyHoursPerDay || dailyAvailableHours) || 2;

    const result = await generateStudyPlanWithAI({
      subject: subject || 'Estudio personalizado',
      daysLeft: parsedDays,
      targetGrade: parsedTarget,
      studyHoursPerDay: parsedHours,
      files: processedFiles,
      customNotes: customNotes || '',
      preferredProvider,
      customStyleInstructions,
    });

    return res.json({ 
      success: true, 
      plan: result.plan,
      ...(result.plan && typeof result.plan === 'object' ? result.plan : {}),
      providerUsed: result.providerUsed,
      providerId: result.providerId,
      attemptsLog: result.attemptsLog,
    });
  } catch (error: any) {
    console.error('Error generating study plan:', error);
    return res.status(500).json({ 
      error: formatFriendlyErrorMessage(error) 
    });
  }
};

apiRouter.post('/generate-plan', expensiveAiLimiter, handleGeneratePlanRequest);
apiRouter.post('/generate-study-plan', expensiveAiLimiter, handleGeneratePlanRequest);

apiRouter.post('/generate-day-practice', expensiveAiLimiter, async (req: Request, res: Response) => {
  try {
    const { 
      subject, 
      dayNumber, 
      dayTitle, 
      dayFocus, 
      dayObjectives, 
      targetGrade, 
      existingExercisesCount, 
      preferredProvider 
    } = req.body;

    if (!dayNumber) {
      return res.status(400).json({ error: 'Falta el número de día a generar.' });
    }

    const result = await generateDayPracticeWithAI({
      subject: subject || 'Materia de estudio',
      dayNumber: Number(dayNumber),
      dayTitle: dayTitle || `Día ${dayNumber}`,
      dayFocus: dayFocus || 'Temario del día',
      dayObjectives: Array.isArray(dayObjectives) ? dayObjectives : [],
      targetGrade: Number(targetGrade) || 85,
      existingExercisesCount: Number(existingExercisesCount) || 0,
      preferredProvider,
    });

    return res.json({
      success: true,
      practice: result.practice,
      providerUsed: result.providerUsed,
      providerId: result.providerId,
    });
  } catch (error: any) {
    console.error('Error generating day practice:', error);
    return res.status(500).json({ error: formatFriendlyErrorMessage(error) });
  }
});

apiRouter.post('/explain-topic', expensiveAiLimiter, async (req: Request, res: Response) => {
  try {
    const { topic, context, preferredProvider } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Falta el tema o pregunta a explicar.' });
    }
    const result = await explainTopicWithAI(topic, context || '', preferredProvider);
    return res.json({ 
      success: true, 
      explanation: result.explanation,
      providerUsed: result.providerUsed,
      providerId: result.providerId,
    });
  } catch (error: any) {
    console.error('Error explaining topic:', error);
    return res.status(500).json({ error: formatFriendlyErrorMessage(error) });
  }
});

apiRouter.post('/grade-answer', expensiveAiLimiter, async (req: Request, res: Response) => {
  try {
    const { question, studentAnswer, expectedAnswer, targetGrade, preferredProvider } = req.body;
    if (!question || !studentAnswer) {
      return res.status(400).json({ error: 'Faltan parámetros de evaluación.' });
    }
    const result = await gradeOpenAnswerWithAI(
      question,
      studentAnswer,
      expectedAnswer || '',
      Number(targetGrade) || 85,
      preferredProvider
    );
    return res.json({ 
      success: true, 
      evaluation: result.evaluation,
      providerUsed: result.providerUsed,
      providerId: result.providerId,
    });
  } catch (error: any) {
    console.error('Error grading answer:', error);
    return res.status(500).json({ error: formatFriendlyErrorMessage(error) });
  }
});

apiRouter.post('/generate-traps', expensiveAiLimiter, async (req: Request, res: Response) => {
  try {
    const { subject, dayNumber, dayTitle, context, preferredProvider } = req.body;
    const result = await generateTrapsWithAI({
      subject: subject || 'Temario de examen',
      dayNumber: typeof dayNumber === 'number' ? dayNumber : 1,
      dayTitle: dayTitle || '',
      context: context || '',
      preferredProvider,
    });

    return res.json({
      success: true,
      traps: result.traps,
      providerUsed: result.providerUsed,
      providerId: result.providerId,
    });
  } catch (error: any) {
    console.error('Error generating traps:', error);
    return res.status(500).json({ error: formatFriendlyErrorMessage(error) });
  }
});

