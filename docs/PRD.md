# Contractors Mall / مول المقاول — Product Requirements Document (MVP)

## 1. Product Vision
مول المقاول (Contractors Mall) is a bilingual (Arabic default, English optional) digital marketplace connecting contractors, foremen, and craftsmen with verified construction material suppliers in Jordan.  
The goal: simplify sourcing, pricing, and delivery of materials — starting in Amman and Aqaba — through a trusted, fast, and transparent platform.

### Core Promise
> "كل موادك في كبسة واحدة وتوصيل فوري، والجودة مضمونة."  
> "All your construction materials in one click — instant delivery, guaranteed quality."

---

## 2. MVP Scope

### Included
- One-supplier-per-order model
- Categories: General Construction + Electrical & Lighting
- Scheduled delivery (default: next day)
- Auto vehicle selection (وانيت 1 طن / شاحنة 3.5 طن / قلاب مسطح 5 طن)  
  - +10% safety margin on weight/volume
  - Delivery fee based on supplier zone + vehicle class
- Radius-based delivery zones (Zone A + Zone B)
- Escrow payments (held until delivery confirmed)
  - `<120 JOD` → photo proof
  - `≥120 JOD` → 4-digit PIN confirmation
- Supplier unloads at site (contractor informed at checkout)
- Dispute & QC workflow
  - “Report Issue” auto-freezes payout
  - QC review → phone call → site visit if order ≥ 350 JOD
- Super Admin back office to edit:
  - Thresholds (photo/PIN/site-visit)
  - Commission rate & free-period days
  - Safety margin %
  - Vehicle specs & zone fees
  - Product text/photos/logos (for correction)
- Arabic first, full RTL; English toggle

### Excluded (Phase 2+)
- Polygon delivery zones  
- Multi-supplier cart  
- Real-time driver tracking  
- Credit/financing features  
- Advanced analytics or promotions

---

## 3. Target Users
| Role | Goals | Pain Points Solved |
|------|--------|--------------------|
| **Contractor / Foreman** | Find materials fast, compare prices, schedule delivery | Calling many shops, uncertain delivery times, inconsistent quality |
| **Supplier / Distributor** | Digitize sales, manage inventory & deliveries | Manual orders, cash handling, no online visibility |
| **QC / Admin** | Maintain trust & efficiency | Disputes, fake proofs, inconsistent pricing |

---

## 4. Key User Journeys

### Contractor
1. Log in via phone + OTP  
2. Browse or search materials (list + map toggle)  
3. Add to cart (1 supplier only)  
4. Assign to project folder (optional)  
5. Pay online (escrow held)  
6. Receive delivery →  
   - `<120 JOD` → photo proof  
   - `≥120 JOD` → PIN confirmation  
7. Rate supplier / Report issue

### Supplier
1. Register business + verify  
2. Set delivery radius (Zone A/B) + fees  
3. Upload products (name, photo, price, qty, weight, length)  
4. Receive orders → accept → assign driver → deliver  
5. Upload proof (photo / PIN)  
6. Get paid once QC approves  
7. View wallet + statements

### QC / Admin
1. Verify suppliers & manage content  
2. Monitor disputes & orders  
3. Adjust platform settings & thresholds  
4. Authorize manual payouts/refunds  
5. Update vehicles & zone fees dynamically

---

## 5. Functional Requirements

| Category | Requirements |
|-----------|--------------|
| **Auth** | Phone OTP, Arabic default UI |
| **Products** | Category tree, search/filter, supplier ownership |
| **Orders** | One supplier per order, escrow payments, delivery fee computation |
| **Vehicle Logic** | Auto-match by total weight/volume/length; +10% safety margin |
| **Payments** | Escrow lifecycle: held → released → refunded; JOD-based |
| **Map & Zones** | Supplier pins, radius overlays (Zone A/B), list filtered by coverage |
| **QC** | Dispute freeze, call workflow, site visit flag if order ≥ 350 JOD |
| **Admin Settings** | Editable thresholds, commission, safety margin, vehicle specs, zone fees |
| **Localization** | RTL Arabic UI, mirrored layouts, English toggle |
| **Accessibility** | Large tap targets, Arabic numerals where relevant |

---

## 6. Non-Functional Requirements
- **Performance:** Sub-3 s page loads on 4G in Amman
- **Security:** Escrow funds protected via payment provider; all API endpoints JWT-secured
- **Scalability:** DB structure ready for future multi-city rollout
- **Maintainability:** Modular monorepo; Prisma as schema truth
- **Reliability:** Orders & payments transactional (no partial states)
- **Localization:** RTL verified; dynamic translations (next-intl)

---

## 7. Success Criteria (MVP Launch)
- ✅ End-to-end order flow completes successfully (contractor → supplier → QC → payout)
- ✅ Auto-vehicle logic picks correct class in 95% of test cases
- ✅ QC dispute resolution within 24 h median
- ✅ Admin threshold changes reflected instantly on new orders
- ✅ Bilingual UI stable and mirrored correctly

---

## 8. Future Roadmap (Phase 2–3)
- Polygon delivery zones & dynamic fees per km  
- Multi-supplier cart & split deliveries  
- Integrated fleet tracking app  
- Procurement analytics dashboards  
- Financing / credit integrations  
- Regional expansion (Jordan → GCC)

---

*Last updated:* October 2025  
*Author:* Mahmoud Sheikh Alard (Founder)  
*Collaborator:* Claude Code (via Windsurf CLI)