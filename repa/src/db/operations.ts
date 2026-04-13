import { apiRequest } from '../api/http';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

// DELETE műveletekhez specifikus típus
interface DeleteResponse {
  success: boolean;
}

export interface MarketplaceItem {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  type: string;
  price: number;
  image_url?: string;
  status: 'aktív' | 'eladva' | 'függőben' | 'inaktív';
  created_at?: string;
  location?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  token?: string | null;
  // FormData esetén ne állítsuk be a Content-Type-t
  skipContentType?: boolean;
}

function getToken(): string | null {
  return localStorage.getItem('bbagrar_token');
}

export const getAnimalCount = async () => {
  const token = getToken();
  const data = await apiRequest<{ animalCount: number }>('/api/dashboard/stats', { token });
  return data.animalCount;
};

export const getBalance = async () => {
  const token = getToken();
  const data = await apiRequest<{ balance: number }>('/api/dashboard/stats', { token });
  return data.balance;
};

export const getAnimals = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<{ items: any[] }>('/api/animals', { token });
    return data.items;
  } catch (error) {
    console.error('Error fetching animals:', error);
    return [];
  }
};

export const addAnimal = async (
  animal: { 
    name?: string; 
    species: string; 
    breed?: string; 
    identifier: string; 
    birth_date?: string;
    stable?: string;
    gender?: string;
    purpose?: string;
    notes?: string 
  }
) => {
  const token = getToken();
  try {
    console.log('🐴 Adding animal with data:', animal);
    const response = await apiRequest('/api/animals', { 
      method: 'POST', 
      token, 
      body: animal 
    });
    console.log('✅ Animal added successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error adding animal:', error);
    throw error;
  }
};

export const updateAnimal = async (
  id: number,
  animal: { 
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
) => {
  const token = getToken();
  try {
    console.log('✏️ Updating animal with data:', animal);
    const response = await apiRequest(`/api/animals/${id}`, { 
      method: 'PUT', 
      token, 
      body: animal 
    });
    console.log('✅ Animal updated successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error updating animal:', error);
    throw error;
  }
};

export const deleteAnimal = async (id: number) => {
  const token = getToken();
  try {
    const response = await apiRequest<DeleteResponse>(`/api/animals/${id}`, { 
      method: 'DELETE', 
      token 
    });
    return response;
  } catch (error) {
    console.error('Error deleting animal:', error);
    throw error;
  }
};

// Lands
export const getLands = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<{ items: any[] }>('/api/lands', { token });
    return data.items;
  } catch (error) {
    console.error('Error fetching lands:', error);
    return [];
  }
};

export const deleteLand = async (id: number) => {
  const token = getToken();
  try {
    const response = await apiRequest<DeleteResponse>(`/api/lands/${id}`, { 
      method: 'DELETE', 
      token 
    });
    
    return response || { success: true };
  } catch (error) {
    console.error('Error deleting land:', error);
    throw error;
  }
};

export const addLand = async (land: { 
  name: string; 
  plot_number?: string; 
  area: number;
  city?: string;
  location?: string;
  ownership_type: 'owned' | 'rented';
  status?: string;
  notes?: string;
}) => {
  const token = getToken();
  try {
    const response = await apiRequest('/api/lands', { 
      method: 'POST', 
      token, 
      body: land 
    });
    return response;
  } catch (error) {
    console.error('Error adding land:', error);
    throw error;
  }
};

export const getExpenses = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<{ items: any[] }>('/api/expenses', { token });
    return data.items;
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
};

export const addExpense = async (expense: { amount: number; category: string; description?: string; date: string }) => {
  const token = getToken();
  try {
    const response = await apiRequest('/api/expenses', { 
      method: 'POST', 
      token, 
      body: expense 
    });
    return response;
  } catch (error) {
    console.error('Error adding expense:', error);
    throw error;
  }
};

export const deleteExpense = async (id: number) => {
  const token = getToken();
  try {
    const response = await apiRequest<DeleteResponse>(`/api/expenses/${id}`, { 
      method: 'DELETE', 
      token 
    });
    return response;
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
};

export const updateExpense = async (id: number, expense: { amount: number; category: string; description?: string; date: string }) => {
  const token = getToken();
  try {
    const response = await apiRequest(`/api/expenses/${id}`, {
      method: 'PUT',
      token,
      body: expense
    });
    return response;
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
};

export const getIncomes = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<{ items: any[] }>('/api/incomes', { token });
    return data.items;
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return [];
  }
};

export const addIncome = async (income: { amount: number; category: string; description?: string; date: string }) => {
  const token = getToken();
  try {
    const response = await apiRequest('/api/incomes', { 
      method: 'POST', 
      token, 
      body: income 
    });
    return response;
  } catch (error) {
    console.error('Error adding income:', error);
    throw error;
  }
};

export const deleteIncome = async (id: number) => {
  const token = getToken();
  try {
    const response = await apiRequest<DeleteResponse>(`/api/incomes/${id}`, { 
      method: 'DELETE', 
      token 
    });
    return response;
  } catch (error) {
    console.error('Error deleting income:', error);
    throw error;
  }
};

export const updateIncome = async (id: number, income: { amount: number; category: string; description?: string; date: string }) => {
  const token = getToken();
  try {
    const response = await apiRequest(`/api/incomes/${id}`, {
      method: 'PUT',
      token,
      body: income
    });
    return response;
  } catch (error) {
    console.error('Error updating income:', error);
    throw error;
  }
};

// Clients függvények
export const getClients = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<any>('/api/clients', { token });
    console.log('getClients - API válasz:', data);
    
    if (data && data.items && Array.isArray(data.items)) {
      const validItems = data.items.filter((item: any) => item && item.id);
      if (validItems.length !== data.items.length) {
        console.warn('getClients - néhány elemnek nincs id-ja:', data.items);
      }
      return validItems;
    } else if (Array.isArray(data)) {
      const validItems = data.filter((item: any) => item && item.id);
      return validItems;
    } else {
      console.warn('getClients - váratlan formátum:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
};

export const addClient = async (client: { 
  name: string; 
  company_name?: string | null;
  tax_number?: string | null;
  email?: string | null; 
  phone?: string | null; 
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  contact_person?: string | null;
  website?: string | null;
  type?: string | null; 
  payment_terms?: string | null;
  status?: 'active' | 'inactive' | 'lead';
  notes?: string | null;
  last_contact?: string | null;
}) => {
  const token = getToken();
  try {
    const clientData = {
      name: client.name,
      company_name: client.company_name || null,
      tax_number: client.tax_number || null,
      email: client.email || null,
      phone: client.phone || null,
      address: client.address || null,
      city: client.city || null,
      postal_code: client.postal_code || null,
      country: client.country || 'Magyarország',
      contact_person: client.contact_person || null,
      website: client.website || null,
      type: client.type || null,
      payment_terms: client.payment_terms || null,
      status: client.status || 'active',
      notes: client.notes || null,
      last_contact: client.last_contact || null
    };

    console.log('Sending client data:', clientData);
    
    const response = await apiRequest('/api/clients', { 
      method: 'POST', 
      token, 
      body: clientData 
    });
    return response;
  } catch (error) {
    console.error('Error adding client:', error);
    throw error;
  }
};

export const updateClient = async (id: number, client: {
  name: string; 
  company_name?: string | null;
  tax_number?: string | null;
  email?: string | null; 
  phone?: string | null; 
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  contact_person?: string | null;
  website?: string | null;
  type?: string | null; 
  payment_terms?: string | null;
  status?: 'active' | 'inactive' | 'lead';
  notes?: string | null;
  last_contact?: string | null;
}) => {
  const token = getToken();
  try {
    const clientData = {
      name: client.name,
      company_name: client.company_name || null,
      tax_number: client.tax_number || null,
      email: client.email || null,
      phone: client.phone || null,
      address: client.address || null,
      city: client.city || null,
      postal_code: client.postal_code || null,
      country: client.country || 'Magyarország',
      contact_person: client.contact_person || null,
      website: client.website || null,
      type: client.type || null,
      payment_terms: client.payment_terms || null,
      status: client.status || 'active',
      notes: client.notes || null,
      last_contact: client.last_contact || null
    };

    console.log('Updating client data:', clientData);
    
    const response = await apiRequest(`/api/clients/${id}`, { 
      method: 'PUT', 
      token, 
      body: clientData 
    });
    return response;
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
};

export const deleteClient = async (id: number): Promise<DeleteResponse> => {
  console.log('deleteClient hívva, ID:', id);
  const token = getToken();
  try {
    const response = await apiRequest<DeleteResponse>(`/api/clients/${id}`, { 
      method: 'DELETE', 
      token 
    });
    console.log('deleteClient válasz:', response);
    
    if (response && response.success === true) {
      return response;
    } else {
      throw new Error('Sikertelen törlés');
    }
  } catch (error) {
    console.error('Error deleting client:', error);
    throw error;
  }
};

export const getMarketplace = async () => {
  try {
    const data = await apiRequest<{ items: any[] }>('/api/marketplace');
    return data.items;
  } catch (error) {
    console.error('Error fetching marketplace items:', error);
    return [];
  }
};

export const addMarketplaceItem = async (item: { title: string; description?: string; type: string; price: number; image_url?: string }) => {
  const token = getToken();
  try {
    const response = await apiRequest('/api/marketplace', { 
      method: 'POST', 
      token, 
      body: item 
    });
    return response;
  } catch (error) {
    console.error('Error adding marketplace item:', error);
    throw error;
  }
};

export const deleteMarketplaceItem = async (id: number) => {
  const token = getToken();
  try {
    const response = await apiRequest<DeleteResponse>(`/api/marketplace/${id}`, { 
      method: 'DELETE', 
      token 
    });
    return response;
  } catch (error) {
    console.error('Error deleting marketplace item:', error);
    throw error;
  }
};

export const updateMarketplaceItem = async (id: number, item: Partial<MarketplaceItem>): Promise<void> => {

  const token = getToken();
  
  console.log('📤 updateMarketplaceItem - Küldés:', { id, item });
  console.log('📍 API_URL:', API_URL);
  console.log('📍 Teljes URL:', `${API_URL}/api/marketplace/${id}`);
  console.log('📍 Token:', token ? `${token.substring(0, 20)}...` : 'NINCS TOKEN');
  
  if (!token) {
    throw new Error('Nincs bejelentkezési token!');
  }
  
  const response = await fetch(`${API_URL}/api/marketplace/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });
  
  console.log('📥 updateMarketplaceItem - Válasz státusz:', response.status);
  
  if (!response.ok) {
    let errorMessage = 'Frissítés sikertelen';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  console.log('✅ updateMarketplaceItem - Sikeres frissítés:', data);
};


// Dokumentumok
export const getDocuments = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<{ items: any[] }>('/api/documents', { token });
    return data.items;
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
};

// Módosított függvény - FormData kezeléséhez
export const addDocument = async (formData: FormData) => {
  const token = getToken();
  try {
    const response = await apiRequest('/api/documents', { 
      method: 'POST', 
      token, 
      body: formData
    });
    return response;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

export const deleteDocument = async (id: number) => {
  const token = getToken();
  try {
    const response = await apiRequest<DeleteResponse>(`/api/documents/${id}`, { 
      method: 'DELETE', 
      token 
    });
    return response;
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// ==================== EMPLOYEES ====================
export const getEmployees = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<{ items: any[] }>('/api/employees', { token });
    return data.items;
  } catch (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
};

export const addEmployee = async (employee: { name: string; position?: string | null; hourly_rate?: number; phone?: string | null; email?: string | null; hire_date?: string | null; status?: string; notes?: string | null }) => {
  const token = getToken();
  const response = await apiRequest('/api/employees', { method: 'POST', token, body: employee });
  return response;
};

export const updateEmployee = async (id: number, employee: { name: string; position?: string | null; hourly_rate?: number; phone?: string | null; email?: string | null; hire_date?: string | null; status?: string; notes?: string | null }) => {
  const token = getToken();
  const response = await apiRequest(`/api/employees/${id}`, { method: 'PUT', token, body: employee });
  return response;
};

export const deleteEmployee = async (id: number) => {
  const token = getToken();
  const response = await apiRequest<DeleteResponse>(`/api/employees/${id}`, { method: 'DELETE', token });
  return response;
};

// ==================== TIMESHEETS ====================
export const getTimesheets = async () => {
  const token = getToken();
  try {
    const data = await apiRequest<{ items: any[] }>('/api/timesheets', { token });
    return data.items;
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return [];
  }
};

export const addTimesheet = async (entry: { employee_id: number; work_date: string; hours_worked: number; hourly_rate: number; description?: string | null; status?: string }) => {
  const token = getToken();
  const response = await apiRequest('/api/timesheets', { method: 'POST', token, body: entry });
  return response;
};

export const updateTimesheet = async (id: number, entry: { employee_id: number; work_date: string; hours_worked: number; hourly_rate: number; description?: string | null; status?: string }) => {
  const token = getToken();
  const response = await apiRequest(`/api/timesheets/${id}`, { method: 'PUT', token, body: entry });
  return response;
};

export const deleteTimesheet = async (id: number) => {
  const token = getToken();
  const response = await apiRequest<DeleteResponse>(`/api/timesheets/${id}`, { method: 'DELETE', token });
  return response;
};

// Email - Kör-email SendGrid-gal
export const sendCircularEmail = async (emails: string[], subject: string, message: string) => {
  const token = getToken();
  try {
    console.log('📧 Sending circular email to:', emails);
    const response = await apiRequest('/api/send-circular-email', { 
      method: 'POST', 
      token, 
      body: { emails, subject, message }
    });
    console.log('✅ Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending circular email:', error);
    throw error;
  }
};
