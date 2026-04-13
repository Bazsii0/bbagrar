import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-gray-700 dark:text-gray-300">
          Betöltés...
        </div>
      </div>
    );
  }

  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}