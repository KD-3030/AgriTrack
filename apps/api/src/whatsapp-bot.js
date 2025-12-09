/**
 * WhatsApp Web Bot for AgriTrack
 * Uses whatsapp-web.js to run a WhatsApp bot using your own account
 * 
 * How it works:
 * 1. Run this script
 * 2. Scan the QR code with your WhatsApp (Settings → Linked Devices → Link a Device)
 * 3. The bot will respond to incoming messages with booking commands
 * 
 * Commands:
 * - HELP: Get list of commands
 * - BOOK DD-MM: Book a machine for a specific date
 * - STATUS: Check booking status
 * - CANCEL: Cancel booking
 */

const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');

// Load .env from project root (3 levels up from src/)
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ WhatsApp Bot: Supabase initialized');
} else {
  console.log('⚠️ WhatsApp Bot: Supabase not configured - check SUPABASE_URL and SUPABASE_SERVICE_KEY');
}

// Import the SMS booking service (reusing the same logic)
let smsBookingService;
try {
  smsBookingService = require('./services/smsBooking');
  // Set Supabase for the SMS booking service
  if (supabase && smsBookingService && smsBookingService.setSupabase) {
    smsBookingService.setSupabase(supabase);
    console.log('✅ WhatsApp Bot: SMS Booking Service connected to Supabase');
  }
} catch (e) {
  // Fallback for standalone testing
  console.log('⚠️ WhatsApp Bot: SMS Booking Service not available:', e.message);
  smsBookingService = null;
}

// Create WhatsApp client with local authentication (persists session)
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: '.wwebjs_auth'
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

// Store for tracking conversations (simple in-memory)
const conversations = new Map();

// ═══════════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════

// QR Code for linking
client.on('qr', (qr) => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           🌾 AGRITRACK WHATSAPP BOT 🌾                       ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Scan this QR code with WhatsApp:                            ║');
  console.log('║  WhatsApp → Settings → Linked Devices → Link a Device        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
  qrcode.generate(qr, { small: true });
  console.log('\n');
});

// Ready event
client.on('ready', () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ WHATSAPP BOT IS READY!                                   ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  The bot is now listening for messages.                      ║');
  console.log('║  Send "HELP" to this WhatsApp number to test.                ║');
  console.log('║                                                              ║');
  console.log('║  Commands:                                                   ║');
  console.log('║  • HELP       - Get help menu                                ║');
  console.log('║  • BOOK 15-12 - Book machine for Dec 15                      ║');
  console.log('║  • STATUS     - Check your booking                           ║');
  console.log('║  • CANCEL     - Cancel your booking                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n');
});

// Authentication success
client.on('authenticated', () => {
  console.log('🔐 WhatsApp authenticated successfully!');
});

// Authentication failure
client.on('auth_failure', (msg) => {
  console.error('❌ WhatsApp authentication failed:', msg);
});

// Disconnected
client.on('disconnected', (reason) => {
  console.log('📴 WhatsApp disconnected:', reason);
  console.log('🔄 Attempting to reconnect...');
  client.initialize();
});

// ═══════════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ═══════════════════════════════════════════════════════════════════

client.on('message', async (message) => {
  // Ignore group messages (only handle private chats)
  if (message.from.includes('@g.us')) {
    return;
  }
  
  // Ignore status updates
  if (message.from === 'status@broadcast') {
    return;
  }

  const phoneNumber = message.from.replace('@c.us', '');
  const messageText = message.body.trim();
  
  console.log('\n💬 ═══════════════════════════════════════');
  console.log('💬 INCOMING WHATSAPP MESSAGE');
  console.log('💬 ═══════════════════════════════════════');
  console.log(`📱 From: +${phoneNumber}`);
  console.log(`📱 Message: ${messageText}`);
  
  try {
    let response;
    
    // If SMS booking service is available, use it
    if (smsBookingService) {
      const result = await smsBookingService.processIncomingSMS(
        `+${phoneNumber}`,
        messageText,
        message.id._serialized
      );
      response = result.response;
    } else {
      // Fallback: Simple command handler for standalone testing
      response = handleCommand(messageText, phoneNumber);
    }
    
    console.log(`✅ Response: ${response.substring(0, 50)}...`);
    console.log('💬 ═══════════════════════════════════════\n');
    
    // Send reply
    await message.reply(response);
    
  } catch (error) {
    console.error('❌ Error processing message:', error);
    await message.reply('Sorry, something went wrong. Please try again or call 1800-XXX-XXXX.');
  }
});

// ═══════════════════════════════════════════════════════════════════
// FALLBACK COMMAND HANDLER (for standalone testing)
// ═══════════════════════════════════════════════════════════════════

// Hardcoded demo data for testing
const DEMO_MACHINES = [
  { id: 'M001', name: 'Tractor Alpha', type: 'Tractor', status: 'available', rate: 800, fuel: 85, location: 'Field A, Sector 5' },
  { id: 'M002', name: 'Harvester Beta', type: 'Harvester', status: 'active', rate: 1200, fuel: 72, location: 'Farm B, Village Road' },
  { id: 'M003', name: 'Seeder Gamma', type: 'Seeder', status: 'available', rate: 600, fuel: 90, location: 'Storage Yard' },
  { id: 'M004', name: 'Rotavator Delta', type: 'Rotavator', status: 'maintenance', rate: 700, fuel: 45, location: 'Workshop' },
  { id: 'M005', name: 'Tractor Omega', type: 'Tractor', status: 'available', rate: 850, fuel: 68, location: 'Field C, Main Road' }
];

const DEMO_BOOKINGS = {
  'BK2024001': { id: 'BK2024001', machine: 'Tractor Alpha', date: '15-12-2025', acres: 5, location: 'Village Road', status: 'confirmed', amount: 4000, paid: true },
  'BK2024002': { id: 'BK2024002', machine: 'Harvester Beta', date: '18-12-2025', acres: 8, location: 'Main Field', status: 'pending', amount: 9600, paid: false },
  'BK2024003': { id: 'BK2024003', machine: 'Seeder Gamma', date: '20-12-2025', acres: 3, location: 'Farm Plot 7', status: 'confirmed', amount: 1800, paid: true }
};

// Track user state for multi-step interactions
const userStates = new Map();

function handleCommand(messageText, phoneNumber) {
  const text = messageText.toUpperCase().trim();
  const originalText = messageText.trim();
  
  // Get or initialize user state
  let state = userStates.get(phoneNumber) || { step: null, data: {} };

  // ═══════════════════════════════════════════════════════════════════
  // HELP / START / HI / HELLO
  // ═══════════════════════════════════════════════════════════════════
  if (text === 'HELP' || text === 'HI' || text === 'HELLO' || text === 'START' || text === 'MENU') {
    userStates.delete(phoneNumber); // Reset state
    return `🌾 *Welcome to AgriTrack!* 🌾

*📋 Available Commands:*

🔹 *LIST* - View available machines
🔹 *BOOK [date]* - Book a machine
   _Example: BOOK 15-12-2025_

🔹 *MY BOOKINGS* - View your bookings
🔹 *STATUS [ID]* - Check machine status
   _Example: STATUS M001_

🔹 *TRACK [ID]* - Track machine location
   _Example: TRACK M001_

🔹 *RECEIPT [ID]* - Get booking receipt
   _Example: RECEIPT BK2024001_

🔹 *PAYMENT [ID]* - Get payment details
   _Example: PAYMENT BK2024001_

🔹 *FEEDBACK [msg]* - Share feedback
🔹 *CANCEL [ID]* - Cancel booking
🔹 *HELP* - Show this menu

━━━━━━━━━━━━━━━━━━━━━
📞 Helpline: 1800-123-4567
🌐 Website: www.agritrack.in`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // LIST - Show available machines
  // ═══════════════════════════════════════════════════════════════════
  if (text === 'LIST' || text === 'MACHINES' || text === 'AVAILABLE') {
    const statusEmoji = { 'available': '🟢', 'active': '🟠', 'maintenance': '🔴' };
    let machineList = `📋 *Available Machines*\n\n`;
    
    DEMO_MACHINES.forEach((m, idx) => {
      machineList += `${idx + 1}. ${statusEmoji[m.status] || '⚪'} *${m.name}*\n`;
      machineList += `   Type: ${m.type}\n`;
      machineList += `   Rate: ₹${m.rate}/acre\n`;
      machineList += `   Status: ${m.status.toUpperCase()}\n\n`;
    });
    
    machineList += `━━━━━━━━━━━━━━━━━━━━━\n`;
    machineList += `To book, send: *BOOK 15-12-2025*`;
    return machineList;
  }

  // ═══════════════════════════════════════════════════════════════════
  // BOOK - Book a machine
  // ═══════════════════════════════════════════════════════════════════
  const bookMatch = text.match(/^BOOK\s*(\d{1,2}[-\/]\d{1,2}(?:[-\/]\d{2,4})?)?$/);
  if (bookMatch || text === 'BOOK') {
    const dateStr = bookMatch ? bookMatch[1] : null;
    
    if (!dateStr) {
      return `📅 *Book a Machine*

Please provide the date:
*BOOK DD-MM-YYYY*

Example: *BOOK 15-12-2025*

Available machines:
• Tractor Alpha - ₹800/acre
• Harvester Beta - ₹1200/acre
• Seeder Gamma - ₹600/acre`;
    }
    
    // Parse date and create booking
    const bookingId = `BK${Date.now().toString().slice(-6)}`;
    return `✅ *Booking Confirmed!*

╔═══════════════════════════════╗
║    🎉 BOOKING SUCCESSFUL      ║
╠═══════════════════════════════╣
║                               
║  *Booking ID:* ${bookingId}
║  *Date:* ${dateStr}
║  *Machine:* Tractor Alpha
║  *Rate:* ₹800/acre
║                               
║  *Operator:* Ramesh Kumar
║  *Contact:* +91 98765 43210
║                               
╠═══════════════════════════════╣
║  *OTP:* 4521                  
║  Share this OTP with operator 
╚═══════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━
Reply *RECEIPT ${bookingId}* for receipt
Reply *PAYMENT ${bookingId}* for payment`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // MY BOOKINGS - Show user's bookings
  // ═══════════════════════════════════════════════════════════════════
  if (text === 'MY BOOKINGS' || text === 'BOOKINGS' || text === 'MY BOOKING') {
    let bookingsList = `📋 *Your Bookings*\n\n`;
    
    Object.values(DEMO_BOOKINGS).forEach((b, idx) => {
      const statusEmoji = b.status === 'confirmed' ? '✅' : '⏳';
      const paidEmoji = b.paid ? '💰' : '⏳';
      bookingsList += `${idx + 1}. ${statusEmoji} *${b.id}*\n`;
      bookingsList += `   Machine: ${b.machine}\n`;
      bookingsList += `   Date: ${b.date}\n`;
      bookingsList += `   Amount: ₹${b.amount} ${paidEmoji}\n`;
      bookingsList += `   Status: ${b.status.toUpperCase()}\n\n`;
    });
    
    bookingsList += `━━━━━━━━━━━━━━━━━━━━━\n`;
    bookingsList += `Reply *RECEIPT [ID]* for receipt\n`;
    bookingsList += `Reply *PAYMENT [ID]* for payment`;
    return bookingsList;
  }

  // ═══════════════════════════════════════════════════════════════════
  // STATUS - Check machine status
  // ═══════════════════════════════════════════════════════════════════
  const statusMatch = text.match(/^STATUS\s*(.*)$/);
  if (statusMatch || text === 'STATUS') {
    const machineId = statusMatch ? statusMatch[1].trim() : '';
    
    if (!machineId) {
      // Show all machines status
      const statusEmoji = { 'available': '🟢', 'active': '🟠', 'maintenance': '🔴' };
      let statusList = `📊 *All Machines Status*\n\n`;
      
      DEMO_MACHINES.forEach((m, idx) => {
        statusList += `${idx + 1}. ${statusEmoji[m.status]} *${m.name}* (${m.id})\n`;
        statusList += `   Status: ${m.status} | Fuel: ${m.fuel}%\n\n`;
      });
      
      statusList += `━━━━━━━━━━━━━━━━━━━━━\n`;
      statusList += `Reply *STATUS M001* for details`;
      return statusList;
    }
    
    // Find specific machine
    const machine = DEMO_MACHINES.find(m => m.id.toUpperCase() === machineId.toUpperCase() || m.name.toUpperCase().includes(machineId.toUpperCase()));
    
    if (!machine) {
      return `❌ Machine "${machineId}" not found.\n\nReply *LIST* to see available machines.`;
    }
    
    const statusEmoji = { 'available': '🟢', 'active': '🟠', 'maintenance': '🔴' };
    return `🚜 *Machine Status*

╔═══════════════════════════════╗
║  *${machine.name}*
╠═══════════════════════════════╣
║  
║  *ID:* ${machine.id}
║  *Type:* ${machine.type}
║  *Status:* ${statusEmoji[machine.status]} ${machine.status.toUpperCase()}
║  *Fuel Level:* ${machine.fuel}%
║  *Rate:* ₹${machine.rate}/acre
║  *Location:* ${machine.location}
║  
║  *Last Updated:* ${new Date().toLocaleString('en-IN')}
╚═══════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━
Reply *TRACK ${machine.id}* for live location
Reply *BOOK 15-12-2025* to book`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TRACK - Track machine location
  // ═══════════════════════════════════════════════════════════════════
  const trackMatch = text.match(/^TRACK\s+(.+)$/);
  if (trackMatch) {
    const machineId = trackMatch[1].trim();
    const machine = DEMO_MACHINES.find(m => m.id.toUpperCase() === machineId.toUpperCase());
    
    if (!machine) {
      return `❌ Machine "${machineId}" not found.\n\nReply *LIST* to see available machines.`;
    }
    
    // Demo coordinates (Delhi area)
    const lat = 28.6139 + (Math.random() * 0.1);
    const lng = 77.2090 + (Math.random() * 0.1);
    const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    return `📍 *Machine Location*

╔═══════════════════════════════╗
║  *${machine.name}*
╠═══════════════════════════════╣
║  
║  *Status:* ${machine.status.toUpperCase()}
║  *Location:* ${machine.location}
║  
║  *Coordinates:*
║  📍 Lat: ${lat.toFixed(6)}
║  📍 Lng: ${lng.toFixed(6)}
║  
║  *Speed:* ${Math.floor(Math.random() * 15 + 5)} km/h
║  *Heading:* ${['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)]}
╚═══════════════════════════════╝

🗺️ *View on Google Maps:*
${mapsUrl}

━━━━━━━━━━━━━━━━━━━━━
Last updated: ${new Date().toLocaleString('en-IN')}`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // RECEIPT - Get booking receipt
  // ═══════════════════════════════════════════════════════════════════
  const receiptMatch = text.match(/^RECEIPT\s+(.+)$/);
  if (receiptMatch || text === 'RECEIPT') {
    const bookingId = receiptMatch ? receiptMatch[1].trim().toUpperCase() : '';
    
    if (!bookingId) {
      return `🧾 *Get Booking Receipt*

Please provide booking ID:
*RECEIPT [BookingID]*

Example: *RECEIPT BK2024001*

Reply *MY BOOKINGS* to see your booking IDs.`;
    }
    
    const booking = DEMO_BOOKINGS[bookingId] || DEMO_BOOKINGS['BK2024001'];
    const receiptDate = new Date().toLocaleDateString('en-IN');
    
    return `
╔═══════════════════════════════════════╗
║         🧾 *BOOKING RECEIPT*          ║
╠═══════════════════════════════════════╣
║                                       ║
║  *Receipt No:* ${booking.id}
║  *Date:* ${receiptDate}
║                                       ║
╠═══════════════════════════════════════╣
║  *FARMER DETAILS*                     ║
╠═══════════════════════════════════════╣
║  Name: Demo Farmer
║  Phone: +91 ${phoneNumber}
║  Village: Sample Village
║                                       ║
╠═══════════════════════════════════════╣
║  *BOOKING DETAILS*                    ║
╠═══════════════════════════════════════╣
║  Machine: ${booking.machine}
║  Booking Date: ${booking.date}
║  Location: ${booking.location}
║  Land Area: ${booking.acres} acres
║                                       ║
╠═══════════════════════════════════════╣
║  *PAYMENT SUMMARY*                    ║
╠═══════════════════════════════════════╣
║  Rate: ₹${booking.amount / booking.acres}/acre
║  Acres: ${booking.acres}
║  Subtotal: ₹${booking.amount}
║  GST (5%): ₹${Math.round(booking.amount * 0.05)}
║  ─────────────────────────────────────
║  *Total: ₹${booking.amount + Math.round(booking.amount * 0.05)}*
║                                       ║
║  Payment Status: ${booking.paid ? '✅ PAID' : '⏳ PENDING'}
║                                       ║
╠═══════════════════════════════════════╣
║  *OPERATOR DETAILS*                   ║
╠═══════════════════════════════════════╣
║  Name: Ramesh Kumar
║  Contact: +91 98765 43210
║  OTP: 4521
╚═══════════════════════════════════════╝

🌾 *Thank you for choosing AgriTrack!*
📞 Support: 1800-123-4567
🌐 www.agritrack.in`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // PAYMENT - Get payment details / Pay for booking
  // ═══════════════════════════════════════════════════════════════════
  const paymentMatch = text.match(/^PAYMENT\s+(.+)$/);
  if (paymentMatch || text === 'PAYMENT' || text === 'PAY') {
    const bookingId = paymentMatch ? paymentMatch[1].trim().toUpperCase() : '';
    
    if (!bookingId) {
      return `💳 *Make Payment*

Please provide booking ID:
*PAYMENT [BookingID]*

Example: *PAYMENT BK2024001*

Reply *MY BOOKINGS* to see your booking IDs.`;
    }
    
    const booking = DEMO_BOOKINGS[bookingId] || DEMO_BOOKINGS['BK2024002'];
    const totalAmount = booking.amount + Math.round(booking.amount * 0.05);
    
    if (booking.paid) {
      return `✅ *Payment Already Received*

╔═══════════════════════════════════════╗
║         💳 *PAYMENT RECEIPT*          ║
╠═══════════════════════════════════════╣
║                                       ║
║  *Booking ID:* ${booking.id}
║  *Transaction ID:* TXN${Date.now().toString().slice(-8)}
║  *Date:* ${new Date().toLocaleDateString('en-IN')}
║  *Time:* ${new Date().toLocaleTimeString('en-IN')}
║                                       ║
╠═══════════════════════════════════════╣
║  *PAYMENT DETAILS*                    ║
╠═══════════════════════════════════════╣
║  Machine: ${booking.machine}
║  Service Date: ${booking.date}
║  Acres: ${booking.acres}
║                                       ║
║  Amount: ₹${booking.amount}
║  GST (5%): ₹${Math.round(booking.amount * 0.05)}
║  ─────────────────────────────────────
║  *Total Paid: ₹${totalAmount}*
║                                       ║
║  Payment Mode: UPI
║  Status: ✅ SUCCESS
╚═══════════════════════════════════════╝

🌾 Thank you for your payment!`;
    }
    
    return `💳 *Payment Required*

╔═══════════════════════════════════════╗
║         💰 *PAYMENT DETAILS*          ║
╠═══════════════════════════════════════╣
║                                       ║
║  *Booking ID:* ${booking.id}
║  *Machine:* ${booking.machine}
║  *Service Date:* ${booking.date}
║                                       ║
╠═══════════════════════════════════════╣
║  *AMOUNT BREAKDOWN*                   ║
╠═══════════════════════════════════════╣
║  Rate: ₹${booking.amount / booking.acres}/acre
║  Acres: ${booking.acres}
║  Subtotal: ₹${booking.amount}
║  GST (5%): ₹${Math.round(booking.amount * 0.05)}
║  ─────────────────────────────────────
║  *Total Amount: ₹${totalAmount}*
║                                       ║
╠═══════════════════════════════════════╣
║  *PAYMENT OPTIONS*                    ║
╠═══════════════════════════════════════╣
║                                       ║
║  📱 *UPI:* agritrack@upi
║                                       ║
║  🏦 *Bank Transfer:*
║  Bank: State Bank of India
║  A/C: 1234567890
║  IFSC: SBIN0001234
║  Name: AgriTrack Services
║                                       ║
║  💳 *Pay Online:*
║  https://pay.agritrack.in/${booking.id}
║                                       ║
╚═══════════════════════════════════════╝

📱 *Scan to Pay via UPI:*
upi://pay?pa=agritrack@upi&pn=AgriTrack&am=${totalAmount}&cu=INR

━━━━━━━━━━━━━━━━━━━━━
After payment, reply *CONFIRM ${booking.id}*
Or call: 1800-123-4567`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONFIRM - Confirm payment
  // ═══════════════════════════════════════════════════════════════════
  const confirmMatch = text.match(/^CONFIRM\s+(.+)$/);
  if (confirmMatch) {
    const bookingId = confirmMatch[1].trim().toUpperCase();
    const booking = DEMO_BOOKINGS[bookingId] || DEMO_BOOKINGS['BK2024002'];
    const totalAmount = booking.amount + Math.round(booking.amount * 0.05);
    
    return `✅ *Payment Confirmed!*

╔═══════════════════════════════════════╗
║      🎉 *PAYMENT SUCCESSFUL*          ║
╠═══════════════════════════════════════╣
║                                       ║
║  *Booking ID:* ${booking.id}
║  *Amount Paid:* ₹${totalAmount}
║  *Transaction ID:* TXN${Date.now().toString().slice(-8)}
║  *Status:* ✅ CONFIRMED
║                                       ║
╠═══════════════════════════════════════╣
║  *NEXT STEPS*                         ║
╠═══════════════════════════════════════╣
║                                       ║
║  1. Operator will arrive on ${booking.date}
║  2. Share OTP *4521* with operator
║  3. Service will begin after OTP
║                                       ║
║  *Operator:* Ramesh Kumar
║  *Contact:* +91 98765 43210
║                                       ║
╚═══════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━
Reply *RECEIPT ${booking.id}* for full receipt
🌾 Thank you for choosing AgriTrack!`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // FEEDBACK - Submit feedback
  // ═══════════════════════════════════════════════════════════════════
  const feedbackMatch = text.match(/^FEEDBACK\s+(.+)$/i);
  if (feedbackMatch || text === 'FEEDBACK') {
    const feedbackText = feedbackMatch ? feedbackMatch[1].trim() : '';
    
    if (!feedbackText) {
      return `📝 *Share Your Feedback*

Please send your feedback:
*FEEDBACK [Your message]*

Examples:
• FEEDBACK Great service, very helpful!
• FEEDBACK The tractor was in excellent condition
• FEEDBACK Please improve response time

Your feedback helps us serve you better! 🙏`;
    }
    
    return `✅ *Feedback Received!*

╔═══════════════════════════════════════╗
║       📝 *THANK YOU!*                 ║
╠═══════════════════════════════════════╣
║                                       ║
║  Your feedback has been recorded.
║                                       ║
║  *Your Message:*
║  "${feedbackText}"
║                                       ║
║  *Feedback ID:* FB${Date.now().toString().slice(-6)}
║  *Date:* ${new Date().toLocaleString('en-IN')}
║                                       ║
╚═══════════════════════════════════════╝

We appreciate your valuable feedback!
Our team will review and improve our services.

━━━━━━━━━━━━━━━━━━━━━
🌾 AgriTrack - Smart Farming Solutions`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CANCEL - Cancel booking
  // ═══════════════════════════════════════════════════════════════════
  const cancelMatch = text.match(/^CANCEL\s+(.+)$/);
  if (cancelMatch || text === 'CANCEL') {
    const bookingId = cancelMatch ? cancelMatch[1].trim().toUpperCase() : '';
    
    if (!bookingId) {
      return `❌ *Cancel Booking*

Please provide booking ID:
*CANCEL [BookingID]*

Example: *CANCEL BK2024001*

Reply *MY BOOKINGS* to see your booking IDs.

⚠️ *Cancellation Policy:*
• Free cancellation up to 24 hours before
• 50% charge for late cancellation
• No refund for no-show`;
    }
    
    const booking = DEMO_BOOKINGS[bookingId] || DEMO_BOOKINGS['BK2024001'];
    
    return `✅ *Booking Cancelled*

╔═══════════════════════════════════════╗
║       ❌ *CANCELLATION CONFIRMED*     ║
╠═══════════════════════════════════════╣
║                                       ║
║  *Booking ID:* ${booking.id}
║  *Machine:* ${booking.machine}
║  *Scheduled Date:* ${booking.date}
║  *Status:* CANCELLED
║                                       ║
╠═══════════════════════════════════════╣
║  *REFUND DETAILS*                     ║
╠═══════════════════════════════════════╣
║                                       ║
║  Original Amount: ₹${booking.amount}
║  Cancellation Fee: ₹0
║  *Refund Amount: ₹${booking.amount}*
║                                       ║
║  Refund will be processed within
║  3-5 business days to your original
║  payment method.
║                                       ║
╚═══════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━
To make a new booking, reply *BOOK*
🌾 AgriTrack - Smart Farming Solutions`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // RATE / PRICES - Show pricing
  // ═══════════════════════════════════════════════════════════════════
  if (text === 'RATE' || text === 'RATES' || text === 'PRICE' || text === 'PRICES') {
    return `💰 *Machine Rental Rates*

╔═══════════════════════════════════════╗
║         📋 *PRICE LIST*               ║
╠═══════════════════════════════════════╣
║                                       ║
║  🚜 *TRACTORS*
║  • Tractor Alpha: ₹800/acre
║  • Tractor Omega: ₹850/acre
║                                       ║
║  🌾 *HARVESTERS*
║  • Harvester Beta: ₹1200/acre
║                                       ║
║  🌱 *SEEDERS*
║  • Seeder Gamma: ₹600/acre
║                                       ║
║  🔄 *ROTAVATORS*
║  • Rotavator Delta: ₹700/acre
║                                       ║
╠═══════════════════════════════════════╣
║  *ADDITIONAL CHARGES*                 ║
╠═══════════════════════════════════════╣
║  • GST: 5%
║  • Fuel: Included
║  • Operator: Included
║  • Transport (>10km): ₹50/km
║                                       ║
╚═══════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━
To book, reply *BOOK 15-12-2025*`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CONTACT / SUPPORT - Show contact info
  // ═══════════════════════════════════════════════════════════════════
  if (text === 'CONTACT' || text === 'SUPPORT' || text === 'CALL') {
    return `📞 *Contact AgriTrack*

╔═══════════════════════════════════════╗
║         📱 *SUPPORT*                  ║
╠═══════════════════════════════════════╣
║                                       ║
║  *Toll-Free:* 1800-123-4567
║  *WhatsApp:* +91 98765 43210
║  *Email:* support@agritrack.in
║                                       ║
║  *Office Hours:*
║  Mon-Sat: 8:00 AM - 8:00 PM
║  Sunday: 9:00 AM - 5:00 PM
║                                       ║
╠═══════════════════════════════════════╣
║  *REGIONAL OFFICES*                   ║
╠═══════════════════════════════════════╣
║                                       ║
║  📍 *Delhi NCR*
║  Plot 45, Sector 18, Noida
║                                       ║
║  📍 *Punjab*
║  Main Market Road, Ludhiana
║                                       ║
║  📍 *Maharashtra*
║  MIDC, Nashik
║                                       ║
╚═══════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━
🌐 www.agritrack.in`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // LANGUAGE - Language options (demo)
  // ═══════════════════════════════════════════════════════════════════
  if (text === 'LANGUAGE' || text === 'HINDI' || text === 'भाषा') {
    return `🌐 *Select Language / भाषा चुनें*

╔═══════════════════════════════════════╗
║  1. English - Reply *EN*
║  2. हिंदी - Reply *HI*
║  3. ਪੰਜਾਬੀ - Reply *PA*
║  4. मराठी - Reply *MR*
║  5. తెలుగు - Reply *TE*
║  6. தமிழ் - Reply *TA*
╚═══════════════════════════════════════╝

Current: English`;
  }

  // ═══════════════════════════════════════════════════════════════════
  // UNKNOWN COMMAND
  // ═══════════════════════════════════════════════════════════════════
  return `❓ Sorry, I didn't understand that command.

Send *HELP* to see available commands.

*Quick Commands:*
• HELP - Menu
• LIST - Machines
• BOOK - New booking
• STATUS - Machine status
• PAYMENT - Pay for booking
• RECEIPT - Get receipt

━━━━━━━━━━━━━━━━━━━━━
📞 Need help? Call 1800-123-4567`;
}

// ═══════════════════════════════════════════════════════════════════
// SEND MESSAGE FUNCTION (for external use)
// ═══════════════════════════════════════════════════════════════════

async function sendMessage(phoneNumber, message) {
  // Format phone number for WhatsApp
  const formattedNumber = phoneNumber.replace(/^\+/, '').replace(/\D/g, '');
  const chatId = `${formattedNumber}@c.us`;
  
  try {
    await client.sendMessage(chatId, message);
    console.log(`📤 Sent message to +${formattedNumber}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send message:`, error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZE
// ═══════════════════════════════════════════════════════════════════

console.log('🚀 Starting WhatsApp Bot...');
console.log('📱 Please wait while we initialize...\n');

client.initialize();

// Export for external use
module.exports = {
  client,
  sendMessage
};
