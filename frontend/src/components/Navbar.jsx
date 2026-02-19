/**
 * Navbar.jsx
 * -----------
 * Top navigation bar shown on all pages.
 * Displays the app logo and a logout button when the user is logged in.
 */

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';


const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    // Handle logout: clear session and go to login
    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    {/* ── Logo & App Name ── */}
                    <div className="flex items-center gap-2">
                        {/* Water drop icon */}
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-5 h-5 text-blue-600"
                            >
                                <path d="M12 2.25a.75.75 0 01.612.317l6.75 9a.75.75 0 01.138.433v.75a6.75 6.75 0 01-13.5 0V12a.75.75 0 01.138-.433l6.75-9A.75.75 0 0112 2.25z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-base font-semibold text-gray-900">
                                Water Quality Monitor
                            </span>

                        </div>
                    </div>

                    {/* ── Right side: user info + logout ── */}
                    {currentUser && (
                        <div className="flex items-center gap-3">
                            {/* Show user email (truncated on small screens) */}
                            <span className="hidden sm:block text-sm text-gray-500 truncate max-w-[180px]">
                                {currentUser}
                            </span>

                            {/* Logout button */}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium 
                           text-gray-600 border border-gray-300 rounded-lg 
                           hover:bg-gray-50 hover:text-gray-900 transition-colors duration-200"
                            >
                                {/* Logout icon */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-4 h-4"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
                                    />
                                </svg>
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
