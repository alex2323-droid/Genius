import React, { useState } from 'react';
import { 
  Sparkles, 
  FolderKanban, 
  Trophy, 
  MessageSquarePlus, 
  User, 
  Plus, 
  Sun, 
  Moon, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  X,
  Palette,
  BarChart2
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';
import { useUserProfile, AVATAR_PRESETS } from '../utils/avatarStorage.ts';
import type { User as FirebaseUser } from 'firebase/auth';

interface BottomNavProps {
  user: FirebaseUser | null;
  savedPlansCount: number;
  unlockedAchievementsCount: number;
  isCreating: boolean;
  onNewPlan: () => void;
  onOpenSavedPlans: () => void;
  onOpenAchievements: () => void;
  onOpenFeedback: () => void;
  onOpenAdmin?: () => void;
  onOpenProfileModal: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onOpenDashboard?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  user,
  savedPlansCount,
  unlockedAchievementsCount,
  isCreating,
  onNewPlan,
  onOpenSavedPlans,
  onOpenAchievements,
  onOpenFeedback,
  onOpenAdmin,
  onOpenProfileModal,
  onLogin,
  onLogout,
  onOpenDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'plans' | 'achievements' | 'feedback' | 'profile'>('create');
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const [userProfile] = useUserProfile();

  const activePreset = AVATAR_PRESETS.find((p) => p.id === userProfile.avatarPresetId) || AVATAR_PRESETS[0];

  const handleTabClick = (tab: 'create' | 'plans' | 'achievements' | 'feedback' | 'profile') => {
    setActiveTab(tab);
    if (tab === 'create') {
      onNewPlan();
      setIsProfileSheetOpen(false);
    } else if (tab === 'plans') {
      onOpenSavedPlans();
      setIsProfileSheetOpen(false);
    } else if (tab === 'achievements') {
      onOpenAchievements();
      setIsProfileSheetOpen(false);
    } else if (tab === 'feedback') {
      onOpenFeedback();
      setIsProfileSheetOpen(false);
    } else if (tab === 'profile') {
      setIsProfileSheetOpen(!isProfileSheetOpen);
    }
  };

  return (
    <>
      {/* Profile & Settings Slide-Up Bottom Sheet */}
      {isProfileSheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setIsProfileSheetOpen(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          {/* Sheet Content */}
          <div className="relative z-10 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-250">
            {/* Handlebar */}
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Mi Cuenta y Configuración</span>
              </h3>
              <button
                onClick={() => setIsProfileSheetOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {userProfile.customAvatarUrl ? (
                  <img src={userProfile.customAvatarUrl} alt="User Avatar" className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/40" />
                ) : user?.photoURL ? (
                  <img src={user.photoURL} alt="User Google" className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/40" />
                ) : (
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-tr ${activePreset.gradient} text-white flex items-center justify-center font-bold text-lg shadow-sm`}>
                    {activePreset.emoji}
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {userProfile.displayName || user?.displayName || 'Estudiante Genius'}
                  </p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold truncate max-w-[150px]">
                    {userProfile.studyGoal || user?.email || activePreset.name}
                  </p>
                </div>
              </div>

              {user ? (
                <button
                  onClick={() => {
                    onLogout();
                    setIsProfileSheetOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 hover:bg-red-100 cursor-pointer"
                >
                  Salir
                </button>
              ) : (
                <button
                  onClick={() => {
                    onLogin();
                    setIsProfileSheetOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 cursor-pointer"
                >
                  Entrar
                </button>
              )}
            </div>

            {/* Quick Options List */}
            <div className="space-y-2 pt-1">
              {/* Personalize Avatar & Profile Button */}
              <button
                onClick={() => {
                  onOpenProfileModal();
                  setIsProfileSheetOpen(false);
                }}
                className="w-full p-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-between text-xs shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Palette className="w-4 h-4 text-blue-200" />
                  <span>Personalizar Avatar y Perfil</span>
                </div>
                <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full uppercase">
                  Cambiar
                </span>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                  <span>Modo de Pantalla</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  {isDark ? 'Oscuro' : 'Claro'}
                </span>
              </button>

              {/* Performance Dashboard Button */}
              {onOpenDashboard && (
                <button
                  onClick={() => {
                    onOpenDashboard();
                    setIsProfileSheetOpen(false);
                  }}
                  className="w-full p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer animate-pulse"
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Rendimiento Académico</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Ver
                  </span>
                </button>
              )}

              {/* Admin Logo Button */}
              {onOpenAdmin && (
                <button
                  onClick={() => {
                    onOpenAdmin();
                    setIsProfileSheetOpen(false);
                  }}
                  className="w-full p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80 flex items-center gap-2.5 text-xs font-semibold text-blue-800 dark:text-blue-300 hover:bg-blue-100 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Panel Admin Logo</span>
                </button>
              )}

              {/* PWA Install Button */}
              <div className="w-full pt-1">
                <PWAInstallButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED BOTTOM NAVIGATION BAR FOR SMARTPHONES */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 pb-safe shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-5 items-center justify-items-center">
          
          {/* TAB 1: CREAR / PLAN */}
          <button
            onClick={() => handleTabClick('create')}
            className={`relative flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
              activeTab === 'create'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'create' && (
              <div className="absolute -top-1 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300 animate-in fade-in zoom-in-75" />
            )}
            <div className={`p-1 rounded-lg transition-transform duration-150 ${activeTab === 'create' ? 'bg-blue-50 dark:bg-blue-950/80 scale-110' : ''}`}>
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] leading-tight mt-0.5">Crear</span>
          </button>

          {/* TAB 2: MIS PLANES */}
          <button
            onClick={() => handleTabClick('plans')}
            className={`relative flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
              activeTab === 'plans'
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'plans' && (
              <div className="absolute -top-1 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300 animate-in fade-in zoom-in-75" />
            )}
            <div className={`relative p-1 rounded-lg transition-transform duration-150 ${activeTab === 'plans' ? 'bg-blue-50 dark:bg-blue-950/80 scale-110' : ''}`}>
              <FolderKanban className="w-5 h-5" />
              {savedPlansCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-black ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {savedPlansCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight mt-0.5">Planes</span>
          </button>

          {/* TAB 3: LOGROS */}
          <button
            onClick={() => handleTabClick('achievements')}
            className={`relative flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
              activeTab === 'achievements'
                ? 'text-amber-600 dark:text-amber-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'achievements' && (
              <div className="absolute -top-1 w-8 h-1 bg-amber-500 rounded-full transition-all duration-300 animate-in fade-in zoom-in-75" />
            )}
            <div className={`relative p-1 rounded-lg transition-transform duration-150 ${activeTab === 'achievements' ? 'bg-amber-50 dark:bg-amber-950/80 scale-110' : ''}`}>
              <Trophy className="w-5 h-5 text-amber-500" />
              {unlockedAchievementsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] flex items-center justify-center font-black ring-2 ring-white dark:ring-slate-900">
                  {unlockedAchievementsCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight mt-0.5">Logros</span>
          </button>

          {/* TAB 4: SUGERENCIAS */}
          <button
            onClick={() => handleTabClick('feedback')}
            className={`relative flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
              activeTab === 'feedback'
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {activeTab === 'feedback' && (
              <div className="absolute -top-1 w-8 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-300 animate-in fade-in zoom-in-75" />
            )}
            <div className={`p-1 rounded-lg transition-transform duration-150 ${activeTab === 'feedback' ? 'bg-indigo-50 dark:bg-indigo-950/80 scale-110' : ''}`}>
              <MessageSquarePlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-[10px] leading-tight mt-0.5">Sugerencias</span>
          </button>

          {/* TAB 5: PERFIL / MAS */}
          <button
            onClick={() => handleTabClick('profile')}
            className={`relative flex flex-col items-center justify-center w-full py-1.5 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
              activeTab === 'profile' || isProfileSheetOpen
                ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 font-medium hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {(activeTab === 'profile' || isProfileSheetOpen) && (
              <div className="absolute -top-1 w-8 h-1 bg-blue-600 dark:bg-blue-400 rounded-full transition-all duration-300 animate-in fade-in zoom-in-75" />
            )}
            <div className={`relative p-0.5 rounded-lg transition-transform duration-150 ${activeTab === 'profile' || isProfileSheetOpen ? 'bg-blue-50 dark:bg-blue-950/80 scale-110' : ''}`}>
              {userProfile.customAvatarUrl ? (
                <img src={userProfile.customAvatarUrl} alt="Perfil" className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500" />
              ) : user?.photoURL ? (
                <img src={user.photoURL} alt="Perfil" className="w-5 h-5 rounded-full object-cover ring-1 ring-blue-500" />
              ) : (
                <span className="text-sm leading-none">{activePreset.emoji}</span>
              )}
            </div>
            <span className="text-[10px] leading-tight mt-0.5">Perfil</span>
          </button>

        </div>
      </nav>
    </>
  );
};
