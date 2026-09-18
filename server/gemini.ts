import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY environment variable is not set. API calls may fail.');
    }
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
}

export interface PlanGenerationRequest {
  subject: string;
  daysLeft: number;
  targetGrade: number;
  studyHoursPerDay: number;
  files: Array<{
    name: string;
    type: string;
    text?: string;
    base64?: string;
  }>;
  customNotes?: string;
}

export async function generateStudyPlanWithAI(req: PlanGenerationRequest) {
  const ai = getGeminiClient();

  // Pick appropriate model: gemini-3.8-flash or gemini-3.5-flash
  const modelName = 'gemini-3.8-flash';

  const { subject, daysLeft, targetGrade, studyHoursPerDay, files, customNotes } = req;

  // Build the prompt tailored specifically to the user's constraints:
  // 1. Days left (urgency & pace: crash vs balanced vs deep mastery)
  // 2. Target grade percentage (depth, rigor, passing vs honors)
  // 3. Uploaded documents
  let promptText = `
Actúa como un profesor universitario y tutor pedagógico de alto rendimiento de élite.
Un estudiante necesita prepararse para su evaluación/parcial con las siguientes especificaciones críticas:

- Asignatura o Tema: "${subject || 'Material adjunto'}"
- Días que faltan para la evaluación: ${daysLeft} días
- Porcentaje de nota que desea sacar: ${targetGrade}%
- Horas de estudio dedicadas por día: ${studyHoursPerDay || 2} horas diarias
${customNotes ? `- Notas o indicaciones adicionales del estudiante: "${customNotes}"` : ''}

REGLAS PEDAGÓGICAS VITALES SEGÚN LOS DÍAS DISPONIBLES:
${daysLeft <= 2 ? `
- MODO INTENSIVO DE EMERGENCIA (${daysLeft} día(s)):
  * Se debe priorizar el 80/20 (Principio de Pareto). No hay tiempo para divagaciones.
  * Enfocarse únicamente en conceptos de alto impacto ("High-Yield") que con un 90% de probabilidad saldrán en el examen.
  * La guía debe ser ultra-sintética: fórmulas clave, definiciones indispensables, trampas comunes del profesor y mnemotécnicas rápidas.
  * Los ejercicios deben ser directos y simular las preguntas tipo test y problemas clásicos de examen.
` : daysLeft <= 7 ? `
- MODO SPRINT INTERMEDIO (${daysLeft} días):
  * Cronograma estructurado día a día: Repartir temas por bloques lógicos.
  * Días intermedios para práctica activa y resolución de problemas.
  * Penúltimo día para simulacro de examen y último día para repaso ligero y consolidación de errores.
` : `
- MODO MAESTRÍA COMPLETA Y REPASO ESPACIADO (${daysLeft} días):
  * Cronograma distribuido con técnica de Repetición Espaciada y Práctica Intercalada.
  * Comprensión profunda de fundamentos, deducciones, casos complejos y simulacros periódicos.
  * Planificación de descansos y días de afianzamiento.
`}

REGLAS SEGÚN LA NOTA OBJETIVO (${targetGrade}%):
${targetGrade >= 90 ? `
- OBJETIVO DE NOTA ALTA (90% - 100%):
  * Rigor máximo. Se debe cubrir no solo lo básico sino detalles sutiles, casos límite ("edge cases"), justificaciones teóricas y ejercicios de dificultad avanzada.
  * Los ejercicios deben incluir problemas de análisis crítico y nivel sobresaliente.
` : targetGrade >= 75 ? `
- OBJETIVO DE NOTA NOTABLE (75% - 89%):
  * Foco en dominio sólido de conceptos principales, resolución estándar de problemas y evitar errores comunes.
` : `
- OBJETIVO DE APROBAR / NOTA BASE (${targetGrade}%):
  * Estrategia de supervivencia y garantía de aprobado. Asegurar los puntos más fáciles y repetitivos del temario.
`}

A continuación tienes el contenido extraído de los archivos subidos por el estudiante (.pdf, .pptx, .ppt, .docx, .doc):
`;

  // Attach text contents
  files.forEach((f, idx) => {
    promptText += `\n--- ARCHIVO ${idx + 1}: ${f.name} (${f.type}) ---\n`;
    if (f.text && f.text.trim()) {
      promptText += `${f.text.slice(0, 50000)}\n`;
    }
  });

  promptText += `
DEBES GENERAR UNA RESPUESTA ESTRICTAMENTE EN FORMATO JSON VÁLIDO con la siguiente estructura exacta:
{
  "title": "Título claro del plan de estudio",
  "subject": "Nombre de la materia o tema central",
  "strategySummary": "Explicación breve de 2-3 frases de cómo este plan se optimizó específicamente para los ${daysLeft} días restantes y la meta de ${targetGrade}%.",
  "recommendedDailyHours": ${studyHoursPerDay || 2},
  "totalEstimatedHours": ${Math.max(1, daysLeft * (studyHoursPerDay || 2))},
  "schedule": [
    {
      "dayNumber": 1,
      "title": "Título de la jornada de estudio",
      "focus": "Enfoque principal del día",
      "estimatedHours": 2,
      "objectives": ["Objetivo 1", "Objetivo 2"],
      "keyTopics": ["Tema A", "Tema B"],
      "tasks": [
        {
          "id": "task-1-1",
          "task": "Descripción de la actividad concreta",
          "timeMinutes": 45,
          "type": "read" // "read" | "practice" | "memorize" | "review" | "test"
        }
      ]
    }
  ],
  "studyGuide": {
    "executiveSummary": "Resumen ejecutivo del material",
    "coreConcepts": [
      {
        "title": "Nombre del Concepto Clave",
        "explanation": "Explicación didáctica clara y precisa",
        "importance": "critical", // "critical" | "high" | "medium"
        "exampleOrFormula": "Ejemplo práctico, fórmula o regla memotécnica"
      }
    ],
    "keyDefinitionsAndFormulas": [
      {
        "term": "Término o Fórmula",
        "definition": "Definición exacta y cuándo se aplica",
        "formulaOrSyntax": "Ecuación matemática o sintaxis si aplica"
      }
    ],
    "commonExamTraps": [
      "Error típico o trampa frecuente que suelen poner en los exámenes sobre este tema"
    ],
    "flashcards": [
      {
        "front": "¿Pregunta o concepto en el anverso?",
        "back": "Respuesta clara y sintética en el reverso",
        "category": "Categoría o tema"
      }
    ]
  },
  "exercises": [
    {
      "id": "ex-1",
      "type": "mcq", // "mcq" o "open" o "true_false"
      "difficulty": "intermediate", // "basic" | "intermediate" | "advanced"
      "question": "Enunciado del ejercicio o pregunta de examen",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": "Opción A",
      "explanation": "Paso a paso de por qué esta es la respuesta correcta y por qué fallan las demás",
      "hint": "Pista orientativa si el alumno se bloquea",
      "points": 10
    }
  ]
}

IMPORTANTE:
- Responde ÚNICAMENTE con el objeto JSON parseable.
- Genera entre 5 y 12 ejercicios de alta calidad calibrados a la nota del ${targetGrade}%.
- Genera entre 6 y 15 flashcards de repaso activo.
- Asegúrate de que el schedule contenga entradas acordes a los ${daysLeft} días (si son muchos días, agrupa por bloques o días representativos de 1 a ${Math.min(daysLeft, 30)}).
- Todo el contenido debe estar en español impecable y claro.
`;

  // Prepare contents array (handling PDF inlineData if any pdf base64 is provided)
  const contentParts: any[] = [];

  // Check if any file has base64 pdf data
  const pdfFile = files.find(f => f.type === 'application/pdf' && f.base64);
  if (pdfFile && pdfFile.base64) {
    contentParts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfFile.base64
      }
    });
  }

  contentParts.push({ text: promptText });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: contentParts,
    config: {
      responseMimeType: 'application/json',
    },
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    // Attempt cleaning backticks if model wrapped it
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }
}

export async function explainTopicWithAI(topic: string, context: string) {
  const ai = getGeminiClient();
  const prompt = `
Actúa como un tutor académico paciente y pedagógico.
El estudiante no entiende el siguiente concepto o ejercicio:
"${topic}"

Contexto del material de estudio:
${context.slice(0, 3000)}

Explícaselo con:
1. Una analogía de la vida real sencilla.
2. La explicación técnica paso a paso sin rodeos.
3. Un ejemplo resuelto claro.
4. Una mnemotecnia o regla para que no se le olvide en el examen.

Responde con formato Markdown claro y amigable en español.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
  });

  return response.text;
}

export async function gradeOpenAnswerWithAI(question: string, studentAnswer: string, expectedAnswer: string, targetGrade: number) {
  const ai = getGeminiClient();
  const prompt = `
Evalúa la respuesta de un estudiante a una pregunta de examen.
El estudiante tiene como meta sacar un ${targetGrade}% en su examen.

Pregunta: "${question}"
Respuesta esperada / Criterio: "${expectedAnswer}"
Respuesta del estudiante: "${studentAnswer}"

Genera una respuesta en formato JSON:
{
  "scoreOutOf10": 8.5,
  "isCorrect": true,
  "feedback": "Comentario constructivo destacando aciertos y lo que faltó para llegar al ${targetGrade}%",
  "modelAnswer": "Cómo habría sido una respuesta perfecta de 10/10",
  "tipsForExam": "Consejo clave de redacción o precisión para el parcial"
}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });

  const text = response.text || '{}';
  try {
    return JSON.parse(text);
  } catch (err) {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }
}
