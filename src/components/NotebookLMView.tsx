import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  Send, 
  Plus, 
  Trash2, 
  Paperclip, 
  Volume2, 
  Play, 
  Pause, 
  Copy, 
  Check, 
  RotateCcw, 
  FileText, 
  CheckSquare, 
  Square, 
  MessageSquare, 
  HelpCircle, 
  Activity, 
  FileCheck2, 
  ChevronRight,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import type { StudyPlan } from '../types/study.ts';

interface NotebookLMViewProps {
  activePlan: StudyPlan;
  onUpdatePlan?: (updated: StudyPlan) => void;
}

interface CustomSource {
  id: string;
  fileName: string;
  fullText: string;
  totalWords: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  sourcesUsed?: string[];
  timestamp: string;
}

const PRESET_PROMPTS = [
  "Hazme una sinopsis resumida de todos los documentos.",
  "¿Cuáles son las 3 fórmulas o teoremas principales descritos?",
  "Genera un glosario con los 5 términos más técnicos.",
  "¿Cuáles son los errores más comunes al resolver estos ejercicios?"
];

export default function NotebookLMView({ activePlan, onUpdatePlan }: NotebookLMViewProps) {
  const [currentTab, setCurrentTab] = useState<'chat' | 'generators'>('chat');
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [customSources, setCustomSources] = useState<CustomSource[]>([]);
  
  // Custom text source modal state
  const [isAddingTextSource, setIsAddingTextSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceText, setNewSourceText] = useState('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Content Generators state
  const [generatorType, setGeneratorType] = useState<'briefing' | 'podcast' | 'faq' | 'mindmap'>('briefing');
  const [generatedContents, setGeneratedContents] = useState<Record<string, string>>({});
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Simulated Audio player for Podcast Script
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioSpeed, setAudioSpeed] = useState(1.0);
  const audioIntervalRef = useRef<any>(null);

  // Default selection: select all base study plan files on mount
  useEffect(() => {
    if (activePlan.fileNames && activePlan.fileNames.length > 0) {
      setSelectedSources(activePlan.fileNames);
    }
  }, [activePlan]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isGeneratingChat]);

  // Simulated audio player timer
  useEffect(() => {
    if (audioPlaying) {
      audioIntervalRef.current = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            setAudioPlaying(false);
            clearInterval(audioIntervalRef.current);
            return 0;
          }
          return prev + (0.5 * audioSpeed);
        });
      }, 200);
    } else {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current);
      }
    }
    return () => clearInterval(audioIntervalRef.current);
  }, [audioPlaying, audioSpeed]);

  // Combine default plan source files and user custom pasted source files
  const allSources = [
    ...(activePlan.sourceDocuments || []).map(doc => ({
      fileName: doc.fileName,
      fullText: doc.fullText || doc.snippet || '',
      isCustom: false,
      totalWords: doc.totalWords || (doc.fullText ? doc.fullText.split(/\s+/).length : 250)
    })),
    ...customSources.map(doc => ({
      fileName: doc.fileName,
      fullText: doc.fullText,
      isCustom: true,
      totalWords: doc.totalWords
    }))
  ];

  const handleToggleSource = (fileName: string) => {
    setSelectedSources(prev => 
      prev.includes(fileName)
        ? prev.filter(name => name !== fileName)
        : [...prev, fileName]
    );
  };

  const handleAddCustomTextSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceText.trim()) return;

    const fileNameWithExt = newSourceName.toLowerCase().endsWith('.txt') 
      ? newSourceName 
      : `${newSourceName}.txt`;

    const newSource: CustomSource = {
      id: `custom-src-${Date.now()}`,
      fileName: fileNameWithExt,
      fullText: newSourceText.trim(),
      totalWords: newSourceText.trim().split(/\s+/).length
    };

    setCustomSources(prev => [...prev, newSource]);
    setSelectedSources(prev => [...prev, newSource.fileName]);
    
    // Reset form
    setNewSourceName('');
    setNewSourceText('');
    setIsAddingTextSource(false);
  };

  const handleRemoveCustomSource = (fileName: string) => {
    setCustomSources(prev => prev.filter(s => s.fileName !== fileName));
    setSelectedSources(prev => prev.filter(name => name !== fileName));
  };

  const handleSendChat = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const query = (customQuestion || chatInput).trim();
    if (!query || isGeneratingChat) return;

    if (selectedSources.length === 0) {
      alert("Por favor, selecciona al menos una fuente en la barra lateral para contextualizar tu pregunta.");
      return;
    }

    // Capture user message
    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customQuestion) setChatInput('');
    setIsGeneratingChat(true);

    // Filter down currently selected source texts to pass as reference
    const activeSourcePayload = allSources
      .filter(s => selectedSources.includes(s.fileName))
      .map(s => ({ fileName: s.fileName, fullText: s.fullText }));

    try {
      const chatHistPayload = chatMessages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/notebook-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          sources: activeSourcePayload,
          chatHistory: chatHistPayload,
          preferredProvider: activePlan.providerId || 'gemini'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al comunicarse con NotebookLM');
      }

      const botMsg: ChatMessage = {
        id: `msg-bot-${Date.now()}`,
        role: 'model',
        text: data.answer,
        sourcesUsed: selectedSources,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        text: `⚠️ **Error de Comunicación**: ${err.message || 'No se pudo conectar con el servidor de NotebookLM. Por favor reintenta.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  const handleTriggerGenerator = async (type: 'briefing' | 'podcast' | 'faq' | 'mindmap') => {
    if (isGeneratingContent) return;
    if (selectedSources.length === 0) {
      alert("Por favor, selecciona al menos un archivo fuente en la barra lateral para generar este recurso.");
      return;
    }

    setGeneratorType(type);
    setIsGeneratingContent(true);

    const activeSourcePayload = allSources
      .filter(s => selectedSources.includes(s.fileName))
      .map(s => ({ fileName: s.fileName, fullText: s.fullText }));

    try {
      const response = await fetch('/api/notebook-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          sources: activeSourcePayload,
          preferredProvider: activePlan.providerId || 'gemini'
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error de generación');
      }

      setGeneratedContents(prev => ({
        ...prev,
        [type]: data.content
      }));

      // Trigger custom states if podcast is generated
      if (type === 'podcast') {
        setAudioProgress(0);
        setAudioPlaying(true);
      }
    } catch (err: any) {
      alert(`No se pudo generar el recurso: ${err.message || 'Error temporal'}`);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // High-fidelity Markdown/Dialogue Parser custom helper
  const renderMarkdownText = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Speaker logic for Laura and Diego (Podcast Script)
      if (trimmed.startsWith('**LAURA:**') || trimmed.startsWith('**LAURA**') || trimmed.startsWith('LAURA:')) {
        const bodyText = trimmed.replace(/^(\*\*LAURA:\*\*|\*\*LAURA\*\*|LAURA:)/i, '').trim();
        return (
          <div key={idx} className="flex items-start gap-3 my-4 bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100/50 dark:border-rose-900/40 shadow-xs animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-rose-600 flex items-center justify-center text-white text-base font-black shrink-0 shadow-md">
              👩‍🦰
            </div>
            <div>
              <span className="text-xs font-black text-rose-700 dark:text-rose-400 block uppercase tracking-wider mb-0.5">
                Laura (Presentadora Spotify)
              </span>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {parseInlineFormatting(bodyText)}
              </p>
            </div>
          </div>
        );
      }

      if (trimmed.startsWith('**DIEGO:**') || trimmed.startsWith('**DIEGO**') || trimmed.startsWith('DIEGO:')) {
        const bodyText = trimmed.replace(/^(\*\*DIEGO:\*\*|\*\*DIEGO\*\*|DIEGO:)/i, '').trim();
        return (
          <div key={idx} className="flex items-start gap-3 my-4 bg-sky-50/60 dark:bg-sky-950/20 p-4 rounded-2xl border border-sky-100/50 dark:border-sky-900/40 shadow-xs animate-fadeIn">
            <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white text-base font-black shrink-0 shadow-md">
              👨‍💻
            </div>
            <div>
              <span className="text-xs font-black text-sky-700 dark:text-sky-400 block uppercase tracking-wider mb-0.5">
                Diego (Tutor Pedagógico)
              </span>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {parseInlineFormatting(bodyText)}
              </p>
            </div>
          </div>
        );
      }

      // Standard headers
      if (trimmed.startsWith('# ')) {
        return <h1 key={idx} className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3 border-b pb-2">{parseInlineFormatting(trimmed.substring(2))}</h1>;
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={idx} className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-400 mt-5 mb-2">{parseInlineFormatting(trimmed.substring(3))}</h2>;
      }
      if (trimmed.startsWith('### ')) {
        return <h3 key={idx} className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 mt-4 mb-1">{parseInlineFormatting(trimmed.substring(4))}</h3>;
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        return (
          <blockquote key={idx} className="border-l-4 border-indigo-500 bg-slate-50 dark:bg-slate-850 p-3 rounded-r-lg my-2 text-xs italic text-slate-600 dark:text-slate-400">
            {parseInlineFormatting(trimmed.substring(2))}
          </blockquote>
        );
      }

      // List bullet points
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        return (
          <div key={idx} className="flex items-start gap-2 pl-4 my-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <span className="text-indigo-500 shrink-0 mt-1.5">•</span>
            <span className="leading-relaxed">{parseInlineFormatting(trimmed.substring(2))}</span>
          </div>
        );
      }

      // Empty line spacer
      if (!trimmed) return <div key={idx} className="h-2" />;

      // Default paragraph
      return (
        <p key={idx} className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed my-2 whitespace-pre-wrap">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });
  };

  // Utility to replace bold syntax `**text**` into React nodes and render citations in brackets [FileName.pdf] as styled badges
  const parseInlineFormatting = (text: string) => {
    const parts: React.ReactNode[] = [];
    let keyIndex = 0;

    // We can regex parse bold tags and citations
    const boldAndCitationRegex = /(\*\*.*?\*\*|\[.*?\])/g;
    const items = text.split(boldAndCitationRegex);

    if (items.length === 1) {
      return text;
    }

    items.forEach(item => {
      if (item.startsWith('**') && item.endsWith('**')) {
        parts.push(
          <strong key={keyIndex++} className="font-extrabold text-slate-950 dark:text-white">
            {item.slice(2, -2)}
          </strong>
        );
      } else if (item.startsWith('[') && item.endsWith(']')) {
        const fileRef = item.slice(1, -1);
        const isKnownSource = allSources.some(s => s.fileName === fileRef || fileRef.toLowerCase().includes(s.fileName.toLowerCase()));
        if (isKnownSource) {
          parts.push(
            <span 
              key={keyIndex++} 
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/60 shadow-3xs cursor-help"
              title={`Aseveración respaldada en: ${fileRef}`}
            >
              📄 {fileRef.length > 15 ? `${fileRef.substring(0, 12)}...` : fileRef}
            </span>
          );
        } else {
          parts.push(<span key={keyIndex++} className="text-slate-500">{item}</span>);
        }
      } else {
        parts.push(<span key={keyIndex++}>{item}</span>);
      }
    });

    return parts;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 max-w-7xl mx-auto items-stretch">
      {/* LEFT COLUMN: SOURCE MANAGER (NotebookLM Sidebar) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                📚
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Fuentes de Estudio
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Grounding contextual para IA
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAddingTextSource(true)}
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Plus className="w-3 h-3" />
              <span>Añadir</span>
            </button>
          </div>

          {/* Quick Selection Helpers */}
          <div className="flex items-center gap-2 text-[11px] justify-between text-slate-500">
            <span>{selectedSources.length} de {allSources.length} activas</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedSources(allSources.map(s => s.fileName))}
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
              >
                Todas
              </button>
              <span>•</span>
              <button
                onClick={() => setSelectedSources([])}
                className="text-slate-600 dark:text-slate-400 font-bold hover:underline cursor-pointer"
              >
                Ninguna
              </button>
            </div>
          </div>

          {/* Source List */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {allSources.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <FileText className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600 mb-1.5" />
                <p className="text-xs text-slate-500">No hay fuentes cargadas todavía.</p>
              </div>
            ) : (
              allSources.map((source) => {
                const isSelected = selectedSources.includes(source.fileName);
                return (
                  <div
                    key={source.fileName}
                    onClick={() => handleToggleSource(source.fileName)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-900/60 shadow-3xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-bold leading-normal truncate ${isSelected ? 'text-indigo-950 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {source.fileName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                        <span>{source.totalWords} palabras</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.2 rounded-sm text-[8px] font-extrabold uppercase tracking-widest ${source.isCustom ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {source.isCustom ? 'Apunte Pasted' : 'Archivo Base'}
                        </span>
                      </div>
                    </div>

                    {source.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomSource(source.fileName);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer active:scale-95"
                        title="Eliminar esta fuente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Notebook Summary / Info widget */}
        <div className="bg-linear-to-br from-slate-550/50 to-indigo-950/10 border border-indigo-200/20 dark:border-indigo-900/30 rounded-2xl p-4 shadow-3xs space-y-2.5">
          <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-500" /> ¿Cómo funciona NotebookLM?
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            NotebookLM es una herramienta de razonamiento cerrado. Al interactuar con el chat o los generadores, la IA <strong>solo</strong> utiliza la información extraída de los documentos marcados en tu panel izquierdo. Esto evita alucinaciones teóricas y garantiza rigor absoluto.
          </p>
        </div>
      </div>

      {/* RIGHT COLUMN: INTERACTIVE WORKSPACE (Tabs, Chat & Guides) */}
      <div className="lg:col-span-8 flex flex-col gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[650px]">
          {/* Tabs header */}
          <div className="bg-slate-50/50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-4">
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-850 p-1 rounded-xl">
              <button
                onClick={() => setCurrentTab('chat')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'chat'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-3xs'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat con Fuentes</span>
              </button>

              <button
                onClick={() => setCurrentTab('generators')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentTab === 'generators'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-3xs'
                    : 'text-slate-600 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guías y Podcast</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Grounded: {selectedSources.length} fuentes activas
              </span>
            </div>
          </div>

          {/* TAB 1: GROUNDED CHAT */}
          {currentTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 dark:bg-slate-950/10">
              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xl shadow-xs">
                      💬
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                        Chat de Investigación Grounded
                      </h3>
                      <p className="text-xs text-slate-500 leading-normal">
                        Escribe cualquier pregunta técnica, cálculo o mnemotecnia. La IA responderá estrictamente basándose en tus fuentes activas e incluirá citas precisas.
                      </p>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg pt-4">
                      {PRESET_PROMPTS.map((preset) => (
                        <button
                          key={preset}
                          onClick={(e) => handleSendChat(e, preset)}
                          className="p-3 text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer hover:border-indigo-200 flex items-center justify-between gap-2"
                        >
                          <span className="line-clamp-2 leading-normal">{preset}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 max-w-[85%] ${
                        msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-slate-800 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        {msg.role === 'user' ? '👤' : '🤖'}
                      </div>

                      <div className="space-y-1">
                        <div
                          className={`p-3.5 rounded-2xl shadow-3xs ${
                            msg.role === 'user'
                              ? 'bg-slate-800 text-white rounded-tr-none'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          ) : (
                            <div className="space-y-2 leading-relaxed">
                              {renderMarkdownText(msg.text)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 px-1">
                          <span>{msg.timestamp}</span>
                          {msg.role === 'model' && msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                Grounded en: {msg.sourcesUsed.length} fuentes
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Loading message */}
                {isGeneratingChat && (
                  <div className="flex items-start gap-3 max-w-[80%] mr-auto">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold animate-pulse">
                      🤖
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-none p-4 shadow-3xs space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>NotebookLM está analizando tus fuentes y redactando la respuesta...</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-32 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                        <div className="h-2 w-48 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                        <div className="h-2 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={selectedSources.length === 0 ? "Selecciona fuentes a la izquierda para poder preguntar..." : "Hazme una pregunta técnica sobre tus apuntes..."}
                  disabled={selectedSources.length === 0 || isGeneratingChat}
                  className="flex-1 bg-slate-50 dark:bg-slate-850 px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 border border-transparent focus:border-indigo-500 focus:bg-white outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isGeneratingChat || selectedSources.length === 0}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 flex items-center justify-center min-h-[38px]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: GENERATORS WORKSPACE */}
          {currentTab === 'generators' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/20 dark:bg-slate-950/5">
              {/* Generator Options Selector */}
              <div className="grid grid-cols-4 gap-1 p-3 border-b border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900">
                <button
                  onClick={() => setGeneratorType('briefing')}
                  className={`py-2 px-1.5 rounded-xl text-center text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    generatorType === 'briefing'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  📄 Briefing
                </button>

                <button
                  onClick={() => setGeneratorType('podcast')}
                  className={`py-2 px-1.5 rounded-xl text-center text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    generatorType === 'podcast'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  🎙️ Podcast
                </button>

                <button
                  onClick={() => setGeneratorType('faq')}
                  className={`py-2 px-1.5 rounded-xl text-center text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    generatorType === 'faq'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  ❓ FAQs
                </button>

                <button
                  onClick={() => setGeneratorType('mindmap')}
                  className={`py-2 px-1.5 rounded-xl text-center text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    generatorType === 'mindmap'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  🗺️ Mapa Mental
                </button>
              </div>

              {/* Generated Content Body Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                {isGeneratingContent ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 animate-pulse">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-2xl shadow-sm text-indigo-600 animate-spin">
                      ⏳
                    </div>
                    <div className="max-w-md space-y-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                        {generatorType === 'briefing' ? 'Estructurando Documento Informativo (Briefing)...' :
                         generatorType === 'podcast' ? 'Generando Guion de Podcast de Audio (Laura & Diego)...' :
                         generatorType === 'faq' ? 'Redactando Bloque de Preguntas Frecuentes...' :
                         'Dibujando Estructura Jerárquica del Mapa Mental...'}
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        NotebookLM está leyendo meticulosamente todas las fuentes activas, hilvanando los temas y redactando un archivo único en español. Esto puede tomar unos 10-15 segundos.
                      </p>
                    </div>
                  </div>
                ) : generatedContents[generatorType] ? (
                  <div className="space-y-4 animate-fadeIn">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-indigo-600" /> Recurso Generado con Éxito
                      </span>

                      <button
                        onClick={() => handleCopyToClipboard(generatedContents[generatorType], generatorType)}
                        className="px-3 py-1.5 min-h-[34px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        {copiedType === generatorType ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Contenido</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Podcast Audio Simulation Player */}
                    {generatorType === 'podcast' && (
                      <div className="bg-linear-to-r from-indigo-650 to-purple-650 text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-4 animate-slideUp">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl animate-bounce">
                              🎙️
                            </div>
                            <div>
                              <h5 className="text-xs sm:text-sm font-black tracking-wide uppercase">
                                Deep Dive Audio Overview
                              </h5>
                              <p className="text-[10px] text-white/75">
                                Laura y Diego analizando tus fuentes ({selectedSources.length} archivos)
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">
                              AI Voice Mockup
                            </span>
                          </div>
                        </div>

                        {/* Visual wave simulator */}
                        <div className="flex items-end gap-1 h-8 px-2 justify-center">
                          {Array.from({ length: 28 }).map((_, waveIdx) => {
                            const isTall = audioPlaying && (waveIdx % 3 === 0 || waveIdx % 5 === 2);
                            const height = isTall 
                              ? Math.sin((audioProgress + waveIdx) * 0.4) * 16 + 20 
                              : Math.cos(waveIdx * 0.2) * 5 + 8;
                            return (
                              <div
                                key={waveIdx}
                                className="w-1.5 bg-white/80 rounded-full transition-all duration-300"
                                style={{ height: `${height}px` }}
                              />
                            );
                          })}
                        </div>

                        {/* Player Actions Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setAudioPlaying(!audioPlaying)}
                              className="w-11 h-11 rounded-full bg-white text-indigo-700 hover:scale-105 transition-all flex items-center justify-center shadow-lg cursor-pointer shrink-0"
                            >
                              {audioPlaying ? (
                                <Pause className="w-5 h-5 fill-indigo-700 text-indigo-700" />
                              ) : (
                                <Play className="w-5 h-5 fill-indigo-700 text-indigo-700 ml-0.5" />
                              )}
                            </button>

                            <button
                              onClick={() => setAudioProgress(0)}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all cursor-pointer active:scale-95"
                              title="Reiniciar reproducción"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>

                            {/* Speed selector */}
                            <button
                              onClick={() => {
                                setAudioSpeed(prev => prev === 1.0 ? 1.25 : prev === 1.25 ? 1.5 : 1.0);
                              }}
                              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black tracking-wide cursor-pointer active:scale-95"
                            >
                              {audioSpeed}x
                            </button>
                          </div>

                          <div className="flex-1 sm:max-w-[200px] flex items-center gap-2">
                            <span className="text-[10px] font-bold font-mono">
                              {Math.floor((audioProgress * 120) / 100)}s
                            </span>
                            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden relative">
                              <div 
                                className="h-full bg-white rounded-full transition-all duration-300" 
                                style={{ width: `${audioProgress}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold font-mono">2:00</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Markdown Study Content Container */}
                    <div className="prose prose-slate dark:prose-invert max-w-none bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-2xl shadow-3xs space-y-3">
                      {renderMarkdownText(generatedContents[generatorType])}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 text-2xl shadow-xs">
                      🪄
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                        {generatorType === 'briefing' ? 'Generar Documento de Sintesis Informativa' :
                         generatorType === 'podcast' ? 'Generar Podcast de Audio (Guion Laura y Diego)' :
                         generatorType === 'faq' ? 'Compilar Banco de Preguntas Frecuentes' :
                         'Diseñar Mapa Mental Lógico'}
                      </h4>
                      <p className="text-xs text-slate-500 leading-normal">
                        Convierte de forma instantánea tus archivos seleccionados de estudio en un material de repaso sumamente amigable y completo.
                      </p>
                    </div>

                    <button
                      onClick={() => handleTriggerGenerator(generatorType)}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <span>Comenzar Generación</span>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TEXT SOURCE MODAL */}
      {isAddingTextSource && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                📝 Añadir Apunte o Notas de Clase
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Escribe o pega texto personalizado. Se unirá al cuaderno como una fuente más de estudio de forma inmediata.
              </p>
            </div>

            <form onSubmit={handleAddCustomTextSource} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Nombre del Apunte o Clase:
                </label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Ej: Apuntes clase 4 - bomba Na/K"
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs sm:text-sm placeholder-slate-400 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Contenido de Texto Completo:
                </label>
                <textarea
                  required
                  value={newSourceText}
                  onChange={(e) => setNewSourceText(e.target.value)}
                  placeholder="Pega aquí el material, las diapositivas o tus propias notas de clase..."
                  rows={8}
                  className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl text-xs sm:text-sm placeholder-slate-400 outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTextSource(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer active:scale-95 flex items-center gap-1"
                >
                  <span>Sincronizar Apunte</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
