# Debugging SMS Notifications

## Checklist to Debug Why SMS Didn't Send

### 1. Check Server Console Logs

Look at the terminal where `npm run dev` is running. You should see one of these:

**If Twilio is not configured:**
```
Twilio not configured - skipping SMS notifications
```

**If there's an error:**
```
Error in notify-entry-sms: [error details]
Error fetching participants: [error details]
Error sending SMS to [name] ([phone]): [error details]
```

**If SMS sent successfully (should see this in browser console, not server):**
```
SMS notifications sent: 1/1
```

### 2. Verify Environment Variables

Make sure `.env.local` has these three variables (restart dev server after adding):

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important:**
- Phone number MUST include `+` prefix
- No spaces in the phone number
- Restart `npm run dev` after changing .env.local

### 3. Verify Phone Number in Database

In Supabase, check the `participants` table:
- Column: `mobile_phone`
- Format: E.164 format (e.g., `+14155551234`)
- Must include country code with `+` prefix
- No spaces, dashes, or parentheses

### 4. Check Browser Console

After creating an entry, check browser console (F12) for:
- `SMS notifications sent: X/X` (success)
- Any error messages about `/api/notify-entry-sms`

### 5. Check Network Tab

In browser DevTools → Network tab:
- Look for request to `/api/notify-entry-sms`
- Check the response status and body
- If 500 error, check response body for error details

### 6. Test Twilio Credentials

You can test if Twilio is working by checking:
- Twilio Console → Monitor → Logs → Messaging
- Should see failed attempts if credentials are wrong

### 7. Common Issues

**Issue: "Twilio not configured"**
- Solution: Add env vars to `.env.local` and restart dev server

**Issue: "No participants with phone numbers"**
- Solution: Add phone number to `mobile_phone` column in Supabase

**Issue: Phone number format error**
- Solution: Use E.164 format: `+1234567890` (with + and country code)

**Issue: Trial account restrictions**
- Solution: Verify phone numbers in Twilio Console → Phone Numbers → Verified Caller IDs

**Issue: API route not being called**
- Solution: Check browser console Network tab to see if request was made

---

## Quick Test

1. Create a new entry
2. Check server console for SMS-related messages
3. Check browser console for "SMS notifications sent" message
4. Check Network tab for `/api/notify-entry-sms` request
5. Check phone for SMS

If all of the above check out and you still don't receive SMS, check Twilio Console logs for delivery failures.

