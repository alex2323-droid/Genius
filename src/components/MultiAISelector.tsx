import React, { useEffect, useState } from 'react';
import { ShieldCheck, Cpu, Check, AlertCircle, RefreshCw, Sparkles, ChevronDown } from 'lucide-react';
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
    model: 'gemini-3.1-flash-lite / gemini-3.8-flash',
    description: 'Nativo de alta velocidad con procesamiento multimodal de PDFs y documentos.',
    isPrimary: true,
  },
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    configured: false,
    model: 'gpt-4o-mini',
    description: 'Excelente razonamiento lógico, pedagogía estructurada y precisión conceptual.',
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
    model: 'meta/llama-3.3-70b-instruct',
    description: 'Inferencia ultra-acelerada para resolución de ejercicios complejos y código.',
  },
];

export const MultiAISelector: React.FC<MultiAISelectorProps> = ({
  selectedProvider,
  onSelectProvider,
  disabled,
}) => {
  const [providers, setProviders] = useState<AIProviderInfo[]>(DEFAULT_PROVIDERS);
  const [isOpen, setIsOpen] = useState(false);
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

  const getProviderBadge = (p: AIProviderInfo) => {
    if (p.configured) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Conectado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Respaldo disponible
      </span>
    );
  };

  const currentLabel = 
    selectedProvider === 'auto'
      ? 'Automático (Cascada con tolerancia a fallos)'
      : providers.find(p => p.id === selectedProvider)?.name || 'Google Gemini';

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Red Multi-IA Antifallos
              </h4>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Resiliente
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gemini, OpenAI, Kimi y NVIDIA cooperan para que la lectura nunca falle por 503 o sobrecarga.
            </p>
          </div>
        </div>

        {/* Refresh status button */}
        <button
          type="button"
          onClick={fetchProvidersStatus}
          disabled={isLoading || disabled}
          title="Actualizar estado de conexión de proveedores"
          className="self-end sm:self-auto p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Selector Dropdown / Pills */}
      <div className="space-y-2 pt-1">
        <div className="flex flex-wrap gap-2">
          {/* Auto Mode */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectProvider('auto')}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              selectedProvider === 'auto'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto (Recomendado: Failover activo)</span>
          </button>

          {Array.isArray(providers) && providers.map((p) => {
            const isSelected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectProvider(p.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{p.name}</span>
                {getProviderBadge(p)}
              </button>
            );
          })}
        </div>

        {/* Agent Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          {Array.isArray(providers) && providers.map((p) => (
            <div
              key={p.id}
              className={`p-2.5 rounded-xl border text-xs transition-colors ${
                selectedProvider === p.id || (selectedProvider === 'auto' && p.isPrimary)
                  ? 'border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/20'
                  : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {p.name}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {p.model}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
          <AlertCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span>
            Si el agente seleccionado sufre saturación o rechazo, el sistema saltará inmediatamente al siguiente agente disponible sin perder tu avance.
          </span>
        </p>
      </div>
    </div>
  );
};
