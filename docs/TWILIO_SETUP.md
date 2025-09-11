# Twilio SMS Setup Guide

## Account Setup

### 1. Create Twilio Account
1. Sign up at [Twilio Console](https://www.twilio.com/console)
2. Verify your email and phone number
3. Complete account setup wizard

### 2. Get Your Credentials
Navigate to **Account** > **API keys & tokens**:
- Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Auth Token: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. Get a Phone Number

#### Option A: Trial Number (Free)
1. Go to **Phone Numbers** > **Manage** > **Buy a number**
2. Select a number with SMS capability
3. Note: Trial accounts have limitations:
   - Can only send to verified numbers
   - Messages include "Sent from Twilio Sandbox"
   - Limited monthly quota

#### Option B: Production Number (Paid)
1. Upgrade your account
2. Purchase a phone number with SMS capability
3. Configure number for your region

## Twilio Verify Setup (Recommended)

### 1. Create Verify Service
1. Navigate to **Verify** > **Services**
2. Click **Create Service**
3. Service Name: "Stitch & Wear 2FA"
4. Note the Service SID: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Configure Verify Settings
- **Code Length**: 6 digits
- **Code Validity**: 5 minutes
- **Delivery Attempts**: 3
- **Channels**: SMS, Voice (backup)

### 3. Set Up Templates
```
Your {{friendly_name}} verification code is: {{code}}
Valid for {{validity}} minutes.
```

## Environment Configuration

Add to your `.env` file:
```bash
# Twilio Configuration
EXPO_PUBLIC_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_TWILIO_PHONE_NUMBER=+12345678900
EXPO_PUBLIC_TWILIO_VERIFY_SERVICE_ID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Testing Setup

### 1. Verify Phone Numbers (Trial Account)
For trial accounts, verify test numbers:
1. Go to **Phone Numbers** > **Verified Caller IDs**
2. Add phone numbers for testing
3. Complete verification process

### 2. Test SMS Sending
```javascript
// Test script
const twilioService = new TwilioService();

// Send test SMS
const result = await twilioService.sendSMS(
  '+1234567890', // verified number
  'Test message from Stitch & Wear'
);

console.log('SMS sent:', result);
```

### 3. Test Verification Flow
```javascript
// Send verification code
const sendResult = await twilioService.sendVerificationCode('+1234567890');
console.log('Code sent:', sendResult);

// Verify code (user enters code)
const verifyResult = await twilioService.verifyCode('+1234567890', '123456');
console.log('Verification:', verifyResult);
```

## Production Configuration

### 1. Account Upgrade
1. Add payment method
2. Upgrade from trial account
3. Remove trial restrictions

### 2. Phone Number Configuration
1. **A2P 10DLC Registration** (US only):
   - Register your business
   - Create campaign for 2FA
   - Wait for approval (24-48 hours)

2. **Short Code** (Optional, better delivery):
   - Apply for short code
   - Higher cost but better reliability
   - No carrier filtering

### 3. International Support
For international SMS:
1. Enable **Geo Permissions**:
   - Go to **Messaging** > **Settings** > **Geo permissions**
   - Enable countries you'll send to
   
2. Consider local numbers:
   - Purchase numbers in target countries
   - Better delivery rates
   - Lower costs

### 4. Compliance Setup

#### Opt-Out Management
Implement STOP handling:
```javascript
// Webhook endpoint for incoming messages
app.post('/twilio/sms/webhook', async (req, res) => {
  const { Body, From } = req.body;
  
  if (Body.toUpperCase() === 'STOP') {
    await twilioService.optOut(From);
    await twilioService.sendSMS(
      From,
      'You have been unsubscribed from Stitch & Wear SMS notifications.'
    );
  }
  
  res.send('<Response></Response>');
});
```

#### Message Templates
Use compliant message templates:
```javascript
const templates = {
  verification: 'Your Stitch & Wear code is {{code}}. Valid for 5 minutes.',
  appointment: 'Reminder: Your fitting is tomorrow at {{time}}. Reply STOP to unsubscribe.',
  order: 'Your order {{orderId}} status: {{status}}. Track: {{link}}'
};
```

## Monitoring & Analytics

### 1. Set Up Webhooks
Configure status callbacks:
```javascript
// In Twilio Console
StatusCallback: 'https://your-api.com/twilio/status'

// Webhook handler
app.post('/twilio/status', (req, res) => {
  const { MessageStatus, MessageSid, ErrorCode } = req.body;
  console.log(`Message ${MessageSid}: ${MessageStatus}`);
  if (ErrorCode) {
    console.error(`Error ${ErrorCode}`);
  }
  res.sendStatus(200);
});
```

### 2. Monitor Usage
- Check **Monitor** > **Logs** > **Messages**
- Set up usage triggers for alerts
- Monitor delivery rates

### 3. Error Handling
Common error codes:
- `21211`: Invalid phone number
- `21408`: Permission to send denied
- `21610`: Message blocked by carrier
- `21614`: Number not SMS capable

## Cost Optimization

### 1. Message Segmentation
- SMS limited to 160 characters
- Longer messages split and charged per segment
- Keep messages concise

### 2. Verify Service Benefits
- Built-in retry logic
- Automatic expiration
- No code storage needed
- Better analytics

### 3. Batch Sending
For notifications:
```javascript
// Use Twilio Notify for bulk sends
const service = await client.notify.services.create({
  friendlyName: 'Stitch & Wear Notifications'
});

await service.notifications.create({
  toBinding: JSON.stringify(bindings),
  body: 'Bulk notification message'
});
```

## Security Best Practices

### 1. Secure Credentials
- Never commit credentials to git
- Use environment variables
- Rotate auth tokens regularly

### 2. Rate Limiting
Implement rate limiting:
```javascript
const rateLimiter = {
  maxAttempts: 3,
  windowMs: 15 * 60 * 1000, // 15 minutes
  perPhone: new Map()
};

function checkRateLimit(phoneNumber) {
  const attempts = rateLimiter.perPhone.get(phoneNumber) || 0;
  if (attempts >= rateLimiter.maxAttempts) {
    throw new Error('Too many attempts. Try again later.');
  }
  rateLimiter.perPhone.set(phoneNumber, attempts + 1);
}
```

### 3. Verification Code Security
- Use cryptographically secure random numbers
- Set short expiration times (5-10 minutes)
- One-time use only
- Don't log codes

### 4. Phone Number Validation
```javascript
function validateE164(phoneNumber) {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}
```

## Troubleshooting

### Messages Not Delivered
1. Check Twilio logs for errors
2. Verify number format (E.164)
3. Check geo permissions
4. Verify account balance
5. Test with different carriers

### Slow Delivery
1. Use Twilio Verify (prioritized)
2. Consider short codes
3. Check carrier filtering
4. Monitor time of day patterns

### High Costs
1. Review message length
2. Check international rates
3. Monitor failed attempts
4. Use Verify service
5. Implement caching

## Support Resources

- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Status](https://status.twilio.com/)
- [Best Practices Guide](https://www.twilio.com/docs/sms/best-practices)
- [Compliance Guide](https://www.twilio.com/docs/sms/compliance)
- Support: support@twilio.com