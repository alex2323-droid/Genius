export type ExerciseType = 'mcq' | 'open' | 'true_false';
export type DifficultyLevel = 'basic' | 'intermediate' | 'advanced' | 'mastery';
export type TaskType = 'read' | 'practice' | 'memorize' | 'review' | 'test';

export interface DailyTask {
  id: string;
  task: string;
  timeMinutes: number;
  type: TaskType;
  completed?: boolean;
}

export interface DailyScheduleDay {
  dayNumber: number;
  title: string;
  focus: string;
  estimatedHours: number;
  objectives: string[];
  keyTopics: string[];
  tasks: DailyTask[];
}

export interface CoreConcept {
  title: string;
  explanation: string;
  importance: 'critical' | 'high' | 'medium';
  exampleOrFormula?: string;
  dayNumber?: number;
}

export interface DefinitionOrFormula {
  term: string;
  definition: string;
  formulaOrSyntax?: string;
  dayNumber?: number;
}

export interface Flashcard {
  id?: string;
  front: string;
  back: string;
  category: string;
  dayNumber?: number;
}

export interface ExamTrapItem {
  id?: string;
  mistake: string;
  correction: string;
  whyItMatters?: string;
  dayNumber?: number;
}

export interface StudyGuideData {
  executiveSummary: string;
  coreConcepts: CoreConcept[];
  keyDefinitionsAndFormulas: DefinitionOrFormula[];
  commonExamTraps: (string | ExamTrapItem)[];
  flashcards: Flashcard[];
}

export interface Exercise {
  id: string;
  type: ExerciseType;
  difficulty: DifficultyLevel;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  hint: string;
  points: number;
  dayNumber?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'consistency' | 'mastery' | 'practice' | 'milestone';
  unlockedAt?: string;
  progressPercent: number; // 0-100
  requirementText: string;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  subject: string;
  daysLeft: number;
  examDate?: string;
  targetGrade: number; // e.g. 70, 85, 95, 100
  strategySummary: string;
  recommendedDailyHours: number;
  totalEstimatedHours: number;
  fileNames: string[];
  schedule: DailyScheduleDay[];
  studyGuide: StudyGuideData;
  exercises: Exercise[];
  progress: number;
  unlockedAchievements?: string[]; // Array of achievement IDs that have been unlocked
  createdAt: string;
  updatedAt: string;
  providerUsed?: string;
  providerId?: string;
}

export interface AIProviderInfo {
  id: 'gemini' | 'openai' | 'kimi' | 'nvidia';
  name: string;
  configured: boolean;
  model: string;
  description: string;
  isPrimary?: boolean;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  studyPlanId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  createdAt: string;
}
