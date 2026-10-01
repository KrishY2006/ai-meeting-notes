import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Studio from './pages/Studio';
import History from './pages/History';

function NavLinkItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ${
          isActive
            ? 'bg-modern-gold font-bold text-modern-bg'
            : 'text-gray-300 hover:bg-modern-plum hover:text-modern-gold'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="border-b border-modern-plum bg-modern-surface shadow-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight text-modern-gold">AI Meeting Notes</span>
          {isAuthenticated && (
            <nav className="flex items-center gap-1">
              <NavLinkItem to="/">Studio</NavLinkItem>
              <NavLinkItem to="/history">History</NavLinkItem>
            </nav>
          )}
        </div>

        {isAuthenticated && (
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-gray-600 bg-modern-bg px-3 py-2 text-sm font-medium text-gray-200 transition-colors duration-200 hover:border-modern-gold hover:text-modern-gold focus:outline-none focus:ring-2 focus:ring-modern-gold/70"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RedirectIfAuthed({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-modern-bg text-gray-200">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Studio />
          </RequireAuth>
        }
      />
      <Route
        path="/meeting/:id"
        element={
          <RequireAuth>
            <Studio />
          </RequireAuth>
        }
      />
      <Route
        path="/history"
        element={
          <RequireAuth>
            <History />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}
