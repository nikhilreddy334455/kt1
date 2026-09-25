import React from 'react';
import { Mic, MicOff, Volume2, VolumeX, Send, Sparkles, AlertCircle, Globe } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸', label: 'English' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸', label: 'Spanish' },
  { code: 'hi-IN', name: 'हिन्दी (Hindi)', flag: '🇮🇳', label: 'Hindi' },
  { code: 'te-IN', name: 'తెలుగు (Telugu)', flag: '🇮🇳', label: 'Telugu' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷', label: 'French' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪', label: 'German' },
  { code: 'ar-SA', name: 'العربية (Arabic)', flag: '🇸🇦', label: 'Arabic' },
  { code: 'zh-CN', name: '中文 (Mandarin)', flag: '🇨🇳', label: 'Chinese' },
  { code: 'pt-BR', name: 'Português', flag: '🇧🇷', label: 'Portuguese' }
];

export default function VoiceController({
  isListening,
  transcript,
  onStartListening,
  onStopListening,
  onSendVoiceMessage,
  isSpeaking,
  onStopSpeaking,
  speechSupported,
  isLoading,
  selectedLanguage = 'en-US',
  onSelectLanguage
}) {
  const handleToggleMic = () => {
    if (isListening) {
      onStopListening();
    } else {
      if (isSpeaking) {
        onStopSpeaking();
      }
      onStartListening();
    }
  };

  const handleSendTranscript = () => {
    if (transcript.trim()) {
      onSendVoiceMessage(transcript);
    }
  };

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="bg-white rounded-2xl p-4 border border-teal-100 shadow-sm relative overflow-hidden transition-all">
      {/* Active Voice Listening Ambient Background Effect */}
      {isListening && (
        <div className="absolute inset-0 bg-teal-500/5 pointer-events-none transition-all"></div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left: Mic Button & Dynamic Visualizer */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative">
            {isListening && (
              <span className="absolute -inset-2 rounded-full bg-teal-400 opacity-75 animate-ping"></span>
            )}
            <button
              type="button"
              onClick={handleToggleMic}
              disabled={isLoading || !speechSupported}
              className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md ${
                isListening
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-100 animate-pulse'
                  : 'bg-teal-600 hover:bg-teal-700 text-white ring-2 ring-teal-100 hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isListening ? 'Stop listening' : `Start speaking in ${currentLangObj.name}`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">
                {isListening ? `Listening (${currentLangObj.name})...` : 'Voice & Speech Engine'}
              </span>
              {isListening && (
                <div className="flex items-center gap-1 h-5 px-2 bg-teal-100/80 rounded-full">
                  <span className="w-1 bg-teal-600 rounded-full animate-wave-1"></span>
                  <span className="w-1 bg-teal-600 rounded-full animate-wave-2"></span>
                  <span className="w-1 bg-teal-600 rounded-full animate-wave-3"></span>
                  <span className="w-1 bg-teal-600 rounded-full animate-wave-4"></span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {isListening
                ? `Speak naturally in ${currentLangObj.name}.`
                : `Tap mic to speak or select language below.`}
            </p>
          </div>
        </div>

        {/* Right: Language Selector & Audio Playback Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">
            <Globe className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            <select
              value={selectedLanguage}
              onChange={(e) => onSelectLanguage && onSelectLanguage(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-1"
              title="Select speech and listening language"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute Voice</span>
            </button>
          )}

          {!speechSupported && (
            <div className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>Voice recognition requires Chrome/Edge/Safari</span>
            </div>
          )}
        </div>
      </div>

      {/* Live Voice Transcript Preview & Instant Dispatch */}
      {transcript && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border">
          <div className="flex items-start gap-2 flex-1">
            <Sparkles className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-700 font-medium italic line-clamp-2">
              "{transcript}"
            </p>
          </div>
          <button
            type="button"
            onClick={handleSendTranscript}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            <span>Send Voice Note ({currentLangObj.label})</span>
          </button>
        </div>
      )}
    </div>
  );
}
