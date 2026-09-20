import React, { useState } from 'react';
import { 
  User, 
  LogIn, 
  LogOut, 
  Sparkles, 
  FolderKanban, 
  Sun, 
  Moon, 
  Trophy, 
  ShieldCheck, 
  Plus, 
  MessageSquarePlus, 
  Palette,
  BarChart2
} from 'lucide-react';
import { signInWithGoogle, logoutUser } from '../firebase.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { useCustomLogo } from '../utils/logoStorage.ts';
import { useUserProfile, AVATAR_PRESETS } from '../utils/avatarStorage.ts';
import type { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  user: FirebaseUser | null;
  onOpenSavedPlans: () => void;
  savedPlansCount: number;
  onNewPlan: () => void;
  onOpenAchievements?: () => void;
  unlockedAchievementsCount?: number;
  onOpenAdmin?: () => void;
  onOpenFeedback?: () => void;
  onOpenProfileModal?: () => void;
  onOpenDashboard?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenSavedPlans,
  savedPlansCount,
  onNewPlan,
  onOpenAchievements,
  unlockedAchievementsCount = 0,
  onOpenAdmin,
  onOpenFeedback,
  onOpenProfileModal,
  onOpenDashboard,
}) => {
  const [loading, setLoading] = useState(false);
  const { toggleTheme, isDark } = useTheme();
  const currentLogo = useCustomLogo();
  const [userProfile] = useUserProfile();

  const activePreset = AVATAR_PRESETS.find((p) => p.id === userProfile.avatarPresetId) || AVATAR_PRESETS[0];

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div 
          onClick={onNewPlan}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0 min-h-[40px]"
          id="nav-brand"
        >
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform shrink-0 flex items-center justify-center">
            <img 
              src={currentLogo} 
              alt="Genius Logo" 
              className="w-full h-full object-contain filter drop-shadow-sm"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-base sm:text-xl text-slate-900 dark:text-white tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Genius
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] sm:text-xs font-semibold bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                <Sparkles className="w-2.5 h-2.5 text-blue-500" /> AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden lg:block leading-none">Planificador de Estudio Integral</p>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {onOpenAdmin && (
            <button
              type="button"
              id="btn-admin-logo"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors cursor-pointer"
              title="Panel Administrador - Subir Logo desde Galería"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Admin Logo</span>
            </button>
          )}

          <button
            type="button"
            id="btn-theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex items-center justify-center w-9 h-9 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 transition-transform -rotate-12 hover:rotate-0" />
            )}
          </button>

          {onOpenAchievements && (
            <button
              type="button"
              id="btn-achievements-nav"
              onClick={onOpenAchievements}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 rounded-lg transition-colors cursor-pointer"
              title="Ver medallas y logros"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Logros</span>
              {unlockedAchievementsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                  {unlockedAchievementsCount}
                </span>
              )}
            </button>
          )}

          {onOpenFeedback && (
            <button
              type="button"
              id="btn-feedback-nav"
              onClick={onOpenFeedback}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 rounded-lg transition-colors cursor-pointer"
              title="Sugerencias y Opiniones"
            >
              <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Sugerencias</span>
            </button>
          )}

          {onOpenDashboard && (
            <button
              type="button"
              id="btn-performance-nav"
              onClick={onOpenDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 rounded-lg transition-colors cursor-pointer"
              title="Ver estadísticas de rendimiento y progreso"
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Rendimiento</span>
            </button>
          )}

          <button
            type="button"
            id="btn-saved-plans"
            onClick={onOpenSavedPlans}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Mis Planes</span>
            {savedPlansCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                {savedPlansCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="btn-new-plan-nav"
            onClick={onNewPlan}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Plan</span>
          </button>

          {/* User Profile Badge & Custom Avatar Opener */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800" id="user-profile-badge">
            {onOpenProfileModal && (
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                title="Personalizar avatar y perfil"
              >
                {userProfile.customAvatarUrl ? (
                  <img
                    src={userProfile.customAvatarUrl}
                    alt="Avatar"
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-blue-500/30 group-hover:scale-105 transition-transform"
                  />
                ) : user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Usuario'}
                    className="w-7 h-7 rounded-full ring-2 ring-blue-500/30 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${activePreset.gradient} text-white flex items-center justify-center text-xs font-bold shadow-xs group-hover:scale-105 transition-transform`}>
                    {activePreset.emoji}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none truncate max-w-[100px]">
                    {userProfile.displayName || user?.displayName || 'Estudiante'}
                  </p>
                  <p className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 leading-tight">Editar Perfil</p>
                </div>
              </button>
            )}

            {user ? (
              <button
                type="button"
                id="btn-logout"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                id="btn-login-google"
                onClick={handleLogin}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>{loading ? '...' : 'Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
