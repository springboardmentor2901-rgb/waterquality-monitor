import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';


const Navbar = () => {
    const { currentUser, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">

                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-blue-50 dark:bg-blue-900/40 rounded-lg">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                            >
                                <path d="M12 2.25a.75.75 0 01.612.317l6.75 9a.75.75 0 01.138.433v.75a6.75 6.75 0 01-13.5 0V12a.75.75 0 01.138-.433l6.75-9A.75.75 0 0112 2.25z" />
                            </svg>
                        </div>
                        <div>
                            <span className="text-base font-semibold text-gray-900 dark:text-white">
                                Water Quality Monitor
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                        <button
                            id="theme-toggle-btn"
                            onClick={toggleTheme}
                            className="relative flex items-center justify-center w-9 h-9 rounded-lg
                                       border border-gray-200 dark:border-gray-600
                                       bg-gray-50 dark:bg-gray-800
                                       hover:bg-gray-100 dark:hover:bg-gray-700
                                       transition-all duration-300 group"
                            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className={`w-5 h-5 absolute transition-all duration-300 text-amber-500
                                    ${theme === 'dark'
                                        ? 'opacity-100 rotate-0 scale-100'
                                        : 'opacity-0 rotate-90 scale-0'
                                    }`}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                            </svg>

                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className={`w-5 h-5 absolute transition-all duration-300 text-indigo-500
                                    ${theme === 'light'
                                        ? 'opacity-100 rotate-0 scale-100'
                                        : 'opacity-0 -rotate-90 scale-0'
                                    }`}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 006.002-2.048z" aria-hidden="true" />
                            </svg>
                        </button>

                        {currentUser && (
                            <>
                                <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                                    {currentUser}
                                </span>

                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium 
                                       text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg 
                                       hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                                >
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;