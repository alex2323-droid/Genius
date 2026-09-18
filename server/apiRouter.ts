import { Router, Request, Response } from 'express';
import { generateStudyPlanWithAI, explainTopicWithAI, gradeOpenAnswerWithAI } from './gemini.ts';

export const apiRouter = Router();

apiRouter.post('/generate-plan', async (req: Request, res: Response) => {
  try {
    const { subject, daysLeft, targetGrade, studyHoursPerDay, files, customNotes } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Debes proporcionar al menos un archivo o contenido de estudio.' });
    }

    const parsedDays = Number(daysLeft) || 3;
    const parsedTarget = Number(targetGrade) || 85;
    const parsedHours = Number(studyHoursPerDay) || 2;

    const result = await generateStudyPlanWithAI({
      subject: subject || 'Estudio personalizado',
      daysLeft: parsedDays,
      targetGrade: parsedTarget,
      studyHoursPerDay: parsedHours,
      files,
      customNotes: customNotes || '',
    });

    return res.json({ success: true, plan: result });
  } catch (error: any) {
    console.error('Error generating study plan:', error);
    return res.status(500).json({ 
      error: error?.message || 'Error al generar el plan de estudio con IA. Inténtalo de nuevo.' 
    });
  }
});

apiRouter.post('/explain-topic', async (req: Request, res: Response) => {
  try {
    const { topic, context } = req.body;
    if (!topic) {
      return res.status(400).json({ error: 'Falta el tema o pregunta a explicar.' });
    }
    const explanation = await explainTopicWithAI(topic, context || '');
    return res.json({ success: true, explanation });
  } catch (error: any) {
    console.error('Error explaining topic:', error);
    return res.status(500).json({ error: error?.message || 'Error al generar la explicación.' });
  }
});

apiRouter.post('/grade-answer', async (req: Request, res: Response) => {
  try {
    const { question, studentAnswer, expectedAnswer, targetGrade } = req.body;
    if (!question || !studentAnswer) {
      return res.status(400).json({ error: 'Faltan parámetros de evaluación.' });
    }
    const evaluation = await gradeOpenAnswerWithAI(
      question,
      studentAnswer,
      expectedAnswer || '',
      Number(targetGrade) || 85
    );
    return res.json({ success: true, evaluation });
  } catch (error: any) {
    console.error('Error grading answer:', error);
    return res.status(500).json({ error: error?.message || 'Error al evaluar la respuesta.' });
  }
});
