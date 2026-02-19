/**
 * DashboardPage.jsx
 * ------------------
 * This is the "Profile Completed" page shown after a user
 * has successfully logged in AND completed their profile setup.
 *
 * It displays:
 *  - A success banner
 *  - The user's full profile details in a clean card layout
 *  - A logout button
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Profile Detail Row ───────────────────────────────────────────────────────
// Renders a single label + value pair
const ProfileRow = ({ icon, label, value }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
        {/* Icon circle */}
        <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-gray-900 mt-0.5">{value || '—'}</p>
        </div>
    </div>
);

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const icons = {
    user: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
    ),
    email: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
    ),
    phone: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
    ),
    location: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
        </svg>
    ),
};

// ─── Main DashboardPage ───────────────────────────────────────────────────────
const DashboardPage = () => {
    const { currentUser, profile, logout } = useAuth();
    const navigate = useNavigate();

    // Format the date profile was completed
    const completedDate = profile?.completedAt
        ? new Date(profile.completedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
        : 'N/A';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-6">

                {/* ── Success Banner ── */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4">
                    {/* Checkmark icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            className="w-5 h-5 text-green-600"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-green-800">
                            Profile Completed Successfully!
                        </h2>
                        <p className="text-sm text-green-700 mt-0.5">
                            Welcome to Water Quality Monitor. Your profile was set up on {completedDate}.
                        </p>
                    </div>
                </div>

                {/* ── Profile Card ── */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">

                    {/* Card Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-gray-900">Your Profile</h3>
                            {profile?.username && (
                                <p className="text-xs text-blue-500 font-medium mt-0.5">@{profile.username}</p>
                            )}
                        </div>
                        {/* Avatar circle with initials */}
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {profile?.fullName
                                ? profile.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                                : '?'}
                        </div>
                    </div>

                    {/* Profile Details */}
                    <div className="px-6 py-2 divide-y divide-gray-50">
                        {profile?.username && (
                            <ProfileRow icon={icons.user} label="Username" value={`@${profile.username}`} />
                        )}
                        <ProfileRow icon={icons.user} label="Full Name" value={profile?.fullName} />

                        <ProfileRow icon={icons.email} label="Email Address" value={currentUser} />
                        <ProfileRow icon={icons.phone} label="Phone Number" value={profile?.phone ? `+91 ${profile.phone}` : null} />
                        <ProfileRow icon={icons.location} label="Location" value={profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : null} />
                    </div>
                </div>


                {/* ── Actions ── */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Logout button */}
                    <button
                        onClick={handleLogout}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                       border border-gray-300 rounded-lg text-sm font-medium text-gray-700 
                       bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        Logout
                    </button>

                    {/* Placeholder for future features */}
                    <button
                        onClick={() => alert('Water quality monitoring features coming soon!')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 
                       border border-transparent rounded-lg text-sm font-medium text-white 
                       bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        View Water Data
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DashboardPage;
