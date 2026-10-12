/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useReducer } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);
const WARNING_AFTER = 14 * 60 * 1000;
const LOGOUT_AFTER = 15 * 60 * 1000;

function decodeToken(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
  } catch {
    return {};
  }
}

function decodeRole(token) {
  const payload = decodeToken(token);
  const authority = Array.isArray(payload.authorities) ? payload.authorities[0] : null;
  return (payload.role || authority || '').replace(/^ROLE_/, '') || null;
}

function getStoredToken() {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage.getItem('clrms_token');
  } catch {
    return null;
  }
}

function clearStoredToken() {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem('clrms_token');
  } catch {
    // Ignore storage errors so logout can still complete in restricted contexts.
  }
}

function getStoredDarkMode() {
  if (typeof window === 'undefined') return false;

  try {
    return window.localStorage.getItem('clrms_admin_dark_mode') === 'true';
  } catch {
    return false;
  }
}

function createInitialState() {
  const token = getStoredToken();
  const claims = token ? decodeToken(token) : {};
  const role = token ? decodeRole(token) : null;
  const name = claims.name || claims.email?.split('@')[0] || 'CLRMS User';

  return {
    user: token ? {
      id: claims.sub,
      name,
      email: claims.email || '',
      role: role?.replaceAll('_', ' ') || 'User',
      initials: name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase(),
    } : null,
    token,
    role: token ? decodeRole(token) : null,
    sessionWarning: false,
    darkMode: getStoredDarkMode(),
    pendingApprovals: null,
  };
}

function reducer(state, action) {
  if (action.type === 'LOGIN') return { ...state, ...action.payload, sessionWarning: false };
  if (action.type === 'SET_USER') return { ...state, user: action.payload };
  if (action.type === 'SET_DARK_MODE') return { ...state, darkMode: action.payload };
  if (action.type === 'SET_PENDING_APPROVALS') return { ...state, pendingApprovals: action.payload };
  if (action.type === 'SESSION_WARNING') return { ...state, sessionWarning: true };
  if (action.type === 'SESSION_ACTIVE') return { ...state, sessionWarning: false };
  if (action.type === 'LOGOUT') {
    clearStoredToken();
    return { ...createInitialState(), token: null, user: null, role: null, sessionWarning: false };
  }

  return state;
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

  useEffect(() => {
    if (!state.token) return undefined;
    let active = true;
    api.get('/auth/me')
      .then(response => {
        if (!active) return;
        const account = response.data.data;
        dispatch({
          type: 'SET_USER',
          payload: {
            ...account,
            role: account.role.replaceAll('_', ' '),
            initials: account.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase(),
          },
        });
      })
      .catch(error => {
        if (active && error.response?.status === 401) dispatch({ type: 'LOGOUT' });
      });
    return () => { active = false; };
  }, [state.token]);

  useEffect(() => {
    if (state.role !== 'ADMIN') {
      dispatch({ type: 'SET_PENDING_APPROVALS', payload: null });
      return undefined;
    }

    let active = true;
    api.get('/admin/users', { params: { status: 'PENDING', size: 1 } })
      .then(response => {
        if (active) dispatch({ type: 'SET_PENDING_APPROVALS', payload: response.data.data?.totalElements ?? 0 });
      })
      .catch(() => {
        if (active) dispatch({ type: 'SET_PENDING_APPROVALS', payload: null });
      });
    return () => { active = false; };
  }, [state.role]);

  useEffect(() => {
    try {
      window.localStorage.setItem('clrms_admin_dark_mode', String(state.darkMode));
    } catch {
      // Keep the current session preference when persistent storage is unavailable.
    }
  }, [state.darkMode]);

  useEffect(() => {
    if (!state.token) return undefined;

    let warningTimer;
    let logoutTimer;

    const reset = () => {
      window.clearTimeout(warningTimer);
      window.clearTimeout(logoutTimer);
      dispatch({ type: 'SESSION_ACTIVE' });
      warningTimer = window.setTimeout(() => dispatch({ type: 'SESSION_WARNING' }), WARNING_AFTER);
      logoutTimer = window.setTimeout(() => dispatch({ type: 'LOGOUT' }), LOGOUT_AFTER);
    };

    const events = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, reset, { passive: true }));
    reset();

    return () => {
      events.forEach(event => window.removeEventListener(event, reset));
      window.clearTimeout(warningTimer);
      window.clearTimeout(logoutTimer);
    };
  }, [state.token]);

  const logout = () => dispatch({ type: 'LOGOUT' });
  const staySignedIn = () => dispatch({ type: 'SESSION_ACTIVE' });
  const toggleDarkMode = () => dispatch({ type: 'SET_DARK_MODE', payload: !state.darkMode });

  return <AuthContext.Provider value={{ ...state, dispatch, logout, staySignedIn, toggleDarkMode }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
