import React from 'react';
import { Mic, MessageSquare, Volume2, Bot, User, AlertCircle, Clock } from 'lucide-react';

export default function ChatMessage({ message, onSpeak, isSpeakingThis }) {
  const isUser = message.sender_type === 'user';
  const isVoice = message.channel === 'voice';

  // Format time
  const timeStr = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className={`flex w-full mb-4 items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-sm ring-2 ring-teal-100">
          <Bot className="w-5 h-5" />
        </div>
      )}

      <div className={`max-w-[82%] sm:max-w-[70%] group`}>
        {/* Header Label: Sender and Channel Badge */}
        <div className={`flex items-center gap-2 mb-1 px-1 text-xs font-medium ${isUser ? 'justify-end text-slate-500' : 'justify-start text-slate-500'}`}>
          <span>{isUser ? 'You' : 'HealthSync Concierge'}</span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            {isVoice ? (
              <>
                <Mic className="w-2.5 h-2.5 text-teal-600" />
                <span>Voice</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-2.5 h-2.5 text-blue-600" />
                <span>Text</span>
              </>
            )}
          </span>
          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {timeStr}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={`relative p-4 rounded-2xl shadow-sm text-sm leading-relaxed transition-all ${
            isUser
              ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-br-xs'
              : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-slate-100'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>

          {/* AI Audio Read-Aloud Action */}
          {!isUser && onSpeak && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => onSpeak(message.content)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                  isSpeakingThis
                    ? 'bg-teal-100 text-teal-800 font-semibold animate-pulse'
                    : 'text-slate-500 hover:text-teal-700 hover:bg-slate-50'
                }`}
                title="Listen to this message"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isSpeakingThis ? 'text-teal-700' : ''}`} />
                <span>{isSpeakingThis ? 'Speaking...' : 'Listen'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-sm ring-2 ring-slate-100">
          <User className="w-5 h-5 text-slate-200" />
        </div>
      )}
    </div>
  );
}
