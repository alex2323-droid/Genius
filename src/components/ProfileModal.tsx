import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Sparkles, 
  Check, 
  Upload, 
  Image as ImageIcon, 
  Smile, 
  Target, 
  Award,
  RefreshCw,
  Camera
} from 'lucide-react';
import { 
  AVATAR_PRESETS, 
  useUserProfile, 
  type AvatarPreset, 
  type UserProfileData 
} from '../utils/avatarStorage.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const [profile, updateProfile] = useUserProfile();
  
  const [selectedPresetId, setSelectedPresetId] = useState<string>(profile.avatarPresetId);
  const [displayName, setDisplayName] = useState<string>(profile.displayName);
  const [studyGoal, setStudyGoal] = useState<string>(profile.studyGoal || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | undefined>(profile.customAvatarUrl);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedPresetId(profile.avatarPresetId);
      setDisplayName(profile.displayName);
      setStudyGoal(profile.studyGoal || '');
      setCustomAvatarUrl(profile.customAvatarUrl);
      setSavedSuccess(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const activePreset = AVATAR_PRESETS.find((p) => p.id === selectedPresetId) || AVATAR_PRESETS[0];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe pesar más de 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomImage = () => {
    setCustomAvatarUrl(undefined);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      avatarPresetId: selectedPresetId,
      displayName: displayName.trim() || 'Estudiante Genius',
      studyGoal: studyGoal.trim(),
      customAvatarUrl,
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Personalizar Perfil
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Elige tu avatar predeterminado o sube tu propia foto
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Avatar Preview Header */}
          <div className="flex flex-col items-center justify-center py-3 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/40 dark:to-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 relative">
            
            {/* Live Avatar Preview */}
            <div className="relative group">
              <div
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr ${
                  customAvatarUrl ? 'from-blue-600 to-indigo-600' : activePreset.gradient
                } flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-slate-800 overflow-hidden text-3xl sm:text-4xl transition-all duration-300 transform group-hover:scale-105`}
              >
                {customAvatarUrl ? (
                  <img src={customAvatarUrl} alt="Custom Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{activePreset.emoji}</span>
                )}
              </div>

              {/* Upload Badge Button */}
              <label className="absolute bottom-0 right-0 p-2 rounded-full bg-blue-600 text-white shadow-md hover:bg-blue-700 cursor-pointer transition-transform hover:scale-110 active:scale-95">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Selected Name & Preset Badge */}
            <div className="text-center mt-3">
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {displayName || 'Estudiante Genius'}
              </p>
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {customAvatarUrl ? 'Foto Personalizada' : activePreset.name}
              </p>
            </div>

            {customAvatarUrl && (
              <button
                type="button"
                onClick={handleClearCustomImage}
                className="mt-2 text-[10px] font-bold text-red-600 hover:underline flex items-center gap-1"
              >
                Restablecer a Avatares Predeterminados
              </button>
            )}
          </div>

          {/* Preset Avatar Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
              Avatares Predeterminados
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 sm:gap-2.5">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = !customAvatarUrl && selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setCustomAvatarUrl(undefined);
                    }}
                    className={`p-2 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer relative group ${
                      isSelected
                        ? `bg-blue-50 dark:bg-blue-950/60 border-blue-500 shadow-md ring-2 ring-blue-500/40 scale-105`
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr ${preset.gradient} text-white flex items-center justify-center text-lg sm:text-xl shadow-xs`}
                    >
                      <span>{preset.emoji}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                      {preset.name.split(' ')[0]}
                    </span>

                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-[8px] font-black">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre de Usuario
            </label>
            <input
              type="text"
              required
              maxLength={30}
              placeholder="Ej. Sofía, Carlos M."
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Study Goal Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Meta Principal de Estudio
            </label>
            <input
              type="text"
              maxLength={60}
              placeholder="Ej. Aprobar Anatomía, Dominar Programación..."
              value={studyGoal}
              onChange={(e) => setStudyGoal(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>¡Perfil Guardado!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Guardar Cambios de Perfil</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
