import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { CreatePollData } from '@/types';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Create client-side Supabase client to verify the user
    const clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the user with the provided token
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Now use server client to fetch data (bypasses RLS)
    const supabase = createServerSupabaseClient();
    const { data: polls, error } = await supabase
      .from('poll_results')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching polls:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ polls: polls || [] });
  } catch (error) {
    console.error('Unexpected error fetching polls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch polls' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get auth token from request headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Create client-side Supabase client to verify the user
    const clientSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Verify the user with the provided token
    const { data: { user }, error: userError } = await clientSupabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, question, options, allow_multiple_votes, expires_at } = body as CreatePollData;

    // Validate input
    if (!title || title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 });
    }

    if (!question || question.trim().length < 5) {
      return NextResponse.json({ error: 'Question must be at least 5 characters' }, { status: 400 });
    }

    if (!options || options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 });
    }

    if (options.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 options allowed' }, { status: 400 });
    }

    // Clean up options (remove empty ones and trim)
    const cleanOptions = options
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);

    if (cleanOptions.length < 2) {
      return NextResponse.json({ error: 'At least 2 non-empty options are required' }, { status: 400 });
    }

    // Now use server client to create poll (bypasses RLS)
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

    // Return poll with analytics (will be empty initially)
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
