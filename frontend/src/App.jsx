import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import ProtectedRoute from './components/ProtectedRoute';

import Navbar from './components/Navbar';

import AuthPage from './pages/AuthPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import DashboardPage from './pages/DashboardPage';

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Navbar />

                    <main>
                        <Routes>
                            <Route path="/login" element={<AuthPage />} />

                            <Route path="/setup" element={<ProfileSetupPage />} />

                            <Route
                                path="/dashboard"
                                element={
                                    <ProtectedRoute>
                                        <DashboardPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route path="/" element={<Navigate to="/login" replace />} />

                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </main>
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
