# Supabase Email Verification Setup

## Current Status
✅ Email verification flow implemented
✅ Verification page created at `/verify-email`
✅ Auth callback handler created at `/auth/callback`

## Configure Supabase Email Settings

### Step 1: Set Redirect URLs

1. Go to your Supabase Dashboard:
   ```
   https://cmtbboloytcbwdaylngv.supabase.co/project/cmtbboloytcbwdaylngv/auth/url-configuration
   ```

2. Add these URLs to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://your-production-domain.com/auth/callback
   ```

### Step 2: Configure Email Templates (IMPORTANT)

1. Go to **Authentication > Email Templates**:
   ```
   https://cmtbboloytcbwdaylngv.supabase.co/project/cmtbboloytcbwdaylngv/auth/templates
   ```

2. Apply the Kairo-branded email templates:

   **📧 Confirm Signup Template:**
   - Click on "Confirm signup" template
   - Copy the entire content from `supabase/email-templates/confirm-signup.html`
   - Paste into the template editor
   - Click **Save**

   **🔑 Reset Password Template:**
   - Click on "Reset Password" template
   - Copy the entire content from `supabase/email-templates/reset-password.html`
   - Paste into the template editor
   - Click **Save**

   **📨 Invite User Template:**
   - Click on "Invite user" template
   - Copy the entire content from `supabase/email-templates/invite.html`
   - Paste into the template editor
   - Click **Save**

   **🎨 Template Features:**
   - ✅ Minimalist black/white design matching Kairo branding
   - ✅ Mobile responsive
   - ✅ Clear call-to-action buttons
   - ✅ Professional typography
   - ✅ Fallback links for email clients that block buttons
   - ✅ Security warnings where appropriate

### Step 3: Email Provider Settings

**Current:** Using Supabase's default email provider (limited to 3 emails/hour in free tier)

**For Production:**
1. Go to **Project Settings > Auth**
2. Scroll to **SMTP Settings**
3. Configure your email provider (recommended: Resend, SendGrid, or AWS SES)

Example with Resend:
```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: [Your Resend API Key]
Sender Email: noreply@yourdomain.com
Sender Name: Kairo
```

## How the Flow Works

### Signup Flow
1. User fills out signup form at `/signup`
2. Account created in Supabase Auth + agent/company table
3. User redirected to `/verify-email?email=user@example.com`
4. Verification email sent by Supabase with link: `http://localhost:3000/auth/callback?code=...`

### Verification Flow
1. User clicks verification link in email
2. Redirected to `/auth/callback?code=...`
3. Code exchanged for session
4. User redirected to `/dashboard` (now logged in)

### Resend Email
- User can click "Resend Verification Email" on `/verify-email` page
- Uses `supabase.auth.resend({ type: 'signup', email })`

## Testing

### Local Development
1. Sign up at http://localhost:3000/signup
2. Check terminal for email link (Supabase Inbucket in local development)
3. Or use the Supabase Dashboard to see sent emails

### Production
1. Sign up with a real email
2. Check inbox (and spam folder)
3. Click verification link
4. Should redirect to dashboard

## Future Enhancement: Numeric Verification Codes

To implement 6-digit numeric codes (like "123456"):

1. Create a new table:
   ```sql
   CREATE TABLE verification_codes (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id),
     code varchar(6) NOT NULL,
     expires_at timestamptz NOT NULL,
     used boolean DEFAULT false,
     created_at timestamptz DEFAULT now()
   );
   ```

2. Generate code on signup:
   ```typescript
   const code = Math.floor(100000 + Math.random() * 900000).toString()
   ```

3. Send via email (custom template)

4. Verify endpoint:
   ```typescript
   auth.verifyCode({ email, code })
   ```

## Troubleshooting

### Email not received
- Check spam folder
- Verify redirect URL is configured in Supabase
- Check SMTP settings if using custom provider
- Free tier limit: 3 emails/hour

### "Failed to verify email" error
- Check that redirect URL matches exactly
- Ensure code hasn't expired (24 hours)
- Check browser console for errors

### User can't login after verification
- Email might not be confirmed yet
- Check `auth.users` table `email_confirmed_at` column
- Try resending verification email

## Configuration Checklist

- [ ] Add redirect URLs to Supabase Dashboard
- [ ] Customize email templates (optional)
- [ ] Configure SMTP provider for production
- [ ] Test signup flow in development
- [ ] Test signup flow in production
- [ ] Set up monitoring for failed emails
