import { createContext, useContext, useEffect, useState } from 'react';
import { loginUser, registerUser, fetchMe } from '../api/auth.js';

const AuthContext = createContext(null);
const TOKEN_KEY = 'agriconnect_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  async function login(credentials) {
    const { user, token } = await loginUser(credentials);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  }

  async function register(details) {
    const { user, token } = await registerUser(details);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
