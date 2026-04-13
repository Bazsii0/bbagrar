// pages/Settings.tsx
import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  Moon, 
  Sun, 
  Eye, 
  Save,
  RotateCcw,
  Monitor,
  MessageSquare,
  Database,
  Palette,
  ChevronRight,
  Download,
  Check
} from 'lucide-react';

// Ideiglenes beállítások típusa
interface TempSettings {
  theme: 'light' | 'dark';
  fontSize: 'small' | 'medium' | 'large';
  reducedMotion: boolean;
  highContrast: boolean;
  autoSave: boolean;
  showTips: boolean;
}

// Alapértelmezett beállítások
const DEFAULT_SETTINGS: TempSettings = {
  theme: 'light',
  fontSize: 'medium',
  reducedMotion: false,
  highContrast: false,
  autoSave: true,
  showTips: true,
};

const Settings = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { settings, updateSetting } = useSettings(); // resetSettings eltávolítva
  const { user } = useAuth();
  const { success, error } = useNotification();
  const [activeSection, setActiveSection] = useState<string>('megjelenes');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  // Ideiglenes beállítások (amíg nem mentünk)
  const [tempSettings, setTempSettings] = useState<TempSettings>({
    theme: isDarkMode ? 'dark' : 'light',
    fontSize: settings.fontSize,
    reducedMotion: settings.reducedMotion,
    highContrast: settings.highContrast,
    autoSave: settings.autoSave,
    showTips: settings.showTips,
  });

  // Csak a vizuális megjelenítéshez alkalmazzuk a beállításokat, de nem mentjük el
  useEffect(() => {
    // Reduced motion
    if (tempSettings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    // High contrast
    if (tempSettings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    // Font size
    document.documentElement.classList.remove('text-small', 'text-medium', 'text-large');
    document.documentElement.classList.add(`text-${tempSettings.fontSize}`);
    
    // Téma alkalmazása a megjelenítéshez (csak vizuálisan)
    if (tempSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [tempSettings.reducedMotion, tempSettings.highContrast, tempSettings.fontSize, tempSettings.theme]);

  // Amikor betöltődnek a valódi beállítások, frissítjük a temp-et is
  useEffect(() => {
    setTempSettings({
      theme: isDarkMode ? 'dark' : 'light',
      fontSize: settings.fontSize,
      reducedMotion: settings.reducedMotion,
      highContrast: settings.highContrast,
      autoSave: settings.autoSave,
      showTips: settings.showTips,
    });
  }, [settings, isDarkMode]);

  const handleTempUpdate = (key: keyof TempSettings, value: any) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Téma frissítése a contextben
      if (tempSettings.theme === 'dark' && !isDarkMode) {
        toggleTheme();
      } else if (tempSettings.theme === 'light' && isDarkMode) {
        toggleTheme();
      }
      
      // Elmentjük az összes többi ideiglenes beállítást
      Object.entries(tempSettings).forEach(([key, value]) => {
        if (key !== 'theme') {
          updateSetting(key as any, value);
        }
      });
      
      success('Beállítások mentve', 'Az összes beállítás sikeresen elmentve!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error saving settings:', err);
      error('Hiba', 'Nem sikerült elmenteni a beállításokat');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Biztosan visszaállítod az alapértelmezett beállításokat?')) {
      // Csak a temp beállításokat állítjuk vissza
      setTempSettings({ ...DEFAULT_SETTINGS });
    }
  };

  const sections = [
    { id: 'megjelenes', icon: Palette, label: 'Megjelenés' },
    { id: 'egyeb', icon: Database, label: 'Egyéb beállítások' }
  ];

  return (
    <div className={`max-w-6xl mx-auto settings-preview`}>
      {/* Fejléc */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Beállítások</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {user ? `${user.username} fiókjának beállításai` : 'Testreszabhatod az alkalmazás működését'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <RotateCcw size={18} />
            Alaphelyzet
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors flex items-center gap-2 relative"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Mentés...
              </>
            ) : saveSuccess ? (
              <>
                <Check size={18} />
                Elmentve
              </>
            ) : (
              <>
                <Save size={18} />
                Mentés
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Bal oldali navigáció */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden sticky top-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                    activeSection === section.id
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-l-4 border-green-600'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={20} />
                  <span className="flex-1 text-left">{section.label}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Jobb oldali tartalom */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Megjelenés szekció */}
          {activeSection === 'megjelenes' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Megjelenés</h2>
              
              {/* Téma választó */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Palette className="text-green-600" size={20} />
                  <h3 className="font-medium text-gray-800 dark:text-white">Téma</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleTempUpdate('theme', 'light')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      tempSettings.theme === 'light' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <Sun size={24} className={tempSettings.theme === 'light' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Világos</span>
                    {tempSettings.theme === 'light' && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleTempUpdate('theme', 'dark')}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      tempSettings.theme === 'dark' 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <Moon size={24} className={tempSettings.theme === 'dark' ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Sötét</span>
                    {tempSettings.theme === 'dark' && (
                      <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => {
                      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                      handleTempUpdate('theme', systemPrefersDark ? 'dark' : 'light');
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      tempSettings.theme === (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                  >
                    <Monitor size={24} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Rendszer</span>
                  </button>
                </div>
              </div>

              {/* Betűméret */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Eye className="text-green-600" size={20} />
                  <h3 className="font-medium text-gray-800 dark:text-white">Betűméret</h3>
                </div>
                <div className="flex gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleTempUpdate('fontSize', size)}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all ${
                        tempSettings.fontSize === size
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-300'
                      }`}
                    >
                      {size === 'small' && 'Kicsi'}
                      {size === 'medium' && 'Közepes'}
                      {size === 'large' && 'Nagy'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Egyéb megjelenés beállítások */}
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">Csökkentett mozgás</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.reducedMotion}
                    onChange={(e) => handleTempUpdate('reducedMotion', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">Magas kontraszt</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.highContrast}
                    onChange={(e) => handleTempUpdate('highContrast', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </label>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                ⚠️ A változtatások csak mentés után lépnek érvénybe!
              </div>
            </div>
          )}

          {/* Egyéb beállítások */}
          {activeSection === 'egyeb' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Egyéb beállítások</h2>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Save size={18} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">Automatikus mentés</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Változások automatikus mentése</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.autoSave}
                    onChange={(e) => handleTempUpdate('autoSave', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <span className="text-gray-700 dark:text-gray-300">Tippek megjelenítése</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Hasznos tippek az alkalmazásban</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempSettings.showTips}
                    onChange={(e) => handleTempUpdate('showTips', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                </label>

                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <h3 className="font-medium text-gray-800 dark:text-white mb-3">Adatok kezelése</h3>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg flex items-center gap-2">
                      <Download size={16} />
                      Összes adat exportálása
                    </button>
                    <button className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex items-center gap-2">
                      <Database size={16} />
                      Fiók törlése
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                ⚠️ A változtatások csak mentés után lépnek érvénybe!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;