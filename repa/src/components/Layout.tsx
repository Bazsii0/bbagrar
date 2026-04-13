import { ReactNode, useState } from 'react';
import { useRole } from '../auth/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Beef, 
  Map, 
  FileText, 
  DollarSign, 
  Users, 
  ShoppingCart,
  ChevronDown,
  LogOut,
  Settings,
  User,
  HelpCircle,
  Calendar,
  Briefcase,
  Clock
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import NotificationCenter from './NotificationCenter';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { role } = useRole();
const userRole = role || 'viewer';

console.log("ROLE:", role);
console.log("USER OBJECT:", user);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner','admin','worker','accountant','viewer'] },

  { path: '/animals', icon: Beef, label: 'Állatok', roles: ['owner','admin','worker'] },

  { path: '/lands', icon: Map, label: 'Földek', roles: ['owner','admin','worker'] },

  { path: '/calendar', icon: Calendar, label: 'Naptár', roles: ['owner','admin','worker','accountant','viewer'] },

  { path: '/budget', icon: DollarSign, label: 'Költségvetés', roles: ['owner','admin','accountant'] },

  { path: '/clients', icon: Users, label: 'Ügyfelek', roles: ['owner','admin'] },

  { path: '/documents', icon: FileText, label: 'Dokumentáció', roles: ['owner','admin','worker'] },

  { path: '/employees', icon: Briefcase, label: 'Alkalmazottak', roles: ['owner','admin'] },

  { path: '/timesheet', icon: Clock, label: 'Munkaidő', roles: ['owner','admin','accountant'] },

  { path: '/marketplace', icon: ShoppingCart, label: 'Piactér', roles: ['owner','admin','worker','accountant','viewer'] },

  { path: '/users', icon: Users, label: 'Admin', roles: ['admin'] },
];

  const getInitials = (): string => {
    if (!user?.username) return '?';
    return user.username
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <aside className="w-64 bg-green-700 dark:bg-green-900 text-white flex flex-col">
        <div className="p-6 border-b border-green-600 dark:border-green-800">
          <h1 className="text-2xl font-bold">AgárAdmin</h1>
          <p className="text-sm text-green-100 dark:text-green-300 mt-1">Mezőgazdasági rendszer</p>
        </div>

        <nav className="flex-1 p-4">
          {navItems
  .filter(item => item.roles.includes(userRole))
  .map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-green-800 dark:bg-green-950 text-white'
                    : 'text-green-50 dark:text-green-200 hover:bg-green-600 dark:hover:bg-green-800'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-green-600 dark:border-green-800 relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-green-600 dark:hover:bg-green-800 transition-colors group"
          >
            <div className="w-10 h-10 rounded-md bg-green-800 dark:bg-green-950 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:ring-2 group-hover:ring-green-300 dark:group-hover:ring-green-600 transition-all">
              <span>{getInitials()}</span>
            </div>
            
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">{user?.username || 'Felhasználó'}</p>
              <p className="text-xs text-green-200 dark:text-green-300">{user?.email || 'nincs email'}</p>
            </div>
            
            <ChevronDown 
              size={16} 
              className={`text-green-200 dark:text-green-300 transition-transform duration-200 ${
                isProfileMenuOpen ? 'rotate-180' : ''
              }`} 
            />
          </button>

          {isProfileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsProfileMenuOpen(false)}
              />
              
              <div className="absolute bottom-full left-0 w-full mb-2 bg-green-800 dark:bg-green-950 rounded-lg border border-green-600 dark:border-green-800 shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-green-700 dark:border-green-900">
                  <p className="text-sm text-green-300 dark:text-green-400">Bejelentkezve mint</p>
                  <p className="text-white font-medium">{user?.username || 'Felhasználó'}</p>
                  {user?.email && (
                    <p className="text-xs text-green-300 dark:text-green-400 mt-0.5">{user.email}</p>
                  )}
                </div>

                <div className="py-2">
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-green-100 dark:text-green-200 hover:bg-green-700 dark:hover:bg-green-900 flex items-center gap-3 transition-colors"
                  >
                    <User size={16} />
                    <span className="text-sm">Profil</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-green-100 dark:text-green-200 hover:bg-green-700 dark:hover:bg-green-900 flex items-center gap-3 transition-colors"
                  >
                    <Settings size={16} />
                    <span className="text-sm">Beállítások</span>
                  </button>
                  
                  <button className="w-full px-4 py-2.5 text-left text-green-100 dark:text-green-200 hover:bg-green-700 dark:hover:bg-green-900 flex items-center gap-3 transition-colors">
                    <HelpCircle size={16} />
                    <span className="text-sm">Segítség</span>
                  </button>
                  
                  <div className="border-t border-green-700 dark:border-green-900 my-2"></div>
                  
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login', { replace: true });
                    }}
                    className="w-full px-4 py-2.5 text-left text-red-300 dark:text-red-400 hover:bg-green-700 dark:hover:bg-green-900 hover:text-red-200 dark:hover:text-red-300 flex items-center gap-3 transition-colors"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Kilépés</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
        {/* Felső sáv a csengő ikonnal */}
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-end items-center px-8 py-3">
            <NotificationCenter />
          </div>
        </div>
        
        {/* Tartalom */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;