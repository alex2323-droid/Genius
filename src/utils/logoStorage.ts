import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase.ts';

const LOGO_STORAGE_KEY = 'genius_custom_logo_data';
const SETTING_PATH = 'settings/logo';

export function getCustomLogo(): string | null {
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

export function setCustomLogoLocal(dataUrl: string): void {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    window.dispatchEvent(new Event('genius-logo-changed'));
  } catch (e) {
    console.error('Error saving custom logo to localStorage:', e);
  }
}

export function resetCustomLogoLocal(): void {
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new Event('genius-logo-changed'));
  } catch (e) {
    console.error('Error resetting custom logo in localStorage:', e);
  }
}

// Save to Firestore (only allowed for admin user 'alexparababi23@gmail.com')
export async function setCustomLogo(dataUrl: string): Promise<void> {
  // Update local immediately for responsive feedback
  setCustomLogoLocal(dataUrl);

  try {
    const docRef = doc(db, 'settings', 'logo');
    await setDoc(docRef, {
      id: 'logo',
      logoUrl: dataUrl,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || 'admin',
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, SETTING_PATH);
  }
}

// Reset/delete in Firestore (only allowed for admin user 'alexparababi23@gmail.com')
export async function resetCustomLogo(): Promise<void> {
  resetCustomLogoLocal();

  try {
    const docRef = doc(db, 'settings', 'logo');
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, SETTING_PATH);
  }
}

export function useCustomLogo(): string {
  const [logo, setLogo] = useState<string>(() => getCustomLogo() || '/genius_logo.svg');

  // Real-time Firestore Sync
  useEffect(() => {
    const docRef = doc(db, 'settings', 'logo');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && typeof data.logoUrl === 'string') {
          setCustomLogoLocal(data.logoUrl);
        }
      } else {
        resetCustomLogoLocal();
      }
    }, (error) => {
      // Gracefully handle permission errors for unauthenticated/guest read attempts if any
      console.info('Settings real-time sync subscription:', error.message);
    });

    return () => unsubscribe();
  }, []);

  // Listen to local change events
  useEffect(() => {
    const handleLogoChange = () => {
      setLogo(getCustomLogo() || '/genius_logo.svg');
    };

    window.addEventListener('genius-logo-changed', handleLogoChange);
    return () => {
      window.removeEventListener('genius-logo-changed', handleLogoChange);
    };
  }, []);

  return logo;
}
