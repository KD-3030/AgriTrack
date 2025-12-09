# 📱 AgriTrack SMS Booking System - Setup Guide

This guide walks you through setting up the **Twilio SMS Gateway** for offline booking by farmers using feature phones.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SMS BOOKING FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────────────┐  │
│   │  Farmer  │     │  Twilio  │     │  ngrok   │     │  AgriTrack API   │  │
│   │  (Phone) │     │  Cloud   │     │ (Tunnel) │     │  (localhost:3001)│  │
│   └────┬─────┘     └────┬─────┘     └────┬─────┘     └────────┬─────────┘  │
│        │                │                │                    │             │
│        │ SMS "BOOK 25-12"               │                    │             │
│        │───────────────>│                │                    │             │
│        │                │                │                    │             │
│        │                │ POST webhook   │                    │             │
│        │                │───────────────>│                    │             │
│        │                │                │                    │             │
│        │                │                │ Forward to local   │             │
│        │                │                │───────────────────>│             │
│        │                │                │                    │             │
│        │                │                │                    │ Process     │
│        │                │                │                    │ Check DB    │
│        │                │                │                    │ Find machine│
│        │                │                │                    │ Create OTP  │
│        │                │                │                    │             │
│        │                │                │   TwiML Response   │             │
│        │                │                │<───────────────────│             │
│        │                │                │                    │             │
│        │                │ TwiML Response │                    │             │
│        │                │<───────────────│                    │             │
│        │                │                │                    │             │
│        │ SMS Response   │                │                    │             │
│        │<───────────────│                │                    │             │
│        │                │                │                    │             │
│        │ "Booking       │                │                    │             │
│        │  Confirmed!    │                │                    │             │
│        │  OTP: 4590"    │                │                    │             │
│        │                │                │                    │             │
│   └────┴─────┘     └────┴─────┘     └────┴─────┘     └────────┴─────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Step 1: Twilio Account Setup

### 1.1 Create Twilio Account

1. Go to **https://www.twilio.com/try-twilio**
2. Sign up with your email
3. Verify your phone number
4. Complete account setup

### 1.2 Get Your Credentials

After signing up, go to **Console Dashboard**:

1. **Account SID**: Found on dashboard (starts with `AC...`)
2. **Auth Token**: Click "Show" to reveal (keep this secret!)
3. **Phone Number**: 
   - Go to **Phone Numbers → Manage → Buy a number**
   - Select a number with SMS capability
   - Note the number (format: `+1234567890`)

### 1.3 Configure Verified Caller IDs (Trial Accounts)

> ⚠️ **Trial Account Limitation**: You can only send SMS to verified phone numbers.

1. Go to **Phone Numbers → Manage → Verified Caller IDs**
2. Add phone numbers you want to test with
3. Each number will receive a verification code

---

## 🔧 Step 2: Environment Configuration

### 2.1 Update `.env` File

Add these to your `/Users/pritimmondal/Desktop/AgriTrack/.env`:

```bash
# =====================================================
# TWILIO SMS CONFIGURATION
# =====================================================

# Your Twilio Account SID (from Twilio Console)
TWILIO_ACCOUNT_SID=AC4a575611712450115a7a0fd6c9eabc75

# Your Twilio Auth Token (keep secret!)
TWILIO_AUTH_TOKEN=your_auth_token_here

# Your Twilio Phone Number (with country code)
TWILIO_PHONE_NUMBER=+19384005073

# Enable/disable SMS (set to 'false' to disable)
SMS_ENABLED=true
```

### 2.2 Update Docker Compose

Your `docker-compose.yml` should pass these to the API container:

```yaml
api:
  environment:
    - TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}
    - TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}
    - TWILIO_PHONE_NUMBER=${TWILIO_PHONE_NUMBER}
    - SMS_ENABLED=${SMS_ENABLED}
```

---

## 🌐 Step 3: ngrok Setup (Local Development)

ngrok creates a public URL that tunnels to your local API, allowing Twilio to reach your webhook.

### 3.1 Install ngrok

```bash
# macOS with Homebrew
brew install ngrok

# Or download from https://ngrok.com/download
```

### 3.2 Create ngrok Account

1. Go to **https://ngrok.com/** and sign up (free)
2. Go to **Your Authtoken** in dashboard
3. Copy your authtoken

### 3.3 Configure ngrok

```bash
# Add your authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

### 3.4 Start ngrok Tunnel

Open a new terminal and run:

```bash
# Tunnel to your API on port 3001
ngrok http 3001
```

You'll see output like:
```
Session Status                online
Account                       your@email.com
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3001
```

📝 **Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

> ⚠️ **Note**: Free ngrok URLs change each time you restart. For production, use a paid plan or deploy to a cloud server.

---

## 📞 Step 4: Configure Twilio Webhook

### 4.1 Set Webhook URL in Twilio

1. Go to **Twilio Console → Phone Numbers → Manage → Active numbers**
2. Click on your phone number
3. Scroll to **Messaging Configuration**
4. Under "A MESSAGE COMES IN":
   - **Webhook**: `https://YOUR-NGROK-URL.ngrok-free.app/api/webhooks/twilio-sms`
   - **HTTP Method**: `POST`
5. Click **Save Configuration**

Example:
```
https://abc123.ngrok-free.app/api/webhooks/twilio-sms
```

### 4.2 Test the Webhook

```bash
# Test locally
curl -X POST http://localhost:3001/api/webhooks/twilio-sms/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "message": "HELP"}'
```

You should get:
```json
{
  "success": true,
  "response": "AgriTrack SMS Booking:\n1. BOOK 25-12 - Book for Dec 25\n2. STATUS - Check your booking\n3. CANCEL - Cancel booking\n\nCall 1800-XXX-XXXX for help"
}
```

---

## 📱 Step 5: SMS Commands Reference

| Command | Example | Description |
|---------|---------|-------------|
| `BOOK DD-MM` | `BOOK 25-12` | Book machine for Dec 25 |
| `BOOK DD-MM-YYYY` | `BOOK 25-12-2025` | Book with specific year |
| `STATUS` | `STATUS` | Check your booking status |
| `CANCEL` | `CANCEL` | Cancel your booking |
| `HELP` | `HELP` | Get help message |
| `YES` / `NO` | `YES` | Confirm/reject suggestions |

### Response Examples

**Successful Booking:**
```
✅ Booking Confirmed!
Date: 25 Dec 2025
Machine: Super SMS PB-101
OTP: 4590

Show OTP to operator on arrival.
```

**Date Unavailable:**
```
❌ 25 Dec 2025 is full.
✅ Book for 27 Dec 2025 for Priority Access.

Reply YES to confirm or NO to cancel.
```

**Status Check:**
```
Your booking:
📅 Date: 25 Dec 2025
🚜 Machine: Super SMS PB-101
📊 Status: ✅ Confirmed
```

---

## 🗄️ Step 6: Database Setup

Run the migration to create SMS booking tables:

```bash
# If using Supabase Dashboard:
# Go to SQL Editor → New Query → Paste contents of:
# /database/phase6-sms-booking.sql

# Or via psql:
psql -h your-supabase-host -U postgres -d postgres -f database/phase6-sms-booking.sql
```

---

## 🧪 Step 7: Testing

### 7.1 Local Test (without Twilio)

```bash
# Test HELP command
curl -X POST http://localhost:3001/api/webhooks/twilio-sms/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "message": "HELP"}'

# Test BOOK command
curl -X POST http://localhost:3001/api/webhooks/twilio-sms/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "message": "BOOK 25-12"}'

# Test STATUS command
curl -X POST http://localhost:3001/api/webhooks/twilio-sms/test \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "message": "STATUS"}'
```

### 7.2 Real SMS Test

1. Make sure ngrok is running
2. Make sure Twilio webhook is configured
3. Send an SMS to your Twilio number:
   ```
   HELP
   ```
4. You should receive a response!

### 7.3 Check Webhook Logs

```bash
# View API logs
docker-compose logs -f api
```

Look for:
```
📨 ═══════════════════════════════════════
📨 INCOMING SMS WEBHOOK
📨 ═══════════════════════════════════════
📱 From: +919876543210
📱 Message: HELP
✅ Response: AgriTrack SMS Booking...
```

---

## 🔒 Production Deployment

For production, you need a public server instead of ngrok:

### Option 1: Deploy API to Cloud

1. Deploy to Railway, Render, or AWS
2. Use your public API URL for Twilio webhook

### Option 2: Use Twilio Functions

Move webhook logic to Twilio Serverless Functions for lower latency.

### Option 3: Custom Domain with ngrok

```bash
# With paid ngrok plan
ngrok http 3001 --domain=agritrack.ngrok.io
```

---

## 📈 Monitoring

### View SMS Statistics

```bash
curl http://localhost:3001/api/webhooks/twilio-sms/stats
```

Response:
```json
{
  "configured": true,
  "active_sessions": 3,
  "daily_stats": [
    {
      "date": "2025-12-08",
      "inbound_count": 45,
      "outbound_count": 45,
      "unique_users": 12,
      "book_commands": 8,
      "status_commands": 15,
      "cancel_commands": 2,
      "invalid_commands": 5
    }
  ]
}
```

---

## 🆘 Troubleshooting

### SMS Not Being Received

1. Check ngrok is running: `ngrok http 3001`
2. Check Twilio webhook URL is correct
3. Check API logs: `docker-compose logs -f api`
4. Verify phone number is verified (trial accounts)

### "You are not registered" Error

The farmer's phone number must exist in `farmer_profiles` table:
```sql
INSERT INTO farmer_profiles (full_name, primary_phone, district)
VALUES ('Test Farmer', '+919876543210', 'Ludhiana');
```

### Webhook Returns 500 Error

1. Check database connection
2. Run the migration: `phase6-sms-booking.sql`
3. Check API logs for detailed error

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| **Webhook URL** | `https://YOUR-NGROK-URL/api/webhooks/twilio-sms` |
| **Test Endpoint** | `POST /api/webhooks/twilio-sms/test` |
| **Stats Endpoint** | `GET /api/webhooks/twilio-sms/stats` |
| **Twilio Console** | https://console.twilio.com |
| **ngrok Dashboard** | https://dashboard.ngrok.com |

---

## ✅ Checklist

- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] `.env` file updated with Twilio credentials
- [ ] Database migration run
- [ ] ngrok installed and running
- [ ] Twilio webhook configured
- [ ] Test SMS sent successfully

---

Need help? Check the API logs or contact support.
