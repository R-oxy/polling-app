import { supabase } from './supabase';
import { 
  Poll, 
  Vote, 
  PollResult, 
  PollAnalytics, 
  CreatePollData, 
  CreateVoteData 
} from '@/types';

// =============================================
// POLL OPERATIONS
// =============================================

export async function createPoll(pollData: CreatePollData, userId: string) {
  try {
    const { data, error } = await supabase
      .from('polls')
      .insert([
        {
          ...pollData,
          created_by: userId,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating poll:', error);
      return { poll: null, error: error.message };
    }

    return { poll: data as Poll, error: null };
  } catch (error) {
    console.error('Unexpected error creating poll:', error);
    return { poll: null, error: 'Failed to create poll' };
  }
}

export async function getUserPolls(userId: string) {
  try {
    const { data, error } = await supabase
      .from('poll_results')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user polls:', error);
      return { polls: [], error: error.message };
    }

    return { polls: data as PollResult[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching polls:', error);
    return { polls: [], error: 'Failed to fetch polls' };
  }
}

export async function getPollById(pollId: string) {
  try {
    const { data, error } = await supabase
      .from('poll_results')
      .select('*')
      .eq('id', pollId)
      .single();

    if (error) {
      console.error('Error fetching poll:', error);
      return { poll: null, error: error.message };
    }

    return { poll: data as PollResult, error: null };
  } catch (error) {
    console.error('Unexpected error fetching poll:', error);
    return { poll: null, error: 'Failed to fetch poll' };
  }
}

export async function updatePoll(pollId: string, updates: Partial<Poll>, userId: string) {
  try {
    const { data, error } = await supabase
      .from('polls')
      .update(updates)
      .eq('id', pollId)
      .eq('created_by', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating poll:', error);
      return { poll: null, error: error.message };
    }

    return { poll: data as Poll, error: null };
  } catch (error) {
    console.error('Unexpected error updating poll:', error);
    return { poll: null, error: 'Failed to update poll' };
  }
}

export async function deletePoll(pollId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId)
      .eq('created_by', userId);

    if (error) {
      console.error('Error deleting poll:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected error deleting poll:', error);
    return { error: 'Failed to delete poll' };
  }
}

// =============================================
// VOTING OPERATIONS
// =============================================

export async function submitVote(voteData: CreateVoteData) {
  try {
    // First check if the poll exists and is active
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, is_active, expires_at, allow_multiple_votes')
      .eq('id', voteData.poll_id)
      .single();

    if (pollError || !poll) {
      return { vote: null, error: 'Poll not found' };
    }

    if (!poll.is_active) {
      return { vote: null, error: 'Poll is not active' };
    }

    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return { vote: null, error: 'Poll has expired' };
    }

    // Check for existing vote if multiple votes not allowed
    if (!poll.allow_multiple_votes && voteData.voter_id) {
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('poll_id', voteData.poll_id)
        .eq('voter_id', voteData.voter_id)
        .single();

      if (existingVote) {
        return { vote: null, error: 'You have already voted on this poll' };
      }
    }

    // Submit the vote
    const { data, error } = await supabase
      .from('votes')
      .insert([voteData])
      .select()
      .single();

    if (error) {
      console.error('Error submitting vote:', error);
      return { vote: null, error: error.message };
    }

    // Get updated analytics
    const { data: analytics } = await supabase
      .from('poll_analytics')
      .select('*')
      .eq('poll_id', voteData.poll_id)
      .single();

    return { 
      vote: data as Vote, 
      analytics: analytics as PollAnalytics,
      error: null 
    };
  } catch (error) {
    console.error('Unexpected error submitting vote:', error);
    return { vote: null, error: 'Failed to submit vote' };
  }
}

export async function getPollVotes(pollId: string) {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching votes:', error);
      return { votes: [], error: error.message };
    }

    return { votes: data as Vote[], error: null };
  } catch (error) {
    console.error('Unexpected error fetching votes:', error);
    return { votes: [], error: 'Failed to fetch votes' };
  }
}

export async function deleteVote(voteId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('id', voteId)
      .eq('voter_id', userId);

    if (error) {
      console.error('Error deleting vote:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Unexpected error deleting vote:', error);
    return { error: 'Failed to delete vote' };
  }
}

// =============================================
// ANALYTICS OPERATIONS
// =============================================

export async function getPollAnalytics(pollId: string) {
  try {
    const { data, error } = await supabase
      .from('poll_analytics')
      .select('*')
      .eq('poll_id', pollId)
      .single();

    if (error) {
      console.error('Error fetching analytics:', error);
      return { analytics: null, error: error.message };
    }

    return { analytics: data as PollAnalytics, error: null };
  } catch (error) {
    console.error('Unexpected error fetching analytics:', error);
    return { analytics: null, error: 'Failed to fetch analytics' };
  }
}

// =============================================
// REAL-TIME SUBSCRIPTIONS
// =============================================

export function subscribeToPollVotes(
  pollId: string, 
  callback: (payload: any) => void
) {
  return supabase
    .channel(`poll_votes_${pollId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `poll_id=eq.${pollId}`
      },
      callback
    )
    .subscribe();
}

export function subscribeToPollAnalytics(
  pollId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`poll_analytics_${pollId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'poll_analytics',
        filter: `poll_id=eq.${pollId}`
      },
      callback
    )
    .subscribe();
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

export function calculateVotePercentages(
  optionCounts: Record<string, number>,
  totalVotes: number
): Record<string, number> {
  const percentages: Record<string, number> = {};
  
  Object.entries(optionCounts).forEach(([optionIndex, count]) => {
    percentages[optionIndex] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
  });

  return percentages;
}

export function getTopVotedOption(optionCounts: Record<string, number>): string | null {
  let maxVotes = 0;
  let topOption: string | null = null;

  Object.entries(optionCounts).forEach(([optionIndex, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      topOption = optionIndex;
    }
  });

  return topOption;
}
