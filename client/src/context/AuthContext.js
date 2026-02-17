import React, { createContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    // Never block UI forever: stop loading after 8s if API is slow/hanging (e.g. free tier spin-up)
    const fallback = setTimeout(() => setLoading(false), 8000);
    const clearFallback = () => clearTimeout(fallback);
    if (token) {
      getCurrentUser()
        .then((response) => {
          setUser(response.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        })
        .finally(() => {
          clearFallback();
          setLoading(false);
        });
    } else {
      clearFallback();
      setLoading(false);
    }
    return clearFallback;
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  /**
   * Check if current user has access to a given section.
   * Admins always have full access.
   * If a user has no explicit permission record for a section, it defaults to allowed.
   */
  const hasPermission = (sectionKey) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    // If permissions object exists and the section is explicitly false, deny
    if (user.permissions && user.permissions[sectionKey] === false) return false;
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};
