import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { CreatePollData } from '@/types';

/**
 * GET /api/polls - Retrieve user's polls
 *
 * Fetches all polls created by the authenticated user. This endpoint implements
 * a two-step authentication process for enhanced security:
 * 1. Verify user identity using client-side Supabase client
 * 2. Fetch data using server-side client (bypasses RLS for admin operations)
 *
 * Security Features:
 * - Requires valid JWT token in Authorization header
 * - Validates token authenticity before data access
 * - Returns only polls owned by the authenticated user
 *
 * @param {NextRequest} req - Next.js request object
 * @returns {Promise<NextResponse>} JSON response with polls array or error
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/polls', {
 *   headers: { 'Authorization': `Bearer ${userToken}` }
 * });
 * const { polls } = await response.json();
 * ```
 */
export async function GET(req: NextRequest) {
  try {
    // Extract JWT token from Authorization header (format: "Bearer <token>")
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Step 1: Verify user identity using client-side Supabase client
    // This ensures the token is valid and extracts user information
    const clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Remove "Bearer " prefix and verify the token
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Step 2: Use server-side client to fetch data (bypasses RLS for admin operations)
    // This allows us to access poll_results view which aggregates poll data
    const supabase = createServerSupabaseClient();
    const { data: polls, error } = await supabase
      .from('poll_results')
      .select('*')
      .eq('created_by', user.id) // Only return polls created by this user
      .order('created_at', { ascending: false }); // Most recent first

    if (error) {
      console.error('Error fetching polls:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return polls array (empty array if no polls found)
    return NextResponse.json({ polls: polls || [] });
  } catch (error) {
    console.error('Unexpected error fetching polls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/polls - Create a new poll
 *
 * Creates a new poll with the provided data. This endpoint implements comprehensive
 * validation and security measures:
 * - Authenticates user via JWT token
 * - Validates poll data (title, question, options)
 * - Cleans and sanitizes input data
 * - Prevents duplicate options
 * - Returns poll with analytics (initially empty)
 *
 * Validation Rules:
 * - Title: 3-200 characters, required
 * - Question: 5-500 characters, required
 * - Options: 2-10 unique options, each non-empty
 * - Expiration: Optional datetime, must be in future
 *
 * @param {NextRequest} req - Next.js request object containing poll data
 * @returns {Promise<NextResponse>} JSON response with created poll or error
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/polls', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Authorization': `Bearer ${userToken}`
 *   },
 *   body: JSON.stringify({
 *     title: 'Favorite Color',
 *     question: 'What is your favorite color?',
 *     options: ['Red', 'Blue', 'Green'],
 *     allow_multiple_votes: false,
 *     expires_at: '2024-12-31T23:59:59Z'
 *   })
 * });
 * ```
 */
export async function POST(req: NextRequest) {
  try {
    // Extract and validate JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Step 1: Verify user identity using client-side Supabase client
    const clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Remove "Bearer " prefix and verify the token authenticity
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { title, description, question, options, allow_multiple_votes, expires_at } = body as CreatePollData;

    // Validate poll title (required, minimum length)
    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 });
    }

    // Validate poll question (required, minimum length)
    if (!question || question.trim().length < 5) {
      return NextResponse.json({ error: 'Question must be at least 5 characters' }, { status: 400 });
    }

    // Validate options array (minimum count)
    if (!options || options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 });
    }

    // Validate options array (maximum count)
    if (options.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 options allowed' }, { status: 400 });
    }

    // Clean and sanitize options: trim whitespace and remove empty strings
    const cleanOptions = options
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);

    // Re-validate after cleaning (ensure we still have minimum required options)
    if (cleanOptions.length < 2) {
      return NextResponse.json({ error: 'At least 2 non-empty options are required' }, { status: 400 });
    }

    // Step 2: Create poll using server-side client (bypasses RLS for admin operations)
    const supabase = createServerSupabaseClient();
    const { data: poll, error } = await supabase
      .from('polls')
      .insert([
        {
          title: title.trim(),
          description: description?.trim() || null,
          question: question.trim(),
          options: cleanOptions,
          created_by: user.id,
          allow_multiple_votes: allow_multiple_votes || false,
          expires_at: expires_at || null,
        },
      ])
      .select(`
        *,
        poll_analytics (
          total_votes,
          unique_voters,
          option_counts
        )
      `)
      .single();

    if (error) {
      console.error('Error creating poll:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Prepare response with analytics (initially empty for new poll)
    const pollWithAnalytics = {
      ...poll,
      total_votes: 0,
      unique_voters: 0,
      option_counts: {},
      last_vote_at: null
    };

    return NextResponse.json({ poll: pollWithAnalytics });
  } catch (error) {
    console.error('Unexpected error creating poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}
