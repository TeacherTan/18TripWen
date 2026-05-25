import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch, getStoredJwt, setStoredJwt } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 启动时尝试用 localStorage JWT 恢复会话
  useEffect(() => {
    const token = getStoredJwt();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch('/auth/me')
      .then((data) => {
        // 若 /auth/me 在途中有新登录替换了 JWT，丢弃旧响应避免覆盖新用户状态
        if (getStoredJwt() === token) setUser(data.user);
      })
      .catch(() => setStoredJwt(null))
      .finally(() => setLoading(false));
  }, []);

  const loginWithNfc = useCallback(async (nfcToken) => {
    const data = await apiFetch('/auth/nfc', {
      method: 'POST',
      auth: false,
      body: { token: nfcToken },
    });
    setStoredJwt(data.jwt);
    setUser(data.user);
    return data;
  }, []);

  const loginWithPassword = useCallback(async (username, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      auth: false,
      body: { username, password },
    });
    setStoredJwt(data.jwt);
    setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (username, password, city) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: { username, password, city },
    });
    setStoredJwt(data.jwt);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(() => {
    setStoredJwt(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, loginWithNfc, loginWithPassword, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
