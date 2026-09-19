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
  const [provider, setProvider] = useState<AIProviderInfo>(DEFAULT_GEMINI_PROVIDER);
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
        // Only keep providers that do NOT require paid credits
        const freeProviders = data.providers.filter((p: any) => !p.requiresPaidCredits);
        if (freeProviders.length > 0) {
          setProvider(freeProviders[0]);
        }
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
                Sin Créditos de Pago
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Generación académica activa y disponible de forma ilimitada y gratuita.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchProvidersStatus}
          disabled={isLoading || disabled}
          title="Verificar conexión activa con el Agente de Análisis"
          className="self-end sm:self-auto px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Estado Conexión</span>
        </button>
      </div>

      {/* Main Active Provider Card: Agente de Análisis */}
      <div 
        onClick={() => !disabled && onSelectProvider('gemini')}
        className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900/40 border border-blue-200 dark:border-blue-800/80 shadow-xs relative"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-blue-900 dark:text-blue-100">
                {provider.name}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100/80 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                {provider.model}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              {provider.description}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Conectado y Listo</span>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-3 border-t border-blue-100 dark:border-blue-900/50">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>PDFs & Diapositivas</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Respuesta en Segundos</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Cero Coste de Créditos</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            <Cpu className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Sub-modelos de Respaldo</span>
          </div>
        </div>
      </div>
    </div>
  );
};
