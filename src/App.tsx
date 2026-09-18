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
  AlertCircle
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
  where 
} from './firebase.ts';
import type { StudyPlan } from './types/study.ts';
import type { ParsedFile } from './utils/fileParser.ts';
import { Navbar } from './components/Navbar.tsx';
import { PlanConfigurator } from './components/PlanConfigurator.tsx';
import { StudyScheduleView } from './components/StudyScheduleView.tsx';
import { StudyGuideView } from './components/StudyGuideView.tsx';
import { FlashcardsView } from './components/FlashcardsView.tsx';
import { ExercisesView } from './components/ExercisesView.tsx';
import { AITutorModal } from './components/AITutorModal.tsx';
import { SavedPlansDrawer } from './components/SavedPlansDrawer.tsx';

const LOCAL_STORAGE_KEY = 'estudia_genius_plans_cache';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [activePlan, setActivePlan] = useState<StudyPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'guide' | 'flashcards' | 'exercises'>('schedule');
  const [isCreating, setIsCreating] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [tutorTopic, setTutorTopic] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setPlans(parsed);
        if (parsed.length > 0 && !activePlan) {
          setActivePlan(parsed[0]);
          setIsCreating(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUserPlansFromFirestore = async (uid: string) => {
    try {
      const q = query(collection(db, 'studyPlans'), where('userId', '==', uid));
      
      // Timeout promise to prevent any UI freeze if network is slow
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), 4000)
      );

      const snap = await Promise.race([getDocs(q), timeoutPromise]);
      const fetched: StudyPlan[] = [];
      snap.forEach(docSnap => {
        fetched.push(docSnap.data() as StudyPlan);
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
      console.warn('Could not read from Firestore or timed out, preserving local cache:', err);
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
        await setDoc(planRef, plan);
      } catch (err) {
        console.error('Error saving to Firestore:', err);
      }
    }
  };

  const handleDeletePlan = async (planId: string) => {
    setPlans(prev => {
      const filtered = prev.filter(p => p.id !== planId);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      return filtered;
    });

    if (activePlan?.id === planId) {
      setActivePlan(null);
      setIsCreating(true);
    }

    if (user) {
      try {
        await deleteDoc(doc(db, 'studyPlans', planId));
      } catch (err) {
        console.error('Error deleting from Firestore:', err);
      }
    }
  };

  // Generate a new study plan from backend AI API
  const handleGeneratePlan = async (params: {
    subject: string;
    daysLeft: number;
    targetGrade: number;
    studyHoursPerDay: number;
    files: ParsedFile[];
    customNotes: string;
  }) => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const payload = {
        subject: params.subject,
        daysLeft: params.daysLeft,
        targetGrade: params.targetGrade,
        studyHoursPerDay: params.studyHoursPerDay,
        customNotes: params.customNotes,
        files: params.files.map(f => ({
          name: f.name,
          type: f.type,
          text: f.text,
          base64: f.base64,
        })),
      };

      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'No se pudo generar el plan de estudio.');
      }

      const generatedData = data.plan;

      const newPlan: StudyPlan = {
        id: `plan-${Date.now()}`,
        userId: user?.uid || 'guest-user',
        title: generatedData.title || params.subject,
        subject: generatedData.subject || params.subject,
        daysLeft: params.daysLeft,
        targetGrade: params.targetGrade,
        strategySummary: generatedData.strategySummary || '',
        recommendedDailyHours: generatedData.recommendedDailyHours || params.studyHoursPerDay,
        totalEstimatedHours: generatedData.totalEstimatedHours || params.daysLeft * params.studyHoursPerDay,
        fileNames: params.files.map(f => f.name),
        schedule: generatedData.schedule || [],
        studyGuide: generatedData.studyGuide || {
          executiveSummary: '',
          coreConcepts: [],
          keyDefinitionsAndFormulas: [],
          commonExamTraps: [],
          flashcards: [],
        },
        exercises: generatedData.exercises || [],
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await savePlan(newPlan);
      setActivePlan(newPlan);
      setIsCreating(false);
      setActiveTab('schedule');
    } catch (err: any) {
      console.error('Error generating plan:', err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado al generar el plan de estudio.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAskTutor = (topic: string) => {
    setTutorTopic(topic);
    setIsTutorOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100 transition-colors">
      {/* Navigation Header */}
      <Navbar
        user={user}
        onOpenSavedPlans={() => setIsDrawerOpen(true)}
        savedPlansCount={plans.length}
        onNewPlan={() => {
          setIsCreating(true);
          setActivePlan(null);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-12 sm:pb-8">
        {errorMessage && (
          <div className="mb-4 sm:mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs sm:text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold underline ml-4 hover:text-red-900 dark:hover:text-red-200 p-1"
            >
              Cerrar
            </button>
          </div>
        )}

        {isCreating || !activePlan ? (
          /* View: Plan Configurator & File Uploader */
          <PlanConfigurator
            onGeneratePlan={handleGeneratePlan}
            isGenerating={isGenerating}
          />
        ) : (
          /* View: Generated Study Plan Workspace */
          <div className="space-y-4 sm:space-y-6">
            {/* Top Plan Subheader & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
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

              <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto w-full sm:w-auto justify-end">
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
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[40px] text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" /> 
                  <span>Nuevo</span>
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1.5 flex items-center gap-1.5 overflow-x-auto shadow-2xs transition-colors scrollbar-none">
              {[
                { id: 'schedule', label: 'Cronograma', icon: Calendar, badge: `${activePlan.daysLeft}d` },
                { id: 'guide', label: 'Guía y Fórmulas', icon: BookOpen, badge: `${activePlan.studyGuide.coreConcepts.length}` },
                { id: 'flashcards', label: 'Flashcards', icon: Layers, badge: `${activePlan.studyGuide.flashcards.length}` },
                { id: 'exercises', label: 'Ejercicios', icon: HelpCircle, badge: `${activePlan.exercises.length}` },
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

            {/* Active Tab View */}
            <div>
              {activeTab === 'schedule' && (
                <StudyScheduleView
                  plan={activePlan}
                  onUpdatePlan={(updated) => {
                    setActivePlan(updated);
                    savePlan(updated);
                  }}
                />
              )}

              {activeTab === 'guide' && (
                <StudyGuideView
                  plan={activePlan}
                  onAskTutor={handleAskTutor}
                />
              )}

              {activeTab === 'flashcards' && (
                <FlashcardsView
                  flashcards={activePlan.studyGuide.flashcards}
                />
              )}

              {activeTab === 'exercises' && (
                <ExercisesView
                  plan={activePlan}
                />
              )}
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

      {/* AI Tutor Modal */}
      <AITutorModal
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        initialTopic={tutorTopic}
        context={activePlan ? `${activePlan.subject} - ${activePlan.strategySummary}` : ''}
      />

      {/* Saved Plans Drawer */}
      <SavedPlansDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        plans={plans}
        activePlanId={activePlan?.id || null}
        onSelectPlan={(plan) => {
          setActivePlan(plan);
          setIsCreating(false);
        }}
        onDeletePlan={handleDeletePlan}
      />
    </div>
  );
}
