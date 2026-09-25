import { useState, useEffect, useRef, useCallback } from 'react';

// Select the highest-quality, clearest natural human voice
function selectBestVoice(voiceList, targetLang) {
  if (!voiceList || voiceList.length === 0) return null;

  const target = targetLang.toLowerCase().replace('_', '-');
  const langPrefix = target.split('-')[0];

  // Exclude distorted, robotic, or novelty synthesizer voices
  const noveltyVoices = [
    'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos',
    'deranged', 'good news', 'hysterical', 'pipe organ', 'trinoids',
    'whisper', 'zarvox', 'fred', 'junior', 'ralph', 'wobble', 'sin-sin'
  ];

  const validVoices = voiceList.filter(v => {
    const nameLower = v.name.toLowerCase();
    return !noveltyVoices.some(n => nameLower.includes(n));
  });

  const candidates = validVoices.filter(v => {
    const vLang = v.lang.toLowerCase().replace('_', '-');
    return vLang.startsWith(target) || vLang.startsWith(langPrefix);
  });

  if (candidates.length === 0) return null;

  // Clear, natural, studio-quality voices (Samantha, Google US English, Daniel, Karen, etc.)
  const preferredEnglishNames = [
    'samantha',
    'google us english',
    'google uk english female',
    'google uk english male',
    'daniel',
    'karen',
    'serena',
    'victoria',
    'moira',
    'tessa',
    'ava',
    'allison',
    'tom',
    'microsoft jenny',
    'microsoft guy',
    'microsoft aria',
    'natural',
    'premium',
    'enhanced'
  ];

  for (const pref of preferredEnglishNames) {
    const match = candidates.find(v => v.name.toLowerCase().includes(pref));
    if (match) return match;
  }

  // Fallback to default candidate or first valid candidate
  const defaultCandidate = candidates.find(v => v.default);
  return defaultCandidate || candidates[0];
}

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [voices, setVoices] = useState([]);
  const [language, setLanguage] = useState('en-US');
  
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
      recognition.lang = language;

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

  // Update recognition language when user switches language
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language;
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setTranscript('');
    try {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    } catch (e) {
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          try {
            recognitionRef.current.lang = language;
            recognitionRef.current.start();
          } catch (_) {}
        }, 150);
      } catch (_) {}
    }
  }, [language]);

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

  const speak = useCallback((text, onEnd, customLang) => {
    if (!synthRef.current || !text) return;

    try {
      // Unfreeze browser speech engine if paused
      if (synthRef.current.paused) {
        synthRef.current.resume();
      }

      // Cancel previous speech safely
      synthRef.current.cancel();

      // Clean text of markdown, URLs, or special chars
      const cleanText = text
        .replace(/[*#_`~]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .trim();

      if (!cleanText) return;

      const targetLang = customLang || language;
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0; // Clear, natural, articulate human speed
      utterance.pitch = 1.0; // Natural voice pitch
      utterance.volume = 1.0; // Full clarity
      utterance.lang = targetLang;

      // Pick matching high-clarity voice for selected language
      const voiceList = voices.length > 0 ? voices : synthRef.current.getVoices();
      const bestVoice = selectBestVoice(voiceList, targetLang);
      if (bestVoice) {
        utterance.voice = bestVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };

      synthRef.current.speak(utterance);
    } catch (_) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    }
  }, [voices, language]);

  const primeAudio = useCallback(() => {
    if (synthRef.current) {
      try {
        if (synthRef.current.paused) synthRef.current.resume();
        const silent = new SpeechSynthesisUtterance(' ');
        silent.volume = 0;
        synthRef.current.speak(silent);
      } catch (_) {}
    }
  }, []);

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
    primeAudio,
    stopSpeaking,
    language,
    setLanguage,
    speechSupported,
    ttsSupported
  };
}

export default useSpeech;
