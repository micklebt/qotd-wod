import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getParticipantsAsync } from '@/lib/participants';

export async function POST() {
  try {
    // Get Brian Mickley from database
    const participants = await getParticipantsAsync();
    const brianMickley = participants.find(p => p.name === 'Brian Mickley');
    if (!brianMickley) {
      return NextResponse.json(
        { error: 'Brian Mickley participant not found in database' },
        { status: 500 }
      );
    }

    const { data: entries, error: fetchError } = await supabase
      .from('entries')
      .select('id, participant_id');

    if (fetchError) throw fetchError;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ message: 'No entries found to update' });
    }

    const updates = entries
      .filter(entry => entry.participant_id !== brianMickley.id)
      .map(entry => ({
        id: entry.id,
        participant_id: brianMickley.id,
      }));

    if (updates.length === 0) {
      return NextResponse.json({ message: 'All entries already assigned to Brian Mickley' });
    }

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('entries')
        .update({ participant_id: brianMickley.id })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating entry ${update.id}:`, updateError);
      }
    }

    return NextResponse.json({ 
      message: `Updated ${updates.length} entries to Brian Mickley (ID: 101)`,
      updated: updates.length 
    });
  } catch (error) {
    console.error('Error updating entries:', error);
    return NextResponse.json(
      { error: 'Failed to update entries' },
      { status: 500 }
    );
  }
}

