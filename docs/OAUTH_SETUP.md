# OAuth Provider Setup Guide

## Google OAuth Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API from the API Library

### 2. Configure OAuth Consent Screen
1. Navigate to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type
3. Fill in application details:
   - App name: Stitch & Wear Tailors
   - User support email: your-email@domain.com
   - App logo: Upload your app logo
   - App domain: your-domain.com
   - Privacy policy: https://your-domain.com/privacy
   - Terms of service: https://your-domain.com/terms
4. Add scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`

### 3. Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**

#### For iOS:
- Application type: iOS
- Bundle ID: `com.stitchandwear.tailors`
- App Store ID: (optional)
- Team ID: (from Apple Developer account)

#### For Android:
- Application type: Android
- Package name: `com.stitchandwear.tailors`
- SHA-1 certificate fingerprint: (from your keystore)
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```

#### For Web:
- Application type: Web application
- Authorized JavaScript origins:
  - `http://localhost:8081`
  - `exp://localhost:19000`
- Authorized redirect URIs:
  - `https://auth.expo.io/@your-username/stitch-and-wear`
  - `stitchandwear://auth/google`

### 4. Add to Environment Variables
Copy the client IDs to your `.env` file:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

## Facebook OAuth Setup

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Choose **Consumer** app type
4. Enter app details:
   - App name: Stitch & Wear Tailors
   - App contact email: your-email@domain.com

### 2. Configure Facebook Login
1. In your app dashboard, click **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Choose **iOS** and/or **Android**

#### For iOS:
1. Add Bundle ID: `com.stitchandwear.tailors`
2. Enable Single Sign On
3. Add URL Scheme: `fb{your-app-id}`

#### For Android:
1. Package Name: `com.stitchandwear.tailors`
2. Default Activity Class Name: `com.stitchandwear.tailors.MainActivity`
3. Add Key Hashes:
   ```bash
   keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore | openssl sha1 -binary | openssl base64
   ```

### 3. Configure OAuth Redirect URIs
1. Go to **Facebook Login** > **Settings**
2. Add Valid OAuth Redirect URIs:
   - `https://auth.expo.io/@your-username/stitch-and-wear`
   - `stitchandwear://auth/facebook`
   - `fb{your-app-id}://authorize`

### 4. App Review
1. Navigate to **App Review** > **Permissions and Features**
2. Request the following permissions:
   - `email`
   - `public_profile`

### 5. Add to Environment Variables
```
EXPO_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
EXPO_PUBLIC_FACEBOOK_APP_SECRET=your-facebook-app-secret
```

## Apple Sign-In Setup (iOS Only)

### 1. Enable Sign In with Apple
1. Log in to [Apple Developer](https://developer.apple.com/)
2. Go to **Certificates, Identifiers & Profiles**
3. Select your app identifier
4. Enable **Sign In with Apple** capability

### 2. Configure in Xcode
1. Open your iOS project in Xcode
2. Select your target
3. Go to **Signing & Capabilities**
4. Add **Sign In with Apple** capability

### 3. Update app.json
```json
{
  "expo": {
    "ios": {
      "usesAppleSignIn": true,
      "bundleIdentifier": "com.stitchandwear.tailors"
    }
  }
}
```

## Testing OAuth

### Development Testing
1. Use Expo Go app for initial testing
2. OAuth redirects will use Expo's proxy service
3. Test accounts:
   - Create test users in Google Cloud Console
   - Add test users in Facebook App Roles

### Production Setup
1. Update redirect URIs to production domain
2. Verify all OAuth consent screens
3. Submit for app review (Facebook)
4. Test with production builds

## Troubleshooting

### Common Issues

#### "Invalid OAuth redirect URI"
- Ensure redirect URI matches exactly in provider console
- Check for trailing slashes
- Verify URL scheme in app.json

#### "App not verified" (Google)
- Complete OAuth consent screen verification
- Add authorized domains
- Submit for verification if needed

#### "App in Development Mode" (Facebook)
- Switch app to Live mode after testing
- Complete App Review process
- Add Privacy Policy and Terms URLs

## Security Best Practices

1. **Never commit credentials**
   - Use `.env` files
   - Add `.env` to `.gitignore`

2. **Rotate secrets regularly**
   - Update OAuth secrets quarterly
   - Revoke unused credentials

3. **Use separate apps for environments**
   - Development OAuth app
   - Staging OAuth app
   - Production OAuth app

4. **Implement token refresh**
   - Store refresh tokens securely
   - Implement automatic token renewal

5. **Validate tokens server-side**
   - Verify token signatures
   - Check token expiration
   - Validate token audience