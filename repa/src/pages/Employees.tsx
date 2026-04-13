import { useState, useEffect } from 'react';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../db/operations';
import { Plus, Search, Edit2, Trash2, Users, Briefcase, Phone, Mail, X, UserCheck, UserX, Clock } from 'lucide-react';

interface Employee {
  id: number;
  user_id: number | null;
  name: string;
  position: string | null;
  hourly_rate: number;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  notes: string | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  'active': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'inactive': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'on_leave': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
};

const statusIcons: Record<string, any> = {
  'active': UserCheck,
  'inactive': UserX,
  'on_leave': Clock,
};

const statusLabels: Record<string, string> = {
  'active': 'Aktív',
  'inactive': 'Inaktív',
  'on_leave': 'Szabadságon',
};

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState({
    name: '',
    position: '',
    hourly_rate: '',
    phone: '',
    email: '',
    hire_date: '',
    status: 'aktív' as string,
    notes: '',
  });

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.position && e.position.toLowerCase().includes(search.toLowerCase())) ||
    (e.email && e.email.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'active').length,
    inactive: employees.filter(e => e.status === 'inactive').length,
    onLeave: employees.filter(e => e.status === 'on_leave').length,
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setForm({ name: '', position: '', hourly_rate: '', phone: '', email: '', hire_date: '', status: 'active', notes: '' });
    setShowModal(true);
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      name: emp.name,
      position: emp.position || '',
      hourly_rate: String(emp.hourly_rate || ''),
      phone: emp.phone || '',
      email: emp.email || '',
      hire_date: emp.hire_date ? new Date(emp.hire_date).toISOString().split('T')[0] : '',
      status: emp.status,
      notes: emp.notes || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        position: form.position || null,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        phone: form.phone || null,
        email: form.email || null,
        hire_date: form.hire_date || null,
        status: form.status,
        notes: form.notes || null,
      };
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, payload);
      } else {
        await addEmployee(payload);
      }
      setShowModal(false);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Hiba történt a mentés során!');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Biztosan törlöd ezt az alkalmazottat?')) return;
    try {
      await deleteEmployee(id);
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Hiba történt a törlés során!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alkalmazottak</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Alkalmazottak kezelése és nyilvántartása</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
        >
          <Plus size={18} />
          Új alkalmazott
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Összes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 dark:bg-green-900 rounded-lg">
              <UserCheck size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktív</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 dark:bg-red-900 rounded-lg">
              <UserX size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inaktív</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inactive}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Szabadságon</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.onLeave}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Keresés név, pozíció vagy email alapján..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Név</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pozíció</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Órabér</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Elérhetőség</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Státusz</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Belépés</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {search ? 'Nincs találat a keresésre.' : 'Még nincsenek alkalmazottak.'}
                  </td>
                </tr>
              ) : (
                filtered.map(emp => {
                  const StatusIcon = statusIcons[emp.status] || UserCheck;
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Briefcase size={16} className="text-green-600 dark:text-green-400" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{emp.position || '-'}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{emp.hourly_rate ? `${emp.hourly_rate} Ft/óra` : '-'}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {emp.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                              <Phone size={13} /> {emp.phone}
                            </div>
                          )}
                          {emp.email && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                              <Mail size={13} /> {emp.email}
                            </div>
                          )}
                          {!emp.phone && !emp.email && <span className="text-gray-400">-</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[emp.status]}`}>
                          <StatusIcon size={12} />
                          {statusLabels[emp.status] || emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                        {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('hu-HU') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(emp)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Szerkesztés">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Törlés">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingEmployee ? 'Alkalmazott szerkesztése' : 'Új alkalmazott'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Név *</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pozíció</label>
                  <input type="text" value={form.position} onChange={e => setForm({...form, position: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Órabér (Ft)</label>
                  <input type="number" step="0.01" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
                  <input type="text" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Belépés dátuma</label>
                  <input type="date" value={form.hire_date} onChange={e => setForm({...form, hire_date: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Státusz</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
                    <option value="active">Aktív</option>
                    <option value="inactive">Inaktív</option>
                    <option value="on_leave">Szabadságon</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Megjegyzés</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                  Mégse
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
                  {editingEmployee ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
