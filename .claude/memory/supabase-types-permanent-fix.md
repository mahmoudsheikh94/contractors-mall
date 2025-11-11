# Supabase Types - Permanent Fix (Future Task)

## Current Status
Generated TypeScript types exist but are not being imported:
- `apps/web/src/lib/supabase/database.types.ts` (81KB)
- `apps/admin/src/lib/supabase/database.types.ts` (81KB)

## Current Workaround
Using `as any` type assertions throughout the codebase to bypass outdated Supabase auto-generated types.

## Permanent Fix Required

### 1. Update Supabase Client Files

**File:** `apps/web/src/lib/supabase/server.ts`
```typescript
import { Database } from './database.types'
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // ... rest of config
  )
}
```

**File:** `apps/web/src/lib/supabase/client.ts`
```typescript
import { Database } from './database.types'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 2. Same for Admin App

- `apps/admin/src/lib/supabase/server.ts`
- `apps/admin/src/lib/supabase/client.ts`

### 3. Remove All `as any` Workarounds

Search and remove all instances of:
- `.in('status', [...] as any)`
- `status: 'released' as any`
- `status: 'frozen' as any`
- `status: 'disputed' as any`
- etc.

### 4. Update Types After Schema Changes

After any migration that changes enums or table structures:
```bash
pnpm supabase gen types typescript --project-id zbscashhrdeofvgjnbsb > apps/web/src/lib/supabase/database.types.ts
pnpm supabase gen types typescript --project-id zbscashhrdeofvgjnbsb > apps/admin/src/lib/supabase/database.types.ts
```

## Benefits After Fix
- ✅ Full TypeScript autocomplete for all tables and columns
- ✅ Type-safe queries and inserts
- ✅ Compile-time errors for invalid enum values
- ✅ No more `as any` workarounds
- ✅ Better IDE support and refactoring safety

## Files to Update (Search for `as any`)
```bash
grep -r "as any" apps/web/src/app --include="*.ts" --include="*.tsx"
grep -r "as any" apps/admin/src/app --include="*.ts" --include="*.tsx"
```

## Related Issues Fixed
- Order status type mismatches
- Payment status enum errors
- Dispute status enum errors
- Delivery confirmation status errors
