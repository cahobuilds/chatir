# API Key Storage & Security

## Current Storage Location

**Retell API keys are currently stored in the Supabase database** in the `tenants.retell_api_key` column as **plain text** (not encrypted).

### Database Schema
```sql
CREATE TABLE tenants (
  ...
  retell_api_key TEXT, -- Currently stored as plain text
  ...
);
```

## Security Concerns

⚠️ **Current State**: API keys are stored in plain text in the database, which means:
- Anyone with database access can see the keys
- Keys are visible in database backups
- Keys are transmitted over the network (though HTTPS)
- Keys are logged in application logs if not careful

## Vercel Secrets Management

Vercel does **not** have a dedicated secrets manager like Google Cloud Secret Manager, but it provides:

### 1. Environment Variables
- **Encrypted at rest** in Vercel's infrastructure
- Can be set per environment (Development, Preview, Production)
- Accessed via `process.env.VARIABLE_NAME`
- **Best for**: Application-level secrets (like Supabase keys, master encryption keys)

### 2. Third-Party Integrations
Vercel integrates with:
- **Doppler** - Secrets management platform
- **HCP Vault Secrets** - HashiCorp Vault integration
- **AWS Secrets Manager** (via custom integration)

## Recommended Security Improvements

### Option 1: Encrypt API Keys in Database (Recommended)

Use a master encryption key stored in Vercel environment variables to encrypt/decrypt API keys:

```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // From Vercel env vars
const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

**Setup in Vercel:**
1. Generate encryption key: `openssl rand -hex 32`
2. Add to Vercel: `ENCRYPTION_KEY=<generated-key>`
3. Update API routes to encrypt/decrypt when storing/retrieving

### Option 2: Use Supabase Vault (PostgreSQL Extension)

Supabase supports the `pgcrypto` extension for database-level encryption:

```sql
-- Encrypt when storing
UPDATE tenants 
SET retell_api_key = pgp_sym_encrypt('api-key-value', 'encryption-key')
WHERE id = 'tenant-id';

-- Decrypt when retrieving
SELECT pgp_sym_decrypt(retell_api_key, 'encryption-key') as decrypted_key
FROM tenants
WHERE id = 'tenant-id';
```

**Note**: Requires managing the encryption key securely.

### Option 3: Store in Vercel Environment Variables (Not Recommended for Multi-Tenant)

If you only had one Retell API key, you could store it in Vercel env vars. However, since you have **per-tenant API keys**, this approach doesn't scale.

## Implementation Plan

### Phase 1: Add Encryption (Immediate)

1. **Generate master encryption key:**
   ```bash
   openssl rand -hex 32
   ```

2. **Add to Vercel environment variables:**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add: `ENCRYPTION_KEY` = `<generated-key>`
   - Select: Production, Preview, Development

3. **Create encryption utility:**
   - Create `src/lib/encryption.ts` with encrypt/decrypt functions

4. **Update API routes:**
   - Encrypt before storing: `encryptApiKey(apiKey)`
   - Decrypt when retrieving: `decryptApiKey(encryptedKey)`

5. **Migration script:**
   - Decrypt existing plain-text keys
   - Re-encrypt with new system
   - Update database

### Phase 2: Enhanced Security (Future)

1. **Key rotation**: Implement key rotation mechanism
2. **Audit logging**: Log all API key access/updates
3. **Access controls**: Further restrict who can view/update keys
4. **Key versioning**: Support multiple encryption keys for migration

## Best Practices

1. ✅ **Never log API keys** in application logs
2. ✅ **Use HTTPS** for all API communications
3. ✅ **Restrict database access** (RLS policies already in place)
4. ✅ **Rotate keys periodically** (especially if compromised)
5. ✅ **Use environment variables** for master encryption keys
6. ✅ **Implement audit trails** for key access
7. ❌ **Don't commit keys** to version control
8. ❌ **Don't expose keys** in client-side code
9. ❌ **Don't store keys in plain text** (current issue)

## Current Risk Assessment

| Risk Level | Issue | Impact |
|------------|-------|--------|
| 🔴 **High** | Plain text storage | Anyone with DB access can see all API keys |
| 🟡 **Medium** | No encryption | Keys visible in backups, logs, network traffic |
| 🟢 **Low** | HTTPS in transit | Keys encrypted during transmission |

## Next Steps

1. **Immediate**: Implement Option 1 (Application-level encryption)
2. **Short-term**: Add audit logging for key access
3. **Long-term**: Consider Supabase Vault or external secrets manager

