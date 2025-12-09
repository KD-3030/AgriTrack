/**
 * SMS Booking Service
 * Handles all logic for SMS-based machinery booking via Twilio
 * 
 * Commands supported:
 * - BOOK DD-MM or BOOK DD-MM-YYYY
 * - STATUS
 * - CANCEL [OTP]
 * - HELP
 * - YES/NO for confirmations
 * - 4-digit OTP for verification
 */

const twilio = require('twilio');

class SMSBookingService {
  constructor() {
    this.supabase = null;
    this.twilioClient = null;
    this.twilioPhone = null;
    
    // Command patterns (case-insensitive)
    this.commands = {
      BOOK: /^BOOK\s+(\d{1,2})[-\/](\d{1,2})(?:[-\/](\d{2,4}))?$/i,
      STATUS: /^STATUS$/i,
      CANCEL: /^CANCEL(?:\s+(\d{4}))?$/i,
      COMPLETE: /^(COMPLETE|DONE|FINISHED|पूर्ण|ਮੁਕੰਮਲ|সম্পন্ন)(?:\s+(\d{4}))?$/i,
      RECEIPT: /^(RECEIPT|SLIP|BILL|RASEED|रसीद|ਰਸੀਦ|রশিদ|PAYMENT)$/i,
      HELP: /^(HELP|MADAD|मदद|ਮਦਦ|सहायता)$/i,
      CONFIRM: /^(YES|Y|CONFIRM|OK|HA|हां|ਹਾਂ|1)$/i,
      REJECT: /^(NO|N|NAHI|NA|नहीं|ਨਹੀਂ|0)$/i,
      OTP: /^(\d{4})$/
    };
    
    // Response templates (multi-language support)
    this.responses = {
      NOT_REGISTERED: 'You are not registered. Please visit your local CHC office or register at AgriTrack.in',
      INVALID_COMMAND: 'Invalid code. Send:\nBOOK DD-MM - Reserve machine\nSTATUS - Check booking\nCANCEL - Cancel booking\nCOMPLETE - Mark work done\nRECEIPT - Get payment slip\nHELP - Get help',
      HELP: 'AgriTrack SMS Booking:\n1. BOOK 25-12 - Book for Dec 25\n2. STATUS - Check your booking\n3. CANCEL - Cancel booking\n4. COMPLETE - Mark work finished\n5. RECEIPT - Get payment slip\n\nCall 1800-XXX-XXXX for help',
      
      // Booking responses
      BOOKING_CONFIRMED: (date, machine, otp) => 
        `✅ Booking Confirmed!\nDate: ${date}\nMachine: ${machine}\nOTP: ${otp}\n\nShow OTP to operator on arrival.`,
      BOOKING_UNAVAILABLE: (date, altDate) => 
        `❌ ${date} is full.\n✅ Book for ${altDate} for Priority Access.\n\nReply YES to confirm or NO to cancel.`,
      BOOKING_NO_MACHINES: 'Sorry, no machines available in your area. Please contact CHC.',
      BOOKING_INVALID_DATE: 'Invalid date. Use format: BOOK DD-MM (e.g., BOOK 25-12)',
      BOOKING_DATE_PAST: 'Cannot book for past dates. Please choose a future date.',
      BOOKING_DATE_FAR: 'Cannot book more than 60 days ahead. Please choose an earlier date.',
      
      // Status responses
      STATUS_ACTIVE: (date, machine, status) => 
        `Your booking:\n📅 Date: ${date}\n🚜 Machine: ${machine}\n📊 Status: ${status}`,
      STATUS_NONE: 'No active bookings found. Send BOOK DD-MM to reserve a machine.',
      
      // Cancel responses
      CANCEL_SUCCESS: (date) => `Booking for ${date} has been cancelled.`,
      CANCEL_NONE: 'No active booking to cancel.',
      CANCEL_CONFIRM: (date) => `Cancel booking for ${date}? Reply YES to confirm.`,
      
      // Complete responses
      COMPLETE_SUCCESS: (date, acres) => `✅ Work completed!\n📅 Date: ${date}\n🌾 Acres: ${acres}\n\nSend RECEIPT for payment slip.`,
      COMPLETE_NONE: 'No active booking to complete. Book first with BOOK DD-MM.',
      COMPLETE_CONFIRM: (date) => `Mark work for ${date} as complete? Reply YES to confirm.`,
      COMPLETE_NEED_OTP: 'Please provide OTP to confirm completion. Send: COMPLETE 1234',
      
      // Receipt/Payment slip responses
      RECEIPT_SUCCESS: (data) => `📄 *PAYMENT SLIP*\n━━━━━━━━━━━━━━━━━\n🆔 Booking: #${data.bookingId}\n🗓 Date: ${data.date}\n🚜 Machine: ${data.machine}\n🌾 Acres: ${data.acres}\n💰 Amount: ₹${data.amount}\n📊 Status: ${data.paymentStatus}\n━━━━━━━━━━━━━━━━━\n${data.paymentStatus === 'Pending' ? 'Pay at CHC office or\nUPI: agritrack@upi' : '✅ Payment received'}`,
      RECEIPT_NONE: 'No completed bookings found. Complete a booking first to get receipt.',
      RECEIPT_PENDING: 'Your booking is not yet completed. Send COMPLETE [OTP] first.',
      
      // Confirmation responses
      CONFIRM_SUCCESS: (date, machine, otp) => 
        `✅ Booking Confirmed!\nDate: ${date}\nMachine: ${machine}\nOTP: ${otp}`,
      CONFIRM_EXPIRED: 'Session expired. Please start again with BOOK DD-MM.',
      REJECT_SUCCESS: 'Booking cancelled. Send BOOK DD-MM to try another date.',
      
      // OTP verification
      OTP_VERIFIED: 'OTP verified! Operator can now start work.',
      OTP_INVALID: 'Invalid OTP. Please check and try again.',
      OTP_EXPIRED: 'OTP expired. Please contact operator.',
      
      // Errors
      ERROR_GENERIC: 'Something went wrong. Please try again or call 1800-XXX-XXXX.'
    };
    
    this.init();
  }

  init() {
    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    
    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      console.log('✅ SMS Booking Service: Twilio client initialized');
    } else {
      console.log('⚠️ SMS Booking Service: Twilio not configured');
    }
  }

  setSupabase(supabase) {
    this.supabase = supabase;
    console.log('✅ SMS Booking Service: Supabase client set');
  }

  /**
   * Main entry point - process incoming SMS
   */
  async processIncomingSMS(from, body, twilioSid = null) {
    console.log(`📱 SMS from ${from}: ${body}`);
    
    // Normalize phone number
    const phone = this.normalizePhone(from);
    
    // Parse the command
    const parsed = this.parseCommand(body);
    console.log(`📝 Parsed command: ${parsed.command}`);
    
    // Log inbound message
    await this.logMessage('inbound', phone, body, parsed.command, twilioSid);
    
    try {
      // First, check if user is registered
      const farmer = await this.findFarmerByPhone(phone);
      
      // Get or create session
      const session = await this.getOrCreateSession(phone, farmer?.id);
      
      let response;
      
      // If awaiting confirmation, check for YES/NO first
      if (session?.session_state === 'awaiting_confirmation') {
        if (parsed.command === 'CONFIRM') {
          response = await this.handleConfirmation(phone, session, true);
        } else if (parsed.command === 'REJECT') {
          response = await this.handleConfirmation(phone, session, false);
        } else {
          // Any other command cancels the pending confirmation
          await this.resetSession(session.id);
          // Continue processing the new command
        }
      }
      
      // Process command if not already handled
      if (!response) {
        switch (parsed.command) {
          case 'BOOK':
            response = await this.handleBook(phone, parsed.match, farmer, session);
            break;
          case 'STATUS':
            response = await this.handleStatus(phone, farmer);
            break;
          case 'CANCEL':
            response = await this.handleCancel(phone, parsed.match, farmer, session);
            break;
          case 'COMPLETE':
            response = await this.handleComplete(phone, parsed.match, farmer, session);
            break;
          case 'RECEIPT':
            response = await this.handleReceipt(phone, farmer);
            break;
          case 'HELP':
            response = this.responses.HELP;
            break;
          case 'OTP':
            response = await this.handleOTPVerification(phone, parsed.match[1], farmer);
            break;
          case 'CONFIRM':
          case 'REJECT':
            // If we reach here, there's no pending confirmation
            response = this.responses.INVALID_COMMAND;
            break;
          default:
            response = this.responses.INVALID_COMMAND;
        }
      }
      
      // Log and send response
      await this.logMessage('outbound', phone, response, null, null, session?.id);
      return { success: true, response };
      
    } catch (error) {
      console.error('❌ SMS Processing Error:', error);
      return { success: false, response: this.responses.ERROR_GENERIC };
    }
  }

  /**
   * Parse incoming SMS command
   */
  parseCommand(messageBody) {
    const text = messageBody.trim();
    
    for (const [command, pattern] of Object.entries(this.commands)) {
      const match = text.match(pattern);
      if (match) {
        return { command, match, raw: messageBody };
      }
    }
    
    return { command: 'INVALID', match: null, raw: messageBody };
  }

  /**
   * Handle BOOK command
   */
  async handleBook(phone, match, farmer, session) {
    // Check registration
    if (!farmer) {
      return this.responses.NOT_REGISTERED;
    }
    
    // Parse the date
    const dateResult = this.parseBookingDate(match);
    if (!dateResult.valid) {
      if (dateResult.error === 'past') return this.responses.BOOKING_DATE_PAST;
      if (dateResult.error === 'far') return this.responses.BOOKING_DATE_FAR;
      return this.responses.BOOKING_INVALID_DATE;
    }
    
    const requestedDate = dateResult.date;
    const dateStr = this.formatDate(requestedDate);
    
    // Check for existing active booking
    const existingBooking = await this.getActiveBooking(farmer.id);
    if (existingBooking) {
      const existingDate = this.formatDate(new Date(existingBooking.scheduled_date));
      return `You already have a booking for ${existingDate}. Send CANCEL first to book a new date.`;
    }
    
    // Find available machine
    const availableMachine = await this.findAvailableMachine(farmer.district, requestedDate);
    
    if (availableMachine) {
      // Machine available! Create booking
      const booking = await this.createSMSBooking(farmer, availableMachine, requestedDate, session);
      if (booking) {
        return this.responses.BOOKING_CONFIRMED(dateStr, availableMachine.name, booking.otp);
      }
      return this.responses.ERROR_GENERIC;
    } else {
      // No machine available - find next available date
      const nextAvailable = await this.findNextAvailableDate(farmer.district, requestedDate);
      
      if (nextAvailable) {
        // Update session to await confirmation
        await this.updateSession(session.id, {
          session_state: 'awaiting_confirmation',
          pending_date: nextAvailable.date,
          pending_machine_id: nextAvailable.machine.id,
          suggested_dates: [nextAvailable.date]
        });
        
        const altDateStr = this.formatDate(nextAvailable.date);
        return this.responses.BOOKING_UNAVAILABLE(dateStr, altDateStr);
      }
      
      return this.responses.BOOKING_NO_MACHINES;
    }
  }

  /**
   * Handle STATUS command
   */
  async handleStatus(phone, farmer) {
    if (!farmer) {
      return this.responses.NOT_REGISTERED;
    }
    
    const booking = await this.getActiveBooking(farmer.id);
    
    if (booking) {
      const dateStr = this.formatDate(new Date(booking.scheduled_date));
      const machineName = booking.machine?.name || 'TBD';
      const status = this.getStatusText(booking.status);
      return this.responses.STATUS_ACTIVE(dateStr, machineName, status);
    }
    
    return this.responses.STATUS_NONE;
  }

  /**
   * Handle CANCEL command
   */
  async handleCancel(phone, match, farmer, session) {
    if (!farmer) {
      return this.responses.NOT_REGISTERED;
    }
    
    const booking = await this.getActiveBooking(farmer.id);
    
    if (!booking) {
      return this.responses.CANCEL_NONE;
    }
    
    const dateStr = this.formatDate(new Date(booking.scheduled_date));
    
    // If OTP provided, verify and cancel
    if (match && match[1]) {
      const otp = match[1];
      const verified = await this.verifyBookingOTP(booking.id, otp);
      if (verified) {
        await this.cancelBooking(booking.id);
        return this.responses.CANCEL_SUCCESS(dateStr);
      }
      return 'Invalid OTP. Send CANCEL with correct OTP or just CANCEL to get confirmation.';
    }
    
    // Ask for confirmation
    await this.updateSession(session.id, {
      session_state: 'awaiting_confirmation',
      pending_date: new Date(booking.scheduled_date)
    });
    
    return this.responses.CANCEL_CONFIRM(dateStr);
  }

  /**
   * Handle COMPLETE command - mark booking as completed
   */
  async handleComplete(phone, match, farmer, session) {
    if (!farmer) {
      return this.responses.NOT_REGISTERED;
    }
    
    // Find booking that is confirmed or in_progress
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select('*, machine:machines(*)')
      .eq('farmer_id', farmer.id)
      .in('status', ['confirmed', 'in_progress'])
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .single();
    
    if (error || !booking) {
      return this.responses.COMPLETE_NONE;
    }
    
    const dateStr = this.formatDate(new Date(booking.scheduled_date));
    
    // If OTP provided, verify and complete
    if (match && match[2]) {
      const otp = match[2];
      const verified = await this.verifyBookingOTP(booking.id, otp);
      if (verified) {
        // Mark as completed
        await this.supabase
          .from('bookings')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', booking.id);
        
        // Get acres from field if available
        const { data: field } = await this.supabase
          .from('farmer_fields')
          .select('area_acres')
          .eq('farmer_id', farmer.id)
          .limit(1)
          .single();
        
        const acres = field?.area_acres || booking.acres_covered || 'N/A';
        return this.responses.COMPLETE_SUCCESS(dateStr, acres);
      }
      return this.responses.OTP_INVALID;
    }
    
    // Ask for OTP to confirm completion
    return this.responses.COMPLETE_NEED_OTP;
  }

  /**
   * Handle RECEIPT command - generate payment slip for completed bookings
   */
  async handleReceipt(phone, farmer) {
    if (!farmer) {
      return this.responses.NOT_REGISTERED;
    }
    
    // Find the most recent completed booking
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .select('*, machine:machines(*)')
      .eq('farmer_id', farmer.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !booking) {
      // Check if there's an active booking that needs completion
      const { data: activeBooking } = await this.supabase
        .from('bookings')
        .select('*')
        .eq('farmer_id', farmer.id)
        .in('status', ['confirmed', 'in_progress'])
        .limit(1)
        .single();
      
      if (activeBooking) {
        return this.responses.RECEIPT_PENDING;
      }
      return this.responses.RECEIPT_NONE;
    }
    
    // Get field data for acres
    const { data: field } = await this.supabase
      .from('farmer_fields')
      .select('area_acres')
      .eq('farmer_id', farmer.id)
      .limit(1)
      .single();
    
    const acres = field?.area_acres || booking.acres_covered || 5;
    const ratePerAcre = booking.machine?.rate_per_acre || 500;
    const amount = acres * ratePerAcre;
    
    // Check payment status from farmer_services if exists
    const { data: service } = await this.supabase
      .from('farmer_services')
      .select('payment_status')
      .eq('booking_id', booking.id)
      .limit(1)
      .single();
    
    const paymentStatus = service?.payment_status === 'paid' ? 'Paid' : 'Pending';
    
    const receiptData = {
      bookingId: booking.id.substring(0, 8).toUpperCase(),
      date: this.formatDate(new Date(booking.scheduled_date)),
      machine: booking.machine?.name || 'Happy Seeder',
      acres: acres,
      amount: amount.toLocaleString('en-IN'),
      paymentStatus: paymentStatus
    };
    
    return this.responses.RECEIPT_SUCCESS(receiptData);
  }

  /**
   * Handle YES/NO confirmation
   */
  async handleConfirmation(phone, session, confirmed) {
    if (!session || session.session_state !== 'awaiting_confirmation') {
      return this.responses.CONFIRM_EXPIRED;
    }
    
    const farmer = await this.findFarmerByPhone(phone);
    if (!farmer) return this.responses.NOT_REGISTERED;
    
    if (!confirmed) {
      await this.resetSession(session.id);
      return this.responses.REJECT_SUCCESS;
    }
    
    // Check what we were confirming
    if (session.pending_machine_id && session.pending_date) {
      // Confirming alternative date booking
      const machine = await this.getMachine(session.pending_machine_id);
      const booking = await this.createSMSBooking(farmer, machine, new Date(session.pending_date), session);
      
      if (booking) {
        await this.completeSession(session.id);
        const dateStr = this.formatDate(new Date(session.pending_date));
        return this.responses.CONFIRM_SUCCESS(dateStr, machine.name, booking.otp);
      }
      return this.responses.ERROR_GENERIC;
    }
    
    // Confirming cancellation
    const activeBooking = await this.getActiveBooking(farmer.id);
    if (activeBooking) {
      const dateStr = this.formatDate(new Date(activeBooking.scheduled_date));
      await this.cancelBooking(activeBooking.id);
      await this.completeSession(session.id);
      return this.responses.CANCEL_SUCCESS(dateStr);
    }
    
    return this.responses.ERROR_GENERIC;
  }

  /**
   * Handle OTP verification (operator side)
   */
  async handleOTPVerification(phone, otp, farmer) {
    // Check if this is an operator verifying a booking
    const { data: booking } = await this.supabase
      .from('booking_otps')
      .select('*, booking:bookings(*)')
      .eq('otp_code', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (booking) {
      await this.supabase
        .from('booking_otps')
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq('id', booking.id);
      
      await this.supabase
        .from('bookings')
        .update({ otp_verified: true, status: 'in_progress' })
        .eq('id', booking.booking_id);
      
      return this.responses.OTP_VERIFIED;
    }
    
    return this.responses.OTP_INVALID;
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  normalizePhone(phone) {
    // Remove all non-digits, keep country code
    let normalized = phone.replace(/[^\d+]/g, '');
    // Ensure +91 prefix for Indian numbers
    if (normalized.startsWith('91') && !normalized.startsWith('+')) {
      normalized = '+' + normalized;
    } else if (normalized.length === 10) {
      normalized = '+91' + normalized;
    }
    return normalized;
  }

  parseBookingDate(match) {
    if (!match) return { valid: false, error: 'invalid' };
    
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
    
    // Handle 2-digit year
    if (year < 100) year += 2000;
    
    // Create date
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    
    // Validate
    if (isNaN(date.getTime())) {
      return { valid: false, error: 'invalid' };
    }
    
    // Check if past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return { valid: false, error: 'past' };
    }
    
    // Check if too far (60 days)
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 60);
    if (date > maxDate) {
      return { valid: false, error: 'far' };
    }
    
    return { valid: true, date };
  }

  formatDate(date) {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  }

  getStatusText(status) {
    const statusMap = {
      pending: '⏳ Pending',
      confirmed: '✅ Confirmed',
      in_progress: '🚜 In Progress',
      completed: '✔️ Completed',
      cancelled: '❌ Cancelled'
    };
    return statusMap[status] || status;
  }

  // =====================================================
  // DATABASE OPERATIONS
  // =====================================================

  async findFarmerByPhone(phone) {
    if (!this.supabase) return null;
    
    // Normalize phone for search - try multiple formats
    const searchPhone = phone.replace('+91', '').replace('+', '');
    const fullPhone = phone.startsWith('+') ? phone : `+91${phone}`;
    
    console.log(`🔍 Looking for farmer with phone: ${phone}, normalized: ${searchPhone}, full: ${fullPhone}`);
    
    // Try exact match first with full phone number (don't use .single() to avoid error when no rows)
    let { data, error } = await this.supabase
      .from('farmer_profiles')
      .select('*')
      .or(`phone.eq.${fullPhone},phone.eq.${searchPhone},phone.ilike.%${searchPhone},alternate_phone.ilike.%${searchPhone}`)
      .limit(1);
    
    if (error) {
      console.log(`⚠️ Farmer lookup error:`, error.message);
      return null;
    }
    
    // Get first result from array
    const farmer = data && data.length > 0 ? data[0] : null;
    
    console.log(`🔍 Farmer lookup result:`, farmer ? `Found: ${farmer.full_name}` : 'Not found');
    
    return farmer;
  }

  async getOrCreateSession(phone, farmerId = null) {
    if (!this.supabase) return null;
    
    // Look for active session
    const { data: existing } = await this.supabase
      .from('sms_booking_sessions')
      .select('*')
      .eq('phone_number', phone)
      .not('session_state', 'in', '("completed","expired")')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (existing) {
      // Refresh expiry
      await this.supabase
        .from('sms_booking_sessions')
        .update({ 
          last_activity_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        })
        .eq('id', existing.id);
      return existing;
    }
    
    // Create new session
    const { data: newSession } = await this.supabase
      .from('sms_booking_sessions')
      .insert({
        phone_number: phone,
        farmer_id: farmerId,
        session_state: 'idle'
      })
      .select()
      .single();
    
    return newSession;
  }

  async updateSession(sessionId, updates) {
    if (!this.supabase || !sessionId) return;
    
    await this.supabase
      .from('sms_booking_sessions')
      .update({
        ...updates,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', sessionId);
  }

  async resetSession(sessionId) {
    await this.updateSession(sessionId, {
      session_state: 'idle',
      pending_date: null,
      pending_machine_id: null,
      suggested_dates: null
    });
  }

  async completeSession(sessionId) {
    await this.updateSession(sessionId, { session_state: 'completed' });
  }

  async logMessage(direction, phone, body, command = null, twilioSid = null, sessionId = null) {
    if (!this.supabase) return;
    
    try {
      await this.supabase
        .from('sms_booking_logs')
        .insert({
          direction,
          phone_number: phone,
          message_body: body,
          parsed_command: command,
          twilio_sid: twilioSid,
          session_id: sessionId
        });
    } catch (err) {
      console.error('Failed to log SMS:', err.message);
    }
  }

  async getActiveBooking(farmerId) {
    if (!this.supabase || !farmerId) return null;
    
    const { data } = await this.supabase
      .from('bookings')
      .select('*, machine:machines(*)')
      .eq('farmer_id', farmerId)
      .in('status', ['pending', 'confirmed'])
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .limit(1)
      .single();
    
    return data;
  }

  async findAvailableMachine(district, date) {
    if (!this.supabase) return null;
    
    const dateStr = date.toISOString().split('T')[0];
    
    // Find machines in district that are not booked on this date
    const { data: machines } = await this.supabase
      .from('machines')
      .select('*')
      .eq('district', district)
      .eq('status', 'available');
    
    if (!machines || machines.length === 0) return null;
    
    // Check which ones are not booked
    for (const machine of machines) {
      const { data: booking } = await this.supabase
        .from('bookings')
        .select('id')
        .eq('machine_id', machine.id)
        .eq('scheduled_date', dateStr)
        .in('status', ['pending', 'confirmed', 'in_progress'])
        .limit(1)
        .single();
      
      if (!booking) {
        return machine; // This machine is available
      }
    }
    
    return null;
  }

  async findNextAvailableDate(district, startDate) {
    if (!this.supabase) return null;
    
    // Check next 14 days
    for (let i = 1; i <= 14; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      
      const machine = await this.findAvailableMachine(district, checkDate);
      if (machine) {
        return { date: checkDate, machine };
      }
    }
    
    return null;
  }

  async getMachine(machineId) {
    if (!this.supabase) return null;
    
    const { data } = await this.supabase
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();
    
    return data;
  }

  async createSMSBooking(farmer, machine, date, session) {
    if (!this.supabase) return null;
    
    const dateStr = date.toISOString().split('T')[0];
    
    // Generate OTP
    const otp = this.generateOTP();
    
    // Create booking
    const { data: booking, error } = await this.supabase
      .from('bookings')
      .insert({
        farmer_id: farmer.id,
        machine_id: machine.id,
        scheduled_date: dateStr,
        status: 'confirmed',
        booking_source: 'sms',
        sms_session_id: session?.id
      })
      .select()
      .single();
    
    if (error) {
      console.error('Failed to create booking:', error);
      return null;
    }
    
    // Create OTP record
    await this.supabase
      .from('booking_otps')
      .insert({
        booking_id: booking.id,
        otp_code: otp
      });
    
    return { ...booking, otp };
  }

  async cancelBooking(bookingId) {
    if (!this.supabase) return false;
    
    const { error } = await this.supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);
    
    return !error;
  }

  async verifyBookingOTP(bookingId, otp) {
    if (!this.supabase) return false;
    
    const { data } = await this.supabase
      .from('booking_otps')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('otp_code', otp)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    return !!data;
  }

  generateOTP() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to, body) {
    if (!this.twilioClient) {
      console.log(`📱 [MOCK SMS] To: ${to}\n${body}`);
      return { success: true, mock: true };
    }
    
    try {
      const message = await this.twilioClient.messages.create({
        body,
        from: this.twilioPhone,
        to
      });
      
      console.log(`📱 SMS sent: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (error) {
      console.error('❌ Failed to send SMS:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new SMSBookingService();
