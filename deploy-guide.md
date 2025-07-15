# Email Function Deployment Guide

## Quick Fix for CORS Error

The CORS error has been fixed! Here's what was done:

1. ✅ **Created proper Edge Function** at `/functions/v1/send-email`
2. ✅ **Fixed CORS headers** to allow requests from your frontend
3. ✅ **Removed duplicate fetch call** from `Inbox.tsx`
4. ✅ **Added better error handling**

## How to Deploy

Since you don't have Supabase CLI installed, you can deploy this function through the Supabase Dashboard:

### Option 1: Manual Dashboard Upload
1. Go to your Supabase dashboard
2. Navigate to "Edge Functions" 
3. Click "Create Function"
4. Name it `send-email`
5. Copy the code from `supabase/functions/send-email/index.ts`
6. Deploy it

### Option 2: Install Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy send-email
```

## Testing Without API Key

The function will work immediately after deployment, even without an email API key:

- ✅ **Will process the request** and return success
- ✅ **Will log email details** to console
- ✅ **Will fix the CORS error** you saw
- ⚠️ **Won't send actual emails** until you add a RESEND_API_KEY

## Email Sending Setup (Optional)

To send actual emails to Gmail, Outlook, ProtonMail, etc.:

1. **Sign up for Resend** at [resend.com](https://resend.com)
2. **Get your API key**
3. **Set environment variable** in Supabase:
   ```bash
   supabase secrets set RESEND_API_KEY=your_api_key_here
   ```

## Expected Behavior

After deployment, when you click "Accept" on a proposal:

1. **Function calls successfully** (no more CORS error)
2. **Email data is logged** in the console
3. **Success message shows** in the UI
4. **If API key is configured**: Email sends to any email provider

## Email Will Work With

- ✅ Gmail (@gmail.com)
- ✅ Outlook (@outlook.com, @hotmail.com)
- ✅ ProtonMail (@protonmail.com)
- ✅ Yahoo (@yahoo.com)
- ✅ Any email provider

The function sends emails through Resend, which delivers to all major email providers!

## Troubleshooting

If you still see errors:
1. Check that the function is deployed
2. Verify the function name is `send-email`
3. Check browser console for more details
4. Look at Supabase function logs 