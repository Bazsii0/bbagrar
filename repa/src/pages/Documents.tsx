// pages/Documents.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { Plus, X, FileText, Download, Trash2, Link as LinkIcon, Search, Filter, XCircle } from 'lucide-react';
import { getDocuments, addDocument, deleteDocument } from '../db/operations';
import { apiRequest } from '../api/http';
import { useTheme } from '../context/ThemeContext';

interface Document {
  id: number;
  title: string;
  category: string;
  filename: string;
  filepath: string;
  upload_date: string;
  entity_type: 'animal' | 'land' | 'client' | 'general';
  entity_id: number | null;
  entity_name?: string;
  file_size?: number;
  mime_type?: string;
}

interface Entity {
  id: number;
  name: string;
  identifier?: string;
  plot_number?: string;
  company_name?: string;
}

const Documents: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [animals, setAnimals] = useState<Entity[]>([]);
  const [lands, setLands] = useState<Entity[]>([]);
  const [clients, setClients] = useState<Entity[]>([]);
  
  // Szűrő állapotok
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    entity_type: 'general' as 'animal' | 'land' | 'client' | 'general',
    entity_id: '',
    file: null as File | null
  });

  const loadDocuments = async () => {
    const data = await getDocuments();
    setDocuments(data as Document[]);
    setFilteredDocuments(data as Document[]);
  };

  const loadEntities = async () => {
    try {
      const token = localStorage.getItem('bbagrar_token');
      const [animalsData, landsData, clientsData] = await Promise.all([
        apiRequest<Entity[]>('/api/documents/entities/animals', { token }),
        apiRequest<Entity[]>('/api/documents/entities/lands', { token }),
        apiRequest<Entity[]>('/api/documents/entities/clients', { token })
      ]);
      
      setAnimals(animalsData);
      setLands(landsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading entities:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
    loadEntities();
  }, []);

  // Szűrési logika
  useEffect(() => {
    let filtered = [...documents];

    // Szöveges keresés (cím, fájlnév)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(term) ||
        doc.filename.toLowerCase().includes(term) ||
        (doc.entity_name && doc.entity_name.toLowerCase().includes(term))
      );
    }

    // Kategória szűrő
    if (selectedCategory) {
      filtered = filtered.filter(doc => doc.category === selectedCategory);
    }

    // Entitás típus szűrő
    if (selectedEntityType) {
      filtered = filtered.filter(doc => doc.entity_type === selectedEntityType);
    }

    // Dátum szűrő - tól
    if (dateFrom) {
      filtered = filtered.filter(doc => new Date(doc.upload_date) >= new Date(dateFrom));
    }

    // Dátum szűrő - ig
    if (dateTo) {
      filtered = filtered.filter(doc => new Date(doc.upload_date) <= new Date(dateTo));
    }

    setFilteredDocuments(filtered);
  }, [documents, searchTerm, selectedCategory, selectedEntityType, dateFrom, dateTo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, file, title: file.name });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      alert('Kérlek válassz ki egy fájlt!');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const formDataToSend = new FormData();
    formDataToSend.append('file', formData.file);
    formDataToSend.append('title', formData.title);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('entity_type', formData.entity_type);
    
    if (formData.entity_id) {
      formDataToSend.append('entity_id', formData.entity_id);
    }

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await addDocument(formDataToSend);

      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setFormData({ 
          title: '', 
          category: '', 
          entity_type: 'general',
          entity_id: '',
          file: null 
        });
        setShowForm(false);
        setUploadProgress(0);
        loadDocuments();
      }, 500);
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Hiba történt a feltöltés során!');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, filename: string) => {
    if (window.confirm(`Biztosan törölni szeretnéd a(z) "${filename}" dokumentumot?`)) {
      try {
        await deleteDocument(id);
        await loadDocuments();
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Hiba történt a törlés során!');
      }
    }
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      const token = localStorage.getItem('bbagrar_token');
      const response = await fetch(`/api/documents/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Hiba történt a letöltés során!');
    }
  };

  // Szűrők resetelése
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedEntityType('');
    setDateFrom('');
    setDateTo('');
  };

  // Aktív szűrők száma
  const activeFiltersCount = [
    searchTerm, selectedCategory, selectedEntityType, dateFrom, dateTo
  ].filter(f => f && f !== '').length;

  const categories = ['Bérleti szerződések', 'Támogatási kérelmek', 'Hivatalos iratok', 'Számlák', 'Egyéb'];
  const entityTypes = [
    { value: 'animal', label: 'Állat' },
    { value: 'land', label: 'Föld' },
    { value: 'client', label: 'Kliens' },
    { value: 'general', label: 'Általános' }
  ];

  const getEntityDisplay = (doc: Document) => {
    if (!doc.entity_id) return '-';
    
    switch (doc.entity_type) {
      case 'animal':
        return `Állat: ${doc.entity_name || 'Ismeretlen'}`;
      case 'land':
        return `Föld: ${doc.entity_name || 'Ismeretlen'}`;
      case 'client':
        return `Kliens: ${doc.entity_name || 'Ismeretlen'}`;
      default:
        return '-';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className={isDarkMode ? 'text-gray-200' : ''}>
      <div className="flex justify-between items-center mb-8">
        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Dokumentáció</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Új dokumentum
        </button>
      </div>

      {/* Keresés és szűrő sáv */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow mb-6 p-4`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Keresőmező */}
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
              <input
                type="text"
                placeholder="Keresés cím, fájlnév vagy kapcsolódó entitás alapján..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
          
          {/* Szűrő gomb */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeFiltersCount > 0
                ? 'bg-green-600 text-white'
                : isDarkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={20} />
            Szűrés
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white text-green-600 rounded-full text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
          
          {/* Reset gomb */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <XCircle size={20} />
              Összes szűrő törlése
            </button>
          )}
        </div>

        {/* Részletes szűrők */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kategória szűrő */}
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Kategória
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Összes kategória</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Entitás típus szűrő */}
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Entitás típus
                </label>
                <select
                  value={selectedEntityType}
                  onChange={(e) => setSelectedEntityType(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Összes típus</option>
                  {entityTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Dátum szűrők */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Dátum tól
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Dátum ig
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Eredmények száma */}
        <div className={`mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Találatok: {filteredDocuments.length} / {documents.length} dokumentum
        </div>
      </div>

      {/* Kategória kártyák (szűrt számokkal) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {categories.map((category) => {
          const totalCount = documents.filter((doc) => doc.category === category).length;
          const filteredCount = filteredDocuments.filter((doc) => doc.category === category).length;
          const isActive = selectedCategory === category;
          
          return (
            <div 
              key={category} 
              onClick={() => setSelectedCategory(isActive ? '' : category)}
              className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow p-6 cursor-pointer transition-all hover:scale-105 ${
                isActive ? 'ring-2 ring-green-500' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 ${isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'} rounded-lg`}>
                  <FileText size={24} />
                </div>
              </div>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-1`}>{category}</p>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {filteredCount}
                </p>
                {filteredCount !== totalCount && (
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    / {totalCount}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dokumentumok táblázat */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-green-50 border-green-100'} border-b`}>
              <tr>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cím</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Kategória</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Kapcsolódó</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Fájlnév</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Feltöltés dátuma</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Műveletek</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-6 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {documents.length === 0 
                      ? 'Még nincsenek dokumentumok feltöltve'
                      : 'Nincs találat a megadott szűrők alapján'}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {doc.title}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      <span className={`inline-block px-2 py-1 rounded text-xs ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        <LinkIcon size={14} />
                        <span>{getEntityDisplay(doc)}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {doc.filename}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(doc.upload_date).toLocaleDateString('hu-HU')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownload(doc.id, doc.filename)}
                          className={`${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'} flex items-center gap-1 transition-colors`}
                          title="Letöltés"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id, doc.filename)}
                          className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} flex items-center gap-1 transition-colors`}
                          title="Törlés"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal form (marad a régi) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Új dokumentum feltöltése</h2>
              <button 
                onClick={() => setShowForm(false)} 
                className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                disabled={loading}
              >
                <X size={24} />
              </button>
            </div>
            
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mb-4">
                <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5`}>
                  <div 
                    className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 text-center`}>
                  Feltöltés: {uploadProgress}%
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Fájl kiválasztása *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  required
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
                <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>
                  Támogatott formátumok: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB)
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Cím *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Kategória *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Válassz kategóriát...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                  Kapcsolódó entitás
                </label>
                <select
                  value={formData.entity_type}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    entity_type: e.target.value as 'animal' | 'land' | 'client' | 'general',
                    entity_id: '' 
                  })}
                  disabled={loading}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="general">Általános</option>
                  <option value="animal">Állat</option>
                  <option value="land">Föld</option>
                  <option value="client">Kliens</option>
                </select>
              </div>

              {formData.entity_type !== 'general' && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                    Válassz {formData.entity_type === 'animal' ? 'állatot' : 
                             formData.entity_type === 'land' ? 'földet' : 'klienset'} *
                  </label>
                  <select
                    value={formData.entity_id}
                    onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                    required
                    disabled={loading}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Válassz...</option>
                    {formData.entity_type === 'animal' && animals.map(animal => (
                      <option key={animal.id} value={animal.id}>
                        {animal.name} ({animal.identifier})
                      </option>
                    ))}
                    {formData.entity_type === 'land' && lands.map(land => (
                      <option key={land.id} value={land.id}>
                        {land.name} {land.plot_number ? `- ${land.plot_number}` : ''}
                      </option>
                    ))}
                    {formData.entity_type === 'client' && clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.company_name ? `(${client.company_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                  {loading ? 'Feltöltés...' : 'Feltöltés'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
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
  );
};

export default Documents;