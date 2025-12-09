# WhatsApp Booking System Setup Guide (Green API)

## 🚀 Quick Setup (30 minutes)

This guide will help you set up WhatsApp booking in AgriTrack using Green API.

---

## 📋 Prerequisites

- A dedicated phone number for WhatsApp (can be your personal phone for testing)
- Internet connection
- Your AgriTrack backend deployed or running locally

---

## Step 1: Create Green API Account (5 minutes)

1. **Go to Green API**: https://green-api.com
2. **Sign up** for a free account
3. **Create an instance**:
   - Click "Create Instance"
   - Choose a plan (Free tier works for testing)
   - You'll get an **Instance ID** and **Token**

---

## Step 2: Link Your WhatsApp Number (2 minutes)

1. In Green API dashboard, find your instance
2. Click **"Scan QR Code"**
3. Open WhatsApp on your phone:
   - Android: WhatsApp → Menu (3 dots) → Linked Devices → Link a Device
   - iPhone: WhatsApp → Settings → Linked Devices → Link a Device
4. Scan the QR code shown in Green API dashboard
5. Your phone is now connected! ✅

---

## Step 3: Configure Your Backend (5 minutes)

1. **Add Environment Variables** to your `.env` file:

```bash
GREEN_API_INSTANCE_ID=your-instance-id-here
GREEN_API_TOKEN=your-token-here
```

Example:
```bash
GREEN_API_INSTANCE_ID=7103123456
GREEN_API_TOKEN=abc123def456ghi789jkl012mno345pqr678stu
```

2. **Install axios** (if not already installed):

```bash
cd apps/api
npm install
```

3. **Restart your API server**:

```bash
npm run dev
```

---

## Step 4: Set Up Webhook URL (5 minutes)

### Option A: Using Deployed Backend (Railway/Render)

1. In Green API dashboard, go to **Settings** → **Webhooks**
2. Set your webhook URL:
   ```
   https://your-api.railway.app/api/whatsapp/webhook
   ```
3. Enable **"Incoming messages"** webhook
4. Save settings

### Option B: Using Local Development (ngrok)

1. **Install ngrok**: https://ngrok.com/download
2. **Start ngrok**:
   ```bash
   ngrok http 3001
   ```
3. Copy the **https** URL (e.g., `https://abc123.ngrok.io`)
4. In Green API dashboard, set webhook URL:
   ```
   https://abc123.ngrok.io/api/whatsapp/webhook
   ```
5. Enable **"Incoming messages"** webhook
6. Save settings

---

## Step 5: Test Your Setup (5 minutes)

### Test 1: Check Configuration

```bash
# Visit in browser or use curl
curl http://localhost:3001/api/whatsapp/status
```

Expected response:
```json
{
  "success": true,
  "configured": true,
  "message": "WhatsApp service is configured and ready"
}
```

### Test 2: Send a Test Message

```bash
# Using curl
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "919876543210",
    "message": "Hello from AgriTrack! 🚜"
  }'
```

### Test 3: Test Booking Flow

1. Send a message to the WhatsApp number linked to Green API:
   ```
   HELP
   ```

2. You should receive a menu with booking options

3. Try booking:
   ```
   Book Tractor on 15-12-2025 for 5 acres at Village Road
   ```

4. Check your backend logs to see the webhook processing

---

## 📱 Supported Commands

Farmers can send these messages to your WhatsApp number:

| Command | Description |
|---------|-------------|
| `HELP` or `HI` | Show booking menu |
| `LIST` | See available machines |
| `MY BOOKINGS` | View current bookings |
| `Book [Machine] on [Date] for [Acres] acres at [Location]` | Create new booking |

### Booking Examples:

```
Book Tractor on 15-12-2025 for 5 acres at Village Road
Book Harvester on 20-12-2025 for 10 acres at Main Street
Book Seeder on 25-12-2025 for 3 acres at Farm House
```

---

## 🔧 API Endpoints

Your backend now has these WhatsApp endpoints:

### 1. **Webhook Endpoint** (for Green API)
```
POST /api/whatsapp/webhook
```
Receives incoming messages from Green API automatically.

### 2. **Send Message** (manual)
```
POST /api/whatsapp/send
Body: { "phone": "919876543210", "message": "Hello!" }
```

### 3. **Send Booking Confirmation**
```
POST /api/whatsapp/send-booking-confirmation
Body: { "phone": "919876543210", "booking": {...} }
```

### 4. **Check Status**
```
GET /api/whatsapp/status
```

### 5. **Test Endpoint** (simulate webhook)
```
POST /api/whatsapp/test
Body: { "phone": "919876543210", "message": "HELP" }
```

---

## 🎯 Integration with Existing Booking System

The WhatsApp service automatically:

1. ✅ Creates farmer accounts when they first message
2. ✅ Parses booking requests intelligently
3. ✅ Validates machine availability
4. ✅ Creates bookings in your database
5. ✅ Sends confirmation messages
6. ✅ Shows booking history

To send WhatsApp confirmations from your existing booking flow, add this to your booking creation code:

```javascript
const whatsappService = require('./services/whatsappService');

// After creating booking
if (farmer.whatsapp_phone) {
  await whatsappService.sendBookingConfirmation(
    farmer.whatsapp_phone,
    booking
  );
}
```

---

## 🐛 Troubleshooting

### Problem: "WhatsApp not configured" message

**Solution**: Check your `.env` file has:
```bash
GREEN_API_INSTANCE_ID=your-id
GREEN_API_TOKEN=your-token
```
Restart your server after adding these.

### Problem: Messages not received

**Solutions**:
1. Check webhook URL is correct in Green API dashboard
2. Ensure webhook URL is publicly accessible (use ngrok for local dev)
3. Check Green API dashboard shows "Connected" status
4. Verify your phone is still linked (check Linked Devices in WhatsApp)

### Problem: Bot not responding

**Solutions**:
1. Check backend logs for errors: `npm run dev`
2. Test webhook manually: `POST /api/whatsapp/test`
3. Verify database connection is working
4. Check Green API instance is active (not expired)

### Problem: Phone number format errors

**Solution**: The service auto-formats numbers, but ensure:
- Use international format: `919876543210` (India)
- No spaces or special characters
- Include country code

---

## 💰 Green API Pricing

- **Free Tier**: ~1000 messages/month (perfect for demos)
- **Developer**: $20/month - unlimited messages
- **Alternative**: UltraMsg.com also offers similar service

---

## 🚀 Production Checklist

Before going live:

- [ ] Use a dedicated business phone number
- [ ] Set up proper error logging
- [ ] Add rate limiting to prevent spam
- [ ] Monitor webhook response times
- [ ] Set up alerts for failed messages
- [ ] Consider upgrading to paid Green API plan
- [ ] Test with multiple farmers
- [ ] Document farmer support process
- [ ] Add message templates for common responses

---

## 📊 Testing Different Scenarios

### Test Farmer Registration
```
Phone: 919876543210
Message: "Hi"
Expected: Welcome message + menu
```

### Test Machine Listing
```
Message: "LIST"
Expected: Available machines with prices
```

### Test Booking Creation
```
Message: "Book Tractor on 15-12-2025 for 5 acres at Test Location"
Expected: Booking confirmation with booking ID
```

### Test Booking History
```
Message: "MY BOOKINGS"
Expected: List of farmer's bookings
```

### Test Invalid Request
```
Message: "Book something random"
Expected: Error message with correct format
```

---

## 🎓 Advanced Features (Optional)

### Add to booking creation webhook:

```javascript
// In your bookings route
router.post('/bookings', async (req, res) => {
  // Create booking
  const booking = await createBooking(req.body);
  
  // Send WhatsApp confirmation if farmer has WhatsApp
  if (booking.farmer_phone) {
    const whatsappService = require('./services/whatsappService');
    await whatsappService.sendBookingConfirmation(
      booking.farmer_phone,
      booking
    );
  }
  
  res.json(booking);
});
```

### Add to booking status updates:

```javascript
// When booking status changes
async function updateBookingStatus(bookingId, newStatus) {
  const booking = await db.updateBooking(bookingId, { status: newStatus });
  
  // Notify via WhatsApp
  const message = `🔔 Booking ${bookingId} status updated to: ${newStatus}`;
  await whatsappService.sendMessage(booking.farmer_phone, message);
}
```

---

## 📞 Support

If you encounter issues:

1. Check backend logs: `npm run dev`
2. Test with curl commands first
3. Verify Green API dashboard shows active instance
4. Check webhook logs in Green API dashboard

---

## 🎉 You're Done!

Your WhatsApp booking system is now ready! Farmers can:

✅ Book machines via WhatsApp  
✅ Check available equipment  
✅ View their bookings  
✅ Get instant confirmations  

Share your WhatsApp number with farmers and start receiving bookings! 🚜📱
