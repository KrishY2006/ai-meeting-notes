/* eslint-disable react-refresh/only-export-components --
   Provider, context, and hook belong together in one module: splitting the hook
   out would force consumers to import from two files for a single piece of state. */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { login as loginRequest, register as registerRequest } from '../api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredToken());

  const login = useCallback(async (email, password) => {
    const data = await loginRequest(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    return data.user;
  }, []);

  const register = useCallback(async (email, password) => {
    const data = await registerRequest(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ token, isAuthenticated: Boolean(token), login, register, logout }),
    [token, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}

export { AuthContext };
