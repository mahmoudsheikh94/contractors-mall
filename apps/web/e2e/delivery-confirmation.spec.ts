import { test, expect } from '@playwright/test';

/**
 * E2E Test: Delivery Confirmation Flow
 *
 * Tests the delivery confirmation mechanisms:
 * - Photo proof upload (<120 JOD)
 * - PIN verification (≥120 JOD)
 * - Status transitions
 * - Edge cases and validations
 */

test.describe('Delivery Confirmation', () => {
  test('should require valid photo proof for orders <120 JOD', async ({ page }) => {
    // Setup: Create and pay for low-value order
    await test.step('Create low-value order', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Create order <120 JOD
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();
      await page.locator('[data-testid="product-card"]').first().locator('button:has-text("أضف إلى السلة")').click();

      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("التالي")');
      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');
      await page.click('button:has-text("تأكيد الطلب")');
      await page.waitForURL(/\/orders\/.+/);

      // Pay
      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });
    });

    // Login as supplier
    await test.step('Login as supplier', async () => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/orders');
      await page.locator('[data-testid^="order-"]').first().click();
    });

    // Try to confirm without photo
    await test.step('Reject confirmation without photo', async () => {
      await page.click('button:has-text("تأكيد التوصيل")');

      // Should show validation error
      await expect(page.locator('text=يجب تحميل صورة إثبات التسليم')).toBeVisible();
    });

    // Try invalid file type
    await test.step('Reject invalid file type', async () => {
      const fileInput = page.locator('input[type="file"]');

      // Try uploading PDF
      await fileInput.setInputFiles('./e2e/fixtures/document.pdf');
      await page.click('button:has-text("تأكيد التوصيل")');

      // Should show error
      await expect(page.locator('text=نوع الملف غير صالح')).toBeVisible();
    });

    // Upload valid photo
    await test.step('Accept valid photo proof', async () => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/delivery-proof.jpg');

      // Preview should be visible
      await expect(page.locator('[data-testid="photo-preview"]')).toBeVisible();

      await page.click('button:has-text("تأكيد التوصيل")');

      // Should succeed
      await expect(page.locator('text=تم تأكيد التوصيل بنجاح')).toBeVisible();

      // Status should update
      await expect(page.locator('[data-testid="order-status"]')).toContainText(/تم التوصيل|Delivered/i);
    });

    // Verify photo is stored
    await test.step('Verify delivery proof is accessible', async () => {
      // Reload page
      await page.reload();

      // Should see delivery proof section
      await expect(page.locator('text=إثبات التسليم')).toBeVisible();

      // Should be able to view photo
      const proofImage = page.locator('[data-testid="delivery-proof-image"]');
      await expect(proofImage).toBeVisible();

      // Click to view full size
      await proofImage.click();

      // Should open lightbox/modal
      await expect(page.locator('[data-testid="image-viewer"]')).toBeVisible();
    });
  });

  test('should handle photo upload size limits', async ({ page }) => {
    // Create low-value order
    await test.step('Setup order', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();
      await page.locator('[data-testid="product-card"]').first().locator('button:has-text("أضف إلى السلة")').click();

      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("التالي")');
      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');
      await page.click('button:has-text("تأكيد الطلب")');
      await page.waitForURL(/\/orders\/.+/);

      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });
    });

    // Login as supplier and try large file
    await test.step('Reject oversized photo', async () => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/orders');
      await page.locator('[data-testid^="order-"]').first().click();

      // Try uploading large file (>5MB)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/large-photo.jpg');

      // Should show size error
      await expect(page.locator('text=حجم الصورة كبير جداً')).toBeVisible();
      await expect(page.locator('text=الحد الأقصى 5 ميجابايت')).toBeVisible();
    });
  });

  test('should validate PIN format for high-value orders', async ({ page }) => {
    let orderNumber: string;

    // Create high-value order
    await test.step('Create order ≥120 JOD', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();

      const product = page.locator('[data-testid="product-card"]').first();
      await product.locator('input[type="number"]').fill('15');
      await product.locator('button:has-text("أضف إلى السلة")').click();

      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("التالي")');
      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');
      await page.click('button:has-text("تأكيد الطلب")');
      await page.waitForURL(/\/orders\/.+/);

      orderNumber = await page.locator('[data-testid="order-number"]').textContent() || '';

      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });
    });

    // Login as supplier
    await test.step('Login as supplier and validate PIN input', async () => {
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/orders');
      await page.click(`[data-testid="order-${orderNumber}"]`);

      const pinInput = page.locator('[name="delivery-pin"]');

      // Should be numeric input
      await expect(pinInput).toHaveAttribute('type', 'text');
      await expect(pinInput).toHaveAttribute('inputmode', 'numeric');

      // Try empty PIN
      await page.click('button:has-text("تأكيد التوصيل")');
      await expect(page.locator('text=يجب إدخال رقم التسليم')).toBeVisible();

      // Try PIN with letters
      await pinInput.fill('12AB');
      await page.click('button:has-text("تأكيد التوصيل")');
      await expect(page.locator('text=يجب أن يكون الرقم أرقاماً فقط')).toBeVisible();

      // Try too short PIN
      await pinInput.fill('12');
      await page.click('button:has-text("تأكيد التوصيل")');
      await expect(page.locator('text=الرقم قصير جداً')).toBeVisible();
    });
  });

  test('should prevent duplicate delivery confirmation', async ({ page }) => {
    let orderNumber: string;

    // Create and confirm order
    await test.step('Create and confirm delivery', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();
      await page.locator('[data-testid="product-card"]').first().locator('button:has-text("أضف إلى السلة")').click();

      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("التالي")');
      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');
      await page.click('button:has-text("تأكيد الطلب")');
      await page.waitForURL(/\/orders\/.+/);

      orderNumber = await page.locator('[data-testid="order-number"]').textContent() || '';

      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });

      // Login as supplier and confirm delivery
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/orders');
      await page.click(`[data-testid="order-${orderNumber}"]`);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/delivery-proof.jpg');
      await page.click('button:has-text("تأكيد التوصيل")');

      await expect(page.locator('text=تم تأكيد التوصيل بنجاح')).toBeVisible();
    });

    // Try to confirm again
    await test.step('Prevent duplicate confirmation', async () => {
      await page.reload();

      // Confirmation button should not be visible
      await expect(page.locator('button:has-text("تأكيد التوصيل")')).not.toBeVisible();

      // Should show already confirmed message
      await expect(page.locator('text=تم تأكيد التوصيل مسبقاً')).toBeVisible();
    });
  });

  test('should track delivery confirmation timestamp', async ({ page }) => {
    // Create and confirm order
    await test.step('Confirm delivery', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();
      await page.locator('[data-testid="product-card"]').first().locator('button:has-text("أضف إلى السلة")').click();

      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("التالي")');
      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');
      await page.click('button:has-text("تأكيد الطلب")');
      await page.waitForURL(/\/orders\/.+/);

      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });

      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/orders');
      await page.locator('[data-testid^="order-"]').first().click();

      // Record current time
      const beforeConfirmation = new Date();

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/delivery-proof.jpg');
      await page.click('button:has-text("تأكيد التوصيل")');

      await expect(page.locator('text=تم تأكيد التوصيل بنجاح')).toBeVisible();

      const afterConfirmation = new Date();

      // Verify timestamp
      await page.reload();

      const deliveryTimestamp = page.locator('[data-testid="delivery-confirmed-at"]');
      await expect(deliveryTimestamp).toBeVisible();

      const timestampText = await deliveryTimestamp.textContent() || '';

      // Should contain a valid date
      expect(timestampText).toMatch(/\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD format

      // Parse and verify time is within reasonable range
      const deliveryDate = new Date(timestampText);
      expect(deliveryDate.getTime()).toBeGreaterThanOrEqual(beforeConfirmation.getTime() - 5000);
      expect(deliveryDate.getTime()).toBeLessThanOrEqual(afterConfirmation.getTime() + 5000);
    });
  });
});
