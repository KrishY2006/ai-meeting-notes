import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const inputClass =
  'w-full rounded-lg border border-gray-600 bg-modern-bg px-3 py-2.5 text-sm text-gray-100 outline-none transition-colors duration-200 placeholder:text-gray-500 focus:border-modern-gold focus:ring-2 focus:ring-modern-gold/70 disabled:bg-gray-900';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-modern-bg px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-modern-gold">AI Meeting Notes</h1>
          <p className="mt-1 text-sm text-gray-400">
            {isLogin ? 'Sign in to continue' : 'Create an account to get started'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-modern-plum bg-modern-surface p-6 shadow-lg"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={submitting}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? 'Your password' : 'At least 8 characters'}
              disabled={submitting}
              className={inputClass}
            />
            {!isLogin && (
              <p className="text-xs text-gray-500">Password must be at least 8 characters.</p>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-modern-gold px-5 py-3 text-sm font-bold text-modern-bg transition-colors duration-200 hover:bg-modern-gold-dark focus:outline-none focus:ring-2 focus:ring-modern-gold/70 focus:ring-offset-2 focus:ring-offset-modern-surface disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-500"
          >
            {submitting && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-modern-bg border-t-transparent"
              />
            )}
            {submitting ? 'Please wait...' : isLogin ? 'Sign in' : 'Create account'}
          </button>

          <p className="text-center text-sm text-gray-400">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              disabled={submitting}
              className="font-medium text-modern-gold transition-colors duration-200 hover:text-modern-gold-dark disabled:opacity-50"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
