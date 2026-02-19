/**
 * ProfileSetupPage.jsx
 * ---------------------
 * After a user signs up (or logs in for the first time),
 * they are redirected here to complete their profile.
 *
 * Fields:
 *  - Username (unique, checked live against backend)
 *  - Full Name
 *  - Phone Number
 *  - City
 *  - State
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000';

// ─── List of Indian States ────────────────────────────────────────────────────
const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
];

// ─── Reusable Input Field ─────────────────────────────────────────────────────
const FormField = ({ label, id, required, error, hint, children }) => (
    <div>
        <label htmlFor={id} className="input-label">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {hint && !error && <p className="text-xs mt-1 text-gray-400">{hint}</p>}
        {error && <p className="error-text">{error}</p>}
    </div>
);

// ─── Step Indicator ───────────────────────────────────────────────────────────
const StepBadge = ({ step, total }) => (
    <div className="flex items-center gap-1 mb-1">
        {Array.from({ length: total }).map((_, i) => (
            <div
                key={i}
                className={`h-1 rounded-full flex-1 transition-all duration-300 ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
        ))}
    </div>
);

// ─── Main ProfileSetupPage ────────────────────────────────────────────────────
const ProfileSetupPage = () => {
    const { currentUser, isProfileComplete, saveProfile } = useAuth();
    const navigate = useNavigate();

    // Form data state
    const [form, setForm] = useState({
        username: '',
        fullName: '',
        phone: '',
        city: '',
        state: '',
    });

    // Validation errors per field
    const [errors, setErrors] = useState({});

    // Username availability state: null | 'checking' | 'available' | 'taken'
    const [usernameStatus, setUsernameStatus] = useState(null);

    // Loading state while saving
    const [saving, setSaving] = useState(false);

    // Debounce timer ref for username check
    const usernameTimer = useRef(null);

    // ── Redirect if not logged in ──
    if (!currentUser) return <Navigate to="/login" replace />;
    if (isProfileComplete) return <Navigate to="/dashboard" replace />;

    // ─── Update a single field ─────────────────────────────────────────────────
    const handleChange = (field) => (e) => {
        const value = e.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }

        // Live username availability check (debounced 500ms)
        if (field === 'username') {
            setUsernameStatus(null);
            clearTimeout(usernameTimer.current);

            const trimmed = value.trim();
            if (trimmed.length >= 3 && /^[a-zA-Z0-9_]+$/.test(trimmed)) {
                setUsernameStatus('checking');
                usernameTimer.current = setTimeout(async () => {
                    try {
                        const res = await fetch(
                            `${API}/api/check-username?username=${encodeURIComponent(trimmed)}&email=${encodeURIComponent(currentUser)}`
                        );
                        const data = await res.json();
                        setUsernameStatus(data.available ? 'available' : 'taken');
                    } catch {
                        setUsernameStatus(null);
                    }
                }, 500);
            }
        }
    };

    // ─── Validate all fields ───────────────────────────────────────────────────
    const validate = () => {
        const newErrors = {};

        // Username
        if (!form.username.trim()) {
            newErrors.username = 'Username is required.';
        } else if (form.username.trim().length < 3) {
            newErrors.username = 'Username must be at least 3 characters.';
        } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
            newErrors.username = 'Only letters, numbers, and underscores allowed.';
        } else if (usernameStatus === 'taken') {
            newErrors.username = 'This username is already taken.';
        }

        // Full Name
        if (!form.fullName.trim()) {
            newErrors.fullName = 'Full name is required.';
        } else if (form.fullName.trim().length < 2) {
            newErrors.fullName = 'Name must be at least 2 characters.';
        }

        // Phone
        if (!form.phone.trim()) {
            newErrors.phone = 'Phone number is required.';
        } else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) {
            newErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
        }

        // City
        if (!form.city.trim()) {
            newErrors.city = 'City is required.';
        }

        // State
        if (!form.state) {
            newErrors.state = 'Please select your state.';
        }

        return newErrors;
    };

    // ─── Handle Form Submit ────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validate();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        // Don't submit if username check is still in progress
        if (usernameStatus === 'checking') {
            setErrors((prev) => ({ ...prev, username: 'Please wait, checking username...' }));
            return;
        }

        setSaving(true);

        const result = await saveProfile({
            username: form.username.trim().toLowerCase(),
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            city: form.city.trim(),
            state: form.state,
        });

        setSaving(false);

        // saveProfile returns an error string or null
        if (result) {
            if (result.toLowerCase().includes('username')) {
                setErrors((prev) => ({ ...prev, username: result }));
                setUsernameStatus('taken');
            }
            return;
        }

        navigate('/dashboard');
    };

    // Count filled fields for progress bar (5 total now)
    const filledCount = Object.values(form).filter((v) => v.trim() !== '').length;

    // Username status indicator
    const renderUsernameStatus = () => {
        if (usernameStatus === 'checking') {
            return (
                <span className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Checking availability...
                </span>
            );
        }
        if (usernameStatus === 'available') {
            return <span className="text-xs text-green-600 mt-1 flex items-center gap-1">✓ Username is available!</span>;
        }
        if (usernameStatus === 'taken') {
            return <span className="text-xs text-red-500 mt-1 flex items-center gap-1">✗ Username is already taken.</span>;
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-xl mx-auto">

                {/* ── Header ── */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Please fill in your details to start using Water Quality Monitor.
                    </p>

                    {/* Progress bar */}
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Profile completion</span>
                            <span>{Math.round((filledCount / 5) * 100)}%</span>
                        </div>
                        <StepBadge step={filledCount} total={5} />
                    </div>
                </div>

                {/* ── Form Card ── */}
                <div className="bg-white border border-gray-200 rounded-xl shadow-card p-6 sm:p-8">
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">

                        {/* ── Username ── */}
                        <FormField
                            label="Username"
                            id="username"
                            required
                            error={errors.username}
                            hint="Letters, numbers, and underscores only. Must be unique."
                        >
                            <div className="relative">
                                <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm select-none">
                                    @
                                </span>
                                <input
                                    id="username"
                                    type="text"
                                    value={form.username}
                                    onChange={handleChange('username')}
                                    placeholder="e.g. archi_jain"
                                    maxLength={30}
                                    className={`input-field pl-7 ${errors.username ? 'border-red-400' :
                                        usernameStatus === 'available' ? 'border-green-400 focus:ring-green-400 focus:border-green-400' :
                                            usernameStatus === 'taken' ? 'border-red-400' : ''}`}
                                />
                            </div>
                            {!errors.username && renderUsernameStatus()}
                        </FormField>

                        {/* ── Full Name ── */}
                        <FormField label="Full Name" id="fullName" required error={errors.fullName}>
                            <input
                                id="fullName"
                                type="text"
                                value={form.fullName}
                                onChange={handleChange('fullName')}
                                placeholder="e.g. Arjun Sharma"
                                className={`input-field ${errors.fullName ? 'border-red-400' : ''}`}
                            />
                        </FormField>

                        {/* ── Phone Number ── */}
                        <FormField label="Phone Number" id="phone" required error={errors.phone}>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg">
                                    +91
                                </span>
                                <input
                                    id="phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={handleChange('phone')}
                                    placeholder="9876543210"
                                    maxLength={10}
                                    className={`input-field rounded-l-none ${errors.phone ? 'border-red-400' : ''}`}
                                />
                            </div>
                        </FormField>

                        {/* ── City & State ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField label="City" id="city" required error={errors.city}>
                                <input
                                    id="city"
                                    type="text"
                                    value={form.city}
                                    onChange={handleChange('city')}
                                    placeholder="e.g. Pune"
                                    className={`input-field ${errors.city ? 'border-red-400' : ''}`}
                                />
                            </FormField>

                            <FormField label="State" id="state" required error={errors.state}>
                                <select
                                    id="state"
                                    value={form.state}
                                    onChange={handleChange('state')}
                                    className={`input-field ${errors.state ? 'border-red-400' : ''}`}
                                >
                                    <option value="">Select state</option>
                                    {INDIAN_STATES.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </FormField>
                        </div>

                        {/* ── Submit Button ── */}
                        <button
                            type="submit"
                            disabled={saving || usernameStatus === 'checking' || usernameStatus === 'taken'}
                            className="btn-primary mt-2"
                        >
                            {saving ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Saving Profile...
                                </span>
                            ) : (
                                'Save & Continue'
                            )}
                        </button>

                    </form>
                </div>

                {/* Note */}
                <p className="text-center text-xs text-gray-400 mt-4">
                    Fields marked with <span className="text-red-500">*</span> are required.
                </p>
            </div>
        </div>
    );
};

export default ProfileSetupPage;
