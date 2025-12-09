const whatsappService = require('./whatsappService');
const db = require('./database');

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
        return await whatsappService.sendBookingMenu(senderData.chatId, farmer.name);
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
      
      // Default: show menu
      return await whatsappService.sendBookingMenu(senderData.chatId, farmer.name);

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
}

module.exports = new WhatsAppMessageHandler();
