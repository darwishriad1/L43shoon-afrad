import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, onIdTokenChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { authService } from '../services/auth';
import { User, AuthUser } from '../types';
import { setUnauthorizedListener, setApiAuthToken } from '../services/api';

function explainAuthError(error: unknown, fallback: string): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message = error instanceof Error ? error.message : '';
  if (code === 'auth/unauthorized-domain') {
    return `نطاق تشغيل التطبيق غير مصرح به في Firebase. أضف النطاق الحالي إلى Firebase Authentication > Settings > Authorized domains، ثم أعد المحاولة. النطاق الحالي: ${window.location.hostname}`;
  }
  if (code === 'auth/popup-blocked') return 'المتصفح منع نافذة Google؛ اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.';
  if (code === 'auth/popup-closed-by-user') return 'تم إغلاق نافذة Google قبل إكمال تسجيل الدخول.';
  if (code === 'auth/operation-not-allowed') return 'تسجيل الدخول عبر Google غير مفعّل في Firebase Authentication > Sign-in method.';
  if (message.includes('فشل الاتصال') || message.includes('NetworkError') || message.includes('Failed to fetch')) {
    return 'لا يمكن الوصول إلى خادم التطبيق. شغّل الخادم عبر npm run dev أو npm start، وتأكد من إعداد PostgreSQL وملف .env، ثم افتح التطبيق من عنوان الخادم نفسه.';
  }
  return message || fallback;
}

export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string>('');

  useEffect(() => {
    setApiAuthToken(token);
  }, [token]);

  const logout = useCallback(async () => {
    localStorage.removeItem('military_auth_token');
    localStorage.removeItem('authToken');
    setApiAuthToken(null);
    setToken(null);
    setAuthUser(null);
    setDbUser(null);
    try {
      await signOut(auth);
    } catch {
      // Ignore firebase signout error if offline
    }
  }, []);

  useEffect(() => {
    setUnauthorizedListener(() => {
      logout();
    });
    return () => setUnauthorizedListener(null);
  }, [logout]);

  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      const localToken = localStorage.getItem('military_auth_token') || localStorage.getItem('authToken');
      if (localToken) {
        try {
          const profile = await authService.getMe(localToken);
          if (!active) return;
          setToken(localToken);
          setAuthUser({
            uid: profile.id,
            email: profile.email || `${profile.id}@local.com`,
            displayName: profile.name || 'مستخدم',
          });
          setDbUser(profile);
          setLoadingAuth(false);
          return;
        } catch (err: unknown) {
          const apiErr = err as { status?: number; message?: string };
          console.warn('Session token invalid or expired, clearing token:', err);
          if (apiErr?.status === 401 || apiErr?.status === 403) {
            localStorage.removeItem('military_auth_token');
            localStorage.removeItem('authToken');
          }
        }
      }

      const unsubscribeIdToken = onIdTokenChanged(auth, async (fbUser) => {
        if (!active) return;
        if (fbUser) {
          try {
            let freshToken = await fbUser.getIdToken();
            let profile;
            try {
              profile = await authService.getMe(freshToken);
            } catch (e) {
              // Force token refresh if expired
              freshToken = await fbUser.getIdToken(true);
              profile = await authService.getMe(freshToken);
            }
            if (!active) return;
            localStorage.setItem('military_auth_token', freshToken);
            localStorage.setItem('authToken', freshToken);
            setToken(freshToken);
            setAuthUser({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || profile?.name || 'مستخدم',
            });
            setDbUser(profile);
          } catch (e) {
            console.error('Firebase token verification error:', e);
          } finally {
            if (active) setLoadingAuth(false);
          }
        } else {
          setAuthUser(null);
          setDbUser(null);
          setToken(null);
          setLoadingAuth(false);
        }
      });

      return () => {
        unsubscribeIdToken();
      };
    };

    initAuth();

    return () => {
      active = false;
    };
  }, []);

  const loginWithPassword = useCallback(async (username: string, password: string, otp?: string) => {
    setLoginError('');
    if (!username || !password) {
      setLoginError('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return false;
    }

    try {
      const res = await authService.login(username, password, otp);
      localStorage.setItem('military_auth_token', res.token);
      localStorage.setItem('authToken', res.token);
      setToken(res.token);
      setAuthUser({
        uid: res.user.id,
        email: res.user.email || 'user@local.com',
        displayName: res.user.name || 'مستخدم',
      });
      setDbUser(res.user);
      return true;
    } catch (err: unknown) {
      setLoginError(explainAuthError(err, 'فشل تسجيل الدخول: اسم المستخدم أو كلمة المرور خاطئة'));
      return false;
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      const profile = await authService.getMe(idToken);
      localStorage.setItem('military_auth_token', idToken);
      localStorage.setItem('authToken', idToken);
      setToken(idToken);
      setAuthUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
      });
      setDbUser(profile);
      return true;
    } catch (err: unknown) {
      setLoginError(explainAuthError(err, 'فشل تسجيل الدخول عبر جوجل'));
      return false;
    }
  }, []);

  return {
    authUser,
    dbUser,
    token,
    loadingAuth,
    loginError,
    setLoginError,
    setDbUser,
    loginWithPassword,
    loginWithGoogle,
    logout,
  };
}
