/**
 * ProfileSetupPage.jsx — Clean simple profile setup matching the login page style.
 */

import React, { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

const ProfileSetupPage = () => {
    const { currentUser, isProfileComplete, saveProfile } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({ username: '', fullName: '', city: '', state: '' });
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [usernameStatus, setUsernameStatus] = useState(null);
    const [saving, setSaving] = useState(false);
    const timer = useRef(null);

    if (!currentUser) return <Navigate to="/login" replace />;
    if (isProfileComplete) return <Navigate to="/dashboard" replace />;

    const filled = Object.values(form).filter(v => v.trim() !== '').length;

    const handleChange = field => e => {
        const value = e.target.value;
        setForm(p => ({ ...p, [field]: value }));
        if (errors[field]) setErrors(p => ({ ...p, [field]: '' }));

        if (field === 'username') {
            setUsernameStatus(null);
            clearTimeout(timer.current);
            const t = value.trim();
            if (t.length >= 3 && /^[a-zA-Z0-9_]+$/.test(t)) {
                setUsernameStatus('checking');
                timer.current = setTimeout(async () => {
                    try {
                        const res = await fetch(`${API}/api/check-username?username=${encodeURIComponent(t)}&email=${encodeURIComponent(currentUser)}`);
                        const data = await res.json();
                        setUsernameStatus(data.available ? 'available' : 'taken');
                    } catch { setUsernameStatus(null); }
                }, 500);
            }
        }
    };

    const validate = () => {
        const e = {};
        if (!form.username.trim()) e.username = 'Username is required.';
        else if (form.username.trim().length < 3) e.username = 'At least 3 characters.';
        else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) e.username = 'Letters, numbers, underscores only.';
        else if (usernameStatus === 'taken') e.username = 'This username is already taken.';
        if (!form.fullName.trim()) e.fullName = 'Full name is required.';
        if (!form.city.trim()) e.city = 'City is required.';
        if (!form.state) e.state = 'Please select your state.';
        return e;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        const errs = validate(); setErrors(errs); setApiError('');
        if (Object.keys(errs).length) return;
        if (usernameStatus === 'checking') { setErrors(p => ({ ...p, username: 'Please wait…' })); return; }
        setSaving(true);

        // Set flag BEFORE saveProfile so it survives any re-render-triggered <Navigate>
        sessionStorage.setItem('justSetup', '1');

        const result = await saveProfile({
            username: form.username.trim().toLowerCase(),
            fullName: form.fullName.trim(),
            city: form.city.trim(),
            state: form.state,
        });
        setSaving(false);
        if (result) {
            sessionStorage.removeItem('justSetup'); // clear on error
            if (result.toLowerCase().includes('username')) {
                setErrors(p => ({ ...p, username: result }));
                setUsernameStatus('taken');
            } else {
                setApiError(result); // show all other errors in banner
            }
            return;
        }
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-xl mx-auto">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Fill in your details to start using Water Quality Monitor.
                    </p>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Profile completion</span>
                            <span>{Math.round((filled / 4) * 100)}%</span>
                        </div>
                        <div className="flex gap-1">
                            {[0, 1, 2, 3].map(i => (
                                <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i < filled ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 sm:p-8">
                    {/* API error banner */}
                    {apiError && (
                        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                            ⚠ {apiError}
                        </div>
                    )}
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">

                        {/* Username */}
                        <div>
                            <label className="input-label">Username <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">@</span>
                                <input type="text" value={form.username} onChange={handleChange('username')}
                                    placeholder="e.g. archi_jain" maxLength={30}
                                    className={`input-field pl-7 ${errors.username ? 'border-red-400' : usernameStatus === 'available' ? 'border-green-400' : ''}`} />
                            </div>
                            {errors.username && <p className="error-text">{errors.username}</p>}
                            {!errors.username && usernameStatus === 'checking' && <p className="text-xs text-gray-400 mt-1">⏳ Checking availability…</p>}
                            {!errors.username && usernameStatus === 'available' && <p className="text-xs text-green-600 mt-1">✓ Username is available!</p>}
                            {!errors.username && usernameStatus === 'taken' && <p className="text-xs text-red-500 mt-1">✗ Username already taken.</p>}
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="input-label">Full Name <span className="text-red-500">*</span></label>
                            <input type="text" value={form.fullName} onChange={handleChange('fullName')}
                                placeholder="e.g. Arjun Sharma"
                                className={`input-field ${errors.fullName ? 'border-red-400' : ''}`} />
                            {errors.fullName && <p className="error-text">{errors.fullName}</p>}
                        </div>

                        {/* City + State */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">City <span className="text-red-500">*</span></label>
                                <input type="text" value={form.city} onChange={handleChange('city')}
                                    placeholder="e.g. Pune"
                                    className={`input-field ${errors.city ? 'border-red-400' : ''}`} />
                                {errors.city && <p className="error-text">{errors.city}</p>}
                            </div>
                            <div>
                                <label className="input-label">State <span className="text-red-500">*</span></label>
                                <select value={form.state} onChange={handleChange('state')}
                                    className={`input-field ${errors.state ? 'border-red-400' : ''}`}>
                                    <option value="">Select state</option>
                                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {errors.state && <p className="error-text">{errors.state}</p>}
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit"
                            disabled={saving || usernameStatus === 'checking' || usernameStatus === 'taken'}
                            className="btn-primary mt-2">
                            {saving ? 'Saving…' : 'Save & Continue →'}
                        </button>

                    </form>
                </div>

                <p className="text-center text-xs text-gray-400 mt-4">
                    Fields marked <span className="text-red-500">*</span> are required.
                </p>
            </div>
        </div>
    );
};

export default ProfileSetupPage;
