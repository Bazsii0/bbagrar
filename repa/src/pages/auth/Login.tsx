import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(identifier.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Sikertelen bejelentkezés');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bejelentkezés</h1>
        <p className="text-gray-600 mb-6">Jelentkezz be a BB Agrár rendszerbe.</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Felhasználónév vagy e-mail</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jelszó</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {isSubmitting ? 'Beléptetés...' : 'Bejelentkezés'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6">
          Nincs fiókod?{' '}
          <Link to="/register" className="text-green-700 font-medium hover:underline">Regisztráció</Link>
        </p>
      </div>
    </div>
  );
}
