import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface NotifySMSRequest {
  entryId: number;
  entryType: 'word' | 'quote';
  entryContent: string;
  participantId: string;
}

export async function POST(request: NextRequest) {
  console.log('📱 SMS Notification API called');
  try {
    const body: NotifySMSRequest = await request.json();
    const { entryId, entryType, entryContent, participantId } = body;

    console.log('📱 SMS Request:', { entryId, entryType, participantId });

    // Validate required fields
    if (!entryId || !entryType || !entryContent) {
      console.error('📱 SMS Error: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if Twilio is configured
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    console.log('📱 Twilio Config Check:', {
      hasAccountSid: !!twilioAccountSid,
      hasAuthToken: !!twilioAuthToken,
      hasPhoneNumber: !!twilioPhoneNumber,
    });

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.warn('📱 Twilio not configured - skipping SMS notifications');
      return NextResponse.json({ success: true, message: 'Twilio not configured' });
    }

    // Fetch all participants with phone numbers
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id, name, mobile_phone')
      .not('mobile_phone', 'is', null);

    if (participantsError) {
      console.error('📱 Error fetching participants:', participantsError);
      return NextResponse.json(
        { error: 'Failed to fetch participants' },
        { status: 500 }
      );
    }

    console.log('📱 Participants with phone numbers:', participants?.length || 0);

    if (!participants || participants.length === 0) {
      console.warn('📱 No participants with phone numbers found');
      return NextResponse.json({ success: true, message: 'No participants with phone numbers' });
    }

    // Get entry details for SMS message
    const { data: entryData, error: entryError } = await supabase
      .from('entries')
      .select(`
        id,
        type,
        content,
        participant_id,
        word_metadata(definition, pronunciation_ipa, pronunciation_respelling, pronunciation),
        quote_metadata(author, source)
      `)
      .eq('id', entryId)
      .single();

    if (entryError || !entryData) {
      console.error('Error fetching entry details:', entryError);
      return NextResponse.json(
        { error: 'Failed to fetch entry details' },
        { status: 500 }
      );
    }

    // Get submitter name
    const { data: submitter, error: submitterError } = await supabase
      .from('participants')
      .select('name')
      .eq('id', participantId)
      .single();

    const submitterName = submitter?.name || 'Someone';

    // Format SMS message
    const message = formatSMSMessage(entryData, submitterName);

    // Get app URL for link (use environment variable if set, otherwise construct)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                   'https://qotd-wod.vercel.app');

    const fullMessage = `${message}\n\nView: ${appUrl}/entries/${entryId}`;

    // Import Twilio dynamically (only if configured)
    const twilio = await import('twilio');
    const client = twilio.default(twilioAccountSid, twilioAuthToken);

    // Send SMS to all participants with phone numbers
    const results = await Promise.allSettled(
      participants
        .filter(p => p.mobile_phone && p.mobile_phone.trim() !== '')
        .map(async (participant) => {
          try {
            const result = await client.messages.create({
              body: fullMessage,
              from: twilioPhoneNumber,
              to: participant.mobile_phone!,
            });
            return { participantId: participant.id, success: true, messageSid: result.sid };
          } catch (error) {
            console.error(`Error sending SMS to ${participant.name} (${participant.mobile_phone}):`, error);
            return { participantId: participant.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`📱 SMS Results: ${successful} sent, ${failed} failed, ${participants.length} total`);

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      total: participants.length,
    });
  } catch (error) {
    console.error('Error in notify-entry-sms:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send SMS notifications' },
      { status: 500 }
    );
  }
}

function formatSMSMessage(entry: any, submitterName: string): string {
  const typeLabel = entry.type === 'word' ? 'Word' : 'Quote';
  const content = entry.content;

  if (entry.type === 'word') {
    const metadata = entry.word_metadata?.[0];
    const pronunciation = metadata?.pronunciation_respelling || 
                         metadata?.pronunciation_ipa || 
                         metadata?.pronunciation || 
                         '';
    const definition = metadata?.definition || '';
    
    let message = `New ${typeLabel} of the Day: "${content}"`;
    
    if (pronunciation) {
      message += `\nPronunciation: ${pronunciation}`;
    }
    
    if (definition) {
      // Truncate definition if needed (keep message under 160 chars for single SMS, 1600 for concatenated)
      const maxDefLength = 100;
      const truncatedDef = definition.length > maxDefLength 
        ? definition.substring(0, maxDefLength) + '...' 
        : definition;
      message += `\nDefinition: ${truncatedDef}`;
    }
    
    message += `\nSubmitted by: ${submitterName}`;
    
    return message;
  } else {
    // Quote
    const metadata = entry.quote_metadata?.[0];
    const author = metadata?.author || '';
    const source = metadata?.source || '';
    
    // Truncate quote if too long
    const maxQuoteLength = 80;
    const truncatedQuote = content.length > maxQuoteLength
      ? content.substring(0, maxQuoteLength) + '...'
      : content;
    
    let message = `New ${typeLabel} of the Day:\n"${truncatedQuote}"`;
    
    if (author) {
      message += `\n— ${author}`;
    }
    
    if (source) {
      message += `\nSource: ${source}`;
    }
    
    message += `\nSubmitted by: ${submitterName}`;
    
    return message;
  }
}

