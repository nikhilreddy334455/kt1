import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../config/api';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Loader2,
  KeyRound,
  ShieldCheck,
  Copy,
  Info,
  Clock
} from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '384094224888-h8gc6s0k6q66q3glc9dtvv9l3hbbvpu5.apps.googleusercontent.com';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
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

  const tokenClientRef = useRef(null);
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
    setOriginNotice(false);
  }, [tab, isOpen]);

  // Pre-initialize Google OAuth client
  useEffect(() => {
    if (!isOpen) return;

    const initClient = () => {
      if (window.google?.accounts?.oauth2 && !tokenClientRef.current) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: handleGoogleTokenResponse,
            error_callback: handleGoogleError
          });
        } catch (e) {
          console.warn('Google client init notice:', e);
        }
      }
    };

    initClient();
    const interval = setInterval(() => {
      if (window.google?.accounts?.oauth2) {
        initClient();
        clearInterval(interval);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleCopyOrigin = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      setTimeout(() => setCopiedOrigin(false), 2000);
    }
  };

  const handleGoogleError = (err) => {
    setLoading(false);
    console.warn('Google OAuth modal notice:', err);

    const errType = err?.type || '';
    const errMsg = err?.message || '';

    if (errType === 'popup_failed_to_open') {
      setError(
        'The Google sign-in popup was blocked by your browser. Please allow popups for this site in your address bar, or sign in with Email & Password below.'
      );
      return;
    }

    if (errType === 'popup_closed') {
      setError('Google sign-in popup was closed. Click Continue with Google to try again, or use Email & Password below.');
      return;
    }

    if (errType === 'origin_mismatch' || errMsg.includes('origin')) {
      setOriginNotice(true);
      setError(
        `Google Console Origin Notice: Domain "${currentOrigin}" may still be propagating in Google Cloud Console (takes 5-10 mins). You can sign in immediately using Email & Password below.`
      );
      return;
    }

    setError('Google sign-in popup could not complete. Please use Email & Password below.');
  };

  const handleGoogleTokenResponse = async (tokenResponse) => {
    if (tokenResponse?.error) {
      setLoading(false);
      if (tokenResponse.error === 'origin_mismatch') {
        setOriginNotice(true);
        setError(
          `Domain "${currentOrigin}" is still propagating in Google Cloud Console (takes 5-10 minutes). Please wait a few moments or sign in with Email & Password below.`
        );
      } else {
        setError(`Google Sign-In: ${tokenResponse.error_description || tokenResponse.error}`);
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
          onClose();
        }, 500);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setError(null);
    setSuccessMsg(null);

    if (!tokenClientRef.current) {
      if (window.google?.accounts?.oauth2) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: handleGoogleTokenResponse,
            error_callback: handleGoogleError
          });
        } catch (e) {
          setError('Google Sign-In is initializing. Please use Email & Password below.');
          return;
        }
      } else {
        setError('Google services are still loading. Please try again or use Email & Password below.');
        return;
      }
    }

    try {
      setLoading(true);
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      setLoading(false);
      console.error('Google OAuth request error:', err);
      setError('Unable to open Google Sign-In popup. Please use Email & Password below.');
    }
  };

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
        onClose();
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute right-5 top-5 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 mx-auto mb-3 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {tab === 'login'
              ? 'Enter your credentials to access your HealthSync account'
              : 'Sign up to begin your personalized triage consultation'}
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => setTab('login')}
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
            onClick={() => setTab('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

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

          {originNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Clock className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" />
                <span>Google Console Propagation</span>
              </div>
              <p className="text-amber-700 leading-relaxed">
                If you recently saved this origin in Google Console, <strong>Google takes 5 to 10 minutes</strong> to propagate across its servers.
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
            </div>
          )}
        </div>

        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 absolute">
            Or with email & password
          </span>
        </div>

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
                  placeholder="e.g. Elena Rostova"
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
    </div>
  );
}
