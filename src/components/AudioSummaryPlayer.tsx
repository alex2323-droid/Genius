import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Headphones, 
  Sparkles, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Gauge, 
  RotateCcw,
  ListMusic,
  CheckCircle2,
  Radio
} from 'lucide-react';
import type { StudyPlan, CoreConcept, DefinitionOrFormula, ExamTrapItem } from '../types/study.ts';
import type { MappedTrap } from '../utils/dayStudyMapping.ts';

export interface AudioTrack {
  id: string;
  category: 'summary' | 'concept' | 'formula' | 'trap';
  title: string;
  subtitle?: string;
  speechText: string;
  dayNumber?: number;
}

interface AudioSummaryPlayerProps {
  plan: StudyPlan;
  selectedDayNumber: number | 'all';
  concepts: CoreConcept[];
  formulas: DefinitionOrFormula[];
  traps: MappedTrap[];
  isOpen: boolean;
  onClose: () => void;
  activeTrackId?: string | null;
  onTrackChange?: (trackId: string | null) => void;
}

export const AudioSummaryPlayer: React.FC<AudioSummaryPlayerProps> = ({
  plan,
  selectedDayNumber,
  concepts,
  formulas,
  traps,
  isOpen,
  onClose,
  activeTrackId,
  onTrackChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSupported, setIsSupported] = useState(true);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Build the playlist from the current view (filtered by day if applicable)
  const tracks: AudioTrack[] = useMemo(() => {
    const list: AudioTrack[] = [];
    const studyGuide = plan.studyGuide;

    // 1. Executive Summary Track
    if (studyGuide?.executiveSummary) {
      const cleanSummary = studyGuide.executiveSummary
        .replace(/[*_#`«»]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const dayPrefix = selectedDayNumber === 'all' 
        ? `Resumen general para ${plan.title || plan.subject}.`
        : `Resumen de estudio para el Día ${selectedDayNumber} de ${plan.title || plan.subject}.`;

      list.push({
        id: 'track-executive-summary',
        category: 'summary',
        title: 'Resumen Ejecutivo de Alto Rendimiento',
        subtitle: selectedDayNumber === 'all' ? 'Visión General' : `Día ${selectedDayNumber}`,
        speechText: `${dayPrefix}. ${cleanSummary}`,
        dayNumber: typeof selectedDayNumber === 'number' ? selectedDayNumber : undefined,
      });
    }

    // 2. Core Concepts
    concepts.forEach((c, idx) => {
      const cleanExplanation = (c.explanation || '')
        .replace(/[*_#`«»•]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const cleanExample = c.exampleOrFormula 
        ? `Ejemplo práctico o fórmula: ${c.exampleOrFormula.replace(/[*_#`«»]/g, '')}.`
        : '';

      const dayText = c.dayNumber ? `Día ${c.dayNumber}. ` : '';

      list.push({
        id: `track-concept-${idx}-${c.title}`,
        category: 'concept',
        title: c.title,
        subtitle: `Concepto Clave • Importancia ${c.importance || 'alta'}`,
        speechText: `${dayText}Concepto: ${c.title}. Explicación: ${cleanExplanation}. ${cleanExample}`,
        dayNumber: c.dayNumber,
      });
    });

    // 3. Formulas and Definitions
    formulas.forEach((f, idx) => {
      const cleanDef = (f.definition || '')
        .replace(/[*_#`«»•]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const formulaText = f.formulaOrSyntax
        ? `Fórmula o sintaxis: ${f.formulaOrSyntax.replace(/[*_#`«»]/g, '')}.`
        : '';

      const dayText = f.dayNumber ? `Día ${f.dayNumber}. ` : '';

      list.push({
        id: `track-formula-${idx}-${f.term}`,
        category: 'formula',
        title: f.term,
        subtitle: 'Fórmula y Definición Clave',
        speechText: `${dayText}Definición clave: ${f.term}. ${cleanDef}. ${formulaText}`,
        dayNumber: f.dayNumber,
      });
    });

    // 4. Common Exam Traps
    traps.forEach((t, idx) => {
      const mistake = (t.mistake || t.text || '').replace(/[*_#`«»•]/g, ' ').trim();
      const correction = t.correction ? `Corrección obligatoria: ${t.correction.replace(/[*_#`«»•]/g, ' ')}.` : '';
      const whyItMatters = t.whyItMatters ? `Por qué es crítico: ${t.whyItMatters.replace(/[*_#`«»•]/g, ' ')}.` : '';

      list.push({
        id: `track-trap-${idx}-${t.originalIndex}`,
        category: 'trap',
        title: `Trampa de Examen: ${mistake.slice(0, 45)}...`,
        subtitle: `Día ${t.dayNumber} • Error Crítico`,
        speechText: `Atención a la trampa de examen del día ${t.dayNumber}. Error común de los estudiantes: ${mistake}. ${correction} ${whyItMatters}`,
        dayNumber: t.dayNumber,
      });
    });

    return list;
  }, [plan, selectedDayNumber, concepts, formulas, traps]);

  // Handle voices initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSupported(false);
      return;
    }

    const updateVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        // Find best Spanish voice by default
        const spanishVoice = available.find(v => v.lang.startsWith('es') || v.lang.includes('es-'));
        if (spanishVoice && !selectedVoiceURI) {
          setSelectedVoiceURI(spanishVoice.voiceURI);
        }
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [selectedVoiceURI]);

  // Respond to activeTrackId prop if passed from external click
  useEffect(() => {
    if (activeTrackId) {
      const targetIdx = tracks.findIndex(t => t.id === activeTrackId);
      if (targetIdx !== -1) {
        setCurrentTrackIndex(targetIdx);
        if (isOpen) {
          playTrack(targetIdx);
        }
      }
    }
  }, [activeTrackId, tracks, isOpen]);

  // Clean up speech synthesis when closed
  useEffect(() => {
    if (!isOpen) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setIsPaused(false);
      if (onTrackChange) onTrackChange(null);
    }
  }, [isOpen, onTrackChange]);

  const currentTrack = tracks[currentTrackIndex] || tracks[0];

  const playTrack = (index: number) => {
    if (!isSupported || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();

    if (index < 0 || index >= tracks.length) {
      setIsPlaying(false);
      setIsPaused(false);
      if (onTrackChange) onTrackChange(null);
      return;
    }

    const track = tracks[index];
    setCurrentTrackIndex(index);
    if (onTrackChange) onTrackChange(track.id);

    const utterance = new SpeechSynthesisUtterance(track.speechText);
    utterance.rate = playbackRate;
    utterance.volume = isMuted ? 0 : 1;
    utterance.lang = 'es-ES';

    if (selectedVoiceURI && voices.length > 0) {
      const foundVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (foundVoice) {
        utterance.voice = foundVoice;
      }
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
      setIsPlaying(true);
    };

    utterance.onend = () => {
      // Auto-advance to next track in playlist
      if (index + 1 < tracks.length) {
        playTrack(index + 1);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        if (onTrackChange) onTrackChange(null);
      }
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePlay = () => {
    if (!isSupported) return;

    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
    } else {
      playTrack(currentTrackIndex);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    if (onTrackChange) onTrackChange(null);
  };

  const handleNext = () => {
    if (currentTrackIndex + 1 < tracks.length) {
      playTrack(currentTrackIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentTrackIndex > 0) {
      playTrack(currentTrackIndex - 1);
    } else {
      playTrack(0);
    }
  };

  const handleCycleRate = () => {
    const rates = [0.8, 1.0, 1.25, 1.5, 1.75, 2.0];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const newRate = rates[nextIdx];
    setPlaybackRate(newRate);

    // If currently playing, restart current track at new rate
    if (isPlaying && !isPaused) {
      playTrack(currentTrackIndex);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
    if (utteranceRef.current) {
      utteranceRef.current.volume = isMuted ? 1 : 0;
    }
  };

  if (!isOpen) return null;

  if (!isSupported) {
    return (
      <div className="fixed bottom-4 right-4 z-50 p-4 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-400 shadow-2xl max-w-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
            <Headphones className="w-5 h-5" />
            <span>Voz no compatible</span>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5">
          Tu navegador actual no admite la API de Web Speech. Prueba en Google Chrome, Edge o Safari para escuchar tus resúmenes de estudio.
        </p>
      </div>
    );
  }

  const progressPercent = tracks.length > 0 ? ((currentTrackIndex + 1) / tracks.length) * 100 : 0;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[460px] z-50 animate-in slide-in-from-bottom-5 duration-200"
      role="region"
      aria-label="Reproductor de audio de la Guía de Estudio"
    >
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md rounded-3xl border-2 border-blue-500/80 dark:border-blue-400/80 shadow-2xl p-4 text-white space-y-3">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="relative w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-xs">
              <Headphones className="w-4 h-4 text-white" />
              {isPlaying && !isPaused && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
              )}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-blue-400 uppercase tracking-wider">
                  Modo Auditivo
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                  {currentTrackIndex + 1} / {tracks.length}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200 truncate">
                {currentTrack?.title || 'Guía de Estudio'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isExpanded ? "Ocultar playlist" : "Ver lista de reproducción"}
              aria-label={isExpanded ? "Ocultar lista de temas" : "Mostrar lista de temas"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ListMusic className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Cerrar reproductor"
              aria-label="Cerrar reproductor de voz"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Track Info & Audio Wave Indicator */}
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                currentTrack?.category === 'summary'
                  ? 'bg-purple-900/80 text-purple-200 border border-purple-700'
                  : currentTrack?.category === 'concept'
                  ? 'bg-blue-900/80 text-blue-200 border border-blue-700'
                  : currentTrack?.category === 'formula'
                  ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                  : 'bg-amber-900/80 text-amber-200 border border-amber-700'
              }`}>
                {currentTrack?.category === 'summary' ? 'Resumen' : currentTrack?.category === 'concept' ? 'Concepto' : currentTrack?.category === 'formula' ? 'Fórmula' : 'Trampa'}
              </span>
              {currentTrack?.subtitle && (
                <span className="text-[11px] text-slate-400 truncate">
                  {currentTrack.subtitle}
                </span>
              )}
            </div>
            <p className="text-sm font-black text-white truncate">
              {currentTrack?.title}
            </p>
          </div>

          {/* Visual animated audio frequency bars */}
          <div className="flex items-end gap-1 h-6 shrink-0 px-2">
            {[1, 2, 3, 4, 5].map((bar) => (
              <span 
                key={bar}
                className={`w-1 bg-gradient-to-t from-blue-500 to-cyan-300 rounded-full transition-all duration-300 ${
                  isPlaying && !isPaused 
                    ? `animate-pulse h-${(bar % 3 + 3) * 2}` 
                    : 'h-1.5 opacity-40'
                }`}
                style={{
                  height: isPlaying && !isPaused ? `${(Math.sin(bar * 1.5) + 1.8) * 8}px` : '4px',
                  animationDelay: `${bar * 120}ms`
                }}
              />
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-semibold text-slate-400 px-0.5">
            <span>Pista {currentTrackIndex + 1} de {tracks.length}</span>
            <span>{Math.round(progressPercent)}% completado</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Speed control */}
          <button
            type="button"
            onClick={handleCycleRate}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-200 transition-colors cursor-pointer"
            title="Cambiar velocidad de lectura"
          >
            <Gauge className="w-3.5 h-3.5 text-blue-400" />
            <span>{playbackRate}x</span>
          </button>

          {/* Main Controls: Prev, Play/Pause, Next, Stop */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentTrackIndex === 0}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Tema anterior"
              aria-label="Pista anterior"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-lg shadow-blue-600/40 transition-all cursor-pointer"
              title={isPlaying && !isPaused ? "Pausar" : "Reproducir"}
              aria-label={isPlaying && !isPaused ? "Pausar lectura de voz" : "Iniciar lectura de voz"}
            >
              {isPlaying && !isPaused ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="p-2 rounded-xl text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Detener lectura"
              aria-label="Detener lectura de voz"
            >
              <Square className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentTrackIndex + 1 >= tracks.length}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Siguiente tema"
              aria-label="Pista siguiente"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Mute toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title={isMuted ? "Activar audio" : "Silenciar"}
            aria-label={isMuted ? "Activar audio" : "Silenciar audio"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>
        </div>

        {/* Expanded Playlist Drawer */}
        {isExpanded && (
          <div className="pt-2 border-t border-slate-800 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 px-1">
              <span>Lista de Reproducción ({tracks.length} temas)</span>
              {voices.length > 1 && (
                <select
                  value={selectedVoiceURI}
                  onChange={(e) => setSelectedVoiceURI(e.target.value)}
                  className="bg-slate-800 text-[11px] text-slate-200 rounded-lg px-2 py-1 border border-slate-700 outline-none max-w-[160px] truncate"
                  title="Seleccionar voz del sistema"
                >
                  {voices
                    .filter(v => v.lang.startsWith('es') || v.lang.includes('es-') || v.default)
                    .map(v => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {tracks.map((track, idx) => {
                const isCurrent = idx === currentTrackIndex;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => playTrack(idx)}
                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-blue-600/30 text-white border border-blue-500/60 font-bold'
                        : 'bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-4 text-[10px] font-mono shrink-0 ${isCurrent ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>
                        {idx + 1}.
                      </span>
                      <span className="truncate">{track.title}</span>
                    </div>
                    {isCurrent && (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] text-blue-400 font-black">
                        {isPlaying && !isPaused ? 'Sonando' : 'Pausa'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
