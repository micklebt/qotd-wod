import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ParticipantStreak, ParticipantBadge } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Server configuration error', details: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      );
    }

    console.log('Streak-data API: Fetching data for participant', participantId);

    // Fetch streak data
    let streak = null;
    let streakError = null;
    try {
      const result = await supabase
        .from('participant_streaks')
        .select('*')
        .eq('participant_id', participantId)
        .maybeSingle();
      streak = result.data;
      streakError = result.error;
    } catch (err) {
      console.error('Exception fetching streak:', err);
      streakError = err instanceof Error ? err : new Error(String(err));
    }

    if (streakError) {
      console.error('Error fetching streak:', streakError);
      // Don't return error - just log it and continue with null streak
    }

    // Fetch badge data
    let badges = [];
    let badgesError = null;
    try {
      const result = await supabase
        .from('participant_badges')
        .select('*')
        .eq('participant_id', participantId)
        .order('earned_date', { ascending: false });
      badges = result.data || [];
      badgesError = result.error;
    } catch (err) {
      console.error('Exception fetching badges:', err);
      badgesError = err instanceof Error ? err : new Error(String(err));
    }

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      // Don't return error - just log it and continue with empty badges
    }

    console.log('Streak-data API: Success', { 
      streak: streak ? 'found' : 'null', 
      badgesCount: badges?.length || 0 
    });

    return NextResponse.json({
      streak: streak || null,
      badges: badges || [],
    });
  } catch (error) {
    console.error('Error in streak-data API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}

