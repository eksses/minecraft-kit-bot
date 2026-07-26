import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, realtimeClient } from '../services/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    try {
      const res = await authAPI.me();
      const userData = res.user || res;
      setUser(userData);
      if (userData?.id) {
        realtimeClient.setUserId(userData.id);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
  
  const login = async (username, password) => {
    const res = await authAPI.login(username, password);
    const userData = res.user || res;
    setUser(userData);
    if (userData?.id) {
      realtimeClient.setUserId(userData.id);
    }
  };
  
  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };
  
  const hasRole = (roles) => {
    return user ? roles.includes(user.role) : false;
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      hasRole
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}