# Contractors Mall / المقاول مول — Claude Code Charter

## Mission (MVP)

Build a bilingual (Arabic default, English toggle), RTL-aware construction materials marketplace for Jordan (Amman → Aqaba) with:
- One-supplier-per-order
- Scheduled delivery (default: next day)
- Auto vehicle selection using +10% safety margin (وانيت 1 طن / شاحنة 3.5 طن / قلاب مسطح 5 طن)
- Radius-based zones (Zone A/B) per supplier with base delivery fees
- Escrow payments: release after photo (<120 JOD) or PIN (≥120 JOD)
- Disputes freeze payout; site visit rule for high-value orders (default 350 JOD)
- Supplier unloads at site (explicit in checkout)
- Super Admin can edit thresholds, commission, safety margin, vehicle specs, zone fees, and correct product content

All implementation decisions not constrained below should be decided by Claude Code following the Engineering Principles section.

## Current Implementation Status (Phase 1 Complete ✅)

### ✅ Completed Features

#### **Authentication & User Management**
- Multi-role authentication (contractor, supplier_admin, driver, admin)
- Email verification system with banner warnings
- Profile auto-creation on signup
- Role-based route protection

#### **Supplier Portal** (`apps/admin/src/app/supplier/*`)
- Dashboard with metrics (orders, revenue, pending deliveries)
- Complete product CRUD with form validation
- Order management with status tracking
- Delivery confirmation (PIN entry for ≥120 JOD, photo upload for <120 JOD)
- Wallet overview (balance, pending, available)
- Business profile management
- Zone fee configuration

#### **Admin Portal** (`apps/admin/src/app/admin/*`)
- Comprehensive dashboard with platform metrics
- Supplier verification/approval workflow
- Payment management with escrow controls (manual release/refund)
- Dispute management with full QC workflow
- System settings (thresholds, vehicles, commission)
- Site visit scheduling for high-value disputes

#### **Database & Infrastructure**
- Complete Supabase schema with RLS policies
- Storage buckets for delivery proofs and media
- Seed data for categories and test data
- Migration system with versioning

## Phase 2: Shopify-Inspired Enhancements (In Progress)

### Inspiration from Shopify
Taking Shopify's merchant experience as inspiration for supplier portal UX/features:
- **Product Management Excellence**: Bulk operations, variants, rich media
- **Analytics & Insights**: Visual dashboards, trends, performance metrics
- **Order Workflow**: Streamlined fulfillment, communication, tracking
- **Clean, Action-Oriented UI**: Mobile-responsive, keyboard shortcuts, quick actions

### Phase 2A: Enhanced Supplier Dashboard (Priority: High)

#### Analytics Dashboard (Shopify-style)
```typescript
// New metrics to add:
- Sales chart (30-day trend line graph)
- Top 5 products by revenue
- Average order value trend
- Delivery success rate gauge
- Revenue projections
- Contractor insights (repeat customers, lifetime value)
- Peak ordering times heatmap
```

#### Quick Actions Panel
- One-click product duplication
- Bulk price updates
- Quick stock adjustments
- Export orders to Excel
- Print packing slips

### Phase 2B: Advanced Product Management (Priority: High)

#### Bulk Product Operations
```typescript
// Features to implement:
- CSV import/export with template
- Bulk edit interface (select multiple → edit prices/stock)
- Product duplicator with smart naming
- Batch image upload with drag-and-drop
- Rich text editor for descriptions (Arabic/English)
```

#### Inventory Management
- Low stock alerts (configurable thresholds)
- Stock history timeline
- Automated reorder suggestions
- Out-of-stock badge on products
- Stock adjustment logs with reasons

#### Product Enhancements
- Multiple product images (up to 10)
- Image zoom and gallery viewer
- Product variants (sizes, grades, colors)
- Related products suggestions
- SEO-friendly URLs and meta tags

### Phase 2C: Order & Customer Management (Priority: Medium)

#### Order Enhancements
- Order timeline/activity log
- Internal notes system
- Bulk order actions (print, export)
- Delivery instructions field
- Special requests handling
- Order tags and filtering

#### Customer (Contractor) Insights
```typescript
interface ContractorProfile {
  totalOrders: number
  totalSpent: number
  averageOrderValue: number
  lastOrderDate: Date
  preferredCategories: Category[]
  deliveryAddresses: Address[]
  paymentHistory: Payment[]
  communicationLog: Message[]
}
```

### Phase 2D: Communication & Notifications (Priority: Medium)

#### In-App Messaging
- Supplier ↔ Contractor chat on orders
- Automated status updates
- Delivery notifications
- Dispute communications

#### Email Notifications
- Low stock alerts
- New order notifications
- Daily summary emails
- Weekly performance reports

### Phase 2E: Mobile Optimization (Priority: Low)

#### Progressive Web App (PWA)
- Offline capability for viewing orders
- Push notifications
- Home screen installation
- Camera integration for product photos

#### Mobile-First Features
- Swipe actions on orders
- Voice notes for order updates
- Barcode scanning for inventory
- Quick photo capture for products

## Non-Goals (Phase 3+)
- Polygon zones
- Multi-supplier cart
- Real-time courier tracking app
- Financing/credit
- Complex promotions engine
- Third-party marketplace integrations

Repository Map (monorepo)
	•	apps/web — Contractor app (Next.js 15, TS, Tailwind, next-intl, RTL)
	•	apps/admin — Admin portal (settings, disputes, verifications)
	•	packages/ui — Shared RTL-aware UI components + i18n utilities
	•	packages/config — ESLint/Prettier/TS/tailwind/zod configs
	•	server — API (Express or tRPC) + Prisma; schema is source of truth
	•	infra — Docker (Postgres + pgAdmin), seed scripts
	•	docs — PRD.md, DATA_MODEL.md, API_CONTRACTS.md

⸻

Engineering Principles (ALWAYS follow)
	1.	DRY: Never duplicate logic. Extract shared utilities/services/hooks/components.
	2.	SOLID: Especially SRP and DIP for services (vehicle match, payments, zones).
	3.	Clean Architecture:
	•	server/src/domain (entities, use-cases)
	•	server/src/adapters (HTTP, DB, PSP, Map)
	•	server/src/infrastructure (Prisma, queue, cache)
	4.	Type Safety: TypeScript strict: true. Prisma types are truth. Zod for runtime I/O validation.
	5.	Contracts First: Implement endpoints against /docs/API_CONTRACTS.md. If a change is needed, propose an update and then implement.
	6.	I18n & RTL: Arabic is default; UI must mirror; keep numbers/units consistent. Never hardcode strings in components — use next-intl.
	7.	Security:
	•	JWT auth; role-based guards (contractor/supplier_admin/driver/admin).
	•	Validate every input (Zod).
	•	Parameterized DB queries only (Prisma).
	•	Least-privilege env vars.
	•	Never log secrets or full PANs.
	8.	Errors: Centralized error handling with typed error classes. Map domain errors to proper HTTP codes. No silent failures.
	9.	Performance Budgets:
	•	Web LCP ≤ 3s on 4G in Amman.
	•	API P95 ≤ 400ms for read endpoints, ≤ 800ms for write endpoints.
	•	Avoid N+1 (Prisma include/select), add indices where needed.
	10.	Accessibility: Keyboard nav, focus states, labels, adequate tap targets, AR/EN screen-readers.
	11.	Observability:
	•	Request/response logs (PII-safe).
	•	Domain events (order state changes, dispute transitions).
	•	Minimal health checks: /healthz.
	12.	Testing:
	•	Unit: vehicle match, zone calc, thresholds, dispute gating.
	•	Contract tests for public API (Zod schemas)
	•	Minimal e2e happy-path (create → pay(held) → deliver → release).
	•	CI must run typecheck/lint/tests on every PR.
	13.	Migrations/Seeds: Deterministic. Seed default vehicles, settings, one supplier example.
	14.	No Dead Code: Remove scaffolds not used. Keep repo clean.
	15.	Documentation: Update /docs when contracts or schemas change. Self-document complex functions with JSDoc.

⸻

Product Guardrails (from PRD)
	•	Approval gates: <120 JOD = photo, ≥120 JOD = PIN.
	•	Site visit if dispute unresolved & order ≥ 350 JOD (thresholds are configurable).
	•	One supplier per order (MVP).
	•	Auto vehicle only (no override by contractor).
	•	Supplier unloads at site; disclose at checkout.
	•	Map toggle secondary; list-first; filter suppliers by zone coverage.

⸻

Deliverables (Claude Code owns)
	•	Monorepo scaffold with pnpm workspaces
	•	Prisma schema from /docs/DATA_MODEL.md
	•	Postgres Docker + pgAdmin; migration + seed
	•	API handlers (auth, suppliers, products, vehicle estimate, orders, deliveries, disputes, admin/settings)
	•	Web app UX: list + map toggle, supplier cards with delivery fee pre-quote, checkout + escrow, report issue
	•	Admin portal: thresholds, vehicles, zone fees, supplier verification, disputes
	•	Payments adapter abstraction (PSP pluggable; escrow states)
	•	Tests + GitHub Actions CI
	•	Minimal telemetry/logging

⸻

MCP Usage (GitHub & Serena)
	•	Serena (planner): Always propose a task graph for medium/large changes before coding. Include acceptance criteria.
	•	GitHub: One feature branch per task cluster; small, reviewable PRs with checklists.
	•	Never merge with failing CI.
	•	PR template must reference updated docs (if any).

⸻

Workflow (incremental, fail-fast)
	1.	Read /docs/PRD.md, /docs/DATA_MODEL.md, /docs/API_CONTRACTS.md.
	2.	Plan with Serena MCP: break into tasks with clear ACs.
	3.	Scaffold monorepo + base configs.
	4.	Implement DB + seed + minimal APIs.
	5.	Ship contractor list/map + vehicle estimate service + checkout + delivery gates.
	6.	Ship admin settings/disputes.
	7.	Harden tests, perf, logging.
	8.	Polish i18n/RTL, UX, empty-states, error-states.

At each step: keep PRs small, update docs when schemas/contracts change, and run CI.

⸻

Acceptance Criteria (MVP)
	•	Create order with one supplier; cart shows auto vehicle and delivery fee before checkout.
	•	Zones A/B respected in map/list filters.
	•	Payment enters escrow_held; delivery confirmation gates enforced:
	•	<120 JOD → photo proof
	•	≥120 JOD → PIN verification
	•	Report Issue opens a Dispute and freezes payout; QC actions visible under Dispute panel to both sides.
	•	Admin can change thresholds, vehicle specs, zone fees, commission, safety margin; new orders reflect changes immediately.
	•	Arabic-first RTL UI is correct; English toggle works.

⸻

Coding Standards (concrete)
	•	Packages
	•	packages/config: share ESLint, TS config ("strict": true), Prettier, Tailwind config.
	•	packages/ui: headless + Tailwind components; RTL-aware dir.
	•	Server
	•	Foldering: domain/, adapters/http, adapters/psp, infrastructure/prisma.
	•	Validation: all route inputs/outputs via Zod. Export types to clients.
	•	State machines: Orders & Disputes implemented as explicit enums + transition functions.
	•	Payments: interface PaymentProvider with methods createPaymentIntent, hold, release, refund.
	•	Web
	•	Next.js App Router, Server Components where possible, suspense for data.
	•	next-intl provider; no raw strings; all text via messages.
	•	Forms: zod + react-hook-form; optimistic UI where safe.
	•	Map: Mapbox; radius overlays; filter suppliers outside coverage.

⸻

When In Doubt
	•	Prefer simplicity over flexibility in MVP.
	•	If the PRD and API contracts conflict, open a PR to docs first, then implement.
	•	If an edge case risks user trust (payments, delivery proof), choose the safer path and leave a TODO note for Phase 2.

⸻

Environment & Secrets
	•	/.env.example must be kept updated.
	•	Never commit real secrets. Use dotenv locally and GitHub Actions secrets for CI.

⸻

Testing Targets (must-have)
	•	Vehicle match: weight/volume/length/open-bed rules; +10% margin; long items >4m.
	•	Zone selection: A/B by distance and supplier radii.
	•	Approval gates: photo vs PIN by order total.
	•	Dispute freeze: payout cannot release while dispute open.
	•	Admin settings: changing thresholds affects new orders (not historical).

⸻

Owner: Claude Code (Windsurf CLI)
Product Source of Truth: /docs/PRD.md
Data Contract Source of Truth: Prisma schema + /docs/API_CONTRACTS.md

Build decisively. Propose refinements proactively. Never duplicate logic. Always ship with tests and docs.