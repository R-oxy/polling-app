import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { CreatePollData } from '@/types';

// GET /api/polls/[id] - Get a specific poll
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Create server Supabase client (no auth needed for viewing public polls)
    const supabase = createServerSupabaseClient();
    
    // Fetch poll with analytics
    const { data: poll, error } = await supabase
      .from('poll_results')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }
      console.error('Error fetching poll:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ poll });
  } catch (error) {
    console.error('Unexpected error fetching poll:', error);
    return NextResponse.json(
      { error: 'Failed to fetch poll' },
      { status: 500 }
    );
  }
}

// PUT /api/polls/[id] - Update a specific poll (owner only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const { title, description, question, options, allow_multiple_votes, expires_at, is_active } = body;

    // Validate input
    if (title && title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 });
    }

    if (question && question.trim().length < 5) {
      return NextResponse.json({ error: 'Question must be at least 5 characters' }, { status: 400 });
    }

    if (options && options.length < 2) {
      return NextResponse.json({ error: 'At least 2 options are required' }, { status: 400 });
    }

    // Use server client to update poll (bypasses RLS but we check ownership)
    const supabase = createServerSupabaseClient();
    
    // First check if user owns this poll
    const { data: existingPoll, error: checkError } = await supabase
      .from('polls')
      .select('created_by')
      .eq('id', id)
      .single();

    if (checkError) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (existingPoll.created_by !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own polls' }, { status: 403 });
    }

    // Update the poll
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (question !== undefined) updateData.question = question.trim();
    if (options !== undefined) updateData.options = options;
    if (allow_multiple_votes !== undefined) updateData.allow_multiple_votes = allow_multiple_votes;
    if (expires_at !== undefined) updateData.expires_at = expires_at || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: poll, error } = await supabase
      .from('polls')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating poll:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return updated poll with analytics
    const pollWithAnalytics = {
      ...poll,
      total_votes: poll.poll_analytics?.[0]?.total_votes || 0,
      unique_voters: poll.poll_analytics?.[0]?.unique_voters || 0,
      option_counts: poll.poll_analytics?.[0]?.option_counts || {},
      last_vote_at: poll.poll_analytics?.[0]?.last_vote_at || null
    };

    return NextResponse.json({ poll: pollWithAnalytics });
  } catch (error) {
    console.error('Unexpected error updating poll:', error);
    return NextResponse.json(
      { error: 'Failed to update poll' },
      { status: 500 }
    );
  }
}

// DELETE /api/polls/[id] - Delete a specific poll (owner only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Use server client to delete poll (bypasses RLS but we check ownership)
    const supabase = createServerSupabaseClient();
    
    // First check if user owns this poll
    const { data: existingPoll, error: checkError } = await supabase
      .from('polls')
      .select('created_by, title')
      .eq('id', id)
      .single();

    if (checkError) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    if (existingPoll.created_by !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own polls' }, { status: 403 });
    }

    // Delete the poll (this will cascade delete votes due to foreign key constraints)
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting poll:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      message: 'Poll deleted successfully',
      deletedPoll: { id, title: existingPoll.title }
    });
  } catch (error) {
    console.error('Unexpected error deleting poll:', error);
    return NextResponse.json(
      { error: 'Failed to delete poll' },
      { status: 500 }
    );
  }
}
