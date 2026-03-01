import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const F = ({ label, id, type = 'text', value, onChange, placeholder, error, children }) => (
    <div>
        <label htmlFor={id} className="input-label">{label}</label>
        {children || (
            <input id={id} type={type} value={value} onChange={onChange}
                placeholder={placeholder}
                className={`input-field ${error ? 'border-red-400 focus:ring-red-400' : ''}`} />
        )}
        {error && <p className="error-text">⚠ {error}</p>}
    </div>
);

const AuthPage = () => {
    const { currentUser, isProfileComplete, login, signup } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState('login');
    const [loading, setLoading] = useState(false);

    const [lf, setLf] = useState({ email: '', password: '' });
    const [le, setLe] = useState({});
    const [lapiErr, setLapiErr] = useState('');

    const [sf, setSf] = useState({ email: '', password: '', confirm: '', phone: '' });
    const [se, setSe] = useState({});
    const [sapiErr, setSapiErr] = useState('');

    if (currentUser) return <Navigate to={isProfileComplete ? '/dashboard' : '/setup'} replace />;

    const validateLogin = () => {
        const e = {};
        if (!lf.email.trim()) e.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lf.email)) e.email = 'Enter a valid email.';
        if (!lf.password) e.password = 'Password is required.';
        return e;
    };

    const validateSignup = () => {
        const e = {};
        if (!sf.email.trim()) e.email = 'Email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sf.email)) e.email = 'Enter a valid email.';
        if (!sf.password) e.password = 'Password is required.';
        else if (sf.password.length < 6) e.password = 'Minimum 6 characters.';
        if (!sf.confirm) e.confirm = 'Please confirm your password.';
        else if (sf.password !== sf.confirm) e.confirm = 'Passwords do not match.';
        if (!sf.phone.trim()) e.phone = 'Phone number is required.';
        else if (!/^[6-9]\d{9}$/.test(sf.phone.trim())) e.phone = 'Enter a valid 10-digit Indian number.';
        return e;
    };

    const handleLogin = async (e) => {
        e.preventDefault(); setLapiErr('');
        const err = validateLogin(); setLe(err);
        if (Object.keys(err).length) return;
        setLoading(true);
        const apiErr = await login(lf.email.trim(), lf.password);
        setLoading(false);
        if (apiErr) setLapiErr(apiErr); else navigate('/setup');
    };

    const handleSignup = async (e) => {
        e.preventDefault(); setSapiErr('');
        const err = validateSignup(); setSe(err);
        if (Object.keys(err).length) return;
        setLoading(true);

        const autoUsername = sf.email.trim().split('@')[0].replace(/[^a-z0-9_]/gi, '_');

        const result = await signup(
            sf.email.trim(), sf.password,
            autoUsername, '',
            sf.phone.trim() || null,
            null,
        );

        if (result) {
            setLoading(false);
            const { error, field } = result;
            if (field === 'email') {
                setSe(p => ({ ...p, email: error }));
            } else if (field === 'phone') {
                setSe(p => ({ ...p, phone: error }));
            } else if (field === 'both') {
                setSe(p => ({ ...p, email: 'This email is already registered.', phone: 'This phone number is already registered.' }));
            } else {
                setSapiErr(error);
            }
            return;
        }

        const loginErr = await login(sf.email.trim(), sf.password);
        setLoading(false);
        if (!loginErr) navigate('/setup');
        else setSapiErr('Account created! Please log in.');
    };

    const switchTab = (t) => { setTab(t); setLe({}); setSe({}); setLapiErr(''); setSapiErr(''); };
    const setS = (k) => (e) => setSf(p => ({ ...p, [k]: e.target.value }));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-10 px-4 transition-colors duration-300">

            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
                <div className="flex justify-center mb-3">
                    <div className="w-11 h-11 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center shadow-md">
                        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                            <path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0C19 10 12 2 12 2z" />
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">WaterWatch India</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Water Quality Monitoring Platform</p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md dark:shadow-gray-900/30 px-6 py-7 sm:px-8 transition-colors duration-300">

                    <div className="flex border border-gray-200 dark:border-gray-600 rounded-lg p-1 mb-6 bg-gray-50 dark:bg-gray-700/50 gap-1">
                        {['login', 'signup'].map(t => (
                            <button key={t} onClick={() => switchTab(t)}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${tab === t
                                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-gray-600'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                    }`}>
                                {t === 'login' ? 'Sign In' : 'Create Account'}
                            </button>
                        ))}
                    </div>

                    {tab === 'login' && (
                        <form onSubmit={handleLogin} noValidate className="space-y-4">
                            {lapiErr && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">{lapiErr}</div>
                            )}
                            <F label="Email Address" id="l-email" type="email" value={lf.email}
                                onChange={e => setLf({ ...lf, email: e.target.value })}
                                placeholder="you@example.com" error={le.email} />
                            <F label="Password" id="l-pw" type="password" value={lf.password}
                                onChange={e => setLf({ ...lf, password: e.target.value })}
                                placeholder="Enter your password" error={le.password} />
                            <button type="submit" disabled={loading} className="btn-primary mt-1">
                                {loading ? 'Signing in…' : 'Sign In'}
                            </button>
                            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                                Don't have an account?{' '}
                                <button type="button" onClick={() => switchTab('signup')} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                    Create one
                                </button>
                            </p>
                        </form>
                    )}

                    {tab === 'signup' && (
                        <form onSubmit={handleSignup} noValidate className="space-y-4">
                            {sapiErr && (
                                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-600 dark:text-red-400">⚠ {sapiErr}</div>
                            )}

                            <F label="Email Address *" id="s-email" type="email" value={sf.email}
                                onChange={setS('email')} placeholder="you@example.com" error={se.email} />

                            <F label="Password *" id="s-pw" type="password" value={sf.password}
                                onChange={setS('password')} placeholder="Minimum 6 characters" error={se.password} />

                            <F label="Confirm Password *" id="s-confirm" type="password" value={sf.confirm}
                                onChange={setS('confirm')} placeholder="Re-enter your password" error={se.confirm} />

                            <F label="Phone Number *" id="s-phone" error={se.phone}>
                                <div className="flex">
                                    <span className="inline-flex items-center px-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg">+91</span>
                                    <input id="s-phone" type="tel" value={sf.phone} onChange={setS('phone')}
                                        placeholder="9876543210" maxLength={10}
                                        className={`input-field rounded-l-none ${se.phone ? 'border-red-400' : ''}`} />
                                </div>
                            </F>

                            <button type="submit" disabled={loading} className="btn-primary mt-1">
                                {loading ? 'Creating account…' : 'Create Account'}
                            </button>
                            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                                Already have an account?{' '}
                                <button type="button" onClick={() => switchTab('login')} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                    Sign in
                                </button>
                            </p>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AuthPage;
