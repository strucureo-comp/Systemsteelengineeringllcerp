'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPDFSettings, savePDFSettings, PDFSettings, DEFAULT_PDF_SETTINGS } from './pdf-settings';

const STORAGE_KEY = 'erp_pdf_settings';

interface SettingsContextType {
  settings: PDFSettings;
  updateSettings: (newSettings: PDFSettings) => void;
  refreshSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PDFSettings>(DEFAULT_PDF_SETTINGS);

  const refreshSettings = useCallback(() => {
    setSettings(getPDFSettings());
  }, []);

  useEffect(() => {
    refreshSettings();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        refreshSettings();
      }
    };

    const handleCustomUpdate = () => {
      refreshSettings();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('erp_settings_updated', handleCustomUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('erp_settings_updated', handleCustomUpdate);
    };
  }, [refreshSettings]);

  const updateSettings = (newSettings: PDFSettings) => {
    savePDFSettings(newSettings);
    setSettings(newSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    // Fallback for components used outside Provider or for simpler access
    return {
      settings: typeof window !== 'undefined' ? getPDFSettings() : DEFAULT_PDF_SETTINGS,
      updateSettings: savePDFSettings,
      refreshSettings: () => {}
    };
  }
  return context;
}
