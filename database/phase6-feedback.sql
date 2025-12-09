-- Phase 6: Farmer Feedback System
-- Allows farmers to rate and review operators after booking completion

-- Feedback/Reviews table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  farmer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  operator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  machine_id UUID REFERENCES machines(id) ON DELETE SET NULL,
  
  -- Approval status (farmer says "okay" or not)
  approved BOOLEAN NOT NULL DEFAULT false, -- true = work completed, false = needs redo
  rejection_reason TEXT, -- Why work was rejected
  
  -- Rating (1-5 stars) - only if approved
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  
  -- Review categories
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  timeliness INTEGER CHECK (timeliness >= 1 AND timeliness <= 5),
  machine_condition INTEGER CHECK (machine_condition >= 1 AND machine_condition <= 5),
  operator_behavior INTEGER CHECK (operator_behavior >= 1 AND operator_behavior <= 5),
  
  -- Written feedback
  review_text TEXT,
  
  -- Additional info
  would_recommend BOOLEAN DEFAULT true,
  work_quality VARCHAR(50) CHECK (work_quality IN ('excellent', 'good', 'average', 'poor')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one feedback per booking
  UNIQUE(booking_id)
);

-- Operator ratings summary (materialized view for performance)
CREATE TABLE IF NOT EXISTS operator_ratings (
  operator_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_bookings INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  avg_service_quality DECIMAL(3, 2) DEFAULT 0,
  avg_timeliness DECIMAL(3, 2) DEFAULT 0,
  avg_machine_condition DECIMAL(3, 2) DEFAULT 0,
  avg_operator_behavior DECIMAL(3, 2) DEFAULT 0,
  recommendation_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage
  five_star_count INTEGER DEFAULT 0,
  four_star_count INTEGER DEFAULT 0,
  three_star_count INTEGER DEFAULT 0,
  two_star_count INTEGER DEFAULT 0,
  one_star_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_booking_id ON feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_feedback_farmer_id ON feedback(farmer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_operator_id ON feedback(operator_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Function to update operator ratings automatically
CREATE OR REPLACE FUNCTION update_operator_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate ratings for the operator
  INSERT INTO operator_ratings (
    operator_id,
    total_reviews,
    average_rating,
    avg_service_quality,
    avg_timeliness,
    avg_machine_condition,
    avg_operator_behavior,
    recommendation_rate,
    five_star_count,
    four_star_count,
    three_star_count,
    two_star_count,
    one_star_count,
    updated_at
  )
  SELECT
    NEW.operator_id,
    COUNT(*) as total_reviews,
    ROUND(AVG(rating)::numeric, 2) as average_rating,
    ROUND(AVG(service_quality)::numeric, 2) as avg_service_quality,
    ROUND(AVG(timeliness)::numeric, 2) as avg_timeliness,
    ROUND(AVG(machine_condition)::numeric, 2) as avg_machine_condition,
    ROUND(AVG(operator_behavior)::numeric, 2) as avg_operator_behavior,
    ROUND((COUNT(*) FILTER (WHERE would_recommend = true)::float / COUNT(*) * 100)::numeric, 2) as recommendation_rate,
    COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
    COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
    COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
    COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
    COUNT(*) FILTER (WHERE rating = 1) as one_star_count,
    NOW() as updated_at
  FROM feedback
  WHERE operator_id = NEW.operator_id
  ON CONFLICT (operator_id) DO UPDATE SET
    total_reviews = EXCLUDED.total_reviews,
    average_rating = EXCLUDED.average_rating,
    avg_service_quality = EXCLUDED.avg_service_quality,
    avg_timeliness = EXCLUDED.avg_timeliness,
    avg_machine_condition = EXCLUDED.avg_machine_condition,
    avg_operator_behavior = EXCLUDED.avg_operator_behavior,
    recommendation_rate = EXCLUDED.recommendation_rate,
    five_star_count = EXCLUDED.five_star_count,
    four_star_count = EXCLUDED.four_star_count,
    three_star_count = EXCLUDED.three_star_count,
    two_star_count = EXCLUDED.two_star_count,
    one_star_count = EXCLUDED.one_star_count,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update operator ratings when feedback is added/updated
CREATE TRIGGER trigger_update_operator_ratings
AFTER INSERT OR UPDATE ON feedback
FOR EACH ROW
EXECUTE FUNCTION update_operator_ratings();

-- Function to check if feedback can be submitted (booking must be completed)
CREATE OR REPLACE FUNCTION can_submit_feedback(p_booking_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  booking_status VARCHAR(50);
BEGIN
  SELECT status INTO booking_status
  FROM bookings
  WHERE id = p_booking_id;
  
  RETURN booking_status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Add feedback_submitted flag to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS feedback_submitted BOOLEAN DEFAULT false;

-- Update feedback_submitted when feedback is created
CREATE OR REPLACE FUNCTION mark_booking_feedback_submitted()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bookings
  SET feedback_submitted = true
  WHERE id = NEW.booking_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_feedback_submitted
AFTER INSERT ON feedback
FOR EACH ROW
EXECUTE FUNCTION mark_booking_feedback_submitted();

-- Sample data for testing (optional)
-- INSERT INTO feedback (booking_id, farmer_id, operator_id, machine_id, rating, service_quality, timeliness, machine_condition, operator_behavior, review_text, would_recommend, work_quality)
-- VALUES (
--   'booking-uuid-here',
--   'farmer-uuid-here',
--   'operator-uuid-here',
--   'machine-uuid-here',
--   5,
--   5,
--   5,
--   4,
--   5,
--   'Excellent service! The operator was professional and completed the work on time.',
--   true,
--   'excellent'
-- );

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT ON feedback TO authenticated;
-- GRANT SELECT ON operator_ratings TO authenticated;
