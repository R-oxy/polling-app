import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/polls/[id]/vote - Submit a vote
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;

    // Get auth token from request headers (optional for anonymous voting)
    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (authHeader) {
      // Verify authenticated user
      const clientSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user: authUser }, error: userError } = await clientSupabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      
      if (!userError && authUser) {
        user = authUser;
      }
    }

    const body = await req.json();
    const { option_index, voter_ip, user_agent } = body;

    // Validate input
    if (option_index === undefined || option_index === null) {
      return NextResponse.json({ error: 'Option index is required' }, { status: 400 });
    }

    if (typeof option_index !== 'number' || option_index < 0) {
      return NextResponse.json({ error: 'Invalid option index' }, { status: 400 });
    }

    // Use server client to check poll and submit vote
    const supabase = createServerSupabaseClient();
    
    // First, get the poll to validate it exists and is active
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, question, options, is_active, expires_at, allow_multiple_votes')
      .eq('id', pollId)
      .single();

    if (pollError) {
      if (pollError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }
      return NextResponse.json({ error: pollError.message }, { status: 400 });
    }

    // Validate poll is active
    if (!poll.is_active) {
      return NextResponse.json({ error: 'This poll is not accepting votes' }, { status: 403 });
    }

    // Check if poll has expired
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This poll has expired' }, { status: 403 });
    }

    // Validate option index is within range
    if (option_index >= poll.options.length) {
      return NextResponse.json({ error: 'Invalid option selected' }, { status: 400 });
    }

    // Check for existing vote if multiple votes are not allowed
    if (!poll.allow_multiple_votes) {
      let existingVoteQuery = supabase
        .from('votes')
        .select('id')
        .eq('poll_id', pollId);

      if (user) {
        // Check for existing vote by authenticated user
        existingVoteQuery = existingVoteQuery.eq('voter_id', user.id);
      } else if (voter_ip) {
        // Check for existing vote by IP for anonymous users
        existingVoteQuery = existingVoteQuery.eq('voter_ip', voter_ip).is('voter_id', null);
      }

      const { data: existingVote } = await existingVoteQuery.single();

      if (existingVote) {
        return NextResponse.json({ 
          error: user ? 'You have already voted on this poll' : 'A vote from this location has already been recorded'
        }, { status: 409 });
      }
    }

    // Prepare vote data
    const voteData: any = {
      poll_id: pollId,
      option_index,
      option_text: poll.options[option_index],
      created_at: new Date().toISOString(),
    };

    // Add user ID if authenticated
    if (user) {
      voteData.voter_id = user.id;
    } else {
      // For anonymous votes, store IP and user agent
      voteData.voter_ip = voter_ip || null;
      voteData.user_agent = user_agent || null;
    }

    // Submit the vote
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .insert([voteData])
      .select()
      .single();

    if (voteError) {
      console.error('Error submitting vote:', voteError);
      return NextResponse.json({ error: voteError.message }, { status: 400 });
    }

    // Get updated poll analytics
    const { data: analytics } = await supabase
      .from('poll_analytics')
      .select('*')
      .eq('poll_id', pollId)
      .single();

    // Get updated poll with results
    const { data: updatedPoll } = await supabase
      .from('poll_results')
      .select('*')
      .eq('id', pollId)
      .single();

    return NextResponse.json({ 
      success: true,
      vote,
      poll: updatedPoll,
      analytics,
      message: 'Vote submitted successfully!'
    });
  } catch (error) {
    console.error('Unexpected error submitting vote:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote' },
      { status: 500 }
    );
  }
}

// GET /api/polls/[id]/vote - Check if user has voted (for authenticated users)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;

    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ hasVoted: false });
    }

    // Verify authenticated user
    const clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: userError } = await clientSupabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      return NextResponse.json({ hasVoted: false });
    }

    // Check if user has voted on this poll
    const supabase = createServerSupabaseClient();
    const { data: vote } = await supabase
      .from('votes')
      .select('id, option_index, option_text, created_at')
      .eq('poll_id', pollId)
      .eq('voter_id', user.id)
      .single();

    return NextResponse.json({ 
      hasVoted: !!vote,
      userVote: vote || null
    });
  } catch (error) {
    console.error('Unexpected error checking vote status:', error);
    return NextResponse.json({ hasVoted: false });
  }
}
