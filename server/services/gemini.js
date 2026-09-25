import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
let aiClient = null;

if (apiKey && apiKey !== 'your_google_genai_api_key' && apiKey.trim() !== '') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err.message);
  }
}

const SYSTEM_PROMPT = `You are 'HealthSync', an empathetic, intelligent medical concierge assistant. 
Your tone must be highly reassuring, professional, and human-like. 
DO NOT PROVIDE MEDICAL DIAGNOSES. Your purpose is to:
1. Understand the patient's symptoms or requests.
2. Answer administrative FAQs.
3. Help schedule appointments for routine issues.
4. Detect high-risk or emergency symptoms (e.g., chest pain, shortness of breath, severe bleeding, sudden numbness).

If you detect high-risk symptoms, you must immediately express empathy, advise them you are connecting them to a triage nurse, and use the provided structured schema to flag the system. Seamlessly adapt to the user's language if they switch from English.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    replyText: {
      type: Type.STRING,
      description: "The natural, empathetic response to the user. Suitable for text-to-speech."
    },
    urgencyLevel: {
      type: Type.STRING,
      enum: ["low", "medium", "high", "critical"],
      description: "Assess the medical urgency based on user input."
    },
    needsHandoff: {
      type: Type.BOOLEAN,
      description: "True if urgency is high/critical requiring a human nurse."
    },
    clinicalSummary: {
      type: Type.STRING,
      description: "A concise, medical summary of the chief complaint for the nurse. Empty if no handoff needed."
    }
  },
  required: ["replyText", "urgencyLevel", "needsHandoff", "clinicalSummary"]
};

// Heuristic fallback for zero-dependency / offline / missing-key resilience
function analyzeWithHeuristics(message, history = [], patientInfo = {}) {
  const lowerMsg = message.toLowerCase();
  
  // Emergency indicators
  const criticalKeywords = [
    'chest pain', 'pain in my chest', 'chest', 'heart attack', 'heart', 'shortness of breath',
    'cannot breathe', 'difficulty breathing', 'trouble breathing', 'breath',
    'severe bleeding', 'heavy bleeding', 'unconscious', 'fainted', 'stroke',
    'slurred speech', 'facial drooping', 'sudden numbness', 'severe head trauma',
    'overdose', 'anaphylaxis', 'choking', 'suicide', 'radiating pain', 'arm pain'
  ];
  
  const highKeywords = [
    'high fever', 'persistent vomiting', 'broken bone', 'fracture', 'deep cut',
    'severe burn', 'dislocated', 'unbearable pain', 'intense pain', 'blood in urine', 'blood in stool'
  ];
  
  const mediumKeywords = [
    'mild fever', 'cough', 'flu', 'sore throat', 'sprain', 'migraine', 'rash', 'earache',
    'abdominal ache', 'stomach ache', 'vomiting', 'diarrhea', 'allergy'
  ];

  const schedulingKeywords = [
    'appointment', 'schedule', 'book', 'reschedule', 'visit', 'doctor', 'consultation', 'slot', 'calendar'
  ];

  const faqKeywords = [
    'hours', 'open', 'timing', 'location', 'address', 'parking', 'insurance', 'billing', 'cost', 'where are you'
  ];

  const isCritical = criticalKeywords.some(kw => lowerMsg.includes(kw));
  const isHigh = highKeywords.some(kw => lowerMsg.includes(kw));
  const isMedium = mediumKeywords.some(kw => lowerMsg.includes(kw));
  const isScheduling = schedulingKeywords.some(kw => lowerMsg.includes(kw));
  const isFaq = faqKeywords.some(kw => lowerMsg.includes(kw));

  if (isCritical) {
    return {
      replyText: "I understand how distressing this is. Because you mentioned symptoms such as chest pain or breathing difficulty, I am immediately connecting you to our on-call triage nurse and notifying emergency support. Please remain calm and seated while our medical team joins right away.",
      urgencyLevel: "critical",
      needsHandoff: true,
      clinicalSummary: `CRITICAL TRIAGE: Patient reported acute emergency symptoms: "${message}". Immediate human nursing assessment required.`
    };
  }

  if (isHigh) {
    return {
      replyText: "I hear how much discomfort you are experiencing. Because of the severity of these symptoms, I am alerting our triage nurse to review your case immediately. Please stay with me while we connect you.",
      urgencyLevel: "high",
      needsHandoff: true,
      clinicalSummary: `HIGH URGENCY: Patient reports severe distress: "${message}". Triage nurse consultation recommended.`
    };
  }

  if (isScheduling) {
    return {
      replyText: "I would be happy to help schedule your appointment! We have available slots with General Practice tomorrow at 10:00 AM, 2:30 PM, or Thursday at 11:15 AM. Which time works best for you, or would you prefer a telehealth consultation?",
      urgencyLevel: "low",
      needsHandoff: false,
      clinicalSummary: ""
    };
  }

  if (isFaq) {
    return {
      replyText: "Our main clinic is located at 742 Evergreen Healthcare Way, Suite 400. We are open Monday through Friday from 7:30 AM to 7:00 PM, and Saturday from 9:00 AM to 2:00 PM. We accept most major health insurance plans including Medicare, Blue Cross, and Aetna.",
      urgencyLevel: "low",
      needsHandoff: false,
      clinicalSummary: ""
    };
  }

  if (isMedium) {
    return {
      replyText: "I'm sorry to hear you're feeling under the weather with these symptoms. For minor illness or routine aches, rest and hydration are key. Would you like me to book a same-day or next-day consultation with one of our physicians to examine you?",
      urgencyLevel: "medium",
      needsHandoff: false,
      clinicalSummary: ""
    };
  }

  return {
    replyText: "Hello! I am HealthSync, your personal medical concierge. I can assist you with symptom triage, answering clinic and insurance questions, or scheduling your next visit. How can I help you feel better today?",
    urgencyLevel: "low",
    needsHandoff: false,
    clinicalSummary: ""
  };
}

export async function processMedicalChat({ patient, message, channel, history = [] }) {
  // If API key is available, call Gemini models via @google/genai
  if (aiClient) {
    try {
      // Format conversation history for Gemini
      const formattedHistory = history.map(h => ({
        role: h.sender_type === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }));

      const contextMessage = `Patient Information:
- Name: ${patient.full_name || 'Anonymous'}
- DOB: ${patient.dob ? new Date(patient.dob).toLocaleDateString() : 'Unknown'}
- Interaction Channel: ${channel}

Latest Patient Input: "${message}"`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          ...formattedHistory,
          { role: 'user', parts: [{ text: contextMessage }] }
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.2
        }
      });

      const responseText = response.text;
      if (responseText) {
        const parsed = JSON.parse(responseText);
        return {
          replyText: parsed.replyText || "I'm here to support you. Let me check your symptoms.",
          urgencyLevel: parsed.urgencyLevel || "low",
          needsHandoff: Boolean(parsed.needsHandoff),
          clinicalSummary: parsed.clinicalSummary || ""
        };
      }
    } catch (error) {
      console.error('Gemini API call failed, falling back to clinical heuristics:', error.message);
    }
  }

  // Graceful fallback to empathetic clinical rules engine
  return analyzeWithHeuristics(message, history, patient);
}

export default {
  processMedicalChat
};
