import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../config/api';
import { 
  HeartPulse, 
  Sparkles, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Loader2, 
  Stethoscope, 
  MessageSquare, 
  Activity,
  KeyRound
} from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '384094224888-h8gc6s0k6q66q3glc9dtvv9l3hbbvpu5.apps.googleusercontent.com';

export default function AuthLanding({ onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [googleReady, setGoogleReady] = useState(false);

  const googleBtnContainerRef = useRef(null);

  // Initialize official Google Identity Services
  useEffect(() => {
    let checkInterval = null;

    const initGoogleIdentity = () => {
      if (!window.google?.accounts?.id || !googleBtnContainerRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleBtnContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(
          googleBtnContainerRef.current,
          {
            theme: 'outline',
            size: 'large',
            width: 360,
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left'
          }
        );
        setGoogleReady(true);
      } catch (err) {
        console.warn('Google GSI initialization notice:', err);
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleIdentity();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGoogleIdentity();
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [tab]);

  // Handle verified Google OAuth Credential returned by Google
  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) {
      setError('No credential received from Google. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(apiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json().catch(() => ({ error: 'Server connection error' }));
      if (!res.ok) throw new Error(data.error || 'Google authentication failed');

      if (data.token) {
        localStorage.setItem('healthsync_token', data.token);
      }

      setSuccessMsg(`Welcome, ${data.patient?.full_name || 'Patient'}!`);
      setTimeout(() => {
        onAuthSuccess(data.patient);
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Secure Email & Password Login / Signup
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (tab === 'signup' && (!fullName.trim() || fullName.trim().length < 2)) {
      setError('Please enter your full name (minimum 2 characters).');
      return;
    }

    setLoading(true);

    try {
      const endpoint = tab === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = tab === 'signup'
        ? {
            email: cleanEmail,
            password,
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim() || undefined
          }
        : {
            email: cleanEmail,
            password
          };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({
        error: `Server connection failed (Status: ${res.status}). Please check your connection.`
      }));

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      if (data.token) {
        localStorage.setItem('healthsync_token', data.token);
      }

      setSuccessMsg(tab === 'signup' ? 'Account created successfully!' : 'Signed in successfully!');
      setTimeout(() => {
        onAuthSuccess(data.patient);
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex flex-col justify-between text-slate-100 font-sans px-4 py-8">
      {/* Top Brand Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-white shadow-lg ring-2 ring-teal-300/30">
            <HeartPulse className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-white tracking-tight">HealthSync</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30">
                Medical Concierge
              </span>
            </div>
            <p className="text-xs text-teal-200/70 hidden sm:block">
              AI-Powered Omnichannel Triage & Clinical Escalation Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-teal-300/80 bg-teal-900/40 border border-teal-700/40 px-3 py-1.5 rounded-full">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span className="font-semibold">Secure Authentication</span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mx-auto mb-3 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {tab === 'login' ? 'Sign In to HealthSync' : 'Create Patient Account'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {tab === 'login'
              ? 'Enter your credentials to access your personalized medical dashboard'
              : 'Sign up for intelligent voice triage and medical concierge access'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('signup'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-2 text-xs text-teal-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-teal-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Official Google Sign-In Container */}
        <div className="mb-5 flex flex-col items-center justify-center">
          <div 
            ref={googleBtnContainerRef} 
            className="w-full flex justify-center min-h-[42px]"
          />
          {!googleReady && (
            <div className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              <span>Loading Google Sign-In...</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 absolute">
            Or with email & password
          </span>
        </div>

        {/* Secure Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === 'signup' ? 'Create a password (min 6 characters)' : 'Enter your password'}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="555-123-4567"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>{tab === 'login' ? 'Sign In with Password' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            {tab === 'login' ? "Don't have an account yet?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setTab(tab === 'login' ? 'signup' : 'login');
                setError(null);
                setSuccessMsg(null);
              }}
              className="font-bold text-teal-700 hover:underline"
            >
              {tab === 'login' ? 'Create an account' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>

      {/* Feature Badges Footer */}
      <footer className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-xs text-teal-200/80 py-4">
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <Stethoscope className="w-5 h-5 mx-auto mb-1 text-teal-400" />
          <div className="font-bold text-white">Clinical Triage Engine</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Automated urgency screening powered by Google Gemini</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <MessageSquare className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
          <div className="font-bold text-white">Clear Voice Consultation</div>
          <p className="text-[11px] text-slate-400 mt-0.5">High-clarity English & multilingual natural voice</p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
          <Activity className="w-5 h-5 mx-auto mb-1 text-rose-400" />
          <div className="font-bold text-white">Live Nurse Dashboard</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time triage escalation with one-click resolution</p>
        </div>
      </footer>
    </div>
  );
}
