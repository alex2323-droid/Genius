import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  BookOpen, 
  HelpCircle, 
  Layers, 
  Sparkles, 
  Plus, 
  ArrowLeft,
  Share2,
  Printer,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileCheck,
  Flame,
  Check,
  Timer,
  MessageSquarePlus,
  Trophy
} from 'lucide-react';
import { 
  auth, 
  db, 
  onAuthStateChanged, 
  type User, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  signInWithGoogle,
  logoutUser
} from './firebase.ts';
import type { StudyPlan } from './types/study.ts';
import type { ParsedFile } from './utils/fileParser.ts';
import { calculatePlanTaskStats } from './utils/dayStudyMapping.ts';
import { Navbar } from './components/Navbar.tsx';
import { PlanConfigurator } from './components/PlanConfigurator.tsx';
import { StudyScheduleView } from './components/StudyScheduleView.tsx';
import { StudyGuideView } from './components/StudyGuideView.tsx';
import { FlashcardsView } from './components/FlashcardsView.tsx';
import { ExercisesView } from './components/ExercisesView.tsx';
import { StudySessionView } from './components/StudySessionView.tsx';
import { AITutorModal } from './components/AITutorModal.tsx';
import { SavedPlansDrawer } from './components/SavedPlansDrawer.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { AchievementToast } from './components/AchievementToast.tsx';
import { AchievementsModal } from './components/AchievementsModal.tsx';
import { AdminLogoModal } from './components/AdminLogoModal.tsx';
import { FeedbackModal } from './components/FeedbackModal.tsx';
import { ProfileModal } from './components/ProfileModal.tsx';
import { AICompetitionModal } from './components/AICompetitionModal.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { useCustomLogo } from './utils/logoStorage.ts';
import { checkNewAchievements, getPlanAchievements } from './utils/achievementManager.ts';
import { generateClientFallbackPlan } from './utils/clientPlanGenerator.ts';
import { ensureFullPlanCoverage } from './utils/documentAnalyzer.ts';
import type { Achievement } from './types/study.ts';

const LOCAL_STORAGE_KEY = 'estudia_genius_plans_cache';

export function normalizeStudyPlan(raw: any): StudyPlan {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `plan-${Date.now()}`,
      userId: 'guest-user',
      title: 'Plan de Estudio',
      subject: 'Estudio General',
      daysLeft: 7,
      examDate: '',
      targetGrade: 85,
      strategySummary: '',
      recommendedDailyHours: 2,
      totalEstimatedHours: 14,
      fileNames: [],
      schedule: [],
      studyGuide: {
        executiveSummary: '',
        coreConcepts: [],
        keyDefinitionsAndFormulas: [],
        commonExamTraps: [],
        flashcards: [],
      },
      exercises: [],
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const rawGuide = raw.studyGuide || {};
  const rawSchedule = Array.isArray(raw.schedule) ? raw.schedule : [];
  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];

  const schedule = rawSchedule.map((day: any, idx: number) => {
    const rawTasks = Array.isArray(day?.tasks) ? day.tasks : [];
    const tasks = rawTasks.map((t: any, tIdx: number) => ({
      id: t?.id || `task-${idx + 1}-${tIdx + 1}`,
      task: t?.task || 'Sesión de estudio',
      type: t?.type || 'read',
      timeMinutes: typeof t?.timeMinutes === 'number' ? t.timeMinutes : 30,
      completed: Boolean(t?.completed),
    }));

    return {
      dayNumber: typeof day?.dayNumber === 'number' ? day.dayNumber : idx + 1,
      title: day?.title || `Día ${idx + 1}`,
      focus: day?.focus || '',
      estimatedHours: typeof day?.estimatedHours === 'number' ? day.estimatedHours : 2,
      objectives: Array.isArray(day?.objectives) ? day.objectives : [],
      tasks,
    };
  });

  const studyGuide = {
    executiveSummary: typeof rawGuide.executiveSummary === 'string' ? rawGuide.executiveSummary : '',
    coreConcepts: Array.isArray(rawGuide.coreConcepts)
      ? rawGuide.coreConcepts.map((c: any, i: number) => ({
          title: c?.title || c?.concept || `Concepto clave ${i + 1}`,
          importance: c?.importance === 'critical' || c?.importance === 'high' || c?.importance === 'medium' ? c.importance : 'high',
          explanation: c?.explanation || c?.description || '',
          exampleOrFormula: c?.exampleOrFormula || c?.example || c?.keyTakeaway || '',
          dayNumber: typeof c?.dayNumber === 'number' ? c.dayNumber : undefined,
        }))
      : [],
    keyDefinitionsAndFormulas: Array.isArray(rawGuide.keyDefinitionsAndFormulas)
      ? rawGuide.keyDefinitionsAndFormulas.map((f: any, i: number) => ({
          term: f?.term || f?.termOrName || f?.name || `Término ${i + 1}`,
          definition: f?.definition || f?.definitionOrFormula || f?.description || '',
          formulaOrSyntax: f?.formulaOrSyntax || f?.formula || f?.syntax || f?.example || f?.whenToUse || '',
          dayNumber: typeof f?.dayNumber === 'number' ? f.dayNumber : undefined,
        }))
      : [],
    commonExamTraps: Array.isArray(rawGuide.commonExamTraps)
      ? rawGuide.commonExamTraps
          .map((tr: any, i: number) => {
            if (!tr) return null;
            if (typeof tr === 'string') return tr.trim();
            if (typeof tr === 'object') {
              return {
                id: tr.id || `trap-${i + 1}`,
                mistake: tr.mistake || tr.text || tr.trap || 'Error común de examen',
                correction: tr.correction || tr.solution || '',
                whyItMatters: tr.whyItMatters || tr.tip || undefined,
                dayNumber: typeof tr.dayNumber === 'number' ? tr.dayNumber : undefined,
              };
            }
            return String(tr).trim();
          })
          .filter(Boolean)
      : [],
    flashcards: Array.isArray(rawGuide.flashcards)
      ? rawGuide.flashcards.map((fl: any, i: number) => ({
          id: fl?.id || `card-${i + 1}`,
          front: fl?.front || fl?.question || 'Pregunta',
          back: fl?.back || fl?.answer || 'Respuesta',
          category: fl?.category || fl?.topic || 'General',
          dayNumber: typeof fl?.dayNumber === 'number' ? fl.dayNumber : undefined,
        }))
      : [],
  };

  const exercises = rawExercises.map((ex: any, i: number) => ({
    id: ex?.id || `exercise-${i + 1}`,
    type: (ex?.type === 'mcq' || ex?.type === 'open' || ex?.type === 'true_false' ? ex.type : 'mcq') as any,
    difficulty: (ex?.difficulty === 'basic' || ex?.difficulty === 'intermediate' || ex?.difficulty === 'advanced' ? ex.difficulty : 'intermediate') as any,
    dayNumber: typeof ex?.dayNumber === 'number' ? ex.dayNumber : undefined,
    question: ex?.question || 'Pregunta de práctica',
    options: Array.isArray(ex?.options) ? ex.options.map(String) : [],
    correctAnswer: ex?.correctAnswer || (typeof ex?.correctOptionIndex === 'number' && ex?.options?.[ex.correctOptionIndex]) || '',
    explanation: ex?.explanation || '',
    hint: ex?.hint || (Array.isArray(ex?.hints) ? ex.hints.join(' ') : '') || '',
    points: typeof ex?.points === 'number' ? ex.points : 10,
    userAnswer: ex?.userAnswer,
    isCorrect: ex?.isCorrect,
  }));

  const planObj: StudyPlan = {
    id: raw.id || `plan-${Date.now()}`,
    userId: raw.userId || 'guest-user',
    title: raw.title || raw.subject || 'Plan de Estudio',
    subject: raw.subject || 'Estudio',
    daysLeft: typeof raw.daysLeft === 'number' ? raw.daysLeft : 7,
    examDate: raw.examDate || '',
    targetGrade: typeof raw.targetGrade === 'number' ? raw.targetGrade : 85,
    strategySummary: raw.strategySummary || '',
    recommendedDailyHours: typeof raw.recommendedDailyHours === 'number' ? raw.recommendedDailyHours : 2,
    totalEstimatedHours: typeof raw.totalEstimatedHours === 'number' ? raw.totalEstimatedHours : 14,
    fileNames: Array.isArray(raw.fileNames) ? raw.fileNames : [],
    schedule,
    studyGuide,
    exercises,
    progress: typeof raw.progress === 'number' ? raw.progress : 0,
    unlockedAchievements: Array.isArray(raw.unlockedAchievements) ? raw.unlockedAchievements : [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    providerUsed: raw.providerUsed || '',
    providerId: raw.providerId || 'gemini',
    aiCompetitionResult: raw.aiCompetitionResult || undefined,
  };

  return ensureFullPlanCoverage(planObj, undefined, planObj.subject, planObj.targetGrade, planObj.daysLeft);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'guide' | 'flashcards' | 'exercises' | 'traps'>('schedule');
  const [selectedStudyDay, setSelectedStudyDay] = useState<number | 'all'>('all');
  const [isCreating, setIsCreating] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [tutorTopic, setTutorTopic] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI Competition Modal State
  const [isAICompetitionModalOpen, setIsAICompetitionModalOpen] = useState<boolean>(false);

  // Focus / Study Session Mode
  const [isStudySessionMode, setIsStudySessionMode] = useState<boolean>(false);
  const [sessionDayNumber, setSessionDayNumber] = useState<number | undefined>(undefined);
  const [sessionTaskId, setSessionTaskId] = useState<string | undefined>(undefined);

  // Achievements State
  const [isAchievementsModalOpen, setIsAchievementsModalOpen] = useState<boolean>(false);
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);

  // Admin Logo Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  
  // Feedback Modal State
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

  // Profile & Avatar Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const currentLogo = useCustomLogo();

  const handleUpdatePlan = (updatedPlan: StudyPlan) => {
    const { newlyUnlocked, updatedUnlockedIds } = checkNewAchievements(updatedPlan);
    const planWithAchievements = {
      ...updatedPlan,
      unlockedAchievements: updatedUnlockedIds,
    };

    setActivePlan(planWithAchievements);
    savePlan(planWithAchievements);

    if (newlyUnlocked.length > 0) {
      setToastAchievement(newlyUnlocked[0]);
    }
  };

  // Load auth state and initial plans
  useEffect(() => {
    // Prime state immediately with local plans for instantaneous UI
    loadPlansFromLocalStorage();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fast asynchronous sync from Firestore
        loadUserPlansFromFirestore(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadPlansFromLocalStorage = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map(normalizeStudyPlan);
          setPlans(normalized);
          if (normalized.length > 0 && !activePlan) {
            setActivePlan(normalized[0]);
            setIsCreating(false);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUserPlansFromFirestore = async (uid: string) => {
    try {
      const q = query(collection(db, 'studyPlans'), where('userId', '==', uid));
      const snap = await getDocs(q);
      const fetched: StudyPlan[] = [];
      snap.forEach(docSnap => {
        fetched.push(normalizeStudyPlan(docSnap.data()));
      });

      // Sort by updatedAt descending
      fetched.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      if (fetched.length > 0) {
        setPlans(fetched);
        if (!activePlan) {
          setActivePlan(fetched[0]);
          setIsCreating(false);
        }
      } else {
        // If empty in Firestore, check if local storage has plans to migrate
        loadPlansFromLocalStorage();
      }
    } catch (err) {
      console.info('Firestore sincronizando localmente o sin conexión, utilizando caché local:', err);
      loadPlansFromLocalStorage();
    }
  };

  const savePlan = async (plan: StudyPlan) => {
    // 1. Update local state
    setPlans(prev => {
      const existingIdx = prev.findIndex(p => p.id === plan.id);
      let updated: StudyPlan[];
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = plan;
      } else {
        updated = [plan, ...prev];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });

    // 2. Persist to Firestore if signed in
    if (user) {
      try {
        const planRef = doc(db, 'studyPlans', plan.id);
        const cleanPayload = JSON.parse(JSON.stringify(plan));
        await setDoc(planRef, cleanPayload, { merge: true });
      } catch (err) {
        console.warn('Error al guardar en Firestore (continuando con almacenamiento local):', err);
      }
    }
  };

  const handleDeletePlan = async (id: string) => {
    setPlans(prev => {
      const filtered = prev.filter(p => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      return filtered;
    });

    if (activePlan?.id === id) {
      setActivePlan(null);
      setIsCreating(true);
    }

    if (user) {
      try {
        await deleteDoc(doc(db, 'studyPlans', id));
      } catch (err) {
        console.warn('Error al eliminar en Firestore:', err);
      }
    }
  };

  const handleGeneratePlan = async (config: {
    files: ParsedFile[];
    subject: string;
    daysLeft: number;
    targetGrade: number;
    studyHoursPerDay: number;
    customNotes?: string;
    preferredProvider?: string;
  }) => {
    setIsGenerating(true);
    setErrorMessage(null);

    // Sanitize file payload to avoid network memory limits or payload resets
    const sanitizedFiles = config.files.map(f => {
      const cleanedText = f.text ? f.text.slice(0, 60000) : '';
      const keepBase64 = f.base64 && f.base64.length < 3500000 ? f.base64 : undefined;
      return {
        name: f.name,
        type: f.type || 'text/plain',
        text: cleanedText,
        base64: keepBase64,
      };
    });

    try {
      let rawPlan: any = null;

      try {
        const response = await fetch('/api/generate-study-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: sanitizedFiles,
            subject: config.subject,
            daysLeft: config.daysLeft,
            targetGrade: config.targetGrade,
            studyHoursPerDay: config.studyHoursPerDay,
            dailyAvailableHours: config.studyHoursPerDay,
            customNotes: config.customNotes,
            preferredProvider: config.preferredProvider,
          }),
        });

        if (response.ok) {
          rawPlan = await response.json();
        } else {
          console.warn('[App] Servidor devolvió código no exitoso, activando plan alternativo local.');
        }
      } catch (networkErr) {
        console.warn('[App] Error de red o servidor al generar plan. Usando generador local:', networkErr);
      }

      // If server fetch failed or returned invalid response, use local client fallback generator
      if (!rawPlan || (typeof rawPlan === 'object' && !rawPlan.schedule && !rawPlan.studyGuide)) {
        rawPlan = generateClientFallbackPlan({
          subject: config.subject,
          daysLeft: config.daysLeft,
          targetGrade: config.targetGrade,
          studyHoursPerDay: config.studyHoursPerDay,
          files: config.files,
          customNotes: config.customNotes,
        });
      }

      const newPlan = normalizeStudyPlan({
        ...rawPlan,
        id: `plan-${Date.now()}`,
        userId: user ? user.uid : 'guest-user',
        fileNames: config.files.map(f => f.name),
        subject: config.subject || rawPlan.subject || 'Estudio',
        daysLeft: config.daysLeft,
        targetGrade: config.targetGrade,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setActivePlan(newPlan);
      await savePlan(newPlan);
      setIsCreating(false);
      setActiveTab('schedule');
      setSelectedStudyDay('all');
    } catch (err: any) {
      console.error('Generation failed:', err);
      setErrorMessage(
        'No se pudo generar el plan de estudio. Inténtalo de nuevo o carga un temario más ligero.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAskTutor = (topic?: string) => {
    setTutorTopic(topic || activePlan?.subject || '');
    setIsTutorOpen(true);
  };

  const handleNavigateTab = (tab: 'schedule' | 'guide' | 'flashcards' | 'exercises' | 'traps', dayNumber?: number) => {
    if (typeof dayNumber === 'number') {
      setSelectedStudyDay(dayNumber);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartStudySession = (dayNumber?: number, taskId?: string) => {
    setSessionDayNumber(dayNumber);
    setSessionTaskId(taskId);
    setIsStudySessionMode(true);
  };

  const handlePrint = () => {
    window.print();
  };

  // Calculate task statistics for visual progress bar across all days
  const activePlanStats = activePlan ? calculatePlanTaskStats(activePlan) : null;

  // IF STUDY SESSION MODE IS ACTIVE:
  // Render ONLY the current task and integrated Pomodoro timer with distraction-free layout (Navbar & all tabs hidden)
  if (isStudySessionMode && activePlan) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
        <OfflineIndicator />
        <StudySessionView
          plan={activePlan}
          initialDayNumber={sessionDayNumber}
          initialTaskId={sessionTaskId}
          onExitSession={() => setIsStudySessionMode(false)}
          onUpdatePlan={(updated) => {
            setActivePlan(updated);
            savePlan(updated);
          }}
          onNavigateTab={handleNavigateTab}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white pb-16 md:pb-0">
      {/* Offline Alert Indicator */}
      <OfflineIndicator />

      {/* Main Navbar */}
      <Navbar
        user={user}
        onOpenSavedPlans={() => setIsDrawerOpen(true)}
        savedPlansCount={plans.length}
        onNewPlan={() => {
          setIsCreating(true);
          setActivePlan(null);
          setSelectedStudyDay('all');
        }}
        onOpenAchievements={() => setIsAchievementsModalOpen(true)}
        unlockedAchievementsCount={activePlan ? getPlanAchievements(activePlan).filter(a => a.unlockedAt || a.progressPercent >= 100).length : 0}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <p className="font-bold">Error en la operación</p>
              <p className="mt-0.5 text-xs opacity-90">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 dark:hover:text-red-200 font-bold p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {isCreating || !activePlan ? (
          <PlanConfigurator
            onGeneratePlan={handleGeneratePlan}
            isGenerating={isGenerating}
          />
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Header with Title, Actions & Visual Progress Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs transition-colors space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    id="btn-back-to-config"
                    onClick={() => setIsCreating(true)}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer shrink-0"
                    title="Configurar nuevo plan"
                    aria-label="Volver a configurar nuevo plan"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                      {activePlan.title}
                    </h1>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                      {activePlan.daysLeft}d restantes • Meta {activePlan.targetGrade}% • {activePlan.fileNames.length} archivos
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
                  {/* Modo Sesión Focus Pomodoro Button */}
                  <button
                    type="button"
                    id="btn-open-session-mode"
                    onClick={() => handleStartStudySession()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[40px] text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                    title="Entrar al Modo Sesión de Estudio sin distracciones con temporizador Pomodoro"
                  >
                    <Timer className="w-4 h-4 shrink-0" />
                    <span>Modo Sesión</span>
                  </button>

                  {/* Torneo Multi-IA Competition Audit Button */}
                  <button
                    type="button"
                    onClick={() => setIsAICompetitionModalOpen(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-bold text-blue-900 dark:text-blue-200 bg-blue-100/80 hover:bg-blue-200 dark:bg-blue-950/70 dark:hover:bg-blue-900/80 border border-blue-300 dark:border-blue-800 rounded-xl active:scale-95 transition-all cursor-pointer shadow-2xs"
                    title="Ver certificación pedagógica y auditoría del motor de análisis"
                  >
                    <Trophy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Auditoría IA ({activePlan.aiCompetitionResult?.score || 99}/100)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAskTutor(activePlan.subject)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" /> 
                    <span>Tutor IA</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="hidden sm:flex items-center gap-1.5 px-3 py-2.5 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl active:scale-95 transition-all cursor-pointer"
                    title="Imprimir guía"
                  >
                    <Printer className="w-3.5 h-3.5 shrink-0" /> 
                    <span>Imprimir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(true);
                      setActivePlan(null);
                      setSelectedStudyDay('all');
                    }}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" /> 
                    <span>Nuevo</span>
                  </button>
                </div>
              </div>

              {/* Visual Progress Bar in Header across all sessions */}
              {activePlanStats && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Progreso General del Plan:
                      </span>
                      <span className="font-black text-blue-600 dark:text-blue-400">
                        {activePlanStats.percentage}% completado
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300 font-semibold">{activePlanStats.completedTasks}</strong> de {activePlanStats.totalTasks} tareas listas
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        <strong className="text-slate-700 dark:text-slate-300 font-semibold">{activePlanStats.completedDays}</strong> de {activePlanStats.totalDays} días
                      </span>
                    </div>
                  </div>

                  {/* Multi-gradient progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${activePlanStats.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Active Tab Views & Navigation Bar */}
            <div className="space-y-6">
              {/* 1. Cronograma de Estudio (rendered at the top) */}
              {activeTab === 'schedule' && (
                <StudyScheduleView
                  plan={activePlan}
                  selectedDayNumber={selectedStudyDay}
                  onSelectDay={setSelectedStudyDay}
                  onNavigateTab={handleNavigateTab}
                  onStartSession={handleStartStudySession}
                  onOpenAchievements={() => setIsAchievementsModalOpen(true)}
                  onUpdatePlan={handleUpdatePlan}
                />
              )}

              {/* 2. Navigation Tabs Bar (Placed BELOW Cronograma de Estudio) */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex items-center gap-1.5 overflow-x-auto shadow-2xs transition-colors scrollbar-none sticky top-2 z-20">
                {[
                  { id: 'schedule', label: 'Cronograma', icon: Calendar, badge: `${activePlan.daysLeft}d` },
                  { id: 'guide', label: 'Guía y Conceptos', icon: BookOpen, badge: `${(activePlan.studyGuide?.coreConcepts || []).length}` },
                  { id: 'flashcards', label: 'Tarjetas de Memoria', icon: Layers, badge: `${(activePlan.studyGuide?.flashcards || []).length}` },
                  { id: 'exercises', label: 'Ejercicios y Exámenes', icon: HelpCircle, badge: `${(activePlan.exercises || []).length}` },
                  { id: 'traps', label: 'Trampas de Examen', icon: AlertTriangle, badge: `${(activePlan.studyGuide?.commonExamTraps || []).length}` },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      id={`tab-${tab.id}`}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 min-w-[130px] sm:min-w-[150px] min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 3. Selected Module Views */}
              <div>
                {activeTab === 'guide' && (
                  <StudyGuideView
                    plan={activePlan}
                    selectedDayNumber={selectedStudyDay}
                    onSelectDay={setSelectedStudyDay}
                    onAskTutor={handleAskTutor}
                    onNavigateTab={handleNavigateTab}
                    onUpdatePlan={handleUpdatePlan}
                    initialCategory="concepts"
                  />
                )}

                {activeTab === 'traps' && (
                  <StudyGuideView
                    plan={activePlan}
                    selectedDayNumber={selectedStudyDay}
                    onSelectDay={setSelectedStudyDay}
                    onAskTutor={handleAskTutor}
                    onNavigateTab={handleNavigateTab}
                    onUpdatePlan={handleUpdatePlan}
                    initialCategory="traps"
                  />
                )}

                {activeTab === 'flashcards' && (
                  <FlashcardsView
                    flashcards={activePlan.studyGuide?.flashcards || []}
                    schedule={activePlan.schedule || []}
                    selectedDayNumber={selectedStudyDay}
                    onSelectDay={setSelectedStudyDay}
                    plan={activePlan}
                    onUpdatePlan={handleUpdatePlan}
                    onNavigateTab={handleNavigateTab}
                  />
                )}

                {activeTab === 'exercises' && (
                  <ExercisesView
                    plan={activePlan}
                    selectedDayNumber={selectedStudyDay}
                    onSelectDay={setSelectedStudyDay}
                    onNavigateTab={handleNavigateTab}
                    onUpdatePlan={handleUpdatePlan}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating AI Tutor Button on active plan */}
      {activePlan && !isCreating && (
        <button
          type="button"
          onClick={() => handleAskTutor(activePlan.subject)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-xl shadow-blue-600/30 hover:scale-105 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Consultar al Tutor IA</span>
        </button>
      )}

      {/* Achievements Gallery Modal */}
      {activePlan && (
        <AchievementsModal
          plan={activePlan}
          isOpen={isAchievementsModalOpen}
          onClose={() => setIsAchievementsModalOpen(false)}
        />
      )}

      {/* Real-time Achievement Celebration Toast */}
      <AchievementToast
        achievement={toastAchievement}
        onClose={() => setToastAchievement(null)}
      />

      {/* AI Tutor Modal */}
      <AITutorModal
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        initialTopic={tutorTopic}
        context={activePlan ? `${activePlan.subject} - ${activePlan.strategySummary}` : ''}
      />

      {/* Admin Panel & QA Agent Modal */}
      <AdminLogoModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        currentUserEmail={user?.email || 'alexparababi23@gmail.com'}
        onInjectTestPlan={(plan) => {
          setActivePlan(plan);
          setIsCreating(false);
          setSelectedStudyDay('all');
        }}
      />

      {/* Community Suggestions & Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        currentUserEmail={user?.email}
        currentUserName={user?.displayName}
        currentUserId={user?.uid}
      />

      {/* User Profile Customization & Avatar Presets Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userEmail={user?.email}
      />

      {/* AI Multi-Model Competition Audit Modal */}
      <AICompetitionModal
        isOpen={isAICompetitionModalOpen}
        onClose={() => setIsAICompetitionModalOpen(false)}
        competitionResult={activePlan?.aiCompetitionResult}
      />

      {/* Smartphone Animated 5-Tab Bottom Navigation Bar */}
      <BottomNav
        user={user}
        savedPlansCount={plans.length}
        unlockedAchievementsCount={activePlan ? getPlanAchievements(activePlan).filter(a => a.unlockedAt || a.progressPercent >= 100).length : 0}
        isCreating={isCreating}
        onNewPlan={() => {
          setIsCreating(true);
          setActivePlan(null);
          setSelectedStudyDay('all');
        }}
        onOpenSavedPlans={() => setIsDrawerOpen(true)}
        onOpenAchievements={() => setIsAchievementsModalOpen(true)}
        onOpenFeedback={() => setIsFeedbackModalOpen(true)}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onLogin={signInWithGoogle}
        onLogout={logoutUser}
      />

      {/* Genius Brand Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xs py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
              <img 
                src={currentLogo} 
                alt="Genius" 
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            <span className="font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">Genius</span>
            <span className="text-slate-400 dark:text-slate-500">• Planificador de Estudio Integral</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              💬 Dejar Opinión o Sugerencia
            </button>
          </div>
        </div>
      </footer>

      {/* Saved Plans Drawer */}
      <SavedPlansDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        plans={plans}
        activePlanId={activePlan?.id || null}
        onSelectPlan={(plan) => {
          setActivePlan(plan);
          setIsCreating(false);
          setSelectedStudyDay('all');
        }}
        onDeletePlan={handleDeletePlan}
      />
    </div>
  );
}
