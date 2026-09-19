import type { StudyPlan, Achievement } from '../types/study.ts';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or Lucide icon key
  category: 'consistency' | 'mastery' | 'practice' | 'milestone';
  requirementText: string;
  checkUnlocked: (stats: PlanStats) => { unlocked: boolean; progressPercent: number };
}

export interface PlanStats {
  totalTasks: number;
  completedTasks: number;
  completedDays: number;
  totalDays: number;
  readTasksCompleted: number;
  practiceTasksCompleted: number;
  reviewTasksCompleted: number;
  progressPercent: number;
  targetGrade: number;
}

export const ALL_ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_task',
    title: 'Primer Paso',
    description: 'Completa tu primera tarea programada en el cronograma.',
    icon: '⚡',
    category: 'consistency',
    requirementText: 'Completa 1 tarea del plan',
    checkUnlocked: (s) => ({
      unlocked: s.completedTasks >= 1,
      progressPercent: Math.min(100, (s.completedTasks / 1) * 100),
    }),
  },
  {
    id: 'day_conqueror',
    title: 'Día Superado',
    description: 'Completa el 100% de las tareas de al menos 1 día completo de estudio.',
    icon: '📅',
    category: 'consistency',
    requirementText: 'Completa 1 día completo',
    checkUnlocked: (s) => ({
      unlocked: s.completedDays >= 1,
      progressPercent: Math.min(100, (s.completedDays / 1) * 100),
    }),
  },
  {
    id: 'constant_student',
    title: 'Estudiante Constante',
    description: 'Completa 5 tareas programadas y demuestra hábito diario.',
    icon: '🔥',
    category: 'consistency',
    requirementText: 'Completa 5 tareas del cronograma',
    checkUnlocked: (s) => ({
      unlocked: s.completedTasks >= 5,
      progressPercent: Math.min(100, (s.completedTasks / 5) * 100),
    }),
  },
  {
    id: 'concept_master',
    title: 'Maestro de Conceptos',
    description: 'Completa 3 tareas de lectura teórica y profundización.',
    icon: '🧠',
    category: 'mastery',
    requirementText: 'Completa 3 tareas de lectura/teoría',
    checkUnlocked: (s) => ({
      unlocked: s.readTasksCompleted >= 3,
      progressPercent: Math.min(100, (s.readTasksCompleted / 3) * 100),
    }),
  },
  {
    id: 'practice_hero',
    title: 'Héroe de la Práctica',
    description: 'Resuelve y completa 3 tareas de práctica activa y ejercicios.',
    icon: '🎯',
    category: 'practice',
    requirementText: 'Completa 3 tareas de práctica activa',
    checkUnlocked: (s) => ({
      unlocked: s.practiceTasksCompleted >= 3,
      progressPercent: Math.min(100, (s.practiceTasksCompleted / 3) * 100),
    }),
  },
  {
    id: 'trap_detector',
    title: 'Detector de Trampas',
    description: 'Completa tareas de repaso e inspección de errores de examen.',
    icon: '🛡️',
    category: 'mastery',
    requirementText: 'Completa 3 tareas de repaso/memorización',
    checkUnlocked: (s) => ({
      unlocked: s.reviewTasksCompleted >= 3,
      progressPercent: Math.min(100, (s.reviewTasksCompleted / 3) * 100),
    }),
  },
  {
    id: 'halfway_hero',
    title: 'Punto Medio (50%)',
    description: 'Alcanza la mitad del recorrido de tu plan de estudio.',
    icon: '📈',
    category: 'milestone',
    requirementText: 'Logra un 50% de progreso global',
    checkUnlocked: (s) => ({
      unlocked: s.progressPercent >= 50,
      progressPercent: Math.min(100, (s.progressPercent / 50) * 100),
    }),
  },
  {
    id: 'mastery_god',
    title: 'Nivel Dios (100%)',
    description: '¡Dominio absoluto! Completa el 100% de todas las tareas del plan.',
    icon: '👑',
    category: 'milestone',
    requirementText: 'Completa el 100% del plan',
    checkUnlocked: (s) => ({
      unlocked: s.progressPercent >= 100,
      progressPercent: Math.min(100, s.progressPercent),
    }),
  },
];

export function calculateStats(plan: StudyPlan): PlanStats {
  const schedule = Array.isArray(plan?.schedule) ? plan.schedule : [];
  let totalTasks = 0;
  let completedTasks = 0;
  let completedDays = 0;
  let readTasksCompleted = 0;
  let practiceTasksCompleted = 0;
  let reviewTasksCompleted = 0;

  schedule.forEach((day) => {
    const tasks = Array.isArray(day?.tasks) ? day.tasks : [];
    let dayAllDone = tasks.length > 0;

    tasks.forEach((task) => {
      totalTasks++;
      if (task.completed) {
        completedTasks++;
        if (task.type === 'read') {
          readTasksCompleted++;
        } else if (task.type === 'practice' || task.type === 'test') {
          practiceTasksCompleted++;
        } else if (task.type === 'memorize' || task.type === 'review') {
          reviewTasksCompleted++;
        }
      } else {
        dayAllDone = false;
      }
    });

    if (dayAllDone && tasks.length > 0) {
      completedDays++;
    }
  });

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : plan.progress || 0;

  return {
    totalTasks,
    completedTasks,
    completedDays,
    totalDays: schedule.length,
    readTasksCompleted,
    practiceTasksCompleted,
    reviewTasksCompleted,
    progressPercent,
    targetGrade: plan.targetGrade || 85,
  };
}

export function getPlanAchievements(plan: StudyPlan): Achievement[] {
  const stats = calculateStats(plan);
  const unlockedIds = new Set(plan.unlockedAchievements || []);

  return ALL_ACHIEVEMENT_DEFS.map((def) => {
    const { unlocked, progressPercent } = def.checkUnlocked(stats);
    const isUnlocked = unlocked || unlockedIds.has(def.id);

    return {
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      unlockedAt: isUnlocked ? (plan.updatedAt || new Date().toISOString()) : undefined,
      progressPercent: isUnlocked ? 100 : Math.round(progressPercent),
      requirementText: def.requirementText,
    };
  });
}

/**
 * Checks if any new achievements are unlocked based on the updated plan state.
 * Returns the newly unlocked Achievement objects and the updated unlocked ID array.
 */
export function checkNewAchievements(plan: StudyPlan): {
  newlyUnlocked: Achievement[];
  updatedUnlockedIds: string[];
} {
  const stats = calculateStats(plan);
  const currentUnlockedIds = new Set(plan.unlockedAchievements || []);
  const newlyUnlocked: Achievement[] = [];
  const updatedUnlockedIds = [...currentUnlockedIds];

  ALL_ACHIEVEMENT_DEFS.forEach((def) => {
    if (!currentUnlockedIds.has(def.id)) {
      const { unlocked } = def.checkUnlocked(stats);
      if (unlocked) {
        updatedUnlockedIds.push(def.id);
        newlyUnlocked.push({
          id: def.id,
          title: def.title,
          description: def.description,
          icon: def.icon,
          category: def.category,
          unlockedAt: new Date().toISOString(),
          progressPercent: 100,
          requirementText: def.requirementText,
        });
      }
    }
  });

  return {
    newlyUnlocked,
    updatedUnlockedIds,
  };
}
