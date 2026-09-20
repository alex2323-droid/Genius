import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Cpu, 
  ShieldCheck, 
  Zap, 
  FileText, 
  Radio, 
  RefreshCw 
} from 'lucide-react';
import type { AIProviderInfo } from '../types/study.ts';

interface MultiAISelectorProps {
  selectedProvider: string;
  onSelectProvider: (providerId: string) => void;
  disabled?: boolean;
}

const DEFAULT_GEMINI_PROVIDER: AIProviderInfo = {
  id: 'gemini',
  name: 'Agente de Análisis Documental y Pedagógico',
  configured: true,
  model: 'Procesador Neural Multimodal v3.8',
  description: 'Motor de análisis cognitivo para lectura profunda de apuntes, temarios, diapositivas y PDFs sin coste de créditos.',
  isPrimary: true,
  isFree: true,
  requiresPaidCredits: false,
};

export const MultiAISelector: React.FC<MultiAISelectorProps> = ({
  selectedProvider,
  onSelectProvider,
  disabled,
}) => {
  const [providers, setProviders] = useState<AIProviderInfo[]>([DEFAULT_GEMINI_PROVIDER]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProvidersStatus();
  }, []);

  const fetchProvidersStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/providers-status');
      const data = await res.json();
      if (data.success && Array.isArray(data.providers) && data.providers.length > 0) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-xs">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                Motor de Inteligencia Artificial
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                Respaldo Automático
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generación multimodal con soporte para Google Gemini y Anthropic Claude (Messages API).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchProvidersStatus}
          disabled={isLoading || disabled}
          title="Verificar conexión activa con los motores de IA"
          className="self-end sm:self-auto px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Verificar Estado</span>
        </button>
      </div>

      {/* Provider Cards */}
      <div className="space-y-3">
        {providers.map((p) => {
          const isSelected = selectedProvider === p.id || (selectedProvider === '' && p.isPrimary);
          return (
            <div
              key={p.id}
              onClick={() => !disabled && onSelectProvider(p.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-xs ring-1 ring-blue-400/50'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                      {p.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300">
                      {p.model}
                    </span>
                    {p.isPrimary && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        Por Defecto
                      </span>
                    )}
                    {p.isFree && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Gratuito
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                    {p.description}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {p.creditExhausted ? (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                      <span>Sin saldo (Usa Gemini)</span>
                    </div>
                  ) : p.configured ? (
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{isSelected ? 'Seleccionado' : 'Disponible'}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <span>Requiere API Key</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
