# Phase 2C Testing Guide

## ✅ RLS Fix Migration Applied!

The circular RLS policy issue has been resolved. The "Drivers can view assigned orders" policy has been updated to eliminate infinite recursion errors.

**Applied Migration**: `20251105_fix_rls_circular_dependency.sql`

---

## ✅ Code Updates Completed

All code has been updated to use the correct column names:
- Orders table queries now use `id` (not `order_id`) as primary key
- Fixed 10 files total (8 from Phase 2C + 2 deliveries pages)

---

## 🔧 Code Updates Made

### Fixed Column References
All API routes and pages now correctly query the `orders` table using:
- **Primary Key**: `id` (not `order_id`)
- **Foreign Key in related tables**: `order_id` (references `orders.id`)

### Files Updated (8 total):
1. ✅ `/app/supplier/orders/[order_id]/page.tsx`
2. ✅ `/app/api/supplier/orders/[id]/route.ts`
3. ✅ `/app/api/supplier/orders/[id]/activities/route.ts`
4. ✅ `/app/api/supplier/orders/[id]/notes/route.ts`
5. ✅ `/app/api/supplier/orders/[id]/notes/[noteId]/route.ts`
6. ✅ `/app/api/supplier/orders/[id]/tags/route.ts`
7. ✅ `/app/api/deliveries/confirm-photo/route.ts`
8. ✅ `/app/api/deliveries/verify-pin/route.ts`

---

## 🎯 What to Test

### Test Environment
- **Admin App**: http://localhost:3001
- **Web App**: http://localhost:3000
- **Status**: Both servers running ✅

---

## 📝 Testing Checklist

### **1. Order Timeline & Activities** ⏰

**URL**: http://localhost:3001/supplier/orders/[order_id]

**Steps**:
1. Navigate to any order details page
2. Scroll to the bottom
3. Look for "سجل الأنشطة" (Activity Timeline) section

**Expected**:
- ✅ Timeline displays without errors
- ✅ Activities are listed chronologically
- ✅ Each activity shows icon, description, creator name, and timestamp
- ✅ Timestamps show in relative format ("منذ 5 دقيقة", "منذ ساعة")

**What to Look For**:
- 🔄 Status change activities (blue)
- 📝 Note added activities (green)
- ✏️ Edit activities (amber)
- 🏷️ Tag activities (purple)

---

### **2. Order Notes System** 📝

**URL**: http://localhost:3001/supplier/orders/[order_id]

**Steps**:
1. Find the "الملاحظات" (Notes) section
2. Click in the text area to add a note
3. Type a test note: "هذه ملاحظة تجريبية"
4. Check the "ملاحظة داخلية" checkbox
5. Click "إضافة ملاحظة"
6. Verify the note appears with yellow background and 🔒 icon
7. Add another note WITHOUT checking internal checkbox
8. Verify second note has white background and 📝 icon
9. Click delete button on your own note
10. Confirm deletion works

**Expected**:
- ✅ Internal notes show with yellow background
- ✅ External notes show with white background
- ✅ Creator name and timestamp display correctly
- ✅ Can only delete your own notes
- ✅ Activity is logged when note is added (check timeline)

**Common Issues**:
- ❌ If notes don't load: Check browser console for API errors
- ❌ If can't create notes: Verify user is authenticated

---

### **3. Enhanced Order Fields** ✏️

**URL**: http://localhost:3001/supplier/orders/[order_id]

**Steps**:
1. Find "تفاصيل إضافية" section
2. Click "تعديل" button
3. Fill in all three fields:
   - **Delivery Instructions**: "التوصيل للطابق الثالث"
   - **Special Requests**: "الرجاء الاتصال قبل الوصول"
   - **Internal Reference**: "REF-2025-001"
4. Click "حفظ التغييرات"
5. Verify fields are saved and displayed
6. Check activity timeline for "حدّث" activity
7. Click "تعديل" again
8. Click "إلغاء" to test cancel
9. Verify fields didn't change

**Expected**:
- ✅ Edit mode shows text areas/inputs
- ✅ Save button works
- ✅ Cancel button reverts changes
- ✅ Values persist after saving
- ✅ Activity logged when saved

---

### **4. Order Tags System** 🏷️

**Part A: Create Tags**

**URL**: http://localhost:3001/supplier/settings/tags

**Steps**:
1. Click "+ إنشاء تصنيف جديد" button
2. Enter tag name: "عاجل"
3. Select red color (4th color)
4. See preview update
5. Click "إنشاء التصنيف"
6. Verify tag appears in list

**Repeat for**:
- "متابعة" (blue color)
- "مهم" (yellow color)
- "تأخير" (orange color)

**Expected**:
- ✅ Tags are created successfully
- ✅ Preview shows correct color
- ✅ Tags appear in list with color circles
- ✅ Edit button works
- ✅ Delete button works (with confirmation)

**Part B: Assign Tags to Orders**

**URL**: http://localhost:3001/supplier/orders/[order_id]

**Steps**:
1. Look for tags section below order header
2. Click "+ إضافة تصنيف" button
3. Dropdown menu appears with available tags
4. Click on "عاجل" tag
5. Verify tag appears as colored pill
6. Add another tag: "متابعة"
7. Click × button on a tag to remove it
8. Confirm removal
9. Check activity timeline for tag activities

**Expected**:
- ✅ Tags display as colored pills
- ✅ Color matches tag settings
- ✅ Can assign multiple tags
- ✅ Can remove tags
- ✅ Activities logged for tag add/remove
- ✅ Only shows unassigned tags in dropdown

---

### **5. Bulk Order Actions** 📦

**URL**: http://localhost:3001/supplier/orders

**Part A: Select Orders**

**Steps**:
1. Navigate to orders list page
2. Check checkbox on 2-3 orders
3. Verify selected count shows at top
4. Click "اختيار الكل" checkbox
5. Verify all orders selected
6. Uncheck "اختيار الكل"
7. Verify all orders unselected

**Expected**:
- ✅ Checkboxes work
- ✅ Selected count updates
- ✅ Select all works
- ✅ Bulk action buttons appear

**Part B: Export to Excel**

**Steps**:
1. Select 2-3 orders (or use filters first)
2. Click "تصدير Excel" button
3. Wait for download to start
4. Open downloaded CSV file in Excel
5. Verify Arabic text displays correctly
6. Check columns are correct

**Expected**:
- ✅ CSV file downloads
- ✅ Filename includes date (e.g., `orders_2025-11-05.csv`)
- ✅ Arabic characters display correctly in Excel
- ✅ All order data is present
- ✅ Columns: رقم الطلب, الحالة, العميل, etc.

**Part C: Print Packing Slips**

**Steps**:
1. Select 2-3 orders
2. Click "طباعة قوائم التعبئة" button
3. Print dialog window opens
4. Review packing slip format
5. Check all order details are present
6. Verify one slip per page
7. Close print dialog or print to PDF

**Expected**:
- ✅ Print dialog opens automatically
- ✅ One order per page
- ✅ Order number, customer info, delivery details all present
- ✅ Signature line at bottom
- ✅ RTL layout is correct

---

## 🐛 Common Issues & Solutions

### Issue: "Order not found" error

**Cause**: Order ID doesn't exist or doesn't belong to your supplier
**Solution**:
1. Check if you're logged in as correct supplier
2. Verify order exists in database
3. Check browser console for API errors

### Issue: Notes/Activities don't load

**Cause**: API route error or database connection
**Solution**:
1. Open browser DevTools (F12)
2. Check Network tab for failed requests
3. Check Console tab for JavaScript errors
4. Verify database tables exist:
   ```sql
   SELECT tablename FROM pg_tables
   WHERE tablename IN ('order_activities', 'order_notes', 'order_tags', 'order_tag_assignments');
   ```

### Issue: Tags don't appear in dropdown

**Cause**: No tags created yet OR all tags already assigned
**Solution**:
1. Go to http://localhost:3001/supplier/settings/tags
2. Create at least one tag
3. Return to order details page
4. Refresh page if needed

### Issue: Can't edit enhanced order fields

**Cause**: Order belongs to different supplier OR database columns missing
**Solution**:
1. Verify you own the order
2. Check if columns exist:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'orders'
   AND column_name IN ('delivery_instructions', 'special_requests', 'internal_reference');
   ```

### Issue: Export downloads empty file

**Cause**: No orders match current filters
**Solution**:
1. Remove filters from orders page
2. Verify orders exist for your supplier
3. Check browser console for errors

---

## 🔍 Database Verification Queries

If something isn't working, run these queries in Supabase SQL Editor:

### Check Tables Exist
```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('order_activities', 'order_notes', 'order_tags', 'order_tag_assignments')
ORDER BY table_name;
```

### Check RLS Policies
```sql
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('order_activities', 'order_notes', 'order_tags', 'order_tag_assignments')
ORDER BY tablename, policyname;
```

### Check Sample Data
```sql
-- Check if any activities exist
SELECT COUNT(*) as activity_count FROM order_activities;

-- Check if any notes exist
SELECT COUNT(*) as notes_count FROM order_notes;

-- Check if any tags exist
SELECT COUNT(*) as tags_count FROM order_tags;

-- Check if any tag assignments exist
SELECT COUNT(*) as assignments_count FROM order_tag_assignments;
```

---

## ✅ Success Criteria

### Minimum Testing Requirements

Before considering Phase 2C complete, verify:

- [ ] Can view activity timeline on order details page
- [ ] Can add internal and external notes
- [ ] Can delete own notes
- [ ] Can edit enhanced order fields (delivery_instructions, special_requests, internal_reference)
- [ ] Can create new tags with different colors
- [ ] Can assign tags to orders
- [ ] Can remove tags from orders
- [ ] Can select multiple orders
- [ ] Can export orders to CSV/Excel
- [ ] Can print packing slips for selected orders
- [ ] Activities are logged for all actions
- [ ] No console errors in browser DevTools
- [ ] All features work in both Arabic and English

### Optional Advanced Testing

- [ ] Test with 100+ orders (performance)
- [ ] Test with 20+ tags (dropdown scrolling)
- [ ] Test with very long note text (2000+ characters)
- [ ] Test tag deletion when assigned to orders
- [ ] Test concurrent note additions (multiple browsers)
- [ ] Test export with different date ranges
- [ ] Test RLS by switching between supplier accounts

---

## 📊 Expected Results Summary

After completing all tests, you should have:

1. **Order Timeline**: Working activity feed with all action types
2. **Order Notes**: Internal and external notes with proper visibility
3. **Enhanced Fields**: Editable delivery instructions, special requests, and internal reference
4. **Order Tags**: Custom tags with color coding, fully functional
5. **Bulk Actions**: Working export and print features

---

## 🚀 Next Steps After Testing

Once testing is complete:

1. **Report Issues**: Document any bugs found
2. **Performance Review**: Note any slow loading times
3. **UX Feedback**: Suggest improvements
4. **Phase 2C Parts 6-7**: Continue with Customer Insights features (if desired)
5. **Production Prep**: Consider what needs adjustment for production deployment

---

**Testing Started**: [Your Date/Time]
**Testing Completed**: [Your Date/Time]
**Status**: ⏳ In Progress

**Tested By**: __________________

**Notes**:
