import React from 'react';
import { User, LogIn, LogOut, BookOpen, Sparkles, FolderKanban, Sun, Moon } from 'lucide-react';
import { signInWithGoogle, logoutUser } from '../firebase.ts';
import { useTheme } from '../context/ThemeContext.tsx';
import type { User as FirebaseUser } from 'firebase/auth';

interface NavbarProps {
  user: FirebaseUser | null;
  onOpenSavedPlans: () => void;
  savedPlansCount: number;
  onNewPlan: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenSavedPlans,
  savedPlansCount,
  onNewPlan,
}) => {
  const [loading, setLoading] = React.useState(false);
  const { theme, toggleTheme, isDark } = useTheme();

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
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors safe-top">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand */}
        <div 
          onClick={onNewPlan}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0 min-h-[44px]"
          id="nav-brand"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight">EstudiaGenius</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Guías y ejercicios adaptados a tus días y nota meta</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Dark Mode Toggle */}
          <button
            type="button"
            id="btn-theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-0 sm:min-h-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl sm:rounded-lg transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-5 h-5 sm:w-4 sm:h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
            ) : (
              <Moon className="w-5 h-5 sm:w-4 sm:h-4 text-slate-600 transition-transform -rotate-12 hover:rotate-0" />
            )}
          </button>

          <button
            type="button"
            id="btn-saved-plans"
            onClick={onOpenSavedPlans}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl sm:rounded-lg transition-colors cursor-pointer"
          >
            <FolderKanban className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            <span className="hidden md:inline">Mis Planes</span>
            {savedPlansCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] sm:text-xs flex items-center justify-center font-bold">
                {savedPlansCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="btn-new-plan-nav"
            onClick={onNewPlan}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            + Crear Nuevo Plan
          </button>

          {/* User Auth */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800" id="user-profile-badge">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  className="w-8 h-8 rounded-full ring-2 ring-blue-500/20"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 text-xs font-bold">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-slate-900 dark:text-slate-100 leading-none truncate max-w-[120px]">
                  {user.displayName || 'Estudiante'}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate max-w-[120px]">
                  {user.email}
                </p>
              </div>
              <button
                type="button"
                id="btn-logout"
                onClick={handleLogout}
                title="Cerrar sesión"
                className="w-10 h-10 min-w-[40px] min-h-[40px] sm:w-auto sm:h-auto sm:min-w-0 sm:min-h-0 flex items-center justify-center text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl sm:rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-login-google"
              onClick={handleLogin}
              disabled={loading}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 min-h-[44px] text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl sm:rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="hidden sm:inline">{loading ? 'Conectando...' : 'Iniciar con Google'}</span>
              <span className="sm:hidden">{loading ? '...' : 'Entrar'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
