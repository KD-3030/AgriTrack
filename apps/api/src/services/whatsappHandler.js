const whatsappService = require('./whatsappService');
const db = require('./database');

// Authorized test users for demo
const AUTHORIZED_USERS = [
  '9674063935', // Primary test user
  '919674063935'
];

class WhatsAppMessageHandler {
  /**
   * Parse incoming message and route to appropriate handler
   */
  async handleIncomingMessage(messageData) {
    try {
      const { senderData, messageData: msgContent } = messageData;
      const phone = whatsappService.extractPhoneNumber(senderData.chatId);
      const message = msgContent.textMessageData?.textMessage || '';
      const messageUpper = message.toUpperCase().trim();

      console.log(`📱 WhatsApp message from ${phone}: ${message}`);

      // Check if farmer exists, if not suggest registration
      const farmer = await this.findOrCreateFarmer(phone, senderData.sender);

      // Route based on message content
      if (messageUpper === 'HELP' || messageUpper === 'START' || messageUpper === 'HI' || messageUpper === 'HELLO') {
        return await this.sendEnhancedMenu(senderData.chatId, farmer.name);
      }
      
      if (messageUpper === 'LIST' || messageUpper === 'MACHINES') {
        return await this.handleListMachines(senderData.chatId);
      }
      
      if (messageUpper === 'MY BOOKINGS' || messageUpper === 'BOOKINGS') {
        return await this.handleMyBookings(senderData.chatId, farmer.id);
      }
      
      if (messageUpper.startsWith('BOOK')) {
        return await this.handleBookingRequest(senderData.chatId, message, farmer);
      }
      
      // NEW: Status update command
      if (messageUpper === 'STATUS' || messageUpper.startsWith('STATUS ')) {
        return await this.handleStatusCommand(senderData.chatId, message, farmer);
      }
      
      // NEW: Feedback command
      if (messageUpper === 'FEEDBACK' || messageUpper.startsWith('FEEDBACK ')) {
        return await this.handleFeedbackCommand(senderData.chatId, message, farmer);
      }
      
      // NEW: Receipt command
      if (messageUpper === 'RECEIPT' || messageUpper.startsWith('RECEIPT ')) {
        return await this.handleReceiptCommand(senderData.chatId, message, farmer);
      }
      
      // NEW: Track machine command
      if (messageUpper === 'TRACK' || messageUpper.startsWith('TRACK ')) {
        return await this.handleTrackCommand(senderData.chatId, message);
      }
      
      // NEW: Cancel booking command
      if (messageUpper.startsWith('CANCEL ')) {
        return await this.handleCancelCommand(senderData.chatId, message, farmer);
      }
      
      // Default: show menu
      return await this.sendEnhancedMenu(senderData.chatId, farmer.name);

    } catch (error) {
      console.error('Error handling WhatsApp message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Find or create farmer from WhatsApp data
   */
  async findOrCreateFarmer(phone, senderName) {
    try {
      // Try to find existing farmer by phone
      if (db.isConfigured()) {
        const supabase = db.getClient();
        const { data: existingFarmers } = await supabase
          .from('farmers')
          .select('*')
          .eq('phone', phone)
          .limit(1);

        if (existingFarmers && existingFarmers.length > 0) {
          return existingFarmers[0];
        }

        // Create new farmer
        const { data: newFarmer, error } = await supabase
          .from('farmers')
          .insert({
            name: senderName || `Farmer ${phone}`,
            phone: phone,
            whatsapp_phone: phone,
            registration_source: 'whatsapp',
            status: 'active'
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating farmer:', error);
          return { id: `temp_${phone}`, name: senderName || 'Farmer', phone };
        }

        return newFarmer;
      }

      // Mock mode
      return { id: `temp_${phone}`, name: senderName || 'Farmer', phone };
    } catch (error) {
      console.error('Error in findOrCreateFarmer:', error);
      return { id: `temp_${phone}`, name: senderName || 'Farmer', phone };
    }
  }

  /**
   * Handle LIST command - show available machines
   */
  async handleListMachines(chatId) {
    try {
      let machines = [];

      if (db.isConfigured()) {
        const { data, error } = await db.getMachines({ status: 'available' });
        if (!error && data) {
          machines = data;
        }
      } else {
        // Mock machines
        machines = [
          { id: 'M001', name: 'Tractor', type: 'tractor', status: 'available', rate_per_acre: 800 },
          { id: 'M002', name: 'Harvester', type: 'harvester', status: 'available', rate_per_acre: 1200 },
          { id: 'M003', name: 'Seeder', type: 'seeder', status: 'available', rate_per_acre: 600 }
        ];
      }

      return await whatsappService.sendMachinesList(chatId, machines);
    } catch (error) {
      console.error('Error listing machines:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to fetch machines list.');
    }
  }

  /**
   * Handle MY BOOKINGS command
   */
  async handleMyBookings(chatId, farmerId) {
    try {
      let bookings = [];

      if (db.isConfigured()) {
        const { data, error } = await db.getBookings({ farmer_id: farmerId });
        if (!error && data) {
          bookings = data;
        }
      }

      if (bookings.length === 0) {
        return await whatsappService.sendMessage(chatId, '📋 You have no bookings yet.\n\nType *BOOK* to create a new booking.');
      }

      let message = '📋 *Your Bookings:*\n\n';
      bookings.forEach((booking, idx) => {
        message += `${idx + 1}. *${booking.id}*\n`;
        message += `   Machine: ${booking.machine_id}\n`;
        message += `   Date: ${new Date(booking.scheduled_date).toLocaleDateString('en-IN')}\n`;
        message += `   Status: ${booking.status}\n`;
        message += `   Location: ${booking.location}\n\n`;
      });

      return await whatsappService.sendMessage(chatId, message);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to fetch your bookings.');
    }
  }

  /**
   * Handle booking request
   * Example: "Book Tractor on 15-12-2025 for 5 acres at Village Road"
   */
  async handleBookingRequest(chatId, message, farmer) {
    try {
      // Parse the booking request
      const parsed = this.parseBookingMessage(message);

      if (!parsed.success) {
        return await whatsappService.sendErrorMessage(
          chatId,
          parsed.error + '\n\nCorrect format:\n*Book [Machine] on [Date] for [Acres] acres at [Location]*\n\nExample: Book Tractor on 15-12-2025 for 5 acres at Village Road'
        );
      }

      // Find the machine
      const machine = await this.findMachine(parsed.machineName);
      if (!machine) {
        return await whatsappService.sendErrorMessage(
          chatId,
          `Machine "${parsed.machineName}" not found.\n\nType *LIST* to see available machines.`
        );
      }

      // Create the booking
      const booking = await this.createBooking({
        machine_id: machine.id,
        farmer_id: farmer.id,
        farmer_name: farmer.name,
        farmer_phone: farmer.phone,
        scheduled_date: parsed.date,
        acres: parsed.acres,
        location: parsed.location,
        notes: 'Booked via WhatsApp',
        booking_source: 'whatsapp'
      });

      if (!booking.success) {
        return await whatsappService.sendErrorMessage(chatId, booking.error || 'Failed to create booking.');
      }

      // Send confirmation
      return await whatsappService.sendBookingConfirmation(chatId, {
        ...booking.data,
        machine_name: machine.name || machine.type
      });

    } catch (error) {
      console.error('Error handling booking request:', error);
      return await whatsappService.sendErrorMessage(chatId, 'An error occurred while processing your booking.');
    }
  }

  /**
   * Parse booking message
   * Format: "Book [Machine] on [Date] for [Acres] acres at [Location]"
   */
  parseBookingMessage(message) {
    try {
      // Remove "book" prefix
      const cleanMsg = message.replace(/^book\s+/i, '').trim();

      // Regex pattern to extract components
      const pattern = /(.+?)\s+on\s+(.+?)\s+for\s+(\d+)\s+acres?\s+at\s+(.+)/i;
      const match = cleanMsg.match(pattern);

      if (!match) {
        return {
          success: false,
          error: 'Invalid booking format.'
        };
      }

      const [, machineName, dateStr, acres, location] = match;

      // Parse date (support multiple formats)
      const date = this.parseDate(dateStr);
      if (!date) {
        return {
          success: false,
          error: 'Invalid date format. Use DD-MM-YYYY or DD/MM/YYYY'
        };
      }

      return {
        success: true,
        machineName: machineName.trim(),
        date: date,
        acres: parseInt(acres),
        location: location.trim()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Could not parse booking message.'
      };
    }
  }

  /**
   * Parse date from various formats
   */
  parseDate(dateStr) {
    try {
      // Try DD-MM-YYYY or DD/MM/YYYY
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
        const year = parseInt(parts[2]);
        const date = new Date(year, month, day);
        
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }

      // Try natural language like "tomorrow", "15 Dec", etc.
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Find machine by name or type
   */
  async findMachine(machineName) {
    try {
      if (db.isConfigured()) {
        const supabase = db.getClient();
        const { data, error } = await supabase
          .from('machines')
          .select('*')
          .or(`name.ilike.%${machineName}%,type.ilike.%${machineName}%,id.eq.${machineName}`)
          .eq('status', 'available')
          .limit(1);

        if (!error && data && data.length > 0) {
          return data[0];
        }
      } else {
        // Mock machines
        const mockMachines = [
          { id: 'M001', name: 'Tractor', type: 'tractor', status: 'available' },
          { id: 'M002', name: 'Harvester', type: 'harvester', status: 'available' },
          { id: 'M003', name: 'Seeder', type: 'seeder', status: 'available' }
        ];

        return mockMachines.find(m => 
          m.name.toLowerCase().includes(machineName.toLowerCase()) ||
          m.type.toLowerCase().includes(machineName.toLowerCase()) ||
          m.id.toLowerCase() === machineName.toLowerCase()
        );
      }

      return null;
    } catch (error) {
      console.error('Error finding machine:', error);
      return null;
    }
  }

  /**
   * Create a booking
   */
  async createBooking(bookingData) {
    try {
      if (db.isConfigured()) {
        const supabase = db.getClient();

        // Check if machine is already booked for that date
        const { data: existingBookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('machine_id', bookingData.machine_id)
          .eq('scheduled_date', bookingData.scheduled_date.split('T')[0])
          .in('status', ['pending', 'confirmed']);

        if (existingBookings && existingBookings.length > 0) {
          return {
            success: false,
            error: 'Machine is already booked for this date. Please choose another date.'
          };
        }

        // Create booking
        const { data, error } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, data };
      } else {
        // Mock mode
        const mockBooking = {
          id: `BK${Date.now()}`,
          ...bookingData,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        return { success: true, data: mockBooking };
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send enhanced menu with all commands
   */
  async sendEnhancedMenu(chatId, farmerName = 'Farmer') {
    const message = `🚜 *Welcome to AgriTrack, ${farmerName}!*

*📋 Available Commands:*

🔹 *BOOK* - Book a machine
   _Example: Book Tractor on 15-12-2025 for 5 acres at Village Road_

🔹 *LIST* - See available machines

🔹 *MY BOOKINGS* - View your bookings

🔹 *RECEIPT [BookingID]* - Get booking receipt
   _Example: RECEIPT BK12345_

🔹 *STATUS* - Check machine status
   _Example: STATUS M001_

🔹 *TRACK [MachineID]* - Track machine location
   _Example: TRACK M001_

🔹 *FEEDBACK [Message]* - Share your feedback
   _Example: FEEDBACK Great service!_

🔹 *CANCEL [BookingID]* - Cancel a booking
   _Example: CANCEL BK12345_

🔹 *HELP* - Show this menu

━━━━━━━━━━━━━━━━━━━━━
🌾 *AgriTrack - Smart Farming Solutions*
━━━━━━━━━━━━━━━━━━━━━`;

    return await whatsappService.sendMessage(chatId, message);
  }

  /**
   * Handle STATUS command - Check or update machine status
   */
  async handleStatusCommand(chatId, message) {
    try {
      const parts = message.toUpperCase().replace('STATUS', '').trim().split(' ');
      const machineId = parts[0];
      
      if (!machineId) {
        // Show all machines status
        return await this.showAllMachinesStatus(chatId);
      }

      // Get specific machine status
      let machine = null;
      
      if (db.isConfigured()) {
        const supabase = db.getClient();
        const { data } = await supabase
          .from('machines')
          .select('*')
          .or(`id.eq.${machineId},name.ilike.%${machineId}%`)
          .limit(1);
        
        if (data && data.length > 0) {
          machine = data[0];
        }
      } else {
        // Mock data
        const mockMachines = [
          { id: 'M001', name: 'Tractor Alpha', type: 'tractor', status: 'active', fuel_level: 75, location: 'Field A' },
          { id: 'M002', name: 'Harvester Beta', type: 'harvester', status: 'idle', fuel_level: 60, location: 'Storage' },
          { id: 'M003', name: 'Seeder Gamma', type: 'seeder', status: 'maintenance', fuel_level: 40, location: 'Workshop' }
        ];
        machine = mockMachines.find(m => m.id === machineId || m.name.toLowerCase().includes(machineId.toLowerCase()));
      }

      if (!machine) {
        return await whatsappService.sendMessage(chatId, `❌ Machine "${machineId}" not found.\n\nType *LIST* to see available machines.`);
      }

      const statusEmoji = {
        'active': '🟢',
        'idle': '🟡',
        'maintenance': '🔴',
        'available': '🟢',
        'busy': '🟠'
      };

      const statusMsg = `🚜 *Machine Status*

*ID:* ${machine.id}
*Name:* ${machine.name || machine.type}
*Type:* ${machine.type}
*Status:* ${statusEmoji[machine.status] || '⚪'} ${machine.status?.toUpperCase()}
*Fuel Level:* ${machine.fuel_level || 'N/A'}%
*Location:* ${machine.location || 'Unknown'}
*Last Updated:* ${machine.updated_at ? new Date(machine.updated_at).toLocaleString('en-IN') : 'N/A'}

━━━━━━━━━━━━━━━━━━━━━
Type *TRACK ${machine.id}* to get live location`;

      return await whatsappService.sendMessage(chatId, statusMsg);

    } catch (error) {
      console.error('Error handling status command:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to fetch machine status.');
    }
  }

  /**
   * Show all machines status
   */
  async showAllMachinesStatus(chatId) {
    try {
      let machines = [];

      if (db.isConfigured()) {
        const { data } = await db.getMachines();
        if (data) machines = data;
      } else {
        machines = [
          { id: 'M001', name: 'Tractor Alpha', status: 'active', fuel_level: 75 },
          { id: 'M002', name: 'Harvester Beta', status: 'idle', fuel_level: 60 },
          { id: 'M003', name: 'Seeder Gamma', status: 'maintenance', fuel_level: 40 }
        ];
      }

      const statusEmoji = { 'active': '🟢', 'idle': '🟡', 'maintenance': '🔴', 'available': '🟢', 'busy': '🟠' };

      let msg = `📊 *All Machines Status*\n\n`;
      machines.forEach((m, idx) => {
        msg += `${idx + 1}. ${statusEmoji[m.status] || '⚪'} *${m.name || m.id}*\n`;
        msg += `   Status: ${m.status} | Fuel: ${m.fuel_level || 'N/A'}%\n\n`;
      });

      msg += `\nType *STATUS [MachineID]* for details`;

      return await whatsappService.sendMessage(chatId, msg);
    } catch (error) {
      console.error('Error showing all status:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to fetch machines status.');
    }
  }

  /**
   * Handle FEEDBACK command
   */
  async handleFeedbackCommand(chatId, message, farmer) {
    try {
      const feedback = message.replace(/^feedback\s*/i, '').trim();

      if (!feedback) {
        const promptMsg = `📝 *Share Your Feedback*

Please send your feedback in this format:
*FEEDBACK [Your message]*

Examples:
• FEEDBACK Great service, very helpful!
• FEEDBACK The tractor was in excellent condition
• FEEDBACK Please improve response time

Your feedback helps us serve you better! 🙏`;

        return await whatsappService.sendMessage(chatId, promptMsg);
      }

      // Store feedback
      const feedbackData = {
        farmer_id: farmer.id,
        farmer_name: farmer.name,
        farmer_phone: farmer.phone,
        message: feedback,
        source: 'whatsapp',
        created_at: new Date().toISOString()
      };

      if (db.isConfigured()) {
        const supabase = db.getClient();
        await supabase.from('feedback').insert(feedbackData);
      }

      // Log feedback
      console.log('📝 Feedback received:', feedbackData);

      const confirmMsg = `✅ *Feedback Received!*

Thank you for your valuable feedback, ${farmer.name}!

*Your Message:*
"${feedback}"

━━━━━━━━━━━━━━━━━━━━━
We appreciate your input and will use it to improve our services.

🌾 AgriTrack Team`;

      return await whatsappService.sendMessage(chatId, confirmMsg);

    } catch (error) {
      console.error('Error handling feedback:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to submit feedback. Please try again.');
    }
  }

  /**
   * Handle RECEIPT command - Get booking receipt
   */
  async handleReceiptCommand(chatId, message, farmer) {
    try {
      const bookingId = message.replace(/^receipt\s*/i, '').trim().toUpperCase();

      if (!bookingId) {
        // Show recent bookings to select from
        return await this.handleMyBookings(chatId, farmer.id);
      }

      // Find booking
      let booking = null;

      if (db.isConfigured()) {
        const supabase = db.getClient();
        const { data } = await supabase
          .from('bookings')
          .select('*, machines(*)')
          .or(`id.eq.${bookingId},id.ilike.%${bookingId}%`)
          .limit(1);

        if (data && data.length > 0) {
          booking = data[0];
        }
      } else {
        // Mock booking
        if (bookingId.startsWith('BK')) {
          booking = {
            id: bookingId,
            machine_id: 'M001',
            machine_name: 'Tractor Alpha',
            farmer_name: farmer.name,
            scheduled_date: new Date().toISOString(),
            acres: 5,
            location: 'Village Road',
            status: 'confirmed',
            amount: 4000,
            created_at: new Date().toISOString()
          };
        }
      }

      if (!booking) {
        return await whatsappService.sendMessage(chatId, `❌ Booking "${bookingId}" not found.\n\nType *MY BOOKINGS* to see your bookings.`);
      }

      // Generate receipt
      const receipt = this.generateReceipt(booking, farmer);
      return await whatsappService.sendMessage(chatId, receipt);

    } catch (error) {
      console.error('Error handling receipt command:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to generate receipt.');
    }
  }

  /**
   * Generate formatted receipt
   */
  generateReceipt(booking, farmer) {
    const machineName = booking.machines?.name || booking.machine_name || booking.machine_id;
    const rate = booking.rate_per_acre || 800;
    const amount = booking.amount || (booking.acres * rate);

    return `
╔═══════════════════════════════╗
║    🧾 *BOOKING RECEIPT*       ║
╠═══════════════════════════════╣
║                               ║
║  *Receipt No:* ${booking.id}
║  *Date:* ${new Date(booking.created_at).toLocaleDateString('en-IN')}
║                               ║
╠═══════════════════════════════╣
║  *FARMER DETAILS*             ║
╠═══════════════════════════════╣
║  Name: ${farmer.name}
║  Phone: ${farmer.phone}
║                               ║
╠═══════════════════════════════╣
║  *BOOKING DETAILS*            ║
╠═══════════════════════════════╣
║  Machine: ${machineName}
║  Date: ${new Date(booking.scheduled_date).toLocaleDateString('en-IN')}
║  Location: ${booking.location}
║  Land Area: ${booking.acres} acres
║                               ║
╠═══════════════════════════════╣
║  *PAYMENT SUMMARY*            ║
╠═══════════════════════════════╣
║  Rate: ₹${rate}/acre
║  Acres: ${booking.acres}
║  ─────────────────────────────
║  *Total: ₹${amount}*
║                               ║
╠═══════════════════════════════╣
║  Status: ✅ ${booking.status?.toUpperCase()}
╚═══════════════════════════════╝

🌾 *Thank you for choosing AgriTrack!*
📞 Support: 1800-XXX-XXXX
🌐 www.agritrack.com
`;
  }

  /**
   * Handle TRACK command - Track machine location
   */
  async handleTrackCommand(chatId, message) {
    try {
      const machineId = message.replace(/^track\s*/i, '').trim().toUpperCase();

      if (!machineId) {
        return await whatsappService.sendMessage(chatId, `📍 *Track Machine*\n\nUsage: *TRACK [MachineID]*\n\nExample: TRACK M001\n\nType *LIST* to see available machines.`);
      }

      // Get machine with location
      let machine = null;
      
      if (db.isConfigured()) {
        const supabase = db.getClient();
        const { data } = await supabase
          .from('machines')
          .select('*')
          .or(`id.eq.${machineId},name.ilike.%${machineId}%`)
          .limit(1);
        
        if (data && data.length > 0) {
          machine = data[0];
        }
      } else {
        // Mock with location
        const mockMachines = [
          { id: 'M001', name: 'Tractor Alpha', status: 'active', latitude: 28.6139, longitude: 77.2090, location: 'Field A, Sector 5' },
          { id: 'M002', name: 'Harvester Beta', status: 'idle', latitude: 28.6200, longitude: 77.2150, location: 'Storage Area' },
        ];
        machine = mockMachines.find(m => m.id === machineId);
      }

      if (!machine) {
        return await whatsappService.sendMessage(chatId, `❌ Machine "${machineId}" not found.`);
      }

      const lat = machine.latitude || 28.6139;
      const lng = machine.longitude || 77.2090;
      const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

      const trackMsg = `📍 *Machine Location*

*Machine:* ${machine.name || machine.id}
*Status:* ${machine.status}
*Location:* ${machine.location || 'In Field'}

*Coordinates:*
📍 Lat: ${lat}
📍 Lng: ${lng}

🗺️ *View on Google Maps:*
${mapsUrl}

━━━━━━━━━━━━━━━━━━━━━
Last updated: ${new Date().toLocaleString('en-IN')}`;

      return await whatsappService.sendMessage(chatId, trackMsg);

    } catch (error) {
      console.error('Error tracking machine:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to track machine.');
    }
  }

  /**
   * Handle CANCEL command
   */
  async handleCancelCommand(chatId, message, farmer) {
    try {
      const bookingId = message.replace(/^cancel\s*/i, '').trim().toUpperCase();

      if (!bookingId) {
        return await whatsappService.sendMessage(chatId, `❌ *Cancel Booking*\n\nUsage: *CANCEL [BookingID]*\n\nExample: CANCEL BK12345\n\nType *MY BOOKINGS* to see your booking IDs.`);
      }

      if (db.isConfigured()) {
        const supabase = db.getClient();
        
        // Find and update booking
        const { data: booking, error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('id', bookingId)
          .eq('farmer_id', farmer.id)
          .select()
          .single();

        if (error || !booking) {
          return await whatsappService.sendMessage(chatId, `❌ Booking "${bookingId}" not found or you don't have permission to cancel it.`);
        }

        return await whatsappService.sendMessage(chatId, `✅ *Booking Cancelled*\n\n*Booking ID:* ${bookingId}\n*Status:* CANCELLED\n\nIf you need to rebook, type *BOOK*.`);
      } else {
        // Mock cancel
        return await whatsappService.sendMessage(chatId, `✅ *Booking Cancelled*\n\n*Booking ID:* ${bookingId}\n*Status:* CANCELLED\n\n_(Demo mode)_`);
      }

    } catch (error) {
      console.error('Error cancelling booking:', error);
      return await whatsappService.sendErrorMessage(chatId, 'Unable to cancel booking.');
    }
  }
}

module.exports = new WhatsAppMessageHandler();
