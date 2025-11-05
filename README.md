# Contractors Mall /  المقاول مول 

A bilingual (Arabic/English), RTL-aware construction materials marketplace for Jordan, connecting contractors with verified suppliers.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 9+
- Supabase CLI
- Docker (for local Postgres)

### Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Start Supabase locally:**
```bash
pnpm db:start
```

3. **Run migrations:**
```bash
pnpm db:push
```

4. **Seed the database:**
```bash
pnpm db:seed
```

5. **Start development servers:**
```bash
pnpm dev
```

This will start:
- Web app (contractors): http://localhost:3000
- Admin portal: http://localhost:3001
- Supabase Studio: http://localhost:54323

## 📁 Project Structure

```
contractors-mall/
├── apps/
│   ├── web/          # Contractor-facing Next.js app
│   └── admin/        # Admin portal
├── packages/
│   ├── ui/           # Shared RTL-aware components
│   └── config/       # Shared configurations
├── supabase/
│   ├── migrations/   # Database migrations
│   ├── functions/    # Edge Functions (Deno)
│   └── seed.sql      # Seed data
└── docs/
    ├── PRD.md        # Product requirements
    ├── DATA_MODEL.md # Database schema
    └── API_CONTRACTS.md # API documentation
```

## 🏗️ Architecture

### Backend (Supabase)
- **Database**: PostgreSQL with PostGIS for spatial queries
- **Auth**: Phone OTP authentication
- **RLS**: Row-level security for all tables
- **Edge Functions**: Payment processing, disputes, admin operations
- **Storage**: Product images, delivery proofs, dispute media

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (RTL-aware)
- **i18n**: next-intl (Arabic default, English toggle)
- **State**: Server Components + Zustand for client state
- **Maps**: Mapbox for supplier locations and zones

### Key Features
- ✅ One-supplier-per-order model
- ✅ Auto vehicle selection with +10% safety margin
- ✅ Zone-based delivery fees (Zone A/B)
- ✅ Escrow payments with approval gates
- ✅ Dispute management with QC workflow
- ✅ Admin configurable thresholds

## 🔑 Environment Variables

Copy `.env.example` to `.env.local` and update:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Maps
MAPBOX_TOKEN=your-mapbox-token

# Payments (HyperPay)
HYPERPAY_ENTITY_ID=your-entity-id
HYPERPAY_ACCESS_TOKEN=your-token
HYPERPAY_TEST_MODE=true
```

## 📝 Database Schema

Key tables:
- `profiles` - User profiles with roles
- `suppliers` - Verified suppliers with zones
- `products` - Product catalog
- `orders` - Order management
- `deliveries` - Delivery tracking
- `payments` - Escrow payment states
- `disputes` - QC and dispute resolution

See [DATA_MODEL.md](docs/DATA_MODEL.md) for complete schema.

## 🚢 Deployment

### Supabase
1. Create a Supabase project
2. Run migrations via Supabase CLI
3. Deploy Edge Functions
4. Configure environment variables

### Vercel (Recommended)
1. Connect GitHub repository
2. Configure environment variables
3. Deploy with automatic preview/production environments

## 📊 Business Rules

### Delivery Approval Gates
- Orders < 120 JOD: Photo proof required
- Orders ≥ 120 JOD: 4-digit PIN verification

### Dispute Resolution
- Automatic payment freeze on dispute
- Site visit required for disputes ≥ 350 JOD
- Admin configurable thresholds

### Vehicle Selection
- Automatic based on weight/volume/length
- +10% safety margin applied
- Zone-based delivery fees

## 🧪 Testing

```bash
# Unit tests
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 📚 Documentation

- [Product Requirements](docs/PRD.md)
- [Data Model](docs/DATA_MODEL.md)
- [API Contracts](docs/API_CONTRACTS.md)
- [Engineering Principles](CLAUDE.md)

## 🤝 Contributing

1. Create feature branch from `main`
2. Follow engineering principles in CLAUDE.md
3. Update tests and documentation
4. Submit PR with checklist

## 📄 License

Private and confidential. All rights reserved.

---

Built with ❤️ for Jordan's construction industry by Mahmoud Sheikh Alard & Claude Code