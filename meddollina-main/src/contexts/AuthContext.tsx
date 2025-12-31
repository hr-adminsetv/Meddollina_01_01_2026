/**
 * Authentication Context
 * Manages authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService, { LoginCredentials } from '@/services/authService';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profession: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Validate session on mount
  useEffect(() => {
    const validateAuth = async () => {
      if (authService.isAuthenticated()) {
        const isValid = await authService.validateSession();
        if (isValid) {
          setIsAuthenticated(true);
          // Try to get user data from localStorage first
          const storedUser = localStorage.getItem('meddollina_user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              setUser(parsedUser);
            } catch (e) {
              console.error('Failed to parse stored user:', e);
            }
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    validateAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      
      if (response.success) {
        setUser(response.data.user);
        // Save user data to localStorage for persistence
        localStorage.setItem('meddollina_user', JSON.stringify(response.data.user));
        setIsAuthenticated(true);
        navigate('/chathome');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      // Clear user data from localStorage
      localStorage.removeItem('meddollina_user');
      navigate('/login');
    }
  };

  const validateSession = async (): Promise<boolean> => {
    const isValid = await authService.validateSession();
    if (!isValid) {
      setUser(null);
      setIsAuthenticated(false);
    }
    return isValid;
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    validateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
