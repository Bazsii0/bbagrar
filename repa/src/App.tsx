// App.tsx
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Animals from './pages/Animals';
import Lands from './pages/Lands';
import Budget from './pages/Budget';
import Calendar from './pages/Calendar';
import Clients from './pages/Clients';
import Documents from './pages/Documents';
import Marketplace from './pages/Marketplace';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Landing from "./pages/Landing";
import Users from './pages/Users';
import Employees from './pages/Employees';
import Timesheet from './pages/Timesheet';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import NotificationToast from './components/NotificationToast';

const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SettingsProvider>
          <NotificationProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/animals" element={<Animals />} />
                  <Route path="/lands" element={<Lands />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/marketplace" element={<Marketplace />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/timesheet" element={<Timesheet />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Routes>
            </Router>
            <NotificationToast />
          </NotificationProvider>
        </SettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;