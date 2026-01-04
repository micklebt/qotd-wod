import { NextRequest, NextResponse } from 'next/server';
import { updateParticipantStreak } from '@/lib/streaks';

export async function POST(request: NextRequest) {
  try {
    const { participantId } = await request.json();

    if (!participantId || typeof participantId !== 'string') {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      );
    }

    await updateParticipantStreak(participantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating streak:', error);
    return NextResponse.json(
      { error: 'Failed to update streak' },
      { status: 500 }
    );
  }
}

