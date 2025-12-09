/**
 * Test script to send WhatsApp message to demo user
 * Run: node send-test-message.js
 */

const whatsappService = require('./src/services/whatsappService');

const TEST_PHONE = '919674063935'; // Test user phone number

async function sendTestMessage() {
  console.log('📱 AgriTrack WhatsApp Bot - Test Message Sender\n');
  console.log('================================================\n');

  // Check if WhatsApp is configured
  const providerInfo = whatsappService.getProviderInfo();
  console.log('Provider:', providerInfo.provider);
  console.log('Configured:', providerInfo.configured);
  console.log('Details:', providerInfo.details);
  console.log('\n');

  if (!providerInfo.configured) {
    console.log('⚠️ WhatsApp not ready. Starting initialization...\n');
    console.log('Please scan the QR code when it appears.\n');
    
    await whatsappService.initializeWhatsAppWeb();
    
    // Wait for ready state
    console.log('Waiting for WhatsApp to be ready...');
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  // Send welcome message
  const welcomeMessage = `🚜 *Welcome to AgriTrack Demo!*

Hello! This is a test message from AgriTrack.

*📋 Available Commands:*

🔹 *HELP* - Show menu
🔹 *LIST* - See machines
🔹 *MY BOOKINGS* - Your bookings
🔹 *STATUS* - Machine status
🔹 *RECEIPT [ID]* - Get receipt
🔹 *FEEDBACK [msg]* - Share feedback
🔹 *TRACK [ID]* - Track machine

Try sending *HELP* to get started!

━━━━━━━━━━━━━━━━━━━━━
🌾 AgriTrack - Smart Farming`;

  console.log(`Sending message to ${TEST_PHONE}...`);
  
  const result = await whatsappService.sendMessage(TEST_PHONE, welcomeMessage);
  
  if (result.success) {
    console.log('✅ Message sent successfully!');
    console.log('Provider:', result.provider);
  } else {
    console.log('❌ Failed to send message:', result.error);
  }
}

// Run the test
sendTestMessage().catch(console.error);
