/**
 * ProtectedRoute.jsx
 * -------------------
 * A wrapper component that guards routes from unauthorized access.
 *
 * Logic:
 *  - Not logged in → redirect to /login
 *  - Logged in but no profile → redirect to /setup
 *  - Logged in + profile complete → show the page
 *
 * Usage:
 *   <ProtectedRoute>
 *     <Dashboard />
 *   </ProtectedRoute>
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
    const { currentUser, isProfileComplete } = useAuth();

    // Not logged in → go to login page
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // Logged in but profile not set up → go to profile setup
    if (!isProfileComplete) {
        return <Navigate to="/setup" replace />;
    }

    // All good → show the protected page
    return children;
};

export default ProtectedRoute;
