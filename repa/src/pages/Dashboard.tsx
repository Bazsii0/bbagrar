// pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Beef, DollarSign, Calendar, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { getAnimalCount, getBalance } from '../db/operations';
import { getEventsByDate, getUpcomingEvents, CalendarEventWithAnimal } from '../db/calendaroperations';
import { useTheme } from '../context/ThemeContext';

interface DashboardStats {
  animalCount: number;
  balance: number;
  todayEvents: CalendarEventWithAnimal[];
  tomorrowEvents: CalendarEventWithAnimal[];
  upcomingCount: number;
}

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    animalCount: 0,
    balance: 0,
    todayEvents: [],
    tomorrowEvents: [],
    upcomingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [animalCount, balance] = await Promise.all([
        getAnimalCount(),
        getBalance()
      ]);

      const today = new Date().toISOString().split('T')[0];
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const [todayEvents, tomorrowEvents, upcoming] = await Promise.all([
        getEventsByDate(today),
        getEventsByDate(tomorrowStr),
        getUpcomingEvents(7)
      ]);

      setStats({
        animalCount: Number(animalCount),
        balance: Number(balance),
        todayEvents,
        tomorrowEvents,
        upcomingCount: upcoming.length,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const getPriorityColor = (priority: string) => {
    if (isDarkMode) {
      switch (priority) {
        case 'urgent': return 'bg-red-900/30 text-red-300 border-red-700';
        case 'high': return 'bg-orange-900/30 text-orange-300 border-orange-700';
        case 'medium': return 'bg-yellow-900/30 text-yellow-300 border-yellow-700';
        case 'low': return 'bg-green-900/30 text-green-300 border-green-700';
        default: return 'bg-gray-800 text-gray-300 border-gray-700';
      }
    } else {
      switch (priority) {
        case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
        case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
        case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'low': return 'bg-green-100 text-green-700 border-green-300';
        default: return 'bg-gray-100 text-gray-700 border-gray-300';
      }
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋';
      case 'appointment': return '📅';
      case 'feeding': return '🥕';
      case 'vet': return '🏥';
      case 'harvest': return '🌾';
      default: return '📌';
    }
  };

  const getStatCardColor = () => {
    return isDarkMode 
      ? 'bg-green-900/30 text-green-400' 
      : 'bg-green-100 text-green-700';
  };

  const statCards = [
    {
      icon: Beef,
      label: 'Állatlétszám',
      value: stats.animalCount,
      color: getStatCardColor(),
    },
    {
      icon: DollarSign,
      label: 'Pénzügyi egyenleg',
      value: `${stats.balance.toLocaleString('hu-HU')} Ft`,
      color: getStatCardColor(),
    },
    {
      icon: Calendar,
      label: 'Közelgő események',
      value: stats.upcomingCount,
      color: getStatCardColor(),
    },
    {
      icon: TrendingUp,
      label: 'Mai teendők',
      value: stats.todayEvents.length,
      color: getStatCardColor(),
    },
  ];

  const renderEvents = (events: CalendarEventWithAnimal[]) => {
    if (events.length === 0) {
      return (
        <div className={`text-center py-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} rounded-lg`}>
          <AlertCircle className={`mx-auto ${isDarkMode ? 'text-gray-600' : 'text-gray-400'} mb-2`} size={24} />
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Nincs esemény</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {events.slice(0, 3).map(event => (
          <div
            key={event.id}
            className={`p-3 rounded-lg border-l-4 ${getPriorityColor(event.priority)}`}
            style={{ borderLeftColor: event.color || undefined }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getEventIcon(event.event_type)}</span>
                  <h4 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{event.title}</h4>
                </div>
                <div className={`flex items-center gap-3 mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {event.event_time && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatTime(event.event_time)}
                    </span>
                  )}
                  {event.animal_name && (
                    <span className={`${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-white bg-opacity-50'} px-2 py-0.5 rounded-full`}>
                      {event.animal_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {events.length > 3 && (
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-center mt-2`}>
            +{events.length - 3} további esemény
          </p>
        )}
      </div>
    );
  };

  return (
    <div>
      <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-8`}>
        Dashboard
      </h1>

      {/* Statisztika kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={index} 
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow ${isDarkMode ? 'hover:bg-gray-700' : 'hover:shadow-lg'} transition-all p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon size={24} />
                </div>
              </div>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-1`}>{card.label}</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {loading ? (
                  <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Betöltés...</span>
                ) : (
                  card.value
                )}
              </p>
            </div>
          );
        })}
      </div>

      {/* Események grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Mai események */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Mai események
            </h2>
            <span className={`${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'} px-3 py-1 rounded-full text-sm font-medium`}>
              {stats.todayEvents.length} db
            </span>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className={`inline-block animate-spin rounded-full h-8 w-8 border-4 ${isDarkMode ? 'border-green-400 border-t-transparent' : 'border-green-500 border-t-transparent'}`}></div>
            </div>
          ) : (
            renderEvents(stats.todayEvents)
          )}
        </div>

        {/* Holnapi események */}
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Holnapi események
            </h2>
            <span className={`${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'} px-3 py-1 rounded-full text-sm font-medium`}>
              {stats.tomorrowEvents.length} db
            </span>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className={`inline-block animate-spin rounded-full h-8 w-8 border-4 ${isDarkMode ? 'border-green-400 border-t-transparent' : 'border-green-500 border-t-transparent'}`}></div>
            </div>
          ) : (
            renderEvents(stats.tomorrowEvents)
          )}
        </div>
      </div>

      {/* Gyors műveletek és további infók */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Legutóbbi tevékenységek
          </h2>
          <div className="space-y-3">
            {stats.todayEvents.length > 0 ? (
              stats.todayEvents.slice(0, 3).map(event => (
                <div 
                  key={event.id} 
                  className={`flex items-center gap-3 p-2 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} rounded-lg transition-colors`}
                >
                  <div className={`w-8 h-8 ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
                    <span className="text-lg">{getEventIcon(event.event_type)}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{event.title}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Ma {event.event_time ? formatTime(event.event_time) : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Nincsenek legutóbbi tevékenységek</p>
            )}
          </div>
        </div>

        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>
            Gyors műveletek
          </h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/animals')}
              className={`w-full ${isDarkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded-lg transition-colors`}
            >
              Új állat hozzáadása
            </button>
            <button 
              onClick={() => navigate('/lands')}
              className={`w-full ${isDarkMode ? 'bg-emerald-700 hover:bg-emerald-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 rounded-lg transition-colors`}
            >
              Új föld rögzítése
            </button>
            <button 
              onClick={() => navigate('/budget')}
              className={`w-full ${isDarkMode ? 'bg-teal-700 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'} text-white px-4 py-2 rounded-lg transition-colors`}
            >
              Új költségvetés rögzítése
            </button>
            <button 
              onClick={() => navigate('/calendar')}
              className={`w-full ${isDarkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg transition-colors`}
            >
              Naptár megnyitása
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;