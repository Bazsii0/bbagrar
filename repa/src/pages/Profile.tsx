// pages/Profile.tsx
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { User, Mail, Phone, MapPin, Save, Camera, Key, Bell, X } from 'lucide-react';

interface ProfileData {
  username: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  avatar: string | null;
}

const Profile = () => {
  const { isDarkMode } = useTheme();
  const { user, token } = useAuth();
  const { success, error: showError } = useNotification();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications'>('profile');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    avatar: null,
  });

  // Helper function to get token from localStorage directly (biztonsági tartalék)
  const getToken = () => {
    return token || localStorage.getItem('bbagrar_token');
  };

  // Profil adatok betöltése API-ból
  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const currentToken = getToken();
      
      if (!currentToken) {
        console.error('No token found');
        setIsLoading(false);
        return;
      }

      console.log('Loading profile with token:', currentToken);
      
      const response = await fetch('/api/profile', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Accept': 'application/json',
        },
      });
      
      console.log('Profile response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profile data loaded:', data);
        setProfileData({
          username: data.profile.username || '',
          email: data.profile.email || '',
          phone: data.profile.phone || '',
          location: data.profile.location || '',
          bio: data.profile.bio || '',
          avatar: data.profile.avatar || null,
        });
      } else {
        const errorData = await response.json();
        console.error('Failed to load profile:', errorData);
        // Ha nincs adat, használjuk a user adatait
        setProfileData({
          username: user?.username || '',
          email: user?.email || '',
          phone: '',
          location: '',
          bio: '',
          avatar: null,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Hiba', 'Hiba történt a profil betöltése során');
    } finally {
      setIsLoading(false);
    }
  };

  // Komponens betöltésekor és token változásakor betöltjük az adatokat
  useEffect(() => {
    if (token || localStorage.getItem('bbagrar_token')) {
      loadProfileData();
    }
  }, [token]);

  // Profil mentése API-ba
  const handleSave = async (): Promise<void> => {
    try {
      const currentToken = getToken();
      
      if (!currentToken) {
        showError('Hiba', 'Nincs bejelentkezési token!');
        return;
      }
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
        body: JSON.stringify(profileData),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Profil mentve:', data);
        setIsEditing(false);
        success('Siker', 'Profil sikeresen mentve!');
      } else {
        const errorData = await response.json();
        showError('Hiba', errorData.error);
      }
    } catch (error) {
      console.error('Mentési hiba:', error);
      showError('Hiba', 'Hiba történt a mentés során');
    }
  };

  // Profilkép feltöltés API-ba
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        showError('Hiba', 'Csak képfájlokat lehet feltölteni!');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        showError('Hiba', 'A fájl mérete nem haladhatja meg az 5MB-t!');
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);
      
      try {
        const currentToken = getToken();
        
        const response = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
          },
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfileData({
            ...profileData,
            avatar: data.avatarUrl,
          });
          success('Siker', 'Profilkép sikeresen feltöltve!');
        } else {
          const errorData = await response.json();
          showError('Hiba', errorData.error);
        }
      } catch (error) {
        console.error('Feltöltési hiba:', error);
        showError('Hiba', 'Hiba történt a feltöltés során');
      }
    }
  };

  // Profilkép eltávolítása
  const handleRemoveAvatar = async (): Promise<void> => {
    try {
      const currentToken = getToken();
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
        body: JSON.stringify({
          ...profileData,
          avatar: null,
        }),
      });
      
      if (response.ok) {
        setProfileData({
          ...profileData,
          avatar: null,
        });
        success('Siker', 'Profilkép eltávolítva!');
      } else {
        showError('Hiba', 'Hiba történt a profilkép eltávolítása során');
      }
    } catch (error) {
      console.error('Eltávolítási hiba:', error);
      showError('Hiba', 'Hiba történt a profilkép eltávolítása során');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Jelszó módosítás
  const handlePasswordChange = async () => {
    const currentPassword = prompt('Jelenlegi jelszó:');
    if (!currentPassword) return;
    
    const newPassword = prompt('Új jelszó (minimum 6 karakter):');
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      showError('Hiba', 'Az új jelszónak legalább 6 karakter hosszúnak kell lennie!');
      return;
    }
    
    try {
      const currentToken = getToken();
      
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      if (response.ok) {
        success('Siker', 'Jelszó sikeresen módosítva!');
      } else {
        const errorData = await response.json();
        showError('Hiba', errorData.error);
      }
    } catch (error) {
      console.error('Jelszó módosítási hiba:', error);
      showError('Hiba', 'Hiba történt a jelszó módosítása során');
    }
  };

  // Betűjel a névből
  const getInitials = (): string => {
    return profileData.username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className={`max-w-4xl mx-auto ${isDarkMode ? 'text-gray-200' : ''}`}>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4">Adatok betöltése...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${isDarkMode ? 'text-gray-200' : ''}`}>
      {/* Fejléc */}
      <div className="flex justify-between items-center mb-8">
        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Profil beállítások</h1>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Szerkesztés
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setIsEditing(false);
                loadProfileData();
              }}
              className={`${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-500 hover:bg-gray-600'} text-white px-6 py-2 rounded-lg transition-colors`}
            >
              Mégse
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Mentés
            </button>
          </div>
        )}
      </div>

      {/* Tabok */}
      <div className={`flex gap-1 mb-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'profile'
              ? isDarkMode 
                ? 'text-green-400 border-b-2 border-green-400' 
                : 'text-green-600 border-b-2 border-green-600'
              : isDarkMode 
                ? 'text-gray-400 hover:text-gray-300' 
                : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Profil adatok
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'security'
              ? isDarkMode 
                ? 'text-green-400 border-b-2 border-green-400' 
                : 'text-green-600 border-b-2 border-green-600'
              : isDarkMode 
                ? 'text-gray-400 hover:text-gray-300' 
                : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Biztonság
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === 'notifications'
              ? isDarkMode 
                ? 'text-green-400 border-b-2 border-green-400' 
                : 'text-green-600 border-b-2 border-green-600'
              : isDarkMode 
                ? 'text-gray-400 hover:text-gray-300' 
                : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Értesítések
        </button>
      </div>

      {/* Profil adatok tab */}
      {activeTab === 'profile' && (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Bal oldal - Profilkép */}
            <div className="md:w-1/3">
              <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6 text-center`}>
                <div className="relative inline-block">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-600 to-green-700 flex items-center justify-center text-white font-bold text-4xl shadow-lg mx-auto">
                    {profileData.avatar ? (
                      <img src={profileData.avatar} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <span>{getInitials()}</span>
                    )}
                  </div>
                  
                  {isEditing && (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className={`absolute bottom-0 right-0 ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} rounded-full p-2 shadow-lg transition-colors`}
                      >
                        <Camera size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                      </button>
                      {profileData.avatar && (
                        <button
                          onClick={handleRemoveAvatar}
                          className={`absolute bottom-0 left-0 ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} rounded-full p-2 shadow-lg transition-colors`}
                        >
                          <X size={18} className="text-white" />
                        </button>
                      )}
                    </>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mt-4`}>{profileData.username}</h2>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>{profileData.bio || 'Nincs bemutatkozás'}</p>
                
                {isEditing && (
                  <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Kattints a kamera ikonra a profilkép feltöltéséhez<br />
                    (JPG, PNG, GIF - max 5MB)
                  </p>
                )}
              </div>
            </div>

            {/* Jobb oldal - Adatok */}
            <div className="md:w-2/3 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className={`flex items-start gap-3 p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <User className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`} size={20} />
                  <div className="flex-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Teljes név</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{profileData.username}</p>
                    )}
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <Mail className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`} size={20} />
                  <div className="flex-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email cím</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{profileData.email}</p>
                    )}
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <Phone className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`} size={20} />
                  <div className="flex-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Telefonszám</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{profileData.phone || 'Nincs megadva'}</p>
                    )}
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <MapPin className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`} size={20} />
                  <div className="flex-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Helyszín</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{profileData.location || 'Nincs megadva'}</p>
                    )}
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-3 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
                  <User className={`${isDarkMode ? 'text-green-400' : 'text-green-600'} mt-1`} size={20} />
                  <div className="flex-1">
                    <label className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bemutatkozás</label>
                    {isEditing ? (
                      <textarea
                        value={profileData.bio}
                        onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                        rows={3}
                        className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          isDarkMode 
                            ? 'bg-gray-600 border-gray-500 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    ) : (
                      <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{profileData.bio || 'Nincs bemutatkozás'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Biztonság tab */}
      {activeTab === 'security' && (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
          <div className="space-y-6">
            <div className={`flex items-center gap-3 p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
              <Key className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`} size={24} />
              <div className="flex-1">
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Jelszó módosítása</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Változtasd meg a jelszavadat</p>
              </div>
              <button 
                onClick={handlePasswordChange}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Módosítás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Értesítések tab */}
      {activeTab === 'notifications' && (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8`}>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
              <div className="flex items-center gap-3">
                <Bell className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`} size={20} />
                <div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Email értesítések</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kapj értesítést új üzenetekről</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            <div className={`flex items-center justify-between p-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg`}>
              <div className="flex items-center gap-3">
                <Bell className={`${isDarkMode ? 'text-green-400' : 'text-green-600'}`} size={20} />
                <div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Rendszer értesítések</h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Frissítések és karbantartások</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;