import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_color: string;
  avatar_url?: string | null;
  timezone: string;
  is_active: boolean;
  ai_enabled: boolean;
  ai_cloud_sharing?: boolean;
  biometric_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; full_name: string; password: string }) => Promise<void>;
  socialLogin: (provider: string, email?: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: any) => Promise<User>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore stored session on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('alinga_token');
        if (savedToken) {
          setToken(savedToken);
          const res = await authApi.me();
          setUser(res.data);
        }
      } catch (err) {
        console.log('No active session found or network offline', err);
        await AsyncStorage.removeItem('alinga_token');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const { access_token } = res.data;
      await AsyncStorage.setItem('alinga_token', access_token);
      setToken(access_token);
      const profile = await authApi.me();
      setUser(profile.data);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: { email: string; username: string; full_name: string; password: string }) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      const { access_token } = res.data;
      await AsyncStorage.setItem('alinga_token', access_token);
      setToken(access_token);
      const profile = await authApi.me();
      setUser(profile.data);
    } finally {
      setIsLoading(false);
    }
  };

  const socialLogin = async (provider: string, email?: string, name?: string) => {
    setIsLoading(true);
    try {
      const res = await authApi.socialLogin({ provider, email, name });
      const { access_token } = res.data;
      await AsyncStorage.setItem('alinga_token', access_token);
      setToken(access_token);
      const profile = await authApi.me();
      setUser(profile.data);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('alinga_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
    } catch (e) {
      console.warn('Failed to refresh user profile', e);
    }
  };

  const updateProfile = async (data: any) => {
    const res = await authApi.updateMe(data);
    setUser(res.data);
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        socialLogin,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
