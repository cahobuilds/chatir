# API Key Storage & Security

## Current Storage Location

**Status: implemented (2025-11-22).** Retell API keys are encrypted at rest before being
written to the `tenants.retell_api_key` column — this doc originally proposed the design
below as future work; it has since been built essentially as-is.

- **Where:** `src/lib/encryption.ts` — AES-256-GCM, `encrypt()`/`decrypt()`, plus an
  `isEncrypted()` helper (not in the original proposal) used on every read path to
  gracefully handle any not-yet-migrated legacy plaintext rows.
- **Write paths:** `src/app/api/tenants/[id]/route.ts` (`PATCH`) and
  `src/app/api/tenants/[id]/retell/connect/route.ts` both call `encrypt(retell_api_key)`
  before every write, gated on the `retell_key.manage` permission.
- **Read paths:** `src/app/api/tenants/[id]/retell/billing/route.ts` and
  `src/app/api/webhooks/retell/route.ts` both call `isEncrypted(key) ? decrypt(key) : key`
  — decrypting when needed, falling back to the raw value for any legacy row that
  predates this change.
- **Format:** `iv:authTag:encrypted` hex string, matching this doc's original proposal
  exactly.

### Database Schema
```sql
CREATE TABLE tenants (
  ...
  retell_api_key TEXT, -- Encrypted at rest via src/lib/encryption.ts, see above
  ...
);
```

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

## Original Design Proposal (✅ Implemented — kept for reference)

The section below is the original proposal for Option 1. It's kept here because it's an
accurate description of what `src/lib/encryption.ts` actually does today (function names
differ slightly — `encrypt`/`decrypt`, not `encryptApiKey`/`decryptApiKey` — everything
else matches).

### Option 1: Encrypt API Keys in Database (implemented)

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

### Phase 1: Add Encryption (✅ Done)

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
| 🟢 **Resolved** | ~~Plain text storage~~ | Encrypted via `src/lib/encryption.ts` (AES-256-GCM) since 2025-11-22 |
| 🟢 **Resolved** | ~~No encryption~~ | Same fix — keys in the DB/backups are ciphertext, not plaintext |
| 🟢 **Low** | HTTPS in transit | Keys encrypted during transmission |
| 🟡 **Medium** | No audit logging | Key access/updates are not separately logged (see Next Steps) |
| 🟡 **Medium** | Single static `ENCRYPTION_KEY` | No key rotation/versioning mechanism yet |

## Next Steps

1. **Done**: Application-level encryption (Option 1) — shipped.
2. **Short-term**: Add audit logging for key access/updates.
3. **Long-term**: Key rotation/versioning; consider Supabase Vault or an external secrets
   manager if the single static `ENCRYPTION_KEY` becomes a concern.

