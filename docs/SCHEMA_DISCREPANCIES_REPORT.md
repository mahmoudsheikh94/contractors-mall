# Schema Documentation Discrepancies Report
**Generated:** November 6, 2025
**Purpose:** Compare actual Supabase schema with documented DATA_MODEL.md

## 🔴 Critical Discrepancies

### 1. **profiles Table - Missing Email Verification Fields**
**Current Documentation:** Does NOT mention email verification
**Actual Schema:**
```sql
email TEXT,
email_verified BOOLEAN DEFAULT false,
email_verified_at TIMESTAMP WITH TIME ZONE
```

**Impact:** HIGH - This is a core feature blocking contractors from ordering without email verification.

**Action Required:** ✅ Add to documentation

---

### 2. **Enum Values - Outdated**

#### order_status Enum
**Documented:** `pending|confirmed|in_delivery|delivered|completed|cancelled`
**Actual:** `'pending', 'confirmed', 'accepted', 'in_delivery', 'delivered', 'completed', 'cancelled', 'rejected', 'disputed'`

**Missing:** `accepted`, `rejected`, `disputed`

#### payment_status Enum
**Documented:** `pending|held|released|refunded|failed`
**Actual:** `'pending', 'escrow_held', 'released', 'refunded', 'failed', 'frozen'`

**Changes:** `held` → `escrow_held`, added `frozen` (for disputes)

**Action Required:** ✅ Update documentation

---

## 🟡 Missing Tables (Phase 2 Features)

### Tables NOT in DATA_MODEL.md but EXIST in Schema:

1. **order_notes** - Internal notes on orders
   ```sql
   id UUID PK
   order_id UUID FK
   note TEXT
   created_by UUID FK → profiles
   is_internal BOOLEAN
   created_at TIMESTAMPTZ
   ```

2. **order_tags** - Order categorization/filtering
   ```sql
   id UUID PK
   order_id UUID FK
   tag TEXT
   created_by UUID FK → profiles
   created_at TIMESTAMPTZ
   ```

3. **order_communications** - In-app messaging
   ```sql
   id UUID PK
   order_id UUID FK
   sender_id UUID FK → profiles
   message TEXT
   is_read BOOLEAN
   created_at TIMESTAMPTZ
   ```

4. **in_app_notifications** - User notifications
   ```sql
   id UUID PK
   user_id UUID FK → profiles
   type TEXT
   title TEXT
   message TEXT
   is_read BOOLEAN
   created_at TIMESTAMPTZ
   ```

5. **dispute_communications** - Dispute messaging
   ```sql
   id UUID PK
   dispute_id UUID FK
   sender_id UUID FK → profiles
   message TEXT
   created_at TIMESTAMPTZ
   ```

6. **dispute_site_visits** - Site visit tracking
   ```sql
   id UUID PK
   dispute_id UUID FK
   scheduled_date DATE
   completed_at TIMESTAMPTZ
   inspector_notes TEXT
   ```

7. **wallet_transactions** - Supplier wallet history
   ```sql
   id UUID PK
   supplier_id UUID FK
   type TEXT
   amount_jod NUMERIC
   balance_after NUMERIC
   reference_id UUID
   created_at TIMESTAMPTZ
   ```

8. **contractor_insights** - Analytics/metrics per contractor
   ```sql
   id UUID PK
   contractor_id UUID FK
   total_orders INTEGER
   total_spent NUMERIC
   average_order_value NUMERIC
   favorite_categories JSONB
   last_order_date DATE
   ```

9. **supplier_profiles** - Extended supplier metadata (separate from suppliers table)
   ```sql
   id UUID PK
   supplier_id UUID FK
   commercial_registration TEXT
   tax_id TEXT
   bank_account_info JSONB
   business_hours JSONB
   additional_info JSONB
   ```

**Action Required:** ✅ Document all Phase 2 tables

---

## 🟢 Minor Discrepancies

### 1. profiles.phone
**Documented:** "Unique phone number"
**Actual:** Phone is NOT required (can be NULL), email is primary identifier

**Action Required:** ✅ Clarify that email is primary, phone is optional

### 2. deliveries Table Structure
**Documentation:** Simple structure
**Actual:** Much more detailed with:
- Full address breakdown (neighborhood, city, building, floor, apartment)
- Coordinates (JSONB)
- Multiple photo/PIN fields
- Pin attempts tracking

**Action Required:** ✅ Expand documentation

### 3. order_items Duplicate Columns
**Actual Schema Has:**
- Both `unit_price` AND `unit_price_jod`
- Both `total_price` AND `total_jod`

**Reason:** Legacy columns, should use `_jod` suffix versions

**Action Required:** ⚠️ Note for future cleanup

---

## ✅ What's Accurate

The following are correctly documented:
- Core table relationships
- PostGIS spatial queries
- Business logic functions (fn_estimate_vehicle, fn_visible_suppliers)
- RLS policy approach
- Vehicle class definitions
- Category hierarchy
- Settings structure

---

## 📋 Recommended Actions

### Immediate (Critical)
1. ✅ Update DATA_MODEL.md with email verification fields in profiles
2. ✅ Correct all enum value lists
3. ✅ Add all Phase 2 tables

### Short-term
4. ✅ Expand deliveries table documentation
5. ✅ Add supplier_profiles table
6. ✅ Document notification/messaging tables

### Long-term
7. 🔄 Create automated schema documentation sync
8. 🔄 Add schema version tracking
9. 🔄 Clean up duplicate columns in order_items

---

## 📊 Summary Statistics

| Category | Count |
|----------|-------|
| Missing tables in docs | 9 |
| Outdated enum definitions | 2 |
| Missing columns in docs | 3 |
| Total discrepancies | 14 |

**Documentation Accuracy:** ~65%
**Recommended Action:** Full DATA_MODEL.md update required
