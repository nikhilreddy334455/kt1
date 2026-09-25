import React, { useState, useEffect } from 'react';
import PatientPortal from './pages/PatientPortal';
import NurseDashboard from './pages/NurseDashboard';
import { 
  HeartPulse, 
  ShieldAlert, 
  MessageSquare, 
  Stethoscope, 
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('patient'); // 'patient' | 'dashboard'
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);

  // Poll for alert counts to show indicator badge on Nurse Dashboard tab
  useEffect(() => {
    const fetchBadge = () => {
      fetch('/api/admin/stats')
        .then(res => res.json())
        .then(data => {
          if (data.stats) {
            setUnreadAlertsCount(parseInt(data.stats.active_alerts_count, 10) || 0);
          }
        })
        .catch(() => {});
    };

    fetchBadge();
    const interval = setInterval(fetchBadge, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Global Top Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-100">
              <HeartPulse className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                HealthSync
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-200">
                  Concierge
                </span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                AI Omnichannel Medical Concierge & Triage Engine
              </p>
            </div>
          </div>

          {/* Navigation Route Switcher */}
          <nav className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setCurrentPage('patient')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentPage === 'patient'
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
              <span>Patient Portal</span>
            </button>

            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all relative ${
                currentPage === 'dashboard'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Nurse Dashboard</span>
              {unreadAlertsCount > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                </span>
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Dynamic View Area */}
      <main className="flex-1">
        {currentPage === 'patient' ? <PatientPortal /> : <NurseDashboard />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            <span>HealthSync Omnichannel Clinical Platform</span>
          </div>
          <div className="text-slate-400">
            Compliant triage screening • Powered by Google Gemini & Web Speech API
          </div>
        </div>
      </footer>
    </div>
  );
}
