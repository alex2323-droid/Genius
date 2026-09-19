import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  Brain, 
  Zap, 
  FileText, 
  Bot, 
  Radio, 
  CheckCircle2,
  Flame
} from 'lucide-react';
import type { AIProviderInfo } from '../types/study.ts';

interface MultiAISelectorProps {
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  disabled?: boolean;
}

const DEFAULT_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    configured: true,
    model: 'gemini-3.8-flash / gemini-3.1-flash-lite',
    description: 'Motor nativo ultrarrápido con lectura multimodal de PDFs y documentos complejos.',
    isPrimary: true,
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    configured: false,
    model: 'claude-3-5-sonnet-latest',
    description: 'Lógica pedagógica avanzada, síntesis conceptual profunda y análisis estructurado.',
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    configured: false,
    model: 'gpt-4o-mini',
    description: 'Excelente razonamiento lógico, calibración estricta y precisión sintáctica.',
  },
  {
    id: 'kimi',
    name: 'Kimi (Moonshot AI)',
    configured: false,
    model: 'moonshot-v1-32k',
    description: 'Especialista en lectura de documentos densos y temarios universitarios largos.',
  },
  {
    id: 'nvidia',
    name: 'NVIDIA AI (NIM)',
    configured: false,
    model: 'meta/llama-3.1-70b-instruct',
    description: 'Inferencia acelerada por hardware para resolución de ejercicios y deducciones.',
  },
];

const PROVIDER_METADATA: Record<string, {
  color: string;
  bgColor: string;
  borderColor: string;
  activeBorderColor: string;
  icon: React.ReactNode;
  badge: string;
}> = {
  gemini: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50/70 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800/80',
    activeBorderColor: 'border-blue-500 ring-2 ring-blue-500/20',
    icon: <Sparkles className="w-5 h-5 text-blue-500" />,
    badge: 'Multimodal Nativo',
  },
  claude: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50/70 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800/80',
    activeBorderColor: 'border-amber-500 ring-2 ring-amber-500/20',
    icon: <Brain className="w-5 h-5 text-amber-500" />,
    badge: 'Síntesis Profunda',
  },
  openai: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50/70 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800/80',
    activeBorderColor: 'border-emerald-500 ring-2 ring-emerald-500/20',
    icon: <Bot className="w-5 h-5 text-emerald-500" />,
    badge: 'Precisión Teórica',
  },
  kimi: {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50/70 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800/80',
    activeBorderColor: 'border-purple-500 ring-2 ring-purple-500/20',
    icon: <FileText className="w-5 h-5 text-purple-500" />,
    badge: 'Documentos Extensos',
  },
  nvidia: {
    color: 'text-lime-600 dark:text-lime-400',
    bgColor: 'bg-lime-50/70 dark:bg-lime-950/40',
    borderColor: 'border-lime-200 dark:border-lime-800/80',
    activeBorderColor: 'border-lime-500 ring-2 ring-lime-500/20',
    icon: <Cpu className="w-5 h-5 text-lime-500" />,
    badge: 'Inferencia Acelerada',
  },
};

export const MultiAISelector: React.FC<MultiAISelectorProps> = ({
  selectedProvider,
  onSelectProvider,
  disabled,
}) => {
  const [providers, setProviders] = useState<AIProviderInfo[]>(DEFAULT_PROVIDERS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProvidersStatus();
  }, []);

  const fetchProvidersStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/providers-status');
      const data = await res.json();
      if (data.success && Array.isArray(data.providers)) {
        setProviders(data.providers);
      }
    } catch (err) {
      console.warn('Could not fetch AI providers status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all space-y-4">
      {/* Header with Title & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-xs">
            <Radio className="w-5 h-5 animate-pulse text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Ecosistema & Red Multi-IA Antifallos
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                Failover Activo
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              5 motores de Inteligencia Artificial cooperando en tiempo real para garantizar disponibilidad total.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchProvidersStatus}
          disabled={isLoading || disabled}
          title="Actualizar estado de conexiones de los agentes"
          className="self-end sm:self-auto px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Estado Red</span>
        </button>
      </div>

      {/* Auto Switcher Banner / Recommendation */}
      <div 
        onClick={() => !disabled && onSelectProvider('auto')}
        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
          selectedProvider === 'auto'
            ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 text-white border-indigo-600 shadow-md shadow-indigo-500/10'
            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            selectedProvider === 'auto' ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black">
                Modo Automático: Torneo & Cascadas Inteligente (Recomendado)
              </span>
              {selectedProvider === 'auto' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 font-bold text-white">
                  SELECCIONADO
                </span>
              )}
            </div>
            <p className={`text-[11px] mt-0.5 ${selectedProvider === 'auto' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
              Evalúa los 5 motores en paralelo y activa automáticamente el de mayor puntaje sin interrumpir tus clases.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
            selectedProvider === 'auto'
              ? 'bg-white text-indigo-600 border-white'
              : 'border-slate-300 dark:border-slate-600'
          }`}>
            {selectedProvider === 'auto' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </div>
        </div>
      </div>

      {/* Grid of AI Models Organized Visually */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Selección Directa de Agente de IA
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Haz clic en cualquiera para fijarlo
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {Array.isArray(providers) && providers.map((p) => {
            const isSelected = selectedProvider === p.id;
            const meta = PROVIDER_METADATA[p.id] || PROVIDER_METADATA.gemini;

            return (
              <div
                key={p.id}
                onClick={() => !disabled && onSelectProvider(p.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? `${meta.bgColor} ${meta.activeBorderColor} shadow-sm`
                    : 'bg-white dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Bar: Icon, Title, Check */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-white dark:bg-slate-900 shadow-xs' : 'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        {meta.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {p.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block truncate">
                          {p.model}
                        </span>
                      </div>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    {p.description}
                  </p>
                </div>

                {/* Footer Badges */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/80 dark:border-slate-800/60 mt-auto">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}>
                    {meta.badge}
                  </span>

                  {p.configured ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Conectado
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      Respaldo
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Antifailover Notice */}
      <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-2.5 text-xs text-indigo-900 dark:text-indigo-300">
        <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
        <span className="text-[11px] leading-relaxed">
          <strong>Garantía de Continuidad:</strong> Todos los modelos disponen de reintentos inteligentes. Si algún servidor sufre saturación, la petición migrará de inmediato sin perder tus respuestas.
        </span>
      </div>
    </div>
  );
};
