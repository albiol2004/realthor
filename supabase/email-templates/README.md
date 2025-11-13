# Kairo Email Templates

Beautiful, minimalist email templates that match Kairo's black/white branding.

## 📧 Available Templates

### 1. `confirm-signup.html` - Email Verification
**Purpose:** Sent when a new user signs up
**Trigger:** After successful signup at `/signup`
**User Action:** Click "Verify Email Address" button
**Result:** User is verified and redirected to dashboard

**Preview:**
```
┌──────────────────────────────────────┐
│              KAIRO                   │
│         Real Estate CRM              │
├──────────────────────────────────────┤
│                                      │
│  Welcome to Kairo!                   │
│                                      │
│  Thank you for signing up...         │
│                                      │
│  ┌────────────────────────┐         │
│  │ Verify Email Address   │         │
│  └────────────────────────┘         │
│                                      │
│  Link expires in 24 hours            │
│                                      │
└──────────────────────────────────────┘
```

### 2. `reset-password.html` - Password Reset
**Purpose:** Sent when user requests password reset
**Trigger:** User clicks "Forgot Password" on login page
**User Action:** Click "Reset Password" button
**Result:** User can set a new password

**Preview:**
```
┌──────────────────────────────────────┐
│              KAIRO                   │
│         Real Estate CRM              │
├──────────────────────────────────────┤
│                                      │
│  Reset Your Password                 │
│                                      │
│  We received a request to reset...   │
│                                      │
│  ┌────────────────────────┐         │
│  │   Reset Password       │         │
│  └────────────────────────┘         │
│                                      │
│  ⚠️ Security Notice                 │
│  Link expires in 1 hour              │
│                                      │
└──────────────────────────────────────┘
```

### 3. `invite.html` - Team Invitation
**Purpose:** Sent when a company invites an agent to join
**Trigger:** Company admin sends invitation
**User Action:** Click "Accept Invitation" button
**Result:** User creates account and joins the company

**Preview:**
```
┌──────────────────────────────────────┐
│              KAIRO                   │
│         Real Estate CRM              │
├──────────────────────────────────────┤
│                                      │
│  You're Invited!                     │
│                                      │
│  Join Kairo - the operating system   │
│  for real estate professionals       │
│                                      │
│  ┌────────────────────────┐         │
│  │  Accept Invitation     │         │
│  └────────────────────────┘         │
│                                      │
│  Invitation expires in 7 days        │
│                                      │
└──────────────────────────────────────┘
```

### 4. `confirm-signup.txt` - Plain Text Version
**Purpose:** Fallback for email clients that don't support HTML
**Same content as confirm-signup.html but in plain text format**

## 🎨 Design System

### Colors
- **Primary Background:** `#ffffff` (White)
- **Primary Text:** `#000000` (Black)
- **Secondary Text:** `#666666` (Gray)
- **Border:** `#e5e5e5` (Light Gray)
- **Button BG:** `#000000` (Black)
- **Button Text:** `#ffffff` (White)
- **Button Hover:** `#333333` (Dark Gray)

### Typography
- **Font Family:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`
- **Logo:** 32px, Bold, -0.5px letter spacing
- **Title:** 24px, Semi-bold
- **Body:** 16px, 24px line height
- **Secondary:** 14px, 20px line height

### Layout
- **Max Width:** 600px
- **Padding:** 40px (desktop), 24px (mobile)
- **Border Radius:** 8px (cards), 6px (buttons/boxes)
- **Button Padding:** 14px 32px

### Components
1. **Header** - Logo + Tagline
2. **Content Card** - White background with border
3. **CTA Button** - Black button with white text
4. **Link Box** - Gray background for alternative links
5. **Warning Box** - Yellow background for security notices
6. **Footer** - Copyright and tagline

## 📱 Responsive Design

All templates are mobile-optimized:
- Stack elements vertically on small screens
- Reduce padding on mobile
- Adjust font sizes for readability
- Touch-friendly button sizes

## 🔧 Installation

### Quick Setup (Supabase Dashboard)

1. Go to your Supabase project:
   ```
   https://app.supabase.com/project/[your-project]/auth/templates
   ```

2. For each template:
   - Click the template name (e.g., "Confirm signup")
   - Copy the HTML content from the corresponding `.html` file
   - Paste into the editor
   - Click **Save**

### Variables Available

Supabase provides these variables in templates:
- `{{ .ConfirmationURL }}` - Verification/reset/invite link
- `{{ .Token }}` - Short-lived token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

## ✅ Testing

### Test Email Verification
```bash
# 1. Sign up at localhost:3000/signup
# 2. Check your email inbox
# 3. Should see Kairo-branded email
# 4. Click button to verify
```

### Test Password Reset
```bash
# 1. Go to localhost:3000/login
# 2. Click "Forgot Password"
# 3. Enter email
# 4. Check inbox for reset email
```

### Test in Different Email Clients
- ✅ Gmail
- ✅ Outlook
- ✅ Apple Mail
- ✅ Mobile (iOS/Android)
- ✅ Dark mode support

## 📝 Customization

To customize the templates:

1. **Change colors:**
   - Update hex values in `<style>` section
   - Maintain sufficient contrast for accessibility

2. **Update content:**
   - Edit text directly in HTML
   - Keep `{{ .ConfirmationURL }}` variable intact

3. **Add logo image:**
   ```html
   <img src="https://your-cdn.com/kairo-logo.png" alt="Kairo" width="120">
   ```

4. **Add social links:**
   ```html
   <a href="https://twitter.com/kairo">Twitter</a>
   <a href="https://linkedin.com/company/kairo">LinkedIn</a>
   ```

## 🚀 Production Checklist

- [ ] All templates uploaded to Supabase
- [ ] Test email sending works
- [ ] Redirect URLs configured correctly
- [ ] SMTP provider configured (for production)
- [ ] Templates display correctly in major email clients
- [ ] Mobile responsive verified
- [ ] Links work correctly
- [ ] Unsubscribe link added (for marketing emails)

## 📚 Resources

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Template Best Practices](https://www.litmus.com/blog/best-practices-for-plain-text-emails-a-look-at-why-theyre-important)
- [Can I Email](https://www.caniemail.com/) - Email client support reference

---

**Need help?** Check `SUPABASE_EMAIL_SETUP.md` for complete setup instructions.
