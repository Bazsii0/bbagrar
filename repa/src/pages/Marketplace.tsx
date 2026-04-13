// pages/Marketplace.tsx
import { useEffect, useState } from 'react';
import { Plus, X, Search, Filter, MapPin, Phone, Mail, Calendar, Tag, ChevronRight, ChevronLeft, Trash2, Edit } from 'lucide-react';
import { getMarketplace, addMarketplaceItem, deleteMarketplaceItem, updateMarketplaceItem } from '../db/operations';
import { apiRequest } from '../api/http';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../auth/AuthContext';

// Define the possible status values as a type
type ItemStatus = 'aktív' | 'eladva' | 'függőben' | 'inaktív';

interface MarketplaceItem {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  type: string;
  price: number;
  image_url?: string;
  images?: string[];
  status: ItemStatus;
  created_at?: string;
  location?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0 Ft';
  }
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft';
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Ma';
  if (diffDays === 1) return 'Tegnap';
  if (diffDays < 7) return `${diffDays} napja`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hete`;
  
  return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
};

const getTypeColor = (type: string, isDarkMode: boolean): { bg: string; text: string; border: string } => {
  const defaultColors = isDarkMode
    ? { bg: 'bg-gray-800', text: 'text-gray-300', border: 'border-gray-700' }
    : { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
  
  if (isDarkMode) {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'állat': { bg: 'bg-amber-900/30', text: 'text-amber-300', border: 'border-amber-700' },
      'föld': { bg: 'bg-emerald-900/30', text: 'text-emerald-300', border: 'border-emerald-700' },
      'gép': { bg: 'bg-blue-900/30', text: 'text-blue-300', border: 'border-blue-700' },
      'egyéb': { bg: 'bg-gray-800', text: 'text-gray-300', border: 'border-gray-700' },
    };
    return colors[type] || defaultColors;
  } else {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      'állat': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
      'föld': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
      'gép': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
      'egyéb': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
    };
    return colors[type] || defaultColors;
  }
};

const getStatusColor = (status: ItemStatus, isDarkMode: boolean): { bg: string; text: string } => {
  const defaultColors = isDarkMode 
    ? { bg: 'bg-gray-800', text: 'text-gray-400' }
    : { bg: 'bg-gray-100', text: 'text-gray-600' };
  
  if (isDarkMode) {
    const colors: Record<ItemStatus, { bg: string; text: string }> = {
      'aktív': { bg: 'bg-green-900/30', text: 'text-green-300' },
      'eladva': { bg: 'bg-gray-800', text: 'text-gray-400' },
      'függőben': { bg: 'bg-yellow-900/30', text: 'text-yellow-300' },
      'inaktív': { bg: 'bg-red-900/30', text: 'text-red-300' },
    };
    return colors[status] || defaultColors;
  } else {
    const colors: Record<ItemStatus, { bg: string; text: string }> = {
      'aktív': { bg: 'bg-green-100', text: 'text-green-800' },
      'eladva': { bg: 'bg-gray-100', text: 'text-gray-600' },
      'függőben': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'inaktív': { bg: 'bg-red-100', text: 'text-red-800' },
    };
    return colors[status] || defaultColors;
  }
};

const Marketplace = () => {
  const { isDarkMode } = useTheme();
  const { user, isLoading: authLoading, token } = useAuth();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MarketplaceItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState<MarketplaceItem | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MarketplaceItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'állat',
    price: '',
    image_files: [] as File[],
    location: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  });

  // Debug logok
  console.log('Marketplace - Auth loading:', authLoading);
  console.log('Marketplace - Current user:', user);

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await getMarketplace();
      console.log('Betöltött hirdetések:', data);
      const itemsWithDate = (data as MarketplaceItem[]).map(item => {
        let validStatus: ItemStatus = 'aktív';
        
        if (item.status && ['aktív', 'eladva', 'függőben', 'inaktív'].includes(item.status)) {
          validStatus = item.status as ItemStatus;
        }
        
        return {
          ...item,
          price: Number(item.price),
          status: validStatus,
          created_at: item.created_at || new Date().toISOString(),
        };
      });
      setItems(itemsWithDate);
      setFilteredItems(itemsWithDate);
    } catch (error) {
      console.error('Hiba a betöltéskor:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    let result = [...items];
    
    if (searchTerm) {
      result = result.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedType !== 'all') {
      result = result.filter(item => item.type === selectedType);
    }
    
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'newest':
        default:
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      }
    });
    
    setFilteredItems(result);
  }, [items, searchTerm, selectedType, sortBy]);

  const isOwner = (item: MarketplaceItem) => {
    const result = user && item.user_id === user.id;
    console.log(`🔍 isOwner - Hirdetés ID: ${item.id}, Hirdetés user_id: ${item.user_id}, User ID: ${user?.id}, Eredmény: ${result}`);
    return result;
  };

  const handleEdit = (item: MarketplaceItem) => {
    console.log('✏️ Szerkesztés indítása:', item);
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || '',
      type: item.type,
      price: item.price.toString(),
      image_files: [],
      location: item.location || '',
      contact_name: item.contact_name || '',
      contact_phone: item.contact_phone || '',
      contact_email: item.contact_email || '',
    });
    const existingImages = item.images && item.images.length > 0 
      ? item.images 
      : (item.image_url ? [item.image_url] : []);
    setImagePreviews(existingImages);
    setShowEditForm(true);
    setShowDetails(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const newFiles = [...formData.image_files, ...files];
    setFormData({ ...formData, image_files: newFiles });
    
    // Előnézetek készítése az új fájlokból
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImagePreview = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      image_files: prev.image_files.filter((_, i) => i !== index)
    }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    
    try {
      if (!formData.title || !formData.price) {
        alert('Kérlek töltsd ki a kötelező mezőket!');
        return;
      }

      // FormData létrehozása update-hez
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description || '');
      fd.append('type', formData.type);
      fd.append('price', formData.price);
      fd.append('location', formData.location || '');
      fd.append('contact_name', formData.contact_name || '');
      fd.append('contact_phone', formData.contact_phone || '');
      fd.append('contact_email', formData.contact_email || '');
      
      // Új képek hozzáadása, ha vannak
      if (formData.image_files.length > 0) {
        formData.image_files.forEach(file => {
          fd.append('images', file);
        });
      }
      
      console.log('📤 Hirdetés frissítése küldése:', { id: editingItem.id });
      
      // Közvetlenül apiRequest-et használunk FormData-val
      await apiRequest(`/api/marketplace/${editingItem.id}`, {
        method: 'PUT',
        token,
        body: fd
      });
      
      setShowEditForm(false);
      setEditingItem(null);
      setImagePreviews([]);
      await loadItems();
      console.log('✅ Frissítés sikeres');
    } catch (error) {
      console.error('❌ Hiba frissítéskor:', error);
      alert('Hiba történt a frissítés során: ' + (error as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.title || !formData.price) {
        alert('Kérlek töltsd ki a kötelező mezőket!');
        return;
      }

      // FormData létrehozása
      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('description', formData.description || '');
      fd.append('type', formData.type);
      fd.append('price', formData.price);
      fd.append('location', formData.location || '');
      fd.append('contact_name', formData.contact_name || '');
      fd.append('contact_phone', formData.contact_phone || '');
      fd.append('contact_email', formData.contact_email || '');
      
      // Képek hozzáadása, ha vannak
      if (formData.image_files.length > 0) {
        formData.image_files.forEach(file => {
          fd.append('images', file);
        });
      }
      
      // Debug: sorolunk fel mit küldjünk
      console.log('📤 FormData tartalma:');
      for (let [key, value] of fd.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: "${value}"`);
        }
      }
      console.log('📤 Új hirdetés küldése képpel');
      
      // Közvetlenül apiRequest-et használunk FormData-val
      await apiRequest('/api/marketplace', {
        method: 'POST',
        token,
        body: fd
      });
      
      setFormData({ 
        title: '', 
        description: '', 
        type: 'állat', 
        price: '', 
        image_files: [],
        location: '', 
        contact_name: '', 
        contact_phone: '', 
        contact_email: '' 
      });
      setImagePreviews([]);
      
      setShowForm(false);
      await loadItems();
      console.log('✅ Új hirdetés sikeresen létrehozva');
    } catch (error) {
      console.error('❌ Hiba mentéskor:', error);
      alert('Hiba történt a mentés során: ' + (error as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a hirdetést?')) return;
    try {
      console.log('🗑️ Törlés indítása, ID:', id);
      await deleteMarketplaceItem(id);
      await loadItems();
      if (showDetails?.id === id) setShowDetails(null);
      if (editingItem?.id === id) setShowEditForm(false);
      console.log('✅ Törlés sikeres');
    } catch (error) {
      console.error('❌ Hiba törléskor:', error);
      alert('Hiba történt a törlés során: ' + (error as Error).message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${isDarkMode ? 'bg-gray-900' : ''}`}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isDarkMode ? 'border-green-400 border-t-transparent' : 'border-green-500 border-t-transparent'} rounded-full animate-spin mx-auto mb-4`}></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto ${isDarkMode ? 'text-gray-200' : ''}`}>
      {/* Fejléc */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Piactér</h1>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>Vásárolj és adj el mezőgazdasági termékeket</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
        >
          <Plus size={20} />
          Új hirdetés feladása
        </button>
      </div>

      {/* Szűrő sáv */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border p-4 mb-6`}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
            <input
              type="text"
              placeholder="Keresés hirdetések között..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
            >
              <option value="all">Összes típus</option>
              <option value="állat">Állat</option>
              <option value="föld">Földterület</option>
              <option value="gép">Mezőgazdasági gép</option>
              <option value="egyéb">Egyéb</option>
            </select>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
          >
            <option value="newest">Legfrissebb</option>
            <option value="price_asc">Ár: alacsony → magas</option>
            <option value="price_desc">Ár: magas → alacsony</option>
          </select>
          
          <div className={`flex items-center gap-1 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} p-1 rounded-xl`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' 
                  ? isDarkMode 
                    ? 'bg-gray-800 text-white shadow-sm' 
                    : 'bg-white text-gray-900 shadow-sm'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' 
                  ? isDarkMode 
                    ? 'bg-gray-800 text-white shadow-sm' 
                    : 'bg-white text-gray-900 shadow-sm'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-gray-300'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className={`mt-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {filteredItems.length} hirdetés található
          {selectedType !== 'all' && ` • ${selectedType}`}
          {searchTerm && ` • "${searchTerm}"`}
        </div>
      </div>

      {/* Hirdetések */}
      {filteredItems.length === 0 ? (
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border p-12 text-center`}>
          <div className={`w-20 h-20 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Search size={32} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
          </div>
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Nincs találat</h3>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>Próbálj meg más keresési feltételeket</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedType('all'); }}
            className={`${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'} font-medium`}
          >
            Szűrők törlése
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
          : "space-y-4"
        }>
          {filteredItems.map((item) => {
            const typeStyle = getTypeColor(item.type, isDarkMode);
            const statusStyle = getStatusColor(item.status, isDarkMode);
            
            if (viewMode === 'grid') {
              return (
                <div 
                  key={item.id} 
                  className={`group ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'} rounded-2xl shadow-sm border overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer`}
                  onClick={() => { setCarouselIndex(0); setShowDetails(item); }}
                >
                  <div className={`relative h-56 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden`}>
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${isDarkMode ? 'from-gray-700 to-gray-600' : 'from-gray-100 to-gray-200'}`}>
                        <div className="text-center">
                          <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'} rounded-full flex items-center justify-center mx-auto mb-2`}>
                            <Tag size={32} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
                          </div>
                          <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Nincs kép</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <div className="absolute top-3 right-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                        {item.type}
                      </span>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <div className="flex items-end justify-between">
                        <p className="text-2xl font-bold text-white">
                          {formatCurrency(item.price)}
                        </p>
                        {item.images && item.images.length > 1 && (
                          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                            {item.images.length} kép
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white group-hover:text-green-400' : 'text-gray-900 group-hover:text-green-600'} mb-2 line-clamp-1 transition-colors`}>
                      {item.title}
                    </h3>
                    
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mb-4 line-clamp-2 h-10`}>
                      {item.description || 'Nincs leírás'}
                    </p>
                    
                    <div className={`flex items-center justify-between text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      {item.location && (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span className="truncate max-w-[100px]">{item.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div 
                  key={item.id}
                  className={`group flex gap-4 ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-gray-200'} rounded-2xl shadow-sm border p-4 hover:shadow-md transition-all cursor-pointer`}
                  onClick={() => { setCarouselIndex(0); setShowDetails(item); }}
                >
                  <div className={`w-32 h-32 flex-shrink-0 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} overflow-hidden`}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${isDarkMode ? 'from-gray-700 to-gray-600' : 'from-gray-100 to-gray-200'}`}>
                        <Tag size={24} className={isDarkMode ? 'text-gray-400' : 'text-gray-400'} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white group-hover:text-green-400' : 'text-gray-900 group-hover:text-green-600'} transition-colors truncate`}>
                        {item.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border flex-shrink-0 ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                        {item.type}
                      </span>
                    </div>
                    
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mb-3 line-clamp-2`}>
                      {item.description || 'Nincs leírás'}
                    </p>
                    
                    <div className={`flex items-center gap-4 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(item.created_at)}
                      </span>
                      {item.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {item.location}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(item.price)}</p>
                    <ChevronRight size={20} className={`${isDarkMode ? 'text-gray-600' : 'text-gray-300'} ml-auto mt-2 group-hover:text-green-500 transition-colors`} />
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* Új hirdetés modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Új hirdetés feladása</h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Töltsd ki az alábbi adatokat</p>
              </div>
              <button 
                onClick={() => setShowForm(false)} 
                className={`${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} p-2 rounded-lg transition-colors`}
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Hirdetés címe *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="pl.: Tejelő tehén eladó"
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Típus *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="állat">Állat</option>
                    <option value="föld">Földterület</option>
                    <option value="gép">Mezőgazdasági gép</option>
                    <option value="egyéb">Egyéb</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Ár (Ft) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      placeholder="0"
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-medium`}>Ft</span>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Helyszín</label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="pl.: Bács-Kiskun megye, Kiskunhalas"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Leírás</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Részletes leírás a termékről..."
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Képek feltöltése</label>
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 hover:border-green-500 bg-gray-700/50' 
                      : 'border-gray-300 hover:border-green-500 bg-gray-50'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-input-new"
                    />
                    <label htmlFor="image-input-new" className="cursor-pointer block">
                      {imagePreviews.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {imagePreviews.map((preview, idx) => (
                              <div key={idx} className="relative group/img">
                                <img src={preview} alt={`Preview ${idx + 1}`} className="h-24 w-24 rounded-lg object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImagePreview(idx); }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/img:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Kattints további képek hozzáadásához</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <svg className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Kattints a képek kiválasztásához</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Több képet is kiválaszthatsz egyszerre</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>JPG, PNG, GIF vagy WebP formátum. Maximum 10MB / kép, legfeljebb 10 kép</p>
                </div>
                
                <div className={`md:col-span-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-3`}>Elérhetőség (opcionális)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Név</label>
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="Kapcsolattartó neve"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Telefon</label>
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+36 30 123 4567"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Email</label>
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="pelda@email.com"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  Hirdetés feladása
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`flex-1 px-6 py-3 rounded-xl transition-colors font-medium ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Szerkesztés modal */}
      {showEditForm && editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Hirdetés szerkesztése</h2>
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm`}>Módosítsd a hirdetés adatait</p>
              </div>
              <button 
                onClick={() => setShowEditForm(false)} 
                className={`${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} p-2 rounded-lg transition-colors`}
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Hirdetés címe *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="pl.: Tejelő tehén eladó"
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Típus *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="állat">Állat</option>
                    <option value="föld">Földterület</option>
                    <option value="gép">Mezőgazdasági gép</option>
                    <option value="egyéb">Egyéb</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Ár (Ft) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                      placeholder="0"
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent pr-12 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <span className={`absolute right-4 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} font-medium`}>Ft</span>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Helyszín</label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="pl.: Bács-Kiskun megye, Kiskunhalas"
                      className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Leírás</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Részletes leírás a termékről..."
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Képek feltöltése</label>
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                    isDarkMode 
                      ? 'border-gray-600 hover:border-green-500 bg-gray-700/50' 
                      : 'border-gray-300 hover:border-green-500 bg-gray-50'
                  }`}>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                      id="image-input-edit"
                    />
                    <label htmlFor="image-input-edit" className="cursor-pointer block">
                      {imagePreviews.length > 0 ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2 justify-center">
                            {imagePreviews.map((preview, idx) => (
                              <div key={idx} className="relative group/img">
                                <img src={preview} alt={`Preview ${idx + 1}`} className="h-24 w-24 rounded-lg object-cover" />
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeImagePreview(idx); }}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/img:opacity-100 transition-opacity"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Kattints további képek hozzáadásához</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <svg className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Kattints a képek kiválasztásához</p>
                          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Több képet is kiválaszthatsz (opcionális)</p>
                        </div>
                      )}
                    </label>
                  </div>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'} mt-1`}>JPG, PNG, GIF vagy WebP formátum. Maximum 10MB / kép, legfeljebb 10 kép</p>
                </div>
                
                <div className={`md:col-span-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pt-4`}>
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-3`}>Elérhetőség (opcionális)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Név</label>
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        placeholder="Kapcsolattartó neve"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Telefon</label>
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+36 30 123 4567"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>Email</label>
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="pelda@email.com"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  Módosítások mentése
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className={`flex-1 px-6 py-3 rounded-xl transition-colors font-medium ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Részletek modal */}
      {showDetails && (() => {
        const detailImages = showDetails.images && showDetails.images.length > 0 
          ? showDetails.images 
          : (showDetails.image_url ? [showDetails.image_url] : []);
        
        return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl w-full max-w-3xl shadow-2xl my-8 overflow-hidden`}>
            {/* Kép fejléc / Carousel */}
            <div className={`relative h-64 md:h-80 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
              {detailImages.length > 0 ? (
                <>
                  <img 
                    src={detailImages[carouselIndex] || detailImages[0]} 
                    alt={showDetails.title} 
                    className="w-full h-full object-cover"
                  />
                  {/* Carousel navigáció */}
                  {detailImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCarouselIndex(prev => prev <= 0 ? detailImages.length - 1 : prev - 1); }}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'bg-gray-800/80 hover:bg-gray-800 text-white' : 'bg-white/80 hover:bg-white text-gray-800'} p-2 rounded-full shadow-lg transition-colors`}
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCarouselIndex(prev => prev >= detailImages.length - 1 ? 0 : prev + 1); }}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'bg-gray-800/80 hover:bg-gray-800 text-white' : 'bg-white/80 hover:bg-white text-gray-800'} p-2 rounded-full shadow-lg transition-colors`}
                      >
                        <ChevronRight size={24} />
                      </button>
                      {/* Pont indikátorok */}
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2">
                        {detailImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setCarouselIndex(idx); }}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                              idx === carouselIndex 
                                ? 'bg-white scale-110' 
                                : 'bg-white/50 hover:bg-white/75'
                            }`}
                          />
                        ))}
                      </div>
                      {/* Kép számláló */}
                      <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                        {carouselIndex + 1} / {detailImages.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${isDarkMode ? 'from-gray-700 to-gray-600' : 'from-gray-100 to-gray-200'}`}>
                  <Tag size={64} className={isDarkMode ? 'text-gray-600' : 'text-gray-300'} />
                </div>
              )}
              
              <button 
                onClick={() => setShowDetails(null)}
                className={`absolute top-4 right-4 ${isDarkMode ? 'bg-gray-800/90 hover:bg-gray-800 text-gray-300' : 'bg-white/90 hover:bg-white text-gray-700'} p-2 rounded-full shadow-lg transition-colors`}
              >
                <X size={24} />
              </button>
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${getTypeColor(showDetails.type, isDarkMode).bg} ${getTypeColor(showDetails.type, isDarkMode).text}`}>
                      {showDetails.type}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">{showDetails.title}</h2>
                  </div>
                  <p className="text-3xl font-bold text-white">{formatCurrency(showDetails.price)}</p>
                </div>
              </div>
            </div>
            
            {/* Tartalom */}
            <div className="p-6">
              {/* Thumbnail sáv több képnél */}
              {detailImages.length > 1 && (
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {detailImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCarouselIndex(idx)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === carouselIndex 
                          ? 'border-green-500 ring-2 ring-green-500/30' 
                          : isDarkMode 
                            ? 'border-gray-600 hover:border-gray-400' 
                            : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <img src={img} alt={`Kép ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className={`flex flex-wrap gap-4 mb-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="flex items-center gap-1">
                  <Calendar size={16} />
                  Feladva: {formatDate(showDetails.created_at)}
                </span>
                {showDetails.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={16} />
                    {showDetails.location}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(showDetails.status, isDarkMode).bg} ${getStatusColor(showDetails.status, isDarkMode).text}`}>
                  {showDetails.status}
                </span>
              </div>
              
              <div className="prose max-w-none mb-8">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Leírás</h3>
                <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} whitespace-pre-wrap`}>
                  {showDetails.description || 'Nincs megadva leírás.'}
                </p>
              </div>
              
              {/* Elérhetőség */}
              {(showDetails.contact_name || showDetails.contact_phone || showDetails.contact_email) && (
                <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4 mb-6`}>
                  <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-3`}>Elérhetőség</h3>
                  <div className="space-y-2">
                    {showDetails.contact_name && (
                      <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{showDetails.contact_name}</p>
                    )}
                    {showDetails.contact_phone && (
                      <a href={`tel:${showDetails.contact_phone}`} className={`flex items-center gap-2 ${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'}`}>
                        <Phone size={16} />
                        {showDetails.contact_phone}
                      </a>
                    )}
                    {showDetails.contact_email && (
                      <a href={`mailto:${showDetails.contact_email}`} className={`flex items-center gap-2 ${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'}`}>
                        <Mail size={16} />
                        {showDetails.contact_email}
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Műveletek - CSAK SAJÁT HIRDETÉSNÉL */}
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDetails(null)}
                  className={`flex-1 px-6 py-3 rounded-xl transition-colors font-medium ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Bezárás
                </button>
                
                {isOwner(showDetails) && (
                  <>
                    <button 
                      onClick={() => {
                        setShowDetails(null);
                        handleEdit(showDetails);
                      }}
                      className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-xl transition-colors font-medium ${
                        isDarkMode 
                          ? 'border-blue-700 text-blue-400 hover:bg-blue-900/30' 
                          : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      <Edit size={18} />
                      Szerkesztés
                    </button>
                    <button 
                      onClick={() => handleDelete(showDetails.id)}
                      className={`flex items-center justify-center gap-2 px-6 py-3 border rounded-xl transition-colors font-medium ${
                        isDarkMode 
                          ? 'border-red-700 text-red-400 hover:bg-red-900/30' 
                          : 'border-red-300 text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={18} />
                      Törlés
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
};

export default Marketplace;