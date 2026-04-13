import { useState, useEffect } from 'react';
import { getEmployees } from '../db/operations';
import { getTimesheets, addTimesheet, updateTimesheet, deleteTimesheet } from '../db/operations';
import { Plus, Search, Edit2, Trash2, Clock, Calendar, DollarSign, TrendingUp, X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface Employee {
  id: number;
  name: string;
  hourly_rate: number;
  status: string;
}

interface TimesheetEntry {
  id: number;
  employee_id: number;
  employee_name?: string;
  work_date: string;
  hours_worked: number;
  hourly_rate: number;
  total_pay: number;
  description: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: AlertCircle, label: 'Függőben' },
  approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CheckCircle, label: 'Jóváhagyva' },
  rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: XCircle, label: 'Elutasítva' },
};

const Timesheet = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [form, setForm] = useState({
    employee_id: '',
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: '',
    hourly_rate: '',
    description: '',
    status: 'pending' as string,
  });

  const fetchData = async () => {
    try {
      const [ts, emps] = await Promise.all([getTimesheets(), getEmployees()]);
      setEntries(ts);
      setEmployees(emps);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredEntries = entries.filter(entry => {
    const matchSearch = !search || 
      (entry.employee_name && entry.employee_name.toLowerCase().includes(search.toLowerCase())) ||
      (entry.description && entry.description.toLowerCase().includes(search.toLowerCase()));
    const matchMonth = !filterMonth || entry.work_date.startsWith(filterMonth);
    return matchSearch && matchMonth;
  });

  const monthStats = {
    totalHours: filteredEntries.reduce((s, e) => s + Number(e.hours_worked), 0),
    totalPay: filteredEntries.reduce((s, e) => s + Number(e.total_pay), 0),
    entries: filteredEntries.length,
    approved: filteredEntries.filter(e => e.status === 'approved').length,
  };

  const openCreate = () => {
    setEditingEntry(null);
    const defaultEmp = employees.find(e => e.status === 'active');
    setForm({
      employee_id: defaultEmp ? String(defaultEmp.id) : '',
      work_date: new Date().toISOString().split('T')[0],
      hours_worked: '8',
      hourly_rate: defaultEmp ? String(defaultEmp.hourly_rate) : '',
      description: '',
      status: 'pending',
    });
    setShowModal(true);
  };

  const openEdit = (entry: TimesheetEntry) => {
    setEditingEntry(entry);
    setForm({
      employee_id: String(entry.employee_id),
      work_date: new Date(entry.work_date).toISOString().split('T')[0],
      hours_worked: String(entry.hours_worked),
      hourly_rate: String(entry.hourly_rate),
      description: entry.description || '',
      status: entry.status,
    });
    setShowModal(true);
  };

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find(e => e.id === Number(empId));
    setForm({
      ...form,
      employee_id: empId,
      hourly_rate: emp ? String(emp.hourly_rate) : form.hourly_rate,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        employee_id: Number(form.employee_id),
        work_date: form.work_date,
        hours_worked: parseFloat(form.hours_worked),
        hourly_rate: parseFloat(form.hourly_rate),
        description: form.description || null,
        status: form.status,
      };
      if (editingEntry) {
        await updateTimesheet(editingEntry.id, payload);
      } else {
        await addTimesheet(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error('Error saving timesheet:', error);
      alert('Hiba történt a mentés során!');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Biztosan törlöd ezt a bejegyzést?')) return;
    try {
      await deleteTimesheet(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting timesheet:', error);
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Munkaidő nyilvántartás</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Dolgozók munkaóráinak vezetése és bérszámítás</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors font-medium"
        >
          <Plus size={18} />
          Új bejegyzés
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bejegyzések</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthStats.entries}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Clock size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Összes óra</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthStats.totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Összeg</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthStats.totalPay.toLocaleString('hu-HU')} Ft</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
              <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Jóváhagyva</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{monthStats.approved} / {monthStats.entries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Keresés alkalmazott vagy leírás alapján..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <input
          type="month"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Alkalmazott</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dátum</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Órák</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Órabér</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Összeg</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Leírás</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Státusz</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Műveletek</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {search || filterMonth ? 'Nincs találat a szűrésre.' : 'Még nincsenek bejegyzések.'}
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => {
                  const st = statusConfig[entry.status] || statusConfig.pending;
                  const StIcon = st.icon;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{entry.employee_name || `#${entry.employee_id}`}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">{new Date(entry.work_date).toLocaleDateString('hu-HU')}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{entry.hours_worked} óra</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{entry.hourly_rate} Ft</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white font-semibold">{Number(entry.total_pay).toLocaleString('hu-HU')} Ft</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm max-w-[200px] truncate">{entry.description || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}>
                          <StIcon size={12} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(entry)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Szerkesztés">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title="Törlés">
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingEntry ? 'Bejegyzés szerkesztése' : 'Új munkaóra bejegyzés'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alkalmazott *</label>
                <select required value={form.employee_id} onChange={e => handleEmployeeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
                  <option value="">Válassz alkalmazottat...</option>
                  {employees.filter(e => e.status === 'active').map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.hourly_rate} Ft/óra)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dátum *</label>
                  <input type="date" required value={form.work_date} onChange={e => setForm({...form, work_date: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Munkaórák *</label>
                  <input type="number" step="0.5" min="0.5" max="24" required value={form.hours_worked} onChange={e => setForm({...form, hours_worked: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Órabér (Ft) *</label>
                  <input type="number" step="0.01" required value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Státusz</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500">
                    <option value="pending">Függőben</option>
                    <option value="approved">Jóváhagyva</option>
                    <option value="rejected">Elutasítva</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leírás</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Pl. Szántás, Aratás, Karbantartás..." />
              </div>
              {form.hours_worked && form.hourly_rate && (
                <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-3 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Számított összeg:</p>
                  <p className="text-xl font-bold text-green-700 dark:text-green-400">
                    {(parseFloat(form.hours_worked) * parseFloat(form.hourly_rate)).toLocaleString('hu-HU')} Ft
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
                  Mégse
                </button>
                <button type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium">
                  {editingEntry ? 'Mentés' : 'Létrehozás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheet;
