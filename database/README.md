# Database Setup Guide

## 🚀 Quick Setup

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Open your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Schema**
   - Copy the entire contents of `schema.sql`
   - Paste into the SQL editor
   - Click "Run" button

4. **Verify Setup**
   - Go to "Table Editor" to see your new tables
   - Check that all tables were created successfully

## 📋 What Gets Created

### Tables
- **`polls`** - Stores poll information
- **`votes`** - Individual vote records
- **`poll_analytics`** - Aggregated vote statistics
- **`poll_shares`** - Poll sharing tracking

### Features
- ✅ Row Level Security (RLS) policies
- ✅ Automatic analytics updates
- ✅ Duplicate vote prevention
- ✅ Anonymous voting support
- ✅ Poll expiration handling
- ✅ Optimized indexes for performance

### Security
- Users can only edit their own polls
- Anyone can vote on active polls
- Vote anonymity is preserved
- Proper data validation and constraints

## 🧪 Testing

After setup, test with these queries:

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Test RLS (should return empty if not authenticated)
SELECT * FROM polls;

-- Check triggers are working
SELECT * FROM pg_trigger WHERE tgname LIKE '%poll%';
```

## 🔧 Troubleshooting

If you get errors:
1. Make sure you're running as the project owner
2. Check that UUID extension is enabled
3. Verify your Supabase project has auth enabled

## 📊 Sample Queries

```sql
-- Get poll with vote counts
SELECT * FROM poll_results WHERE id = 'your-poll-id';

-- Get user's polls
SELECT * FROM user_polls;

-- Get vote distribution for a poll
SELECT option_index, option_text, COUNT(*) as votes
FROM votes 
WHERE poll_id = 'your-poll-id'
GROUP BY option_index, option_text
ORDER BY option_index;
```
