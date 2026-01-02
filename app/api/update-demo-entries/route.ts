import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { data: entries, error: fetchError } = await supabase
      .from('entries')
      .select('id, submitted_by_user_id');

    if (fetchError) throw fetchError;

    if (!entries || entries.length === 0) {
      return NextResponse.json({ message: 'No entries found to update' });
    }

    const updates = entries
      .filter(entry => entry.submitted_by_user_id !== 'participant-1')
      .map(entry => ({
        id: entry.id,
        submitted_by_user_id: 'participant-1',
      }));

    if (updates.length === 0) {
      return NextResponse.json({ message: 'All entries already assigned to Brian Mickley' });
    }

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('entries')
        .update({ submitted_by_user_id: 'participant-1' })
        .eq('id', update.id);

      if (updateError) {
        console.error(`Error updating entry ${update.id}:`, updateError);
      }
    }

    return NextResponse.json({ 
      message: `Updated ${updates.length} entries to Brian Mickley`,
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

