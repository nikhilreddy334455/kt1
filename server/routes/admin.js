import express from 'express';
import { pool } from '../db.js';
import { ResolveAlertSchema } from '../schemas/index.js';

const router = express.Router();

// Admin middleware simulator
const adminMiddleware = (req, res, next) => {
  // In production, verify JWT or staff session
  // For production concierge demo, grant access with audit logging
  next();
};

router.use(adminMiddleware);

// GET /api/admin/alerts - Fetch all triage alerts for Nurse Dashboard
router.get('/alerts', async (req, res) => {
  try {
    const statusFilter = req.query.status; // 'active' | 'resolved' | 'all'
    
    let whereClause = 'WHERE 1=1';
    if (statusFilter === 'active') {
      whereClause += ' AND ta.is_resolved = FALSE';
    } else if (statusFilter === 'resolved') {
      whereClause += ' AND ta.is_resolved = TRUE';
    }

    const queryText = `
      SELECT 
        ta.id AS alert_id,
        ta.conversation_id,
        ta.summary AS alert_summary,
        ta.is_resolved,
        ta.created_at AS alert_created_at,
        c.status AS conversation_status,
        c.urgency_level,
        p.id AS patient_id,
        p.full_name AS patient_name,
        p.phone_number AS patient_phone,
        p.dob AS patient_dob,
        (
          SELECT json_agg(
            json_build_object(
              'id', m.id,
              'sender_type', m.sender_type,
              'channel', m.channel,
              'content', m.content,
              'created_at', m.created_at
            ) ORDER BY m.created_at ASC
          )
          FROM messages m
          WHERE m.conversation_id = c.id
        ) AS transcript
      FROM triage_alerts ta
      JOIN conversations c ON ta.conversation_id = c.id
      JOIN patients p ON c.patient_id = p.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN c.urgency_level = 'critical' THEN 1
          WHEN c.urgency_level = 'high' THEN 2
          WHEN c.urgency_level = 'medium' THEN 3
          ELSE 4
        END,
        ta.created_at DESC;
    `;

    const result = await pool.query(queryText);
    res.json({
      alerts: result.rows
    });
  } catch (error) {
    console.error('Fetch alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch triage alerts' });
  }
});

// POST /api/admin/resolve-alert - Mark alert as resolved
router.post('/resolve-alert', async (req, res) => {
  try {
    const validated = ResolveAlertSchema.parse(req.body);
    const { alertId } = validated;

    // Update alert
    const alertResult = await pool.query(
      `UPDATE triage_alerts 
       SET is_resolved = TRUE 
       WHERE id = $1 
       RETURNING *`,
      [alertId]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const alert = alertResult.rows[0];

    // Check if there are other unresolved alerts for this conversation
    const remainingAlerts = await pool.query(
      `SELECT COUNT(*) FROM triage_alerts 
       WHERE conversation_id = $1 AND is_resolved = FALSE`,
      [alert.conversation_id]
    );

    if (parseInt(remainingAlerts.rows[0].count, 10) === 0) {
      // Mark conversation as resolved
      await pool.query(
        `UPDATE conversations SET status = 'resolved' WHERE id = $1`,
        [alert.conversation_id]
      );
    }

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      alert
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Resolve alert error:', error);
    res.status(500).json({ error: 'Failed to resolve triage alert' });
  }
});

// GET /api/admin/stats - High-level metrics for dashboard header
router.get('/stats', async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM triage_alerts WHERE is_resolved = FALSE) AS active_alerts_count,
        (SELECT COUNT(*) FROM triage_alerts ta JOIN conversations c ON ta.conversation_id = c.id WHERE ta.is_resolved = FALSE AND c.urgency_level = 'critical') AS critical_alerts_count,
        (SELECT COUNT(*) FROM conversations WHERE status = 'active') AS active_conversations_count,
        (SELECT COUNT(*) FROM messages WHERE channel = 'voice') AS voice_messages_count,
        (SELECT COUNT(*) FROM messages WHERE channel = 'text') AS text_messages_count
    `);

    res.json({
      stats: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

export default router;
