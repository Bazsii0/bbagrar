// pages/Lands.tsx
import { useEffect, useState } from 'react';
import { Plus, X, Search, Grid, List, Filter, ChevronUp, ChevronDown, Trash2, MapPin, FileText, Building, MessageCircle } from 'lucide-react';
import { getLands, addLand, deleteLand } from '../db/operations';
import { useTheme } from '../context/ThemeContext';

interface Land {
  id: number;
  name: string;
  plot_number?: string;
  area: number;
  city?: string;
  ownership_type: 'owned' | 'rented';
  status?: string;
  notes?: string;
  created_at: string;
}

type SortField = 'name' | 'plot_number' | 'area' | 'city' | 'ownership_type' | 'status';
type SortDirection = 'asc' | 'desc';

const Lands = () => {
  const { isDarkMode } = useTheme();
  const [lands, setLands] = useState<Land[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOwnership, setSelectedOwnership] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    plot_number: '',
    area: '',
    city: '',
    ownership_type: 'owned' as 'owned' | 'rented',
    status: '',
    notes: '',
  });

  const statusOptions = [
    'Művelés alatt',
    'Pihenő',
    'Bevetve',
    'Aratás előtt',
    'Aratás után',
    'Legeltetés',
    'Felújítás alatt',
    'Üres',
    'Előkészítés alatt'
  ];

  const loadLands = async () => {
    try {
      const data = await getLands();
      const processedData = data.map((land: any) => ({
        ...land,
        area: typeof land.area === 'string' ? parseFloat(land.area) : land.area
      }));
      setLands(processedData as Land[]);
    } catch (error) {
      console.error('Error loading lands:', error);
    }
  };

  useEffect(() => {
    loadLands();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addLand({
        name: formData.name,
        plot_number: formData.plot_number,
        area: parseFloat(formData.area),
        city: formData.city,
        ownership_type: formData.ownership_type,
        status: formData.status,
        notes: formData.notes,
      });
      setFormData({ 
        name: '', 
        plot_number: '', 
        area: '', 
        city: '', 
        ownership_type: 'owned', 
        status: '', 
        notes: '' 
      });
      setShowForm(false);
      await loadLands();
    } catch (error) {
      console.error('Error adding land:', error);
      alert('Hiba történt a földterület hozzáadása közben.');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt a földterületet?')) {
      setDeletingId(id);
      try {
        await deleteLand(id);
        await loadLands();
      } catch (error: any) {
        console.error('Error deleting land:', error);
        
        let errorMessage = 'Hiba történt a törlés közben.';
        
        if (error.message) {
          errorMessage += ` Részletek: ${error.message}`;
        } else if (error.response?.data?.message) {
          errorMessage += ` Részletek: ${error.response.data.message}`;
        } else if (error.status === 404) {
          errorMessage = 'A törlés nem támogatott. Lehet, hogy a backend végpont még nem létezik.';
        } else if (error.status === 401 || error.status === 403) {
          errorMessage = 'Nincs jogosultságod a törléshez.';
        }
        
        alert(errorMessage);
        
        if (error.status === 404) {
          setLands(prevLands => prevLands.filter(land => land.id !== id));
        }
      } finally {
        setDeletingId(null);
      }
    }
  };

  const uniqueOwnershipTypes = ['all', ...Array.from(new Set(lands.map(land => land.ownership_type)))];
  
  const uniqueStatuses = ['all', ...Array.from(new Set(lands.map(land => land.status).filter((status): status is string => status !== undefined && status !== null)))];

  const filteredLands = lands.filter(land => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      land.name.toLowerCase().includes(searchLower) ||
      land.plot_number?.toLowerCase().includes(searchLower) ||
      land.city?.toLowerCase().includes(searchLower) ||
      land.notes?.toLowerCase().includes(searchLower);
    
    const matchesOwnership = selectedOwnership === 'all' || land.ownership_type === selectedOwnership;
    const matchesStatus = selectedStatus === 'all' || land.status === selectedStatus;
    
    return matchesSearch && matchesOwnership && matchesStatus;
  });

  const sortedLands = [...filteredLands].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortField === 'area') {
      aValue = a.area;
      bValue = b.area;
    } else {
      aValue = a[sortField];
      bValue = b[sortField];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (sortField === 'name' || sortField === 'plot_number' || sortField === 'city' || sortField === 'ownership_type' || sortField === 'status') {
        aValue = aValue.toString().toLowerCase();
        bValue = bValue.toString().toLowerCase();
      }
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status?: string) => {
    const colors: Record<string, string> = {
      'Művelés alatt': 'from-blue-500 to-cyan-500',
      'Pihenő': 'from-green-500 to-emerald-500',
      'Bevetve': 'from-yellow-500 to-amber-500',
      'Aratás előtt': 'from-orange-500 to-red-500',
      'Aratás után': 'from-purple-500 to-indigo-500',
      'Legeltetés': 'from-green-600 to-lime-600',
      'Felújítás alatt': 'from-gray-500 to-slate-500',
      'Üres': 'from-stone-400 to-gray-400',
      'Előkészítés alatt': 'from-amber-500 to-yellow-600',
    };
    return status && colors[status] ? colors[status] : 'from-green-500 to-emerald-500';
  };

  const getOwnershipInfo = (type: 'owned' | 'rented') => {
    if (type === 'owned') {
      return { 
        icon: '🏠', 
        text: 'Saját', 
        color: isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800' 
      };
    } else {
      return { 
        icon: '📄', 
        text: 'Bérelt', 
        color: isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800' 
      };
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  const formatArea = (area: any): string => {
    if (area === undefined || area === null) return '0 ha';
    const numArea = typeof area === 'string' ? parseFloat(area) : area;
    if (isNaN(numArea)) return '0 ha';
    return `${numArea.toFixed(2)} ha`;
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-green-50'} p-4 md:p-6 lg:p-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Fejléc */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Földek</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Földterületek kezelése és nyilvántartása</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Keresés név, helyrajzi szám, település..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-10 pr-4 py-2.5 w-full sm:w-80 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <Plus size={20} />
              Új földterület
            </button>
          </div>
        </div>

        {/* Szűrők és nézet váltó */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Filter size={20} />
              <span className="font-medium">Szűrők:</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? isDarkMode
                      ? 'bg-green-900/30 text-green-300 border border-green-700'
                      : 'bg-green-100 text-green-700 border border-green-300'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Grid size={18} />
                <span>Rács</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  viewMode === 'list' 
                    ? isDarkMode
                      ? 'bg-green-900/30 text-green-300 border border-green-700'
                      : 'bg-green-100 text-green-700 border border-green-300'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <List size={18} />
                <span>Lista</span>
              </button>
            </div>
          </div>
          
          {/* Tulajdonjog szűrő */}
          <div className="mb-4">
            <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Tulajdonjog:</p>
            <div className="flex flex-wrap gap-3">
              {uniqueOwnershipTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedOwnership(type)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    selectedOwnership === type
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {type === 'all' ? 'Összes' : type === 'owned' ? 'Saját' : 'Bérelt'}
                  {type !== 'all' && (
                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                      isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {lands.filter(l => l.ownership_type === type).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Státusz szűrő */}
          {uniqueStatuses.length > 1 && (
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Státusz:</p>
              <div className="flex flex-wrap gap-3">
                {uniqueStatuses.map(status => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                      selectedStatus === status
                        ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                        : isDarkMode
                          ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {status === 'all' ? 'Összes' : status}
                    {status !== 'all' && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {lands.filter(l => l.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rendezés gombok */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSort('name')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'name'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Név</span>
              <SortIcon field="name" />
            </button>
            <button
              onClick={() => handleSort('plot_number')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'plot_number'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Helyrajzi szám</span>
              <SortIcon field="plot_number" />
            </button>
            <button
              onClick={() => handleSort('area')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'area'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Terület</span>
              <SortIcon field="area" />
            </button>
            <button
              onClick={() => handleSort('city')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'city'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Település</span>
              <SortIcon field="city" />
            </button>
            <button
              onClick={() => handleSort('ownership_type')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'ownership_type'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Tulajdonjog</span>
              <SortIcon field="ownership_type" />
            </button>
            <button
              onClick={() => handleSort('status')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'status'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Státusz</span>
              <SortIcon field="status" />
            </button>
          </div>
        </div>

        {/* Modal - új földterület hozzáadása */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
              <div className={`flex justify-between items-center mb-6 sticky top-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} pt-2 pb-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div>
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Új földterület hozzáadása</h2>
                  <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Töltsd ki a földterület adatait</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className={`${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} rounded-full p-1.5 transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Név *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="pl.: Felső-rét, Alsó-legelő"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Helyrajzi szám</label>
                    <input
                      type="text"
                      value={formData.plot_number}
                      onChange={(e) => setFormData({ ...formData, plot_number: e.target.value })}
                      placeholder="pl.: 0123/4, 0567/8"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Területnagyság (ha) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      required
                      placeholder="pl.: 5.5"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Település</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="pl.: Kunszállás, Lakitelek"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Tulajdonjog *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="ownership_type"
                          value="owned"
                          checked={formData.ownership_type === 'owned'}
                          onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value as 'owned' | 'rented' })}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Saját</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="ownership_type"
                          value="rented"
                          checked={formData.ownership_type === 'rented'}
                          onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value as 'owned' | 'rented' })}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Bérelt</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Státusz</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Válassz státuszt...</option>
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Megjegyzések</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Egyéb információk a földterületről..."
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div className={`flex gap-4 pt-2 sticky bottom-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} pb-2`}>
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3.5 rounded-xl transition-all duration-200 font-medium shadow-md hover:shadow-lg"
                  >
                    Mentés
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
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

        {/* Tartalom - Grid nézet */}
        {viewMode === 'grid' ? (
          <>
            {sortedLands.length === 0 ? (
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl border p-12 text-center`}>
                <div className="flex flex-col items-center justify-center">
                  <div className={`w-20 h-20 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mb-6`}>
                    <Search className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} size={32} />
                  </div>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                    {search || selectedOwnership !== 'all' || selectedStatus !== 'all' ? 'Nincs találat' : 'Még nincsenek földterületek'}
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} max-w-md mb-6`}>
                    {search || selectedOwnership !== 'all' || selectedStatus !== 'all'
                      ? 'Próbálj meg másik szűrési feltételt!'
                      : 'Kezdd el a földterületek rögzítését a "Új földterület" gombra kattintva.'}
                  </p>
                  {(search || selectedOwnership !== 'all' || selectedStatus !== 'all') && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setSelectedOwnership('all');
                        setSelectedStatus('all');
                      }}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Összes földterület megjelenítése
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedLands.map((land) => {
                  const ownershipInfo = getOwnershipInfo(land.ownership_type);
                  
                  return (
                    <div
                      key={land.id}
                      className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative group`}
                    >
                      <button
                        onClick={() => handleDelete(land.id)}
                        disabled={deletingId === land.id}
                        className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Földterület törlése"
                      >
                        {deletingId === land.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>

                      <div className={`h-2 bg-gradient-to-r ${getStatusColor(land.status)}`} />
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2 truncate`} title={land.name}>
                              {land.name}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ownershipInfo.color}`}>
                                <span className="mr-1">{ownershipInfo.icon}</span>
                                {ownershipInfo.text}
                              </span>
                              {land.status && (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getStatusColor(land.status)} text-white`}>
                                  {land.status}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${isDarkMode ? 'from-green-900/30 to-emerald-900/30' : 'from-green-100 to-emerald-100'} flex items-center justify-center flex-shrink-0 ml-3`}>
                            <MapPin className={isDarkMode ? 'text-green-400' : 'text-green-600'} size={24} />
                          </div>
                        </div>

                        <div className="space-y-3 mt-4">
                          <div className="flex items-start">
                            <div className={`w-8 h-8 ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                              <FileText size={16} className={isDarkMode ? 'text-blue-400' : 'text-blue-600'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Helyrajzi szám</p>
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} truncate`} title={land.plot_number || '-'}>
                                {land.plot_number || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <div className={`w-8 h-8 ${isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                              <span className={`${isDarkMode ? 'text-amber-400' : 'text-amber-600'} font-bold text-xs`}>ha</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Terület</p>
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formatArea(land.area)}</p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <div className={`w-8 h-8 ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                              <Building size={16} className={isDarkMode ? 'text-purple-400' : 'text-purple-600'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Település</p>
                              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} truncate`} title={land.city || '-'}>
                                {land.city || '-'}
                              </p>
                            </div>
                          </div>

                          {land.notes && (
                            <div className={`flex items-start pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} mt-2`}>
                              <div className={`w-8 h-8 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                                <MessageCircle size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Megjegyzések</p>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap break-words line-clamp-2`} title={land.notes}>
                                  {land.notes}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className={`mt-4 text-xs ${isDarkMode ? 'text-gray-500 border-gray-700' : 'text-gray-400 border-gray-100'} border-t pt-3`}>
                          <span>Rögzítve: {new Date(land.created_at).toLocaleDateString('hu-HU')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Lista nézet */
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl overflow-hidden border`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-900/50' : 'bg-gradient-to-r from-green-50 to-emerald-50'}`}>
                  <tr>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button onClick={() => handleSort('name')} className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}>
                        Név <SortIcon field="name" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button onClick={() => handleSort('plot_number')} className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}>
                        Helyrajzi szám <SortIcon field="plot_number" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button onClick={() => handleSort('city')} className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}>
                        Település <SortIcon field="city" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button onClick={() => handleSort('area')} className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}>
                        Terület <SortIcon field="area" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button onClick={() => handleSort('ownership_type')} className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}>
                        Tulajdonjog <SortIcon field="ownership_type" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button onClick={() => handleSort('status')} className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}>
                        Státusz <SortIcon field="status" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      Megjegyzések
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      Műveletek
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {sortedLands.map((land, index) => {
                    const ownershipInfo = getOwnershipInfo(land.ownership_type);
                    
                    return (
                      <tr
                        key={land.id}
                        className={`${
                          isDarkMode 
                            ? index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900/50'
                            : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        } hover:${isDarkMode ? 'bg-gray-700' : 'bg-green-50/50'} transition-colors`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getStatusColor(land.status)} flex items-center justify-center`}>
                              <MapPin size={16} className="text-white" />
                            </div>
                            <div>
                              <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{land.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`font-medium ${land.plot_number ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                            {land.plot_number || '-'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`font-medium ${land.city ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                            {land.city || '-'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                          }`}>
                            {formatArea(land.area)}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${ownershipInfo.color}`}>
                            <span className="mr-1">{ownershipInfo.icon}</span>
                            {ownershipInfo.text}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          {land.status ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getStatusColor(land.status)} text-white`}>
                              {land.status}
                            </span>
                          ) : (
                            <span className={isDarkMode ? 'text-gray-600' : 'text-gray-400'}>-</span>
                          )}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`text-sm ${land.notes ? (isDarkMode ? 'text-gray-300' : 'text-gray-700') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                            {land.notes ? (land.notes.length > 30 ? `${land.notes.substring(0, 30)}...` : land.notes) : '-'}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <button
                            onClick={() => handleDelete(land.id)}
                            disabled={deletingId === land.id}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Törlés"
                          >
                            {deletingId === land.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Összegzés */}
        {lands.length > 0 && (
          <div className={`mt-8 p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'} rounded-2xl border`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-1`}>Statisztika</h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Összesen <span className="font-semibold text-green-600">{sortedLands.length}</span> földterület
                  {search && <span> a(z) "<span className="font-semibold">{search}</span>" keresésre</span>}
                  {selectedOwnership !== 'all' && <span> | Tulajdonjog: <span className="font-semibold">{selectedOwnership === 'owned' ? 'Saját' : 'Bérelt'}</span></span>}
                  {selectedStatus !== 'all' && <span> | Státusz: <span className="font-semibold">{selectedStatus}</span></span>}
                  <span> | Összterület: <span className="font-semibold text-green-600">
                    {formatArea(sortedLands.reduce((sum, land) => sum + (typeof land.area === 'number' ? land.area : parseFloat(land.area) || 0), 0))}
                  </span></span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 border rounded-full text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-green-300' 
                    : 'bg-white border-green-300 text-green-700'
                }`}>
                  Saját: <span className="font-semibold">{lands.filter(l => l.ownership_type === 'owned').length}</span>
                </span>
                <span className={`px-3 py-1 border rounded-full text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-blue-300' 
                    : 'bg-white border-blue-300 text-blue-700'
                }`}>
                  Bérelt: <span className="font-semibold">{lands.filter(l => l.ownership_type === 'rented').length}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lands;