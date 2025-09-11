# Authentication Setup Guide - Stitch & Wear Tailors

## 📋 Overview

This guide provides complete instructions for setting up authentication in the Stitch & Wear Tailors application using Appwrite as the backend service.

---

## 🔧 Prerequisites

1. **Appwrite Account**: Create an account at [cloud.appwrite.io](https://cloud.appwrite.io)
2. **Node.js**: Version 16+ installed
3. **Environment Variables**: Access to create/modify `.env` file
4. **API Key**: Appwrite API key with appropriate permissions

---

## 🚀 Quick Setup

### Step 1: Configure Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Update with your Appwrite credentials:

```env
# Appwrite Configuration
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id-here
EXPO_PUBLIC_APPWRITE_DATABASE_ID=stitch-and-wear-db
EXPO_PUBLIC_APPWRITE_STORAGE_ID=stitch-and-wear-storage

# Server-side API Key (required for setup script)
APPWRITE_API_KEY=your-api-key-here
```

### Step 2: Run Authentication Setup Script

```bash
npm run setup:auth
# or
node scripts/setup-auth-complete.js
```

This script will:
- ✅ Create database if needed
- ✅ Create all authentication collections
- ✅ Set up user profiles structure
- ✅ Create security collections (sessions, tokens, etc.)
- ✅ Set up teams for role-based access
- ✅ Create test users for development

### Step 3: Verify Setup

Check your Appwrite console to confirm:
1. Database `stitch-and-wear-db` exists
2. Authentication collections are created
3. Test users are available

---

## 📊 Authentication Architecture

### Collections Created

1. **user_profiles** - Extended user information
   - userId, email, firstName, lastName
   - userType (client/tailor/admin)
   - status, verification flags
   - Contact and address information

2. **auth_sessions** - Active user sessions
   - Session tracking
   - Device information
   - Activity timestamps

3. **password_reset_tokens** - Password recovery
   - Secure token generation
   - Expiration management

4. **email_verification_tokens** - Email verification
   - Verification workflow
   - Token expiration

5. **two_factor_auth** - 2FA configuration
   - TOTP/SMS/Email methods
   - Backup codes

6. **login_attempts** - Rate limiting
   - Failed attempt tracking
   - Temporary blocking

7. **security_events** - Audit logging
   - Login/logout events
   - Security incidents
   - Password changes

---

## 🔐 Authentication Flows

### 1. User Registration Flow

```typescript
// Frontend: SignUpScreen.tsx
const result = await AuthService.register({
  email: "user@example.com",
  password: "SecurePass123!",
  firstName: "John",
  lastName: "Doe",
  userType: "client", // or "tailor"
  phone: "+234801234567"
})

// Backend process:
// 1. Creates Appwrite account
// 2. Creates user_profile record
// 3. Sends verification email
// 4. Returns success (no session yet)
```

### 2. Email Verification Flow

```typescript
// User clicks verification link in email
const verified = await AuthService.verifyEmail(token)

// Updates user_profile.emailVerified = true
// Updates user_profile.status = "active"
```

### 3. Login Flow

```typescript
// Frontend: SignInScreen.tsx
const result = await AuthService.login({
  email: "user@example.com",
  password: "SecurePass123!",
  rememberMe: true
})

// Backend process:
// 1. Validates credentials
// 2. Checks email verification
// 3. Checks 2FA if enabled
// 4. Creates session
// 5. Returns user + tokens
```

### 4. Password Reset Flow

```typescript
// Request reset
await AuthService.requestPasswordReset("user@example.com")

// Reset with token
await AuthService.resetPassword(token, "NewSecurePass123!")
```

---

## 🧪 Test Users

After running the setup script, these test users are available:

| Email | Password | Role | Status |
|-------|----------|------|--------|
| admin@stitchandwear.com | Admin@123456 | Admin | Active |
| tailor@stitchandwear.com | Tailor@123456 | Tailor | Active |
| client@stitchandwear.com | Client@123456 | Client | Active |

---

## 🔒 Security Features

### Rate Limiting
- **Login attempts**: 5 failed attempts = 15 min block
- **Registration**: 3 attempts per hour per email
- **Password reset**: 3 requests per hour

### Session Management
- **Session timeout**: 30 minutes of inactivity
- **Remember me**: 30-day persistent sessions
- **Device tracking**: Multiple device support
- **Session invalidation**: Logout from all devices

### Password Requirements
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Two-Factor Authentication (2FA)
- **TOTP**: Time-based one-time passwords
- **SMS**: Text message codes (requires Twilio)
- **Email**: Email-based codes
- **Backup codes**: Recovery codes

---

## 🎨 Frontend Integration

### AuthStore (MobX State Tree)

```typescript
// app/models/stores/AuthStore.ts
const { authStore } = useStores()

// Check authentication
if (authStore.isAuthenticated) {
  // User is logged in
}

// Access user data
const user = authStore.user
const role = user.role // "client" | "tailor" | "admin"

// Logout
await authStore.signOut()
```

### Navigation Guards

```typescript
// app/navigators/AppNavigator.tsx
const AppStack = () => {
  const { authStore } = useStores()
  
  if (!authStore.isAuthenticated) {
    return <AuthNavigator />
  }
  
  switch(authStore.user.role) {
    case 'tailor':
      return <TailorNavigator />
    case 'client':
      return <ClientNavigator />
    case 'admin':
      return <AdminNavigator />
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure `.env` file exists and contains all required variables
   - Check that `APPWRITE_API_KEY` has proper permissions

2. **"Collection already exists"**
   - This is normal if running setup multiple times
   - Collections are not overwritten to preserve data

3. **"User already exists"**
   - Test users are only created once
   - Use existing credentials or create new users

4. **"Authentication failed"**
   - Verify email is verified before login
   - Check rate limiting status
   - Ensure password meets requirements

### Debug Mode

Enable debug logging:

```typescript
// app/services/auth/AuthService.ts
const DEBUG = true // Set to true for verbose logging
```

---

## 📚 API Reference

### AuthService Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `register()` | Create new user account | RegistrationData |
| `login()` | Authenticate user | LoginCredentials |
| `logout()` | End current session | - |
| `verifyEmail()` | Verify email address | token: string |
| `requestPasswordReset()` | Request password reset | email: string |
| `resetPassword()` | Reset password with token | token, newPassword |
| `enable2FA()` | Enable two-factor auth | method: string |
| `verify2FA()` | Verify 2FA code | code: string |
| `refreshToken()` | Refresh access token | refreshToken: string |
| `getUserProfile()` | Get user profile | userId: string |
| `updateProfile()` | Update user profile | updates: object |

---

## 🚦 Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid credentials |
| 403 | Forbidden - Email not verified or account suspended |
| 404 | Not Found - User doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error - Contact support |

---

## 🔄 Migration from Previous Auth

If migrating from a previous authentication system:

1. Export user data from old system
2. Run migration script: `npm run migrate:users`
3. Send password reset emails to all users
4. Update frontend to use new AuthService

---

## 📝 Best Practices

1. **Always validate input** on both client and server
2. **Use HTTPS** in production
3. **Implement rate limiting** for all auth endpoints
4. **Log security events** for audit trails
5. **Regular security audits** of authentication flow
6. **Keep dependencies updated** for security patches
7. **Use secure session storage** (Keychain/Keystore)
8. **Implement account lockout** after suspicious activity
9. **Send security notifications** for account changes
10. **Regular backup** of authentication data

---

## 🆘 Support

For authentication issues:
1. Check this documentation first
2. Review error messages in console
3. Check Appwrite dashboard for service status
4. Contact support with error details

---

## 📄 License

This authentication system is part of the Stitch & Wear Tailors application.
© 2024 Stitch & Wear Tailors. All rights reserved.