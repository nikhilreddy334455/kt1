import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  User, 
  Calendar, 
  Clock, 
  Mic, 
  MessageSquare,
  ShieldAlert,
  Check
} from 'lucide-react';

export default function TriageAlertCard({ alert, onResolve, isResolving }) {
  const [showTranscript, setShowTranscript] = useState(false);

  const urgencyConfig = {
    critical: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300 ring-rose-200',
      border: 'border-l-4 border-l-rose-600',
      iconColor: 'text-rose-600',
      label: 'CRITICAL PRIORITY'
    },
    high: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-200',
      border: 'border-l-4 border-l-amber-500',
      iconColor: 'text-amber-500',
      label: 'HIGH PRIORITY'
    },
    medium: {
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-yellow-200',
      border: 'border-l-4 border-l-yellow-500',
      iconColor: 'text-yellow-600',
      label: 'MEDIUM'
    },
    low: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-200',
      border: 'border-l-4 border-l-emerald-500',
      iconColor: 'text-emerald-600',
      label: 'LOW'
    }
  };

  const urgency = urgencyConfig[alert.urgency_level?.toLowerCase()] || urgencyConfig.high;

  // Format DOB / age
  const dobFormatted = alert.patient_dob ? new Date(alert.patient_dob).toLocaleDateString() : 'N/A';
  const timeFormatted = new Date(alert.alert_created_at).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-slate-200 ${urgency.border} transition-all hover:shadow-md overflow-hidden ${
        alert.is_resolved ? 'opacity-70 bg-slate-50' : ''
      }`}
    >
      <div className="p-5">
        {/* Header: Urgency Badge & Alert Timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-xs ${urgency.badge}`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${urgency.iconColor}`} />
              {urgency.label}
            </span>

            {alert.is_resolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Check className="w-3 h-3" />
                Resolved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeFormatted}</span>
          </div>
        </div>

        {/* Patient Details Row */}
        <div className="flex flex-wrap items-center gap-4 py-2 border-y border-slate-100 text-sm text-slate-700 bg-slate-50/60 -mx-5 px-5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <User className="w-4 h-4 text-teal-600" />
            <span>{alert.patient_name || 'Patient'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <span>{alert.patient_phone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>DOB: {dobFormatted}</span>
          </div>
        </div>

        {/* Clinical Summary */}
        <div className="mt-3.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
            Clinical Chief Complaint & Triage Summary
          </div>
          <p className="text-sm font-medium text-slate-800 bg-rose-50/50 p-3 rounded-xl border border-rose-100/80 leading-relaxed">
            {alert.alert_summary}
          </p>
        </div>

        {/* Collapsible Transcript Section */}
        {alert.transcript && alert.transcript.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 py-1.5 px-2 rounded-lg bg-slate-100/70 hover:bg-slate-100 transition-colors"
            >
              <span>Conversation Transcript ({alert.transcript.length} messages)</span>
              {showTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTranscript && (
              <div className="mt-2.5 max-h-60 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                {alert.transcript.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-lg ${
                      msg.sender_type === 'user'
                        ? 'bg-white border border-slate-200 ml-4'
                        : 'bg-teal-50/60 border border-teal-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold text-[11px] text-slate-500 mb-1">
                      <span className="capitalize">{msg.sender_type === 'user' ? 'Patient' : 'AI Concierge'}</span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        {msg.channel === 'voice' ? <Mic className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
                        {msg.channel}
                      </span>
                    </div>
                    <p className="text-slate-800">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <a
            href={`tel:${alert.patient_phone}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Patient</span>
          </a>

          {!alert.is_resolved ? (
            <button
              type="button"
              onClick={() => onResolve(alert.alert_id)}
              disabled={isResolving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Resolved</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic">Resolved by medical staff</span>
          )}
        </div>
      </div>
    </div>
  );
}
