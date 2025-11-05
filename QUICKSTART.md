# 🚀 Quick Start Guide - Contractors Mall

## Prerequisites Check

```bash
# Check Node version (need 20+)
node -v

# Check pnpm (need 9+)
pnpm -v

# Install pnpm if needed
npm install -g pnpm@9

# Check Supabase CLI
supabase --version

# Install Supabase CLI if needed (macOS)
brew install supabase/tap/supabase
```

## Setup Steps (5 minutes)

### 1. Install Dependencies
```bash
cd "/Users/mahmoud/Desktop/Apps/Contractors Mall"
pnpm install
```

### 2. Initialize Supabase
```bash
# Link to local development
supabase init

# Start Supabase (Docker must be running)
supabase start
```

**Important:** Copy the output! You'll need:
- `API URL`: http://localhost:54321
- `anon key`: eyJh... (long string)
- `service_role key`: eyJh... (different long string)

### 3. Create Environment Files

**For Web App:**
```bash
cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-here>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>
MAPBOX_TOKEN=<your-mapbox-token>
EOF
```

**For Admin App:**
```bash
cat > apps/admin/.env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste-anon-key-here>
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>
EOF
```

### 4. Run Migrations
```bash
supabase db push
```

### 5. Seed Database
```bash
supabase db seed
```

### 6. Start Development
```bash
pnpm dev
```

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Contractor App** | http://localhost:3000 | Main customer-facing app |
| **Admin Portal** | http://localhost:3001 | Admin dashboard |
| **Supabase Studio** | http://localhost:54323 | Database GUI |
| **Supabase API** | http://localhost:54321 | Backend API |

## Verify Setup

### 1. Check Database
Open Supabase Studio → Table Editor

You should see:
- ✅ 3 vehicles (وانيت, شاحنة, قلاب)
- ✅ 7 categories
- ✅ 4 settings entries

### 2. Test RPC Function
In Supabase Studio → SQL Editor:

```sql
-- Should return vehicle estimation
SELECT * FROM fn_estimate_vehicle(
  '11111111-1111-1111-1111-111111111111'::uuid,
  31.9539,
  35.9106,
  '[{"weight_kg": 100, "volume_m3": 1, "length_m": 2, "requires_open_bed": false}]'::jsonb
);
```

### 3. Check Frontend
Visit http://localhost:3000 - you should see:
- ✅ Arabic RTL layout
- ✅ "مول المقاول" title
- ✅ Buttons rendered

## Common Issues

### Issue: "Supabase CLI not found"
**Solution:**
```bash
# macOS
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

### Issue: "Docker is not running"
**Solution:**
- Start Docker Desktop
- Wait for it to fully start
- Run `supabase start` again

### Issue: "Port 54321 already in use"
**Solution:**
```bash
# Stop existing Supabase
supabase stop

# Or kill the process
lsof -ti:54321 | xargs kill -9

# Start again
supabase start
```

### Issue: "pnpm: command not found"
**Solution:**
```bash
npm install -g pnpm@9
```

### Issue: "Migration failed"
**Solution:**
```bash
# Reset database
supabase db reset

# This will rerun all migrations + seed
```

## Development Workflow

### Daily Development
```bash
# 1. Start Supabase (if not running)
supabase start

# 2. Start apps
pnpm dev

# Work on features...

# 3. Stop when done
# Ctrl+C to stop dev servers
supabase stop
```

### Create New Migration
```bash
# Create empty migration file
supabase migration new <migration_name>

# Edit the file in supabase/migrations/
# Then apply it
supabase db push
```

### View Logs
```bash
# Supabase logs
supabase logs

# Edge Function logs
supabase functions logs <function-name>
```

### Reset Database
```bash
# Warning: This deletes all data!
supabase db reset
```

## Next Development Tasks

Now that Milestone 1 is complete, you can:

1. **Create test users** via Supabase Studio (Auth → Users)
2. **Build authentication flow** (phone OTP in apps/web)
3. **Implement product browsing** with real data
4. **Test vehicle estimation** with UI
5. **Build cart functionality**

## Need Help?

1. **Database issues** → Check Supabase Studio logs
2. **Frontend issues** → Check browser console
3. **TypeScript errors** → Run `pnpm type-check`
4. **Linting** → Run `pnpm lint`

## Useful Commands Reference

```bash
# Monorepo
pnpm install           # Install all dependencies
pnpm dev               # Start all apps in dev mode
pnpm build             # Build all apps
pnpm type-check        # Check TypeScript
pnpm lint              # Lint all code
pnpm clean             # Clean build artifacts

# Supabase
supabase start         # Start local Supabase
supabase stop          # Stop local Supabase
supabase db push       # Apply migrations
supabase db reset      # Reset DB (rerun migrations + seed)
supabase db seed       # Run seed file only
supabase migration new <name>  # Create migration
supabase functions deploy      # Deploy Edge Functions

# Individual apps
cd apps/web && pnpm dev       # Start web app only
cd apps/admin && pnpm dev     # Start admin app only
```

## Environment Variables Quick Reference

```bash
# Required for both apps
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start>

# Optional (add when ready)
MAPBOX_TOKEN=<get from mapbox.com>
HYPERPAY_ENTITY_ID=<get from HyperPay>
HYPERPAY_ACCESS_TOKEN=<get from HyperPay>
HYPERPAY_TEST_MODE=true
```

---

**You're all set! 🎉**

Start with `supabase start` then `pnpm dev` and you're coding!