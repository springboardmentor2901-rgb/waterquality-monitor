/**
 * App.jsx
 * --------
 * Root component of the Water Quality Monitor app.
 *
 * Responsibilities:
 *  1. Wrap the entire app with <AuthProvider> (provides auth state everywhere)
 *  2. Set up React Router with all routes
 *  3. Apply the Navbar on every page
 *  4. Protect the /dashboard route using <ProtectedRoute>
 *
 * Route Map:
 *  /login      → AuthPage (Login + Signup tabs)
 *  /setup      → ProfileSetupPage (requires login)
 *  /dashboard  → DashboardPage (requires login + profile)
 *  /           → Redirects to /login
 *  *           → Redirects to /login (404 fallback)
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context
import { AuthProvider } from './context/AuthContext';

// Route guard
import ProtectedRoute from './components/ProtectedRoute';

// Layout
import Navbar from './components/Navbar';

// Pages
import AuthPage from './pages/AuthPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DashboardPage from './pages/DashboardPage';

function App() {
    return (
        // AuthProvider wraps everything so all components can use useAuth()
        <AuthProvider>
            <BrowserRouter>
                {/* Navbar is always visible */}
                <Navbar />

                {/* Main content area */}
                <main>
                    <Routes>
                        {/* ── Public Routes ── */}
                        {/* Login / Signup page */}
                        <Route path="/login" element={<AuthPage />} />

                        {/* ── Semi-protected: must be logged in ── */}
                        {/* Profile setup (login required, but profile not required) */}
                        <Route path="/setup" element={<ProfileSetupPage />} />

                        {/* ── Fully Protected Route ── */}
                        {/* Dashboard: requires login + completed profile */}
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <DashboardPage />
                                </ProtectedRoute>
                            }
                        />

                        {/* ── Default redirect ── */}
                        {/* Root path → go to login */}
                        <Route path="/" element={<Navigate to="/login" replace />} />

                        {/* ── 404 fallback ── */}
                        {/* Any unknown URL → go to login */}
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </main>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
