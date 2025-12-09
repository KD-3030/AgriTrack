const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const whatsappHandler = require('./whatsappHandler');

class WhatsAppWebService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.isInitializing = false;
  }

  /**
   * Initialize WhatsApp Web client
   */
  async initialize() {
    if (this.isInitializing || this.isReady) {
      console.log('ℹ️ WhatsApp Web client already initialized or initializing');
      return;
    }

    this.isInitializing = true;

    try {
      console.log('📱 Initializing WhatsApp Web client...');

      // Create client with local authentication (saves session)
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: './.wwebjs_auth'
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      // Event: QR Code generation
      this.client.on('qr', (qr) => {
        console.log('\n📱 WhatsApp QR Code Generated!\n');
        console.log('Scan this QR code with your WhatsApp mobile app:\n');
        qrcode.generate(qr, { small: true });
        console.log('\n👆 Open WhatsApp on your phone → Settings → Linked Devices → Link a Device\n');
      });

      // Event: Authentication success
      this.client.on('authenticated', () => {
        console.log('✅ WhatsApp authenticated successfully!');
      });

      // Event: Ready
      this.client.on('ready', () => {
        console.log('🚀 WhatsApp Web client is ready!');
        this.isReady = true;
        this.isInitializing = false;
      });

      // Event: Incoming message
      this.client.on('message', async (message) => {
        await this.handleIncomingMessage(message);
      });

      // Event: Disconnected
      this.client.on('disconnected', (reason) => {
        console.log('❌ WhatsApp disconnected:', reason);
        this.isReady = false;
        this.isInitializing = false;
      });

      // Event: Auth failure
      this.client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp authentication failed:', msg);
        this.isInitializing = false;
      });

      // Initialize the client
      await this.client.initialize();

    } catch (error) {
      console.error('❌ Error initializing WhatsApp Web:', error);
      this.isInitializing = false;
      throw error;
    }
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(message) {
    try {
      // Ignore group messages and status updates
      if (message.from === 'status@broadcast' || message.isGroupMsg) {
        return;
      }

      const phone = this.extractPhoneNumber(message.from);
      const text = message.body;

      console.log(`📱 WhatsApp message from ${phone}: ${text}`);

      // Get contact info
      const contact = await message.getContact();
      const senderName = contact.pushname || contact.name || 'User';

      // Format for our handler
      const messageData = {
        senderData: {
          chatId: message.from,
          sender: phone,
          senderName: senderName
        },
        messageData: {
          textMessageData: {
            textMessage: text
          }
        }
      };

      // Process the message
      await whatsappHandler.handleIncomingMessage(messageData);

    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  /**
   * Send a text message
   * @param {string} phoneNumber - Phone number (e.g., "919876543210")
   * @param {string} message - Message text to send
   */
  async sendMessage(phoneNumber, message) {
    try {
      if (!this.isReady) {
        console.warn('⚠️ WhatsApp Web not ready. Message would have been sent:', message);
        return { success: false, error: 'WhatsApp not ready. Please scan QR code first.' };
      }

      // Format phone number to WhatsApp ID
      const chatId = this.formatPhoneNumber(phoneNumber);

      // Send message
      const sentMessage = await this.client.sendMessage(chatId, message);

      console.log('✅ WhatsApp message sent:', sentMessage.id);
      return { success: true, data: sentMessage, provider: 'whatsapp-web' };

    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a formatted booking confirmation
   */
  async sendBookingConfirmation(phoneNumber, booking) {
    const message = `✅ *Booking Confirmed!*

*Booking ID:* ${booking.id}
*Machine:* ${booking.machine_name || booking.machine_id}
*Date:* ${new Date(booking.scheduled_date).toLocaleDateString('en-IN')}
*Acres:* ${booking.acres} acres
*Location:* ${booking.location}
${booking.notes ? `*Notes:* ${booking.notes}` : ''}

*Status:* ${booking.status.toUpperCase()}

Thank you for choosing AgriTrack! 🌾`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send booking menu/options
   */
  async sendBookingMenu(phoneNumber, farmerName = 'Farmer') {
    const message = `🚜 *Welcome to AgriTrack, ${farmerName}!*

To book a machine, reply with:
*Book [Machine] on [Date] for [Acres] acres at [Location]*

Example:
"Book Tractor on 15-12-2025 for 5 acres at Village Road"

Or type:
📋 *LIST* - See available machines
📅 *MY BOOKINGS* - View your bookings
❓ *HELP* - Get assistance

How can we help you today?`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send available machines list
   */
  async sendMachinesList(phoneNumber, machines) {
    let message = `🚜 *Available Machines:*\n\n`;

    if (machines.length === 0) {
      message += 'No machines available at the moment.';
    } else {
      machines.forEach((machine, idx) => {
        message += `${idx + 1}. *${machine.name || machine.type}*\n`;
        message += `   ID: ${machine.id}\n`;
        message += `   Status: ${machine.status}\n`;
        if (machine.rate_per_acre) {
          message += `   Rate: ₹${machine.rate_per_acre}/acre\n`;
        }
        message += `\n`;
      });
    }

    message += `\nTo book, type: *Book [Machine] on [Date] for [Acres] acres at [Location]*`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send error message
   */
  async sendErrorMessage(phoneNumber, errorText) {
    const message = `❌ *Error*\n\n${errorText}\n\nType *HELP* for assistance.`;
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Format phone number to WhatsApp chat ID
   * @param {string} phone - Phone number (e.g., "9876543210" or "919876543210")
   * @returns {string} WhatsApp chat ID (e.g., "919876543210@c.us")
   */
  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove @c.us if already present
    phone = phone.replace('@c.us', '');
    cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (default to India)
    if (!cleaned.startsWith('91') && cleaned.length === 10) {
      cleaned = '91' + cleaned;
    }
    
    // Add @c.us suffix
    return cleaned + '@c.us';
  }

  /**
   * Extract phone number from WhatsApp chat ID
   * @param {string} chatId - WhatsApp chat ID (e.g., "919876543210@c.us")
   * @returns {string} Clean phone number (e.g., "9876543210")
   */
  extractPhoneNumber(chatId) {
    let phone = chatId.replace('@c.us', '');
    // Remove country code (India - 91)
    if (phone.startsWith('91') && phone.length > 10) {
      phone = phone.substring(2);
    }
    return phone;
  }

  /**
   * Check if WhatsApp is configured and ready
   */
  isConfigured() {
    return this.isReady;
  }

  /**
   * Get client status
   */
  getStatus() {
    return {
      ready: this.isReady,
      initializing: this.isInitializing,
      provider: 'whatsapp-web.js'
    };
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      provider: 'whatsapp-web',
      configured: this.isReady,
      details: this.isReady 
        ? 'WhatsApp Web (Connected)' 
        : this.isInitializing 
        ? 'WhatsApp Web (Initializing... Please scan QR code)'
        : 'WhatsApp Web (Not connected)'
    };
  }

  /**
   * Disconnect client
   */
  async disconnect() {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      console.log('📱 WhatsApp Web client disconnected');
    }
  }
}

// Export singleton instance
module.exports = new WhatsAppWebService();
