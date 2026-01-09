import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
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

    // Use RPC function to fetch data (bypasses schema cache issues)
    const { data, error } = await supabase.rpc('get_participant_streak_data', {
      p_participant_id: participantId
    });

    if (error) {
      console.error('Error fetching streak data via RPC:', error);
      return NextResponse.json({
        streak: null,
        badges: [],
      });
    }

    console.log('Streak-data API: Success via RPC', data);

    return NextResponse.json({
      streak: data?.streak || null,
      badges: data?.badges || [],
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

