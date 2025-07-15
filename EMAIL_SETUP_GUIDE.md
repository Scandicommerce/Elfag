# Email Setup Guide

## Overview
This guide will help you set up email functionality that automatically sends emails when proposals are accepted in your application.

## How It Works

When a user presses the "Accept" button:
1. The system retrieves email addresses from both companies
2. It sends an email from the job poster to the proposal sender
3. The email includes contact information and project details

## Current Status

Right now, the email functionality is partially implemented:
- ✅ Email information is retrieved from the database
- ✅ Email details are logged to the console
- ⚠️ Actual email sending requires setup (see below)

## Setup Instructions

### Option 1: Using Resend (Recommended)

1. **Sign up for Resend**
   - Go to [resend.com](https://resend.com)
   - Create an account
   - Get your API key

2. **Deploy the Supabase Edge Function**
   ```bash
   # Install Supabase CLI if you haven't already
   npm install -g @supabase/cli

   # Login to Supabase
   npx supabase login

   # Deploy the function
   npx supabase functions deploy send-acceptance-email
   ```

3. **Set Environment Variables**
   ```bash
   # Set the Resend API key
   npx supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   ```

4. **Configure Domain**
   - In `supabase/functions/send-acceptance-email/index.ts`, replace `yourdomain.com` with your verified domain
   - Add your domain to Resend and verify it

### Option 2: Using SendGrid

1. **Sign up for SendGrid**
   - Go to [sendgrid.com](https://sendgrid.com)
   - Create an account
   - Get your API key

2. **Update the Edge Function**
   - Replace the Resend API call with SendGrid's API
   - Update the email sending logic

3. **Deploy and configure as above**

### Option 3: Using Other Email Services

You can use any email service (Mailgun, AWS SES, etc.) by:
1. Updating the API call in the Edge Function
2. Setting the appropriate environment variables
3. Deploying the function

## Testing

1. **Check Console Output**
   - When you accept a proposal, check the browser console
   - You should see email information being logged

2. **Test Email Sending**
   - Once configured, test with a real proposal acceptance
   - Check that emails are delivered

## Email Content

The email sent includes:
- Professional subject line
- Company information
- Project details
- Contact information
- Reply-to address set to the job poster

## Current Email Information Available

When you press "Accept", the system can access:
- **Job Poster (You)**: 
  - Email: `real_contact_info.email`
  - Company: `real_contact_info.company_name`
- **Proposal Sender**: 
  - Email: `real_contact_info.email`
  - Company: `real_contact_info.company_name`

## Example Email Flow

**Scenario**: 
- Proposal Sender: marvelous.dev.tech9@gmail.com (Company B)

**When Accept is clicked**:
2. Email is sent TO: marvelous.dev.tech9@gmail.com
3. Reply-to is set to: rusuland9@gmail.
4. Subject: "Proposal Accepted - [Job Title]"

## Troubleshooting

1. **No email information logged**
   - Check that companies have `real_contact_info` filled out
   - Verify database permissions

2. **Email sending fails**
   - Check API key is set correctly
   - Verify domain is configured
   - Check Supabase function logs

3. **Emails not delivered**
   - Check spam folders
   - Verify email service configuration
   - Check sender domain reputation

## Security Notes

- Emails are sent through Supabase Edge Functions (server-side)
- Email addresses are not exposed to the frontend
- API keys are stored as Supabase secrets
- Reply-to addresses allow direct communication

## Next Steps

1. Set up your chosen email service
2. Deploy the Edge Function
3. Test with a real proposal acceptance
4. Monitor email delivery and logs 