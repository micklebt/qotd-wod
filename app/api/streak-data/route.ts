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

    const { data: streak, error: streakError } = await supabase
      .from('participant_streaks')
      .select('*')
      .eq('participant_id', participantId)
      .single();

    if (streakError && streakError.code !== 'PGRST116') {
      console.error('Error fetching streak:', streakError);
      return NextResponse.json(
        { error: 'Failed to fetch streak data' },
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
        { error: 'Failed to fetch badge data' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      streak: streak || null,
      badges: badges || [],
    });
  } catch (error) {
    console.error('Error in streak-data API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

