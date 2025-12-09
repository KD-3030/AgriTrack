# 🆓 Twilio WhatsApp Sandbox Setup (100% FREE)

## ⚡ Quick Setup (10 Minutes)

Twilio WhatsApp Sandbox is **completely FREE** and perfect for testing!

---

## Step 1: Get Twilio Account (3 minutes)

1. **Go to**: https://www.twilio.com/try-twilio
2. **Sign up** for free account
3. **Verify** your email and phone
4. **Get $15 free credit** (not needed for sandbox!)

---

## Step 2: Access WhatsApp Sandbox (2 minutes)

1. **Log in** to Twilio Console
2. **Go to**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
3. You'll see a **sandbox number** (e.g., +1 415 523 8886)
4. You'll see a **join code** (e.g., "join yellow-tiger")

---

## Step 3: Join the Sandbox (1 minute)

1. **Open WhatsApp** on your phone
2. **Send a message** to the Twilio sandbox number:
   ```
   join your-sandbox-code
   ```
   Example: `join yellow-tiger`

3. **You'll receive** a confirmation message ✅

---

## Step 4: Get Your Credentials (2 minutes)

1. **Go to**: https://console.twilio.com
2. **Find** on dashboard:
   - **Account SID** (looks like: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Auth Token** (click to reveal)

---

## Step 5: Configure AgriTrack (2 minutes)

1. **Open** `c:\Users\HP\AgriTrack\.env`

2. **Uncomment and add** your credentials:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your-auth-token-here
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

3. **Save** the file

---

## Step 6: Restart Server & Test! (2 minutes)

```powershell
# Stop current server (Ctrl+C)

# Start server
cd c:\Users\HP\AgriTrack\apps\api
node src/index.js
```

**Expected output:**
```
📱 Using Twilio WhatsApp
🚀 AgriTrack API running on port 3001
```

---

## Step 7: Set Up Webhook (For Receiving Messages)

### For Local Testing (ngrok):

1. **Install ngrok**: https://ngrok.com/download

2. **Start ngrok**:
   ```bash
   ngrok http 3001
   ```

3. **Copy the https URL** (e.g., `https://abc123.ngrok.io`)

4. **In Twilio Console**:
   - Go to: https://console.twilio.com/us1/develop/sms/settings/whatsapp-sandbox
   - **"When a message comes in"**: 
     ```
     https://abc123.ngrok.io/api/whatsapp/webhook
     ```
   - **Method**: POST
   - **Save**

### For Deployed App:

Set webhook to: `https://your-api.railway.app/api/whatsapp/webhook`

---

## 🎉 Test It NOW!

### Test 1: Send Test Message from Server

Open PowerShell and run:

```powershell
$body = @{
    phone = "your-phone-number"  # Your WhatsApp number
    message = "Test from AgriTrack! 🚜"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/whatsapp/send" -Method POST -Body $body -ContentType "application/json"
```

**Check your WhatsApp** - you should receive the message!

### Test 2: Send Message TO AgriTrack

**From your WhatsApp**, send to the Twilio number:
```
HELP
```

**You should receive:**
```
🚜 Welcome to AgriTrack!

Commands:
📋 LIST - See available machines
📅 MY BOOKINGS - View your bookings
...
```

### Test 3: Try Booking

**Send**:
```
Book Tractor on 15-12-2025 for 5 acres at My Farm
```

**Receive**:
```
✅ Booking Confirmed!

Booking ID: BK_xxxxx
Machine: Tractor
Date: 15/12/2025
...
```

---

## ✅ Success Checklist

- [x] Twilio account created
- [x] Joined WhatsApp sandbox
- [x] Credentials added to `.env`
- [x] Server restarted
- [x] Status shows "Using Twilio WhatsApp"
- [x] Test message sent successfully
- [x] Webhook configured
- [x] Received message from bot

---

## 📱 Commands Your Users Can Send

| Command | Response |
|---------|----------|
| `HELP` | Shows welcome menu |
| `LIST` | Lists available machines |
| `MY BOOKINGS` | Shows user's bookings |
| `Book Tractor on 15-12-2025 for 5 acres at Farm` | Creates booking |

---

## 💰 Cost

**Twilio WhatsApp Sandbox:**
- ✅ **100% FREE** for testing
- ✅ No time limit
- ✅ Unlimited messages
- ✅ Perfect for demos

**For Production:**
- Need to apply for Twilio WhatsApp approval (takes a few days)
- Or use Meta Cloud API (also FREE for 1000 conversations/month)

---

## 🎯 Advantages of Twilio

✅ **100% FREE** for testing
✅ **Official Twilio service** (reliable)
✅ **Works immediately** (no approval needed)
✅ **You already have Twilio** in package.json!
✅ **Easy to upgrade** to production later
✅ **Well documented**
✅ **Better than Green API** for testing

---

## 🐛 Troubleshooting

### Problem: "WhatsApp not configured"
**Solution:**
- Check `.env` has TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
- Restart server
- Run: `Invoke-RestMethod http://localhost:3001/api/whatsapp/status`

### Problem: Not receiving messages
**Solution:**
- Make sure you joined the sandbox (send "join code" to Twilio number)
- Check webhook URL is configured in Twilio console
- Verify webhook URL is publicly accessible (use ngrok for local)

### Problem: Can't send messages
**Solution:**
- Verify credentials are correct
- Check phone number format: `whatsapp:+919876543210`
- Make sure recipient has joined the sandbox

### Problem: "Participant not in the sandbox"
**Solution:**
- Each user must join the sandbox first
- Send "join your-code" to the Twilio sandbox number
- This is only for testing; production doesn't need this

---

## 📊 Test Your Setup

```powershell
# Check status
Invoke-RestMethod http://localhost:3001/api/whatsapp/status

# Expected output:
# {
#   "success": true,
#   "provider": "twilio",
#   "configured": true,
#   "details": "Twilio (whatsapp:+14155238886)",
#   "message": "WhatsApp service is configured using Twilio..."
# }
```

---

## 🚀 Next Steps

1. ✅ **For Demo**: You're ready! Share sandbox join code with team
2. ✅ **For Production**: Apply for Twilio WhatsApp approval
3. ✅ **Alternative**: Use Meta Cloud API (also FREE)

---

## 🎉 You're Done!

Your WhatsApp booking system is now working with **FREE** Twilio Sandbox!

**Test it**: Send "HELP" to your Twilio sandbox number! 📱✨

---

## 📖 Resources

- **Twilio WhatsApp Docs**: https://www.twilio.com/docs/whatsapp
- **Twilio Console**: https://console.twilio.com
- **WhatsApp Sandbox**: https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
- **Production Approval**: https://www.twilio.com/docs/whatsapp/tutorial/connect-number-business-profile

---

**Total Setup Time**: ~10 minutes  
**Cost**: $0 (100% FREE)  
**Difficulty**: Easy 🟢  
**Best For**: Testing & Demos  

🎉 **Enjoy FREE WhatsApp integration!**
