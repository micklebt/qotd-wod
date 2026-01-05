# Twilio SMS Setup Guide

This guide will help you configure Twilio SMS notifications for new entries.

## Prerequisites

- Twilio account (you mentioned you already have this ✅)
- Twilio phone number
- Twilio Account SID and Auth Token

## Setup Steps

### 1. Get Your Twilio Credentials

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Go to **Account** → **Account Info** (or use the dashboard)
3. Copy your **Account SID** and **Auth Token**

### 2. Get Your Twilio Phone Number

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Copy your Twilio phone number (format: +1234567890)
3. If you don't have a number, you can get one for free on a trial account

### 3. Add Environment Variables

Add these to your `.env.local` file (for local development):

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the three variables:
   - `TWILIO_ACCOUNT_SID` = your Account SID
   - `TWILIO_AUTH_TOKEN` = your Auth Token
   - `TWILIO_PHONE_NUMBER` = your Twilio phone number (with + prefix)
4. Select **Production**, **Preview**, and **Development** environments
5. **Redeploy** your application after adding variables

### 5. Add Phone Numbers to Participants

1. Go to your Supabase dashboard
2. Navigate to **Table Editor** → `participants` table
3. For each participant, add their phone number in the `mobile_phone` column
4. Format: E.164 format (e.g., `+14155551234` or `+15551234567`)
   - Must include country code (e.g., +1 for US/Canada)
   - No spaces, dashes, or parentheses

**Example:**
- US number: `+14155551234`
- Canadian number: `+15551234567`

### 6. Optional: Set App URL

If you want links in SMS messages to work correctly, set:

```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

Or it will auto-detect from Vercel's `VERCEL_URL` environment variable.

### 7. Test SMS Notifications

1. Create a new entry (word or quote)
2. Check the browser console for SMS sending logs
3. Participants with phone numbers in the database should receive SMS notifications

## SMS Message Format

### Word Entry:
```
New Word of the Day: "serendipity"
Pronunciation: /sɛrənˈdɪpəti/
Definition: The occurrence and development of events by chance in a happy or beneficial way...
Submitted by: Brian

View: https://your-app.com/entries/123
```

### Quote Entry:
```
New Quote of the Day:
"The only way to do great work is to love what you do."
— Steve Jobs
Source: Stanford Commencement Address
Submitted by: Erik

View: https://your-app.com/entries/124
```

## Troubleshooting

### SMS Not Sending

1. **Check Environment Variables:**
   - Verify all three Twilio variables are set correctly
   - Make sure `TWILIO_PHONE_NUMBER` includes the `+` prefix
   - Redeploy after adding/changing variables

2. **Check Phone Numbers:**
   - Verify phone numbers are in E.164 format (`+1234567890`)
   - Make sure numbers are in the `mobile_phone` column
   - Phone numbers must be verified in Twilio (for trial accounts)

3. **Check Twilio Console:**
   - Go to **Monitor** → **Logs** → **Messaging**
   - Look for error messages or delivery failures
   - Check if you're on a trial account (has sending restrictions)

4. **Check Browser Console:**
   - Look for error messages when creating entries
   - Check if API route is being called

### Trial Account Restrictions

If you're on a Twilio trial account:
- You can only send SMS to **verified phone numbers**
- Verify numbers in Twilio Console → **Phone Numbers** → **Verified Caller IDs**
- Upgrade to a paid account to send to any number

### Message Length

- Single SMS: 160 characters
- Concatenated SMS: Up to 1600 characters (automatically handled by Twilio)
- Messages are automatically truncated if needed

## Security Notes

- **Never commit** `.env.local` or Twilio credentials to git
- Use environment variables in Vercel (never hardcode)
- The `TWILIO_AUTH_TOKEN` is sensitive - treat it like a password
- Consider using Twilio's webhook authentication for production

## Cost Information

- **SMS cost:** ~$0.0079 per SMS in US/Canada
- **Example:** 3 participants, 1 entry/day = 90 SMS/month = ~$0.71/month
- Check Twilio pricing for international numbers

## Next Steps

1. ✅ Add environment variables
2. ✅ Add phone numbers to participants table
3. ✅ Test with a sample entry
4. ✅ Verify SMS delivery in Twilio console
5. ✅ Monitor costs in Twilio dashboard

---

**Questions?** Check the Twilio documentation: https://www.twilio.com/docs/sms

