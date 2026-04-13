// pages/Budget.tsx
import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp, TrendingDown, Edit2, Trash2, PieChart, LayoutGrid, List, Calendar, Tag } from 'lucide-react';
import { 
  getExpenses, 
  getIncomes, 
  addExpense, 
  addIncome, 
  getBalance, 
  deleteExpense, 
  deleteIncome,
  updateExpense,
  updateIncome 
} from '../db/operations';
import { useTheme } from '../context/ThemeContext';

interface Transaction {
  id: number;
  user_id?: number;
  amount: number;
  category: string;
  description?: string | null;
  date: string;
  created_at?: string;
}

const formatCurrency = (value: number): string => {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0 Ft';
  }
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Ft';
};

const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return 'Ma';
  if (date.toDateString() === yesterday.toDateString()) return 'Tegnap';
  
  const diffTime = today.getTime() - date.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) return `${diffDays} napja`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} hete`;
  
  return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
};

const getCategoryColor = (category: string, type: 'expense' | 'income'): string => {
  const expenseColors: Record<string, string> = {
    'Takarmány': '#f59e0b',
    'Állatorvos': '#ef4444',
    'Gyógyszer': '#e11d48',
    'Üzemanyag': '#f97316',
    'Bér': '#3b82f6',
    'Villany': '#eab308',
    'Víz': '#06b6d4',
    'Egyéb': '#6b7280',
  };
  
  const incomeColors: Record<string, string> = {
    'Értékesítés': '#10b981',
    'Támogatás': '#22c55e',
    'Bérleti díj': '#14b8a6',
    'Egyéb': '#6b7280',
  };
  
  const colors = type === 'expense' ? expenseColors : incomeColors;
  return colors[category] || (type === 'expense' ? '#ef4444' : '#22c55e');
};

const getCategoryBgColor = (category: string, type: 'expense' | 'income'): string => {
  const color = getCategoryColor(category, type);
  return `${color}20`;
};

// Segment interface a DonutChart-hoz
interface Segment {
  id: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  startAngle: number;
  endAngle: number;
  color: string;
  percentage: number;
}

// Kördiagram komponens
const DonutChart = ({ 
  expenses, 
  incomes, 
  totalExpenses, 
  totalIncomes,
  isDarkMode 
}: { 
  expenses: Transaction[], 
  incomes: Transaction[],
  totalExpenses: number,
  totalIncomes: number,
  isDarkMode: boolean
}) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  
  const total = totalExpenses + totalIncomes;
  const expenseRatio = total > 0 ? (totalExpenses / total) * 100 : 0;
  const incomeRatio = total > 0 ? (totalIncomes / total) * 100 : 0;
  
  // Kategóriák összesítése
  const expenseByCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);
  
  const incomeByCategory = incomes.reduce((acc, inc) => {
    acc[inc.category] = (acc[inc.category] || 0) + Number(inc.amount);
    return acc;
  }, {} as Record<string, number>);
  
  // SVG path generálás
  const createDonutSegment = (startAngle: number, endAngle: number, innerRadius: number, outerRadius: number): string => {
    const startAngleRad = (startAngle - 90) * (Math.PI / 180);
    const endAngleRad = (endAngle - 90) * (Math.PI / 180);
    
    const x1 = 100 + outerRadius * Math.cos(startAngleRad);
    const y1 = 100 + outerRadius * Math.sin(startAngleRad);
    const x2 = 100 + outerRadius * Math.cos(endAngleRad);
    const y2 = 100 + outerRadius * Math.sin(endAngleRad);
    
    const x3 = 100 + innerRadius * Math.cos(endAngleRad);
    const y3 = 100 + innerRadius * Math.sin(endAngleRad);
    const x4 = 100 + innerRadius * Math.cos(startAngleRad);
    const y4 = 100 + innerRadius * Math.sin(startAngleRad);
    
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;
  };
  
  // Szegmensek generálása
  const generateSegments = (): Segment[] => {
    const segments: Segment[] = [];
    let currentAngle = 0;
    
    // Kiadások szegmensei
    Object.entries(expenseByCategory).forEach(([category, amount]) => {
      const angle = totalExpenses > 0 ? (amount / totalExpenses) * 360 * (expenseRatio / 100) : 0;
      if (angle > 0) {
        segments.push({
          id: `exp-${category}`,
          category,
          amount,
          type: 'expense',
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          color: getCategoryColor(category, 'expense'),
          percentage: total > 0 ? (amount / total) * 100 : 0
        });
        currentAngle += angle;
      }
    });
    
    // Bevételek szegmensei
    Object.entries(incomeByCategory).forEach(([category, amount]) => {
      const angle = totalIncomes > 0 ? (amount / totalIncomes) * 360 * (incomeRatio / 100) : 0;
      if (angle > 0) {
        segments.push({
          id: `inc-${category}`,
          category,
          amount,
          type: 'income',
          startAngle: currentAngle,
          endAngle: currentAngle + angle,
          color: getCategoryColor(category, 'income'),
          percentage: total > 0 ? (amount / total) * 100 : 0
        });
        currentAngle += angle;
      }
    });
    
    return segments;
  };
  
  const segments: Segment[] = generateSegments();
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      {/* Kördiagram */}
      <div className="relative flex justify-center">
        <svg viewBox="0 0 200 200" className="w-full max-w-[400px] h-auto transform -rotate-90">
          {/* Háttér kör */}
          <circle cx="100" cy="100" r="80" fill="none" stroke={isDarkMode ? "#374151" : "#f3f4f6"} strokeWidth="20" />
          
          {/* Szegmensek */}
          {segments.map((segment) => (
            <path
              key={segment.id}
              d={createDonutSegment(segment.startAngle, segment.endAngle, 70, 90)}
              fill={segment.color}
              stroke={isDarkMode ? "#1f2937" : "white"}
              strokeWidth="2"
              className="transition-all duration-300 cursor-pointer hover:opacity-80"
              onMouseEnter={() => setHoveredSegment(segment.id)}
              onMouseLeave={() => setHoveredSegment(null)}
              style={{
                filter: hoveredSegment === segment.id ? 'brightness(1.1)' : 'none',
                transform: hoveredSegment === segment.id ? 'scale(1.02)' : 'scale(1)',
                transformOrigin: '100px 100px'
              }}
            />
          ))}
          
          {/* Középső kör (donut lyuk) */}
          <circle cx="100" cy="100" r="65" fill={isDarkMode ? "#1f2937" : "white"} />
        </svg>
        
        {/* Középső szöveg */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Egyenleg</span>
          <span className={`text-2xl font-bold ${totalIncomes - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalIncomes - totalExpenses)}
          </span>
          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
            {formatCurrency(totalIncomes)} bevétel
          </span>
          <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {formatCurrency(totalExpenses)} kiadás
          </span>
        </div>
      </div>
      
      {/* Legenda */}
      <div className="space-y-6">
        {/* Kiadások szekció */}
        {Object.keys(expenseByCategory).length > 0 && (
          <div>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-3 flex items-center gap-2`}>
              <TrendingDown size={16} className="text-red-500" />
              Kiadások ({formatCurrency(totalExpenses)})
            </h3>
            <div className="space-y-2">
              {Object.entries(expenseByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                  const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                  const isHovered = hoveredSegment === `exp-${category}`;
                  
                  return (
                    <div 
                      key={category}
                      className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                        isHovered 
                          ? isDarkMode ? 'bg-red-900/30' : 'bg-red-50'
                          : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onMouseEnter={() => setHoveredSegment(`exp-${category}`)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(category, 'expense') }}
                        />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{category}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formatCurrency(amount)}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
        
        {/* Bevételek szekció */}
        {Object.keys(incomeByCategory).length > 0 && (
          <div>
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'} mb-3 flex items-center gap-2`}>
              <TrendingUp size={16} className="text-green-500" />
              Bevételek ({formatCurrency(totalIncomes)})
            </h3>
            <div className="space-y-2">
              {Object.entries(incomeByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => {
                  const percentage = totalIncomes > 0 ? (amount / totalIncomes) * 100 : 0;
                  const isHovered = hoveredSegment === `inc-${category}`;
                  
                  return (
                    <div 
                      key={category}
                      className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${
                        isHovered 
                          ? isDarkMode ? 'bg-green-900/30' : 'bg-green-50'
                          : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      }`}
                      onMouseEnter={() => setHoveredSegment(`inc-${category}`)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCategoryColor(category, 'income') }}
                        />
                        <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{category}</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formatCurrency(amount)}</div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Budget = () => {
  const { isDarkMode } = useTheme();
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [incomes, setIncomes] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [activeTab, setActiveTab] = useState<'expenses' | 'incomes'>('expenses');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showChart, setShowChart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [useExistingCategory, setUseExistingCategory] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [expensesData, incomesData, balanceData] = await Promise.all([
        getExpenses(),
        getIncomes(),
        getBalance()
      ]);
      
      setExpenses(expensesData as Transaction[]);
      setIncomes(incomesData as Transaction[]);
      setBalance(Number(balanceData));
    } catch (error) {
      console.error('Hiba az adatok betöltésekor:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description || undefined,
        date: formData.date,
      };

      if (editingId) {
        if (activeTab === 'expenses') {
          await updateExpense(editingId, data);
        } else {
          await updateIncome(editingId, data);
        }
      } else {
        if (activeTab === 'expenses') {
          await addExpense(data);
        } else {
          await addIncome(data);
        }
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('Hiba a mentés során:', error);
      alert('Hiba történt a mentés során!');
    }
  };

  const handleDelete = async (id: number, type: 'expense' | 'income') => {
    if (!confirm('Biztosan törölni szeretnéd ezt a tételt?')) return;

    try {
      if (type === 'expense') {
        await deleteExpense(id);
      } else {
        await deleteIncome(id);
      }
      await loadData();
    } catch (error) {
      console.error('Hiba a törlés során:', error);
      alert('Hiba történt a törlés során!');
    }
  };

  const handleEdit = (item: Transaction) => {
    const dateStr = item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    setFormData({
      amount: item.amount.toString(),
      category: item.category,
      description: item.description || '',
      date: dateStr,
    });
    setEditingId(item.id);
    setShowForm(true);
    setUseExistingCategory(true);
  };

  const resetForm = () => {
    setFormData({ 
      amount: '', 
      category: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0] 
    });
    setEditingId(null);
    setShowForm(false);
    setUseExistingCategory(false);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalIncomes = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

  const expenseCategories = [...new Set(expenses.map(e => e.category))];
  const incomeCategories = [...new Set(incomes.map(i => i.category))];
  const currentCategories = activeTab === 'expenses' ? expenseCategories : incomeCategories;
  const currentItems = activeTab === 'expenses' ? expenses : incomes;

  const sortedItems = [...currentItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${isDarkMode ? 'bg-gray-900' : ''}`}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isDarkMode ? 'border-green-400 border-t-transparent' : 'border-green-500 border-t-transparent'} rounded-full animate-spin mx-auto mb-4`}></div>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Adatok betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Fejléc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Költségvetés</h1>
          <p className={isDarkMode ? 'text-gray-400 mt-1' : 'text-gray-500 mt-1'}>Kiadások és bevételek kezelése</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowChart(!showChart)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm ${
              showChart 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : isDarkMode
                  ? 'bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300'
                  : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <PieChart size={18} />
            <span className="hidden sm:inline">{showChart ? 'Lista nézet' : 'Diagram nézet'}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Új tétel</span>
          </button>
        </div>
      </div>

      {/* Statisztika kártyák */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm font-medium`}>Bevételek</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{incomes.length} tétel</p>
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(totalIncomes)}</p>
        </div>

        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-red-100 to-rose-100 text-red-700 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm font-medium`}>Kiadások</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{expenses.length} tétel</p>
            </div>
          </div>
          <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatCurrency(totalExpenses)}</p>
        </div>

        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border p-6 hover:shadow-md transition-shadow`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-3 rounded-xl ${balance >= 0 ? 'bg-gradient-to-br from-green-100 to-emerald-100 text-green-700' : 'bg-gradient-to-br from-red-100 to-rose-100 text-red-700'}`}>
              <TrendingUp size={24} className={balance < 0 ? 'rotate-180' : ''} />
            </div>
            <div>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm font-medium`}>Egyenleg</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{balance >= 0 ? 'Pozitív' : 'Negatív'}</p>
            </div>
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 w-full max-w-md shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingId ? 'Tétel szerkesztése' : 'Új tétel hozzáadása'}
              </h2>
              <button onClick={resetForm} className={`${isDarkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'} p-1 rounded-lg transition-colors`}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Típus</label>
                <select
                  value={activeTab}
                  onChange={(e) => {
                    setActiveTab(e.target.value as 'expenses' | 'incomes');
                    setUseExistingCategory(false);
                  }}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="expenses">Kiadás</option>
                  <option value="incomes">Bevétel</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Összeg (Ft) *</label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent pl-4 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="0"
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Ft</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Kategória *</label>
                  {currentCategories.length > 0 && !editingId && (
                    <button
                      type="button"
                      onClick={() => setUseExistingCategory(!useExistingCategory)}
                      className={`text-xs ${isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-800'} font-medium`}
                    >
                      {useExistingCategory ? 'Új kategória' : 'Meglévő kategória'}
                    </button>
                  )}
                </div>
                
                {useExistingCategory && currentCategories.length > 0 ? (
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Válassz kategóriát</option>
                    {currentCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    placeholder={activeTab === 'expenses' ? "pl.: Takarmány, Állatorvos..." : "pl.: Értékesítés, Támogatás..."}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Leírás</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Részletek..."
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>Dátum *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    isDarkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-colors font-medium shadow-md hover:shadow-lg"
                >
                  {editingId ? 'Módosítás' : 'Mentés'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className={`flex-1 px-4 py-2.5 rounded-xl transition-colors font-medium ${
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

      {/* Fő tartalom - Lista nézet */}
      {!showChart && (
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border overflow-hidden`}>
          {/* Tab és nézetváltó fejléc */}
          <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-4">
              <div className={`flex ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-1 rounded-xl`}>
                <button
                  onClick={() => setActiveTab('expenses')}
                  className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'expenses'
                      ? isDarkMode
                        ? 'bg-gray-800 text-red-400 shadow-sm'
                        : 'bg-white text-red-600 shadow-sm'
                      : isDarkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TrendingDown size={16} />
                    Kiadások
                    <span className={`${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded-full text-xs`}>{expenses.length}</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('incomes')}
                  className={`flex-1 sm:flex-none px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === 'incomes'
                      ? isDarkMode
                        ? 'bg-gray-800 text-green-400 shadow-sm'
                        : 'bg-white text-green-600 shadow-sm'
                      : isDarkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    Bevételek
                    <span className={`${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'} px-2 py-0.5 rounded-full text-xs`}>{incomes.length}</span>
                  </span>
                </button>
              </div>

              {/* Nézetváltó */}
              <div className={`flex items-center gap-2 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} p-1 rounded-xl self-start sm:self-auto`}>
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'card' 
                      ? isDarkMode
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'bg-white text-gray-900 shadow-sm'
                      : isDarkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Kártyás nézet"
                >
                  <LayoutGrid size={18} />
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
                  title="Listás nézet"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Tartalom */}
          <div className="p-4 sm:p-6">
            {sortedItems.length === 0 ? (
              <div className={`text-center py-16 ${isDarkMode ? 'text-gray-400' : ''}`}>
                <div className={`w-20 h-20 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {activeTab === 'expenses' ? (
                    <TrendingDown size={32} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                  ) : (
                    <TrendingUp size={32} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                  )}
                </div>
                <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                  Még nincsenek {activeTab === 'expenses' ? 'kiadások' : 'bevételek'}
                </h3>
                <p className={isDarkMode ? 'text-gray-500 mb-4' : 'text-gray-500 mb-4'}>Adj hozzá új tételt a kezdéshez</p>
                <button
                  onClick={() => setShowForm(true)}
                  className={`inline-flex items-center gap-2 font-medium ${
                    isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-700'
                  }`}
                >
                  <Plus size={18} />
                  Új tétel hozzáadása
                </button>
              </div>
            ) : (
              <>
                {/* Kártyás nézet */}
                {viewMode === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedItems.map((item) => {
                      const itemType = activeTab === 'expenses' ? 'expense' : 'income';
                      return (
                        <div 
                          key={item.id} 
                          className={`group ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'} border rounded-xl p-5 hover:shadow-lg transition-all duration-200`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span 
                                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border"
                                style={{ 
                                  backgroundColor: getCategoryBgColor(item.category, itemType),
                                  borderColor: getCategoryColor(item.category, itemType),
                                  color: getCategoryColor(item.category, itemType)
                                }}
                              >
                                <Tag size={12} className="mr-1" />
                                {item.category}
                              </span>
                            </div>
                            <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-400' : ''}`}>
                              <button
                                onClick={() => handleEdit(item)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDarkMode 
                                    ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30' 
                                    : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                title="Szerkesztés"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, itemType)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isDarkMode 
                                    ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' 
                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                title="Törlés"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="mb-3">
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatCurrency(Number(item.amount))}
                            </p>
                            {item.description && (
                              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-1 line-clamp-2`}>{item.description}</p>
                            )}
                          </div>

                          <div className={`flex items-center gap-2 text-sm pt-3 border-t ${isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
                            <Calendar size={14} />
                            <span>{formatRelativeDate(item.date)}</span>
                            <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>•</span>
                            <span>{new Date(item.date).toLocaleDateString('hu-HU')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Listás nézet */}
                {viewMode === 'list' && (
                  <div className="space-y-2">
                    {sortedItems.map((item) => {
                      const itemType = activeTab === 'expenses' ? 'expense' : 'income';
                      return (
                        <div 
                          key={item.id}
                          className={`group flex items-center gap-4 p-4 ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'} border rounded-xl hover:shadow-md transition-all duration-200`}
                        >
                          {/* Dátum */}
                          <div className="flex-shrink-0 w-16 text-center">
                            <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} uppercase font-medium`}>
                              {new Date(item.date).toLocaleDateString('hu-HU', { month: 'short' })}
                            </div>
                            <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {new Date(item.date).getDate()}
                            </div>
                          </div>

                          {/* Kategória és leírás */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border"
                                style={{ 
                                  backgroundColor: getCategoryBgColor(item.category, itemType),
                                  borderColor: getCategoryColor(item.category, itemType),
                                  color: getCategoryColor(item.category, itemType)
                                }}
                              >
                                {item.category}
                              </span>
                              {formatRelativeDate(item.date) !== new Date(item.date).toLocaleDateString('hu-HU') && (
                                <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{formatRelativeDate(item.date)}</span>
                              )}
                            </div>
                            {item.description && (
                              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-sm truncate`}>{item.description}</p>
                            )}
                          </div>

                          {/* Összeg */}
                          <div className="flex-shrink-0 text-right">
                            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatCurrency(Number(item.amount))}
                            </p>
                          </div>

                          {/* Műveletek */}
                          <div className={`flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-400' : ''}`}>
                            <button
                              onClick={() => handleEdit(item)}
                              className={`p-2 rounded-lg transition-colors ${
                                isDarkMode 
                                  ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30' 
                                  : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                              }`}
                              title="Szerkesztés"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, itemType)}
                              className={`p-2 rounded-lg transition-colors ${
                                isDarkMode 
                                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' 
                                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title="Törlés"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Diagram nézet - Kördiagram */}
      {showChart && (expenses.length > 0 || incomes.length > 0) && (
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border p-6`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Pénzügyi áttekintés</h2>
          <DonutChart 
            expenses={expenses} 
            incomes={incomes}
            totalExpenses={totalExpenses}
            totalIncomes={totalIncomes}
            isDarkMode={isDarkMode}
          />
        </div>
      )}

      {showChart && expenses.length === 0 && incomes.length === 0 && (
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-2xl shadow-sm border p-12 text-center`}>
          <div className={`w-16 h-16 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <PieChart size={32} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
          </div>
          <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>Nincs megjeleníthető adat</h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>Adj hozzá bevételeket vagy kiadásokat a diagram megtekintéséhez</p>
        </div>
      )}
    </div>
  );
};

export default Budget;