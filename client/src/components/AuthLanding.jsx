import React, { useState, useEffect } from 'react';
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
  KeyRound,
  ExternalLink,
  Copy,
  Info
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
  const [originNotice, setOriginNotice] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Copy current origin to clipboard for easy Google Console setup
  const handleCopyOrigin = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    }
  };

  // Real Google OAuth Handler (Popup-based, eliminating automatic 403 iframe loads)
  const handleGoogleSignIn = () => {
    setError(null);
    setSuccessMsg(null);

    if (!window.google?.accounts?.oauth2) {
      setError('Google Sign-In is initializing. If you have an adblocker active, please disable it or use Email & Password below.');
      return;
    }

    try {
      setLoading(true);

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenResponse) => {
          if (tokenResponse?.error) {
            setLoading(false);
            if (tokenResponse.error === 'origin_mismatch' || tokenResponse.error_description?.includes('origin')) {
              setOriginNotice(true);
              setError(`Domain "${currentOrigin}" is not yet registered in Google Cloud Console.`);
            } else {
              setError(`Google Sign-In notice: ${tokenResponse.error_description || tokenResponse.error}`);
            }
            return;
          }

          if (tokenResponse?.access_token) {
            try {
              const res = await fetch(apiUrl('/api/auth/google'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken: tokenResponse.access_token })
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
          } else {
            setLoading(false);
          }
        },
        error_callback: (err) => {
          setLoading(false);
          console.warn('Google OAuth prompt notice:', err);
          if (err?.type === 'origin_mismatch' || err?.message?.includes('origin')) {
            setOriginNotice(true);
            setError(`Domain "${currentOrigin}" is not yet in Google Console Authorized JavaScript origins.`);
          } else {
            setError('Google sign-in popup was closed or unavailable. Please sign in with Email & Password below.');
          }
        }
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setLoading(false);
      console.error('Google OAuth initialization exception:', err);
      setOriginNotice(true);
      setError('Google Sign-In popup could not open. Please use Email & Password below.');
    }
  };

  // Secure Email & Password Login / Signup
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

        {/* Native Official Google Sign-In Button */}
        <div className="mb-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-xs hover:shadow text-xs font-bold text-slate-700 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Google Origin Notice Accordion if origin needs approval */}
          {originNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                <span>Google Console Domain Setup</span>
              </div>
              <p className="text-amber-700 leading-relaxed">
                To allow Google Sign-In on this domain, add this origin to <strong>Authorized JavaScript origins</strong> in Google Cloud Console:
              </p>
              <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-amber-200 font-mono text-[10px]">
                <span className="truncate">{currentOrigin}</span>
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  className="flex items-center gap-1 font-sans text-amber-700 hover:text-amber-900 ml-2 font-bold flex-shrink-0"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedOrigin ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-amber-600">
                Or sign in securely with <strong>Email & Password</strong> below right away.
              </p>
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
                setOriginNotice(false);
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
