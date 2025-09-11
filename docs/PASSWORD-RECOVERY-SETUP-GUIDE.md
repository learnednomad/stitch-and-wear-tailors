# Password Recovery Setup Guide
## Stitch & Wear Tailors - React Native + Appwrite

This guide explains how to complete the password recovery setup for your application.

---

## 📋 Prerequisites

- Appwrite server running (version 1.6.0 or compatible)
- SMTP service credentials (Gmail, SendGrid, etc.)
- Domain for hosting password reset web page
- iOS/Android app configured for deep linking

---

## 🔧 Configuration Steps

### 1. Configure SMTP in Appwrite Console

1. **Access Appwrite Console**:
   ```
   https://your-appwrite-server/console
   ```

2. **Navigate to Settings → SMTP**

3. **Configure SMTP Provider**:
   ```
   Host: smtp.gmail.com (for Gmail)
   Port: 587
   Username: your-email@gmail.com
   Password: your-app-password
   Sender Name: Stitch & Wear Tailors
   Sender Email: noreply@stitchandwear.com
   Security: TLS/STARTTLS
   ```

   **For Gmail**:
   - Enable 2-factor authentication
   - Generate app-specific password
   - Use app password instead of regular password

   **For SendGrid**:
   ```
   Host: smtp.sendgrid.net
   Port: 587
   Username: apikey
   Password: your-sendgrid-api-key
   ```

4. **Test Email Configuration**:
   - Use "Send Test Email" button
   - Verify email arrives in inbox

### 2. Customize Email Templates

1. **Navigate to Auth → Templates**

2. **Edit "Password Recovery" Template**:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <style>
           body { font-family: Arial, sans-serif; color: #333; }
           .container { max-width: 600px; margin: 0 auto; padding: 20px; }
           .header { background-color: #2B5D2F; color: white; padding: 20px; text-align: center; }
           .content { padding: 20px; background-color: #f9f9f9; }
           .button { 
               display: inline-block; 
               padding: 12px 24px; 
               background-color: #2B5D2F; 
               color: white; 
               text-decoration: none; 
               border-radius: 5px; 
               margin: 20px 0;
           }
           .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
       </style>
   </head>
   <body>
       <div class="container">
           <div class="header">
               <h1>Stitch & Wear Tailors</h1>
               <p>Password Reset Request</p>
           </div>
           <div class="content">
               <h2>Hello {{name}},</h2>
               <p>We received a request to reset your password for your Stitch & Wear Tailors account.</p>
               <p>Click the button below to create a new password:</p>
               <center>
                   <a href="{{redirect}}?userId={{userId}}&secret={{secret}}" class="button">
                       Reset Password
                   </a>
               </center>
               <p><small>This link will expire in 1 hour for security reasons.</small></p>
               <p>If you didn't request this, you can safely ignore this email.</p>
               <p>Best regards,<br>Stitch & Wear Tailors Team</p>
           </div>
           <div class="footer">
               <p>© 2024 Stitch & Wear Tailors. All rights reserved.</p>
               <p>Nigeria's Premier Luxury Tailoring Experience</p>
           </div>
       </div>
   </body>
   </html>
   ```

### 3. Set Up Deep Linking Web Page

Create a simple web page that redirects to your app:

**reset-password.html** (host on your domain):
```html
<!DOCTYPE html>
<html>
<head>
    <title>Reset Password - Stitch & Wear Tailors</title>
    <script>
        function redirectToApp() {
            const params = new URLSearchParams(window.location.search);
            const userId = params.get('userId');
            const secret = params.get('secret');
            
            if (userId && secret) {
                // Try to open in app
                const appUrl = `stitchandwear://reset-password?userId=${userId}&secret=${secret}`;
                window.location.href = appUrl;
                
                // Fallback for if app isn't installed
                setTimeout(() => {
                    document.getElementById('manual-instructions').style.display = 'block';
                }, 2000);
            }
        }
    </script>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
        }
        #manual-instructions {
            display: none;
            margin-top: 20px;
            padding: 20px;
            background-color: #f0f0f0;
            border-radius: 5px;
        }
        .app-links {
            margin: 20px 0;
        }
        .app-links a {
            display: inline-block;
            margin: 10px;
            padding: 10px 20px;
            background-color: #2B5D2F;
            color: white;
            text-decoration: none;
            border-radius: 5px;
        }
    </style>
</head>
<body onload="redirectToApp()">
    <h1>Stitch & Wear Tailors</h1>
    <p>Redirecting to app...</p>
    
    <div id="manual-instructions">
        <h2>Open in App</h2>
        <p>Please open the Stitch & Wear Tailors app to reset your password.</p>
        <div class="app-links">
            <a href="https://apps.apple.com/app/your-app-id">Download for iOS</a>
            <a href="https://play.google.com/store/apps/details?id=com.yourcompany.stitchandwear">Download for Android</a>
        </div>
    </div>
</body>
</html>
```

### 4. Configure Deep Linking in React Native

#### iOS Configuration (Info.plist):
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>stitchandwear</string>
        </array>
    </dict>
</array>
```

#### iOS Universal Links (apple-app-site-association):
Host this file at `https://your-domain.com/.well-known/apple-app-site-association`:
```json
{
    "applinks": {
        "apps": [],
        "details": [
            {
                "appID": "TEAMID.com.yourcompany.stitchandwear",
                "paths": ["/reset-password*"]
            }
        ]
    }
}
```

#### Android Configuration (AndroidManifest.xml):
```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    
    <!-- App Links -->
    <data android:scheme="https"
          android:host="your-domain.com"
          android:pathPrefix="/reset-password" />
    
    <!-- Custom Scheme -->
    <data android:scheme="stitchandwear"
          android:host="reset-password" />
</intent-filter>
```

### 5. Update Environment Variables

In your `.env` file:
```env
EXPO_PUBLIC_PASSWORD_RECOVERY_URL=https://your-domain.com/reset-password
```

---

## 🧪 Testing the Flow

### 1. Test Email Delivery
```javascript
// Test from your app
const testPasswordRecovery = async () => {
  const result = await authService.createPasswordRecovery('test@example.com')
  console.log('Recovery email sent:', result)
}
```

### 2. Test Deep Link
- On iOS Simulator: `xcrun simctl openurl booted "stitchandwear://reset-password?userId=123&secret=abc"`
- On Android Emulator: `adb shell am start -W -a android.intent.action.VIEW -d "stitchandwear://reset-password?userId=123&secret=abc"`

### 3. End-to-End Test
1. Click "Forgot Password?" on sign-in screen
2. Enter email address
3. Check email inbox
4. Click reset link
5. App should open to reset password screen
6. Enter new password
7. Successfully reset and login

---

## 🐛 Troubleshooting

### Email Not Sending
- Check SMTP credentials
- Verify sender email is verified (some providers require this)
- Check Appwrite logs for SMTP errors
- Try different SMTP provider

### Deep Link Not Working
- Verify URL scheme is registered in app
- Check if web redirect page is accessible
- Test with direct deep link URL
- Check device logs for errors

### Reset Link Expired
- Default expiry is 1 hour
- User needs to request new reset email
- Consider adjusting expiry time in Appwrite settings

---

## 🔒 Security Considerations

1. **Use HTTPS** for all web pages
2. **Validate tokens** on both client and server
3. **Rate limit** password reset requests
4. **Log security events** for monitoring
5. **Clear tokens** after successful reset
6. **Implement CAPTCHA** for repeated requests

---

## 📱 Production Checklist

- [ ] SMTP configured and tested
- [ ] Email templates customized
- [ ] Web redirect page deployed
- [ ] Deep links configured for iOS
- [ ] Deep links configured for Android  
- [ ] Environment variables updated
- [ ] Error handling implemented
- [ ] Rate limiting active
- [ ] Security headers configured
- [ ] Monitoring and logging setup

---

This completes the password recovery setup. Remember to test thoroughly on both platforms before deploying to production!