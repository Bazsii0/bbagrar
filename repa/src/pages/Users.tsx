// pages/Users.tsx
import { useEffect, useState } from "react";
import { 
  Plus, X, Edit2, Trash2, Search, ShieldCheck, Crown, Eye,
  Mail, Bell, Send, Users as UsersIcon, UserPlus, Briefcase, Clock
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';

interface User {
  id: number;
  username: string;
  email: string;
  password?: string;
  role: "viewer" | "admin" | "owner" | "worker" | "accountant";
  created_at?: string;
}

export default function Users() {
  const { isDarkMode } = useTheme();
  const { success, error: errorNotif } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', message: '' });
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'system_update' });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "viewer" as User['role']
  });

  const token = localStorage.getItem("bbagrar_token");
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001';

  const roleConfig: Record<string, { label: string; color: string; bg: string; darkBg: string; icon: any }> = {
    owner: { label: 'Tulajdonos', color: 'text-purple-700', bg: 'bg-purple-100', darkBg: 'bg-purple-900/30 text-purple-300', icon: Crown },
    admin: { label: 'Admin', color: 'text-red-700', bg: 'bg-red-100', darkBg: 'bg-red-900/30 text-red-300', icon: ShieldCheck },
    worker: { label: 'Dolgozó', color: 'text-blue-700', bg: 'bg-blue-100', darkBg: 'bg-blue-900/30 text-blue-300', icon: Briefcase },
    accountant: { label: 'Könyvelő', color: 'text-green-700', bg: 'bg-green-100', darkBg: 'bg-green-900/30 text-green-300', icon: Clock },
    viewer: { label: 'Megtekintő', color: 'text-gray-700', bg: 'bg-gray-100', darkBg: 'bg-gray-700 text-gray-300', icon: Eye },
  };

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        errorNotif("Hiba", `Nem sikerült betölteni a felhasználókat (${res.status})`);
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      errorNotif("Hiba", "Nem sikerült csatlakozni a szerverhez");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadUsers();
  }, [token]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      errorNotif("Hiba", "Kérlek töltsd ki az összes kötelező mezőt!");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        errorNotif("Hiba", data.error || "Nem sikerült létrehozni a felhasználót");
        return;
      }
      success("Sikeres!", "Felhasználó létrehozva");
      setForm({ username: "", email: "", password: "", role: "viewer" });
      setShowCreateForm(false);
      loadUsers();
    } catch (err) {
      errorNotif("Hiba", "Nem sikerült csatlakozni a szerverhez");
    }
  }

  async function deleteUser(id: number) {
    if (!confirm("Biztos törlöd a felhasználót?")) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) { errorNotif("Hiba", "Nem sikerült törölni"); return; }
      success("Sikeres!", "Felhasználó törölve");
      loadUsers();
    } catch (err) {
      errorNotif("Hiba", "Szerverhiba");
    }
  }

  async function saveUser() {
    if (!editingUser) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(editingUser)
      });
      if (!res.ok) { errorNotif("Hiba", "Nem sikerült frissíteni"); return; }
      success("Sikeres!", "Felhasználó frissítve");
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      errorNotif("Hiba", "Szerverhiba");
    }
  }

  async function sendSystemEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!emailData.subject || !emailData.message) {
      errorNotif("Hiba", "Tárgy és üzenet kötelező!");
      return;
    }
    setSendingEmail(true);
    try {
      const allEmails = users.map(u => u.email).filter(Boolean);
      const res = await fetch(`${API_URL}/api/send-circular-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ emails: allEmails, subject: emailData.subject, message: emailData.message })
      });
      const data = await res.json();
      if (!res.ok) { errorNotif("Hiba", data.error || "Email küldési hiba"); return; }
      success("Sikeres!", `Email elküldve ${allEmails.length} felhasználónak`);
      setEmailData({ subject: '', message: '' });
      setShowEmailModal(false);
    } catch (err) {
      errorNotif("Hiba", "Email küldési hiba");
    } finally {
      setSendingEmail(false);
    }
  }

  async function sendSystemNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!notifData.title || !notifData.message) {
      errorNotif("Hiba", "Cím és üzenet kötelező!");
      return;
    }
    setSendingNotif(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/send-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(notifData)
      });
      const data = await res.json();
      if (!res.ok) { errorNotif("Hiba", data.error || "Értesítés küldési hiba"); return; }
      success("Sikeres!", `Értesítés elküldve ${data.count || 'minden'} felhasználónak`);
      setNotifData({ title: '', message: '', type: 'system_update' });
      setShowNotifModal(false);
    } catch (err) {
      errorNotif("Hiba", "Értesítés küldési hiba");
    } finally {
      setSendingNotif(false);
    }
  }

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'owner').length,
    workers: users.filter(u => u.role === 'worker').length,
    viewers: users.filter(u => u.role === 'viewer' || u.role === 'accountant').length,
  };

  if (!token) {
    return (
      <div className={`flex items-center justify-center min-h-[60vh] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p className="text-lg">Kérlek jelentkezz be a felhasználók kezeléséhez</p>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'text-gray-200' : ''}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Adminisztráció</h1>
          <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Felhasználók kezelése, értesítések és rendszer üzenetek</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowNotifModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isDarkMode ? 'bg-gray-800 border-yellow-700 text-yellow-400 hover:bg-gray-700' : 'bg-white border-yellow-500 text-yellow-600 hover:bg-yellow-50'
            }`}
          >
            <Bell size={18} />
            Értesítés küldése
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              isDarkMode ? 'bg-gray-800 border-blue-700 text-blue-400 hover:bg-gray-700' : 'bg-white border-blue-500 text-blue-600 hover:bg-blue-50'
            }`}
          >
            <Mail size={18} />
            Rendszer email
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus size={18} />
            Új felhasználó
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 mb-8">
        {[
          { label: 'Összes felhasználó', value: stats.total, icon: UsersIcon, bgLight: 'bg-green-100 text-green-600', bgDark: 'bg-green-900/30 text-green-400' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow p-5`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${isDarkMode ? stat.bgDark : stat.bgLight}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow p-4 mb-6`}>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} size={18} />
          <input
            type="text"
            placeholder="Keresés név vagy email alapján..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-green-500 focus:border-transparent ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900'
            }`}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDarkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-green-50 border-green-100'} border-b`}>
              <tr>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Felhasználó</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Szerepkör</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Regisztráció</th>
                <th className={`px-6 py-3 text-left text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Műveletek</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {loading ? (
                <tr><td colSpan={5} className={`px-6 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Betöltés...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={5} className={`px-6 py-8 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nincs találat</td></tr>
              ) : (
                filteredUsers.map((u) => {
                  const rc = roleConfig[u.role] || roleConfig.viewer;
                  const RoleIcon = rc.icon;
                  return (
                    <tr key={u.id} className={`${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                            isDarkMode ? 'bg-green-900/40 text-green-400' : 'bg-green-100 text-green-700'
                          }`}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{u.username}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isDarkMode ? rc.darkBg : `${rc.bg} ${rc.color}`}`}>
                          <RoleIcon size={12} />
                          {rc.label}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('hu-HU') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                            title="Szerkesztés"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteUser(u.id)}
                            className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                            title="Törlés"
                          >
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

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Új felhasználó</h2>
              <button onClick={() => setShowCreateForm(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><X size={24} /></button>
            </div>
            <form onSubmit={createUser} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Felhasználónév *</label>
                <input type="text" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Jelszó *</label>
                <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Szerepkör</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as User['role'] })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <option value="viewer">Megtekintő</option>
                  <option value="worker">Dolgozó</option>
                  <option value="accountant">Könyvelő</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Tulajdonos</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">Létrehozás</button>
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Mégse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Felhasználó szerkesztése</h2>
              <button onClick={() => setEditingUser(null)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Felhasználónév</label>
                <input type="text" value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
                <input type="email" value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Szerepkör</label>
                <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as User['role'] })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-green-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <option value="viewer">Megtekintő</option>
                  <option value="worker">Dolgozó</option>
                  <option value="accountant">Könyvelő</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Tulajdonos</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={saveUser} className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors">Mentés</button>
                <button onClick={() => setEditingUser(null)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Mégse</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-lg`}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Mail size={20} className="text-blue-500" />
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Rendszer email küldése</h2>
              </div>
              <button onClick={() => setShowEmailModal(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><X size={24} /></button>
            </div>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Az email az összes felhasználónak kiküldésre kerül ({users.filter(u => u.email).length} fő)
            </p>
            <form onSubmit={sendSystemEmail} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tárgy *</label>
                <input type="text" required value={emailData.subject} onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Pl: Rendszerkarbantartás"
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Üzenet *</label>
                <textarea required value={emailData.message} onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  rows={5} placeholder="Az email tartalma..."
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300'}`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={sendingEmail}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors">
                  <Send size={16} />
                  {sendingEmail ? 'Küldés...' : 'Email küldése'}
                </button>
                <button type="button" onClick={() => setShowEmailModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Mégse</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 w-full max-w-lg`}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Bell size={20} className="text-yellow-500" />
                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Értesítés küldése</h2>
              </div>
              <button onClick={() => setShowNotifModal(false)} className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}><X size={24} /></button>
            </div>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Az értesítés megjelenik minden felhasználó értesítési központjában ({users.length} fő)
            </p>
            <form onSubmit={sendSystemNotification} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Típus</label>
                <select value={notifData.type} onChange={(e) => setNotifData({ ...notifData, type: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-yellow-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}>
                  <option value="system_update">Rendszerfrissítés</option>
                  <option value="announcement">Közlemény</option>
                  <option value="warning">Figyelmeztetés</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Cím *</label>
                <input type="text" required value={notifData.title} onChange={(e) => setNotifData({ ...notifData, title: e.target.value })}
                  placeholder="Pl: Karbantartás"
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-yellow-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Üzenet *</label>
                <textarea required value={notifData.message} onChange={(e) => setNotifData({ ...notifData, message: e.target.value })}
                  rows={4} placeholder="Az értesítés tartalma..."
                  className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-yellow-500 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300'}`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={sendingNotif}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors">
                  <Bell size={16} />
                  {sendingNotif ? 'Küldés...' : 'Értesítés küldése'}
                </button>
                <button type="button" onClick={() => setShowNotifModal(false)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}>Mégse</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}