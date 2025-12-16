# 🚜 AgriTrack - Smart CRM Machinery Monitoring Platform

<div align="center">

![Smart India Hackathon 2025](https://img.shields.io/badge/Smart%20India%20Hackathon-2025-orange?style=for-the-badge)
![Problem ID](https://img.shields.io/badge/Problem%20ID-SIH25261-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**A containerized, cloud-agnostic platform for monitoring Crop Residue Management (CRM) machinery with real-time IoT data, AI-powered analytics, and multi-channel notifications.**

[Quick Start](#-quick-start) • [Features](#-features) • [Architecture](#-architecture) • [API Docs](#-api-endpoints) • [Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Services Overview](#-services-overview)
- [API Endpoints](#-api-endpoints)
- [WebSocket Events](#-websocket-events)
- [Environment Variables](#-environment-variables)
- [Development](#-development)
- [Documentation](#-documentation)
- [Team](#-team)

---

## 🌟 Overview

AgriTrack is a comprehensive **IoT-enabled machinery monitoring platform** designed for agricultural crop residue management. The system combines real-time sensor data from physical ESP32 devices with a high-volume simulation engine to demonstrate scalability, powered by AI for anomaly detection and predictive maintenance.

### Key Highlights

- 🔄 **Real-time Monitoring** - Live tracking of 50+ machines via MQTT
- 🤖 **AI-Powered Analytics** - Anomaly detection using Isolation Forest ML
- 📱 **Multi-Platform** - Web dashboard + Android mobile app
- 💬 **WhatsApp Booking** - Natural language machine booking via WhatsApp
- 🌾 **Crop Residue Management** - NDVI-based harvest predictions for Punjab, Haryana, Delhi-NCR
- 🔔 **Multi-Channel Notifications** - SMS (Twilio), Push (Firebase), Email, WhatsApp

---

## ✨ Features

### 🗺️ Real-Time Fleet Tracking
- Live machine positions on interactive Leaflet maps
- Color-coded markers (Active/Idle/Maintenance/Alert)
- Real-time temperature, speed, and vibration monitoring
- Historical charts with 30-point rolling data

### 🤖 AI Analytics & Anomaly Detection
- Machine efficiency scoring
- Isolation Forest ML for anomaly detection
- Predictive maintenance alerts
- Train custom models on your fleet data

### 📱 Mobile App (Android)
- Capacitor + React Native app
- Book machines with one tap
- Real-time booking status
- Green certificates for crop residue management
- Push notifications

### 💬 WhatsApp Booking System
- Natural language booking: *"Book Tractor on 15-12-2025 for 5 acres"*
- Auto farmer registration
- Commands: `HELP`, `LIST`, `MY BOOKINGS`, `BOOK`
- Instant confirmations

### 🌾 Crop Residue Management
- NDVI-based harvest predictions
- Optimized machine allocation (greedy algorithm)
- Priority scoring for urgent districts
- Interactive NDVI history charts

### ⭐ Farmer Feedback System
- Approval-based work completion
- 5-star rating with detailed categories
- Operator reputation scores
- Work rejection workflow

### 🔔 Multi-Channel Notifications
| Channel | Provider | Use Case |
|---------|----------|----------|
| SMS | Twilio | Critical alerts |
| Push | Firebase | Mobile notifications |
| WhatsApp | Green API | Booking updates |
| Email | SMTP | Reports & summaries |

### Additional Features
- 🗺️ **Geofencing** - Define operational boundaries with breach detection
- ⛽ **Fuel Tracking** - Real-time consumption, theft detection, efficiency analytics
- 🔧 **Maintenance Scheduling** - Automated reminders, recurring schedules
- 📊 **Live Reports** - Export fleet statistics as JSON

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend (Web)** | Next.js 14, Tailwind CSS, shadcn/ui, Leaflet, Recharts |
| **Frontend (Mobile)** | Capacitor 7, React 19, Vite, TypeScript |
| **Backend API** | Node.js, Express, Socket.io |
| **AI/ML Engine** | Python, FastAPI, Scikit-learn, Pandas, NumPy |
| **Crop Advisor** | LangChain, Groq LLM |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Clerk |
| **IoT Protocol** | MQTT (Eclipse Mosquitto) |
| **Containerization** | Docker, Docker Compose |
| **Notifications** | Twilio, Firebase Admin, Green API |

---

## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended)
- [Node.js 20+](https://nodejs.org/) (for local development)
- [Python 3.11+](https://python.org/) (for AI services)
- [Supabase Account](https://supabase.com/) (free tier)
- [Clerk Account](https://clerk.com/) (authentication)

### 1. Clone & Configure

```bash
git clone https://github.com/KD-3030/AgriTrack.git
cd AgriTrack
cp .env.example .env
```

Edit `.env` with your credentials (see [Environment Variables](#-environment-variables)).

### 2. Setup Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Navigate to **SQL Editor**
4. Run the following schema files in order:
   - `database/schema.sql` (core tables)
   - `database/phase2-migration.sql` (notifications, geofencing)
   - `database/phase3-farmers.sql` (farmer management)
   - `database/phase4-scheduling.sql` (scheduling)
   - `database/phase5-green-marketplace.sql` (marketplace)
   - `database/phase6-feedback.sql` (feedback system)

### 3. Run with Docker (Recommended)

```bash
# Start all 6 services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### 4. Access the Application

| Service | URL | Description |
|---------|-----|-------------|
| 🖥️ Admin Dashboard | http://localhost:3000 | Next.js web dashboard |
| 🔌 API Server | http://localhost:3001 | Express + Socket.io backend |
| 🤖 AI Engine | http://localhost:8000/docs | FastAPI ML service (Swagger UI) |
| 🌾 Crop Residue API | http://localhost:8001/docs | NDVI prediction (Swagger UI) |
| 📡 MQTT Broker | mqtt://localhost:1883 | Mosquitto broker |
| 🔗 MQTT WebSocket | ws://localhost:9001 | WebSocket for MQTT |

---

## 📁 Project Structure

```
AgriTrack/
├── apps/
│   ├── web/                      # 🖥️ Next.js Admin Dashboard
│   │   └── src/
│   │       ├── app/
│   │       │   ├── dashboard/    # Main dashboard
│   │       │   │   ├── machines/ # Machine list & details
│   │       │   │   ├── analytics/# AI analytics
│   │       │   │   ├── reports/  # Live usage reports
│   │       │   │   ├── bookings/ # Booking management
│   │       │   │   └── scheduling/# Machine scheduling
│   │       │   ├── crop-residue/ # NDVI-based management
│   │       │   ├── farmer/       # Farmer portal
│   │       │   └── booking/      # Booking flow
│   │       ├── components/       # Reusable UI components
│   │       └── lib/              # API clients & utilities
│   │
│   ├── mobile/                   # 📱 Capacitor Mobile App
│   │   ├── src/pages/
│   │   │   ├── HomePage.tsx      # Dashboard
│   │   │   ├── BookingsPage.tsx  # Booking management
│   │   │   ├── MachinesPage.tsx  # Available machines
│   │   │   ├── MarketplacePage.tsx # Green marketplace
│   │   │   └── ProfilePage.tsx   # User profile
│   │   └── android/              # Android native project
│   │
│   └── api/                      # 🔌 Node.js Central Backend
│       └── src/
│           ├── routes/
│           │   ├── machines.js   # Machine CRUD
│           │   ├── bookings.js   # Booking management
│           │   ├── analytics.js  # Dashboard analytics
│           │   ├── farmers.js    # Farmer management
│           │   ├── feedback.js   # Rating system
│           │   ├── fuel.js       # Fuel tracking
│           │   ├── geofence.js   # Geofencing
│           │   ├── maintenance.js# Maintenance schedules
│           │   ├── notifications.js # Multi-channel alerts
│           │   └── whatsapp.js   # WhatsApp integration
│           ├── services/         # Business logic
│           └── utils/            # Helper functions
│
├── services/
│   ├── ai-engine/                # 🤖 Python ML (FastAPI)
│   │   └── main.py               # Anomaly detection, efficiency
│   ├── crop-residue/             # 🌾 NDVI Prediction (FastAPI)
│   │   ├── harvest_predictor.py  # Harvest timing predictions
│   │   ├── machine_allocator.py  # Optimal allocation
│   │   └── server.py             # API endpoints
│   ├── crop-advisor/             # 🌱 LLM Crop Advisor
│   │   └── crop_advisor.py       # LangChain + Groq
│   ├── mqtt-broker/              # 📡 Mosquitto Config
│   └── simulator/                # 🎮 IoT Simulator (50 tractors)
│
├── database/
│   ├── schema.sql                # Core database schema
│   ├── phase2-migration.sql      # Notifications, geofencing
│   ├── phase3-farmers.sql        # Farmer tables
│   ├── phase4-scheduling.sql     # Scheduling tables
│   ├── phase5-green-marketplace.sql # Marketplace
│   └── phase6-feedback.sql       # Feedback system
│
├── docs/                         # 📚 Documentation
├── docker-compose.yml            # 🐳 All services orchestrated
└── PRD.md                        # 📋 Product Requirements
```

---

## 🔧 Services Overview

| Service | Port | Technology | Description |
|---------|------|------------|-------------|
| **web** | 3000 | Next.js 14, Tailwind | Admin dashboard with real-time maps, charts |
| **api** | 3001 | Express, Socket.io | Central API, MQTT bridge, WebSocket hub |
| **ai-engine** | 8000 | FastAPI, Scikit-learn | Anomaly detection, efficiency metrics |
| **crop-residue** | 8001 | FastAPI, Pandas | NDVI predictions, machine allocation |
| **mqtt-broker** | 1883, 9001 | Mosquitto | IoT message broker |
| **simulator** | - | Python | Generates 50 virtual tractors |

---

## 📡 API Endpoints

### Central API (Port 3001)

#### Core Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/machines` | List all machines |
| GET | `/api/v1/machines/:id` | Get machine details |
| GET | `/api/v1/machines/realtime/all` | Get all real-time states |
| POST | `/api/v1/bookings` | Create booking |
| GET | `/api/v1/bookings/farmer/:id` | Get farmer's bookings |
| GET | `/api/v1/analytics` | Dashboard stats |
| POST | `/api/v1/auth/webhook` | Clerk webhook |

#### Notifications API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications/preferences/:userId` | Get user preferences |
| POST | `/api/v1/notifications/preferences` | Save preferences |
| POST | `/api/v1/notifications/push-token` | Register push token |
| POST | `/api/v1/notifications/send` | Send notification (admin) |

#### Geofencing API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/geofences` | List all geofences |
| POST | `/api/v1/geofences` | Create geofence |
| GET | `/api/v1/geofences/:id/breaches` | Get breach history |

#### Fuel Tracking API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/fuel/:machineId` | Get fuel stats |
| GET | `/api/v1/fuel/fleet/summary` | Fleet fuel summary |
| POST | `/api/v1/fuel/:machineId/refueling` | Record refueling |

#### Maintenance API
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/upcoming` | Upcoming maintenance |
| GET | `/api/v1/maintenance/overdue` | Overdue maintenance |
| POST | `/api/v1/maintenance/:id/complete` | Complete maintenance |

#### Feedback API
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/feedback` | Submit feedback |
| GET | `/api/v1/feedback/operator/:id/summary` | Operator rating summary |

### AI Engine (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/stats` | All machine statistics |
| GET | `/efficiency` | Efficiency metrics |
| GET | `/anomalies` | Detected anomalies |
| POST | `/train` | Train ML model |

### Crop Residue API (Port 8001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard` | Complete dashboard data |
| GET | `/api/predictions` | Harvest predictions |
| GET | `/api/allocations` | Machine allocations |
| GET | `/api/urgent` | Urgent districts (priority ≥7) |
| GET | `/api/ndvi-history/{district_id}` | NDVI history |

---

## 🔌 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `device_update` | Server → Client | Real-time machine state |
| `booking_update` | Server → Client | Booking status change |
| `initial_state` | Server → Client | All machines on connect |
| `alert` | Server → Client | Critical alerts |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# ===================
# Supabase (Required)
# ===================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# ===================
# Clerk Authentication (Required)
# ===================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# ===================
# API URLs
# ===================
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_AI_ENGINE_URL=http://localhost:8000
NEXT_PUBLIC_CROP_RESIDUE_URL=http://localhost:8001

# ===================
# Simulator Settings
# ===================
NUM_MACHINES=50
PUBLISH_INTERVAL=5.0

# ===================
# Twilio SMS (Optional)
# ===================
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
SMS_ENABLED=false

# ===================
# Firebase Push (Optional)
# ===================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# ===================
# WhatsApp (Optional)
# ===================
WHATSAPP_PROVIDER=whatsapp-web
GREEN_API_ID=your-green-api-id
GREEN_API_TOKEN=your-green-api-token
```

---

## 💻 Development

### Run Without Docker

#### API Server
```bash
cd apps/api
npm install
npm run dev
```

#### Web Dashboard
```bash
cd apps/web
npm install
npm run dev
```

#### Mobile App
```bash
cd apps/mobile
npm install
npm run dev
# For Android: npx cap run android
```

#### AI Engine
```bash
cd services/ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Crop Residue Service
```bash
cd services/crop-residue
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

#### IoT Simulator
```bash
cd services/simulator
pip install -r requirements.txt
python simulator.py
```

### NPM Scripts

```bash
# Install all dependencies
npm run install:all

# Run web dashboard
npm run dev:web

# Run API server
npm run dev:api

# Docker commands
npm run docker:up
npm run docker:down
npm run docker:logs
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [PRD.md](PRD.md) | Product Requirements Document |
| [WHATSAPP_SETUP.md](WHATSAPP_SETUP.md) | WhatsApp integration guide |
| [WHATSAPP_FLOW.md](WHATSAPP_FLOW.md) | WhatsApp booking flow diagram |
| [WHATSAPP_QUICK_START.md](WHATSAPP_QUICK_START.md) | Quick WhatsApp setup |
| [TWILIO_WHATSAPP_SETUP.md](TWILIO_WHATSAPP_SETUP.md) | Twilio WhatsApp setup |
| [SMS_BOOKING_SETUP.md](docs/SMS_BOOKING_SETUP.md) | SMS booking configuration |
| [WHATSAPP_BOT_COMMANDS.md](docs/WHATSAPP_BOT_COMMANDS.md) | Bot command reference |
| [VISUAL_FLOW.md](VISUAL_FLOW.md) | System visual flow |

---

## 👥 Team

| Squad | Members | Responsibilities |
|-------|---------|------------------|
| **A** | 1, 2 | DevOps, Dashboard, Authentication |
| **B** | 3, 4 | Backend API, AI Engine, SMS Integration |
| **C** | 5, 6 | Mobile App, IoT Simulator |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ for **Smart India Hackathon 2025**

[![GitHub](https://img.shields.io/badge/GitHub-KD--3030-black?style=flat-square&logo=github)](https://github.com/KD-3030/AgriTrack)

</div>

