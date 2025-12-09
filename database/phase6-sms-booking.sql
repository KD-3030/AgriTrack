-- =====================================================
-- PHASE 6: SMS-BASED BOOKING SYSTEM
-- Enables farmers with feature phones to book machinery via SMS
-- Run this migration after phase5-green-marketplace.sql
-- =====================================================

-- =====================================================
-- SMS BOOKING SESSIONS
-- Track ongoing SMS conversations for multi-step flows
-- =====================================================
CREATE TABLE IF NOT EXISTS sms_booking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  farmer_id UUID REFERENCES farmer_profiles(id) ON DELETE SET NULL,
  
  -- Session state
  session_state VARCHAR(50) DEFAULT 'idle' CHECK (session_state IN (
    'idle',
    'awaiting_date',
    'awaiting_confirmation',
    'awaiting_field_selection',
    'completed',
    'expired'
  )),
  
  -- Temporary booking data during conversation
  pending_date DATE,
  pending_machine_id UUID REFERENCES machines(id),
  pending_field_id UUID REFERENCES farmer_fields(id),
  pending_acres DECIMAL(10, 2),
  
  -- Alternative suggestions
  suggested_dates JSONB, -- Array of alternative dates if requested date unavailable
  
  -- Session management
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SMS BOOKING LOGS
-- Complete audit trail of all SMS interactions
-- =====================================================
CREATE TABLE IF NOT EXISTS sms_booking_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Message details
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone_number VARCHAR(20) NOT NULL,
  message_body TEXT NOT NULL,
  
  -- Parsed command (for inbound)
  parsed_command VARCHAR(50),
  parsed_params JSONB,
  
  -- Twilio metadata
  twilio_sid VARCHAR(100),
  twilio_status VARCHAR(50),
  
  -- Linking
  farmer_id UUID REFERENCES farmer_profiles(id),
  booking_id UUID REFERENCES bookings(id),
  session_id UUID REFERENCES sms_booking_sessions(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BOOKING OTP CODES
-- Store OTPs for SMS booking verification
-- =====================================================
CREATE TABLE IF NOT EXISTS booking_otps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  otp_code VARCHAR(6) NOT NULL,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_active_otp UNIQUE (booking_id, otp_code)
);

-- =====================================================
-- EXTEND BOOKINGS TABLE
-- Add SMS-specific fields (if not exists)
-- =====================================================
DO $$ 
BEGIN
  -- Add booking_source column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'booking_source') THEN
    ALTER TABLE bookings ADD COLUMN booking_source VARCHAR(20) DEFAULT 'web' 
      CHECK (booking_source IN ('web', 'mobile', 'sms', 'call_center'));
  END IF;
  
  -- Add otp_verified column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'otp_verified') THEN
    ALTER TABLE bookings ADD COLUMN otp_verified BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Add sms_session_id column if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'sms_session_id') THEN
    ALTER TABLE bookings ADD COLUMN sms_session_id UUID REFERENCES sms_booking_sessions(id);
  END IF;
END $$;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sms_sessions_phone ON sms_booking_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_sessions_active ON sms_booking_sessions(phone_number, session_state) 
  WHERE session_state NOT IN ('completed', 'expired');
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON sms_booking_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_booking_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_otps_code ON booking_otps(otp_code) WHERE NOT verified;

-- =====================================================
-- FUNCTION: Generate unique 4-digit OTP
-- =====================================================
CREATE OR REPLACE FUNCTION generate_booking_otp()
RETURNS VARCHAR(4) AS $$
DECLARE
  new_otp VARCHAR(4);
  otp_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 4-digit number (1000-9999)
    new_otp := LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0');
    
    -- Check if OTP exists in active (unverified, unexpired) bookings
    SELECT EXISTS(
      SELECT 1 FROM booking_otps 
      WHERE otp_code = new_otp 
        AND NOT verified 
        AND expires_at > NOW()
    ) INTO otp_exists;
    
    EXIT WHEN NOT otp_exists;
  END LOOP;
  
  RETURN new_otp;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Clean up expired sessions
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sms_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sms_booking_sessions 
  SET session_state = 'expired'
  WHERE session_state NOT IN ('completed', 'expired')
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEW: Active SMS Sessions
-- =====================================================
CREATE OR REPLACE VIEW v_active_sms_sessions AS
SELECT 
  s.*,
  fp.full_name as farmer_name,
  fp.district,
  m.name as pending_machine_name,
  m.type as pending_machine_type
FROM sms_booking_sessions s
LEFT JOIN farmer_profiles fp ON fp.id = s.farmer_id
LEFT JOIN machines m ON m.id = s.pending_machine_id
WHERE s.session_state NOT IN ('completed', 'expired')
  AND s.expires_at > NOW();

-- =====================================================
-- VIEW: SMS Booking Statistics
-- =====================================================
CREATE OR REPLACE VIEW v_sms_booking_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_count,
  COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_count,
  COUNT(DISTINCT phone_number) as unique_users,
  COUNT(*) FILTER (WHERE parsed_command = 'BOOK') as book_commands,
  COUNT(*) FILTER (WHERE parsed_command = 'STATUS') as status_commands,
  COUNT(*) FILTER (WHERE parsed_command = 'CANCEL') as cancel_commands,
  COUNT(*) FILTER (WHERE parsed_command = 'INVALID') as invalid_commands
FROM sms_booking_logs
WHERE direction = 'inbound'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =====================================================
-- GRANT PERMISSIONS (if using RLS)
-- =====================================================
-- ALTER TABLE sms_booking_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sms_booking_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE booking_otps ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE sms_booking_sessions IS 'Tracks SMS conversation state for multi-step booking flows';
COMMENT ON TABLE sms_booking_logs IS 'Complete audit trail of all SMS interactions';
COMMENT ON TABLE booking_otps IS 'OTP codes for SMS booking verification';
