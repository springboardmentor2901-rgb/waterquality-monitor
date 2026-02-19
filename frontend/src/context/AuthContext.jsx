/**
 * AuthContext.jsx
 * ---------------
 * React Context for Authentication.
 * All sign-up / sign-in data is now persisted to data/users.json
 * via the Express backend running on http://localhost:5000.
 *
 * The current session (logged-in email) is still kept in
 * localStorage so the user stays logged in on page refresh.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── 1. Create the Context ────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── 2. Backend base URL ──────────────────────────────────────────────────────
// The React dev server proxies /api/* to localhost:5000 (see package.json proxy).
const API = 'http://localhost:5000';

// ─── 3. Session key (localStorage) ───────────────────────────────────────────
const SESSION_KEY = 'wqm_current'; // stores the logged-in user's email

// ─── 4. AuthProvider Component ────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null); // email string or null
    const [profile, setProfile] = useState(null); // profile object or null
    const [loading, setLoading] = useState(true); // true while restoring session

    // ── On app load: restore session from localStorage ──────────────────────────
    useEffect(() => {
        const savedEmail = localStorage.getItem(SESSION_KEY);
        if (savedEmail) {
            setCurrentUser(savedEmail);
            // Fetch the profile from the backend
            fetch(`${API}/api/users`)
                .then(r => r.json())
                .then(data => {
                    const user = (data.users || []).find(u => u.email === savedEmail);
                    setProfile(user?.profile || null);
                })
                .catch(() => { }) // ignore network errors on restore
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    // ── SIGNUP ──────────────────────────────────────────────────────────────────
    /**
     * Register a new user via POST /api/signup.
     * @returns {Promise<string|null>} Error message, or null on success.
     */
    const signup = async (email, password) => {
        try {
            const res = await fetch(`${API}/api/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                return data.error || 'Signup failed. Please try again.';
            }

            // Auto-login after signup
            localStorage.setItem(SESSION_KEY, email);
            setCurrentUser(email);
            setProfile(null); // Profile not set yet

            return null; // null = no error
        } catch {
            return 'Cannot connect to the server. Make sure the backend is running.';
        }
    };

    // ── LOGIN ───────────────────────────────────────────────────────────────────
    /**
     * Log in an existing user via POST /api/login.
     * @returns {Promise<string|null>} Error message, or null on success.
     */
    const login = async (email, password) => {
        try {
            const res = await fetch(`${API}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                return data.error || 'Login failed. Please try again.';
            }

            // Save session
            localStorage.setItem(SESSION_KEY, email);
            setCurrentUser(email);
            setProfile(data.profile || null);

            return null; // null = no error
        } catch {
            return 'Cannot connect to the server. Make sure the backend is running.';
        }
    };

    // ── LOGOUT ──────────────────────────────────────────────────────────────────
    const logout = () => {
        localStorage.removeItem(SESSION_KEY);
        setCurrentUser(null);
        setProfile(null);
    };

    // ── SAVE PROFILE ────────────────────────────────────────────────────────────
    /**
     * Save the user's profile data via POST /api/profile.
     * @param {object} profileData - The profile fields to save.
     * @returns {Promise<string|null>} Error message or null on success.
     */
    const saveProfile = async (profileData) => {
        try {
            const res = await fetch(`${API}/api/profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser, profile: profileData }),
            });
            const data = await res.json();

            if (!res.ok) {
                return data.error || 'Failed to save profile.';
            }

            setProfile(data.profile);
            return null; // success
        } catch {
            return 'Cannot connect to the server. Make sure the backend is running.';
        }
    };


    // ── Context Value ────────────────────────────────────────────────────────────
    const value = {
        currentUser,                    // email string or null
        profile,                        // profile object or null
        loading,                        // boolean
        signup,                         // async function
        login,                          // async function
        logout,                         // function
        saveProfile,                    // async function
        isProfileComplete: !!profile,   // boolean shorthand
    };

    return (
        <AuthContext.Provider value={value}>
            {/* Don't render children until we've restored the session */}
            {!loading && children}
        </AuthContext.Provider>
    );
};

// ─── 5. Custom Hook ───────────────────────────────────────────────────────────
/**
 * useAuth() — Use this hook in any component to access auth state.
 * Example: const { currentUser, login, logout } = useAuth();
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used inside an <AuthProvider>');
    }
    return context;
};
