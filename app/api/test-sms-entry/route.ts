import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🧪 Test SMS Entry API called');
  
  try {
    // Get first participant
    const { data: participants, error: participantError } = await supabase
      .from('participants')
      .select('id')
      .limit(1)
      .single();

    if (participantError || !participants) {
      return NextResponse.json(
        { error: 'No participants found. Please add a participant first.' },
        { status: 400 }
      );
    }

    const participantId = participants.id;

    // Create a test entry
    const { data: entryData, error: entryError } = await supabase
      .from('entries')
      .insert({
        type: 'word',
        content: 'test',
        participant_id: participantId,
      })
      .select()
      .single();

    if (entryError) {
      console.error('🧪 Error creating test entry:', entryError);
      return NextResponse.json(
        { error: `Failed to create test entry: ${entryError.message}` },
        { status: 500 }
      );
    }

    console.log('🧪 Test entry created:', entryData.id);

    // Call SMS notification API
    const smsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notify-entry-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryId: entryData.id,
        entryType: 'word',
        entryContent: 'test',
        participantId: participantId,
      }),
    });

    const smsResult = await smsResponse.json();

    return NextResponse.json({
      success: true,
      entryId: entryData.id,
      smsResult,
    });
  } catch (error) {
    console.error('🧪 Test SMS Entry Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

