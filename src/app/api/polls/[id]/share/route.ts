import { createServerSupabaseClient } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/polls/[id]/share - Track Poll Sharing Analytics
 *
 * Records sharing events for analytics purposes. This endpoint allows tracking
 * how polls are shared across different platforms and mediums, which can help
 * understand user engagement and sharing patterns.
 *
 * Features:
 * - Tracks share events by platform (link, qr, social media)
 * - Supports both authenticated and anonymous sharing
 * - Records share metadata for analytics
 * - Helps understand which sharing methods are most effective
 *
 * @param {NextRequest} req - Next.js request object
 * @param {Object} params - Route parameters containing poll ID
 * @param {string} params.id - UUID of the poll being shared
 * @returns {Promise<NextResponse>} JSON response confirming share tracking
 *
 * @example
 * ```typescript
 * // Track a social media share
 * const response = await fetch('/api/polls/123e4567-e89b-12d3-a456-426614174000/share', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     share_type: 'social',
 *     platform: 'twitter',
 *     shared_by: userId // optional
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

    // Parse request body for share metadata
    const body = await req.json();
    const { share_type, platform, shared_by, user_agent } = body;

    // Optional authentication - allow anonymous sharing tracking
    const authHeader = req.headers.get('Authorization');
    let authenticatedUser = null;

    if (authHeader) {
      const clientSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: { user }, error: userError } = await clientSupabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (!userError && user) {
        authenticatedUser = user;
      }
    }

    // Use server client to record share analytics
    const supabase = createServerSupabaseClient();

    // Verify poll exists before recording share
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .select('id, title')
      .eq('id', pollId)
      .single();

    if (pollError) {
      if (pollError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
      }
      return NextResponse.json({ error: pollError.message }, { status: 400 });
    }

    // Record share event (Note: This would require a shares table in production)
    // For now, we'll just log the share event
    const shareData = {
      poll_id: pollId,
      poll_title: poll.title,
      share_type: share_type || 'link',
      platform: platform || 'direct',
      shared_by: authenticatedUser?.id || shared_by || null,
      user_agent: user_agent || req.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') ||
                 req.headers.get('x-real-ip') ||
                 'unknown'
    };

    console.log('Share event recorded:', shareData);

    // TODO: In production, you would insert this into a shares table:
    // const { error: shareError } = await supabase
    //   .from('shares')
    //   .insert([shareData]);

    // For now, return success
    return NextResponse.json({
      success: true,
      message: 'Share event recorded successfully',
      data: {
        poll_id: pollId,
        share_type: shareData.share_type,
        platform: shareData.platform
      }
    });

  } catch (error) {
    console.error('Unexpected error recording share:', error);
    return NextResponse.json(
      { error: 'Failed to record share event' },
      { status: 500 }
    );
  }
}
