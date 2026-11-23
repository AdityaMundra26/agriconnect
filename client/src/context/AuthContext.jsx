import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loginUser, registerUser, fetchMe } from '../api/auth.js';
import { TOKEN_KEY } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  // Fired by the axios interceptor when any request comes back 401.
  useEffect(() => {
    const onLogout = () => {
      setUser(null);
      setSessionExpired(true);
    };
    window.addEventListener('agriconnect:logout', onLogout);
    return () => window.removeEventListener('agriconnect:logout', onLogout);
  }, []);

  async function login(credentials) {
    const { user, token } = await loginUser(credentials);
    localStorage.setItem(TOKEN_KEY, token);
    setSessionExpired(false);
    setUser(user);
    return user;
  }

  async function register(details) {
    const { user, token } = await registerUser(details);
    localStorage.setItem(TOKEN_KEY, token);
    setSessionExpired(false);
    setUser(user);
    return user;
  }

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, sessionExpired }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
