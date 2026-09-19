import { useState, useEffect } from 'react';

export interface AvatarPreset {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  borderColor: string;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'grad', name: 'Sabio Graduado', emoji: '🎓', gradient: 'from-blue-500 to-indigo-600', borderColor: 'border-blue-500' },
  { id: 'owl', name: 'Búho Nocturno', emoji: '🦉', gradient: 'from-indigo-600 to-purple-600', borderColor: 'border-indigo-500' },
  { id: 'rocket', name: 'Estudiante Alfa', emoji: '🚀', gradient: 'from-cyan-500 to-blue-600', borderColor: 'border-cyan-500' },
  { id: 'fox', name: 'Zorro Enfocado', emoji: '🦊', gradient: 'from-amber-500 to-orange-600', borderColor: 'border-amber-500' },
  { id: 'cat', name: 'Gato Zen', emoji: '🐱', gradient: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-500' },
  { id: 'zap', name: 'Relámpago', emoji: '⚡', gradient: 'from-yellow-400 to-amber-600', borderColor: 'border-yellow-400' },
  { id: 'bot', name: 'Cyborg IA', emoji: '🤖', gradient: 'from-violet-600 to-fuchsia-600', borderColor: 'border-violet-500' },
  { id: 'gamer', name: 'Pixel Gamer', emoji: '🎮', gradient: 'from-rose-500 to-pink-600', borderColor: 'border-rose-500' },
  { id: 'coffee', name: 'Café & Apuntes', emoji: '☕', gradient: 'from-amber-700 to-yellow-800', borderColor: 'border-amber-700' },
  { id: 'dragon', name: 'Dragón Master', emoji: '🐉', gradient: 'from-red-600 to-orange-600', borderColor: 'border-red-500' },
  { id: 'artist', name: 'Creador Mente', emoji: '🎨', gradient: 'from-pink-500 to-purple-600', borderColor: 'border-pink-500' },
  { id: 'unicorn', name: 'Leyenda Genius', emoji: '🦄', gradient: 'from-indigo-500 via-purple-500 to-pink-500', borderColor: 'border-purple-500' },
];

export interface UserProfileData {
  avatarPresetId: string;
  customAvatarUrl?: string;
  displayName: string;
  studyGoal?: string;
  levelTitle?: string;
}

const PROFILE_STORAGE_KEY = 'genius_user_profile_v1';

export const DEFAULT_PROFILE: UserProfileData = {
  avatarPresetId: 'grad',
  displayName: 'Estudiante Genius',
  studyGoal: 'Aprobar mis exámenes con éxito',
  levelTitle: 'Nivel 1 • Aprendiz',
};

export function getUserProfile(): UserProfileData {
  try {
    const data = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (data) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
    }
  } catch (_) {}
  return DEFAULT_PROFILE;
}

export function saveUserProfile(profile: Partial<UserProfileData>): UserProfileData {
  try {
    const current = getUserProfile();
    const updated = { ...current, ...profile };
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('genius-profile-changed'));
    return updated;
  } catch (e) {
    console.error('Error saving profile:', e);
    return DEFAULT_PROFILE;
  }
}

export function useUserProfile(): [UserProfileData, (profile: Partial<UserProfileData>) => void] {
  const [profile, setProfile] = useState<UserProfileData>(getUserProfile);

  useEffect(() => {
    const handleProfileChange = () => {
      setProfile(getUserProfile());
    };

    window.addEventListener('genius-profile-changed', handleProfileChange);
    return () => {
      window.removeEventListener('genius-profile-changed', handleProfileChange);
    };
  }, []);

  const updateProfile = (updated: Partial<UserProfileData>) => {
    const newProfile = saveUserProfile(updated);
    setProfile(newProfile);
  };

  return [profile, updateProfile];
}
