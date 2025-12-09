# ⚡ WhatsApp Integration - Quick Start Checklist

Use this checklist to set up WhatsApp booking in 10 minutes!

## ☑️ Before You Start

- [ ] Phone number for WhatsApp (can be personal for testing)
- [ ] Internet connection
- [ ] Backend deployed or running locally
- [ ] 10 minutes of time

---

## 🚀 Setup Steps

### 1. Green API Account (5 min)
- [ ] Go to https://green-api.com
- [ ] Sign up for free account
- [ ] Create a new instance
- [ ] Copy **Instance ID**: `________________`
- [ ] Copy **Token**: `________________`

### 2. Link Phone (2 min)
- [ ] In Green API dashboard, find QR code
- [ ] Open WhatsApp → Settings → Linked Devices
- [ ] Scan QR code
- [ ] Phone is now linked ✅

### 3. Configure Backend (2 min)
- [ ] Open `.env` file in AgriTrack root
- [ ] Add these lines:
  ```bash
  GREEN_API_INSTANCE_ID=your-instance-id
  GREEN_API_TOKEN=your-token
  ```
- [ ] Save file
- [ ] Restart server: `cd apps/api && npm run dev`

### 4. Set Webhook (3 min)

**For Local Testing:**
- [ ] Install ngrok: https://ngrok.com
- [ ] Run: `ngrok http 3001`
- [ ] Copy https URL: `________________`
- [ ] In Green API → Settings → Webhooks
- [ ] Set URL: `https://your-url.ngrok.io/api/whatsapp/webhook`
- [ ] Enable "Incoming messages"
- [ ] Save

**For Deployed App:**
- [ ] In Green API → Settings → Webhooks
- [ ] Set URL: `https://your-api.railway.app/api/whatsapp/webhook`
- [ ] Enable "Incoming messages"
- [ ] Save

### 5. Test! (2 min)
- [ ] Send to your WhatsApp: `HELP`
- [ ] Receive welcome menu ✅
- [ ] Send: `LIST`
- [ ] See available machines ✅
- [ ] Send: `Book Tractor on 15-12-2025 for 5 acres at Test Farm`
- [ ] Receive booking confirmation ✅

---

## ✅ Success Criteria

- [x] Green API shows "Connected" status
- [x] Test message received successfully
- [x] Booking confirmation received
- [x] Backend logs show webhook processing

---

## 🎉 You're Live!

Share your WhatsApp number with farmers and start receiving bookings!

**Your WhatsApp Booking Number:** `________________`

---

## 📖 Need Help?

- **Full Setup Guide**: See `WHATSAPP_SETUP.md`
- **Flow Diagram**: See `WHATSAPP_FLOW.md`
- **Test Script**: Run `node apps/api/test-whatsapp.js`
- **Check Status**: `curl http://localhost:3001/api/whatsapp/status`

---

## 🐛 Quick Fixes

### Not receiving messages?
→ Check webhook URL in Green API
→ Ensure URL is publicly accessible
→ Check phone is still linked

### Bot not responding?
→ Check server logs: `npm run dev`
→ Run test: `node apps/api/test-whatsapp.js`
→ Verify `.env` has credentials

### "Not configured" error?
→ Add `GREEN_API_INSTANCE_ID` and `GREEN_API_TOKEN` to `.env`
→ Restart server

---

## 📝 Configuration Summary

Fill this out after setup:

```
Green API Instance ID: ________________
Green API Token: ________________
Webhook URL: ________________
WhatsApp Number: ________________
Setup Date: ________________
Tested By: ________________
Status: [ ] Working  [ ] Issues
```

---

## 🚀 Next Steps

After setup works:
- [ ] Test with multiple farmers
- [ ] Monitor logs for errors
- [ ] Share number with team
- [ ] Update documentation with your number
- [ ] Set up monitoring alerts
- [ ] Consider upgrading Green API plan for production

---

**Estimated Time**: 10-15 minutes
**Difficulty**: Easy 🟢
**Cost**: Free tier available

Good luck! 🎉
