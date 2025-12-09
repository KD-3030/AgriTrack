/**
 * Meta WhatsApp Cloud API Webhook Route
 * Handles incoming WhatsApp messages via Meta's official API
 * 
 * Endpoint: /api/webhooks/meta-whatsapp
 * 
 * Setup in Meta Developer Console:
 * 1. Go to App Dashboard → WhatsApp → Configuration
 * 2. Set Webhook URL: https://your-domain.com/api/webhooks/meta-whatsapp
 * 3. Set Verify Token: agritrack_verify_token (or your custom token)
 * 4. Subscribe to: messages
 */

const express = require('express');
const router = express.Router();
const metaWhatsAppService = require('../services/metaWhatsapp');
const smsBookingService = require('../services/smsBooking');

/**
 * GET /api/webhooks/meta-whatsapp
 * Webhook verification (required by Meta)
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📞 Meta Webhook Verification Request');
  console.log(`   Mode: ${mode}`);
  console.log(`   Token: ${token}`);

  if (mode && token) {
    const result = metaWhatsAppService.verifyWebhook(mode, token, challenge);
    if (result) {
      console.log('✅ Webhook verified successfully');
      return res.status(200).send(challenge);
    }
  }

  console.error('❌ Webhook verification failed');
  res.status(403).send('Forbidden');
});

/**
 * POST /api/webhooks/meta-whatsapp
 * Handle incoming messages
 */
router.post('/', express.json(), async (req, res) => {
  console.log('\n💬 ═══════════════════════════════════════');
  console.log('💬 INCOMING META WHATSAPP MESSAGE');
  console.log('💬 ═══════════════════════════════════════');

  try {
    // Always respond 200 OK quickly to Meta
    // (Meta requires response within 20 seconds)
    res.status(200).send('OK');

    // Process the webhook data
    const messageData = await metaWhatsAppService.processIncomingMessage(req.body);
    
    if (!messageData) {
      // Not a message event (could be status update)
      console.log('📊 Non-message webhook event received');
      return;
    }

    console.log(`📱 From: +${messageData.from} (${messageData.profileName})`);
    console.log(`📱 Message: ${messageData.text}`);
    console.log(`📱 Type: ${messageData.type}`);
    console.log(`📱 ID: ${messageData.messageId}`);

    // Mark message as read
    await metaWhatsAppService.markAsRead(messageData.messageId);

    // Process the message through our booking service
    const formattedPhone = `+${messageData.from}`;
    const result = await smsBookingService.processIncomingSMS(
      formattedPhone,
      messageData.text || '',
      messageData.messageId
    );

    console.log(`✅ Response: ${result.response.substring(0, 50)}...`);

    // Send response back via WhatsApp
    await metaWhatsAppService.sendMessage(formattedPhone, result.response);

    console.log('💬 ═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Meta Webhook Error:', error);
    // Don't send error response - we already sent 200 OK
  }
});

/**
 * POST /api/webhooks/meta-whatsapp/send
 * Manual send endpoint (for testing)
 */
router.post('/send', express.json(), async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['to', 'message']
      });
    }

    console.log(`📤 Sending WhatsApp to ${to}: ${message.substring(0, 30)}...`);

    const result = await metaWhatsAppService.sendMessage(to, message);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        note: 'Message sent via Meta WhatsApp Cloud API'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('Send endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/meta-whatsapp/test
 * Test endpoint for development (simulates incoming message)
 */
router.post('/test', express.json(), async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['phone', 'message']
      });
    }

    console.log(`\n🧪 TEST META WHATSAPP from ${phone}: ${message}`);

    const result = await smsBookingService.processIncomingSMS(
      phone,
      message,
      `TEST-META-${Date.now()}`
    );

    res.json({
      success: true,
      response: result.response,
      note: 'This is a test endpoint. In production, messages come via webhook.'
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/webhooks/meta-whatsapp/setup
 * Setup instructions
 */
router.get('/setup', (req, res) => {
  const webhookUrl = `${req.protocol}://${req.get('host')}/api/webhooks/meta-whatsapp`;
  
  res.json({
    title: 'Meta WhatsApp Cloud API Setup',
    webhookUrl: webhookUrl,
    verifyToken: process.env.META_WHATSAPP_VERIFY_TOKEN || 'agritrack_verify_token',
    steps: [
      {
        step: 1,
        action: 'Create Meta Developer App',
        url: 'https://developers.facebook.com/apps/',
        details: 'Create a new Business app'
      },
      {
        step: 2,
        action: 'Add WhatsApp Product',
        details: 'In your app, click "Add Products" and select WhatsApp'
      },
      {
        step: 3,
        action: 'Get API Credentials',
        details: 'Go to WhatsApp > API Setup to get Phone Number ID and Access Token',
        envVars: {
          META_WHATSAPP_PHONE_ID: 'Your Phone Number ID',
          META_WHATSAPP_ACCESS_TOKEN: 'Your Temporary Access Token',
          META_WHATSAPP_VERIFY_TOKEN: 'agritrack_verify_token'
        }
      },
      {
        step: 4,
        action: 'Add Test Phone Numbers',
        details: 'In API Setup, add your phone numbers to "To" field and verify them'
      },
      {
        step: 5,
        action: 'Configure Webhook',
        details: 'Go to WhatsApp > Configuration > Webhook',
        webhook: {
          callbackUrl: webhookUrl,
          verifyToken: 'agritrack_verify_token',
          subscriptions: ['messages']
        }
      },
      {
        step: 6,
        action: 'Test the Integration',
        details: 'Send a message to the test number shown in Meta dashboard'
      }
    ],
    commands: {
      'HELP': 'Get list of available commands',
      'BOOK DD-MM': 'Book a machine for a specific date (e.g., BOOK 15-12)',
      'STATUS': 'Check your current booking status',
      'CANCEL': 'Cancel your active booking'
    },
    testEndpoint: {
      url: `${webhookUrl}/test`,
      method: 'POST',
      body: { phone: '+919876543210', message: 'HELP' }
    }
  });
});

/**
 * GET /api/webhooks/meta-whatsapp/health
 * Health check
 */
router.get('/health', (req, res) => {
  const hasCredentials = !!(process.env.META_WHATSAPP_PHONE_ID && process.env.META_WHATSAPP_ACCESS_TOKEN);
  
  res.json({
    status: hasCredentials ? 'ok' : 'missing_credentials',
    service: 'Meta WhatsApp Cloud API',
    configured: hasCredentials,
    phoneNumberId: process.env.META_WHATSAPP_PHONE_ID ? '✅ Set' : '❌ Missing',
    accessToken: process.env.META_WHATSAPP_ACCESS_TOKEN ? '✅ Set' : '❌ Missing',
    verifyToken: process.env.META_WHATSAPP_VERIFY_TOKEN || 'agritrack_verify_token (default)'
  });
});

module.exports = router;
