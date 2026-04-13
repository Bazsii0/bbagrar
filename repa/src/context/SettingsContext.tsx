import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface SettingsType {
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  marketingEmails: boolean;
  notificationSounds: boolean;
  twoFactorAuth: boolean;
  biometricLogin: boolean;
  sessionTimeout: number;
  loginHistory: boolean;
  autoSave: boolean;
  compactView: boolean;
  showTips: boolean;
  telemetry: boolean;
}

interface SettingsContextType {
  settings: SettingsType;
  updateSetting: <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => void;
  resetSettings: () => void;
}

const defaultSettings: SettingsType = {
  language: 'hu',
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  emailNotifications: true,
  pushNotifications: false,
  desktopNotifications: true,
  marketingEmails: false,
  notificationSounds: true,
  twoFactorAuth: false,
  biometricLogin: false,
  sessionTimeout: 30,
  loginHistory: true,
  autoSave: true,
  compactView: false,
  showTips: true,
  telemetry: false
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<SettingsType>(() => {
    try {
      const savedSettings = localStorage.getItem('appSettings');
      return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    const root = document.documentElement;
    root.style.fontSize = 
      settings.fontSize === 'small' ? '14px' : 
      settings.fontSize === 'medium' ? '16px' : '18px';
    
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    if (settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
  }, [settings]);

  const updateSetting = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};