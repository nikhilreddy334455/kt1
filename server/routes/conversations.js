import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// GET /api/conversations/:patientId - Fetch active conversation and message history
router.get('/:patientId', async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId, 10);
    if (isNaN(patientId) || patientId <= 0) {
      return res.status(400).json({ error: 'Invalid patientId' });
    }

    // Verify patient exists
    const patientCheck = await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Find latest active or escalated conversation
    let convResult = await pool.query(
      `SELECT * FROM conversations 
       WHERE patient_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [patientId]
    );

    let conversation = convResult.rows[0];

    // If no conversation exists or previous is resolved, create a new one
    if (!conversation || conversation.status === 'resolved') {
      const newConv = await pool.query(
        `INSERT INTO conversations (patient_id, status, urgency_level) 
         VALUES ($1, 'active', 'unknown') 
         RETURNING *`,
        [patientId]
      );
      conversation = newConv.rows[0];

      // Add a welcoming AI greeting message
      const welcomeText = `Hello ${patientCheck.rows[0].full_name || 'there'}! I am HealthSync, your medical concierge. How can I assist you with your health, scheduling, or care questions today?`;
      await pool.query(
        `INSERT INTO messages (conversation_id, sender_type, channel, content) 
         VALUES ($1, 'ai', 'text', $2)`,
        [conversation.id, welcomeText]
      );
    }

    // Fetch all messages for this conversation
    const messagesResult = await pool.query(
      `SELECT id, conversation_id, sender_type, channel, content, created_at 
       FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversation.id]
    );

    res.json({
      conversation,
      messages: messagesResult.rows,
      patient: patientCheck.rows[0]
    });
  } catch (error) {
    console.error('Fetch conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// POST /api/conversations/reset - Start a fresh conversation for patient
router.post('/reset', async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    // Mark previous conversations as resolved
    await pool.query(
      `UPDATE conversations SET status = 'resolved' WHERE patient_id = $1 AND status != 'resolved'`,
      [patientId]
    );

    // Create new active conversation
    const newConv = await pool.query(
      `INSERT INTO conversations (patient_id, status, urgency_level) 
       VALUES ($1, 'active', 'unknown') 
       RETURNING *`,
      [patientId]
    );

    const patientRes = await pool.query('SELECT full_name FROM patients WHERE id = $1', [patientId]);
    const name = patientRes.rows[0]?.full_name || 'there';

    const welcomeMsg = `Hello ${name}! A new concierge session has started. How can I assist you today? You can speak or type your symptoms.`;
    const msgRes = await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, channel, content) 
       VALUES ($1, 'ai', 'text', $2) 
       RETURNING *`,
      [newConv.rows[0].id, welcomeMsg]
    );

    res.json({
      conversation: newConv.rows[0],
      messages: [msgRes.rows[0]]
    });
  } catch (error) {
    console.error('Reset conversation error:', error);
    res.status(500).json({ error: 'Failed to reset conversation' });
  }
});

export default router;
