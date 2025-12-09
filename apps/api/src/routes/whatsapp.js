const express = require('express');
const router = express.Router();
const whatsappHandler = require('../services/whatsappHandler');
const whatsappService = require('../services/whatsappService');

/**
 * @route POST /api/whatsapp/webhook
 * @desc Webhook endpoint to receive messages from Green API or Twilio
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('📥 Received WhatsApp webhook:', JSON.stringify(req.body, null, 2));

    // Detect provider and normalize data
    const provider = detectProvider(req.body);
    console.log(`📱 Detected provider: ${provider}`);

    if (provider === 'greenapi') {
      const { typeWebhook, ...webhookData } = req.body;

      // We're interested in incoming messages
      if (typeWebhook === 'incomingMessageReceived') {
        // Process the message asynchronously
        whatsappHandler.handleIncomingMessage(webhookData)
          .catch(err => console.error('Error processing WhatsApp message:', err));
        
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook received' 
        });
      }

      // Other webhook types (status updates, etc.)
      console.log(`ℹ️ Received ${typeWebhook} webhook event`);
      res.status(200).json({ success: true });

    } else if (provider === 'twilio') {
      // Twilio webhook format
      const messageData = {
        senderData: {
          chatId: req.body.From, // whatsapp:+1234567890
          sender: req.body.From.replace('whatsapp:', ''),
          senderName: req.body.ProfileName || 'User'
        },
        messageData: {
          textMessageData: {
            textMessage: req.body.Body
          }
        }
      };

      // Process the message asynchronously
      whatsappHandler.handleIncomingMessage(messageData)
        .catch(err => console.error('Error processing WhatsApp message:', err));

      // Respond with TwiML (required for Twilio)
      res.set('Content-Type', 'text/xml');
      res.send('<Response></Response>');

    } else {
      console.log('⚠️ Unknown webhook format');
      res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    // Still return 200 to prevent retries
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * Detect which provider sent the webhook
 */
function detectProvider(body) {
  if (body.typeWebhook || body.instanceId) {
    return 'greenapi';
  }
  if (body.MessageSid || body.From?.startsWith('whatsapp:')) {
    return 'twilio';
  }
  return 'unknown';
}

/**
 * @route POST /api/whatsapp/send
 * @desc Manually send a WhatsApp message (for testing or admin use)
 */
router.post('/send', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and message are required' 
      });
    }

    const result = await whatsappService.sendMessage(phone, message);
    res.json(result);

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route POST /api/whatsapp/send-booking-confirmation
 * @desc Send booking confirmation via WhatsApp
 */
router.post('/send-booking-confirmation', async (req, res) => {
  try {
    const { phone, booking } = req.body;

    if (!phone || !booking) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and booking details are required' 
      });
    }

    const result = await whatsappService.sendBookingConfirmation(phone, booking);
    res.json(result);

  } catch (error) {
    console.error('Error sending booking confirmation:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * @route GET /api/whatsapp/status
 * @desc Check WhatsApp service configuration status
 */
router.get('/status', (req, res) => {
  const providerInfo = whatsappService.getProviderInfo();
  res.json({
    success: true,
    ...providerInfo,
    message: providerInfo.configured 
      ? `WhatsApp service is configured using ${providerInfo.details}` 
      : 'WhatsApp service is not configured. Set either Twilio or Green API credentials in .env'
  });
});

/**
 * @route POST /api/whatsapp/test
 * @desc Test endpoint to simulate a booking message
 */
router.post('/test', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Phone and message are required for testing' 
      });
    }

    // Simulate Green API webhook format
    const mockWebhookData = {
      typeWebhook: 'incomingMessageReceived',
      senderData: {
        chatId: whatsappService.formatPhoneNumber(phone),
        sender: phone,
        senderName: 'Test User'
      },
      messageData: {
        textMessageData: {
          textMessage: message
        }
      }
    };

    const result = await whatsappHandler.handleIncomingMessage(mockWebhookData);
    
    res.json({
      success: true,
      message: 'Test message processed',
      result
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
