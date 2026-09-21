import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  ShieldCheck, 
  Check, 
  Trash2, 
  X, 
  AlertCircle, 
  Bot, 
  Palette 
} from 'lucide-react';
import { getCustomLogo, setCustomLogo, resetCustomLogo } from '../utils/logoStorage.ts';
import { AdminQAAgent } from './AdminQAAgent.tsx';
import type { StudyPlan } from '../types/study.ts';

interface AdminLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string | null;
  onInjectTestPlan?: (plan: StudyPlan) => void;
}

export const AdminLogoModal: React.FC<AdminLogoModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUserEmail,
  onInjectTestPlan,
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'logo'>('agent');
  const [previewUrl, setPreviewUrl] = useState<string | null>(getCustomLogo());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('La imagen supera los 8MB. Elige un archivo más ligero.');
      return;
    }

    // Client-side image compression and resizing (limits max dimension to 600px for optimal logo presentation and Firestore size safety)
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setPreviewUrl(result);
          setErrorMsg(null);
        }
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDimension = 600;
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const isPng = file.type === 'image/png';
            const outputFormat = isPng ? 'image/png' : 'image/jpeg';
            const outputQuality = isPng ? undefined : 0.85;
            const compressedDataUrl = canvas.toDataURL(outputFormat, outputQuality);
            setPreviewUrl(compressedDataUrl);
            setErrorMsg(null);
          } else {
            setPreviewUrl(rawDataUrl);
            setErrorMsg(null);
          }
        };
        img.onerror = () => {
          setPreviewUrl(rawDataUrl);
          setErrorMsg(null);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (previewUrl) {
      try {
        setIsSaving(true);
        setErrorMsg(null);
        await setCustomLogo(previewUrl);
        setSuccessMsg('¡Logo actualizado con éxito! Guardado en la base de datos de Firestore y aplicado para todos los estudiantes.');
        setTimeout(() => setSuccessMsg(null), 4000);
      } catch (err: any) {
        setErrorMsg('Error al guardar el logo en la base de datos: ' + (err.message || err));
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      setErrorMsg(null);
      await resetCustomLogo();
      setPreviewUrl(null);
      setSuccessMsg('Se ha restablecido el logo predeterminado en la base de datos.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg('Error al restablecer el logo original: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Panel Administrador
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  alexparababi23@gmail.com
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Agente QA Diagnóstico y Personalización de Marca
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-2 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('agent')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'agent'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>🤖 Agente QA Diagnóstico</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'logo'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>🖼️ Personalizar Logo</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {activeTab === 'agent' ? (
            <AdminQAAgent
              currentUserEmail={currentUserEmail}
              onInjectTestPlan={onInjectTestPlan}
            />
          ) : (
            <div className="space-y-5">
              {/* Email Match Status */}
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-start gap-3 text-xs text-blue-800 dark:text-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Modo Administrador de Marca Activo</p>
                  <p className="mt-0.5 opacity-90">
                    Sube tu propio archivo de imagen directamente desde la galería de tu dispositivo. Se mostrará exactamente como es, sin recortes ni alteraciones de fondo.
                  </p>
                </div>
              </div>

              {/* Feedback Messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* File Picker / Drag Drop Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Seleccionar Imagen desde Galería / Archivos
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Toca aquí para explorar tu galería
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Soporta PNG, JPG, SVG, WebP o GIF (Máximo 8MB)
                  </p>
                </div>
              </div>

              {/* Live Preview Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Vista Previa en Vivo del Logo
                </label>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-center min-h-[120px]">
                  {previewUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={previewUrl}
                        alt="Vista Previa de Logo Custom"
                        className="max-h-24 max-w-full object-contain"
                      />
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                        ✓ Imagen cargada desde tu dispositivo
                      </span>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 dark:text-slate-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">No has seleccionado ningún logo personalizado aún.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {activeTab === 'logo' && (
          <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleReset}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isSaving ? 'Restableciendo...' : 'Restablecer Original'}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!previewUrl || isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar y Aplicar Logo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
