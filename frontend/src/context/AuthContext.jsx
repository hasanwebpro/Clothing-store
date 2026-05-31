/**
 * AuthContext — global authentication state.
 *
 * Security model
 * ──────────────
 * • Refresh token  → httpOnly cookie (set by server, JS cannot read it).
 *                    Survives page refresh. Protected against XSS and CSRF.
 * • Access token   → in-memory only (never written to localStorage).
 *                    Lost on page refresh; recovered instantly via the cookie.
 * • User profile   → localStorage (name, email, role — not sensitive).
 *                    Lets us render the navbar instantly while the silent
 *                    refresh is in flight, preventing a flash of "logged-out" UI.
 *
 * Session restore on page load
 * ────────────────────────────
 * 1. Read user profile from localStorage → optimistically render logged-in UI.
 * 2. Immediately POST /auth/refresh/ (browser sends cookie automatically).
 * 3a. Success → set new access token in memory, confirm logged-in state.
 * 3b. Failure → clear localStorage, show logged-out UI.
 *
 * The user never sees a logout on refresh as long as their 7-day cookie is valid.
 */
import { createContext, useContext, useReducer, useEffect } from 'react';
import { authApi } from '../api/auth.api';
import { setAccessToken, clearAccessToken } from '../api/client';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { user: action.payload, isAuthenticated: true, isLoading: false };
    case 'LOGOUT':
      return { user: null, isAuthenticated: false, isLoading: false };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const restore = async () => {
      // Optimistically show the cached user profile while the refresh is in-flight.
      // This prevents a flash of logged-out UI on page reload.
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          dispatch({ type: 'LOGIN_SUCCESS', payload: JSON.parse(cachedUser) });
        } catch {
          localStorage.removeItem('user');
        }
      }

      // Always attempt a silent refresh — the httpOnly cookie is sent automatically.
      // This is the single source of truth for whether the session is still valid.
      try {
        const { data } = await authApi.refresh();
        setAccessToken(data.access);
        // If the server returns updated user info, keep localStorage in sync
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
        } else if (cachedUser) {
          // Access token refreshed, profile already dispatched above
          dispatch({ type: 'LOGIN_SUCCESS', payload: JSON.parse(cachedUser) });
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        // Cookie expired / missing — clear everything and go to guest state
        clearAccessToken();
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
      }
    };

    restore();
  }, []);

  const login = async (email, password) => {
    const { data } = await authApi.login(email, password);
    // Access token → memory only (never localStorage)
    setAccessToken(data.access);
    // User profile → localStorage for instant restore on next page load
    localStorage.setItem('user', JSON.stringify(data.user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
    return data.user;
  };

  // Used by Google OAuth and any future SSO
  const loginWithData = (data) => {
    setAccessToken(data.access);
    localStorage.setItem('user', JSON.stringify(data.user));
    dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
    return data.user;
  };

  const logout = async () => {
    try {
      // Server blacklists the refresh token and clears the httpOnly cookie
      await authApi.logout();
    } catch (_) {}
    clearAccessToken();
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (updated) => {
    const merged = { ...state.user, ...updated };
    localStorage.setItem('user', JSON.stringify(merged));
    dispatch({ type: 'UPDATE_USER', payload: updated });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithData, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
