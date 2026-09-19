import { useState, useEffect } from 'react';

const LOGO_STORAGE_KEY = 'genius_custom_logo_data';

export function getCustomLogo(): string | null {
  try {
    return localStorage.getItem(LOGO_STORAGE_KEY);
  } catch (_) {
    return null;
  }
}

export function setCustomLogo(dataUrl: string): void {
  try {
    localStorage.setItem(LOGO_STORAGE_KEY, dataUrl);
    window.dispatchEvent(new Event('genius-logo-changed'));
  } catch (e) {
    console.error('Error saving custom logo to localStorage:', e);
  }
}

export function resetCustomLogo(): void {
  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    window.dispatchEvent(new Event('genius-logo-changed'));
  } catch (e) {
    console.error('Error resetting custom logo:', e);
  }
}

export function useCustomLogo(): string {
  const [logo, setLogo] = useState<string>(() => getCustomLogo() || '/genius_logo.svg');

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
