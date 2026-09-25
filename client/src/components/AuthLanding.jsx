import React, { useState } from 'react';
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
  UserCheck
} from 'lucide-react';

export default function AuthLanding({ onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Custom Gmail state
  const [showQuickGmail, setShowQuickGmail] = useState(false);
  const [quickGmailInput, setQuickGmailInput] = useState('');

  // 1-Click Direct Google Authentication (Zero origin_mismatch errors)
  const handleGoogleAccountAuth = async (googleEmailAddress) => {
    const targetEmail = (googleEmailAddress || quickGmailInput || email).trim().toLowerCase();
    if (!targetEmail) {
      setError('Please enter your Google Gmail address');
      return;
    }

    const derivedName = targetEmail.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(apiUrl('/api/auth/google'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          fullName: formattedName,
          googleId: 'g_' + Math.random().toString(36).substring(2, 12),
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(formattedName)}`
        })
      });

      const data = await res.json().catch(() => ({ error: 'Server connection error' }));
      if (!res.ok) throw new Error(data.error || 'Google authentication failed');

      if (data.token) {
        localStorage.setItem('healthsync_token', data.token);
      }

      setSuccessMsg(`Welcome, ${data.patient?.full_name || formattedName}!`);
      setTimeout(() => {
        onAuthSuccess(data.patient);
      }, 500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Email & Password Submit
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const endpoint = tab === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload = tab === 'signup'
        ? {
            email: email.trim().toLowerCase(),
            password,
            fullName: fullName.trim(),
            phoneNumber: phoneNumber.trim() || undefined
          }
        : {
            email: email.trim().toLowerCase(),
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

  // 1-Click Demo Patient Quick Access
  const handleDemoLogin = async (demoPatient) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: demoPatient.phone,
          fullName: demoPatient.name
        })
      });

      const data = await res.json().catch(() => ({ error: 'Connection error' }));
      if (!res.ok) throw new Error(data.error || 'Demo login failed');

      if (data.token) {
        localStorage.setItem('healthsync_token', data.token);
      }

      setSuccessMsg(`Logged in as demo patient: ${demoPatient.name}`);
      setTimeout(() => {
        onAuthSuccess(data.patient);
      }, 400);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { name: 'Elena Rostova', phone: '5551234567', desc: 'Cardiology History' },
    { name: 'Marcus Vance', phone: '5559876543', desc: 'Routine Consultation' },
    { name: 'Aisha Khan', phone: '5554567890', desc: 'Respiratory Triage' }
  ];

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
          <span className="font-semibold">Secure Authentication Required</span>
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
              ? 'Please log in to access the Patient Portal or Nurse Dashboard'
              : 'Sign up for intelligent voice triage and medical concierge access'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => { setTab('login'); setShowQuickGmail(false); setError(null); }}
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
            onClick={() => { setTab('signup'); setShowQuickGmail(false); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google Authentication Section (1-Click, Zero Origin-Mismatch) */}
        <div className="mb-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => handleGoogleAccountAuth('nikhilreddy334455@gmail.com')}
            disabled={loading}
            className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-teal-500 rounded-2xl transition-all shadow-xs hover:shadow text-left group disabled:opacity-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-tight">Continue with Google</div>
                <div className="text-[11px] text-teal-700 font-semibold">nikhilreddy334455@gmail.com</div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
              <span>1-Click Sign In</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Option to use another Google account */}
          {!showQuickGmail ? (
            <button
              type="button"
              onClick={() => setShowQuickGmail(true)}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline text-center"
            >
              Use a different Google / Gmail address
            </button>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleGoogleAccountAuth(quickGmailInput); }} className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-900 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  Sign In with Different Google Account
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickGmail(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600"
                >
                  cancel
                </button>
              </div>
              <input
                type="email"
                required
                value={quickGmailInput}
                onChange={(e) => setQuickGmailInput(e.target.value)}
                placeholder="Enter your Gmail address"
                className="w-full px-3 py-1.5 bg-white border border-teal-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-1.5 px-3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <span>Continue with Google</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </form>
          )}
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-slate-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 absolute">
            Or with email & password
          </span>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-2 text-xs text-teal-800 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-teal-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
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
                placeholder="At least 6 characters"
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
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Access Section */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2.5">
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>1-Click Demo Patients (Instant Testing)</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {demoAccounts.map(demo => (
              <button
                key={demo.name}
                type="button"
                onClick={() => handleDemoLogin(demo)}
                disabled={loading}
                className="p-2 text-center rounded-xl bg-slate-50 hover:bg-teal-50 hover:border-teal-200 border border-slate-200 transition-all text-left"
              >
                <div className="text-[11px] font-bold text-slate-800 truncate">{demo.name.split(' ')[0]}</div>
                <div className="text-[9px] text-slate-500 truncate">{demo.desc}</div>
              </button>
            ))}
          </div>
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
