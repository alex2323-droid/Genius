import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-500/95 dark:bg-amber-600/95 backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-white shadow-xl shadow-amber-500/20 border border-amber-400/30 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
      <div>
        <span className="font-bold">Modo Sin Conexión</span>
        <span className="hidden sm:inline text-amber-100 font-normal ml-1">
          — Tus planes, tareas y sesiones Pomodoro funcionan 100% offline.
        </span>
      </div>
    </div>
  );
};
