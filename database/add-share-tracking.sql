-- Add Share Tracking Tables
-- This migration adds tables to track poll sharing analytics

-- Create shares table to track sharing events
CREATE TABLE IF NOT EXISTS shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  poll_title TEXT NOT NULL, -- Store poll title at time of share for analytics
  share_type TEXT NOT NULL CHECK (share_type IN ('link', 'qr', 'social', 'email')),
  platform TEXT NOT NULL, -- 'clipboard', 'twitter', 'facebook', 'linkedin', 'whatsapp', 'download', etc.
  shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous shares
  user_agent TEXT, -- Browser/device info
  ip_address INET, -- IP address for geographic analytics
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create share_analytics table for aggregated share metrics
CREATE TABLE IF NOT EXISTS share_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE UNIQUE,
  total_shares INTEGER DEFAULT 0,
  shares_by_type JSONB DEFAULT '{}', -- {"link": 5, "qr": 2, "social": 8}
  shares_by_platform JSONB DEFAULT '{}', -- {"twitter": 3, "facebook": 2, "clipboard": 5}
  unique_sharers INTEGER DEFAULT 0,
  last_share_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for shares table
-- Allow authenticated users to view their own shares
CREATE POLICY "Users can view their own shares" ON shares
  FOR SELECT USING (auth.uid() = shared_by);

-- Allow anyone to create share records (for anonymous sharing)
CREATE POLICY "Anyone can create share records" ON shares
  FOR INSERT WITH CHECK (true);

-- Create policies for share_analytics table
-- Allow read access to share analytics
CREATE POLICY "Users can view share analytics" ON share_analytics
  FOR SELECT USING (true);

-- Create function to update share analytics when a share is recorded
CREATE OR REPLACE FUNCTION update_share_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update share analytics for the poll
  INSERT INTO share_analytics (poll_id, total_shares, shares_by_type, shares_by_platform, unique_sharers, last_share_at, updated_at)
  VALUES (
    NEW.poll_id,
    1,
    jsonb_build_object(NEW.share_type, 1),
    jsonb_build_object(NEW.platform, 1),
    CASE WHEN NEW.shared_by IS NOT NULL THEN 1 ELSE 0 END,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (poll_id) DO UPDATE SET
    total_shares = share_analytics.total_shares + 1,
    shares_by_type = share_analytics.shares_by_type ||
      jsonb_build_object(NEW.share_type,
        COALESCE(share_analytics.shares_by_type->>NEW.share_type, '0')::int + 1
      ),
    shares_by_platform = share_analytics.shares_by_platform ||
      jsonb_build_object(NEW.platform,
        COALESCE(share_analytics.shares_by_platform->>NEW.platform, '0')::int + 1
      ),
    unique_sharers = CASE
      WHEN NEW.shared_by IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM shares
        WHERE poll_id = NEW.poll_id AND shared_by = NEW.shared_by
        AND id != NEW.id
      ) THEN share_analytics.unique_sharers + 1
      ELSE share_analytics.unique_sharers
    END,
    last_share_at = GREATEST(share_analytics.last_share_at, NEW.created_at),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update share analytics
CREATE TRIGGER trigger_update_share_analytics
  AFTER INSERT ON shares
  FOR EACH ROW
  EXECUTE FUNCTION update_share_analytics();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shares_poll_id ON shares(poll_id);
CREATE INDEX IF NOT EXISTS idx_shares_shared_by ON shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
CREATE INDEX IF NOT EXISTS idx_shares_type_platform ON shares(share_type, platform);
CREATE INDEX IF NOT EXISTS idx_share_analytics_poll_id ON share_analytics(poll_id);

-- Create function to get share statistics for a poll
CREATE OR REPLACE FUNCTION get_poll_share_stats(poll_uuid UUID)
RETURNS TABLE (
  total_shares bigint,
  shares_by_type jsonb,
  shares_by_platform jsonb,
  unique_sharers bigint,
  last_share_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.total_shares,
    sa.shares_by_type,
    sa.shares_by_platform,
    sa.unique_sharers,
    sa.last_share_at
  FROM share_analytics sa
  WHERE sa.poll_id = poll_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON shares TO anon, authenticated;
GRANT ALL ON share_analytics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_poll_share_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_share_analytics TO anon, authenticated;

-- Add comments for documentation
COMMENT ON TABLE shares IS 'Tracks individual poll sharing events for analytics';
COMMENT ON TABLE share_analytics IS 'Aggregated sharing statistics for each poll';
COMMENT ON FUNCTION get_poll_share_stats IS 'Returns share statistics for a specific poll';
COMMENT ON FUNCTION update_share_analytics IS 'Automatically updates share analytics when shares are recorded';
