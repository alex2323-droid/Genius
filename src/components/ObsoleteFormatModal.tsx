import React from 'react';
import { 
  AlertTriangle, 
  ExternalLink, 
  X, 
  FileCode2, 
  CheckCircle2, 
  ArrowUpRight, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { getConverterLinks, type ConverterLink, type ParsedFile } from '../utils/fileParser.ts';

interface ObsoleteFormatModalProps {
  file: ParsedFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRemoveAndReplace?: (fileId: string) => void;
}

export const ObsoleteFormatModal: React.FC<ObsoleteFormatModalProps> = ({
  file,
  isOpen,
  onClose,
  onRemoveAndReplace,
}) => {
  if (!isOpen || !file) return null;

  const converters: ConverterLink[] = getConverterLinks(file.extension);
  const extUpper = file.extension.toUpperCase();

  const handleOpenConverter = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="obsolete-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/60 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="bg-amber-50 dark:bg-amber-950/40 px-5 py-4 border-b border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="obsolete-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Formato obsoleto detectado
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                  .{extUpper}
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Convierte tu archivo a PDF para una lectura 100% limpia con IA
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* File summary chip */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              {extUpper}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{file.name}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {(file.size / 1024).toFixed(0)} KB • {file.obsoleteReason || 'Formato binario heredado sin soporte vectorial.'}
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
            <p>
              Los archivos <strong className="font-semibold text-slate-900 dark:text-slate-100">.{extUpper}</strong> son formatos legados que pueden perder tablas, fórmulas matemáticas, esquemas y formateo estructurado durante la extracción tradicional.
            </p>
            <p className="flex items-center gap-1.5 text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                El formato <strong>PDF</strong> permite que la IA analice el documento mediante lectura multimodal nativa, manteniendo cada gráfico, fórmula y diapositiva intacta.
              </span>
            </p>
          </div>

          {/* Recommended Converters */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Páginas gratuitas recomendadas para convertir a PDF:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {converters.map((conv, idx) => (
                <div
                  key={conv.name}
                  className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    conv.recommended
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{conv.name}</span>
                      {conv.recommended && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">
                      {conv.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenConverter(conv.url)}
                    className="self-start sm:self-auto shrink-0 px-3.5 py-2 min-h-[40px] text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span>Abrir {conv.name}</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Steps Tip */}
          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-300">💡 Instrucciones rápidas:</span> Haz clic en cualquiera de las páginas arriba, arrastra tu archivo <code className="text-amber-700 dark:text-amber-300 font-mono">.{extUpper}</code>, descarga el PDF resultante y súbelo aquí para obtener el plan de estudio más nítido.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Continuar con este archivo de todos modos
          </button>

          {onRemoveAndReplace && (
            <button
              type="button"
              onClick={() => {
                const url = converters[0]?.url || 'https://cloudconvert.com/document-converter';
                handleOpenConverter(url);
                onRemoveAndReplace(file.id);
                onClose();
              }}
              className="w-full sm:w-auto px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Abrir Conversor y Quitar {extUpper}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
