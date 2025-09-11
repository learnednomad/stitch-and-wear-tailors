# Authentication Implementation Guide
## Stitch & Wear Tailors - React Native + Appwrite

This guide provides the correct implementation patterns for completing the authentication features in your React Native application using Appwrite.

---

## 📌 Password Recovery Implementation

### Overview
Appwrite provides two methods for password recovery:
- `createRecovery(email, url)` - Sends recovery email with a link
- `updateRecovery(userId, secret, password)` - Completes the password reset

### Implementation Steps

#### 1. Create Forgot Password Screen
```typescript
// app/screens/auth/ForgotPasswordScreen.tsx
import React, { useState } from 'react'
import { View, Alert } from 'react-native'
import { Screen, Text, TextField, Button } from '@/components'
import { appwriteAccount } from '@/services/appwrite/appwrite-client'
import { useNavigation } from '@react-navigation/native'
import { validateEmail } from '@/utils/emailValidation'

export function ForgotPasswordScreen() {
  const navigation = useNavigation()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // For React Native, we need to use a web URL that will handle the deep link
  // This URL should be configured in your Appwrite console
  const RECOVERY_URL = 'https://your-domain.com/reset-password'
  
  const handlePasswordReset = async () => {
    const emailValidation = validateEmail(email)
    if (!emailValidation.isValid) {
      Alert.alert('Invalid Email', emailValidation.errors[0])
      return
    }
    
    setIsLoading(true)
    try {
      await appwriteAccount.createRecovery(
        email.trim().toLowerCase(),
        RECOVERY_URL
      )
      
      Alert.alert(
        'Email Sent!',
        'Check your email for password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      )
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send recovery email')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Screen preset="scroll">
      <View style={$container}>
        <Text preset="heading" text="Reset Password" />
        <Text text="Enter your email to receive reset instructions" />
        
        <TextField
          value={email}
          onChangeText={setEmail}
          label="Email"
          placeholder="your@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <Button
          text={isLoading ? "Sending..." : "Send Reset Email"}
          onPress={handlePasswordReset}
          disabled={isLoading}
        />
        
        <Button
          text="Back to Sign In"
          preset="reversed"
          onPress={() => navigation.goBack()}
        />
      </View>
    </Screen>
  )
}
```

#### 2. Handle Deep Links for Password Reset
```typescript
// app/screens/auth/ResetPasswordScreen.tsx
import React, { useState, useEffect } from 'react'
import { View, Alert } from 'react-native'
import { Screen, Text, TextField, Button, PasswordStrengthIndicator } from '@/components'
import { appwriteAccount } from '@/services/appwrite/appwrite-client'
import { useNavigation, useRoute } from '@react-navigation/native'
import { validatePassword } from '@/utils/passwordValidation'

export function ResetPasswordScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Extract userId and secret from route params or deep link
  const userId = route.params?.userId || ''
  const secret = route.params?.secret || ''
  
  useEffect(() => {
    if (!userId || !secret) {
      Alert.alert('Invalid Link', 'The reset link is invalid or expired.')
      navigation.navigate('SignIn')
    }
  }, [userId, secret])
  
  const handleResetPassword = async () => {
    // Validate password
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      Alert.alert('Invalid Password', 'Password does not meet requirements')
      return
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match')
      return
    }
    
    setIsLoading(true)
    try {
      await appwriteAccount.updateRecovery(userId, secret, password)
      
      Alert.alert(
        'Password Reset!',
        'Your password has been successfully reset.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('SignIn')
          }
        ]
      )
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <Screen preset="scroll">
      <View style={$container}>
        <Text preset="heading" text="Create New Password" />
        
        <TextField
          value={password}
          onChangeText={setPassword}
          label="New Password"
          secureTextEntry
          placeholder="Enter new password"
        />
        
        <PasswordStrengthIndicator
          password={password}
          showCriteria={true}
        />
        
        <TextField
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          label="Confirm Password"
          secureTextEntry
          placeholder="Confirm new password"
        />
        
        <Button
          text={isLoading ? "Resetting..." : "Reset Password"}
          onPress={handleResetPassword}
          disabled={isLoading}
        />
      </View>
    </Screen>
  )
}
```

#### 3. Configure Deep Linking
```typescript
// app/navigators/AppNavigator.tsx
// Add deep link configuration
const linking = {
  prefixes: ['stitchandwear://', 'https://your-domain.com'],
  config: {
    screens: {
      ResetPassword: {
        path: 'reset-password',
        parse: {
          userId: (userId: string) => userId,
          secret: (secret: string) => secret,
        },
      },
    },
  },
}

// In your app.json for Expo:
{
  "expo": {
    "scheme": "stitchandwear",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "your-domain.com",
              "pathPrefix": "/reset-password"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

#### 4. Add to AuthService
```typescript
// app/services/auth/AuthService.ts
// Add these methods to AuthService class

async createPasswordRecovery(email: string): Promise<AuthResponse> {
  try {
    // Use a web URL that will redirect to your app
    const recoveryUrl = 'https://your-domain.com/reset-password'
    
    await appwriteAccount.createRecovery(
      email.trim().toLowerCase(),
      recoveryUrl
    )
    
    return {
      success: true
    }
  } catch (error: any) {
    return {
      success: false,
      error: ErrorHandler.formatErrorMessage(error)
    }
  }
}

async updatePassword(userId: string, secret: string, password: string): Promise<AuthResponse> {
  try {
    await appwriteAccount.updateRecovery(userId, secret, password)
    
    return {
      success: true
    }
  } catch (error: any) {
    return {
      success: false,
      error: ErrorHandler.formatErrorMessage(error)
    }
  }
}
```

---

## 📌 Email Service Configuration

### 1. Configure SMTP in Appwrite Console
1. Go to Appwrite Console → Settings → SMTP
2. Configure your SMTP provider:
   ```
   Host: smtp.gmail.com (for Gmail)
   Port: 587
   Username: your-email@gmail.com
   Password: your-app-password
   Sender Name: Stitch & Wear Tailors
   Sender Email: noreply@stitchandwear.com
   ```

### 2. Customize Email Templates
1. Go to Appwrite Console → Auth → Templates
2. Customize templates for:
   - Email Verification
   - Password Recovery
   - Magic URL

Example template:
```html
<h2>Reset Your Password</h2>
<p>Hello {{name}},</p>
<p>You requested to reset your password. Click the link below:</p>
<a href="{{redirect}}?userId={{userId}}&secret={{secret}}">Reset Password</a>
<p>This link expires in 1 hour.</p>
```

---

## 📌 OAuth Integration (Google & Facebook)

### 1. Configure OAuth Providers in Appwrite
1. Go to Appwrite Console → Auth → Settings
2. Enable Google/Facebook OAuth
3. Add OAuth credentials from Google/Facebook developer consoles

### 2. Implement OAuth in React Native
```typescript
// app/screens/auth/SignInScreen.tsx
// Update OAuth handlers

import { OAuthProvider } from 'react-native-appwrite'
import { Linking } from 'react-native'

const handleGoogleLogin = async () => {
  try {
    // For React Native, we use createOAuth2Token instead of createOAuth2Session
    const result = await appwriteAccount.createOAuth2Token(
      OAuthProvider.Google,
      'stitchandwear://oauth-success', // Success URL
      'stitchandwear://oauth-failure'  // Failure URL
    )
    
    // The result will redirect to your app with userId and secret
    // Handle in your deep link handler
  } catch (error) {
    Alert.alert('Error', 'Google login failed')
  }
}

// Handle OAuth callback
const handleOAuthCallback = async (url: string) => {
  const params = new URLSearchParams(url.split('?')[1])
  const userId = params.get('userId')
  const secret = params.get('secret')
  
  if (userId && secret) {
    try {
      // Create session with the token
      const session = await appwriteAccount.createSession(userId, secret)
      
      // Fetch user details and complete login
      const user = await appwriteAccount.get()
      // ... handle successful login
    } catch (error) {
      Alert.alert('Error', 'OAuth login failed')
    }
  }
}
```

---

## 📌 Complete 2FA Implementation

### 1. Add 2FA Challenge Screen
```typescript
// app/screens/auth/TwoFactorChallengeScreen.tsx
import React, { useState } from 'react'
import { View, Alert } from 'react-native'
import { Screen, Text, TextField, Button } from '@/components'
import { appwriteAccount } from '@/services/appwrite/appwrite-client'
import { useNavigation, useRoute } from '@react-navigation/native'
import { AuthenticationFactor } from 'react-native-appwrite'

export function TwoFactorChallengeScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Get challenge data from navigation params
  const { challengeId, factor } = route.params || {}
  
  const handleVerify2FA = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a 6-digit code')
      return
    }
    
    setIsLoading(true)
    try {
      // Complete the MFA challenge
      const session = await appwriteAccount.updateMfaChallenge(
        challengeId,
        code
      )
      
      // Login successful with 2FA
      // Navigate to appropriate screen based on user role
      navigation.navigate('ClientTab')
    } catch (error: any) {
      Alert.alert('Invalid Code', 'The code you entered is incorrect')
    } finally {
      setIsLoading(false)
    }
  }
  
  const resendCode = async () => {
    try {
      // Create new challenge for the same factor
      const newChallenge = await appwriteAccount.createMfaChallenge(factor)
      // Update challengeId with new one
      route.params.challengeId = newChallenge.$id
      Alert.alert('Code Sent', 'A new code has been sent')
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code')
    }
  }
  
  return (
    <Screen preset="scroll">
      <View style={$container}>
        <Text preset="heading" text="Two-Factor Authentication" />
        <Text text={`Enter the 6-digit code from your ${factor === 'totp' ? 'authenticator app' : 'SMS'}`} />
        
        <TextField
          value={code}
          onChangeText={setCode}
          label="Verification Code"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          style={$codeInput}
        />
        
        <Button
          text={isLoading ? "Verifying..." : "Verify"}
          onPress={handleVerify2FA}
          disabled={isLoading || code.length !== 6}
        />
        
        {factor === 'sms' && (
          <Button
            text="Resend Code"
            preset="reversed"
            onPress={resendCode}
          />
        )}
      </View>
    </Screen>
  )
}
```

### 2. Update Login Flow for 2FA
```typescript
// In AuthService.login method, handle 2FA requirement
if (requires2FA) {
  // Create MFA challenge
  const challenge = await appwriteAccount.createMfaChallenge(
    AuthenticationFactor.Totp // or Email/SMS based on user preference
  )
  
  return {
    success: true,
    requires2FA: true,
    data: {
      challengeId: challenge.$id,
      factor: challenge.factor,
      user: null,
      session: null,
      accessToken: null,
      refreshToken: null
    }
  }
}

// In SignInScreen, handle 2FA response
if (result.requires2FA) {
  navigation.navigate('TwoFactorChallenge', {
    challengeId: result.data.challengeId,
    factor: result.data.factor
  })
  return
}
```

---

## 📌 Session Management Enhancements

### 1. Multi-Device Session Management
```typescript
// app/screens/settings/SessionsScreen.tsx
import React, { useState, useEffect } from 'react'
import { View, FlatList, Alert } from 'react-native'
import { Screen, Text, Button } from '@/components'
import { appwriteAccount } from '@/services/appwrite/appwrite-client'

export function SessionsScreen() {
  const [sessions, setSessions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    loadSessions()
  }, [])
  
  const loadSessions = async () => {
    try {
      const sessionList = await appwriteAccount.listSessions()
      setSessions(sessionList.sessions)
    } catch (error) {
      Alert.alert('Error', 'Failed to load sessions')
    } finally {
      setIsLoading(false)
    }
  }
  
  const terminateSession = async (sessionId: string) => {
    try {
      await appwriteAccount.deleteSession(sessionId)
      loadSessions() // Refresh list
      Alert.alert('Success', 'Session terminated')
    } catch (error) {
      Alert.alert('Error', 'Failed to terminate session')
    }
  }
  
  const terminateAllSessions = async () => {
    Alert.alert(
      'Terminate All Sessions',
      'This will log you out from all devices. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate All',
          style: 'destructive',
          onPress: async () => {
            try {
              await appwriteAccount.deleteSessions()
              // This will log out current session too
              navigation.navigate('SignIn')
            } catch (error) {
              Alert.alert('Error', 'Failed to terminate sessions')
            }
          }
        }
      ]
    )
  }
  
  const renderSession = ({ item }) => (
    <View style={$sessionItem}>
      <Text text={item.clientName} />
      <Text text={`${item.osName} - ${item.countryName}`} />
      <Text text={`Last active: ${new Date(item.current).toLocaleDateString()}`} />
      {item.current ? (
        <Text text="Current Session" style={$currentSession} />
      ) : (
        <Button
          text="Terminate"
          onPress={() => terminateSession(item.$id)}
          preset="reversed"
        />
      )}
    </View>
  )
  
  return (
    <Screen preset="scroll">
      <View style={$container}>
        <Text preset="heading" text="Active Sessions" />
        
        <Button
          text="Terminate All Other Sessions"
          onPress={terminateAllSessions}
          style={$terminateAllButton}
        />
        
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.$id}
          refreshing={isLoading}
          onRefresh={loadSessions}
        />
      </View>
    </Screen>
  )
}
```

---

## 📌 Testing Checklist

### Email Service
- [ ] Configure SMTP settings in Appwrite Console
- [ ] Test email verification flow
- [ ] Test password recovery flow
- [ ] Verify email templates are working

### Password Recovery
- [ ] Test forgot password email sending
- [ ] Test deep link handling
- [ ] Test password reset completion
- [ ] Verify expired link handling

### OAuth
- [ ] Configure OAuth providers in Appwrite
- [ ] Test Google login flow
- [ ] Test Facebook login flow
- [ ] Verify account linking for existing emails

### 2FA
- [ ] Test TOTP setup and verification
- [ ] Test SMS setup and verification
- [ ] Test login with 2FA challenge
- [ ] Test backup codes

### Session Management
- [ ] Test multi-device session listing
- [ ] Test individual session termination
- [ ] Test terminating all sessions
- [ ] Verify current session handling

---

## 📌 Security Best Practices

1. **Rate Limiting**: Already implemented in your code
2. **Password Requirements**: Already validated
3. **Session Security**: 
   - Set appropriate session timeout
   - Implement session refresh
   - Clear sessions on logout

4. **Deep Link Security**:
   - Validate all parameters
   - Check token expiry
   - Use HTTPS for redirect URLs

5. **OAuth Security**:
   - Validate state parameter
   - Use PKCE for OAuth flows
   - Verify redirect URLs

---

## 📌 Production Checklist

1. **Environment Configuration**:
   - Set production Appwrite endpoint
   - Configure proper redirect URLs
   - Set up production SMTP

2. **Deep Links**:
   - Configure universal links (iOS)
   - Configure app links (Android)
   - Test on real devices

3. **Error Handling**:
   - Handle network errors gracefully
   - Provide user-friendly error messages
   - Log errors for monitoring

4. **Performance**:
   - Implement proper loading states
   - Cache user data appropriately
   - Minimize API calls

---

This guide provides the correct implementation patterns based on Appwrite's official documentation. The key differences for React Native:
- Use `createOAuth2Token` instead of `createOAuth2Session` for OAuth
- Handle deep links for password reset and OAuth callbacks
- Use web URLs that redirect to your app scheme

Remember to test thoroughly on both iOS and Android devices!