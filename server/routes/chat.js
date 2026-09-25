import express from 'express';
import { pool } from '../db.js';
import { ChatRequestSchema } from '../schemas/index.js';
import { processMedicalChat } from '../services/gemini.js';

const router = express.Router();

// POST /api/chat - Process patient message via text or voice
router.post('/', async (req, res) => {
  try {
    const validated = ChatRequestSchema.parse(req.body);
    const { patientId, message, channel } = validated;

    // 1. Verify patient exists
    const patientQuery = await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    if (patientQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    const patient = patientQuery.rows[0];

    // 2. Fetch or create active conversation
    let convQuery = await pool.query(
      `SELECT * FROM conversations 
       WHERE patient_id = $1 AND status != 'resolved' 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [patientId]
    );

    let conversation;
    if (convQuery.rows.length === 0) {
      const newConv = await pool.query(
        `INSERT INTO conversations (patient_id, status, urgency_level) 
         VALUES ($1, 'active', 'unknown') 
         RETURNING *`,
        [patientId]
      );
      conversation = newConv.rows[0];
    } else {
      conversation = convQuery.rows[0];
    }

    // 3. Save User message to DB with specified channel ('text' or 'voice')
    const userMsgResult = await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, channel, content) 
       VALUES ($1, 'user', $2, $3) 
       RETURNING *`,
      [conversation.id, channel, message]
    );
    const userMessage = userMsgResult.rows[0];

    // 4. Retrieve recent conversation history from DB for secure context
    const historyResult = await pool.query(
      `SELECT sender_type, channel, content 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT 20`,
      [conversation.id]
    );

    // 5. Process through Gemini AI with clinical triage evaluation
    const aiResult = await processMedicalChat({
      patient,
      message,
      channel,
      history: historyResult.rows
    });

    const { replyText, urgencyLevel, needsHandoff, clinicalSummary } = aiResult;

    // 6. Save AI Response message to DB with channel matching context
    const aiMsgResult = await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, channel, content) 
       VALUES ($1, 'ai', $2, $3) 
       RETURNING *`,
      [conversation.id, channel, replyText]
    );
    const aiMessage = aiMsgResult.rows[0];

    let triageAlert = null;

    // 7. Handle Triage Escalation / Nurse Alert
    if (needsHandoff) {
      // Update conversation state to escalated and set urgency level
      await pool.query(
        `UPDATE conversations 
         SET status = 'escalated', urgency_level = $1 
         WHERE id = $2`,
        [urgencyLevel, conversation.id]
      );

      // Create new triage alert for the Nurse Dashboard
      const alertSummary = clinicalSummary || `Patient escalated with ${urgencyLevel} urgency. Chief Complaint: "${message}"`;
      const alertResult = await pool.query(
        `INSERT INTO triage_alerts (conversation_id, summary, is_resolved) 
         VALUES ($1, $2, FALSE) 
         RETURNING *`,
        [conversation.id, alertSummary]
      );
      triageAlert = alertResult.rows[0];
    } else {
      // Update urgency level if higher
      await pool.query(
        `UPDATE conversations 
         SET urgency_level = $1 
         WHERE id = $2`,
        [urgencyLevel, conversation.id]
      );
    }

    res.json({
      success: true,
      userMessage,
      aiMessage,
      triage: {
        urgencyLevel,
        needsHandoff,
        clinicalSummary,
        alert: triageAlert
      }
    });

  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Chat processing error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

export default router;
