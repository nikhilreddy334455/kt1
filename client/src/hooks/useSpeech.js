import { useState, useEffect, useRef, useCallback } from 'react';

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    // Check Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        // Ignore benign no-speech or abort events
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('Speech recognition notice:', event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    // Check Speech Synthesis support
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setTtsSupported(true);
      synthRef.current = window.speechSynthesis;

      const updateVoices = () => {
        if (synthRef.current) {
          const availableVoices = synthRef.current.getVoices();
          if (availableVoices && availableVoices.length > 0) {
            setVoices(availableVoices);
          }
        }
      };

      updateVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = updateVoices;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      if (synthRef.current) {
        try {
          synthRef.current.cancel();
        } catch (_) {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    try {
      recognitionRef.current.start();
    } catch (e) {
      // In case recognition was already active, restart it
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 100);
      } catch (_) {}
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (_) {}
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const speak = useCallback((text, onEnd) => {
    if (!synthRef.current || !text) return;

    try {
      // Unfreeze browser speech engine if paused
      if (synthRef.current.paused) {
        synthRef.current.resume();
      }

      // Cancel previous speech (normal browser behavior)
      synthRef.current.cancel();

      // Clean text of markdown, URLs, or special chars
      const cleanText = text
        .replace(/[*#_`~]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95; // Calm, empathetic pacing
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      // Pick best natural voice if available
      const voiceList = voices.length > 0 ? voices : synthRef.current.getVoices();
      if (voiceList && voiceList.length > 0) {
        const preferredVoice = voiceList.find(v => 
          (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Victoria')) &&
          v.lang.startsWith('en')
        ) || voiceList.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = (e) => {
        // 'canceled' and 'interrupted' are standard browser events when audio is stopped or replaced
        if (e.error === 'canceled' || e.error === 'interrupted') {
          setIsSpeaking(false);
          return;
        }

        // 'not-allowed' happens if browser autoplay policy blocks automatic speech without direct tap
        if (e.error === 'not-allowed') {
          setIsSpeaking(false);
          return;
        }

        console.warn('Speech synthesis event notice:', e.error);
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      synthRef.current.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis invocation exception:', err.message);
      setIsSpeaking(false);
    }
  }, [voices]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      try {
        synthRef.current.cancel();
      } catch (_) {}
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    resetTranscript,
    isSpeaking,
    speak,
    stopSpeaking,
    speechSupported,
    ttsSupported
  };
}

export default useSpeech;
