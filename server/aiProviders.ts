import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export type AIProviderId = 'gemini' | 'claude' | 'openai' | 'kimi' | 'nvidia';

export interface ProviderStatus {
  id: AIProviderId;
  name: string;
  configured: boolean;
  model: string;
  description: string;
  isPrimary?: boolean;
  isFree?: boolean;
  requiresPaidCredits?: boolean;
  creditExhausted?: boolean;
  creditNotice?: string;
}

let isClaudeCreditExhausted = false;
let claudeCreditNotice = '';

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
  const claudeKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const isClaudeConfigured = Boolean(claudeKey && claudeKey.trim().length > 5);

  return [
    {
      id: 'gemini',
      name: 'Google Gemini (Motor Principal)',
      configured: true,
      model: 'Gemini 2.5 Flash / Pro (Google AI Studio)',
      description: 'Motor neural multimodal para lectura profunda de apuntes, temarios, diapositivas y PDFs. Gratuito y sin coste de créditos.',
      isPrimary: true,
      isFree: true,
      requiresPaidCredits: false,
    },
    {
      id: 'claude',
      name: 'Anthropic Claude (Messages API)',
      configured: isClaudeConfigured,
      creditExhausted: isClaudeCreditExhausted,
      creditNotice: isClaudeCreditExhausted ? (claudeCreditNotice || 'Saldo de créditos insuficiente en Anthropic Console. Conmutado a Google Gemini.') : undefined,
      model: 'Claude 3.7 / 3.5 Sonnet & Haiku',
      description: isClaudeCreditExhausted
        ? 'Saldo insuficiente en Anthropic Console (Plans & Billing). La app utiliza Google Gemini automáticamente sin coste ni interrupción.'
        : isClaudeConfigured
        ? 'Configurado con ANTHROPIC_API_KEY. Razonamiento analítico avanzado y síntesis de temarios complejos.'
        : 'Soporte oficial con ANTHROPIC_API_KEY. Si no está configurada, la app utiliza Google Gemini.',
      isPrimary: false,
      isFree: false,
      requiresPaidCredits: true,
    },
  ];
}

export function cleanAndParseJson<T = any>(rawText: string): T {
  if (!rawText || !rawText.trim()) {
    throw new Error('La respuesta recibida del agente de IA está vacía.');
  }

  let cleaned = rawText.trim();
  // Strip markdown code fences if wrapped
  cleaned = cleaned.replace(/```(?:json)?/gi, '').trim();

  // Find start and end of JSON payload
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  let endIdx = Math.max(lastBrace, lastBracket);

  if (startIdx !== -1) {
    if (endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1);
    } else {
      cleaned = cleaned.slice(startIdx);
    }
  }

  // Remove trailing commas before closing brackets or braces
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

  try {
    return JSON.parse(cleaned) as T;
  } catch (firstErr) {
    // Attempt auto-repair for truncated JSON objects
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\') {
        isEscaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces = Math.max(0, openBraces - 1);
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
      }
    }

    let repaired = cleaned;
    if (inString) repaired += '"';
    repaired = repaired.replace(/,\s*$/, '');
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }

    try {
      return JSON.parse(repaired) as T;
    } catch {
      throw firstErr;
    }
  }
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
  const models = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
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

// 2. Anthropic Claude Runner (Claude 3.7 / 3.5 Sonnet / Haiku / Opus)
async function callClaude(params: {
  prompt: string;
  isJson?: boolean;
  systemPrompt?: string;
  pdfBase64?: string;
}): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY / ANTHROPIC_API_KEY no configurada.');
  }

  const models = [
    'claude-3-7-sonnet-latest',
    'claude-3-5-sonnet-latest',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-latest',
    'claude-3-haiku-20240307',
    'claude-opus-5',
  ];

  let lastErr: any = null;

  for (const model of models) {
    try {
      console.info(`[Multi-AI: Claude] Consultando modelo ${model} via Anthropic Messages API...`);

      // Prepare user content blocks following Anthropic Messages API specifications
      const contentBlocks: any[] = [];
      if (params.pdfBase64) {
        contentBlocks.push({
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: params.pdfBase64,
          },
        });
      }
      contentBlocks.push({
        type: 'text',
        text: params.prompt,
      });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: params.systemPrompt || (params.isJson
            ? 'Eres un tutor universitario de élite y diseñador pedagógico. Responde exclusivamente con un objeto JSON estructurado, válido y parseable sin texto adicional.'
            : 'Eres un tutor pedagógico de élite. Responde en Markdown claro, estructurado y amigable.'),
          messages: [
            {
              role: 'user',
              content: contentBlocks,
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        let text = '';
        if (Array.isArray(data?.content)) {
          text = data.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');
        } else if (data?.content?.[0]?.text) {
          text = data.content[0].text;
        }

        if (text) return text;
      } else {
        const rawError = await res.text();
        const apiErrMsg = extractApiErrorMessage(res.status, rawError);
        lastErr = new Error(`Claude API error (${res.status}): ${apiErrMsg}`);
        
        // Account-level errors (insufficient credits, invalid auth) fail fast across models
        const isAccountError = res.status === 400 || res.status === 401 || res.status === 429 || rawError.includes('credit balance') || rawError.includes('balance is too low');
        if (isAccountError) {
          isClaudeCreditExhausted = true;
          claudeCreditNotice = apiErrMsg;
          console.info(`[Multi-AI: Claude] Saldo insuficiente en Anthropic (${res.status}). Conmutando a Google Gemini...`);
          break;
        }
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('Anthropic Claude no estuvo disponible.');
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
    const apiErrMsg = extractApiErrorMessage(res.status, rawError);
    if (res.status === 429 || res.status === 400 || res.status === 401 || rawError.includes('credits') || rawError.includes('quota')) {
      console.warn(`[Multi-AI: OpenAI] Cuenta sin saldo/crédito (${res.status}). Conmutando automáticamente a Google Gemini...`);
    }
    throw new Error(`OpenAI API error: ${apiErrMsg}`);
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

  const models = [
    'meta/llama-3.1-70b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'meta/llama3-70b-instruct',
  ];

  let lastErr: any = null;

  for (const model of models) {
    try {
      console.info(`[Multi-AI: NVIDIA] Consultando modelo ${model}...`);
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
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

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) return content;
      } else {
        const rawError = await res.text();
        lastErr = new Error(`NVIDIA API error: ${extractApiErrorMessage(res.status, rawError)}`);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('NVIDIA AI no estuvo disponible.');
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
 * Google Gemini <-> Anthropic Claude (Messages API)
 */
export async function executeMultiAIRequest<T = any>(
  options: MultiAIExecuteOptions
): Promise<MultiAIResult<T>> {
  const { prompt, isJson, pdfBase64, systemPrompt, preferredProvider } = options;
  const attemptsLog: string[] = [];

  const claudeKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
  const isClaudeConfigured = Boolean(claudeKey && claudeKey.trim().length > 5);

  // If user explicitly selected Claude and it's configured, try Claude first (if credits available)
  if (preferredProvider === 'claude' && isClaudeConfigured) {
    if (isClaudeCreditExhausted) {
      attemptsLog.push('Claude sin saldo de créditos. Conmutando directamente a Google Gemini...');
    } else {
      attemptsLog.push('Iniciando con Anthropic Claude (Messages API)...');
      try {
        const rawText = await callClaude({ prompt, isJson, pdfBase64, systemPrompt });
        let parsedData: T | undefined = undefined;
        if (isJson) {
          parsedData = cleanAndParseJson<T>(rawText);
        }
        attemptsLog.push('Éxito con Anthropic Claude');
        return {
          rawText,
          data: parsedData,
          providerUsed: 'Anthropic Claude (Messages API)',
          providerId: 'claude',
          attemptsLog,
        };
      } catch (err: any) {
        const cleanMsg = (err?.message || 'Error desconocido').replace(/\s+/g, ' ').slice(0, 160);
        attemptsLog.push(`Claude no disponible (${cleanMsg}). Conmutando a Google Gemini...`);
        console.info('[Multi-AI] Conmutando de Claude a Gemini:', cleanMsg);
      }
    }
  }

  // Try Google Gemini
  attemptsLog.push('Consultando Google Gemini (Motor Principal)...');
  try {
    const rawText = await callGemini({ prompt, pdfBase64, isJson });
    let parsedData: T | undefined = undefined;
    if (isJson) {
      parsedData = cleanAndParseJson<T>(rawText);
    }

    attemptsLog.push('Éxito con Google Gemini');
    return {
      rawText,
      data: parsedData,
      providerUsed: 'Google Gemini (Motor Principal)',
      providerId: 'gemini',
      attemptsLog,
    };
  } catch (err: any) {
    const cleanMsg = (err?.message || 'Error desconocido').replace(/\s+/g, ' ').slice(0, 160);
    attemptsLog.push(`Error en Gemini: ${cleanMsg}`);

    // If Claude is configured and wasn't tried yet, fallback to Claude
    if (isClaudeConfigured && preferredProvider !== 'claude') {
      attemptsLog.push('Activando respaldo automático con Anthropic Claude...');
      try {
        const rawText = await callClaude({ prompt, isJson, pdfBase64, systemPrompt });
        let parsedData: T | undefined = undefined;
        if (isJson) {
          parsedData = cleanAndParseJson<T>(rawText);
        }
        attemptsLog.push('Éxito con Anthropic Claude (Respaldo)');
        return {
          rawText,
          data: parsedData,
          providerUsed: 'Anthropic Claude (Messages API - Respaldo)',
          providerId: 'claude',
          attemptsLog,
        };
      } catch (claudeErr: any) {
        const claudeMsg = (claudeErr?.message || 'Error desconocido').replace(/\s+/g, ' ').slice(0, 160);
        attemptsLog.push(`Respaldo de Claude no disponible: ${claudeMsg}`);
      }
    }

    throw err;
  }
}
