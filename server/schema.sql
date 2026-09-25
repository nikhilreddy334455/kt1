-- Schema for AI-Powered Omnichannel Medical Concierge

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    avatar_url TEXT,
    full_name VARCHAR(100),
    dob DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active', -- active, escalated, resolved
    urgency_level VARCHAR(20) DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL, -- 'user', 'ai', 'nurse'
    channel VARCHAR(20) NOT NULL, -- 'text', 'voice'
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS triage_alerts (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
