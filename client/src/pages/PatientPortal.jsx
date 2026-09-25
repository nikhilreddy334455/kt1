import React, { useState, useEffect, useRef } from 'react';
import ChatMessage from '../components/ChatMessage';
import VoiceController, { SUPPORTED_LANGUAGES } from '../components/VoiceController';
import AuthModal from '../components/AuthModal';
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
  Info,
  LogIn,
  LogOut
} from 'lucide-react';
import { apiUrl } from '../config/api';

export default function PatientPortal({ currentUser, onOpenAuth }) {
  const [patient, setPatient] = useState(currentUser || null);
  const [patientsList, setPatientsList] = useState([]);
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [userToken, setUserToken] = useState(() => localStorage.getItem('healthsync_token'));

  useEffect(() => {
    if (currentUser) {
      setPatient(currentUser);
      setUserToken(localStorage.getItem('healthsync_token'));
    }
  }, [currentUser]);
  
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
    primeAudio,
    stopSpeaking,
    language,
    setLanguage,
    speechSupported
  } = useSpeech();

  // Load demo patients or hydrate active user session from token
  useEffect(() => {
    const token = localStorage.getItem('healthsync_token');
    if (token) {
      fetch(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.patient) {
            setPatient(data.patient);
            setUserToken(token);
            return;
          }
          // If token invalid, remove it
          localStorage.removeItem('healthsync_token');
          setUserToken(null);
        })
        .catch(() => {});
    }

    // Load demo patients for switcher
    fetch(apiUrl('/api/auth/patients'))
      .then(res => res.json())
      .then(data => {
        if (data.patients && data.patients.length > 0) {
          setPatientsList(data.patients);
          if (!localStorage.getItem('healthsync_token')) {
            setPatient(data.patients[0]);
            setPhoneInput(data.patients[0].phone_number || '');
            setNameInput(data.patients[0].full_name || '');
          }
        }
      })
      .catch(err => console.error('Failed to load demo patients:', err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('healthsync_token');
    setUserToken(null);
    if (patientsList.length > 0) {
      setPatient(patientsList[0]);
    }
  };

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

    if (channel === 'voice') {
      primeAudio();
    }

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
      const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language);
      const languageLabel = currentLangObj ? currentLangObj.label : 'English';

      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          message: messageText,
          channel,
          language: languageLabel
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
          speak(data.aiMessage.content, () => setSpeakingMessageId(null), language);
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
      speak(content, () => setSpeakingMessageId(null), language);
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

          {/* Account Profile / Sign In & Demo Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {userToken && patient?.email ? (
              <div className="flex items-center gap-2 bg-teal-50/90 border border-teal-200 px-3 py-1.5 rounded-xl shadow-2xs">
                {patient.avatar_url ? (
                  <img src={patient.avatar_url} alt="" className="w-6 h-6 rounded-full ring-1 ring-teal-300" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center text-xs font-bold">
                    {patient.full_name?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-800 leading-tight">{patient.full_name}</div>
                  <div className="text-[10px] text-teal-700 leading-tight max-w-[120px] truncate">{patient.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out of your account"
                  className="ml-1 p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (onOpenAuth ? onOpenAuth() : setIsAuthModalOpen(true))}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white text-xs font-bold shadow-xs hover:shadow transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Sign Up</span>
              </button>
            )}

            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block mx-1"></div>

            <span className="text-[11px] font-semibold text-slate-400">Demo Switcher:</span>
            {patientsList.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  if (userToken) handleLogout();
                  handleSelectDemoPatient(p);
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  patient?.id === p.id && !userToken
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
            selectedLanguage={language}
            onSelectLanguage={setLanguage}
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

      {/* Google and Email Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(authenticatedPatient) => {
          setPatient(authenticatedPatient);
          setUserToken(localStorage.getItem('healthsync_token'));
        }}
      />
    </div>
  );
}
