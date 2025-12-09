const express = require('express');
const router = express.Router();
const db = require('../services/database');

// Mock feedback for testing without database
const mockFeedback = [];

// POST /api/v1/feedback - Submit feedback and complete/reject booking
router.post('/', async (req, res) => {
  try {
    const { 
      booking_id,
      farmer_id,
      operator_id,
      machine_id,
      approved, // true = work completed, false = work pending/rejected
      rating,
      service_quality,
      timeliness,
      machine_condition,
      operator_behavior,
      review_text,
      would_recommend,
      work_quality,
      rejection_reason // If approved=false, why was work rejected
    } = req.body;

    // Validate required fields
    if (!booking_id || !farmer_id || approved === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: booking_id, farmer_id, approved' 
      });
    }

    if (!db.isConfigured()) {
      // Mock mode
      const booking = require('./bookings').mockBookings?.find(b => b.id === booking_id);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Check if already has feedback
      const existingFeedback = mockFeedback.find(f => f.booking_id === booking_id);
      if (existingFeedback) {
        return res.status(409).json({ error: 'Feedback already submitted for this booking' });
      }

      const newFeedback = {
        id: `FB${Date.now()}`,
        booking_id,
        farmer_id,
        operator_id: operator_id || booking.machine_id, // Use machine_id as fallback
        machine_id,
        approved,
        rating: rating || null,
        service_quality: service_quality || null,
        timeliness: timeliness || null,
        machine_condition: machine_condition || null,
        operator_behavior: operator_behavior || null,
        review_text: review_text || null,
        would_recommend: would_recommend !== undefined ? would_recommend : null,
        work_quality: work_quality || null,
        rejection_reason: rejection_reason || null,
        created_at: new Date().toISOString()
      };

      mockFeedback.push(newFeedback);

      // Update booking status based on approval
      if (approved) {
        booking.status = 'completed';
        booking.feedback_submitted = true;
      } else {
        booking.status = 'pending'; // Work needs to be redone
        booking.rejection_reason = rejection_reason;
      }
      booking.updated_at = new Date().toISOString();

      // Emit updates via socket
      const io = req.app.get('io');
      io.emit('booking_update', booking);
      io.emit('feedback_submitted', newFeedback);

      console.log(`📝 Feedback submitted: Booking ${booking_id} - Approved: ${approved}`);
      
      return res.status(201).json({ 
        success: true, 
        feedback: newFeedback,
        booking: booking
      });
    }

    // Database mode
    // First, verify booking exists and belongs to farmer
    const bookingCheck = await db.query(
      'SELECT * FROM bookings WHERE id = $1 AND farmer_id = $2',
      [booking_id, farmer_id]
    );

    if (!bookingCheck.data || bookingCheck.data.length === 0) {
      return res.status(404).json({ error: 'Booking not found or unauthorized' });
    }

    const booking = bookingCheck.data[0];

    // Check if feedback already exists
    const existingFeedback = await db.query(
      'SELECT * FROM feedback WHERE booking_id = $1',
      [booking_id]
    );

    if (existingFeedback.data && existingFeedback.data.length > 0) {
      return res.status(409).json({ error: 'Feedback already submitted for this booking' });
    }

    // Insert feedback
    const feedbackData = {
      booking_id,
      farmer_id,
      operator_id: operator_id || booking.machine_id,
      machine_id,
      approved,
      rating: approved ? (rating || 5) : null, // Only rate if approved
      service_quality,
      timeliness,
      machine_condition,
      operator_behavior,
      review_text,
      would_recommend,
      work_quality,
      rejection_reason: approved ? null : rejection_reason
    };

    const { data: feedbackResult, error: feedbackError } = await db.query(
      `INSERT INTO feedback 
       (booking_id, farmer_id, operator_id, machine_id, rating, 
        service_quality, timeliness, machine_condition, operator_behavior,
        review_text, would_recommend, work_quality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        feedbackData.booking_id,
        feedbackData.farmer_id,
        feedbackData.operator_id,
        feedbackData.machine_id,
        feedbackData.rating,
        feedbackData.service_quality,
        feedbackData.timeliness,
        feedbackData.machine_condition,
        feedbackData.operator_behavior,
        feedbackData.review_text,
        feedbackData.would_recommend,
        feedbackData.work_quality
      ]
    );

    if (feedbackError) throw feedbackError;

    // Update booking status based on approval
    const newStatus = approved ? 'completed' : 'pending';
    const updateQuery = approved 
      ? 'UPDATE bookings SET status = $1, feedback_submitted = true, updated_at = NOW() WHERE id = $2 RETURNING *'
      : 'UPDATE bookings SET status = $1, notes = CONCAT(COALESCE(notes, \'\'), \'\n[REJECTION] \', $3), updated_at = NOW() WHERE id = $2 RETURNING *';

    const updateParams = approved 
      ? [newStatus, booking_id]
      : [newStatus, booking_id, rejection_reason || 'Work not satisfactory'];

    const { data: updatedBooking, error: updateError } = await db.query(
      updateQuery,
      updateParams
    );

    if (updateError) throw updateError;

    // Emit updates
    const io = req.app.get('io');
    io.emit('booking_update', updatedBooking[0]);
    io.emit('feedback_submitted', feedbackResult[0]);

    res.status(201).json({
      success: true,
      feedback: feedbackResult[0],
      booking: updatedBooking[0],
      message: approved 
        ? 'Work completed successfully!' 
        : 'Feedback submitted. Operator will be notified to redo the work.'
    });

  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/feedback/booking/:bookingId - Get feedback for a booking
router.get('/booking/:bookingId', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      const feedback = mockFeedback.find(f => f.booking_id === req.params.bookingId);
      return res.json(feedback || null);
    }

    const { data, error } = await db.query(
      'SELECT * FROM feedback WHERE booking_id = $1',
      [req.params.bookingId]
    );

    if (error) throw error;
    res.json(data && data.length > 0 ? data[0] : null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/feedback/operator/:operatorId - Get all feedback for an operator
router.get('/operator/:operatorId', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      const operatorFeedback = mockFeedback.filter(f => f.operator_id === req.params.operatorId);
      return res.json(operatorFeedback);
    }

    const { data, error } = await db.query(
      `SELECT f.*, b.scheduled_date, b.acres_covered, u.name as farmer_name
       FROM feedback f
       LEFT JOIN bookings b ON f.booking_id = b.id
       LEFT JOIN users u ON f.farmer_id = u.id
       WHERE f.operator_id = $1
       ORDER BY f.created_at DESC`,
      [req.params.operatorId]
    );

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/feedback/operator/:operatorId/summary - Get operator rating summary
router.get('/operator/:operatorId/summary', async (req, res) => {
  try {
    if (!db.isConfigured()) {
      const operatorFeedback = mockFeedback.filter(f => f.operator_id === req.params.operatorId);
      
      if (operatorFeedback.length === 0) {
        return res.json({
          operator_id: req.params.operatorId,
          total_reviews: 0,
          average_rating: 0,
          recommendation_rate: 0
        });
      }

      const summary = {
        operator_id: req.params.operatorId,
        total_reviews: operatorFeedback.length,
        average_rating: operatorFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / operatorFeedback.length,
        avg_service_quality: operatorFeedback.reduce((sum, f) => sum + (f.service_quality || 0), 0) / operatorFeedback.length,
        avg_timeliness: operatorFeedback.reduce((sum, f) => sum + (f.timeliness || 0), 0) / operatorFeedback.length,
        avg_machine_condition: operatorFeedback.reduce((sum, f) => sum + (f.machine_condition || 0), 0) / operatorFeedback.length,
        avg_operator_behavior: operatorFeedback.reduce((sum, f) => sum + (f.operator_behavior || 0), 0) / operatorFeedback.length,
        recommendation_rate: (operatorFeedback.filter(f => f.would_recommend).length / operatorFeedback.length) * 100
      };

      return res.json(summary);
    }

    const { data, error } = await db.query(
      'SELECT * FROM operator_ratings WHERE operator_id = $1',
      [req.params.operatorId]
    );

    if (error) throw error;
    
    if (!data || data.length === 0) {
      return res.json({
        operator_id: req.params.operatorId,
        total_reviews: 0,
        average_rating: 0,
        recommendation_rate: 0
      });
    }

    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export mock data for use in other routes
module.exports = router;
module.exports.mockFeedback = mockFeedback;
