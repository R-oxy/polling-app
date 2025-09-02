-- =============================================
-- ALX Polly - Database Schema
-- =============================================
-- This file contains all the SQL commands needed to set up
-- the complete database schema for the polling application
-- 
-- Run this in your Supabase SQL Editor:
-- 1. Go to your Supabase Dashboard
-- 2. Click on "SQL Editor" in the sidebar
-- 3. Create a new query
-- 4. Copy and paste this entire file
-- 5. Click "Run" to execute all commands
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. POLLS TABLE
-- =============================================
-- Stores poll information created by users
CREATE TABLE IF NOT EXISTS polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL CHECK (length(title) >= 3 AND length(title) <= 200),
    description TEXT CHECK (length(description) <= 1000),
    question TEXT NOT NULL CHECK (length(question) >= 5 AND length(question) <= 500),
    options TEXT[] NOT NULL CHECK (array_length(options, 1) >= 2 AND array_length(options, 1) <= 10),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    allow_multiple_votes BOOLEAN DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_is_active ON polls(is_active);
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at);

-- =============================================
-- 2. VOTES TABLE
-- =============================================
-- Stores individual votes for polls
CREATE TABLE IF NOT EXISTS votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL CHECK (option_index >= 0),
    option_text TEXT NOT NULL,
    voter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    voter_ip INET, -- For anonymous voting tracking
    user_agent TEXT, -- For additional anonymous vote validation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_votes_poll_option ON votes(poll_id, option_index);

-- Unique constraint to prevent duplicate votes (can be removed for multiple votes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique_user_poll 
ON votes(poll_id, voter_id) 
WHERE voter_id IS NOT NULL;

-- For anonymous votes, prevent same IP from voting multiple times
CREATE UNIQUE INDEX IF NOT EXISTS idx_votes_unique_ip_poll 
ON votes(poll_id, voter_ip) 
WHERE voter_id IS NULL AND voter_ip IS NOT NULL;

-- =============================================
-- 3. POLL ANALYTICS TABLE (Optional)
-- =============================================
-- Stores aggregated poll statistics for better performance
CREATE TABLE IF NOT EXISTS poll_analytics (
    poll_id UUID PRIMARY KEY REFERENCES polls(id) ON DELETE CASCADE,
    total_votes INTEGER DEFAULT 0,
    unique_voters INTEGER DEFAULT 0,
    option_counts JSONB DEFAULT '{}', -- {"0": 5, "1": 3, "2": 7}
    last_vote_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. POLL SHARES TABLE (Optional)
-- =============================================
-- Track how polls are shared and accessed
CREATE TABLE IF NOT EXISTS poll_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    share_token UUID DEFAULT uuid_generate_v4() UNIQUE,
    shared_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    share_type TEXT CHECK (share_type IN ('link', 'qr', 'email', 'social')),
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_shares_poll_id ON poll_shares(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_shares_token ON poll_shares(share_token);

-- =============================================
-- 5. FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for polls table
DROP TRIGGER IF EXISTS update_polls_updated_at ON polls;
CREATE TRIGGER update_polls_updated_at
    BEFORE UPDATE ON polls
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update poll analytics when votes are added/removed
CREATE OR REPLACE FUNCTION update_poll_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        INSERT INTO poll_analytics (poll_id, total_votes, unique_voters, option_counts, last_vote_at)
        VALUES (NEW.poll_id, 1, 1, jsonb_build_object(NEW.option_index::text, 1), NEW.created_at)
        ON CONFLICT (poll_id) DO UPDATE SET
            total_votes = poll_analytics.total_votes + 1,
            unique_voters = (
                SELECT COUNT(DISTINCT COALESCE(voter_id::text, voter_ip::text))
                FROM votes 
                WHERE poll_id = NEW.poll_id
            ),
            option_counts = (
                SELECT jsonb_object_agg(option_index::text, count)
                FROM (
                    SELECT option_index, COUNT(*) as count
                    FROM votes
                    WHERE poll_id = NEW.poll_id
                    GROUP BY option_index
                ) counts
            ),
            last_vote_at = NEW.created_at,
            updated_at = NOW();
        RETURN NEW;
    END IF;

    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        UPDATE poll_analytics SET
            total_votes = poll_analytics.total_votes - 1,
            unique_voters = (
                SELECT COUNT(DISTINCT COALESCE(voter_id::text, voter_ip::text))
                FROM votes 
                WHERE poll_id = OLD.poll_id
            ),
            option_counts = (
                SELECT COALESCE(jsonb_object_agg(option_index::text, count), '{}')
                FROM (
                    SELECT option_index, COUNT(*) as count
                    FROM votes
                    WHERE poll_id = OLD.poll_id
                    GROUP BY option_index
                ) counts
            ),
            updated_at = NOW()
        WHERE poll_id = OLD.poll_id;
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers for vote analytics
DROP TRIGGER IF EXISTS update_poll_analytics_on_vote_insert ON votes;
CREATE TRIGGER update_poll_analytics_on_vote_insert
    AFTER INSERT ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_analytics();

DROP TRIGGER IF EXISTS update_poll_analytics_on_vote_delete ON votes;
CREATE TRIGGER update_poll_analytics_on_vote_delete
    AFTER DELETE ON votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_analytics();

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_shares ENABLE ROW LEVEL SECURITY;

-- POLLS POLICIES
-- Users can view all active polls
CREATE POLICY "Anyone can view active polls" ON polls
    FOR SELECT USING (is_active = true);

-- Users can view their own polls (even inactive ones)
CREATE POLICY "Users can view own polls" ON polls
    FOR SELECT USING (auth.uid() = created_by);

-- Users can create polls
CREATE POLICY "Authenticated users can create polls" ON polls
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own polls
CREATE POLICY "Users can update own polls" ON polls
    FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own polls
CREATE POLICY "Users can delete own polls" ON polls
    FOR DELETE USING (auth.uid() = created_by);

-- VOTES POLICIES
-- Anyone can view votes for active polls
CREATE POLICY "Anyone can view votes for active polls" ON votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.is_active = true
        )
    );

-- Poll creators can view all votes for their polls
CREATE POLICY "Poll creators can view all votes" ON votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.created_by = auth.uid()
        )
    );

-- Anyone can vote on active polls
CREATE POLICY "Anyone can vote on active polls" ON votes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = votes.poll_id 
            AND polls.is_active = true
            AND (polls.expires_at IS NULL OR polls.expires_at > NOW())
        )
    );

-- Users can delete their own votes (for vote changing)
CREATE POLICY "Users can delete own votes" ON votes
    FOR DELETE USING (auth.uid() = voter_id);

-- POLL ANALYTICS POLICIES
-- Anyone can view analytics for active polls
CREATE POLICY "Anyone can view poll analytics" ON poll_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_analytics.poll_id 
            AND polls.is_active = true
        )
    );

-- Poll creators can view analytics for their polls
CREATE POLICY "Poll creators can view own analytics" ON poll_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_analytics.poll_id 
            AND polls.created_by = auth.uid()
        )
    );

-- POLL SHARES POLICIES
-- Anyone can view share information
CREATE POLICY "Anyone can view poll shares" ON poll_shares
    FOR SELECT USING (true);

-- Poll creators can manage shares for their polls
CREATE POLICY "Poll creators can manage shares" ON poll_shares
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM polls 
            WHERE polls.id = poll_shares.poll_id 
            AND polls.created_by = auth.uid()
        )
    );

-- =============================================
-- 7. HELPFUL VIEWS
-- =============================================

-- View for poll results with vote counts
CREATE OR REPLACE VIEW poll_results AS
SELECT 
    p.id,
    p.title,
    p.question,
    p.options,
    p.created_by,
    p.created_at,
    p.is_active,
    p.expires_at,
    COALESCE(pa.total_votes, 0) as total_votes,
    COALESCE(pa.unique_voters, 0) as unique_voters,
    COALESCE(pa.option_counts, '{}') as option_counts,
    pa.last_vote_at
FROM polls p
LEFT JOIN poll_analytics pa ON p.id = pa.poll_id;

-- View for user's polls with stats
CREATE OR REPLACE VIEW user_polls AS
SELECT 
    p.*,
    COALESCE(pa.total_votes, 0) as total_votes,
    COALESCE(pa.unique_voters, 0) as unique_voters,
    COALESCE(pa.option_counts, '{}') as option_counts
FROM polls p
LEFT JOIN poll_analytics pa ON p.id = pa.poll_id
WHERE p.created_by = auth.uid();

-- =============================================
-- 8. SAMPLE DATA (Optional - for testing)
-- =============================================

-- Uncomment the following lines to add sample data for testing
-- Note: This requires you to have at least one user in auth.users

/*
-- Insert a sample poll (replace 'your-user-id' with actual user ID)
INSERT INTO polls (title, question, options, created_by) VALUES
(
    'Favorite Programming Language',
    'What is your favorite programming language for web development?',
    ARRAY['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust'],
    'your-user-id'
);

-- Insert sample votes (replace poll-id with the actual poll ID)
INSERT INTO votes (poll_id, option_index, option_text, voter_id) VALUES
('poll-id', 0, 'JavaScript', 'user-id-1'),
('poll-id', 1, 'TypeScript', 'user-id-2'),
('poll-id', 0, 'JavaScript', 'user-id-3'),
('poll-id', 2, 'Python', 'user-id-4');
*/

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- Your database schema is now ready!
-- 
-- Next steps:
-- 1. Test the schema by creating a poll through your app
-- 2. Verify RLS policies are working correctly
-- 3. Check that analytics are being updated automatically
-- 
-- Useful queries for testing:
-- SELECT * FROM polls;
-- SELECT * FROM votes;
-- SELECT * FROM poll_analytics;
-- SELECT * FROM poll_results;
-- =============================================
