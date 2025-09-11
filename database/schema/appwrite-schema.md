# Appwrite Database Schema

## Database Configuration
- **Database ID**: `stitch_and_wear_db`
- **Project Name**: Stitch & Wear Tailors

## Collections Schema

### 1. user_profiles
**Collection ID**: `user_profiles`
**Document ID**: User's Appwrite Auth ID

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| email | email | 255 | Yes | - | No | User's email address |
| firstName | string | 100 | Yes | - | No | User's first name |
| lastName | string | 100 | Yes | - | No | User's last name |
| userType | enum | - | Yes | client | No | Values: client, tailor, admin |
| phone | string | 20 | No | - | No | Phone number with country code |
| status | enum | - | Yes | pending_verification | No | Values: pending_verification, active, suspended, pending_tailor_approval |
| emailVerified | boolean | - | Yes | false | No | Email verification status |
| emailVerifiedAt | datetime | - | No | - | No | Email verification timestamp |
| has2FA | boolean | - | Yes | false | No | 2FA enabled status |
| createdAt | datetime | - | Yes | - | No | Account creation timestamp |
| updatedAt | datetime | - | Yes | - | No | Last update timestamp |
| lastLoginAt | datetime | - | No | - | No | Last successful login |

**Indexes**:
- email (unique)
- userType
- status
- createdAt

### 2. sessions
**Collection ID**: `sessions`
**Document ID**: Session ID

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| deviceId | string | 100 | No | - | No | Device identifier |
| deviceName | string | 100 | No | - | No | Device name/type |
| deviceFingerprint | string | 255 | No | - | No | Device fingerprint |
| ipAddress | string | 45 | No | - | No | IP address |
| userAgent | string | 500 | No | - | No | User agent string |
| active | boolean | - | Yes | true | No | Session active status |
| trustLevel | enum | - | Yes | none | No | Values: none, session, persistent |
| mfaCompleted | boolean | - | Yes | false | No | MFA completion status |
| riskScore | integer | - | Yes | 0 | No | Risk assessment score (0-100) |
| createdAt | datetime | - | Yes | - | No | Session creation time |
| lastActivity | datetime | - | Yes | - | No | Last activity timestamp |
| expiresAt | datetime | - | Yes | - | No | Session expiration time |
| idleSince | datetime | - | No | - | No | Idle start timestamp |
| revokedAt | datetime | - | No | - | No | Revocation timestamp |

**Indexes**:
- userId
- active
- expiresAt
- lastActivity

### 3. verification_tokens
**Collection ID**: `verification_tokens`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| tokenHash | string | 64 | Yes | - | No | SHA256 hash of token |
| code | string | 10 | Yes | - | No | 6-digit verification code |
| tokenType | enum | - | Yes | registration | No | Values: registration, email_change, security |
| attemptCount | integer | - | Yes | 0 | No | Failed verification attempts |
| createdAt | datetime | - | Yes | - | No | Token creation time |
| expiresAt | datetime | - | Yes | - | No | Token expiration time |
| usedAt | datetime | - | No | - | No | Token usage timestamp |
| invalidatedAt | datetime | - | No | - | No | Invalidation timestamp |

**Indexes**:
- userId
- tokenHash
- expiresAt
- tokenType

### 4. verification_attempts
**Collection ID**: `verification_attempts`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| attemptCount | integer | - | Yes | 1 | No | Number of attempts |
| createdAt | datetime | - | Yes | - | No | First attempt time |
| lastAttemptAt | datetime | - | Yes | - | No | Most recent attempt |

**Indexes**:
- userId
- lastAttemptAt

### 5. verification_locks
**Collection ID**: `verification_locks`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| lockedAt | datetime | - | Yes | - | No | Lock timestamp |
| lockedUntil | datetime | - | Yes | - | No | Lock expiration |

**Indexes**:
- userId
- lockedUntil

### 6. password_recovery_tokens
**Collection ID**: `password_recovery_tokens`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| tokenHash | string | 64 | Yes | - | No | SHA256 hash of token |
| code | string | 10 | Yes | - | No | 6-digit recovery code |
| method | enum | - | Yes | email | No | Values: email, sms |
| attemptCount | integer | - | Yes | 0 | No | Failed attempts |
| ipAddress | string | 45 | No | - | No | Request IP address |
| userAgent | string | 500 | No | - | No | User agent string |
| riskScore | integer | - | Yes | 0 | No | Risk assessment (0-100) |
| createdAt | datetime | - | Yes | - | No | Token creation time |
| expiresAt | datetime | - | Yes | - | No | Token expiration |
| usedAt | datetime | - | No | - | No | Usage timestamp |

**Indexes**:
- userId
- tokenHash
- expiresAt

### 7. password_recovery_attempts
**Collection ID**: `password_recovery_attempts`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| email | string | 255 | Yes | - | No | Email address |
| attemptCount | integer | - | Yes | 1 | No | Number of attempts |
| lastAttemptAt | datetime | - | Yes | - | No | Most recent attempt |
| blockedUntil | datetime | - | No | - | No | Block expiration |

**Indexes**:
- email
- blockedUntil

### 8. token_metadata
**Collection ID**: `token_metadata`
**Document ID**: Session ID

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| refreshTokenHash | string | 64 | Yes | - | No | SHA256 of refresh token |
| createdAt | datetime | - | Yes | - | No | Creation timestamp |
| expiresAt | datetime | - | Yes | - | No | Expiration timestamp |
| usedAt | datetime | - | No | - | No | Last usage timestamp |
| lastRefreshed | datetime | - | No | - | No | Last refresh timestamp |

**Indexes**:
- userId
- expiresAt

### 9. token_blacklist
**Collection ID**: `token_blacklist`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| tokenId | string | 36 | Yes | - | No | JWT JTI claim |
| blacklistedAt | datetime | - | Yes | - | No | Blacklist timestamp |
| expiresAt | datetime | - | Yes | - | No | Token expiration |

**Indexes**:
- tokenId
- expiresAt

### 10. security_events
**Collection ID**: `security_events`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| type | string | 50 | Yes | - | No | Event type |
| severity | enum | - | Yes | info | No | Values: info, warning, critical |
| userId | string | 36 | No | - | No | Associated user |
| sessionId | string | 36 | No | - | No | Associated session |
| details | string | 5000 | No | - | No | Event details JSON |
| ipAddress | string | 45 | No | - | No | Source IP |
| timestamp | datetime | - | Yes | - | No | Event timestamp |

**Indexes**:
- type
- severity
- userId
- timestamp

### 11. mfa_methods
**Collection ID**: `mfa_methods`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| method | enum | - | Yes | - | No | Values: totp, sms, email, backup_codes |
| secret | string | 255 | No | - | No | Encrypted secret |
| verified | boolean | - | Yes | false | No | Method verified |
| primary | boolean | - | Yes | false | No | Primary method |
| createdAt | datetime | - | Yes | - | No | Creation timestamp |
| lastUsedAt | datetime | - | No | - | No | Last usage |

**Indexes**:
- userId
- method
- verified

### 12. backup_codes
**Collection ID**: `backup_codes`

| Attribute | Type | Size | Required | Default | Array | Description |
|-----------|------|------|----------|---------|-------|-------------|
| userId | string | 36 | Yes | - | No | User ID reference |
| codeHash | string | 64 | Yes | - | No | SHA256 of code |
| usedAt | datetime | - | No | - | No | Usage timestamp |
| createdAt | datetime | - | Yes | - | No | Creation timestamp |

**Indexes**:
- userId
- codeHash

## Permissions Configuration

### Default Permissions Pattern
For most collections:
- **Read**: User can read their own documents (userId = auth.uid)
- **Create**: Authenticated users with specific conditions
- **Update**: User can update their own documents with restrictions
- **Delete**: Admin only or specific cleanup processes

### Special Permission Cases
1. **user_profiles**: Users can read and update their own profile
2. **sessions**: Users can read their own sessions, system manages creation/deletion
3. **verification_tokens**: System-only access
4. **security_events**: Read-only for users, write for system

## Database Indexes Strategy
- Primary indexes on document IDs
- Secondary indexes on frequently queried fields
- Composite indexes for complex queries
- Time-based indexes for cleanup operations

## Data Retention Policies
- Sessions: 30 days for persistent, 7 days for normal
- Verification tokens: Delete after use or 24 hours
- Password recovery: Delete after use or 1 hour
- Security events: 90 days retention
- Token blacklist: Clean up after expiration