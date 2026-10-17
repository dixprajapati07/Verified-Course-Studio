// src/context/AppContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clearAuthToken } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authSession, setAuthSessionState] = useState(() => {
    try {
      const stored = localStorage.getItem('vcs_auth_session');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  // A navigate function that can be provided by components inside the Router
  const [navigateRef, setNavigateRef] = useState(null);

  // Guest Session management using sessionStorage
  const [guestSession, setGuestSession] = useState(() => {
    try {
      const stored = sessionStorage.getItem('vcs_guest_session');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const createGuestSession = useCallback(() => {
    const session = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
      isGuest: true
    };
    try {
      sessionStorage.setItem('vcs_guest_session', JSON.stringify(session));
    } catch (e) { }
    setGuestSession(session);
    return session;
  }, []);

  const clearGuestSession = useCallback(() => {
    try {
      sessionStorage.removeItem('vcs_guest_session');
    } catch (e) { }
    setGuestSession(null);
  }, []);

  // Course creation draft management (preserved across page navigation and refresh)
  const [draftCourse, setDraftCourse] = useState(() => {
    try {
      const stored = sessionStorage.getItem('vcs_draft_course');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const updateDraftCourse = useCallback((data) => {
    setDraftCourse(prev => {
      const updated = { ...(prev || {}), ...data, updatedAt: new Date().toISOString() };
      try {
        sessionStorage.setItem('vcs_draft_course', JSON.stringify(updated));
      } catch (e) { }
      return updated;
    });
  }, []);

  const clearDraftCourse = useCallback(() => {
    try {
      sessionStorage.removeItem('vcs_draft_course');
    } catch (e) { }
    setDraftCourse(null);
  }, []);

  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  const setAuthSession = useCallback((sessionData) => {
    setAuthSessionState(sessionData);
    try {
      if (sessionData) {
        localStorage.setItem('vcs_auth_session', JSON.stringify(sessionData));
      } else {
        localStorage.removeItem('vcs_auth_session');
      }
    } catch (e) { }
  }, []);

  const clearAuthSession = useCallback(() => {
    clearAuthToken();
    setAuthSession(null);
  }, [setAuthSession]);

  // Theme management with localStorage and OS preference detection
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('vcs_theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (e) { }
    return 'dark';
  });

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('vcs_theme', newTheme);
    } catch (e) { }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('vcs_theme', next);
      } catch (e) { }
      return next;
    });
  }, []);

  // Sync data-theme attribute and dark class on document element
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen to OS theme changes if user hasn't explicitly set a preference
  useEffect(() => {
    try {
      const hasStored = localStorage.getItem('vcs_theme');
      if (hasStored) return;

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e) => {
        setThemeState(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch (e) { }
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === 'dark',
      toasts,
      addToast,
      removeToast,
      currentCourse,
      setCurrentCourse,
      // Auth & Guest
      authModalOpen,
      openAuthModal,
      closeAuthModal,
      authSession,
      authUser: authSession?.user || null,
      isAuthenticated: Boolean(authSession?.access_token),
      setAuthSession,
      clearAuthSession,
      // Navigate ref - set by RouterBridge inside BrowserRouter
      navigateRef,
      setNavigateRef,
      guestSession,
      createGuestSession,
      clearGuestSession,
      // Course Creation Draft
      draftCourse,
      updateDraftCourse,
      clearDraftCourse
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}