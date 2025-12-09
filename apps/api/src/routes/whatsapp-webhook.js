/**
 * WhatsApp Webhook Route (via Twilio)
 * Handles incoming WhatsApp messages and responds accordingly
 * 
 * Endpoint: POST /api/webhooks/whatsapp
 * 
 * Twilio WhatsApp Sandbox: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
 */

const express = require('express');
const router = express.Router();
const smsBookingService = require('../services/smsBooking');

/**
 * Twilio sends WhatsApp data as URL-encoded form data
 * Key fields (same as SMS):
 * - Body: The message content
 * - From: Sender's WhatsApp number (e.g., whatsapp:+919876543210)
 * - To: Your Twilio WhatsApp number (e.g., whatsapp:+14155238886)
 * - MessageSid: Unique message identifier
 * - ProfileName: WhatsApp profile name of sender
 */

// POST /api/webhooks/whatsapp - Handle incoming WhatsApp messages
router.post('/', express.urlencoded({ extended: true }), async (req, res) => {
  console.log('\n💬 ═══════════════════════════════════════');
  console.log('💬 INCOMING WHATSAPP MESSAGE');
  console.log('💬 ═══════════════════════════════════════');
  
  try {
    // Extract Twilio WhatsApp data
    const {
      Body: messageBody,
      From: fromNumber,
      To: toNumber,
      MessageSid: messageSid,
      AccountSid: accountSid,
      ProfileName: profileName,
      NumMedia: numMedia
    } = req.body;
    
    // WhatsApp numbers come prefixed with "whatsapp:"
    // e.g., "whatsapp:+919876543210"
    const cleanFromNumber = fromNumber ? fromNumber.replace('whatsapp:', '') : '';
    const cleanToNumber = toNumber ? toNumber.replace('whatsapp:', '') : '';
    
    console.log(`📱 From: ${cleanFromNumber} (${profileName || 'Unknown'})`);
    console.log(`📱 To: ${cleanToNumber}`);
    console.log(`📱 Message: ${messageBody}`);
    console.log(`📱 SID: ${messageSid}`);
    console.log(`📎 Media: ${numMedia || 0} attachments`);
    
    // Validate required fields
    if (!messageBody || !fromNumber) {
      console.error('❌ Missing required fields');
      return res.status(400).send(createTwiMLResponse('Invalid request. Please try again.'));
    }
    
    // Validate Twilio Account SID (basic security check)
    const expectedAccountSid = process.env.TWILIO_ACCOUNT_SID;
    if (expectedAccountSid && accountSid && accountSid !== expectedAccountSid) {
      console.error('❌ Invalid Account SID - possible spoofing attempt');
      return res.status(403).send('Forbidden');
    }
    
    // Process the message through our booking service
    // Use the clean phone number (without whatsapp: prefix)
    const result = await smsBookingService.processIncomingSMS(
      cleanFromNumber,
      messageBody,
      messageSid
    );
    
    console.log(`✅ Response: ${result.response.substring(0, 50)}...`);
    console.log('💬 ═══════════════════════════════════════\n');
    
    // Return TwiML response to Twilio
    const twiml = createTwiMLResponse(result.response);
    
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml);
    
  } catch (error) {
    console.error('❌ WhatsApp Webhook Error:', error);
    
    // Still respond to Twilio with an error message
    const errorTwiml = createTwiMLResponse(
      'Sorry, we encountered an error. Please try again or call 1800-XXX-XXXX.'
    );
    
    res.set('Content-Type', 'text/xml');
    res.status(200).send(errorTwiml);
  }
});

// GET /api/webhooks/whatsapp - Health check
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Twilio WhatsApp Webhook',
    message: 'This endpoint accepts POST requests from Twilio WhatsApp',
    sandbox: 'Join sandbox by sending "join <sandbox-code>" to +14155238886',
    commands: [
      'BOOK DD-MM - Book a machine for a specific date',
      'STATUS - Check your booking status',
      'CANCEL - Cancel your booking',
      'HELP - Get help'
    ]
  });
});

// POST /api/webhooks/whatsapp/test - Test endpoint for development
router.post('/test', express.json(), async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['phone', 'message'] 
      });
    }
    
    console.log(`\n🧪 TEST WHATSAPP from ${phone}: ${message}`);
    
    const result = await smsBookingService.processIncomingSMS(
      phone,
      message,
      `TEST-WA-${Date.now()}`
    );
    
    res.json({
      success: true,
      response: result.response,
      note: 'This is a test endpoint. In production, use the Twilio WhatsApp webhook.'
    });
    
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/webhooks/whatsapp/setup - Setup instructions
router.get('/setup', (req, res) => {
  res.json({
    title: 'Twilio WhatsApp Sandbox Setup',
    steps: [
      {
        step: 1,
        action: 'Join the Twilio WhatsApp Sandbox',
        details: 'Send "join <your-sandbox-code>" to +1 415 523 8886 on WhatsApp',
        note: 'Find your sandbox code at: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn'
      },
      {
        step: 2,
        action: 'Configure Webhook URL',
        details: 'In Twilio Console → Messaging → Try WhatsApp → Sandbox Settings',
        webhook: `${req.protocol}://${req.get('host')}/api/webhooks/whatsapp`,
        method: 'POST'
      },
      {
        step: 3,
        action: 'Test the integration',
        details: 'Send "HELP" to the sandbox number from WhatsApp'
      }
    ],
    commands: {
      'HELP': 'Get list of available commands',
      'BOOK DD-MM': 'Book a machine for a specific date (e.g., BOOK 15-12)',
      'STATUS': 'Check your current booking status',
      'CANCEL': 'Cancel your active booking'
    }
  });
});

/**
 * Create TwiML response for WhatsApp
 * WhatsApp uses the same TwiML format as SMS
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
