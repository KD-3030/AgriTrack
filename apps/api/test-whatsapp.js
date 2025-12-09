/**
 * Quick Test Script for WhatsApp Integration
 * Run with: node test-whatsapp.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const whatsappService = require('./src/services/whatsappService');

async function testWhatsAppSetup() {
  console.log('\n🧪 Testing WhatsApp Integration...\n');

  // Test 1: Check Configuration
  console.log('1️⃣ Checking configuration...');
  const isConfigured = whatsappService.isConfigured();
  if (isConfigured) {
    console.log('   ✅ WhatsApp is configured');
    console.log(`   Instance ID: ${process.env.GREEN_API_INSTANCE_ID}`);
    console.log(`   Token: ${process.env.GREEN_API_TOKEN?.substring(0, 10)}...`);
  } else {
    console.log('   ⚠️  WhatsApp is NOT configured');
    console.log('   Please set GREEN_API_INSTANCE_ID and GREEN_API_TOKEN in .env');
    console.log('\n   📝 Add these to your .env file:');
    console.log('   GREEN_API_INSTANCE_ID=your-instance-id');
    console.log('   GREEN_API_TOKEN=your-token\n');
    return;
  }

  // Test 2: Phone Number Formatting
  console.log('\n2️⃣ Testing phone number formatting...');
  const testNumbers = [
    '9876543210',
    '919876543210',
    '919876543210@c.us'
  ];
  
  testNumbers.forEach(num => {
    const formatted = whatsappService.formatPhoneNumber(num);
    console.log(`   ${num} → ${formatted}`);
  });

  // Test 3: Test Message (only if phone provided)
  if (process.argv[2]) {
    console.log('\n3️⃣ Sending test message...');
    const testPhone = process.argv[2];
    console.log(`   Sending to: ${testPhone}`);
    
    const result = await whatsappService.sendMessage(
      testPhone,
      '🧪 Test message from AgriTrack!\n\nIf you receive this, your WhatsApp integration is working! ✅\n\nReply with HELP to see the booking menu.'
    );

    if (result.success) {
      console.log('   ✅ Message sent successfully!');
      console.log('   Check your WhatsApp now.');
    } else {
      console.log('   ❌ Failed to send message');
      console.log('   Error:', result.error);
    }
  } else {
    console.log('\n3️⃣ Skipping test message (no phone number provided)');
    console.log('   To send a test message, run:');
    console.log('   node test-whatsapp.js 919876543210');
  }

  console.log('\n✨ Test complete!\n');
  console.log('📖 Next steps:');
  console.log('   1. Go to https://green-api.com and set webhook URL');
  console.log('   2. Set webhook to: https://your-api.railway.app/api/whatsapp/webhook');
  console.log('   3. Send "HELP" to your WhatsApp number to test');
  console.log('   4. Read WHATSAPP_SETUP.md for full instructions\n');
}

// Run the test
testWhatsAppSetup().catch(error => {
  console.error('\n❌ Error during test:', error.message);
  process.exit(1);
});
