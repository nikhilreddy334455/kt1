# HealthSync — AI-Powered Omnichannel Medical Concierge

HealthSync is a modern, production-ready AI healthcare communication platform and clinical triage engine that replaces traditional IVR phone trees with an empathetic conversational agent across voice and text channels.

## Key Features

- **Omnichannel Voice & Text:** Integrated Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) with animated audio visualizers and real-time audio playback.
- **Multilingual NLU:** Built on Google Gemini models with intelligent fallback triage heuristics.
- **Urgent Triage & Escalation:** Immediate detection of high-risk medical complaints (e.g. chest pain, severe bleeding, shortness of breath) with automatic broadcast to human medical staff.
- **Nurse Command Dashboard:** Real-time triage alert feed, severity indicator tags, full conversation transcripts, patient records, and one-click alert resolution.
- **Automated Scheduling & Clinic FAQs:** Handles appointment booking requests, clinic hours, locations, and insurance queries autonomously.
- **PostgreSQL Persistence:** Complete conversation histories, message channel tags (`voice` vs `text`), and alert status tracking.

## Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (Supabase / Local Postgres) with connection pooling
- **Validation:** Zod
- **AI Engine:** Google Gemini SDK (`@google/genai`)

## Getting Started

### 1. Installation

```bash
# Install root backend dependencies
npm install

# Install frontend dependencies
npm --prefix client install
```

### 2. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Configure your credentials in `.env`:
```env
PORT=3000
DATABASE_URL=your_postgresql_connection_string
GEMINI_API_KEY=your_gemini_api_key
```

### 3. Initialize Database

Run the schema migration and demo seeder:

```bash
npm run db:init
```

### 4. Running the Application

```bash
# Start backend server
npm run server

# Start frontend development server
npm run client

# Or run both concurrently
npm run dev
```

- **Full-Stack Application:** [http://localhost:3000](http://localhost:3000)
- **Vite Client:** [http://localhost:5173](http://localhost:5173)
- **Nurse Dashboard:** Click the "Nurse Dashboard" tab in the top navigation bar
