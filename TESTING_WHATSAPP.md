# 🧪 WhatsApp Feature Testing Guide

## ✅ Current Status

Your WhatsApp booking system is **fully implemented** and ready to test!

**What's been completed:**
- ✅ WhatsApp service integration
- ✅ Message handler for bookings
- ✅ API routes and webhook endpoint
- ✅ Test script created
- ✅ Documentation complete
- ✅ Server running successfully

---

## 🚀 How to Test (3 Options)

### Option 1: Quick Test WITHOUT Green API (5 minutes) ⭐ RECOMMENDED FOR NOW

Test the booking logic without needing Green API credentials:

#### Step 1: Start the Server
```bash
cd c:\Users\HP\AgriTrack\apps\api
npm run dev
```

Server should show:
```
🚀 AgriTrack API running on port 3001
```

#### Step 2: Test Configuration Check
Open a **NEW PowerShell window** and run:
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/status"
```

**Expected Output:**
```json
{
  "success": true,
  "configured": false,
  "message": "WhatsApp service is not configured. Please set GREEN_API_INSTANCE_ID and GREEN_API_TOKEN"
}
```

This is normal! The system works even without credentials.

#### Step 3: Test Booking Logic (Mock Mode)
```powershell
# Test HELP command
$body = @{
    phone = "919876543210"
    message = "HELP"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json"
```

**Expected Output:** Success message with welcome menu

#### Step 4: Test Machine Listing
```powershell
$body = @{
    phone = "919876543210"
    message = "LIST"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json"
```

**Expected Output:** List of mock machines

#### Step 5: Test Booking Creation
```powershell
$body = @{
    phone = "919876543210"
    message = "Book Tractor on 15-12-2025 for 5 acres at Test Farm"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json"
```

**Expected Output:** Booking confirmation with booking ID

---

### Option 2: Test WITH Green API (Real WhatsApp) - 30 minutes

If you want to test with actual WhatsApp messages:

#### Step 1: Get Green API Credentials

1. **Visit:** https://green-api.com
2. **Sign up** (free tier available)
3. **Create instance** - You'll get:
   - Instance ID (e.g., `7103123456`)
   - Token (long string of characters)

#### Step 2: Link Your Phone

1. In Green API dashboard, you'll see a **QR Code**
2. Open WhatsApp on your phone:
   - **Android**: Menu (⋮) → Linked Devices → Link a Device
   - **iPhone**: Settings → Linked Devices → Link a Device
3. **Scan the QR code**
4. Your phone is now linked! ✅

#### Step 3: Add Credentials to .env

Open `c:\Users\HP\AgriTrack\.env` and uncomment/add:

```bash
GREEN_API_INSTANCE_ID=your-instance-id-here
GREEN_API_TOKEN=your-token-here
```

**Example:**
```bash
GREEN_API_INSTANCE_ID=7103123456
GREEN_API_TOKEN=abc123def456ghi789jkl012mno345
```

#### Step 4: Restart Server

```bash
# Press Ctrl+C to stop the current server
# Then restart:
cd c:\Users\HP\AgriTrack\apps\api
npm run dev
```

#### Step 5: Verify Configuration

```powershell
node test-whatsapp.js
```

**Expected Output:**
```
✅ WhatsApp is configured
Instance ID: 7103123456
Token: abc123def4...
```

#### Step 6: Send Test Message (Optional)

```powershell
node test-whatsapp.js 919876543210
```

Replace `919876543210` with your phone number.

#### Step 7: Set Up Webhook

**For Local Testing (using ngrok):**

1. **Install ngrok:** https://ngrok.com/download
2. **Start ngrok:**
   ```bash
   ngrok http 3001
   ```
3. **Copy the https URL** (e.g., `https://abc123.ngrok.io`)
4. **In Green API dashboard:**
   - Go to Settings → Webhooks
   - Set URL: `https://abc123.ngrok.io/api/whatsapp/webhook`
   - Enable "Incoming messages"
   - Click Save

**For Deployed Backend:**
- Set webhook to: `https://your-api.railway.app/api/whatsapp/webhook`

#### Step 8: Test Real WhatsApp Messages!

Send these messages to your linked WhatsApp number:

1. **Send:** `HELP`
   - **Expect:** Welcome menu

2. **Send:** `LIST`
   - **Expect:** Available machines list

3. **Send:** `Book Tractor on 20-12-2025 for 5 acres at My Farm`
   - **Expect:** Booking confirmation

4. **Send:** `MY BOOKINGS`
   - **Expect:** Your booking history

---

### Option 3: Test Using Postman/Thunder Client

#### Test 1: Check Status
```
GET http://localhost:3001/api/whatsapp/status
```

#### Test 2: Manual Send (requires credentials)
```
POST http://localhost:3001/api/whatsapp/send
Content-Type: application/json

{
  "phone": "919876543210",
  "message": "Test from AgriTrack!"
}
```

#### Test 3: Simulate Webhook
```
POST http://localhost:3001/api/whatsapp/test
Content-Type: application/json

{
  "phone": "919876543210",
  "message": "Book Tractor on 15-12-2025 for 5 acres at Test Location"
}
```

---

## 📊 Test Checklist

### Basic Tests (No credentials needed)
- [ ] Server starts successfully
- [ ] Status endpoint returns response
- [ ] Test endpoint processes HELP command
- [ ] Test endpoint processes LIST command
- [ ] Test endpoint processes BOOK command
- [ ] Booking confirmation generated

### Integration Tests (Requires Green API)
- [ ] Green API account created
- [ ] Phone linked via QR code
- [ ] Credentials added to .env
- [ ] Test script shows "configured"
- [ ] Test message sent successfully
- [ ] Webhook URL configured
- [ ] Real WhatsApp message received
- [ ] Bot responds to HELP
- [ ] Bot shows machines list
- [ ] Bot creates booking
- [ ] Confirmation received on WhatsApp

---

## 🎯 Expected Behavior

### When Farmer Sends "HELP"
```
🚜 Welcome to AgriTrack, Farmer!

To book a machine, reply with:
Book [Machine] on [Date] for [Acres] acres at [Location]

Example:
"Book Tractor on 15-12-2025 for 5 acres at Village Road"

Or type:
📋 LIST - See available machines
📅 MY BOOKINGS - View your bookings
❓ HELP - Get assistance

How can we help you today?
```

### When Farmer Sends "LIST"
```
🚜 Available Machines:

1. Tractor
   ID: M001
   Status: available
   Rate: ₹800/acre

2. Harvester
   ID: M002
   Status: available
   Rate: ₹1200/acre

3. Seeder
   ID: M003
   Status: available
   Rate: ₹600/acre

To book, type: Book [Machine] on [Date] for [Acres] acres at [Location]
```

### When Farmer Books
Input: `Book Tractor on 20-12-2025 for 5 acres at My Farm`

Response:
```
✅ Booking Confirmed!

Booking ID: BK_xxxxx
Machine: Tractor
Date: 20/12/2025
Acres: 5 acres
Location: My Farm
Notes: Booked via WhatsApp

Status: CONFIRMED

Thank you for choosing AgriTrack! 🌾
```

---

## 🔍 Checking Server Logs

When testing, watch the server logs for these messages:

```bash
# Successful webhook received:
📥 Received WhatsApp webhook: {...}

# Message processing:
📱 WhatsApp message from 9876543210: HELP

# Booking created:
✅ Booking created: BK_xxxxx
```

---

## 🐛 Troubleshooting

### Problem: "Cannot connect to localhost:3001"
**Solution:**
- Make sure server is running: `npm run dev`
- Check port 3001 is not in use
- Wait 2-3 seconds for server to fully start

### Problem: "WhatsApp not configured"
**Solution:**
- This is normal for testing without Green API
- Use the `/test` endpoint instead of `/send`
- Or add credentials to `.env`

### Problem: Test endpoint returns error
**Solution:**
- Check message format is correct
- Ensure server is running
- Check server logs for detailed error

### Problem: Real WhatsApp messages not received
**Solution:**
- Verify webhook URL in Green API dashboard
- Check webhook URL is publicly accessible
- Ensure phone is still linked (check WhatsApp → Linked Devices)
- Check Green API dashboard shows "Connected"

### Problem: Server crashes on request
**Solution:**
- Check for syntax errors in routes file
- Restart with: `npm run dev`
- Check `.env` file is in correct location

---

## 📝 Quick Command Reference

```bash
# Start server
cd c:\Users\HP\AgriTrack\apps\api
npm run dev

# Test configuration
node test-whatsapp.js

# Test with phone number
node test-whatsapp.js 919876543210

# Check status (in new terminal)
Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/status"

# Test HELP command
$body = @{ phone = "919876543210"; message = "HELP" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json"

# Test booking
$body = @{ phone = "919876543210"; message = "Book Tractor on 15-12-2025 for 5 acres at Farm" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json"
```

---

## 🎉 Success Indicators

You'll know it's working when:

✅ Server starts without errors  
✅ Status endpoint responds  
✅ Test commands process successfully  
✅ Mock bookings are created  
✅ (With Green API) Real WhatsApp messages are received  
✅ (With Green API) Bot sends responses  
✅ Booking confirmations are generated  

---

## 📖 Additional Resources

- **Full Setup Guide**: `WHATSAPP_SETUP.md`
- **Flow Diagrams**: `WHATSAPP_FLOW.md`
- **Implementation Summary**: `WHATSAPP_IMPLEMENTATION_SUMMARY.md`
- **Quick Checklist**: `WHATSAPP_QUICK_START.md`

---

## ⚡ Quick Start NOW

**The fastest way to test right now (2 minutes):**

```bash
# Terminal 1: Start server
cd c:\Users\HP\AgriTrack\apps\api
npm run dev

# Terminal 2: Run tests
cd c:\Users\HP\AgriTrack\apps\api
node test-whatsapp.js

# Test booking
$body = @{ phone = "919876543210"; message = "Book Tractor on 15-12-2025 for 5 acres at Test Farm" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/test" -Method POST -Body $body -ContentType "application/json"
```

---

## 🎯 Recommendation

**For immediate testing:** Use **Option 1** (Mock Mode)
- No setup needed
- Tests all logic
- Instant results
- Perfect for demo

**For production:** Use **Option 2** (Green API)
- Real WhatsApp integration
- 30-minute setup
- Works with actual farmers
- Requires public webhook URL

---

**Status**: ✅ Ready to Test!  
**Estimated Testing Time**: 5-30 minutes (depending on option)  
**Difficulty**: Easy 🟢
