/**
 * Meta WhatsApp Cloud API Service
 * Direct integration with Meta's official WhatsApp Business API
 * 
 * Setup:
 * 1. Go to developers.facebook.com
 * 2. Create a Business app
 * 3. Add WhatsApp product
 * 4. Get Phone Number ID and Access Token
 * 5. Add recipient phone numbers to test list
 */

const axios = require('axios');

class MetaWhatsAppService {
  constructor() {
    this.phoneNumberId = process.env.META_WHATSAPP_PHONE_ID;
    this.accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    this.verifyToken = process.env.META_WHATSAPP_VERIFY_TOKEN || 'agritrack_verify_token';
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
    this.supabase = null;
    
    if (this.phoneNumberId && this.accessToken) {
      console.log('✅ Meta WhatsApp Cloud API initialized');
    } else {
      console.log('⚠️ Meta WhatsApp: Missing credentials (set META_WHATSAPP_PHONE_ID and META_WHATSAPP_ACCESS_TOKEN)');
    }
  }

  setSupabase(supabase) {
    this.supabase = supabase;
    console.log('✅ Meta WhatsApp Service: Supabase client set');
  }

  /**
   * Send a text message via WhatsApp
   */
  async sendMessage(to, message) {
    if (!this.phoneNumberId || !this.accessToken) {
      console.error('❌ Meta WhatsApp: Missing credentials');
      return { success: false, error: 'Missing API credentials' };
    }

    // Ensure phone number is in correct format (without + prefix for Meta API)
    const formattedTo = to.replace(/^\+/, '');

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'text',
          text: { 
            preview_url: false,
            body: message 
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ WhatsApp message sent to ${to}`);
      return { 
        success: true, 
        messageId: response.data.messages?.[0]?.id 
      };

    } catch (error) {
      console.error('❌ Meta WhatsApp API Error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send a template message (for notifications)
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
    if (!this.phoneNumberId || !this.accessToken) {
      return { success: false, error: 'Missing API credentials' };
    }

    const formattedTo = to.replace(/^\+/, '');

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { 
        success: true, 
        messageId: response.data.messages?.[0]?.id 
      };

    } catch (error) {
      console.error('❌ Template Message Error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Send interactive button message
   */
  async sendButtonMessage(to, bodyText, buttons) {
    if (!this.phoneNumberId || !this.accessToken) {
      return { success: false, error: 'Missing API credentials' };
    }

    const formattedTo = to.replace(/^\+/, '');

    try {
      const response = await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedTo,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.map((btn, idx) => ({
                type: 'reply',
                reply: {
                  id: btn.id || `btn_${idx}`,
                  title: btn.title.substring(0, 20) // Max 20 chars
                }
              }))
            }
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return { 
        success: true, 
        messageId: response.data.messages?.[0]?.id 
      };

    } catch (error) {
      console.error('❌ Button Message Error:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error?.message || error.message 
      };
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    if (!this.phoneNumberId || !this.accessToken) {
      return { success: false };
    }

    try {
      await axios.post(
        `${this.baseUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Process incoming webhook message
   */
  async processIncomingMessage(webhookData) {
    try {
      // Extract message data from webhook
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      if (!value?.messages?.[0]) {
        return null; // No message in this webhook (could be status update)
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];
      
      const messageData = {
        messageId: message.id,
        from: message.from, // Phone number without +
        timestamp: message.timestamp,
        type: message.type,
        profileName: contact?.profile?.name || 'Unknown',
        text: null,
        buttonReply: null
      };

      // Extract message content based on type
      if (message.type === 'text') {
        messageData.text = message.text?.body;
      } else if (message.type === 'interactive') {
        // Button reply
        messageData.buttonReply = message.interactive?.button_reply?.id;
        messageData.text = message.interactive?.button_reply?.title;
      } else if (message.type === 'button') {
        // Template button reply
        messageData.text = message.button?.text;
      }

      return messageData;

    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      return null;
    }
  }

  /**
   * Verify webhook (required by Meta)
   */
  verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('✅ Webhook verified');
      return challenge;
    }
    return null;
  }
}

// Singleton instance
const metaWhatsAppService = new MetaWhatsAppService();

module.exports = metaWhatsAppService;
