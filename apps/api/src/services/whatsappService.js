const axios = require('axios');
const whatsappWebService = require('./whatsappWebService');

class WhatsAppService {
  constructor() {
    // WhatsApp Web.js (FREE - Primary)
    this.useWhatsAppWeb = process.env.USE_WHATSAPP_WEB !== 'false'; // Default to true
    
    // Green API configuration (Fallback)
    this.greenApiInstanceId = process.env.GREEN_API_INSTANCE_ID;
    this.greenApiToken = process.env.GREEN_API_TOKEN;
    this.greenApiBaseUrl = `https://api.green-api.com/waInstance${this.greenApiInstanceId}`;
    
    // Twilio configuration (Fallback)
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
    
    // Determine which provider to use
    this.provider = this.getProvider();
    
    // Initialize Twilio client if configured
    if (this.provider === 'twilio') {
      const twilio = require('twilio');
      this.twilioClient = twilio(this.twilioAccountSid, this.twilioAuthToken);
    }
  }

  /**
   * Determine which WhatsApp provider is configured
   */
  getProvider() {
    // Prefer WhatsApp Web (FREE!)
    if (this.useWhatsAppWeb) {
      console.log('📱 Using WhatsApp Web.js (FREE - No API needed!)');
      return 'whatsapp-web';
    }
    
    // Fallback to Twilio
    if (this.twilioAccountSid && this.twilioAuthToken) {
      console.log('📱 Using Twilio WhatsApp');
      return 'twilio';
    }
    
    // Fallback to Green API
    if (this.greenApiInstanceId && this.greenApiToken) {
      console.log('📱 Using Green API WhatsApp');
      return 'greenapi';
    }
    
    console.warn('⚠️ No WhatsApp provider configured. Will use WhatsApp Web.js when initialized.');
    return 'whatsapp-web';
  }

  /**
   * Send a text message via configured provider
   * @param {string} phoneNumber - Phone number in format 1234567890 or whatsapp:+1234567890
   * @param {string} message - Message text to send
   */
  async sendMessage(phoneNumber, message) {
    try {
      if (this.provider === 'whatsapp-web') {
        return await whatsappWebService.sendMessage(phoneNumber, message);
      } else if (this.provider === 'twilio') {
        return await this.sendViaTwilio(phoneNumber, message);
      } else if (this.provider === 'greenapi') {
        return await this.sendViaGreenApi(phoneNumber, message);
      }

      console.warn('⚠️ No WhatsApp provider ready. Attempting WhatsApp Web...');
      return await whatsappWebService.sendMessage(phoneNumber, message);
    } catch (error) {
      console.error('❌ Error sending WhatsApp message:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a formatted booking confirmation
   */
  async sendBookingConfirmation(phoneNumber, booking) {
    if (this.provider === 'whatsapp-web') {
      return await whatsappWebService.sendBookingConfirmation(phoneNumber, booking);
    }
    
    // Fallback to manual formatting for other providers
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
    if (this.provider === 'whatsapp-web') {
      return await whatsappWebService.sendBookingMenu(phoneNumber, farmerName);
    }

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
    if (this.provider === 'whatsapp-web') {
      return await whatsappWebService.sendMachinesList(phoneNumber, machines);
    }

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
    if (this.provider === 'whatsapp-web') {
      return await whatsappWebService.sendErrorMessage(phoneNumber, errorText);
    }

    const message = `❌ *Error*\n\n${errorText}\n\nType *HELP* for assistance.`;
    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Send message via Twilio
   */
  async sendViaTwilio(phoneNumber, message) {
    try {
      // Format phone number for Twilio
      const formattedPhone = this.formatPhoneForTwilio(phoneNumber);

      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioWhatsAppNumber,
        to: formattedPhone
      });

      console.log('✅ WhatsApp message sent via Twilio:', result.sid);
      return { success: true, data: result, provider: 'twilio' };
    } catch (error) {
      console.error('❌ Twilio error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message via Green API
   */
  async sendViaGreenApi(phoneNumber, message) {
    try {
      const formattedPhone = this.formatPhoneForGreenApi(phoneNumber);

      const response = await axios.post(
        `${this.greenApiBaseUrl}/sendMessage/${this.greenApiToken}`,
        {
          chatId: formattedPhone,
          message: message
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ WhatsApp message sent via Green API:', response.data);
      return { success: true, data: response.data, provider: 'greenapi' };
    } catch (error) {
      console.error('❌ Green API error:', error.response?.data || error.message);
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
   * Format phone number for Twilio (whatsapp:+1234567890)
   */
  formatPhoneForTwilio(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove whatsapp: prefix if present
    if (phone.startsWith('whatsapp:')) {
      return phone;
    }
    
    // Add country code if not present
    if (!cleaned.startsWith('91') && !cleaned.startsWith('1')) {
      cleaned = '91' + cleaned; // Default to India
    }
    
    // Format as whatsapp:+number
    return `whatsapp:+${cleaned}`;
  }

  /**
   * Format phone number for Green API (919876543210@c.us)
   */
  formatPhoneForGreenApi(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If it doesn't start with 91 (India code), add it
    if (!cleaned.startsWith('91')) {
      cleaned = '91' + cleaned;
    }
    
    // Add @c.us if not present
    if (!phone.includes('@c.us')) {
      return cleaned + '@c.us';
    }
    
    return phone;
  }

  /**
   * Format phone number (backwards compatibility)
   */
  formatPhoneNumber(phone) {
    if (this.provider === 'twilio') {
      return this.formatPhoneForTwilio(phone);
    }
    return this.formatPhoneForGreenApi(phone);
  }

  /**
   * Extract phone number from various formats
   * @param {string} phoneOrChatId - Phone number or chat ID
   * @returns {string} Clean phone number (e.g., "9876543210")
   */
  extractPhoneNumber(phoneOrChatId) {
    // Remove all non-numeric characters
    let cleaned = phoneOrChatId.replace(/\D/g, '');
    
    // Remove country code if present
    if (cleaned.startsWith('91') && cleaned.length > 10) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('1') && cleaned.length > 10) {
      cleaned = cleaned.substring(1);
    }
    
    return cleaned;
  }

  /**
   * Check if WhatsApp is configured
   */
  isConfigured() {
    if (this.provider === 'whatsapp-web') {
      return whatsappWebService.isConfigured();
    }
    return this.provider !== null;
  }

  /**
   * Get current provider info
   */
  getProviderInfo() {
    if (this.provider === 'whatsapp-web') {
      return whatsappWebService.getProviderInfo();
    }
    
    return {
      provider: this.provider,
      configured: this.isConfigured(),
      details: this.provider === 'twilio' 
        ? `Twilio (${this.twilioWhatsAppNumber})`
        : this.provider === 'greenapi'
        ? `Green API (Instance: ${this.greenApiInstanceId})`
        : 'Not configured'
    };
  }

  /**
   * Initialize WhatsApp Web service
   */
  async initializeWhatsAppWeb() {
    if (this.provider === 'whatsapp-web') {
      await whatsappWebService.initialize();
    }
  }
}

module.exports = new WhatsAppService();
