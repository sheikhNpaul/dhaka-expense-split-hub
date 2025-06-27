# Password Reset Flow Documentation

## Overview
This document explains how the password reset functionality works in the expense splitter application.

## Flow Steps

### 1. User Requests Password Reset
- User clicks "Forgot your password?" on the login page
- User enters their email address
- System sends password reset email via Supabase

### 2. User Receives Email
- Supabase sends an email with a reset link
- Link format: `https://yourdomain.com/reset-password#access_token=...&refresh_token=...&type=recovery`

### 3. User Clicks Reset Link
- User is redirected to `/reset-password` page
- Page validates the recovery tokens in the URL hash
- If valid, user can enter new password

### 4. Password Validation
The new password must meet these requirements:
- At least 6 characters long
- Contains at least one number
- Contains at least one letter
- Passwords must match (confirm password)

### 5. Password Update
- System updates user's password via Supabase
- User is signed out automatically
- User is redirected to login page

## Technical Implementation

### Files Involved
- `src/components/ForgotPassword.tsx` - Password reset request form
- `src/pages/ResetPassword.tsx` - Password reset page
- `src/lib/config.ts` - Redirect URL configuration
- `src/App.tsx` - Route configuration

### Environment Variables Required
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Configuration
Make sure these redirect URLs are added to your Supabase project:
- `https://yourdomain.com/reset-password`
- `http://localhost:8080/reset-password` (for development)

## Testing the Flow

### Local Development
1. Start the development server: `npm run dev`
2. Go to `http://localhost:8080`
3. Click "Forgot your password?"
4. Enter your email
5. Check your email for the reset link
6. Click the link and test password reset

### Production
1. Deploy your application
2. Ensure environment variables are set
3. Add production redirect URLs to Supabase
4. Test the complete flow

## Troubleshooting

### Common Issues
1. **"Invalid Reset Link" error**
   - Check if redirect URLs are properly configured in Supabase
   - Verify environment variables are set correctly

2. **Email not received**
   - Check spam folder
   - Verify email address is correct
   - Check Supabase email settings

3. **Password validation errors**
   - Ensure password meets all requirements
   - Check that passwords match

### Debug Information
The reset password page includes console logging to help debug issues:
- Session validation status
- URL parameters and hash
- Auth state changes

## Security Considerations
- Reset links expire automatically (handled by Supabase)
- Passwords are validated for strength
- Users are signed out after password reset
- All sensitive data is handled via environment variables 