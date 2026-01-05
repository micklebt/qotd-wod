import { NextRequest, NextResponse } from 'next/server';
import { updateParticipantStreak } from '@/lib/streaks';

export async function POST(request: NextRequest) {
  try {
    const { participantId } = await request.json();

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      );
    }

    // Update the streak (this will also check and award badges)
    await updateParticipantStreak(participantId);

    return NextResponse.json({
      success: true,
      message: 'Streak updated and badges checked',
    });
  } catch (error) {
    console.error('Error in award-badges-retroactive:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to award badges' },
      { status: 500 }
    );
  }
}

