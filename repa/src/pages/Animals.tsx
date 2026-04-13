// pages/Animals.tsx
import { useEffect, useState } from 'react';
import { Plus, X, Search, Grid, List, Filter, ChevronUp, ChevronDown, Trash2, Calendar, Edit } from 'lucide-react';
import { getAnimals, addAnimal, updateAnimal, deleteAnimal } from '../db/operations';
import { useTheme } from '../context/ThemeContext';

interface Animal {
  id: number;
  name?: string;
  species: string;
  breed?: string;
  identifier: string;
  birth_date?: string;
  stable?: string;
  gender?: string;
  purpose?: string;
  notes?: string;
  dam_id?: number | null;
  sire_id?: number | null;
}

type SortField = 'name' | 'species' | 'breed' | 'birth_date' | 'stable';
type SortDirection = 'asc' | 'desc';

const Animals = () => {
  const { isDarkMode } = useTheme();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [search, setSearch] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Edit state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    species: '',
    breed: '',
    identifier: '',
    birth_date: '',
    stable: '',
    gender: 'ismeretlen',
    purpose: '',
    notes: '',
    dam_id: null as number | null,
    sire_id: null as number | null,
  });

  // Bulk upload state
  const [bulkTemplate, setBulkTemplate] = useState({
    species: '',
    breed: '',
    birth_date: '',
    stable: '',
    gender: 'ismeretlen',
    purpose: '',
    notes: '',
    dam_id: null as number | null,
    sire_id: null as number | null,
  });
  
  const [bulkAnimals, setBulkAnimals] = useState<Array<{ name: string; identifier: string }>>([
    { name: '', identifier: '' }
  ]);

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatAge = (birthDate?: string): string => {
    if (!birthDate) return 'Ismeretlen';
    
    const age = calculateAge(birthDate);
    if (age === 0) {
      const birth = new Date(birthDate);
      const today = new Date();
      const months = (today.getFullYear() - birth.getFullYear()) * 12 + 
                    (today.getMonth() - birth.getMonth());
      return `${months} hónap`;
    }
    return `${age} év`;
  };

  const loadAnimals = async () => {
    const data = await getAnimals();
    setAnimals(data as Animal[]);
  };

  useEffect(() => {
    loadAnimals();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addAnimal({
      name: formData.name || undefined,
      species: formData.species,
      breed: formData.breed || undefined,
      identifier: formData.identifier,
      birth_date: formData.birth_date || undefined,
      stable: formData.stable,
      gender: formData.gender,
      purpose: formData.purpose || undefined,
      notes: formData.notes,
      dam_id: formData.dam_id,
      sire_id: formData.sire_id,
    });
    setFormData({ 
      name: '', 
      species: '', 
      breed: '', 
      identifier: '', 
      birth_date: '', 
      stable: '', 
      gender: 'ismeretlen',
      purpose: '',
      notes: '',
      dam_id: null,
      sire_id: null,
    });
    setShowForm(false);
    await loadAnimals();
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validálás: legalább egy sor és template adatok
    if (bulkAnimals.length === 0 || bulkAnimals.every(a => !a.identifier && !a.name)) {
      alert('Legalább egy állatot meg kell adni (azonosító és/vagy név)');
      return;
    }
    
    if (!bulkTemplate.species) {
      alert('Faj megadása kötelező!');
      return;
    }

    try {
      let successCount = 0;
      for (const animal of bulkAnimals) {
        if (animal.identifier || animal.name) {
          await addAnimal({
            name: animal.name || undefined,
            species: bulkTemplate.species,
            breed: bulkTemplate.breed || undefined,
            identifier: animal.identifier || `${animal.name}-auto`,
            birth_date: bulkTemplate.birth_date || undefined,
            stable: bulkTemplate.stable,
            gender: bulkTemplate.gender,
            purpose: bulkTemplate.purpose || undefined,
            notes: bulkTemplate.notes,
            dam_id: bulkTemplate.dam_id,
            sire_id: bulkTemplate.sire_id,
          });
          successCount++;
        }
      }
      
      alert(`✅ ${successCount} állat sikeresen feltöltve!`);
      setBulkAnimals([{ name: '', identifier: '' }]);
      setBulkTemplate({
        species: '',
        breed: '',
        birth_date: '',
        stable: '',
        gender: 'ismeretlen',
        purpose: '',
        notes: '',
        dam_id: null,
        sire_id: null,
      });
      setShowForm(false);
      await loadAnimals();
    } catch (error) {
      console.error('Error in bulk upload:', error);
      alert('Hiba történt a tömeges feltöltés közben!');
    }
  };

  const addBulkRow = () => {
    setBulkAnimals([...bulkAnimals, { name: '', identifier: '' }]);
  };

  const removeBulkRow = (index: number) => {
    setBulkAnimals(bulkAnimals.filter((_, i) => i !== index));
  };

  const updateBulkAnimal = (index: number, field: 'name' | 'identifier', value: string) => {
    const updated = [...bulkAnimals];
    updated[index][field] = value;
    setBulkAnimals(updated);
  };

  const startEdit = (animal: Animal) => {
    setEditingAnimal(animal);
    // Format date from ISO string (2026-03-28T00:00:00.000Z) to yyyy-MM-dd
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setFormData({
      name: animal.name || '',
      species: animal.species,
      breed: animal.breed || '',
      identifier: animal.identifier,
      birth_date: formatDate(animal.birth_date),
      stable: animal.stable || '',
      gender: animal.gender || 'ismeretlen',
      purpose: animal.purpose || '',
      notes: animal.notes || '',
      dam_id: animal.dam_id || null,
      sire_id: animal.sire_id || null,
    });
    setShowEditForm(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnimal) return;
    
    try {
      await updateAnimal(editingAnimal.id, {
        name: formData.name || undefined,
        species: formData.species,
        breed: formData.breed || undefined,
        identifier: formData.identifier,
        birth_date: formData.birth_date || undefined,
        stable: formData.stable,
        gender: formData.gender,
        purpose: formData.purpose || undefined,
        notes: formData.notes,
        dam_id: formData.dam_id,
        sire_id: formData.sire_id,
      });
      setShowEditForm(false);
      setEditingAnimal(null);
      setFormData({
        name: '',
        species: '',
        breed: '',
        identifier: '',
        birth_date: '',
        stable: '',
        gender: 'ismeretlen',
        purpose: '',
        notes: '',
        dam_id: null,
        sire_id: null,
      });
      await loadAnimals();
      alert('✅ Állat sikeresen frissítve!');
    } catch (error) {
      console.error('Error updating animal:', error);
      alert('❌ Hiba az állat frissítése közben!');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Biztosan törölni szeretnéd ezt az állatot?')) {
      setDeletingId(id);
      try {
        await deleteAnimal(id);
        await loadAnimals();
      } catch (error) {
        console.error('Error deleting animal:', error);
        alert('Hiba történt a törlés közben.');
      } finally {
        setDeletingId(null);
      }
    }
  };

  const uniqueSpecies = ['all', ...Array.from(new Set(animals.map(animal => animal.species)))];

  const filteredAnimals = animals.filter(animal => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      animal.name?.toLowerCase().includes(searchLower) ||
      animal.species.toLowerCase().includes(searchLower) ||
      animal.breed?.toLowerCase().includes(searchLower) ||
      animal.identifier.toLowerCase().includes(searchLower) ||
      animal.stable?.toLowerCase().includes(searchLower);
    
    const matchesSpecies = selectedSpecies === 'all' || animal.species === selectedSpecies;
    
    return matchesSearch && matchesSpecies;
  });

  const sortedAnimals = [...filteredAnimals].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    if (sortField === 'birth_date') {
      aValue = a.birth_date ? calculateAge(a.birth_date) : Infinity;
      bValue = b.birth_date ? calculateAge(b.birth_date) : Infinity;
    } else {
      aValue = a[sortField];
      bValue = b[sortField];

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (sortField === 'name' || sortField === 'species' || sortField === 'breed' || sortField === 'stable') {
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

  const getSpeciesColor = (species: string) => {
    const colors: Record<string, string> = {
      'Ló': 'from-amber-500 to-orange-500',
      'Tehén': 'from-purple-500 to-indigo-500',
      'Bárány': 'from-pink-500 to-rose-500',
      'Kecske': 'from-emerald-500 to-green-500',
      'Disznó': 'from-rose-500 to-pink-500',
      'Csirke': 'from-yellow-500 to-amber-500',
      'Liba': 'from-blue-500 to-cyan-500',
      'Nyúl': 'from-gray-500 to-slate-500',
      'Kutya': 'from-orange-500 to-amber-500',
      'Macska': 'from-slate-500 to-gray-500',
    };
    return colors[species] || 'from-green-500 to-emerald-500';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-green-50'} p-4 md:p-6 lg:p-8`}>
      <div className="max-w-7xl mx-auto">
        {/* Fejléc */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div>
            <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Állatok</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Állatok kezelése és nyilvántartása</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Keresés név, faj, fajta vagy istálló alapján..."
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
              onClick={() => setShowForm(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <Plus size={20} />
              Új állat
            </button>
          </div>
        </div>

        {/* Szűrők és nézet váltó */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Filter size={20} />
              <span className="font-medium">Szűrés fajta szerint:</span>
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
          
          {/* Fajta szűrő gombok */}
          <div className="flex flex-wrap gap-3">
            {uniqueSpecies.map(species => (
              <button
                key={species}
                onClick={() => setSelectedSpecies(species)}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                  selectedSpecies === species
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {species === 'all' ? 'Összes' : species}
                {species !== 'all' && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {animals.filter(a => a.species === species).length}
                  </span>
                )}
              </button>
            ))}
          </div>
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
              onClick={() => handleSort('species')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'species'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Faj</span>
              <SortIcon field="species" />
            </button>
            <button
              onClick={() => handleSort('breed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'breed'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Fajta</span>
              <SortIcon field="breed" />
            </button>
            <button
              onClick={() => handleSort('birth_date')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'birth_date'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Kor</span>
              <SortIcon field="birth_date" />
            </button>
            <button
              onClick={() => handleSort('stable')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                sortField === 'stable'
                  ? isDarkMode
                    ? 'bg-green-900/30 text-green-300 border border-green-700'
                    : 'bg-green-100 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>Istálló</span>
              <SortIcon field="stable" />
            </button>
          </div>
        </div>

        {/* Modal - új állat hozzáadása */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-2xl shadow-2xl`}>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Új állat hozzáadása</h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>Töltsd ki az állat adatait</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className={`${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} rounded-full p-1.5 transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Tab switch: Single / Bulk */}
              <div className="flex gap-2 mb-6 border-b" style={{borderColor: isDarkMode ? '#374151' : '#e5e7eb'}}>
                <button
                  onClick={() => setAddMode('single')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    addMode === 'single'
                      ? `text-green-600 border-b-2 border-green-600 ${isDarkMode ? 'bg-gray-700/50' : 'bg-green-50'}`
                      : `${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  📝 Egyedi
                </button>
                <button
                  onClick={() => setAddMode('bulk')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    addMode === 'bulk'
                      ? `text-green-600 border-b-2 border-green-600 ${isDarkMode ? 'bg-gray-700/50' : 'bg-green-50'}`
                      : `${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
                  }`}
                >
                  📊 Tömeges
                </button>
              </div>
              {addMode === 'single' && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Név</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="pl.: Csepp, Bütyök, Tarka"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Faj *</label>
                    <input
                      type="text"
                      value={formData.species}
                      onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                      required
                      placeholder="pl.: Ló, Tehén, Csirke..."
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Fajta</label>
                    <input
                      type="text"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="pl.: Holstein, Noniusz, Mangalica"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Azonosító *</label>
                    <input
                      type="text"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      required
                      placeholder="pl.: T-001, L-023, C-456"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Születési dátum</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
                      <input
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full pl-10 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Istálló</label>
                    <input
                      type="text"
                      value={formData.stable}
                      onChange={(e) => setFormData({ ...formData, stable: e.target.value })}
                      placeholder="pl.: Istálló A, Baromfiól, Ól"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Nem</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="ismeretlen">Ismeretlen</option>
                      <option value="hím">Hím</option>
                      <option value="nőstény">Nőstény</option>
                      <option value="herélt">Herélt</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Feladat/Cél</label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">--Nincs kiválasztva--</option>
                      <option value="munka">Munkaállat</option>
                      <option value="tejtermelés">Tejtermelés</option>
                      <option value="tenyésztés">Tenyésztés</option>
                      <option value="hizlalás">Hizlalás</option>
                      <option value="ellés">Ellés</option>
                      <option value="húshasználat">Húshasználat</option>
                      <option value="egyéb">Egyéb</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Anya (Dam)</label>
                    <select
                      value={formData.dam_id || ''}
                      onChange={(e) => setFormData({ ...formData, dam_id: e.target.value ? parseInt(e.target.value) : null })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">--Nincs kiválasztva--</option>
                      {animals
                        .filter((a) => {
                          const gender = a.gender?.toLowerCase() || 'ismeretlen';
                          return gender === 'nőstény' || gender === 'herélt' || gender === 'ismeretlen';
                        })
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name || a.identifier} ({a.species})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Apa (Sire)</label>
                    <select
                      value={formData.sire_id || ''}
                      onChange={(e) => setFormData({ ...formData, sire_id: e.target.value ? parseInt(e.target.value) : null })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">--Nincs kiválasztva--</option>
                      {animals
                        .filter((a) => {
                          const gender = a.gender?.toLowerCase() || 'ismeretlen';
                          return gender === 'hím' || gender === 'ismeretlen';
                        })
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name || a.identifier} ({a.species})
                          </option>
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
                    placeholder="Egyéb információk az állatról..."
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div className="flex gap-4 pt-2">
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
              )}

              {addMode === 'bulk' && (
              <form onSubmit={handleBulkSubmit} className="space-y-5">
                {/* Template adatok */}
                <div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>📋 Sablon adattok</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Faj *</label>
                      <input
                        type="text"
                        value={bulkTemplate.species}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, species: e.target.value })}
                        placeholder="pl.: Marha, Sertés, Ló"
                        required
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Fajta</label>
                      <input
                        type="text"
                        value={bulkTemplate.breed}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, breed: e.target.value })}
                        placeholder="pl.: Charolais"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Születési dátum</label>
                      <input
                        type="date"
                        value={bulkTemplate.birth_date}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, birth_date: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Tartási hely</label>
                      <input
                        type="text"
                        value={bulkTemplate.stable}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, stable: e.target.value })}
                        placeholder="pl.: 1. Istálló"
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Nem</label>
                      <select
                        value={bulkTemplate.gender}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, gender: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="ismeretlen">Ismeretlen</option>
                        <option value="hím">Hím</option>
                        <option value="nőstény">Nőstény</option>
                        <option value="herélt">Herélt</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Cél/Feladat</label>
                      <select
                        value={bulkTemplate.purpose}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, purpose: e.target.value })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">--Nincs kiválasztva--</option>
                        <option value="munka">Munkaállat</option>
                        <option value="tejtermelés">Tejtermelés</option>
                        <option value="tenyésztés">Tenyésztés</option>
                        <option value="hizlalás">Hizlalás</option>
                        <option value="ellés">Ellés</option>
                        <option value="húshasználat">Húshasználat</option>
                        <option value="egyéb">Egyéb</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Anya (Dam)</label>
                      <select
                        value={bulkTemplate.dam_id || ''}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, dam_id: e.target.value ? parseInt(e.target.value) : null })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">--Nincs kiválasztva--</option>
                        {animals
                          .filter((a) => {
                            const gender = a.gender?.toLowerCase() || 'ismeretlen';
                            return gender === 'nőstény' || gender === 'herélt' || gender === 'ismeretlen';
                          })
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name || a.identifier} ({a.species})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Apa (Sire)</label>
                      <select
                        value={bulkTemplate.sire_id || ''}
                        onChange={(e) => setBulkTemplate({ ...bulkTemplate, sire_id: e.target.value ? parseInt(e.target.value) : null })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">--Nincs kiválasztva--</option>
                        {animals
                          .filter((a) => {
                            const gender = a.gender?.toLowerCase() || 'ismeretlen';
                            return gender === 'hím' || gender === 'ismeretlen';
                          })
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name || a.identifier} ({a.species})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Megjegyzések</label>
                    <textarea
                      value={bulkTemplate.notes}
                      onChange={(e) => setBulkTemplate({ ...bulkTemplate, notes: e.target.value })}
                      rows={2}
                      placeholder="pl.: Beteg, különleges gondozás szükséges..."
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Azonosítók lista */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>🐄 Állatok adatai</h3>
                    <button
                      type="button"
                      onClick={addBulkRow}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Plus size={16} /> Sor hozzáadása
                    </button>
                  </div>
                  
                  <div className={`space-y-3 max-h-64 overflow-y-auto ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4`}>
                    {bulkAnimals.map((animal, index) => (
                      <div key={index} className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Azonosító (pl.: HU123)"
                          value={animal.identifier}
                          onChange={(e) => updateBulkAnimal(index, 'identifier', e.target.value)}
                          className={`flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="Név (pl.: Büdi)"
                          value={animal.name}
                          onChange={(e) => updateBulkAnimal(index, 'name', e.target.value)}
                          className={`flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeBulkRow(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ✅ Egy nemnél legalább az azonositu vagy a név kötelező
                  </p>
                </div>

                {/* Submit buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t" style={{borderColor: isDarkMode ? '#374151' : '#e5e7eb'}}>
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
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium border border-green-700"
                  >
                    ✅ {bulkAnimals.length} állat feltöltése
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        )}

        {/* Modal - állat szerkesztése */}
        {showEditForm && editingAnimal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6 sticky top-0 z-10" style={{background: isDarkMode ? '#1f2937' : 'white'}}>
                <div>
                  <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Állat szerkesztése</h2>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1`}>{editingAnimal.name || editingAnimal.identifier}</p>
                </div>
                <button
                  onClick={() => { setShowEditForm(false); setEditingAnimal(null); }}
                  className={`${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} rounded-full p-1.5 transition-colors`}
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Név</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="pl.: Csepp, Bütyök"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Faj *</label>
                    <input
                      type="text"
                      value={formData.species}
                      onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                      placeholder="pl.: Ló, Marha, Sertés"
                      required
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Fajta</label>
                    <input
                      type="text"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="pl.: Arab telivér"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Azonosító *</label>
                    <input
                      type="text"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      placeholder="pl.: HU034523"
                      required
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Születési dátum</label>
                    <input
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Tartási hely</label>
                    <input
                      type="text"
                      value={formData.stable}
                      onChange={(e) => setFormData({ ...formData, stable: e.target.value })}
                      placeholder="pl.: 1. Istálló"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Nem</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="ismeretlen">Ismeretlen</option>
                      <option value="hím">Hím</option>
                      <option value="nőstény">Nőstény</option>
                      <option value="herélt">Herélt</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Cél/Feladat</label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">--Nincs kiválasztva--</option>
                      <option value="munka">Munkaállat</option>
                      <option value="tejtermelés">Tejtermelés</option>
                      <option value="tenyésztés">Tenyésztés</option>
                      <option value="hizlalás">Hizlalás</option>
                      <option value="ellés">Ellés</option>
                      <option value="húshasználat">Húshasználat</option>
                      <option value="egyéb">Egyéb</option>
                    </select>
                  </div>
                </div>

                {/* Szülõk linkhelése */}
                <div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-4`}>👨‍👩‍👧 Szülõk (opcionális)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Anya</label>
                      <select
                        value={formData.dam_id || ''}
                        onChange={(e) => setFormData({ ...formData, dam_id: e.target.value ? parseInt(e.target.value) : null })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">-- Nincs kiválasztva --</option>
                        {animals
                          .filter(a => a.id !== editingAnimal.id && (a.gender === 'nőstény' || a.gender === 'herélt' || a.gender === 'ismeretlen'))
                          .map(a => (
                            <option key={a.id} value={a.id}>{a.name || a.identifier}</option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Apa</label>
                      <select
                        value={formData.sire_id || ''}
                        onChange={(e) => setFormData({ ...formData, sire_id: e.target.value ? parseInt(e.target.value) : null })}
                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">-- Nincs kiválasztva --</option>
                        {animals
                          .filter(a => a.id !== editingAnimal.id && (a.gender === 'hím' || a.gender === 'ismeretlen'))
                          .map(a => (
                            <option key={a.id} value={a.id}>{a.name || a.identifier}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} mb-2`}>Megjegyzések</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="pl.: Sérülés, különleges ellátás, stb."
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t" style={{borderColor: isDarkMode ? '#374151' : '#e5e7eb'}}>
                  <button
                    type="button"
                    onClick={() => { setShowEditForm(false); setEditingAnimal(null); }}
                    className={`flex-1 px-6 py-3.5 rounded-xl transition-all duration-200 font-medium border ${
                      isDarkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-gray-600'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300'
                    }`}
                  >
                    Mégse
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200 font-medium border border-green-700"
                  >
                    ✅ Mentés
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tartalom - Grid nézet */}
        {viewMode === 'grid' ? (
          <>
            {sortedAnimals.length === 0 ? (
              <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl border p-12 text-center`}>
                <div className="flex flex-col items-center justify-center">
                  <div className={`w-20 h-20 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mb-6`}>
                    <Search className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={32} />
                  </div>
                  <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>
                    {search || selectedSpecies !== 'all' ? 'Nincs találat' : 'Még nincsenek állatok'}
                  </h3>
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} max-w-md mb-6`}>
                    {search || selectedSpecies !== 'all'
                      ? 'Próbálj meg másik kifejezéssel keresni vagy más fajtát választani!'
                      : 'Kezdd el az állatok rögzítését a "Új állat" gombra kattintva.'}
                  </p>
                  {(search || selectedSpecies !== 'all') && (
                    <button
                      onClick={() => {
                        setSearch('');
                        setSelectedSpecies('all');
                      }}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Összes állat megjelenítése
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedAnimals.map((animal) => (
                  <div
                    key={animal.id}
                    className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative group`}
                  >
                    <button
                      onClick={() => startEdit(animal)}
                      className="absolute top-4 right-14 z-10 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md hover:shadow-lg"
                      title="Állat szerkesztése"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(animal.id)}
                      disabled={deletingId === animal.id}
                      className="absolute top-4 right-4 z-10 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Állat törlése"
                    >
                      {deletingId === animal.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>

                    <div className={`h-2 bg-gradient-to-r ${getSpeciesColor(animal.species)}`} />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          {animal.name && (
                            <h3 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1 truncate`} title={animal.name}>
                              {animal.name}
                            </h3>
                          )}
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2 items-center">
                              <span className={`text-lg font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{animal.species}</span>
                              {animal.breed && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                                  {animal.breed}
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'
                            } w-fit`}>
                              {animal.identifier}
                            </span>
                          </div>
                        </div>
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${isDarkMode ? 'from-gray-700 to-gray-600' : 'from-gray-100 to-gray-200'} flex items-center justify-center flex-shrink-0 ml-3`}>
                          <span className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} font-bold text-lg`}>
                            {animal.name ? animal.name.charAt(0) : animal.species.charAt(0)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center">
                          <div className={`w-8 h-8 ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} rounded-lg flex items-center justify-center mr-3`}>
                            <i className={`fa-solid fa-calendar ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}></i>
                          </div>
                          <div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kor</p>
                            <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {formatAge(animal.birth_date)}
                            </p>
                            {animal.birth_date && (
                              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-0.5`}>
                                Született: {new Date(animal.birth_date).toLocaleDateString('hu-HU')}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div className={`w-8 h-8 ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-lg flex items-center justify-center mr-3`}>
                            <i className={`fa-solid fa-house ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}></i>
                          </div>
                          <div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Istálló</p>
                            <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {animal.stable || 'Nincs megadva'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div className={`w-8 h-8 ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-100'} rounded-lg flex items-center justify-center mr-3`}>
                            <i className={`fa-solid fa-venus-mars ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}></i>
                          </div>
                          <div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nem</p>
                            <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {animal.gender === 'hím' ? '♂ Hím' : animal.gender === 'nőstény' ? '♀ Nőstény' : animal.gender === 'herélt' ? '🐴 Herélt' : 'Ismeretlen'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <div className={`w-8 h-8 ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'} rounded-lg flex items-center justify-center mr-3`}>
                            <i className={`fa-solid fa-briefcase ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}></i>
                          </div>
                          <div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Feladat</p>
                            <p className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                              {animal.purpose || 'Nincs megadva'}
                            </p>
                          </div>
                        </div>

                        {animal.notes && (
                          <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Megjegyzések</p>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>
                              {animal.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                      <button 
                        onClick={() => handleSort('name')}
                        className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}
                      >
                        Név
                        <SortIcon field="name" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button 
                        onClick={() => handleSort('species')}
                        className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}
                      >
                        Faj
                        <SortIcon field="species" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button 
                        onClick={() => handleSort('breed')}
                        className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}
                      >
                        Fajta
                        <SortIcon field="breed" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      Azonosító
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button 
                        onClick={() => handleSort('birth_date')}
                        className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}
                      >
                        Kor
                        <SortIcon field="birth_date" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      <button 
                        onClick={() => handleSort('stable')}
                        className={`flex items-center gap-1 ${isDarkMode ? 'hover:text-green-400' : 'hover:text-green-700'}`}
                      >
                        Istálló
                        <SortIcon field="stable" />
                      </button>
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      Nem
                    </th>
                    <th className={`px-8 py-4 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-800'} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
                      Feladat
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
                  {sortedAnimals.map((animal, index) => (
                    <tr
                      key={animal.id}
                      className={`${
                        isDarkMode 
                          ? index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900/50'
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      } hover:${isDarkMode ? 'bg-gray-700' : 'bg-green-50/50'} transition-colors`}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getSpeciesColor(animal.species)} flex items-center justify-center`}>
                            <span className="text-white font-medium text-sm">
                              {animal.name ? animal.name.charAt(0) : animal.species.charAt(0)}
                            </span>
                          </div>
                          <div>
                            {animal.name && (
                              <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{animal.name}</div>
                            )}
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{animal.species}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-8 py-5 font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{animal.species}</td>
                      <td className="px-8 py-5">
                        <span className={`font-medium ${animal.breed ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                          {animal.breed || '-'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {animal.identifier}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className={`font-medium ${animal.birth_date ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                            {formatAge(animal.birth_date)}
                          </span>
                          {animal.birth_date && (
                            <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              {new Date(animal.birth_date).toLocaleDateString('hu-HU')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`font-medium ${animal.stable ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                          {animal.stable || '-'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {animal.gender === 'hím' ? '♂' : animal.gender === 'nőstény' ? '♀' : animal.gender === 'herélt' ? '🐴' : '-'} {animal.gender || 'Nincs adat'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`font-medium text-sm ${animal.purpose ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                          {animal.purpose || '-'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-sm ${animal.notes ? (isDarkMode ? 'text-gray-300' : 'text-gray-700') : (isDarkMode ? 'text-gray-600' : 'text-gray-400')}`}>
                          {animal.notes ? (animal.notes.length > 30 ? `${animal.notes.substring(0, 30)}...` : animal.notes) : '-'}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <button
                          onClick={() => handleDelete(animal.id)}
                          disabled={deletingId === animal.id}
                          className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Törlés"
                        >
                          {deletingId === animal.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Összegzés */}
        {animals.length > 0 && (
          <div className={`mt-8 p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100'} rounded-2xl border`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-1`}>Statisztika</h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Összesen <span className="font-semibold text-green-600">{sortedAnimals.length}</span> állat
                  {search && <span> a(z) "<span className="font-semibold">{search}</span>" keresésre</span>}
                  {selectedSpecies !== 'all' && <span> a(z) "<span className="font-semibold">{selectedSpecies}</span>" fajtából</span>}
                  <span> | Rendezve: <span className="font-semibold">
                    {sortField === 'name' && 'Név'}
                    {sortField === 'species' && 'Faj'}
                    {sortField === 'breed' && 'Fajta'}
                    {sortField === 'birth_date' && 'Kor'}
                    {sortField === 'stable' && 'Istálló'}
                  </span> ({sortDirection === 'asc' ? 'növekvő' : 'csökkenő'})</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {uniqueSpecies
                  .filter(s => s !== 'all')
                  .map(species => (
                    <span key={species} className={`px-3 py-1 border rounded-full text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-gray-300' 
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}>
                      {species}: <span className="font-semibold">{animals.filter(a => a.species === species).length}</span>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Animals;