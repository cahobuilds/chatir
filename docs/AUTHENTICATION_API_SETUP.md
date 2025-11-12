# Authentication & API Routes Setup

## ✅ Completed Setup

### 1. Authentication System

#### Pages Created:
- **`/auth/login`** - User login page
- **`/auth/signup`** - User signup page (creates tenant automatically)

#### Features:
- ✅ Email/password authentication via Supabase Auth
- ✅ Automatic tenant creation on signup
- ✅ User-tenant relationship management
- ✅ Protected routes with middleware
- ✅ Session management

#### Files:
- `src/app/auth/login/page.tsx` - Login UI
- `src/app/auth/signup/page.tsx` - Signup UI
- `src/middleware.ts` - Route protection
- `src/hooks/useAuth.ts` - Auth hook for client components
- `src/lib/tenant.ts` - Tenant utilities

### 2. API Routes

#### Tenant Management (`/api/tenants`)

**GET `/api/tenants`**
- Get all tenants for current user
- Returns user's tenant memberships with roles

**POST `/api/tenants`**
- Create new tenant (super_admin only)
- Body: `{ name, subdomain?, tier?, settings?, branding? }`

**GET `/api/tenants/[id]`**
- Get tenant by ID
- Requires user to have access to tenant

**PATCH `/api/tenants/[id]`**
- Update tenant (tenant_admin or super_admin)
- Body: `{ name?, subdomain?, tier?, settings?, branding?, retell_api_key? }`

**DELETE `/api/tenants/[id]`**
- Delete tenant (super_admin only)

#### Agent Management (`/api/agents`)

**GET `/api/agents`**
- Get all agents for user's tenants
- Automatically filtered by RLS

**POST `/api/agents`**
- Create new agent
- Body: `{ tenant_id, name, type, description?, configuration?, retell_agent_id?, retell_phone_number_id? }`
- Type must be `"chat"` or `"voice"`

**GET `/api/agents/[id]`**
- Get agent by ID
- Requires user to have access to agent's tenant

**PATCH `/api/agents/[id]`**
- Update agent
- Body: `{ name?, type?, description?, configuration?, retell_agent_id?, retell_phone_number_id?, is_active? }`

**DELETE `/api/agents/[id]`**
- Delete agent (tenant_admin or super_admin)

#### Authentication (`/api/auth`)

**POST `/api/auth/logout`**
- Sign out current user

### 3. Security Features

- ✅ Row Level Security (RLS) - Database-level tenant isolation
- ✅ Middleware protection for admin routes
- ✅ Role-based access control
- ✅ Automatic tenant filtering in API routes
- ✅ Service role key only used server-side

## 🔧 Usage Examples

### Sign Up Flow

1. User visits `/auth/signup`
2. Fills form: name, email, password, company name
3. System creates:
   - Auth user in Supabase
   - Tenant record
   - User-tenant relationship with `tenant_admin` role
4. User redirected to `/dashboard`

### Login Flow

1. User visits `/auth/login`
2. Enters email/password
3. Supabase authenticates
4. User redirected to `/dashboard` (or original destination)

### Creating an Agent

```typescript
// Frontend code
const response = await fetch('/api/agents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenant_id: currentTenant.id,
    name: 'Customer Support Bot',
    type: 'voice',
    description: 'Handles customer inquiries',
    configuration: {
      model: 'gpt-4',
      temperature: 0.7,
    },
  }),
});

const { agent } = await response.json();
```

### Getting User's Tenants

```typescript
// Frontend code
const response = await fetch('/api/tenants');
const { tenants } = await response.json();
// Returns array of tenant objects with role info
```

## 🧪 Testing

### Test Signup

1. Visit `http://localhost:3000/auth/signup`
2. Fill in form
3. Check Supabase dashboard:
   - `auth.users` table should have new user
   - `tenants` table should have new tenant
   - `user_tenants` table should have relationship

### Test API Routes

```bash
# Get tenants (requires authentication)
curl http://localhost:3000/api/tenants \
  -H "Cookie: sb-ystivchlyoijaghwdcjd-auth-token=..."

# Create agent (requires authentication)
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-ystivchlyoijaghwdcjd-auth-token=..." \
  -d '{
    "tenant_id": "...",
    "name": "Test Agent",
    "type": "chat"
  }'
```

## 📝 Next Steps

1. ✅ Authentication - Complete
2. ✅ API Routes - Complete
3. ⏭️ Retell AI Integration - Next
4. ⏭️ Billing System - Next
5. ⏭️ Update UI Components - Next

## 🔒 Security Notes

- All API routes check authentication
- RLS policies enforce tenant isolation
- Service role key never exposed to client
- Passwords handled by Supabase Auth
- Sessions managed by Supabase

## 📚 Related Files

- `src/lib/supabase/client.ts` - Browser Supabase client
- `src/lib/supabase/server.ts` - Server Supabase client
- `src/middleware.ts` - Route protection
- `supabase/migrations/20251111172146_create_initial_schema.sql` - Database schema

