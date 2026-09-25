import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

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

// Candidate Gemini models in order of speed and availability
const CANDIDATE_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-flash-latest'
];

function getAiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'your_google_genai_api_key' || key.trim() === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err.message);
    return null;
  }
}

// Dynamic clinical heuristics fallback if AI service is unavailable
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

  const schedulingKeywords = [
    'appointment', 'schedule', 'book', 'reschedule', 'visit', 'doctor', 'consultation', 'slot', 'calendar'
  ];

  const faqKeywords = [
    'hours', 'open', 'timing', 'location', 'address', 'parking', 'insurance', 'billing', 'cost', 'where are you'
  ];

  const symptomKeywords = [
    'headache', 'fever', 'cough', 'cold', 'sore throat', 'pain', 'ache', 'nausea', 'vomit', 'stomach',
    'sick', 'dizzy', 'tired', 'rash', 'allergy', 'hurt', 'flu', 'covid', 'infection'
  ];

  if (criticalKeywords.some(kw => lowerMsg.includes(kw))) {
    return {
      replyText: "I understand how distressing this is. Because you mentioned critical symptoms such as chest pain or breathing difficulty, I am immediately connecting you to our on-call triage nurse and notifying emergency support. Please remain seated and calm while our medical team joins right away.",
      urgencyLevel: "critical",
      needsHandoff: true,
      clinicalSummary: `CRITICAL TRIAGE: Patient reported acute emergency symptoms: "${message}". Immediate human nursing assessment required.`
    };
  }

  if (highKeywords.some(kw => lowerMsg.includes(kw))) {
    return {
      replyText: "I hear how much discomfort you are experiencing. Because of the severity of these symptoms, I am alerting our triage nurse to review your case immediately. Please stay with me while we connect you.",
      urgencyLevel: "high",
      needsHandoff: true,
      clinicalSummary: `HIGH URGENCY: Patient reports severe distress: "${message}". Triage nurse consultation recommended.`
    };
  }

  if (schedulingKeywords.some(kw => lowerMsg.includes(kw))) {
    return {
      replyText: "I would be happy to help schedule your appointment! We have available slots with General Practice tomorrow at 10:00 AM, 2:30 PM, or Thursday at 11:15 AM. Which time works best for you, or would you prefer a telehealth consultation?",
      urgencyLevel: "low",
      needsHandoff: false,
      clinicalSummary: ""
    };
  }

  if (faqKeywords.some(kw => lowerMsg.includes(kw))) {
    return {
      replyText: "Our main clinic is located at 742 Evergreen Healthcare Way, Suite 400. We are open Monday through Friday from 7:30 AM to 7:00 PM, and Saturday from 9:00 AM to 2:00 PM. We accept most major health insurance plans including Medicare, Blue Cross, and Aetna.",
      urgencyLevel: "low",
      needsHandoff: false,
      clinicalSummary: ""
    };
  }

  if (symptomKeywords.some(kw => lowerMsg.includes(kw))) {
    return {
      replyText: `I am sorry to hear you are dealing with ${message}. For mild or routine symptoms, rest and hydration are very helpful. If your symptoms worsen or persist, would you like me to schedule a visit with one of our physicians to examine you?`,
      urgencyLevel: "medium",
      needsHandoff: false,
      clinicalSummary: `Patient reported mild/moderate symptoms: "${message}".`
    };
  }

  return {
    replyText: `Thank you for sharing that with me. I am here to assist with your symptoms, scheduling, or questions about our clinic. Could you describe your symptoms a bit more, or let me know how you are feeling?`,
    urgencyLevel: "low",
    needsHandoff: false,
    clinicalSummary: ""
  };
}

export async function processMedicalChat({ patient, message, channel, history = [] }) {
  const client = getAiClient();

  if (client) {
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

    // Try candidate models in order of availability
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [
            ...formattedHistory,
            { role: 'user', parts: [{ text: contextMessage }] }
          ],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.3
          }
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return {
            replyText: parsed.replyText || "I'm here to support you. Let me check your symptoms.",
            urgencyLevel: parsed.urgencyLevel || "low",
            needsHandoff: Boolean(parsed.needsHandoff),
            clinicalSummary: parsed.clinicalSummary || ""
          };
        }
      } catch (error) {
        console.warn(`Model ${model} failed, trying next candidate:`, error.message);
      }
    }
  }

  // Graceful fallback to clinical rules engine
  return analyzeWithHeuristics(message, history, patient);
}

export default {
  processMedicalChat
};
