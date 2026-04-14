'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User } from '@/lib/db/types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/backend';
const API_BASE = BASE_URL.startsWith('/')
  ? BASE_URL
  : (BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`);

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null; success: boolean }>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<{ error: Error | null; success: boolean }>;
  acceptInvite: (token: string, fullName: string, password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session expiry warning time (5 minutes before expiry)
const SESSION_WARNING_TIME = 5 * 60 * 1000;
const TOKEN_EXPIRY_TIME = 8 * 60 * 60 * 1000; // 8 hours

function mapBackendUser(u: any): User {
  const normalizedRole = (() => {
    const rawRole = String(u?.role || 'employee').trim().toLowerCase();
    if (rawRole === 'admin' || rawRole === 'superadmin' || rawRole === 'administrator') {
      return 'admin';
    }
    return rawRole;
  })();

  return {
    id: u._id || u.id,
    email: u.email,
    full_name: u.full_name,
    role: normalizedRole as User['role'],
    avatar_url: u.avatar_url || undefined,
    created_at: u.createdAt || u.created_at || new Date().toISOString(),
    updated_at: u.updatedAt || u.updated_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const sessionWarningShown = useRef(false);
  const tokenExpiryTimer = useRef<NodeJS.Timeout | null>(null);
  const sessionWarningTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh token before expiry
  const scheduleTokenRefresh = useCallback((refreshToken: string) => {
    // Clear existing timers
    if (tokenExpiryTimer.current) clearTimeout(tokenExpiryTimer.current);
    if (sessionWarningTimer.current) clearTimeout(sessionWarningTimer.current);

    // Show warning 5 minutes before expiry
    sessionWarningTimer.current = setTimeout(() => {
      if (!sessionWarningShown.current) {
        sessionWarningShown.current = true;
        toast.warning('Session expiring soon', {
          description: 'Your session will expire in 5 minutes. Click to stay logged in.',
          duration: 300000, // 5 minutes
          action: {
            label: 'Stay logged in',
            onClick: async () => {
              await refreshAccessToken(refreshToken);
              sessionWarningShown.current = false;
            }
          }
        });
      }
    }, TOKEN_EXPIRY_TIME - SESSION_WARNING_TIME);

    // Auto-refresh 1 minute before expiry
    tokenExpiryTimer.current = setTimeout(async () => {
      await refreshAccessToken(refreshToken);
    }, TOKEN_EXPIRY_TIME - 60000);
  }, []);

  const refreshAccessToken = async (refreshToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('bb_token', data.token);
        setToken(data.token);
        setUser(mapBackendUser(data.user));
        scheduleTokenRefresh(refreshToken);
        return true;
      } else {
        // Refresh failed, logout
        await signOut();
        return false;
      }
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);
      await signOut();
      return false;
    }
  };

  // Intercept 401 responses and attempt refresh
  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const storedToken = localStorage.getItem('bb_token');
    const storedRefreshToken = localStorage.getItem('bb_refresh_token');

    if (storedToken) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${storedToken}`
      };
    }

    let response = await fetch(url, options);

    // If 401 and we have a refresh token, try to refresh
    if (response.status === 401 && storedRefreshToken) {
      const refreshed = await refreshAccessToken(storedRefreshToken);
      
      if (refreshed) {
        // Retry original request with new token
        const newToken = localStorage.getItem('bb_token');
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        };
        response = await fetch(url, options);
      }
    }

    return response;
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('bb_token');
      const storedRefreshToken = localStorage.getItem('bb_refresh_token');
      
      if (!storedToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(mapBackendUser(data.user));
        setToken(storedToken);
        
        // Schedule token refresh if we have refresh token
        if (storedRefreshToken) {
          scheduleTokenRefresh(storedRefreshToken);
        }
      } else {
        // Try to refresh if we have refresh token
        if (storedRefreshToken) {
          const refreshed = await refreshAccessToken(storedRefreshToken);
          if (!refreshed) {
            localStorage.removeItem('bb_token');
            localStorage.removeItem('bb_refresh_token');
            setUser(null);
            setToken(null);
          }
        } else {
          localStorage.removeItem('bb_token');
          setUser(null);
          setToken(null);
        }
      }
    } catch (error) {
      console.warn('[Auth] Backend unavailable:', error);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [scheduleTokenRefresh]);

  useEffect(() => {
    fetchUser();
    
    return () => {
      if (tokenExpiryTimer.current) clearTimeout(tokenExpiryTimer.current);
      if (sessionWarningTimer.current) clearTimeout(sessionWarningTimer.current);
    };
  }, [fetchUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Login failed') };
      }

      localStorage.setItem('bb_token', data.token);
      localStorage.setItem('bb_refresh_token', data.refreshToken);
      setToken(data.token);
      setUser(mapBackendUser(data.user));
      
      // Schedule token refresh
      scheduleTokenRefresh(data.refreshToken);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Network error') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Registration failed') };
      }

      localStorage.setItem('bb_token', data.token);
      localStorage.setItem('bb_refresh_token', data.refreshToken);
      setToken(data.token);
      setUser(mapBackendUser(data.user));
      
      // Schedule token refresh
      scheduleTokenRefresh(data.refreshToken);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Network error') };
    }
  };

  const signOut = async () => {
    const refreshToken = localStorage.getItem('bb_refresh_token');
    
    // Clear timers
    if (tokenExpiryTimer.current) clearTimeout(tokenExpiryTimer.current);
    if (sessionWarningTimer.current) clearTimeout(sessionWarningTimer.current);
    
    // Invalidate refresh token on backend
    if (refreshToken) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ refreshToken })
        });
      } catch (error) {
        console.error('[Auth] Logout error:', error);
      }
    }
    
    localStorage.removeItem('bb_token');
    localStorage.removeItem('bb_refresh_token');
    setUser(null);
    setToken(null);
    sessionWarningShown.current = false;
    router.push('/login');
  };

  const resetPassword = async (email: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Failed to send reset email'), success: false };
      }

      return { error: null, success: true };
    } catch (error: any) {
      return { error: new Error(error.message || 'Network error'), success: false };
    }
  };

  const confirmPasswordReset = async (token: string, newPassword: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Failed to reset password'), success: false };
      }

      return { error: null, success: true };
    } catch (error: any) {
      return { error: new Error(error.message || 'Network error'), success: false };
    }
  };

  const acceptInvite = async (token: string, fullName: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, full_name: fullName, password })
      });

      const data = await res.json();

      if (!res.ok) {
        return { error: new Error(data.error || 'Failed to accept invitation') };
      }

      // Auto-login after accepting invite
      localStorage.setItem('bb_token', data.token);
      localStorage.setItem('bb_refresh_token', data.refreshToken);
      setToken(data.token);
      setUser(mapBackendUser(data.user));
      
      // Schedule token refresh
      scheduleTokenRefresh(data.refreshToken);

      return { error: null };
    } catch (error: any) {
      return { error: new Error(error.message || 'Network error') };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        signIn,
        signUp,
        signOut,
        refreshUser: fetchUser,
        resetPassword,
        confirmPasswordReset,
        acceptInvite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
