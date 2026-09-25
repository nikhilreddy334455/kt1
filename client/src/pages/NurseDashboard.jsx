import React, { useState, useEffect } from 'react';
import TriageAlertCard from '../components/TriageAlertCard';
import { 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  Volume2, 
  VolumeX, 
  Users, 
  Mic, 
  Clock,
  Filter
} from 'lucide-react';
import { apiUrl } from '../config/api';

export default function NurseDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active' | 'resolved' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAlertsAndStats = async () => {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        fetch(apiUrl(`/api/admin/alerts?status=${filter}`)),
        fetch(apiUrl('/api/admin/stats'))
      ]);

      const alertsData = await alertsRes.json();
      const statsData = await statsRes.json();

      setAlerts(alertsData.alerts || []);
      setStats(statsData.stats || null);
    } catch (err) {
      console.error('Failed to load alerts & stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndStats();
  }, [filter]);

  // Live polling every 5 seconds if autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAlertsAndStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, filter]);

  const handleResolveAlert = async (alertId) => {
    try {
      setResolvingId(alertId);
      const res = await fetch(apiUrl('/api/admin/resolve-alert'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh alerts and stats
        await fetchAlertsAndStats();
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    } finally {
      setResolvingId(null);
    }
  };

  // Filter alerts by search query
  const filteredAlerts = alerts.filter(a => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.patient_name?.toLowerCase().includes(q) ||
      a.patient_phone?.toLowerCase().includes(q) ||
      a.alert_summary?.toLowerCase().includes(q) ||
      a.urgency_level?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-600 text-white shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Nurse Triage & Escalation Command Center
              </h1>
              <p className="text-xs text-slate-500">
                Real-time clinical symptom monitoring, emergency handoffs, and voice transcripts
              </p>
            </div>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
            <span>{autoRefresh ? 'Live Polling Active' : 'Polling Paused'}</span>
          </button>

          <button
            onClick={fetchAlertsAndStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Alerts</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats?.active_alerts_count ?? 0}
          </div>
          <span className="text-[11px] text-amber-600 font-medium">Pending triage review</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Critical Priority</span>
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div className="text-3xl font-extrabold text-rose-600">
            {stats?.critical_alerts_count ?? 0}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Requires immediate response</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Voice Sessions</span>
            <Mic className="w-5 h-5 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats?.voice_messages_count ?? 0}
          </div>
          <span className="text-[11px] text-teal-600 font-medium">Spoken voice interactions</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Patients</span>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {stats?.active_conversations_count ?? 0}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">Currently engaged online</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl w-fit">
          <button
            onClick={() => setFilter('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Escalations ({stats?.active_alerts_count ?? 0})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'resolved'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Resolved Cases
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All History
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient, phone, symptoms, or priority..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Alerts Grid */}
      {loading && alerts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <Activity className="w-10 h-10 mx-auto text-teal-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-600">Connecting to Triage Stream...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
          <h3 className="text-base font-bold text-slate-800">All Triage Queues Clear</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No active escalations matching this filter. The AI concierge is actively screening routine care and will alert you if an emergency arises.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredAlerts.map(alert => (
            <TriageAlertCard
              key={alert.alert_id}
              alert={alert}
              onResolve={handleResolveAlert}
              isResolving={resolvingId === alert.alert_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
