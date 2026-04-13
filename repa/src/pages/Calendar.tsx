// pages/Calendar.tsx
import { useEffect, useState } from 'react';
import { 
  Plus, X, Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, Trash2, Edit2, CheckCircle
} from 'lucide-react';
import { getEvents, addEvent, updateEvent, deleteEvent, updateEventStatus, getEventsByDate, getUpcomingEvents, CalendarEvent, CalendarEventWithAnimal } from '../db/calendaroperations';
import { getAnimals } from '../db/operations';
import { useTheme } from '../context/ThemeContext';

// Segédfüggvény a dátum formázásához (időzóna probléma elkerülése)
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Safe date parsing helper
const parseDateSafe = (dateString?: string): Date | null => {
  if (!dateString) return null;
  try {
    // Handle YYYY-MM-DD format directly
    if (dateString.length === 10 && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }
    // Handle ISO format (2026-03-29T00:00:00Z)
    if (dateString.includes('T')) {
      const dateOnly = dateString.split('T')[0];
      const [year, month, day] = dateOnly.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return null;
  } catch (error) {
    console.error('Parse date error:', error, 'input:', dateString);
    return null;
  }
};

// Animal interface definiálása
interface Animal {
  id: number;
  name?: string;
  species: string;
  breed?: string;
  identifier: string;
  birth_date?: string;
  stable?: string;
  notes?: string;
}

// Hónapok nevei
const MONTHS = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
];

// Napok nevei
const WEEKDAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];
const WEEKDAYS_FULL = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

// Esemény típusok és színeik
const EVENT_TYPES = [
  { value: 'task', label: 'Feladat', icon: '📋', color: 'from-blue-500 to-cyan-500', bgColor: 'bg-blue-100', darkBgColor: 'bg-blue-900/30', textColor: 'text-blue-800', darkTextColor: 'text-blue-300', borderColor: 'border-blue-300', darkBorderColor: 'border-blue-700' },
  { value: 'appointment', label: 'Időpont', icon: '📅', color: 'from-purple-500 to-indigo-500', bgColor: 'bg-purple-100', darkBgColor: 'bg-purple-900/30', textColor: 'text-purple-800', darkTextColor: 'text-purple-300', borderColor: 'border-purple-300', darkBorderColor: 'border-purple-700' },
  { value: 'feeding', label: 'Etetés', icon: '🥕', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-100', darkBgColor: 'bg-green-900/30', textColor: 'text-green-800', darkTextColor: 'text-green-300', borderColor: 'border-green-300', darkBorderColor: 'border-green-700' },
  { value: 'vet', label: 'Állatorvos', icon: '🏥', color: 'from-red-500 to-rose-500', bgColor: 'bg-red-100', darkBgColor: 'bg-red-900/30', textColor: 'text-red-800', darkTextColor: 'text-red-300', borderColor: 'border-red-300', darkBorderColor: 'border-red-700' },
  { value: 'harvest', label: 'Betakarítás', icon: '🌾', color: 'from-yellow-500 to-amber-500', bgColor: 'bg-yellow-100', darkBgColor: 'bg-yellow-900/30', textColor: 'text-yellow-800', darkTextColor: 'text-yellow-300', borderColor: 'border-yellow-300', darkBorderColor: 'border-yellow-700' },
  { value: 'other', label: 'Egyéb', icon: '📌', color: 'from-gray-500 to-slate-500', bgColor: 'bg-gray-100', darkBgColor: 'bg-gray-800', textColor: 'text-gray-800', darkTextColor: 'text-gray-300', borderColor: 'border-gray-300', darkBorderColor: 'border-gray-700' }
];

// Prioritások
const PRIORITIES = [
  { value: 'low', label: 'Alacsony', icon: '⚪', color: 'bg-gray-100 text-gray-700', darkColor: 'bg-gray-800 text-gray-300' },
  { value: 'medium', label: 'Közepes', icon: '🟡', color: 'bg-yellow-100 text-yellow-700', darkColor: 'bg-yellow-900/30 text-yellow-300' },
  { value: 'high', label: 'Magas', icon: '🟠', color: 'bg-orange-100 text-orange-700', darkColor: 'bg-orange-900/30 text-orange-300' },
  { value: 'urgent', label: 'Sürgős', icon: '🔴', color: 'bg-red-100 text-red-700', darkColor: 'bg-red-900/30 text-red-300' }
];

// Ismétlődés típusok
const RECURRING_TYPES = [
  { value: 'none', label: 'Nem ismétlődő' },
  { value: 'daily', label: 'Naponta' },
  { value: 'weekly', label: 'Hetente' },
  { value: 'monthly', label: 'Havonta' },
  { value: 'yearly', label: 'Évente' }
];

const Calendar = () => {
  const { isDarkMode } = useTheme();
  
  // Dátum állapotok
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    formatDate(new Date())
  );
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  
  // Események állapotok
  const [events, setEvents] = useState<CalendarEventWithAnimal[]>([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEventWithAnimal[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventWithAnimal[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  
  // UI állapotok
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventWithAnimal | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Űrlap állapot - event_date MINDIG az aktuális selectedDate
  const [formData, setFormData] = useState<Partial<CalendarEvent>>({
    title: '',
    description: '',
    event_date: formatDate(new Date()),
    event_time: '',
    end_time: '',
    event_type: 'task',
    priority: 'medium',
    status: 'pending',
    location: '',
    animal_id: undefined,
    recurring_type: 'none',
    recurring_interval: 1,
    recurring_end_date: '',
    reminder_before: 60,
    color: ''
  });

  // Adatok betöltése
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (viewMode === 'month') {
      loadMonthEvents();
    } else if (viewMode === 'week') {
      loadWeekEvents();
    } else {
      loadDayEvents();
    }
  }, [currentDate, viewMode]);

  useEffect(() => {
    if (selectedDate) {
      loadSelectedDateEvents();
    }
  }, [selectedDate, events]);

  const loadInitialData = async () => {
    try {
      const animalsData = await getAnimals();
      setAnimals(animalsData as Animal[]);
      
      const upcoming = await getUpcomingEvents(30);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadMonthEvents = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const startDate = formatDate(new Date(year, month, 1));
    const endDate = formatDate(new Date(year, month + 1, 0));
    
    try {
      console.log('Loading month events:', { startDate, endDate });
      const monthEvents = await getEvents(startDate, endDate);
      console.log('Month events loaded:', monthEvents.length);
      setEvents(monthEvents);
    } catch (error) {
      console.error('Error loading month events:', error);
    }
  };

  const loadWeekEvents = async () => {
    const weekStart = getWeekStart(currentDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startDate = formatDate(weekStart);
    const endDate = formatDate(weekEnd);
    
    try {
      console.log('Loading week events:', { startDate, endDate });
      const weekEvents = await getEvents(startDate, endDate);
      console.log('Week events loaded:', weekEvents.length);
      setEvents(weekEvents);
    } catch (error) {
      console.error('Error loading week events:', error);
    }
  };

  const loadDayEvents = async () => {
    const dateStr = formatDate(currentDate);
    
    try {
      console.log('Loading day events:', dateStr);
      const dayEvents = await getEvents(dateStr, dateStr);
      console.log('Day events loaded:', dayEvents.length);
      setEvents(dayEvents);
    } catch (error) {
      console.error('Error loading day events:', error);
    }
  };

  const loadSelectedDateEvents = async () => {
    try {
      const dateEvents = await getEventsByDate(selectedDate);
      setSelectedDateEvents(dateEvents);
    } catch (error) {
      console.error('Error loading selected date events:', error);
    }
  };

  // Hét első napjának kiszámítása (hétfő)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Naptár navigáció
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const prevDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
    setSelectedDate(formatDate(newDate));
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
    setSelectedDate(formatDate(newDate));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(formatDate(today));
  };

  // Naptár napok generálása (hónap nézet)
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const days = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < startingDay; i++) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - startingDay + i + 1),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  // Hét napjainak generálása
  const getWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const getEventsForDay = (date: Date) => {
    const dateStr = formatDate(date);
    return events.filter(event => {
      if (event.event_date === dateStr && !event.end_date) return true;
      if (event.end_date) {
        return dateStr >= event.event_date && dateStr <= event.end_date;
      }
      return false;
    });
  };

  const getEventIcon = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    return eventType?.icon || '📌';
  };

  const getEventTypeStyle = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    if (isDarkMode) {
      return {
        bg: eventType?.darkBgColor || 'bg-gray-800',
        text: eventType?.darkTextColor || 'text-gray-300',
        border: eventType?.darkBorderColor || 'border-gray-700'
      };
    } else {
      return {
        bg: eventType?.bgColor || 'bg-gray-100',
        text: eventType?.textColor || 'text-gray-800',
        border: eventType?.borderColor || 'border-gray-300'
      };
    }
  };

  const getPriorityColor = (priority: string) => {
    const priorityType = PRIORITIES.find(p => p.value === priority);
    if (isDarkMode) {
      return priorityType?.darkColor || 'bg-gray-800 text-gray-300';
    } else {
      return priorityType?.color || 'bg-gray-100 text-gray-700';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEvent?.id) {
        await updateEvent(editingEvent.id, formData);
      } else {
        if (!formData.title || !formData.event_date || !formData.event_type) {
          alert('Kérlek töltsd ki a kötelező mezőket!');
          return;
        }

        const newEvent: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> = {
          title: formData.title,
          description: formData.description || '',
          event_date: formData.event_date || formatDate(new Date()),
          event_time: formData.event_time || '',
          end_time: formData.end_time || '',
          event_type: formData.event_type as any,
          priority: formData.priority as any,
          status: formData.status as any,
          location: formData.location || '',
          animal_id: formData.animal_id,
          recurring_type: formData.recurring_type as any,
          recurring_interval: formData.recurring_interval || 1,
          recurring_end_date: formData.recurring_end_date || '',
          reminder_before: formData.reminder_before,
          color: formData.color || ''
        };
        console.log('💾 Creating new event:', newEvent);
        await addEvent(newEvent);
      }
      
      resetForm();
      
      if (viewMode === 'month') {
        await loadMonthEvents();
      } else if (viewMode === 'week') {
        await loadWeekEvents();
      } else {
        await loadDayEvents();
      }
      
      await loadSelectedDateEvents();
      
      const upcoming = await getUpcomingEvents(30);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Hiba történt az esemény mentése közben.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: selectedDate,
      event_time: '',
      end_date: '',
      end_time: '',
      event_type: 'task',
      priority: 'medium',
      status: 'pending',
      location: '',
      animal_id: undefined,
      recurring_type: 'none',
      recurring_interval: 1,
      recurring_end_date: '',
      reminder_before: 60,
      color: ''
    });
    setEditingEvent(null);
    setShowForm(false);
    console.log('🔄 Form resetted');
  };

  const handleEdit = (event: CalendarEventWithAnimal) => {
    console.log('✏️ Editing event:', event);
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      event_time: event.event_time,
      end_time: event.end_time,
      event_type: event.event_type,
      priority: event.priority,
      status: event.status,
      location: event.location,
      animal_id: event.animal_id,
      recurring_type: event.recurring_type,
      recurring_interval: event.recurring_interval,
      recurring_end_date: event.recurring_end_date,
      reminder_before: event.reminder_before,
      color: event.color
    });
    console.log('📝 Form loaded with:', { event_date: event.event_date, event_time: event.event_time });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt az eseményt?')) {
      setDeletingId(id);
      try {
        await deleteEvent(id);
        
        if (viewMode === 'month') {
          await loadMonthEvents();
        } else if (viewMode === 'week') {
          await loadWeekEvents();
        } else {
          await loadDayEvents();
        }
        
        await loadSelectedDateEvents();
        
        const upcoming = await getUpcomingEvents(30);
        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Hiba történt a törlés közben.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleStatusChange = async (id: number, newStatus: CalendarEvent['status']) => {
    try {
      await updateEventStatus(id, newStatus);
      
      if (viewMode === 'month') {
        await loadMonthEvents();
      } else if (viewMode === 'week') {
        await loadWeekEvents();
      } else {
        await loadDayEvents();
      }
      
      await loadSelectedDateEvents();
      
      const upcoming = await getUpcomingEvents(30);
      setUpcomingEvents(upcoming);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const filteredSelectedEvents = selectedDateEvents.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(search.toLowerCase()) ||
      event.description?.toLowerCase().includes(search.toLowerCase()) ||
      event.location?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = filterType === 'all' || event.event_type === filterType;
    const matchesPriority = filterPriority === 'all' || event.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  const formatTime = (time?: string) => {
    if (!time) return '';
    // Handle both HH:MM (5 chars) and HH:MM:SS (8 chars) formats
    return time.substring(0, 5);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-green-50'} p-4 md:p-6 lg:p-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Fejléc */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Naptár</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Események és teendők kezelése</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Események keresése..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-10 pr-4 py-2.5 w-full sm:w-64 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <button
              onClick={() => {
                setEditingEvent(null);
                setFormData({ ...formData, event_date: selectedDate });
                setShowForm(true);
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <Plus size={20} />
              Új esemény
            </button>
          </div>
        </div>

        {/* Nézet váltó és navigáció */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className={`px-4 py-2 border rounded-xl transition-colors font-medium ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700' 
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Ma
            </button>
            <div className="flex items-center gap-1">
              {viewMode === 'month' && (
                <>
                  <button
                    onClick={prevMonth}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-white text-gray-600'
                    }`}
                    title="Előző hónap"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextMonth}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-white text-gray-600'
                    }`}
                    title="Következő hónap"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
              {viewMode === 'week' && (
                <>
                  <button
                    onClick={prevWeek}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-white text-gray-600'
                    }`}
                    title="Előző hét"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextWeek}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-white text-gray-600'
                    }`}
                    title="Következő hét"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
              {viewMode === 'day' && (
                <>
                  <button
                    onClick={prevDay}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-white text-gray-600'
                    }`}
                    title="Előző nap"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextDay}
                    className={`p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-white text-gray-600'
                    }`}
                    title="Következő nap"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} ml-2`}>
              {viewMode === 'month' && `${currentDate.getFullYear()}. ${MONTHS[currentDate.getMonth()]}`}
              {viewMode === 'week' && (
                <>
                  {getWeekStart(currentDate).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })} - 
                  {new Date(getWeekStart(currentDate).setDate(getWeekStart(currentDate).getDate() + 6)).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                </>
              )}
              {viewMode === 'day' && currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-xl transition-all ${
                viewMode === 'month'
                  ? 'bg-green-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Hónap
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-xl transition-all ${
                viewMode === 'week'
                  ? 'bg-green-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Hét
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-xl transition-all ${
                viewMode === 'day'
                  ? 'bg-green-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Nap
            </button>
          </div>
        </div>

        {/* Naptár tartalom */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {/* Hónap nézet */}
            {viewMode === 'month' && (
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl overflow-hidden border`}>
                {/* Napok fejléce */}
                <div className={`grid grid-cols-7 ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-gray-200'} border-b`}>
                  {WEEKDAYS.map((day, index) => (
                    <div key={index} className={`p-4 text-center font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Naptár cellák */}
                <div className="grid grid-cols-7">
                  {getDaysInMonth().map((day, index) => {
                    const dayEvents = getEventsForDay(day.date);
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    const isSelected = formatDate(day.date) === selectedDate;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(formatDate(day.date))}
                        className={`min-h-[120px] p-2 border-b border-r cursor-pointer transition-all
                          ${day.isCurrentMonth ? (isDarkMode ? 'bg-gray-800' : 'bg-white') : (isDarkMode ? 'bg-gray-900/50 text-gray-500' : 'bg-gray-50 text-gray-400')}
                          ${isToday ? (isDarkMode ? 'bg-green-900/30' : 'bg-green-50') : ''}
                          ${isSelected ? 'ring-2 ring-green-500 ring-inset' : ''}
                          ${isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-green-50/50'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-medium ${
                            isToday ? (isDarkMode ? 'text-green-400' : 'text-green-700') : ''
                          } ${!day.isCurrentMonth ? (isDarkMode ? 'text-gray-600' : 'text-gray-400') : (isDarkMode ? 'text-gray-300' : '')}`}>
                            {day.date.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className={`text-xs ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} px-1.5 py-0.5 rounded-full font-medium`}>
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        
                        {/* Események előnézete */}
                        <div className="space-y-1 mt-1 flex-1">
                          {dayEvents.slice(0, 2).map((event, i) => {
                            const style = getEventTypeStyle(event.event_type);
                            return (
                              <div
                                key={i}
                                className={`text-[10px] p-1 rounded truncate font-medium ${style.bg} ${style.text} border-l-2 ${style.border} ${
                                  event.status === 'completed' ? 'line-through opacity-50' : ''
                                }`}
                                title={`${event.title}${event.event_time ? ' - ' + formatTime(event.event_time) : ''}`}
                              >
                                {event.event_time && (
                                  <span className="font-bold mr-1">{formatTime(event.event_time)}</span>
                                )}
                                {getEventIcon(event.event_type)} {event.title.length > 12 ? event.title.substring(0, 12) + '...' : event.title}
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} pl-1 font-medium`}>
                              +{dayEvents.length - 2} további
                            </div>
                          )}
                          {dayEvents.length === 0 && day.isCurrentMonth && (
                            <div className="h-6"></div>
                          )}
                        </div>
                        
                        {/* Esemény típus jelzések - pöttyök */}
                        {dayEvents.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t" style={{
                            borderTopColor: isDarkMode ? '#374151' : '#e5e7eb'
                          }}>
                            {Array.from(new Set(dayEvents.map(e => e.event_type))).map((eventType, idx) => {
                              const typeConfig = EVENT_TYPES.find(t => t.value === eventType);
                              const typeColor = typeConfig?.color || 'from-gray-500 to-slate-500';
                              const countOfType = dayEvents.filter(e => e.event_type === eventType).length;
                              
                              return (
                                <div
                                  key={idx}
                                  className="relative group"
                                  title={`${typeConfig?.label}: ${countOfType} esemény`}
                                >
                                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${typeColor} shadow-sm`}></div>
                                  {countOfType > 1 && (
                                    <span className={`text-[8px] font-bold absolute -top-1 -right-1 ${isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-200 text-gray-700'} rounded-full w-2.5 h-2.5 flex items-center justify-center leading-none`}>
                                      {countOfType}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hét nézet */}
            {viewMode === 'week' && (
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl overflow-hidden border`}>
                {/* Napok fejléce */}
                <div className={`grid grid-cols-7 ${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-gray-200'} border-b`}>
                  {WEEKDAYS_FULL.map((day, index) => {
                    const weekDays = getWeekDays();
                    const date = weekDays[index];
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={index} className="p-4 text-center">
                        <div className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{day}</div>
                        <div className={`text-sm mt-1 ${isToday ? (isDarkMode ? 'text-green-400 font-bold' : 'text-green-600 font-bold') : (isDarkMode ? 'text-gray-500' : 'text-gray-500')}`}>
                          {date.getDate()}. {MONTHS[date.getMonth()].substring(0, 3)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Heti nézet cellák */}
                <div className="grid grid-cols-7">
                  {getWeekDays().map((date, index) => {
                    const dayEvents = getEventsForDay(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isSelected = formatDate(date) === selectedDate;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(formatDate(date))}
                        className={`min-h-[400px] p-2 border-r cursor-pointer transition-all
                          ${isToday ? (isDarkMode ? 'bg-green-900/30' : 'bg-green-50') : (isDarkMode ? 'bg-gray-800' : 'bg-white')}
                          ${isSelected ? 'ring-2 ring-green-500 ring-inset' : ''}
                          ${isDarkMode ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-green-50/50'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-sm font-medium ${isToday ? (isDarkMode ? 'text-green-400' : 'text-green-700') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')}`}>
                            {date.getDate()}.
                          </span>
                          {dayEvents.length > 0 && (
                            <span className={`text-xs ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} px-1.5 py-0.5 rounded-full font-medium`}>
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        
                        {/* Események listája */}
                        <div className="space-y-2">
                          {dayEvents.map((event, i) => {
                            const style = getEventTypeStyle(event.event_type);
                            
                            return (
                              <div
                                key={i}
                                className={`p-2 rounded-lg text-xs ${style.bg} border-l-2 ${style.border} ${
                                  event.status === 'completed' ? 'line-through opacity-50' : ''
                                }`}
                                title={event.title}
                              >
                                <div className="flex justify-between items-start">
                                  <span className={`font-medium truncate ${style.text}`}>{event.title}</span>
                                  {event.priority === 'urgent' && (
                                    <span className={`ml-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>!</span>
                                  )}
                                </div>
                                {event.event_time && (
                                  <div className={isDarkMode ? 'text-gray-500 mt-1' : 'text-gray-500 mt-1'}>
                                    {formatTime(event.event_time)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Nap nézet */}
            {viewMode === 'day' && (
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl overflow-hidden border p-6`}>
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'} mb-4`}>
                  {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-center py-8`}>Nincs esemény ezen a napon</p>
                  ) : (
                    events.map(event => {
                      const style = getEventTypeStyle(event.event_type);
                      
                      return (
                        <div
                          key={event.id}
                          className={`p-4 rounded-xl ${style.bg} border-l-4 ${style.border} ${
                            event.status === 'completed' ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} ${event.status === 'completed' ? 'line-through' : ''}`}>
                                {event.title}
                              </h4>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(event.priority)}`}>
                                  {PRIORITIES.find(p => p.value === event.priority)?.label}
                                </span>
                                {event.event_time && (
                                  <span className={`text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} px-2 py-1 rounded-full`}>
                                    {formatTime(event.event_time)}
                                  </span>
                                )}
                                {event.animal_name && (
                                  <span className={`text-xs ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'} px-2 py-1 rounded-full`}>
                                    {event.animal_name}
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-3`}>{event.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {event.status !== 'completed' && (
                                <button
                                  onClick={() => handleStatusChange(event.id!, 'completed')}
                                  className={`p-2 ${isDarkMode ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-white'} rounded-lg transition-colors`}
                                  title="Teljesítve"
                                >
                                  <CheckCircle size={18} />
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(event)}
                                className={`p-2 ${isDarkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-white'} rounded-lg transition-colors`}
                                title="Szerkesztés"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(event.id!)}
                                disabled={deletingId === event.id}
                                className={`p-2 ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-white'} rounded-lg transition-colors disabled:opacity-50`}
                                title="Törlés"
                              >
                                {deletingId === event.id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 size={18} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Jobb oldali panel - Kiválasztott nap eseményei */}
          <div className="lg:col-span-1">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl border p-4 sticky top-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('hu-HU', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setFormData({ ...formData, event_date: selectedDate });
                    setShowForm(true);
                  }}
                  className={`p-1.5 ${isDarkMode ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50' : 'bg-green-100 text-green-700 hover:bg-green-200'} rounded-lg transition-colors`}
                  title="Új esemény"
                >
                  <Plus size={18} />
                </button>
              </div>
              
              {/* Szűrők */}
              <div className="mb-4 space-y-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">Minden típus</option>
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
                
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">Minden prioritás</option>
                  {PRIORITIES.map(priority => (
                    <option key={priority.value} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>
              
              {/* Események listája */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredSelectedEvents.length === 0 ? (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <CalendarIcon className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} size={32} />
                    <p className="text-sm">Nincs esemény ezen a napon</p>
                  </div>
                ) : (
                  filteredSelectedEvents.map(event => {
                    const eventType = EVENT_TYPES.find(t => t.value === event.event_type);
                    const style = getEventTypeStyle(event.event_type);
                    
                    return (
                      <div
                        key={event.id}
                        className={`p-3 rounded-xl border-l-4 transition-all hover:shadow-md ${style.bg} ${
                          event.status === 'completed' ? 'opacity-50' : ''
                        }`}
                        style={{ borderLeftColor: event.color || (isDarkMode ? '#34D399' : '#10B981') }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} ${event.status === 'completed' ? 'line-through' : ''}`}>
                              {event.title}
                            </h4>
                            <div className={`flex items-center gap-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
                              <span className="flex items-center gap-1">
                                {getEventIcon(event.event_type)}
                                {eventType?.label}
                              </span>
                              {event.event_time && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {formatTime(event.event_time)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {event.status !== 'completed' && (
                              <button
                                onClick={() => handleStatusChange(event.id!, 'completed')}
                                className={`p-1 ${isDarkMode ? 'text-green-400 hover:bg-gray-700' : 'text-green-600 hover:bg-green-50'} rounded`}
                                title="Teljesítve"
                              >
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(event)}
                              className={`p-1 ${isDarkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-50'} rounded`}
                              title="Szerkesztés"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(event.id!)}
                              disabled={deletingId === event.id}
                              className={`p-1 ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'} rounded disabled:opacity-50`}
                              title="Törlés"
                            >
                              {deletingId === event.id ? (
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Prioritás és további infók */}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(event.priority)}`}>
                            {PRIORITIES.find(p => p.value === event.priority)?.label}
                          </span>
                          {event.animal_name && (
                            <span className={`text-xs ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'} px-2 py-0.5 rounded-full`}>
                              {event.animal_name}
                            </span>
                          )}
                        </div>
                        
                        {event.description && (
                          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2 line-clamp-2`}>
                            {event.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Közelgő események */}
        <div className="mt-8">
          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Közelgő események</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {upcomingEvents.slice(0, 4).map(event => {
              const style = getEventTypeStyle(event.event_type);
              
              return (
                <div
                  key={event.id}
                  className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-md border p-4 hover:shadow-lg transition-all ${style.bg} border-l-4 ${style.border}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${
                      EVENT_TYPES.find(t => t.value === event.event_type)?.color || 'from-gray-500 to-slate-500'
                    } flex items-center justify-center text-white`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{event.title}</h4>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {event.event_date 
                          ? `${parseDateSafe(event.event_date)?.toLocaleDateString('hu-HU') || 'Érvénytelen dátum'}${event.event_time ? ` ${formatTime(event.event_time)}` : ''}` 
                          : 'Nincs dátum'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(event.priority)}`}>
                      {PRIORITIES.find(p => p.value === event.priority)?.label}
                    </span>
                  </div>
                  {event.animal_name && (
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Állat: {event.animal_name} ({event.animal_species})
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Esemény űrlap modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
              <div className={`flex justify-between items-center mb-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-4`}>
                <div>
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editingEvent ? 'Esemény szerkesztése' : 'Új esemény hozzáadása'}
                  </h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>
                    {editingEvent ? 'Módosítsd az esemény adatait' : 'Töltsd ki az esemény adatait'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingEvent(null);
                  }}
                  className={`${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} rounded-full p-1.5 transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Alapadatok */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Esemény címe *
                    </label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="pl.: Állatorvosi vizsgálat, Takarmányozás, Oltás..."
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  {/* Dátum és idő */}
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Kezdő dátum *
                    </label>
                    <input
                      type="date"
                      value={formData.event_date || ''}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                      required
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Kezdő idő
                    </label>
                    <input
                      type="time"
                      value={formData.event_time || ''}
                      onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Befejező idő
                    </label>
                    <input
                      type="time"
                      value={formData.end_time || ''}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  {/* Típus és prioritás */}
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Esemény típusa *
                    </label>
                    <select
                      value={formData.event_type || 'task'}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value as any })}
                      required
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {EVENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Prioritás *
                    </label>
                    <select
                      value={formData.priority || 'medium'}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      required
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {PRIORITIES.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          {priority.icon} {priority.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Állat kiválasztása */}
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Kapcsolódó állat
                    </label>
                    <select
                      value={formData.animal_id || ''}
                      onChange={(e) => setFormData({ ...formData, animal_id: e.target.value ? Number(e.target.value) : undefined })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Válassz állatot...</option>
                      {animals.map(animal => (
                        <option key={animal.id} value={animal.id}>
                          {animal.name || animal.identifier} - {animal.species}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Helyszín */}
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Helyszín
                    </label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="pl.: Istálló A, Legelő, Karám..."
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  {/* Ismétlődés */}
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Ismétlődés típusa
                    </label>
                    <select
                      value={formData.recurring_type || 'none'}
                      onChange={(e) => setFormData({ ...formData, recurring_type: e.target.value as any })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      {RECURRING_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.recurring_type !== 'none' && (
                    <>
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                          Ismétlődés gyakorisága
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.recurring_interval || 1}
                          onChange={(e) => setFormData({ ...formData, recurring_interval: parseInt(e.target.value) })}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                          Ismétlődés vége
                        </label>
                        <input
                          type="date"
                          value={formData.recurring_end_date || ''}
                          onChange={(e) => setFormData({ ...formData, recurring_end_date: e.target.value })}
                          min={formData.event_date}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          }`}
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Emlékeztető */}
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Emlékeztető (perc)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={formData.reminder_before || 60}
                      onChange={(e) => setFormData({ ...formData, reminder_before: parseInt(e.target.value) })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  {/* Szín */}
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Szín
                    </label>
                    <input
                      type="color"
                      value={formData.color || (isDarkMode ? '#34D399' : '#10B981')}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-12 px-1 py-1 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  {/* Leírás */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>
                      Leírás
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder="Részletes leírás, megjegyzések az eseményhez..."
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3.5 rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    {editingEvent ? 'Módosítások mentése' : 'Esemény hozzáadása'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingEvent(null);
                    }}
                    className={`flex-1 px-6 py-3.5 rounded-xl transition-all duration-200 font-medium border ${
                      isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                    }`}
                  >
                    Mégse
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;