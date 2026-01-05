import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { ParticipantStreak, ParticipantBadge } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participantId');

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      );
    }

    console.log('Streak-data API: Fetching data for participant', participantId);

    const { data: streak, error: streakError } = await supabase
      .from('participant_streaks')
      .select('*')
      .eq('participant_id', participantId)
      .maybeSingle();

    if (streakError) {
      console.error('Error fetching streak:', streakError);
      return NextResponse.json(
        { error: 'Failed to fetch streak data', details: streakError.message },
        { status: 500 }
      );
    }

    const { data: badges, error: badgesError } = await supabase
      .from('participant_badges')
      .select('*')
      .eq('participant_id', participantId)
      .order('earned_date', { ascending: false });

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      return NextResponse.json(
        { error: 'Failed to fetch badge data', details: badgesError.message },
        { status: 500 }
      );
    }

    console.log('Streak-data API: Success', { streak, badgesCount: badges?.length || 0 });

    return NextResponse.json({
      streak: streak || null,
      badges: badges || [],
    });
  } catch (error) {
    console.error('Error in streak-data API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

