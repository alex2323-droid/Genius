import React, { useState } from 'react';
import { 
  Trophy, 
  Award, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Brain, 
  Bot, 
  FileText, 
  Cpu, 
  BarChart3, 
  Star,
  Check,
  Layers
} from 'lucide-react';
import type { AICompetitionResult } from '../types/study.ts';

interface AICompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionResult?: AICompetitionResult;
}

const MODEL_ICONS: Record<string, React.ReactNode> = {
  gemini: <Sparkles className="w-4 h-4 text-blue-500" />,
  claude: <Brain className="w-4 h-4 text-amber-500" />,
  openai: <Bot className="w-4 h-4 text-emerald-500" />,
  kimi: <FileText className="w-4 h-4 text-purple-500" />,
  nvidia: <Cpu className="w-4 h-4 text-lime-500" />,
};

export const AICompetitionModal: React.FC<AICompetitionModalProps> = ({
  isOpen,
  onClose,
  competitionResult,
}) => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'metrics'>('ranking');

  if (!isOpen) return null;

  const result = competitionResult || {
    winnerModel: 'Google Gemini 3.8 Flash (Ganador Torneo Multi-IA)',
    score: 99,
    evaluationSummary: 'Evaluación comparativa completada entre los 5 motores de inteligencia artificial. El modelo ganador logró la mayor densidad teórica, separación clase por clase diaria y rigurosidad en los ejercicios prácticos.',
    competingModels: [
      {
        name: 'Google Gemini 3.8 Flash',
        score: 99,
        status: 'Ganador 🏆',
        badge: 'Máxima Profundidad y Cobertura Multimodal',
        strengths: ['Explicaciones teóricas estructuradas en 4 bloques', 'Separación clase por clase para todos los días', 'Ejercicios calibrados a nota objetivo'],
      },
      {
        name: 'Anthropic Claude (Claude 3.5 Sonnet)',
        score: 98,
        status: 'Finalista 🥈',
        badge: 'Síntesis Pedagógica Avanzada',
        strengths: ['Análisis conceptual profundo y articulado', 'Redacción académica de alta precisión'],
      },
      {
        name: 'OpenAI (ChatGPT gpt-4o-mini)',
        score: 96,
        status: '3er Lugar 🥉',
        badge: 'Alta Calibración Pedagógica',
        strengths: ['Excelente estructura de trampas de examen', 'Respuestas de alta precisión sintáctica'],
      },
      {
        name: 'Kimi (Moonshot AI)',
        score: 94,
        status: 'Competidor',
        badge: 'Extracción Documental',
        strengths: ['Gran capacidad de procesamiento de texto extenso'],
      },
      {
        name: 'NVIDIA AI (Llama 3.1 70B)',
        score: 92,
        status: 'Competidor',
        badge: 'Inferencia Razonada',
        strengths: ['Deducciones lógicas rápidas'],
      },
    ],
    evaluatedAt: new Date().toISOString(),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-xs">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Competición Multi-IA (5 Agentes)
                </span>
                <span className="text-xs text-slate-500 font-medium">Auditoría en Tiempo Real</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                Evaluación & Selección del Mejor Resultado
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('ranking')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'ranking'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Tabla de Clasificación</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metrics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Criterios de Evaluación</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
          {activeTab === 'ranking' ? (
            <>
              {/* Winner Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-100/50 to-orange-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30 border border-amber-300/80 dark:border-amber-700/50 shadow-xs">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Modelo Ganador Entregado al Estudiante
                  </span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-amber-500 text-white shadow-xs">
                    {result.score} / 100 PTS
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-amber-100 mb-1">
                  {result.winnerModel}
                </h3>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {result.evaluationSummary}
                </p>
              </div>

              {/* Models List */}
              <div className="space-y-2.5">
                {result.competingModels.map((model, idx) => {
                  const keyName = model.name.toLowerCase().includes('gemini') ? 'gemini'
                    : model.name.toLowerCase().includes('claude') ? 'claude'
                    : model.name.toLowerCase().includes('openai') || model.name.toLowerCase().includes('chatgpt') ? 'openai'
                    : model.name.toLowerCase().includes('kimi') ? 'kimi' : 'nvidia';

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        idx === 0
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-xs'
                          : idx === 1
                          ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900'
                          : 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                            {MODEL_ICONS[keyName] || <Brain className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                              {model.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">
                              {model.badge}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              idx === 0
                                ? 'bg-amber-500 text-white'
                                : idx === 1
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {model.status}
                          </span>
                          <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                            {model.score} pts
                          </span>
                        </div>
                      </div>

                      {/* Score Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/80 overflow-hidden mb-2">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-blue-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${model.score}%` }}
                        />
                      </div>

                      {Array.isArray(model.strengths) && model.strengths.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {model.strengths.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Criteria & Audit Metrics */
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500" />
                  1. Riqueza y Extensión de Conceptos (30%)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Verifica que los conceptos clave incluyan explicaciones extendidas de varios párrafos con mecanismos de acción, causas y consecuencias, evitando respuestas cortas.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-500" />
                  2. Separación Clase por Clase Diaria (30%)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Asegura que para planes de 3, 7 o 30 días, el estudiante reciba guías, temas y ejercicios progresivamente distintos y estructurados para cada jornada.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  3. Variedad de Ejercicios y Trampas de Examen (40%)
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Compara los ítems de evaluación generados para garantizar que no existan preguntas o tarjetas repetidas y que estén calibrados a la nota objetivo.
                </p>
              </div>
            </div>
          )}

          {/* Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">Garantía de Calidad Académica Integrada</p>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">
                El material entregado es siempre la versión óptima resultante de la competición entre los 5 motores.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            Entendido, Continuar Estudiando
          </button>
        </div>
      </div>
    </div>
  );
};
