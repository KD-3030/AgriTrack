# WhatsApp Booking Flow

```
┌─────────────────┐
│                 │
│     Farmer      │
│  (WhatsApp)     │
│                 │
└────────┬────────┘
         │
         │ 1. Sends message
         │    "Book Tractor on 15-12-2025 for 5 acres"
         │
         ▼
┌─────────────────────────┐
│                         │
│     Green API           │
│   (WhatsApp Gateway)    │
│                         │
└──────────┬──────────────┘
           │
           │ 2. Webhook POST
           │    /api/whatsapp/webhook
           │
           ▼
┌──────────────────────────────────────┐
│                                      │
│       AgriTrack Backend              │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  whatsappHandler.js            │ │
│  │  - Parse message               │ │
│  │  - Route to handler            │ │
│  │  - handleBookingRequest()      │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
│             ▼                        │
│  ┌────────────────────────────────┐ │
│  │  Database (Supabase)           │ │
│  │  - Find/Create farmer          │ │
│  │  - Check machine availability  │ │
│  │  - Create booking              │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
│             ▼                        │
│  ┌────────────────────────────────┐ │
│  │  whatsappService.js            │ │
│  │  - sendBookingConfirmation()   │ │
│  └──────────┬─────────────────────┘ │
│             │                        │
└─────────────┼────────────────────────┘
              │
              │ 3. Send confirmation
              │    via Green API
              │
              ▼
┌─────────────────────────┐
│                         │
│     Green API           │
│   (WhatsApp Gateway)    │
│                         │
└──────────┬──────────────┘
           │
           │ 4. Delivers message
           │
           ▼
┌─────────────────┐
│                 │
│     Farmer      │
│  (WhatsApp)     │
│  ✅ "Booking    │
│     Confirmed!" │
│                 │
└─────────────────┘
```

## Message Flow Examples

### 1. Welcome Message (HELP)
```
Farmer → "Hi"
Bot    → "🚜 Welcome to AgriTrack!
          
          To book a machine, reply with:
          Book [Machine] on [Date] for [Acres] acres at [Location]
          
          Or type:
          📋 LIST - See available machines
          📅 MY BOOKINGS - View your bookings
          ❓ HELP - Get assistance"
```

### 2. List Machines
```
Farmer → "LIST"
Bot    → "🚜 Available Machines:
          
          1. Tractor
             ID: M001
             Status: available
             Rate: ₹800/acre
          
          2. Harvester
             ID: M002
             Status: available
             Rate: ₹1200/acre"
```

### 3. Create Booking
```
Farmer → "Book Tractor on 15-12-2025 for 5 acres at Village Road"
Bot    → "✅ Booking Confirmed!
          
          Booking ID: BK001
          Machine: Tractor
          Date: 15/12/2025
          Acres: 5 acres
          Location: Village Road
          
          Status: CONFIRMED
          
          Thank you for choosing AgriTrack! 🌾"
```

### 4. View Bookings
```
Farmer → "MY BOOKINGS"
Bot    → "📋 Your Bookings:
          
          1. BK001
             Machine: M001
             Date: 15/12/2025
             Status: confirmed
             Location: Village Road"
```

## Architecture Components

### 1. **WhatsApp Service** (`whatsappService.js`)
- Handles all WhatsApp API communication
- Formats phone numbers
- Sends messages (text, confirmations, menus)
- Uses Green API endpoints

### 2. **Message Handler** (`whatsappHandler.js`)
- Parses incoming messages
- Routes to appropriate handlers
- Manages booking logic
- Creates/finds farmers in database
- Validates machine availability

### 3. **Routes** (`routes/whatsapp.js`)
- Webhook endpoint for Green API
- Manual send endpoint for testing
- Status check endpoint
- Test endpoint for simulation

### 4. **Green API**
- Acts as WhatsApp gateway
- No Meta approval needed
- Instant setup via QR code
- Webhook support for incoming messages
- Free tier available

## Key Features

✅ **Auto Farmer Registration** - Creates farmer account on first message  
✅ **Smart Message Parsing** - Understands natural language bookings  
✅ **Machine Availability Check** - Validates before booking  
✅ **Instant Confirmations** - Sends formatted booking details  
✅ **Booking History** - Shows farmer's past bookings  
✅ **Error Handling** - Guides users with helpful error messages  
✅ **Mock Mode** - Works without database for testing  

## Quick Commands Reference

| Command | Handler | Action |
|---------|---------|--------|
| `HI`, `HELLO`, `HELP`, `START` | `handleIncomingMessage` | Shows welcome menu |
| `LIST`, `MACHINES` | `handleListMachines` | Lists available machines |
| `MY BOOKINGS`, `BOOKINGS` | `handleMyBookings` | Shows farmer's bookings |
| `BOOK [details]` | `handleBookingRequest` | Creates new booking |

## Environment Variables

```bash
GREEN_API_INSTANCE_ID=7103123456
GREEN_API_TOKEN=abc123def456ghi789
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/whatsapp/webhook` | Receives Green API webhooks |
| POST | `/api/whatsapp/send` | Send manual message |
| POST | `/api/whatsapp/send-booking-confirmation` | Send booking confirmation |
| GET | `/api/whatsapp/status` | Check configuration |
| POST | `/api/whatsapp/test` | Test with mock webhook |

## Setup Time

- ⏱️ **Green API Account**: 5 minutes
- ⏱️ **Link Phone**: 2 minutes  
- ⏱️ **Configure Backend**: 5 minutes
- ⏱️ **Set Webhook**: 5 minutes
- ⏱️ **Testing**: 5 minutes
- **Total**: ~30 minutes

## Testing Checklist

- [ ] Green API account created
- [ ] Phone linked via QR code
- [ ] Environment variables set
- [ ] axios installed (`npm install`)
- [ ] Server restarted
- [ ] Webhook URL configured
- [ ] Test message sent successfully
- [ ] Booking flow tested
- [ ] Confirmations received

## Next Steps

1. Deploy your backend to Railway/Render
2. Configure webhook with public URL
3. Test with real phone number
4. Share WhatsApp number with farmers
5. Monitor logs for incoming messages
6. Set up proper error alerting for production
