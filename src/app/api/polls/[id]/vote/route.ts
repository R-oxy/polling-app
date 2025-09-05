import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/polls/[id]/vote - Submit a Vote
 *
 * Handles vote submission for polls with support for both authenticated and anonymous users.
 * This endpoint implements comprehensive validation and security measures:
 *
 * Features:
 * - Supports authenticated and anonymous voting
 * - Prevents duplicate votes based on user ID or IP address
 * - Validates poll status and expiration
 * - Updates poll analytics in real-time
 * - Returns updated poll data with vote counts
 *
 * Security Considerations:
 * - JWT token validation for authenticated users
 * - IP-based duplicate prevention for anonymous users
 * - Poll status validation (active/inactive)
 * - Expiration date checking
 *
 * Vote Prevention Logic:
 * - Authenticated users: One vote per user per poll (unless multiple votes allowed)
 * - Anonymous users: One vote per IP per poll (unless multiple votes allowed)
 *
 * @param {NextRequest} req - Next.js request object
 * @param {Object} params - Route parameters containing poll ID
 * @param {string} params.id - UUID of the poll to vote on
 * @returns {Promise<NextResponse>} JSON response with vote result or error
 *
 * @example
 * ```typescript
 * // Authenticated user vote
 * const response = await fetch('/api/polls/123e4567-e89b-12d3-a456-426614174000/vote', {
 *   method: 'POST',
 *   headers: { 'Authorization': `Bearer ${userToken}` },
 *   body: JSON.stringify({ option_index: 0 })
 * });
 *
 * // Anonymous user vote
 * const response = await fetch('/api/polls/123e4567-e89b-12d3-a456-426614174000/vote', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     option_index: 1,
 *     voter_ip: '192.168.1.1',
 *     user_agent: 'Mozilla/5.0...'
 *   })
 * });
 * ```
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;

    // Step 1: Authentication (optional for anonymous voting)
    const authHeader = req.headers.get('Authorization');
    let user = null;

    if (authHeader) {
      // Verify JWT token for authenticated users
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

    // Step 2: Parse and validate request body
    const body = await req.json();
    const { option_index, voter_ip, user_agent } = body;

    // Validate option index (required, non-negative integer)
    if (option_index === undefined || option_index === null) {
      return NextResponse.json({ error: 'Option index is required' }, { status: 400 });
    }

    if (typeof option_index !== 'number' || option_index < 0) {
      return NextResponse.json({ error: 'Invalid option index' }, { status: 400 });
    }

    // Step 3: Validate poll existence and status
    const supabase = createServerSupabaseClient();

    // Retrieve poll data to validate it exists and check voting conditions
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

    // Ensure poll is currently accepting votes
    if (!poll.is_active) {
      return NextResponse.json({ error: 'This poll is not accepting votes' }, { status: 403 });
    }

    // Check if poll has reached its expiration date
    if (poll.expires_at && new Date(poll.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This poll has expired' }, { status: 403 });
    }

    // Validate selected option exists in poll options array
    if (option_index >= poll.options.length) {
      return NextResponse.json({ error: 'Invalid option selected' }, { status: 400 });
    }

    // Step 4: Prevent duplicate votes (if multiple votes not allowed)
    if (!poll.allow_multiple_votes) {
      let existingVoteQuery = supabase
        .from('votes')
        .select('id')
        .eq('poll_id', pollId);

      if (user) {
        // For authenticated users: check by user ID (most secure method)
        existingVoteQuery = existingVoteQuery.eq('voter_id', user.id);
      } else if (voter_ip) {
        // For anonymous users: check by IP address (fallback method)
        // Only consider votes without a user ID (anonymous votes)
        existingVoteQuery = existingVoteQuery.eq('voter_ip', voter_ip).is('voter_id', null);
      }

      const { data: existingVote } = await existingVoteQuery.single();

      if (existingVote) {
        return NextResponse.json({
          error: user ? 'You have already voted on this poll' : 'A vote from this location has already been recorded'
        }, { status: 409 });
      }
    }

    // Step 5: Prepare vote data for database insertion
    const voteData: any = {
      poll_id: pollId,
      option_index,
      option_text: poll.options[option_index], // Store text for easier queries
      created_at: new Date().toISOString(),
    };

    // Add voter identification based on authentication status
    if (user) {
      voteData.voter_id = user.id; // Secure identification for authenticated users
    } else {
      // For anonymous votes, store IP and user agent for duplicate prevention
      voteData.voter_ip = voter_ip || null;
      voteData.user_agent = user_agent || null;
    }

    // Step 6: Submit the vote to database
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .insert([voteData])
      .select()
      .single();

    if (voteError) {
      console.error('Error submitting vote:', voteError);
      return NextResponse.json({ error: voteError.message }, { status: 400 });
    }

    // Step 7: Retrieve updated analytics and poll data
    // Get real-time analytics after vote submission
    const { data: analytics } = await supabase
      .from('poll_analytics')
      .select('*')
      .eq('poll_id', pollId)
      .single();

    // Get updated poll with current vote counts
    const { data: updatedPoll } = await supabase
      .from('poll_results')
      .select('*')
      .eq('id', pollId)
      .single();

    // Step 8: Return success response with updated data
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

/**
 * GET /api/polls/[id]/vote - Check User's Vote Status
 *
 * Determines if an authenticated user has already voted on a specific poll.
 * This endpoint is used by the frontend to show appropriate UI states
 * (e.g., disable voting button, show user's previous choice).
 *
 * Security:
 * - Requires valid JWT token
 * - Only returns vote status for the authenticated user
 * - Does not reveal other users' votes
 *
 * @param {NextRequest} req - Next.js request object
 * @param {Object} params - Route parameters containing poll ID
 * @param {string} params.id - UUID of the poll to check
 * @returns {Promise<NextResponse>} JSON response with vote status
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/polls/123e4567-e89b-12d3-a456-426614174000/vote', {
 *   headers: { 'Authorization': `Bearer ${userToken}` }
 * });
 * const { hasVoted, userVote } = await response.json();
 * ```
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;

    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ hasVoted: false });
    }

    // Verify user authentication
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

    // Query for user's existing vote on this poll
    const supabase = createServerSupabaseClient();
    const { data: vote } = await supabase
      .from('votes')
      .select('id, option_index, option_text, created_at')
      .eq('poll_id', pollId)
      .eq('voter_id', user.id)
      .single();

    return NextResponse.json({
      hasVoted: !!vote, // Boolean indicating if user has voted
      userVote: vote || null // Full vote details if exists
    });
  } catch (error) {
    console.error('Unexpected error checking vote status:', error);
    return NextResponse.json({ hasVoted: false });
  }
}
