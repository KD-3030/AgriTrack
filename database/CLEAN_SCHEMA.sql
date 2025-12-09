-- =====================================================
-- AgriTrack Database Schema (Cleaned Version)
-- Only contains actively used tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (synced from Clerk)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'farmer' CHECK (role IN ('farmer', 'admin', 'operator')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Machines table
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'tractor', 'harvester', 'baler', 'happy_seeder', etc.
  model VARCHAR(255),
  owner_id UUID REFERENCES users(id),
  district VARCHAR(255),
  state VARCHAR(255),
  status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'offline')),
  last_location JSONB, -- { lat, lng }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FARMER TABLES
-- =====================================================

-- Farmer Profiles (Enhanced user data for farmers)
CREATE TABLE farmer_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  -- Personal Info
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  alternate_phone VARCHAR(20),
  email VARCHAR(255),
  profile_image_url TEXT,
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  village VARCHAR(255),
  district VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  pincode VARCHAR(10),
  -- Identification
  aadhaar_number VARCHAR(12),
  pan_number VARCHAR(10),
  -- Farming Info
  farming_experience_years INTEGER DEFAULT 0,
  primary_crops TEXT[],
  -- Preferences
  preferred_language VARCHAR(50) DEFAULT 'hindi',
  notification_language VARCHAR(50) DEFAULT 'hindi',
  -- Status
  is_verified BOOLEAN DEFAULT FALSE,
  verification_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farmer Fields/Farms
CREATE TABLE farmer_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  area_acres DECIMAL(10, 2) NOT NULL,
  village VARCHAR(255),
  district VARCHAR(255),
  state VARCHAR(255),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  boundary_coords JSONB,
  soil_type VARCHAR(100),
  irrigation_type VARCHAR(100),
  current_crop VARCHAR(100),
  last_harvest_date DATE,
  next_sowing_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BOOKING TABLES
-- =====================================================

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  farmer_id UUID REFERENCES farmer_profiles(id),
  scheduled_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  acres_covered DECIMAL(10, 2),
  booking_source VARCHAR(20) DEFAULT 'web' CHECK (booking_source IN ('web', 'mobile', 'sms', 'whatsapp', 'call_center')),
  otp_verified BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Booking OTP Codes
CREATE TABLE booking_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_active_otp UNIQUE (booking_id, otp_code)
);

-- SMS Booking Sessions
CREATE TABLE sms_booking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE SET NULL,
  session_state VARCHAR(50) DEFAULT 'idle' CHECK (session_state IN (
    'idle', 'awaiting_date', 'awaiting_confirmation', 'awaiting_field_selection', 'completed', 'expired'
  )),
  pending_date DATE,
  pending_machine_id UUID REFERENCES machines(id),
  pending_field_id UUID REFERENCES farmer_fields(id),
  pending_acres DECIMAL(10, 2),
  suggested_dates JSONB,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Booking Logs
CREATE TABLE sms_booking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,
  parsed_command VARCHAR(50),
  parsed_params JSONB,
  twilio_sid VARCHAR(100),
  twilio_status VARCHAR(50),
  farmer_id UUID REFERENCES farmer_profiles(id),
  booking_id UUID REFERENCES bookings(id),
  session_id UUID REFERENCES sms_booking_sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SENSOR & TELEMETRY TABLES
-- =====================================================

-- Sensor logs table (time-series data)
CREATE TABLE sensor_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  device_id VARCHAR(100) NOT NULL,
  temperature DECIMAL(5, 2),
  vibration_x DECIMAL(10, 6),
  vibration_y DECIMAL(10, 6),
  vibration_z DECIMAL(10, 6),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  speed DECIMAL(6, 2),
  state VARCHAR(50),
  alerts JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUEL & MAINTENANCE TABLES
-- =====================================================

-- Fuel logs table
CREATE TABLE fuel_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  fuel_level DECIMAL(5, 2) NOT NULL,
  previous_level DECIMAL(5, 2),
  consumption_rate DECIMAL(8, 4),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  engine_hours DECIMAL(10, 2),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Refueling events table
CREATE TABLE refueling_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  amount_liters DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  odometer_reading DECIMAL(10, 2),
  engine_hours DECIMAL(10, 2),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance schedules table
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  maintenance_type VARCHAR(100) NOT NULL,
  due_date DATE,
  due_mileage DECIMAL(10, 2),
  due_hours DECIMAL(10, 2),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'overdue')),
  notes TEXT,
  estimated_cost DECIMAL(10, 2),
  actual_cost DECIMAL(10, 2),
  assigned_to UUID REFERENCES users(id),
  completed_date TIMESTAMPTZ,
  recurring_interval_days INTEGER,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance history table
CREATE TABLE maintenance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id UUID REFERENCES machines(id) NOT NULL,
  schedule_id UUID REFERENCES maintenance_schedules(id),
  maintenance_type VARCHAR(100) NOT NULL,
  completed_date TIMESTAMPTZ NOT NULL,
  performed_by VARCHAR(255),
  cost DECIMAL(10, 2),
  notes TEXT,
  parts_replaced JSONB,
  mileage_at_service DECIMAL(10, 2),
  hours_at_service DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GEOFENCE TABLES
-- =====================================================

-- Geofences table
CREATE TABLE geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('circle', 'polygon')),
  center_lat DECIMAL(10, 7),
  center_lng DECIMAL(10, 7),
  radius_meters DECIMAL(10, 2),
  polygon_coords JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Geofence machine assignments
CREATE TABLE geofence_machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(geofence_id, machine_id)
);

-- Geofence breach logs
CREATE TABLE geofence_breaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  geofence_id UUID REFERENCES geofences(id),
  machine_id UUID REFERENCES machines(id),
  breach_type VARCHAR(20) CHECK (breach_type IN ('entered', 'exited')),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATION TABLES
-- =====================================================

-- Notification Preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  sms_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, alert_type)
);

-- Push tokens table (for Firebase)
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  token TEXT NOT NULL,
  device_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Core indexes
CREATE INDEX idx_machines_status ON machines(status);
CREATE INDEX idx_machines_district ON machines(district);
CREATE INDEX idx_bookings_farmer_id ON bookings(farmer_id);
CREATE INDEX idx_bookings_machine_id ON bookings(machine_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX idx_sensor_logs_machine_id ON sensor_logs(machine_id);
CREATE INDEX idx_sensor_logs_timestamp ON sensor_logs(timestamp DESC);
CREATE INDEX idx_alerts_machine_id ON alerts(machine_id);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Farmer indexes
CREATE INDEX idx_farmer_profiles_phone ON farmer_profiles(phone);
CREATE INDEX idx_farmer_profiles_district ON farmer_profiles(district);
CREATE INDEX idx_farmer_fields_farmer_id ON farmer_fields(farmer_id);

-- SMS indexes
CREATE INDEX idx_sms_sessions_phone ON sms_booking_sessions(phone_number);
CREATE INDEX idx_sms_logs_phone ON sms_booking_logs(phone_number);
CREATE INDEX idx_booking_otps_code ON booking_otps(otp_code) WHERE NOT verified;

-- Other indexes
CREATE INDEX idx_fuel_logs_machine_id ON fuel_logs(machine_id);
CREATE INDEX idx_maintenance_schedules_machine_id ON maintenance_schedules(machine_id);
CREATE INDEX idx_geofences_owner_id ON geofences(owner_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_booking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_booking_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refueling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_breaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Service role policies (full access for backend)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON machines FOR ALL USING (true);
CREATE POLICY "Service role full access" ON bookings FOR ALL USING (true);
CREATE POLICY "Service role full access" ON farmer_profiles FOR ALL USING (true);
CREATE POLICY "Service role full access" ON farmer_fields FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sensor_logs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON alerts FOR ALL USING (true);
CREATE POLICY "Service role full access" ON booking_otps FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sms_booking_sessions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON sms_booking_logs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON fuel_logs FOR ALL USING (true);
CREATE POLICY "Service role full access" ON refueling_events FOR ALL USING (true);
CREATE POLICY "Service role full access" ON maintenance_schedules FOR ALL USING (true);
CREATE POLICY "Service role full access" ON maintenance_history FOR ALL USING (true);
CREATE POLICY "Service role full access" ON geofences FOR ALL USING (true);
CREATE POLICY "Service role full access" ON geofence_machines FOR ALL USING (true);
CREATE POLICY "Service role full access" ON geofence_breaches FOR ALL USING (true);
CREATE POLICY "Service role full access" ON notification_preferences FOR ALL USING (true);
CREATE POLICY "Service role full access" ON push_tokens FOR ALL USING (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER machines_updated_at BEFORE UPDATE ON machines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER farmer_profiles_updated_at BEFORE UPDATE ON farmer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER farmer_fields_updated_at BEFORE UPDATE ON farmer_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER maintenance_schedules_updated_at BEFORE UPDATE ON maintenance_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER geofences_updated_at BEFORE UPDATE ON geofences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- OTP GENERATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_booking_otp()
RETURNS VARCHAR(4) AS $$
DECLARE
  new_otp VARCHAR(4);
  otp_exists BOOLEAN;
BEGIN
  LOOP
    new_otp := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    SELECT EXISTS(
      SELECT 1 FROM booking_otps 
      WHERE otp_code = new_otp AND NOT verified AND expires_at > NOW()
    ) INTO otp_exists;
    EXIT WHEN NOT otp_exists;
  END LOOP;
  RETURN new_otp;
END;
$$ LANGUAGE plpgsql;
