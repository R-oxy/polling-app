// Database Types matching our Supabase schema
export interface Poll {
  id: string;
  title: string;
  description?: string;
  question: string;
  options: string[];
  created_by: string;
  is_active: boolean;
  allow_multiple_votes: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_index: number;
  option_text: string;
  voter_id?: string; // Optional for anonymous voting
  voter_ip?: string; // For anonymous vote tracking
  user_agent?: string;
  created_at: string;
}

export interface PollAnalytics {
  poll_id: string;
  total_votes: number;
  unique_voters: number;
  option_counts: Record<string, number>; // {"0": 5, "1": 3, "2": 7}
  last_vote_at?: string;
  updated_at: string;
}

export interface PollResult extends Poll {
  total_votes: number;
  unique_voters: number;
  option_counts: Record<string, number>;
  last_vote_at?: string;
}

export interface PollShare {
  id: string;
  poll_id: string;
  share_token: string;
  shared_by?: string;
  share_type?: 'link' | 'qr' | 'email' | 'social';
  access_count: number;
  created_at: string;
}

// Form Types for creating/editing
export interface CreatePollData {
  title: string;
  description?: string;
  question: string;
  options: string[];
  allow_multiple_votes?: boolean;
  expires_at?: string;
}

export interface CreateVoteData {
  poll_id: string;
  option_index: number;
  option_text: string;
  voter_id?: string;
}

// API Response Types
export interface PollsResponse {
  polls: PollResult[];
  error?: string;
}

export interface PollResponse {
  poll: PollResult;
  error?: string;
}

export interface VoteResponse {
  vote: Vote;
  poll_analytics: PollAnalytics;
  error?: string;
}

// User type from Supabase Auth
export interface User {
  id: string;
  email: string;
  created_at?: string;
}
