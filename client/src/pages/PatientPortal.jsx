import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from '../components/ChatMessage';
import VoiceController from '../components/VoiceController';
import useSpeech from '../hooks/useSpeech';
import { 
  Send, 
  RotateCcw, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles, 
  User, 
  Phone, 
  Calendar,
  HeartPulse,
  Stethoscope,
  ChevronRight,
  Info
} from 'lucide-react';
import { apiUrl } from '../config/api';

export default function PatientPortal() {
  const [patient, setPatient] = useState(null);
  const [patientsList, setPatientsList] = useState([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [triageStatus, setTriageStatus] = useState(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    isSpeaking,
    speak,
    stopSpeaking,
    speechSupported
  } = useSpeech();

  // Load demo patients on mount
  useEffect(() => {
    fetch(apiUrl('/api/auth/patients'))
      .then(res => res.json())
      .then(data => {
        if (data.patients && data.patients.length > 0) {
          setPatientsList(data.patients);
          // Default to first patient
          setPatient(data.patients[0]);
          setPhoneInput(data.patients[0].phone_number);
          setNameInput(data.patients[0].full_name);
        }
      })
      .catch(err => console.error('Failed to load demo patients:', err));
  }, []);

  // Hydrate conversation when patient changes
  useEffect(() => {
    if (!patient?.id) return;
    loadConversation(patient.id);
  }, [patient?.id]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadConversation = async (patientId) => {
    try {
      const res = await fetch(apiUrl(`/api/conversations/${patientId}`));
      const data = await res.json();
      if (data.conversation) {
        setConversation(data.conversation);
        setMessages(data.messages || []);
        if (data.conversation.urgency_level && data.conversation.urgency_level !== 'unknown') {
          setTriageStatus({
            urgencyLevel: data.conversation.urgency_level,
            needsHandoff: data.conversation.status === 'escalated'
          });
        }
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phoneInput) return;
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phoneInput,
          fullName: nameInput || 'Patient'
        })
      });
      const data = await res.json();
      if (data.patient) {
        setPatient(data.patient);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoPatient = (p) => {
    setPatient(p);
    setPhoneInput(p.phone_number);
    setNameInput(p.full_name);
  };

  const sendMessage = async (messageText, channel = 'text') => {
    if (!messageText.trim() || !patient?.id || loading) return;

    // Optimistically show user message
    const tempUserMsg = {
      id: Date.now(),
      sender_type: 'user',
      channel,
      content: messageText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setInputText('');
    setTranscript('');
    setLoading(true);

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          message: messageText,
          channel
        })
      });

      const data = await res.json();
      if (data.success) {
        // Replace or append confirmed AI message
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempUserMsg.id);
          return [...filtered, data.userMessage, data.aiMessage];
        });

        if (data.triage) {
          setTriageStatus(data.triage);
        }

        // If message was via voice channel, speak the reply aloud automatically
        if (channel === 'voice' && data.aiMessage?.content) {
          speak(data.aiMessage.content, () => setSpeakingMessageId(null));
          setSpeakingMessageId(data.aiMessage.id);
        }
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetConversation = async () => {
    if (!patient?.id) return;
    try {
      setLoading(true);
      const res = await fetch(apiUrl('/api/conversations/reset'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id })
      });
      const data = await res.json();
      if (data.conversation) {
        setConversation(data.conversation);
        setMessages(data.messages || []);
        setTriageStatus(null);
      }
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakMessage = (content, id) => {
    if (isSpeaking && speakingMessageId === id) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      speak(content, () => setSpeakingMessageId(null));
      setSpeakingMessageId(id);
    }
  };

  const quickSymptoms = [
    { label: 'Severe Chest Pain', text: 'I have severe chest pain and cannot breathe properly.', urgent: true },
    { label: 'Schedule Doctor Visit', text: 'I would like to schedule an appointment with a doctor for next week.', urgent: false },
    { label: 'Clinic Hours & Location', text: 'What are your clinic hours, location, and accepted insurance plans?', urgent: false },
    { label: 'Sore Throat & Fever', text: 'I have had a mild fever, dry cough, and sore throat for 2 days.', urgent: false }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top Banner & Patient Identification Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">HealthSync Patient Portal</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                  Live Concierge
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Connected Patient: <span className="font-semibold text-slate-800">{patient?.full_name || 'Guest'}</span> • Phone: <span className="font-semibold text-slate-800">{patient?.phone_number || 'N/A'}</span>
              </p>
            </div>
          </div>

          {/* Quick Patient Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Switch Demo Patient:</span>
            {patientsList.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectDemoPatient(p)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  patient?.id === p.id
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.full_name.split(' ')[0]}
              </button>
            ))}

            <button
              onClick={handleResetConversation}
              disabled={loading}
              title="Start a new triage session"
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium ml-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency / Critical Triage Live Alert Banner */}
      {triageStatus?.needsHandoff && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-3 shadow-sm animate-pulse">
          <ShieldAlert className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              Critical Triage Escalation Active
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white uppercase font-black">
                Nurse Alerted
              </span>
            </h2>
            <p className="text-xs text-rose-800 mt-1">
              Your symptoms have been flagged with high medical priority. An alert has been broadcast to our live Nurse Dashboard, and medical staff are reviewing your case right now. If you are experiencing an immediate life-threatening emergency, please dial 911 or visit the nearest emergency room.
            </p>
          </div>
        </div>
      )}

      {/* Main Conversation Container */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[580px]">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-xs font-semibold text-slate-700">HealthSync AI Concierge Online</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Multilingual • Voice & Text Enabled</span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[460px]">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <HeartPulse className="w-12 h-12 mx-auto mb-3 text-teal-400 opacity-60" />
              <p className="text-sm font-medium">Starting secure conversation...</p>
            </div>
          ) : (
            messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSpeak={(text) => handleSpeakMessage(text, msg.id)}
                isSpeakingThis={isSpeaking && speakingMessageId === msg.id}
              />
            ))
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50/70 p-3 rounded-xl border border-teal-100 w-fit">
              <div className="flex space-x-1">
                <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 bg-teal-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
              <span>HealthSync is evaluating your symptoms...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Symptom Chips */}
        <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 overflow-x-auto flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3 h-3 text-teal-600" />
            Quick Prompts:
          </span>
          {quickSymptoms.map((qs, i) => (
            <button
              key={i}
              type="button"
              onClick={() => sendMessage(qs.text, 'text')}
              disabled={loading}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all border ${
                qs.urgent
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200'
              }`}
            >
              {qs.label}
            </button>
          ))}
        </div>

        {/* Voice Interaction Controller */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/40">
          <VoiceController
            isListening={isListening}
            transcript={transcript}
            onStartListening={startListening}
            onStopListening={stopListening}
            onSendVoiceMessage={(spokenText) => sendMessage(spokenText, 'voice')}
            isSpeaking={isSpeaking}
            onStopSpeaking={stopSpeaking}
            speechSupported={speechSupported}
            isLoading={loading}
          />

          {/* Text Input Row */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputText, 'text');
            }}
            className="mt-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your symptoms, questions, or appointment request here..."
              disabled={loading}
              className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
