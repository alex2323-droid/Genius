import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Presentation, 
  Trash2, 
  Calendar, 
  Percent, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  FileX2,
  HelpCircle,
  Layers,
  ArrowRight,
  ExternalLink,
  BarChart2,
  BookOpen,
  Sliders
} from 'lucide-react';
import { 
  parseUploadedFile, 
  validateDocumentFile,
  type ParsedFile, 
  type FileValidationResult 
} from '../utils/fileParser.ts';
import { ObsoleteFormatModal } from './ObsoleteFormatModal.tsx';
import { FileValidationWarningModal } from './FileValidationWarningModal.tsx';
import { MultiAISelector } from './MultiAISelector.tsx';
import { computeMaterialComplexityProfile } from '../utils/documentAnalyzer.ts';

import { useCustomLogo } from '../utils/logoStorage.ts';

interface PlanConfiguratorProps {
  onGeneratePlan: (params: {
    subject: string;
    daysLeft: number;
    targetGrade: number;
    studyHoursPerDay: number;
    files: ParsedFile[];
    customNotes: string;
    preferredProvider?: string;
    customStyleInstructions?: string;
  }) => Promise<void>;
  isGenerating: boolean;
}

interface StylePreset {
  id: string;
  label: string;
  description: string;
  promptGuideline: string;
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'absolute-fidelity',
    label: 'Fidelidad Absoluta al Texto',
    description: 'Se ciñe estrictamente a tus diapositivas y apuntes, evitando definiciones externas genéricas o inventadas.',
    promptGuideline: 'FIDELIDAD ABSOLUTA AL TEXTO: Limítate estrictamente al contenido conceptual, nombres, datos, clasificaciones y términos tal como están expresados en los apuntes del estudiante. No uses explicaciones o definiciones genéricas de internet que no guarden relación directa con sus documentos.',
  },
  {
    id: 'no-boilerplate',
    label: 'Sin Relleno ni Redundancias',
    description: 'Evita introducciones repetitivas como "En el ámbito de...", "Es importante destacar que...". Va directo al grano.',
    promptGuideline: 'CONCISIÓN Y COBERTURA DIRECTA: Elimina introducciones redundantes, frases de relleno corporativo o de transición como "En este tema analizaremos...", "Es fundamental comprender...". Entra directamente a la explicación teórica o resolución técnica del concepto.',
  },
  {
    id: 'high-rigor',
    label: 'Rigor Técnico de Alto Nivel',
    description: 'Usa terminología científica exacta, fórmulas matemáticas formales y nomenclatura del examen.',
    promptGuideline: 'RIGOR TÉCNICO UNIVERSITARIO: Emplea la nomenclatura exacta, variables matemáticas, fórmulas desglosadas y terminología científica de nivel universitario/académico que corresponda. Evita simplificaciones excesivas o metáforas infantiles.',
  },
  {
    id: 'real-cases',
    label: 'Casos y Ejemplos de Examen Real',
    description: 'Sustituye analogías simples por problemas, casos clínicos o de diseño reales de tus documentos.',
    promptGuideline: 'CASOS Y EJEMPLOS REALES: Evita analogías genéricas de la vida cotidiana (ej: coches, frutas). En su lugar, usa casos de estudio prácticos, problemas cuantitativos, síntomas clínicos o de ingeniería documentados en el material del estudiante.',
  },
  {
    id: 'dynamic-non-repetitive',
    label: 'Estructuras Dinámicas No-Repetitivas',
    description: 'Fuerza a variar el fraseo y el formato en cada tema para evitar estructuras idénticas.',
    promptGuideline: 'ESTRUCTURACIÓN DINÁMICA: No utilices la misma plantilla de redacción o el mismo patrón de inicio para todos los conceptos o ejercicios. Varía la estructura sintáctica, el tipo de pregunta y el enfoque explicativo para cada día.',
  }
];

const SAMPLE_SUBJECT = 'Fisiología y Biología Celular: Transporte de Membrana y Potenciales de Acción';
const SAMPLE_NOTES = 'El profesor indicó que el 40% del examen evaluará la bomba Na+/K+ ATPasa, canales de voltaje y la ecuación de Nernst-Goldman.';

export const PlanConfigurator: React.FC<PlanConfiguratorProps> = ({
  onGeneratePlan,
  isGenerating,
}) => {
  const [subject, setSubject] = useState('');
  const [daysLeft, setDaysLeft] = useState<number>(3);
  const [targetGrade, setTargetGrade] = useState<number>(85);
  const [studyHoursPerDay, setStudyHoursPerDay] = useState<number>(2);
  const [customNotes, setCustomNotes] = useState('');
  const [selectedStylePresets, setSelectedStylePresets] = useState<string[]>(['no-boilerplate', 'absolute-fidelity']);
  const [customStyleText, setCustomStyleText] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [obsoleteFilePrompt, setObsoleteFilePrompt] = useState<ParsedFile | null>(null);
  const [isObsoleteModalOpen, setIsObsoleteModalOpen] = useState(false);
  const [validationIssues, setValidationIssues] = useState<Array<{ fileName: string; result: FileValidationResult }>>([]);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  const currentLogo = useCustomLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const complexityProfile = computeMaterialComplexityProfile(files, customNotes, targetGrade, daysLeft);

  const handleFiles = async (selectedFiles: FileList | File[]) => {
    setParseError(null);
    setIsParsing(true);
    const parsedList: ParsedFile[] = [];
    const issues: Array<{ fileName: string; result: FileValidationResult }> = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // 1. PRE-UPLOAD VALIDATION: Check for empty 0-byte or corrupted headers
      const validation = await validateDocumentFile(file);
      if (!validation.isValid) {
        issues.push({
          fileName: file.name,
          result: validation,
        });
        continue; // Skip damaged or 0-byte file from processing
      }

      try {
        const parsed = await parseUploadedFile(file);
        parsed.validationStatus = 'valid';
        parsedList.push(parsed);
      } catch (err: any) {
        console.error('Error parsing file:', err);
        issues.push({
          fileName: file.name,
          result: {
            isValid: false,
            isCorrupted: true,
            isEmpty: false,
            isUnsupported: false,
            status: 'corrupted',
            title: 'Error de extracción de contenido',
            message: `El archivo "${file.name}" está dañado o tiene un formato no estándar.`,
            details: err?.message || 'Error durante el procesamiento binario.',
            suggestedAction: 'Convierte el archivo a PDF antes de subirlo.',
            fixGuide: [
              'Abre el archivo original en tu lector habitual.',
              'Exporta o imprime como PDF limpio.',
              'Vuelve a subir el PDF generado.'
            ],
            safeSize: file.size,
          }
        });
      }
    }

    if (parsedList.length > 0) {
      setFiles(prev => [...prev, ...parsedList]);
    }
    setIsParsing(false);

    // If there were validation issues (damaged/empty files), show clear warning modal
    if (issues.length > 0) {
      setValidationIssues(issues);
      setIsValidationModalOpen(true);
      if (parsedList.length === 0) {
        setParseError(`Se detectaron ${issues.length} archivo(s) vacío(s) o dañado(s) que no pudieron ser procesados.`);
      }
    }

    // Check if any of the valid parsed files is an obsolete format
    const firstObsolete = parsedList.find(f => f.isObsolete);
    if (firstObsolete && issues.length === 0) {
      setObsoleteFilePrompt(firstObsolete);
      setIsObsoleteModalOpen(true);
    }

    // Auto-fill subject from first file name if empty
    if (!subject && parsedList.length > 0) {
      const cleanName = parsedList[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setSubject(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const handleLoadSample = () => {
    setSubject(SAMPLE_SUBJECT);
    setCustomNotes(SAMPLE_NOTES);
    setDaysLeft(3);
    setTargetGrade(90);
    setStudyHoursPerDay(3);
    
    // Create a mock loaded file for the demo
    const sampleParsed: ParsedFile = {
      id: `sample-${Date.now()}`,
      name: 'Diapositivas_Transporte_Membrana.pptx',
      size: 420 * 1024,
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      extension: 'pptx',
      slideCount: 24,
      wordCount: 1850,
      text: `
      DIAPOSITIVA 1: Transporte a través de la Membrana Celular.
      DIAPOSITIVA 2: Membrana plasmática como bicapa lipídica anfipática. Permeabilidad selectiva.
      DIAPOSITIVA 3: Transporte Pasivo: Difusión simple (gases O2, CO2, moléculas hidrofóbicas) y Difusión facilitada (canales iónicos y transportadores GLUT). Ley de Fick.
      DIAPOSITIVA 4: Ósmosis y Presión Osmótica. Soluciones isotónicas, hipotónicas e hipertónicas.
      DIAPOSITIVA 5: Transporte Activo Primario: Bomba Na+/K+ ATPasa. Expulsa 3 Na+ e introduce 2 K+ hidrolizando 1 ATP. Mantiene el gradiente electroquímico y el volumen celular.
      DIAPOSITIVA 6: Transporte Activo Secundario: Simporte (Cotransporte Na+/Glucosa SGLT) y Antiporte (Intercambiador Na+/Ca2+, Na+/H+).
      DIAPOSITIVA 7: Potencial de Reposo de Membrana (aprox -70 mV en neuronas). Predominio de la conductancia a K+ a través de canales de fuga.
      DIAPOSITIVA 8: Ecuación de Nernst para calcular el potencial de equilibrio de un ion específico. Ecuación de Goldman-Hodgkin-Katz (GHK) que considera las permeabilidades relativas de Na+, K+ y Cl-.
      DIAPOSITIVA 9: El Potencial de Acción: Fases de Despolarización (apertura masiva de canales de Na+ dependientes de voltaje, retroalimentación positiva de Hodgkin), Repolarización (inactivación de compuertas h de Na+ y apertura de canales de K+ dependientes de voltaje retardados), e Hiperpolarización post-potencial.
      DIAPOSITIVA 10: Períodos refractarios absoluto (canales de Na+ inactivados, compuerta h cerrada) y relativo (requiere estímulo supraumbral, canales de K+ aún abiertos).
      DIAPOSITIVA 11: Propagación continua vs conducción saltatoria en axones mielinizados por células de Schwann u oligodendrocitos en los Nódulos de Ranvier.
      `,
    };
    setFiles([sampleParsed]);
  };

  const getCombinedStyleInstructions = (): string => {
    const activeGuidelines = STYLE_PRESETS
      .filter(preset => selectedStylePresets.includes(preset.id))
      .map(preset => preset.promptGuideline);
    
    const parts = [...activeGuidelines];
    if (customStyleText.trim()) {
      parts.push(`INSTRUCCIONES ADICIONALES DEL ESTUDIANTE: ${customStyleText.trim()}`);
    }
    return parts.join('\n\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) {
      setParseError('Por favor sube al menos un archivo (.pdf, .pptx, .ppt, .docx, .doc) o carga el ejemplo.');
      return;
    }
    await onGeneratePlan({
      subject: subject || 'Temario de Estudio',
      daysLeft,
      targetGrade,
      studyHoursPerDay,
      files,
      customNotes,
      preferredProvider: selectedProvider,
      customStyleInstructions: getCombinedStyleInstructions(),
    });
  };

  // Strategic adaptation guidance
  const getDayStrategy = (days: number) => {
    if (days <= 3) {
      return {
        label: `Modo Intensivo (${days} día${days > 1 ? 's' : ''}) - Guía Extensa de Alto Impacto`,
        color: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
        desc: 'Guía de Estudio Ampliada y Exhaustiva: Al contar con pocos días, la IA genera explicaciones más largas, desgloses profundos paso a paso y la mayor densidad de conceptos, fórmulas y trampas por día para estudiar sin consultar múltiples documentos dispersos.',
      };
    } else if (days <= 7) {
      return {
        label: 'Sprint Intensivo Semanal',
        color: 'text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
        desc: 'Distribución equilibrada: asimilación de bloques temáticos, guía de estudio rigurosa, práctica diaria activa y simulacro final.',
      };
    } else {
      return {
        label: 'Plan de Maestría y Repaso Espaciado',
        color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
        desc: 'Consolidación a largo plazo: curva del olvido, práctica intercalada, autoevaluaciones y resolución de casos complejos.',
      };
    }
  };

  const getGradeStrategy = (grade: number) => {
    if (grade >= 90) {
      return {
        label: 'Sobresaliente / Excelencia (90-100%) • Nivel Avanzado / Máster',
        color: 'text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60',
        desc: 'Exigencia Máxima y Cobertura 100%: Para asegurar nota alta se genera MÁS VOLUMEN de material para abarcar todos los detalles del temario.',
        volume: '📊 Quota Diaria: 8-12 conceptos clave • 6-10 fórmulas • 6-10 trampas de examen • 8-12 flashcards • 6-10 ejercicios avanzados por día.',
      };
    } else if (grade >= 75) {
      return {
        label: 'Notable Alto (75-89%) • Nivel Intermedio-Avanzado',
        color: 'text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60',
        desc: 'Dominio Amplio: Cobertura sólida de todos los módulos principales del temario con ejercicios tipo examen real.',
        volume: '📊 Quota Diaria: 5-8 conceptos clave • 4-6 fórmulas • 4-6 trampas • 6-8 flashcards • 4-6 ejercicios intermedios por día.',
      };
    } else {
      return {
        label: 'Aprobado Seguro (50-74%) • Nivel Esencial / Fundamental',
        color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
        desc: 'Foco en Garantía de Base (Regla 80/20): Módulo sintético enfocado en asegurar los puntos indispensables sin saturar.',
        volume: '📊 Quota Diaria: 3-5 conceptos núcleo • 3-4 fórmulas • 2-3 trampas indispensables • 4-5 flashcards • 3-4 ejercicios directos por día.',
      };
    }
  };

  const dayStrategy = getDayStrategy(daysLeft);
  const gradeStrategy = getGradeStrategy(targetGrade);

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 px-2 sm:px-6">
      {/* Hero Header */}
      <div className="text-center mb-6 sm:mb-8 px-2">
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="relative group cursor-pointer" onClick={handleLoadSample}>
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto flex items-center justify-center">
              <img 
                src={currentLogo} 
                alt="Genius Logo" 
                className="w-full h-full object-contain filter drop-shadow-md transform group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 mb-2 sm:mb-3 border border-blue-200/60 dark:border-blue-800/60">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" /> Planificador de Estudio Integral con IA
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Sube tus archivos y diseña tu estudio a medida con <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">Genius</span>
        </h1>
        <p className="mt-2 text-xs sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Genera una guía de conceptos clave, cronograma diario, tarjetas de memorización y ejercicios calibrados exactamente según tus días disponibles y nota meta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
        {/* Step 1: File Upload Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Sube el material de la materia</h2>
            </div>
            <button
              type="button"
              onClick={handleLoadSample}
              className="self-start sm:self-auto text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3.5 py-2.5 min-h-[44px] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Probar con Temario de Ejemplo
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
            Soporta presentaciones, lecturas, apuntes o temarios en formato <span className="font-semibold text-slate-700 dark:text-slate-300">.PPT, .PPTX, .PDF, .DOC, .DOCX</span>
          </p>

          {/* Drag and drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 sm:p-8 text-center cursor-pointer transition-all active:scale-[0.99] ${
              isDragging
                ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 scale-[0.99]'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.md"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              className="hidden"
            />
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              <span className="sm:hidden">Toca aquí para seleccionar archivos</span>
              <span className="hidden sm:inline">Arrastra tus archivos aquí o haz clic para seleccionarlos</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Diapositivas (.pptx/.ppt), lecturas/apuntes (.pdf), documentos (.doc/.docx)
            </p>

            {/* Supported extensions badge row */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              {['.PDF', '.PPTX', '.PPT', '.DOCX', '.DOC'].map(badge => (
                <span
                  key={badge}
                  className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-mono font-medium bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Clean reading PDF conversion recommendation banner */}
          <div className="mt-3.5 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                <strong>Lectura limpia y nítida:</strong> Los archivos en <strong>PDF</strong> conservan fórmulas, ecuaciones y diagramas intactos. Si tienes archivos .DOC o .PPT clásicos, conviértelos a PDF para un mejor resultado.
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.open('https://cloudconvert.com/document-converter', '_blank', 'noopener,noreferrer');
              }}
              className="shrink-0 px-3 py-1.5 font-bold text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Conversores gratis</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {isParsing && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span>Extrayendo y analizando diapositivas y textos...</span>
            </div>
          )}

          {parseError && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200 dark:border-red-900/60">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Uploaded files list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Archivos Cargados ({files.length}):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`flex flex-col justify-between p-3 rounded-xl border transition-all gap-2.5 ${
                      file.isObsolete
                        ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/70 shadow-2xs'
                        : 'bg-slate-100/80 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                          file.isObsolete
                            ? 'bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                        }`}>
                          {file.extension.includes('ppt') ? (
                            <Presentation className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">{file.name}</p>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Verificado
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {(file.size / 1024).toFixed(0)} KB
                            {file.slideCount ? ` • ${file.slideCount} diapositivas` : ''}
                            {file.wordCount ? ` • ~${file.wordCount} palabras` : ''}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
                        title="Eliminar archivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Obsolete format conversion callout */}
                    {file.isObsolete && (
                      <div className="pt-2 border-t border-amber-200/80 dark:border-amber-900/50 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Formato .{file.extension.toUpperCase()} clásico</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setObsoleteFilePrompt(file);
                            setIsObsoleteModalOpen(true);
                          }}
                          className="px-2.5 py-1 min-h-[32px] text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 hover:bg-blue-200/80 dark:bg-blue-950/80 dark:hover:bg-blue-900 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>Convertir a PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Adaptive Parameters */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-2.5 mb-5 sm:mb-6">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">Parámetros de tu Examen y Metas</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Subject name */}
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Nombre de la Materia o Examen
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Biología Celular - Segundo Parcial, o Estructuras de Datos"
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[44px]"
              />
            </div>

            {/* Days remaining */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Días restantes para el examen
                </label>
                <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                  {daysLeft} {daysLeft === 1 ? 'día' : 'días'}
                </span>
              </div>

              {/* Day presets */}
              <div className="grid grid-cols-5 gap-1 sm:gap-1.5 mb-3">
                {[1, 3, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDaysLeft(d)}
                    className={`py-2 min-h-[44px] text-xs font-semibold rounded-xl sm:rounded-lg border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                      daysLeft === d
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {d} {d === 1 ? 'd' : 'd'}
                  </button>
                ))}
              </div>

              <div className="py-1">
                <input
                  type="range"
                  min="1"
                  max="45"
                  value={daysLeft}
                  onChange={(e) => setDaysLeft(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-6"
                />
              </div>

              {/* Dynamic day strategy insight */}
              <div className={`mt-3 p-2.5 rounded-lg border text-xs ${dayStrategy.color}`}>
                <p className="font-semibold">{dayStrategy.label}</p>
                <p className="mt-0.5 opacity-90">{dayStrategy.desc}</p>
              </div>
            </div>

            {/* Target Grade % */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  <Percent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Nota que deseas sacar
                </label>
                <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {targetGrade}%
                </span>
              </div>

              {/* Grade presets */}
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5 mb-3">
                {[
                  { val: 70, label: '70%' },
                  { val: 80, label: '80%' },
                  { val: 90, label: '90%' },
                  { val: 100, label: '100%' },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setTargetGrade(item.val)}
                    className={`py-2 min-h-[44px] text-xs font-semibold rounded-xl sm:rounded-lg border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                      targetGrade === item.val
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {item.val}%
                  </button>
                ))}
              </div>

              <div className="py-1">
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={targetGrade}
                  onChange={(e) => setTargetGrade(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-6"
                />
              </div>

              {/* Dynamic grade strategy insight */}
              <div className={`mt-3 p-3 rounded-xl border text-xs space-y-1 ${gradeStrategy.color}`}>
                <p className="font-bold">{gradeStrategy.label}</p>
                <p className="opacity-90 leading-relaxed">{gradeStrategy.desc}</p>
                <p className="font-semibold text-[11px] pt-1 border-t border-current/20 opacity-95">{gradeStrategy.volume}</p>
              </div>
            </div>

            {/* Study hours per day */}
            <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">Horas de estudio disponibles por día</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">Ajusta la carga horaria a tu disponibilidad</p>
                </div>
              </div>
              <div className="grid grid-cols-5 sm:flex items-center gap-1 sm:gap-2">
                {[1, 2, 3, 4, 6].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setStudyHoursPerDay(h)}
                    className={`px-2.5 py-2 min-h-[44px] text-xs font-semibold rounded-xl sm:rounded-lg border transition-all cursor-pointer flex items-center justify-center active:scale-95 ${
                      studyHoursPerDay === h
                        ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {h}h/d
                  </button>
                ))}
              </div>
            </div>

            {/* Optional professor notes */}
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Indicaciones especiales o notas del profesor (Opcional)
              </label>
              <textarea
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Ej: Puso mucho énfasis en el capítulo 4; no entran demostraciones teóricas largas; el examen será mitad tipo test y mitad problemas..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Content Style Configuration */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm transition-colors">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
              3
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Configuración de Estilo de Contenido
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personaliza la redacción para evitar explicaciones genéricas o repetitivas</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Presets Grid */}
            <div>
              <span className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                Ajustes de Calidad y Enfoque (Selecciona los que desees aplicar)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STYLE_PRESETS.map((preset) => {
                  const isSelected = selectedStylePresets.includes(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedStylePresets(prev =>
                          prev.includes(preset.id)
                            ? prev.filter(id => id !== preset.id)
                            : [...prev, preset.id]
                        );
                      }}
                      className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-800 shadow-2xs'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by button click
                        className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer animate-none"
                      />
                      <div>
                        <p className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-blue-800 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {preset.label}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Style Text Area */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Instrucciones de Estilo Personalizadas (Opcional)
              </label>
              <textarea
                rows={2}
                value={customStyleText}
                onChange={(e) => setCustomStyleText(e.target.value)}
                placeholder="Ej: 'No uses metáforas de frutas para explicar código', 'Varía las opciones de respuesta del test', 'Escribe de manera súper concisa en viñetas'..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Material Volume & Complexity Engine Card */}
        {files.length > 0 && (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-linear-to-br from-blue-50/80 via-indigo-50/50 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-slate-900/40 p-4 sm:p-5 shadow-xs transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-blue-200/70 dark:border-blue-800/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Escalado por Volumen de Material
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full bg-blue-600 text-white tracking-wide">
                      {complexityProfile.tierLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    A mayor cantidad de material proporcionado, más larga y profunda es la guía y mayor la complejidad de los ejercicios.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300">
                <span>Multiplicador:</span>
                <span className="font-extrabold">{complexityProfile.complexityMultiplier}x</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-3.5">
              <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Volumen Detectado</p>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  ~{complexityProfile.totalWords.toLocaleString()}
                  <span className="text-xs font-normal text-slate-500 ml-1">palabras</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{complexityProfile.fileCount} documento(s)</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Longitud de Guía</p>
                <p className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
                  {complexityProfile.conceptsPerDay * daysLeft}
                  <span className="text-xs font-normal text-slate-500 ml-1">conceptos</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{complexityProfile.conceptsPerDay} por día</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Banco de Ejercicios</p>
                <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {complexityProfile.exercisesPerDay * daysLeft}
                  <span className="text-xs font-normal text-slate-500 ml-1">problemas</span>
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{complexityProfile.exercisesPerDay} por día</p>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Nivel de Ejercicios</p>
                <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 mt-1 truncate">
                  {complexityProfile.complexityTier === 'mastery_heavy' ? 'Máster / Multivariable' : complexityProfile.complexityTier === 'extended' ? 'Avanzado con Casos' : 'Estándar Universitario'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Calibrado al {targetGrade}%</p>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-blue-100/50 dark:bg-blue-950/40 px-3 py-2 rounded-xl flex items-center gap-2">
              <span className="font-semibold text-blue-700 dark:text-blue-300 shrink-0">Calibración:</span>
              <span className="truncate">{complexityProfile.rationaleText}</span>
            </div>
          </div>
        )}

        {/* Multi-AI Resilience & Redundancy Selector */}
        <MultiAISelector
          selectedProvider={selectedProvider}
          onSelectProvider={setSelectedProvider}
          disabled={isGenerating}
        />

        {/* Submit Button */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            id="btn-generate-plan-submit"
            disabled={isGenerating || files.length === 0}
            className="w-full sm:w-auto min-w-[280px] min-h-[52px] px-6 sm:px-8 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-2xl sm:rounded-xl font-bold text-sm sm:text-base shadow-lg shadow-blue-600/25 hover:shadow-blue-600/35 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 sm:gap-3 group cursor-pointer"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Generando con IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform shrink-0" />
                <span>Crear Guía y Ejercicios</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
              </>
            )}
          </button>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 text-center">
            Cronograma diario, resumen ejecutivo, fórmulas, flashcards y ejercicios adaptados.
          </p>
        </div>
      </form>

      {/* Obsolete format detection modal */}
      <ObsoleteFormatModal
        file={obsoleteFilePrompt}
        isOpen={isObsoleteModalOpen}
        onClose={() => setIsObsoleteModalOpen(false)}
        onRemoveAndReplace={(fileId) => {
          removeFile(fileId);
          setIsObsoleteModalOpen(false);
          // Focus or prompt to select the converted PDF
          setTimeout(() => {
            fileInputRef.current?.click();
          }, 300);
        }}
      />

      {/* Pre-upload file validation warning modal for damaged or empty files */}
      <FileValidationWarningModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        validationIssues={validationIssues}
      />
    </div>
  );
};
