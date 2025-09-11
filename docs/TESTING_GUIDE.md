# Enhanced Authentication Testing Guide

## Prerequisites

1. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Fill in all required credentials
   - Run database setup: `node scripts/setup-auth-collections.js`

2. **Device Requirements**
   - iOS: iPhone with Face ID or Touch ID
   - Android: Device with fingerprint sensor
   - Both: Camera for QR code scanning

## Testing Scenarios

### 1. Two-Factor Authentication (2FA)

#### TOTP (Authenticator App) Testing

**Setup Flow:**
1. Sign in to the app
2. Navigate to Settings > Security > Two-Factor Authentication
3. Select "Authenticator App"
4. Install Google Authenticator or Authy on test device
5. Scan the QR code displayed
6. Enter the 6-digit code from authenticator app
7. Save backup codes securely

**Test Cases:**
- ✅ QR code displays correctly
- ✅ Manual entry key can be copied
- ✅ Verification code validates correctly
- ✅ Backup codes are generated (8 codes)
- ✅ Invalid code shows error message
- ✅ 2FA status updates in UI

**Login Testing:**
1. Sign out of the app
2. Sign in with email/password
3. Enter 2FA code when prompted
4. Test with:
   - Valid code → Should login
   - Invalid code → Should show error
   - Expired code → Should reject
   - Backup code → Should work once

#### SMS 2FA Testing

**Setup Flow:**
1. Navigate to Two-Factor Authentication
2. Select "SMS Text Message"
3. Enter phone number with country code
4. Receive and enter verification code
5. Enable SMS 2FA

**Test Cases:**
- ✅ Phone number validation
- ✅ SMS delivery (check Twilio logs)
- ✅ Code expiration (5 minutes)
- ✅ Resend code functionality
- ✅ International numbers support

### 2. Biometric Authentication

#### iOS Testing (Face ID/Touch ID)

**Setup Flow:**
1. Ensure Face ID/Touch ID is configured in iOS Settings
2. Open app and navigate to Settings > Security > Biometric
3. Tap "Enable Face ID" or "Enable Touch ID"
4. Authenticate with biometric
5. Enter password to link credentials

**Test Cases:**
- ✅ Biometric availability detection
- ✅ Proper permission prompts
- ✅ Successful enrollment
- ✅ Failed biometric → fallback to password
- ✅ App deletion → credentials cleared
- ✅ Multiple failed attempts → lockout

**Testing Commands:**
```bash
# iOS Simulator - Face ID
xcrun simctl spawn booted notifyutil -s com.apple.BiometricKit.enrollmentChanged '1'
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit.identityAttributesUpdated

# Test Face ID match/non-match in Simulator
Device > Face ID > Enrolled
Device > Face ID > Matching Face / Non-matching Face
```

#### Android Testing (Fingerprint)

**Setup Flow:**
1. Configure fingerprint in Android Settings
2. Open app and navigate to Biometric settings
3. Enable fingerprint authentication
4. Test authentication

**Test Cases:**
- ✅ Fingerprint sensor detection
- ✅ Android BiometricPrompt displays
- ✅ Successful authentication
- ✅ Fallback to device PIN/pattern
- ✅ Keystore encryption working

**Testing Commands:**
```bash
# Android Emulator - Fingerprint
adb -e emu finger touch 1  # Simulate fingerprint success
adb -e emu finger touch 2  # Simulate different fingerprint
```

### 3. Social Authentication

#### Google Sign-In Testing

**Setup:**
1. Configure Google OAuth (see OAUTH_SETUP.md)
2. Add test users in Google Cloud Console

**Test Flow:**
1. Tap "Continue with Google" on sign-in screen
2. Select Google account
3. Grant permissions
4. Verify account creation/linking

**Test Cases:**
- ✅ OAuth redirect works
- ✅ New user account creation
- ✅ Existing email → account linking
- ✅ Profile picture imports
- ✅ Cancel flow handled
- ✅ Token refresh works

#### Facebook Sign-In Testing

**Setup:**
1. Configure Facebook App (see OAUTH_SETUP.md)
2. Add test users in Facebook App Roles

**Test Flow:**
1. Tap "Continue with Facebook"
2. Authenticate with Facebook
3. Grant app permissions
4. Verify account setup

**Test Cases:**
- ✅ Facebook SDK initialization
- ✅ Permission requests (email, profile)
- ✅ Account linking for existing emails
- ✅ Error handling for declined permissions

#### Apple Sign-In Testing (iOS Only)

**Test Flow:**
1. Tap "Sign in with Apple"
2. Use Face ID/Touch ID
3. Choose to share or hide email
4. Verify account creation

**Test Cases:**
- ✅ Apple ID authentication
- ✅ Email relay service works
- ✅ Name components handled
- ✅ Hide email option works

### 4. Session Management Testing

**Multi-Device Sessions:**
1. Sign in on Device A
2. Sign in on Device B
3. Check active sessions list
4. Revoke session from Device A
5. Verify Device B is logged out

**Test Cases:**
- ✅ Multiple concurrent sessions
- ✅ Session list displays correctly
- ✅ Remote session termination
- ✅ "Remember Me" extends session
- ✅ Session expiry after inactivity

### 5. Security Testing

**Password Reset with 2FA:**
1. Enable 2FA
2. Request password reset
3. Verify 2FA required for reset
4. Complete reset flow

**Account Recovery:**
1. Test with backup codes
2. Test biometric re-enrollment
3. Test social account recovery

**Suspicious Activity:**
1. Multiple failed login attempts
2. Login from new location
3. Verify security alerts sent

## Automated Testing

### Unit Tests
```bash
# Run authentication service tests
yarn test app/services/auth

# Run specific test suite
yarn test TwoFactorAuthService.test.ts
```

### E2E Tests
```bash
# iOS E2E tests
yarn e2e:ios

# Android E2E tests
yarn e2e:android
```

### Test Data
```javascript
// Test credentials
const testUser = {
  email: 'test@stitchandwear.com',
  password: 'TestPass123!',
  phone: '+1234567890',
  totpSecret: 'JBSWY3DPEHPK3PXP'
};

// Test 2FA codes (for TOTP testing)
// Use: https://totp.danhersam.com/ with secret above
```

## Debugging

### Common Issues

**2FA QR Code Not Scanning:**
- Check camera permissions
- Ensure adequate lighting
- Try manual entry option
- Verify QR code generation

**Biometric Not Available:**
```javascript
// Check availability
const result = await LocalAuthentication.hasHardwareAsync();
console.log('Hardware:', result);

const enrolled = await LocalAuthentication.isEnrolledAsync();
console.log('Enrolled:', enrolled);
```

**OAuth Redirect Issues:**
- Verify redirect URIs match exactly
- Check URL schemes in app.json
- Ensure deep linking configured
- Test with `expo prebuild`

**SMS Not Received:**
- Check Twilio console for errors
- Verify phone number format
- Check geographic permissions
- Monitor rate limits

### Debug Logging

Enable verbose logging:
```javascript
// In app/services/auth/TwoFactorAuthService.ts
const DEBUG = true; // Set to true for verbose logs
```

Check logs:
```bash
# iOS logs
npx react-native log-ios

# Android logs
npx react-native log-android

# Expo logs
expo start --clear
```

## Performance Testing

### Metrics to Monitor
- Biometric authentication: < 1 second
- 2FA code generation: < 100ms
- OAuth redirect: < 3 seconds
- Session validation: < 50ms

### Load Testing
```javascript
// Test concurrent authentications
for (let i = 0; i < 100; i++) {
  await authService.authenticate({
    email: `test${i}@example.com`,
    password: 'password'
  });
}
```

## Security Checklist

- [ ] Credentials encrypted in Keychain/Keystore
- [ ] Tokens expire appropriately
- [ ] Backup codes are one-time use
- [ ] Failed attempts trigger lockout
- [ ] Session hijacking prevented
- [ ] CSRF tokens implemented
- [ ] Rate limiting active
- [ ] Audit logs created
- [ ] No sensitive data in logs
- [ ] Secure password requirements enforced

## Production Readiness

Before deploying to production:

1. **Security Audit**
   - Run security scanner
   - Review OWASP compliance
   - Penetration testing

2. **Performance Testing**
   - Load test authentication endpoints
   - Measure biometric response times
   - Test token refresh under load

3. **Monitoring Setup**
   - Authentication success/failure rates
   - 2FA adoption metrics
   - Suspicious activity alerts
   - Session analytics

4. **Documentation**
   - User guides created
   - FAQ section ready
   - Support team trained
   - Recovery procedures documented

## Support Resources

- **Technical Issues**: dev-team@stitchandwear.com
- **Security Concerns**: security@stitchandwear.com
- **Documentation**: /docs/authentication
- **Status Page**: status.stitchandwear.com