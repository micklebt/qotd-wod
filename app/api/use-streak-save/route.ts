import { NextRequest, NextResponse } from 'next/server';
import { useStreakSave } from '@/lib/streaks';

export async function POST(request: NextRequest) {
  try {
    const { participantId } = await request.json();

    if (!participantId || typeof participantId !== 'string') {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      );
    }

    const success = await useStreakSave(participantId);

    if (!success) {
      return NextResponse.json(
        { error: 'Cannot use streak save. No saves available or already used this month.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Streak save used successfully' });
  } catch (error) {
    console.error('Error using streak save:', error);
    return NextResponse.json(
      { error: 'Failed to use streak save' },
      { status: 500 }
    );
  }
}

