import React from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  FileX2, 
  FileQuestion, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  RefreshCw, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import type { FileValidationResult } from '../utils/fileParser.ts';

interface FileValidationWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationIssues: Array<{
    fileName: string;
    result: FileValidationResult;
  }>;
  onRetryWithCleanFile?: () => void;
}

export const FileValidationWarningModal: React.FC<FileValidationWarningModalProps> = ({
  isOpen,
  onClose,
  validationIssues,
  onRetryWithCleanFile,
}) => {
  if (!isOpen || validationIssues.length === 0) return null;

  const corruptedCount = validationIssues.filter(i => i.result.isCorrupted).length;
  const emptyCount = validationIssues.filter(i => i.result.isEmpty).length;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="validation-modal-title"
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-400 dark:border-amber-600/80 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-300 dark:border-amber-800">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 id="validation-modal-title" className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100">
                Atención: Archivos con Problemas Detectados
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Detectamos {validationIssues.length} documento{validationIssues.length > 1 ? 's' : ''} que no {validationIssues.length > 1 ? 'pueden ser leídos' : 'puede ser leído'} correctamente antes de enviarse al servidor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Cerrar advertencia"
            aria-label="Cerrar ventana de advertencia de validación de archivos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick summary badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          {emptyCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-900">
              <FileX2 className="w-3.5 h-3.5" />
              {emptyCount} {emptyCount === 1 ? 'Archivo vacío (0 bytes)' : 'Archivos vacíos (0 bytes)'}
            </span>
          )}
          {corruptedCount > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900">
              <AlertOctagon className="w-3.5 h-3.5" />
              {corruptedCount} {corruptedCount === 1 ? 'Archivo dañado o cabecera corrupta' : 'Archivos dañados o cabeceras corruptas'}
            </span>
          )}
        </div>

        {/* Detailed Issues List */}
        <div className="space-y-3">
          {validationIssues.map((issue, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100 break-all">
                    {issue.fileName}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black uppercase ${
                  issue.result.isEmpty 
                    ? 'bg-red-200 text-red-900 dark:bg-red-900/80 dark:text-red-200' 
                    : 'bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200'
                }`}>
                  {issue.result.title}
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {issue.result.message}
              </p>

              {issue.result.details && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  💡 <strong>Diagnóstico:</strong> {issue.result.details}
                </p>
              )}

              {/* Step by step fix advice */}
              {issue.result.fixGuide && issue.result.fixGuide.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-300 block mb-1">
                    ¿Cómo resolverlo?
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                    {issue.result.fixGuide.map((step, sIdx) => (
                      <li key={sIdx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Free Converter & Quick Help Action */}
        <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              <strong>Consejo de Genius:</strong> Puedes convertir tu documento en un PDF limpio de manera 100% gratuita para reparar cualquier estructura dañada.
            </span>
          </div>
          <button
            type="button"
            onClick={() => window.open('https://cloudconvert.com/document-converter', '_blank', 'noopener,noreferrer')}
            className="shrink-0 px-3 py-1.5 font-bold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 border border-blue-200 dark:border-blue-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>Reparar/Convertir Gratis</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Entendido, corregir archivo
          </button>
        </div>
      </div>
    </div>
  );
};
