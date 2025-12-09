# 📱 AgriTrack WhatsApp Bot - Commands Reference

## Test User
- **Phone:** +91 9674063935
- **Status:** Authorized for demonstrations

## Available Commands

### 🔹 Basic Commands
| Command | Description | Example |
|---------|-------------|---------|
| `HELP` | Show main menu | HELP |
| `HI` / `HELLO` | Start conversation | HI |
| `LIST` | Show available machines | LIST |

### 🔹 Booking Commands
| Command | Description | Example |
|---------|-------------|---------|
| `BOOK` | Book a machine | `BOOK Tractor on 15-12-2025 for 5 acres at Village Road` |
| `MY BOOKINGS` | View your bookings | MY BOOKINGS |
| `RECEIPT [ID]` | Get booking receipt | `RECEIPT BK12345` |
| `CANCEL [ID]` | Cancel a booking | `CANCEL BK12345` |

### 🔹 Machine Commands
| Command | Description | Example |
|---------|-------------|---------|
| `STATUS` | Show all machines status | STATUS |
| `STATUS [ID]` | Show specific machine status | `STATUS M001` |
| `TRACK [ID]` | Track machine location | `TRACK M001` |

### 🔹 Feedback
| Command | Description | Example |
|---------|-------------|---------|
| `FEEDBACK [msg]` | Submit feedback | `FEEDBACK Great service!` |

## Sample Conversation Flow

```
User: HI
Bot: 🚜 Welcome to AgriTrack! [Shows menu]

User: LIST
Bot: 📋 Available Machines...

User: STATUS
Bot: 📊 All Machines Status...

User: STATUS M001
Bot: 🚜 Machine Status - Tractor Alpha...

User: BOOK Tractor on 20-01-2025 for 3 acres at Main Road
Bot: ✅ Booking Confirmed!

User: RECEIPT BK12345
Bot: 🧾 BOOKING RECEIPT...

User: FEEDBACK Excellent service, very helpful!
Bot: ✅ Feedback Received! Thank you...

User: TRACK M001
Bot: 📍 Machine Location [with Google Maps link]
```

## Technical Setup

### WhatsApp Web Integration
1. Uses **WhatsApp Web.js** (FREE - no API costs)
2. Requires QR code scan for authentication
3. Session persists with LocalAuth

### Starting the Bot
```bash
cd apps/api
npm start
```
- Scan QR code when prompted
- Bot ready when "WhatsApp Web connected" appears

### Testing Commands
```bash
cd apps/api
node send-test-message.js
```

## Response Formats

### Receipt Format
```
╔═══════════════════════════════╗
║    🧾 BOOKING RECEIPT         ║
╠═══════════════════════════════╣
║  Receipt No: BK12345          ║
║  Date: 15/01/2025             ║
╠═══════════════════════════════╣
║  Machine: Tractor Alpha       ║
║  Location: Village Road       ║
║  Land Area: 5 acres           ║
║  Total: ₹4000                 ║
╚═══════════════════════════════╝
```

### Status Format
```
🚜 Machine Status

ID: M001
Name: Tractor Alpha
Status: 🟢 ACTIVE
Fuel Level: 75%
Location: Field A
```

## Status Indicators
- 🟢 Active/Available
- 🟡 Idle
- 🟠 Busy
- 🔴 Maintenance

---
🌾 **AgriTrack - Smart Farming Solutions** | SIH 2025
