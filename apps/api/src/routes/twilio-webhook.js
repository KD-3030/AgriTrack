/**
 * Twilio SMS Webhook Route
 * Handles incoming SMS messages from Twilio and responds accordingly
 * 
 * Endpoint: POST /api/webhooks/twilio-sms
 */

const express = require('express');
const router = express.Router();
const smsBookingService = require('../services/smsBooking');

/**
 * Twilio sends SMS data as URL-encoded form data
 * Key fields:
 * - Body: The SMS message content
 * - From: Sender's phone number (e.g., +919876543210)
 * - To: Your Twilio number
 * - MessageSid: Unique message identifier
 * - AccountSid: Your Twilio account SID
 */

// POST /api/webhooks/twilio-sms - Handle incoming SMS
router.post('/', express.urlencoded({ extended: true }), async (req, res) => {
  console.log('\n📨 ═══════════════════════════════════════');
  console.log('📨 INCOMING SMS WEBHOOK');
  console.log('📨 ═══════════════════════════════════════');
  
  try {
    // Extract Twilio SMS data
    const {
      Body: messageBody,
      From: fromNumber,
      To: toNumber,
      MessageSid: messageSid,
      AccountSid: accountSid
    } = req.body;
    
    console.log(`📱 From: ${fromNumber}`);
    console.log(`📱 To: ${toNumber}`);
    console.log(`📱 Message: ${messageBody}`);
    console.log(`📱 SID: ${messageSid}`);
    
    // Validate required fields
    if (!messageBody || !fromNumber) {
      console.error('❌ Missing required fields');
      return res.status(400).send(createTwiMLResponse('Invalid request. Please try again.'));
    }
    
    // Validate Twilio Account SID (basic security check)
    // Note: In production, use Twilio's validateRequest() for proper signature validation
    const expectedAccountSid = process.env.TWILIO_ACCOUNT_SID;
    if (expectedAccountSid && accountSid && accountSid !== expectedAccountSid) {
      console.error('❌ Invalid Account SID - possible spoofing attempt');
      console.error(`   Expected: ${expectedAccountSid}`);
      console.error(`   Received: ${accountSid}`);
      return res.status(403).send('Forbidden');
    }
    
    // Process the SMS through our booking service
    const result = await smsBookingService.processIncomingSMS(
      fromNumber,
      messageBody,
      messageSid
    );
    
    console.log(`✅ Response: ${result.response.substring(0, 50)}...`);
    console.log('📨 ═══════════════════════════════════════\n');
    
    // Return TwiML response to Twilio
    const twiml = createTwiMLResponse(result.response);
    
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml);
    
  } catch (error) {
    console.error('❌ Webhook Error:', error);
    
    // Still respond to Twilio with an error message
    const errorTwiml = createTwiMLResponse(
      'Sorry, we encountered an error. Please try again or call 1800-XXX-XXXX.'
    );
    
    res.set('Content-Type', 'text/xml');
    res.status(200).send(errorTwiml); // Return 200 to prevent Twilio retries
  }
});

// GET /api/webhooks/twilio-sms - Health check
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Twilio SMS Webhook',
    message: 'This endpoint accepts POST requests from Twilio',
    commands: [
      'BOOK DD-MM - Book a machine for a specific date',
      'STATUS - Check your booking status',
      'CANCEL - Cancel your booking',
      'HELP - Get help'
    ]
  });
});

// POST /api/webhooks/twilio-sms/test - Test endpoint (for development)
router.post('/test', express.json(), async (req, res) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const { phone, message } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' });
  }
  
  console.log(`\n🧪 TEST SMS from ${phone}: ${message}`);
  
  const result = await smsBookingService.processIncomingSMS(phone, message, 'TEST-' + Date.now());
  
  res.json({
    success: result.success,
    response: result.response,
    note: 'This is a test endpoint. In production, use the Twilio webhook.'
  });
});

// GET /api/webhooks/twilio-sms/stats - SMS statistics
router.get('/stats', async (req, res) => {
  try {
    const db = require('../services/database');
    const supabase = db.getClient();
    
    if (!supabase) {
      return res.json({
        configured: false,
        message: 'Database not configured'
      });
    }
    
    // Get stats from view
    const { data: stats } = await supabase
      .from('v_sms_booking_stats')
      .select('*')
      .limit(7);
    
    // Get active sessions count
    const { count: activeSessions } = await supabase
      .from('sms_booking_sessions')
      .select('*', { count: 'exact', head: true })
      .not('session_state', 'in', '("completed","expired")')
      .gt('expires_at', new Date().toISOString());
    
    res.json({
      configured: true,
      active_sessions: activeSessions || 0,
      daily_stats: stats || []
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create TwiML (Twilio Markup Language) response
 * This XML format tells Twilio how to respond to the SMS
 */
function createTwiMLResponse(message) {
  // Escape XML special characters
  const escapedMessage = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapedMessage}</Message>
</Response>`;
}

module.exports = router;
