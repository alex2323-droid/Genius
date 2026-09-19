import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export type AIProviderId = 'gemini' | 'openai' | 'kimi' | 'nvidia';

export interface ProviderStatus {
  id: AIProviderId;
  name: string;
  configured: boolean;
  model: string;
  description: string;
  isPrimary?: boolean;
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

export function getProvidersStatus(): ProviderStatus[] {
  return [
    {
      id: 'gemini',
      name: 'Google Gemini',
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: 'gemini-3.1-flash-lite / gemini-3.8-flash',
      description: 'Motor nativo ultrarrápido con lectura multimodal de documentos y PDF.',
      isPrimary: true,
    },
    {
      id: 'openai',
      name: 'OpenAI (ChatGPT)',
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: 'gpt-4o-mini',
      description: 'Respaldo con alta precisión y calibración estricta de respuestas académicas.',
    },
    {
      id: 'kimi',
      name: 'Kimi (Moonshot AI)',
      configured: Boolean(process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY),
      model: 'moonshot-v1-32k',
      description: 'Especialista en lectura de documentos extensos y material denso de estudio.',
    },
    {
      id: 'nvidia',
      name: 'NVIDIA AI (NIM)',
      configured: Boolean(process.env.NVIDIA_API_KEY),
      model: 'meta/llama-3.3-70b-instruct',
      description: 'Inferencia acelerada para razonamiento paso a paso y resolución de ejercicios.',
    },
  ];
}

export function cleanAndParseJson<T = any>(rawText: string): T {
  if (!rawText || !rawText.trim()) {
    throw new Error('La respuesta recibida del agente de IA está vacía.');
  }

  let cleaned = rawText.trim();
  // Strip markdown code fences if wrapped
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Find first '{' or '[' and last '}' or ']'
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const startIdx = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket) 
    ? firstBrace 
    : firstBracket;

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.slice(startIdx, endIdx + 1);
  }

  return JSON.parse(cleaned) as T;
}

function extractApiErrorMessage(status: number, rawText: string): string {
  try {
    const parsed = JSON.parse(rawText);
    const msg = parsed?.error?.message || parsed?.message || parsed?.detail;
    if (msg && typeof msg === 'string') {
      return `HTTP ${status}: ${msg.trim().replace(/\s+/g, ' ')}`;
    }
  } catch {
    // raw text is not JSON
  }
  const sanitized = (rawText || '').trim().replace(/\s+/g, ' ').slice(0, 150);
  return `HTTP ${status}: ${sanitized || 'Error en servicio de IA'}`;
}

// 1. Google Gemini Runner
async function callGemini(params: {
  prompt: string;
  pdfBase64?: string;
  isJson?: boolean;
}): Promise<string> {
  const ai = getGeminiClient();
  // Valid, supported models ordered for maximum availability and reliability
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
  let lastErr: any = null;

  const contents: any[] = [];
  if (params.pdfBase64) {
    const cleanB64 = params.pdfBase64.replace(/^data:[^;]+;base64,/, '').trim();
    contents.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: cleanB64,
      },
    });
  }
  contents.push({ text: params.prompt });

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.info(`[Multi-AI: Gemini] Consultando ${model}...`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config: params.isJson ? { responseMimeType: 'application/json' } : undefined,
        });
        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastErr = err;
        const errMsg = err?.message || String(err);
        const isQuotaExceeded = errMsg.includes('quota') || errMsg.includes('exceeded');
        const isTransient = (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand')) && !isQuotaExceeded;
        
        if (isTransient && attempt === 1) {
          console.info(`[Multi-AI: Gemini] ${model} experimentó saturación transitoria. Reintentando en 400ms...`);
          await new Promise(r => setTimeout(r, 400));
          continue;
        }

        // Move immediately to next model if quota or unrecoverable error
        break;
      }
    }
  }

  throw lastErr || new Error('Google Gemini no pudo completar la solicitud.');
}

// 2. OpenAI Runner (ChatGPT / GPT-4o-mini)
async function callOpenAI(params: {
  prompt: string;
  isJson?: boolean;
  systemPrompt?: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY no configurada.');
  }

  console.info('[Multi-AI: OpenAI] Consultando modelo gpt-4o-mini...');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: params.systemPrompt || (params.isJson 
            ? 'Eres un tutor universitario de élite. Responde exclusivamente con un objeto JSON válido y parseable.' 
            : 'Eres un tutor académico pedagógico y paciente. Responde en Markdown claro.'),
        },
        { role: 'user', content: params.prompt },
      ],
      temperature: 0.3,
      response_format: params.isJson ? { type: 'json_object' } : undefined,
    }),
  });

  if (!res.ok) {
    const rawError = await res.text();
    throw new Error(`OpenAI API error: ${extractApiErrorMessage(res.status, rawError)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI no devolvió texto en la respuesta.');
  }
  return content;
}

// 3. Kimi (Moonshot AI) Runner
async function callKimi(params: {
  prompt: string;
  isJson?: boolean;
  systemPrompt?: string;
}): Promise<string> {
  const apiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('KIMI_API_KEY / MOONSHOT_API_KEY no configurada.');
  }

  console.info('[Multi-AI: Kimi] Consultando modelo moonshot-v1-32k...');
  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-32k',
      messages: [
        {
          role: 'system',
          content: params.systemPrompt || (params.isJson
            ? 'Eres un tutor de élite experto en documentos extensos. Responde estrictamente con JSON parseable sin texto adicional.'
            : 'Eres un tutor pedagógico de élite. Responde en Markdown claro.'),
        },
        { role: 'user', content: params.prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const rawError = await res.text();
    throw new Error(`Kimi API error: ${extractApiErrorMessage(res.status, rawError)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Kimi no devolvió texto en la respuesta.');
  }
  return content;
}

// 4. NVIDIA AI (NIM) Runner
async function callNvidia(params: {
  prompt: string;
  isJson?: boolean;
  systemPrompt?: string;
}): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY no configurada.');
  }

  console.info('[Multi-AI: NVIDIA] Consultando modelo meta/llama-3.3-70b-instruct...');
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages: [
        {
          role: 'system',
          content: params.systemPrompt || (params.isJson
            ? 'Eres un tutor académico de élite. Responde exclusivamente con código JSON estructurado y válido.'
            : 'Eres un tutor académico experto. Responde en Markdown claro.'),
        },
        { role: 'user', content: params.prompt },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const rawError = await res.text();
    throw new Error(`NVIDIA API error: ${extractApiErrorMessage(res.status, rawError)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('NVIDIA AI no devolvió texto en la respuesta.');
  }
  return content;
}

export interface MultiAIExecuteOptions {
  prompt: string;
  isJson?: boolean;
  pdfBase64?: string;
  systemPrompt?: string;
  preferredProvider?: string;
}

export interface MultiAIResult<T = any> {
  rawText: string;
  data?: T;
  providerUsed: string;
  providerId: AIProviderId;
  attemptsLog: string[];
}

/**
 * Executes an AI generation request with intelligent multi-agent cascade fallback:
 * Google Gemini -> OpenAI -> Kimi -> NVIDIA NIM
 */
export async function executeMultiAIRequest<T = any>(
  options: MultiAIExecuteOptions
): Promise<MultiAIResult<T>> {
  const { prompt, isJson, pdfBase64, systemPrompt, preferredProvider } = options;

  // Build ordered list of providers
  const allProviders: AIProviderId[] = ['gemini', 'openai', 'kimi', 'nvidia'];
  const queue: AIProviderId[] = [];

  // If user selected a specific provider, put it first
  if (preferredProvider && allProviders.includes(preferredProvider as AIProviderId)) {
    queue.push(preferredProvider as AIProviderId);
  }

  // Append remaining providers in order of fallback priority
  for (const p of allProviders) {
    if (!queue.includes(p)) {
      queue.push(p);
    }
  }

  const attemptsLog: string[] = [];
  let lastError: any = null;

  for (const providerId of queue) {
    // Check if configured before calling (to avoid useless failing roundtrips)
    if (providerId === 'gemini' && !process.env.GEMINI_API_KEY) {
      continue;
    }
    if (providerId === 'openai' && !process.env.OPENAI_API_KEY) {
      continue;
    }
    if (providerId === 'kimi' && !process.env.KIMI_API_KEY && !process.env.MOONSHOT_API_KEY) {
      continue;
    }
    if (providerId === 'nvidia' && !process.env.NVIDIA_API_KEY) {
      continue;
    }

    try {
      attemptsLog.push(`Iniciando con ${providerId}...`);
      let rawText = '';

      if (providerId === 'gemini') {
        rawText = await callGemini({ prompt, pdfBase64, isJson });
      } else if (providerId === 'openai') {
        rawText = await callOpenAI({ prompt, isJson, systemPrompt });
      } else if (providerId === 'kimi') {
        rawText = await callKimi({ prompt, isJson, systemPrompt });
      } else if (providerId === 'nvidia') {
        rawText = await callNvidia({ prompt, isJson, systemPrompt });
      }

      let parsedData: T | undefined = undefined;
      if (isJson) {
        parsedData = cleanAndParseJson<T>(rawText);
      }

      const providerName = 
        providerId === 'gemini' ? 'Google Gemini' :
        providerId === 'openai' ? 'OpenAI (ChatGPT)' :
        providerId === 'kimi' ? 'Kimi (Moonshot AI)' : 'NVIDIA AI';

      attemptsLog.push(`Éxito con ${providerName}`);
      console.log(`[Multi-AI] Solicitud completada exitosamente por ${providerName}.`);

      return {
        rawText,
        data: parsedData,
        providerUsed: providerName,
        providerId,
        attemptsLog,
      };
    } catch (err: any) {
      lastError = err;
      const cleanMsg = (err?.message || 'Error desconocido').replace(/\s+/g, ' ').slice(0, 160);
      attemptsLog.push(`Fallo en ${providerId}: ${cleanMsg}`);
      console.info(`[Multi-AI: Fallback] Agente ${providerId} no disponible. Activando siguiente agente de respaldo... (${cleanMsg})`);
      // Brief pause before next agent
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // If all failed or none were configured
  throw (
    lastError || 
    new Error('Ningún agente de IA configurado pudo completar la solicitud. Verifica tu conexión o claves de API.')
  );
}
