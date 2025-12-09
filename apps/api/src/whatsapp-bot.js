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

function handleCommand(messageText, phoneNumber) {
  const text = messageText.toUpperCase().trim();
  
  // HELP command
  if (text === 'HELP' || text === 'HI' || text === 'HELLO' || text === 'START') {
    return `🌾 *AgriTrack SMS Booking* 🌾

Welcome! Here are the available commands:

1️⃣ *BOOK DD-MM* - Book a machine
   Example: BOOK 15-12 (for Dec 15)

2️⃣ *STATUS* - Check your booking status

3️⃣ *CANCEL* - Cancel your booking

4️⃣ *HELP* - Show this help menu

━━━━━━━━━━━━━━━━━━━━━
📞 Helpline: 1800-XXX-XXXX
🌐 Website: agritrack.in`;
  }
  
  // BOOK command
  const bookMatch = text.match(/^BOOK\s+(\d{1,2})-(\d{1,2})$/);
  if (bookMatch) {
    const day = bookMatch[1];
    const month = bookMatch[2];
    return `📅 *Booking Request Received*

Date: ${day}/${month}/2025
Status: ⏳ Processing...

You will receive a confirmation with:
• Machine details
• Operator contact
• OTP code

━━━━━━━━━━━━━━━━━━━━━
Reply *STATUS* to check your booking.`;
  }
  
  // STATUS command
  if (text === 'STATUS') {
    return `📋 *Your Booking Status*

You don't have any active bookings.

To book a machine, send:
*BOOK DD-MM*
Example: BOOK 15-12`;
  }
  
  // CANCEL command
  if (text === 'CANCEL') {
    return `❌ *Cancel Booking*

You don't have any active bookings to cancel.

To make a new booking, send:
*BOOK DD-MM*`;
  }
  
  // Unknown command
  return `❓ Sorry, I didn't understand that command.

Send *HELP* to see available commands.

━━━━━━━━━━━━━━━━━━━━━
📞 Need help? Call 1800-XXX-XXXX`;
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
