/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useReducer } from 'react';

const AuthContext = createContext(null);
const WARNING_AFTER = 14 * 60 * 1000;
const LOGOUT_AFTER = 15 * 60 * 1000;

function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

function decodeRole(token) {
  return decodeToken(token).role || null;
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

function createInitialState() {
  const token = getStoredToken();

  return {
    user: token ? { name: 'Ananya Rao', role: 'Case Officer', initials: 'AR' } : null,
    token,
    role: token ? decodeRole(token) : null,
    sessionWarning: false,
  };
}

function reducer(state, action) {
  if (action.type === 'LOGIN') return { ...state, ...action.payload, sessionWarning: false };
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

  return <AuthContext.Provider value={{ ...state, dispatch, logout, staySignedIn }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
