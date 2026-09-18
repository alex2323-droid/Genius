export type ExerciseType = 'mcq' | 'open' | 'true_false';
export type DifficultyLevel = 'basic' | 'intermediate' | 'advanced';
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
}

export interface DefinitionOrFormula {
  term: string;
  definition: string;
  formulaOrSyntax?: string;
}

export interface Flashcard {
  front: string;
  back: string;
  category: string;
}

export interface StudyGuideData {
  executiveSummary: string;
  coreConcepts: CoreConcept[];
  keyDefinitionsAndFormulas: DefinitionOrFormula[];
  commonExamTraps: string[];
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
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  studyPlanId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>;
  aiFeedback?: string;
  createdAt: string;
}
