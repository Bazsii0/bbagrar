// pages/Clients.tsx
import { useEffect, useState } from 'react';
import { 
  Plus, X, Mail, Phone, MapPin, Building2, 
  User, Calendar, Edit, Trash2, Search,
  FileText, Globe, CreditCard
} from 'lucide-react';
import { getClients, addClient, deleteClient, updateClient, sendCircularEmail } from '../db/operations';
import { useTheme } from '../context/ThemeContext';

interface Client {
  id: number;
  user_id: number;
  name: string;
  company_name?: string;
  tax_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  website?: string;
  type?: string;
  payment_terms?: string;
  status: 'active' | 'inactive' | 'lead';
  notes?: string;
  last_contact?: string;
  created_at: string;
  updated_at?: string;
}

const Clients = () => {
  const { isDarkMode } = useTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [emailData, setEmailData] = useState({
    subject: '',
    message: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    tax_number: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Magyarország',
    contact_person: '',
    website: '',
    type: '',
    payment_terms: '',
    status: 'active' as 'active' | 'inactive' | 'lead',
    notes: '',
    last_contact: '',
  });

 const loadClients = async () => {
  const data = await getClients();
  console.log('loadClients - betöltött adatok:', data);
  if (Array.isArray(data)) {
    setClients(data);
    setFilteredClients(data);
  } else {
    console.error('loadClients - nem tömb a data:', data);
    setClients([]);
    setFilteredClients([]);
  }
};

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    let filtered = clients;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        client.name?.toLowerCase().includes(term) ||
        client.company_name?.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.phone?.toLowerCase().includes(term) ||
        client.contact_person?.toLowerCase().includes(term) ||
        client.city?.toLowerCase().includes(term)
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(client => client.type === filterType);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => client.status === filterStatus);
    }
    
    setFilteredClients(filtered);
  }, [searchTerm, filterType, filterStatus, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const processedData: any = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value === '') {
        processedData[key] = null;
      } else {
        processedData[key] = value;
      }
    });
    
    const clientData = {
      ...processedData,
      status: processedData.status || 'active',
      country: processedData.country || 'Magyarország',
      last_contact: processedData.last_contact || new Date().toISOString().split('T')[0]
    };
    
    console.log('Submitting client data:', clientData);
    
    try {
      if (editingClient) {
        await updateClient(editingClient.id, clientData);
      } else {
        await addClient(clientData);
      }
      
      setFormData({
        name: '',
        company_name: '',
        tax_number: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        postal_code: '',
        country: 'Magyarország',
        contact_person: '',
        website: '',
        type: '',
        payment_terms: '',
        status: 'active',
        notes: '',
        last_contact: '',
      });
      
      setEditingClient(null);
      setShowForm(false);
      await loadClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Hiba történt a mentés során!');
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      company_name: client.company_name || '',
      tax_number: client.tax_number || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      postal_code: client.postal_code || '',
      country: client.country || 'Magyarország',
      contact_person: client.contact_person || '',
      website: client.website || '',
      type: client.type || '',
      payment_terms: client.payment_terms || '',
      status: client.status || 'active',
      notes: client.notes || '',
      last_contact: client.last_contact || '',
    });
    setShowForm(true);
  };

const handleDelete = async (id: number) => {
  console.log('handleDelete meghívva, ID:', id, 'Típus:', typeof id);
  try {
    const result = await deleteClient(id);
    console.log('deleteClient eredmény:', result);
    
    if (result && result.success === true) {
      console.log('Sikeres törlés');
      setShowDeleteConfirm(null);
      await loadClients();
    } else {
      throw new Error('Sikertelen törlés');
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    alert('Hiba történt a törlés során: ' + (error instanceof Error ? error.message : 'Ismeretlen hiba'));
  }
};

const handleSendEmail = async () => {
  if (selectedClientIds.length === 0) {
    alert('Kérjük válassz ki legalább egy ügyfelet!');
    return;
  }

  if (!emailData.subject.trim() || !emailData.message.trim()) {
    alert('Kérjük töltsd ki a tárgy és az üzenet mezőket!');
    return;
  }

  // Összegyűjtjük az emailcímeket
  const selectedClients = clients.filter(c => selectedClientIds.includes(c.id));
  const emails = selectedClients
    .filter(c => c.email && c.email.trim())
    .map(c => c.email);

  if (!emails || emails.length === 0) {
    alert('Nincs érvényes emailcím a kiválasztott ügyfeleknek!');
    return;
  }

  try {
    const result = await sendCircularEmail(emails, emailData.subject, emailData.message);
    
    // Részletes üzenet az eredményről
    let message = `✅ ${result.message}`;
    
    // Ha vannak sikertelen emailek, mutasd meg melyik és miért
    if (result.details && result.details.length > 0) {
      const failed = result.details.filter((d: any) => !d.success);
      if (failed.length > 0) {
        message += '\n\n❌ Sikertelen:\n';
        failed.forEach((f: any) => {
          message += `   • ${f.email}: ${f.error}\n`;
        });
      }
    }
    
    alert(message);
    
    // Modal bezárása és resetelés csak ha sikerült legalább egy email
    if (result.success) {
      setShowEmailModal(false);
      setSelectedClientIds([]);
      setEmailData({ subject: '', message: '' });
    }
  } catch (error) {
    console.error('Email küldési hiba:', error);
    alert('❌ Hiba az email küldéskor: ' + (error instanceof Error ? error.message : 'Ismeretlen hiba'));
  }
};

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className={`px-2 py-1 ${isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'} rounded-full text-xs`}>Aktív</span>;
      case 'inactive':
        return <span className={`px-2 py-1 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'} rounded-full text-xs`}>Inaktív</span>;
      case 'lead':
        return <span className={`px-2 py-1 ${isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'} rounded-full text-xs`}>Lehetőség</span>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'felvásárló':
        return <span className={`px-2 py-1 ${isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'} rounded-full text-xs`}>Felvásárló</span>;
      case 'partner':
        return <span className={`px-2 py-1 ${isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800'} rounded-full text-xs`}>Partner</span>;
      case 'egyéb':
        return <span className={`px-2 py-1 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'} rounded-full text-xs`}>Egyéb</span>;
      default:
        return <span className={`px-2 py-1 ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800'} rounded-full text-xs`}>-</span>;
    }
  };

  return (
    <div className={isDarkMode ? 'text-gray-200' : ''}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Ügyfelek / Partnerek</h1>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setShowEmailModal(true)}
            className={`flex items-center gap-2 ${isDarkMode ? 'bg-gray-800 border-purple-700 text-purple-400 hover:bg-gray-700' : 'bg-white border-purple-600 text-purple-600 hover:bg-purple-50'} border px-4 py-2 rounded-lg transition-colors`}>
            <Mail size={20} />
            Kör-email
          </button>
          <button
            onClick={() => {
              setEditingClient(null);
              setFormData({
                name: '',
                company_name: '',
                tax_number: '',
                email: '',
                phone: '',
                address: '',
                city: '',
                postal_code: '',
                country: 'Magyarország',
                contact_person: '',
                website: '',
                type: '',
                payment_terms: '',
                status: 'active',
                notes: '',
                last_contact: '',
              });
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Új ügyfél
          </button>
        </div>
      </div>

      {/* Szűrők és kereső */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-4 rounded-lg shadow mb-6`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={20} />
            <input
              type="text"
              placeholder="Keresés név, email, telefon, város alapján..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Minden típus</option>
              <option value="felvásárló">Felvásárló</option>
              <option value="partner">Partner</option>
              <option value="egyéb">Egyéb</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Minden státusz</option>
              <option value="active">Aktív</option>
              <option value="inactive">Inaktív</option>
              <option value="lead">Lehetőség</option>
            </select>
          </div>
        </div>
      </div>

      {/* Űrlap modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-4xl my-8`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                {editingClient ? 'Ügyfél szerkesztése' : 'Új ügyfél hozzáadása'}
              </h2>
              <button onClick={() => setShowForm(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Alapadatok */}
                <div className="space-y-4">
                  <h3 className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Alapadatok</h3>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Kapcsolattartó neve * <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-xs`}>(magánszemély neve)</span>
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Pl. Kovács János"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>
                      Cégnév <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'} text-xs`}>(ha cég)</span>
                    </label>
                    <div className="relative">
                      <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Kft., Bt., Zrt. stb."
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Adószám</label>
                    <input
                      type="text"
                      value={formData.tax_number}
                      onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      placeholder="12345678-1-12"
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Típus</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">Válassz...</option>
                      <option value="felvásárló">Felvásárló</option>
                      <option value="partner">Partner (beszállító, szolgáltató)</option>
                      <option value="egyéb">Egyéb</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Státusz</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'lead' })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="active">Aktív</option>
                      <option value="inactive">Inaktív</option>
                      <option value="lead">Lehetőség (potenciális)</option>
                    </select>
                  </div>
                </div>

                {/* Elérhetőség */}
                <div className="space-y-4">
                  <h3 className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Elérhetőség</h3>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Email</label>
                    <div className="relative">
                      <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="pelda@email.hu"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Telefon</label>
                    <div className="relative">
                      <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="+36 30 123 4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Weboldal</label>
                    <div className="relative">
                      <Globe className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Fizetési feltételek</label>
                    <div className="relative">
                      <CreditCard className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        type="text"
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="30 nap, készpénz, átutalás..."
                      />
                    </div>
                  </div>
                </div>

                {/* Cím adatok */}
                <div className="space-y-4">
                  <h3 className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Cím</h3>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Ország</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Irányítószám</label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="1234"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Város</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Budapest"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Cím</label>
                    <div className="relative">
                      <MapPin className={`absolute left-3 top-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={2}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Utca, házszám..."
                      />
                    </div>
                  </div>
                </div>

                {/* Egyéb adatok */}
                <div className="space-y-4">
                  <h3 className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pb-2`}>Egyéb információk</h3>
                  
                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Utolsó kapcsolatfelvétel</label>
                    <div className="relative">
                      <Calendar className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <input
                        type="date"
                        value={formData.last_contact}
                        onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Megjegyzések</label>
                    <div className="relative">
                      <FileText className={`absolute left-3 top-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={4}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Fontos megjegyzések, megállapodások..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {editingClient ? 'Módosítások mentése' : 'Mentés'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
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

      {/* Törlés megerősítés modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'} mb-4`}>Törlés megerősítése</h2>
            <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>Biztosan törölni szeretnéd ezt az ügyfelet? Ez a művelet nem visszavonható.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  console.log('Törlés gomb megnyomva, ID:', showDeleteConfirm);
                  if (showDeleteConfirm) {
                    handleDelete(showDeleteConfirm);
                  } else {
                    console.error('Nincs törlendő ID!');
                  }
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Törlés
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                }`}
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl my-8`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Kör-email küldése
              </h2>
              <button onClick={() => setShowEmailModal(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Ügyfelek kiválasztása */}
              <div>
                <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-3`}>
                  Ügyfelek kiválasztása ({selectedClientIds.length} kiválasztva)
                </h3>
                <div className={`border rounded-lg ${isDarkMode ? 'border-gray-700 bg-gray-900/50 max-h-60' : 'border-gray-300 bg-gray-50 max-h-60'} overflow-y-auto`}>
                  {clients.length === 0 ? (
                    <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Nincs ügyfél
                    </div>
                  ) : (
                    clients.map((client) => (
                      <label key={client.id} className={`flex items-center gap-3 p-3 border-b ${isDarkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-white'} cursor-pointer`}>
                        <input
                          type="checkbox"
                          checked={selectedClientIds.includes(client.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClientIds([...selectedClientIds, client.id]);
                            } else {
                              setSelectedClientIds(selectedClientIds.filter(id => id !== client.id));
                            }
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <div className="flex-1">
                          <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {client.name}
                          </div>
                          {client.email && (
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {client.email}
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Email tárgy */}
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Tárgy *
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Email tárgy..."
                />
              </div>

              {/* Email üzenet */}
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Üzenet *
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Az email tartalmát ide írja be..."
                />
              </div>

              {/* Gombok */}
              <div className="flex gap-3 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}">
                <button
                  onClick={handleSendEmail}
                  className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Mail size={18} />
                  Küldés
                </button>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                  }`}
                >
                  Mégse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ügyfelek listája */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDarkMode ? 'bg-gray-900/50' : 'bg-green-50'} border-b ${isDarkMode ? 'border-gray-700' : 'border-green-100'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Név / Cég</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Elérhetőség</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cím</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Típus</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Státusz</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Utolsó kontakt</th>
                <th className={`px-6 py-3 text-right text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Műveletek</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-6 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {clients.length === 0 
                      ? 'Még nincsenek ügyfelek rögzítve' 
                      : 'Nincs találat a keresési feltételeknek megfelelően'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      <div className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{client.name}</div>
                      {client.company_name && (
                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{client.company_name}</div>
                      )}
                      {client.tax_number && (
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Adószám: {client.tax_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {client.email && (
                        <div className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-gray-300' : ''}`}>
                          <Mail size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                          <a href={`mailto:${client.email}`} className={`${isDarkMode ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}`}>
                            {client.email}
                          </a>
                        </div>
                      )}
                      {client.phone && (
                        <div className={`flex items-center gap-1 text-sm mt-1 ${isDarkMode ? 'text-gray-300' : ''}`}>
                          <Phone size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                          <a href={`tel:${client.phone}`} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {client.phone}
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {client.city && (
                        <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {client.postal_code && `${client.postal_code} `}
                          {client.city}
                        </div>
                      )}
                      {client.country && client.country !== 'Magyarország' && (
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{client.country}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(client.type || '')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(client.status)}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {client.last_contact 
                        ? new Date(client.last_contact).toLocaleDateString('hu-HU')
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(client)}
                          className={`p-1 ${isDarkMode ? 'text-blue-400 hover:bg-gray-700' : 'text-blue-600 hover:bg-blue-50'} rounded-lg transition-colors`}
                          title="Szerkesztés"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(client.id)}
                          className={`p-1 ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-red-50'} rounded-lg transition-colors`}
                          title="Törlés"
                        >
                          <Trash2 size={18} />
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
    </div>
  );
};

export default Clients;