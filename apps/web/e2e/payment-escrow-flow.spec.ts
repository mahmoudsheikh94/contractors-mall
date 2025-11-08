import { test, expect } from '@playwright/test';

/**
 * E2E Test: Payment & Escrow Flow
 *
 * This test verifies the payment and escrow system works correctly:
 * - Payment initiation
 * - Escrow hold
 * - Delivery confirmation gates (<120 JOD photo, ≥120 JOD PIN)
 * - Escrow release
 * - Dispute freeze
 *
 * Critical Business Rules:
 * - Orders <120 JOD: Photo proof required for release
 * - Orders ≥120 JOD: PIN verification required for release
 * - Disputes freeze payment until resolved
 */

test.describe('Payment & Escrow Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle payment flow for order <120 JOD (photo proof)', async ({ page }) => {
    let orderNumber: string;

    // Login as contractor
    await test.step('Login and create order <120 JOD', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Add low-value products (total <120 JOD)
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();

      // Add product with total <120
      const product = page.locator('[data-testid="product-card"]').first();
      await product.locator('input[type="number"]').fill('2'); // 2 units
      await product.locator('button:has-text("أضف إلى السلة")').click();

      // Proceed to checkout
      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      // Fill checkout
      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("التالي")');

      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');

      // Verify total is <120 JOD
      const total = await page.locator('[data-testid="order-total"]').textContent();
      const totalValue = parseFloat(total?.replace(/[^\d.]/g, '') || '0');
      expect(totalValue).toBeLessThan(120);

      // Submit order
      await page.click('button:has-text("تأكيد الطلب")');
      await page.waitForURL(/\/orders\/.+/);

      orderNumber = await page.locator('[data-testid="order-number"]').textContent() || '';
    });

    // Payment
    await test.step('Process payment and verify escrow hold', async () => {
      // Should see payment button
      await expect(page.locator('button:has-text("ادفع الآن")')).toBeVisible();

      await page.click('button:has-text("ادفع الآن")');

      // Mock payment (in test environment)
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');

      // Wait for payment success
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });

      // Navigate to order details
      await page.goto(`/orders/${orderNumber}`);

      // Verify status is awaiting_delivery
      await expect(page.locator('[data-testid="order-status"]')).toHaveText(/في انتظار التوصيل/i);

      // Verify payment status shows escrow
      await expect(page.locator('[data-testid="payment-status"]')).toContainText(/محجوز|Held/i);
    });

    // Delivery confirmation (as supplier/driver)
    await test.step('Upload delivery proof (photo)', async () => {
      // Logout and login as supplier
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      // Navigate to orders
      await page.goto('/admin/orders');

      // Find the order
      await page.click(`[data-testid="order-${orderNumber}"]`);

      // Should see delivery confirmation section
      await expect(page.locator('text=تأكيد التوصيل')).toBeVisible();

      // Should show photo upload requirement (<120 JOD)
      await expect(page.locator('text=صورة إثبات التسليم')).toBeVisible();
      await expect(page.locator('text=PIN')).not.toBeVisible();

      // Upload photo
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/delivery-proof.jpg');

      // Submit delivery confirmation
      await page.click('button:has-text("تأكيد التسليم")');

      // Should see success
      await expect(page.locator('text=تم تأكيد التوصيل')).toBeVisible();
    });

    // Verify escrow release
    await test.step('Verify payment released from escrow', async () => {
      // Refresh order details
      await page.reload();

      // Status should be delivered
      await expect(page.locator('[data-testid="order-status"]')).toHaveText(/تم التوصيل|Delivered/i);

      // Payment status should show released
      await expect(page.locator('[data-testid="payment-status"]')).toContainText(/تم الدفع للمورد|Released/i);

      // Navigate to supplier wallet
      await page.goto('/admin/wallet');

      // Should see the payment in available balance
      await expect(page.locator('[data-testid="available-balance"]')).not.toHaveText('0');
    });
  });

  test('should handle payment flow for order ≥120 JOD (PIN verification)', async ({ page }) => {
    let orderNumber: string;
    let deliveryPIN: string;

    // Create order ≥120 JOD
    await test.step('Login and create order ≥120 JOD', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Add high-value products (total ≥120)
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();

      const product = page.locator('[data-testid="product-card"]').first();
      await product.locator('input[type="number"]').fill('15'); // 15 units to exceed 120
      await product.locator('button:has-text("أضف إلى السلة")').click();

      // Checkout
      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);
      await page.click('button:has-text("التالي")');

      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');

      // Verify total is ≥120 JOD
      const total = await page.locator('[data-testid="order-total"]').textContent();
      const totalValue = parseFloat(total?.replace(/[^\d.]/g, '') || '0');
      expect(totalValue).toBeGreaterThanOrEqual(120);

      await page.click('button:has-text("تأكيد الطلب")');
      await page.waitForURL(/\/orders\/.+/);

      orderNumber = await page.locator('[data-testid="order-number"]').textContent() || '';
    });

    // Payment
    await test.step('Process payment', async () => {
      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');

      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });
    });

    // Get delivery PIN as contractor
    await test.step('Retrieve delivery PIN', async () => {
      await page.goto(`/orders/${orderNumber}`);

      // Should see PIN for high-value order
      await expect(page.locator('text=رقم التسليم السري')).toBeVisible();

      const pinElement = page.locator('[data-testid="delivery-pin"]');
      await expect(pinElement).toBeVisible();

      deliveryPIN = await pinElement.textContent() || '';
      expect(deliveryPIN).toMatch(/^\d{4,6}$/); // 4-6 digit PIN
    });

    // Delivery confirmation with PIN
    await test.step('Confirm delivery with PIN', async () => {
      // Login as supplier
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/orders');
      await page.click(`[data-testid="order-${orderNumber}"]`);

      // Should require PIN (not photo)
      await expect(page.locator('text=أدخل رقم التسليم السري')).toBeVisible();
      await expect(page.locator('input[type="file"]')).not.toBeVisible();

      // Enter PIN
      await page.fill('[name="delivery-pin"]', deliveryPIN);
      await page.click('button:has-text("تأكيد التوصيل")');

      // Should see success
      await expect(page.locator('text=تم تأكيد التوصيل')).toBeVisible();
    });

    // Verify release
    await test.step('Verify payment released', async () => {
      await page.reload();
      await expect(page.locator('[data-testid="order-status"]')).toHaveText(/تم التوصيل|Delivered/i);
      await expect(page.locator('[data-testid="payment-status"]')).toContainText(/تم الدفع|Released/i);
    });
  });

  test('should freeze escrow on dispute', async ({ page }) => {
    let orderNumber: string;

    // Create and pay for order
    await test.step('Create and pay for order', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Quick order creation
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

      // Pay
      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });
    });

    // Report issue (create dispute)
    await test.step('Report issue and create dispute', async () => {
      await page.goto(`/orders/${orderNumber}`);

      // Click report issue
      await page.click('button:has-text("الإبلاغ عن مشكلة")');

      // Fill dispute form
      await page.fill('[name="issue-description"]', 'المنتج تالف عند التوصيل');
      await page.selectOption('[name="issue-type"]', 'damaged_goods');

      // Upload evidence
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('./e2e/fixtures/damaged-product.jpg');

      // Submit dispute
      await page.click('button:has-text("إرسال البلاغ")');

      // Should see success
      await expect(page.locator('text=تم إنشاء البلاغ')).toBeVisible();
    });

    // Verify escrow is frozen
    await test.step('Verify escrow frozen during dispute', async () => {
      await page.reload();

      // Status should show dispute
      await expect(page.locator('[data-testid="order-status"]')).toContainText(/نزاع|Dispute/i);

      // Payment status should show frozen
      await expect(page.locator('[data-testid="payment-status"]')).toContainText(/معلق|Frozen|محجوز/i);

      // Should not allow delivery confirmation
      await expect(page.locator('button:has-text("تأكيد التوصيل")')).not.toBeVisible();
    });

    // Verify supplier cannot access funds
    await test.step('Verify supplier cannot access frozen funds', async () => {
      // Login as supplier
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/wallet');

      // Funds should be in pending, not available
      const pendingBalance = await page.locator('[data-testid="pending-balance"]').textContent();
      expect(parseFloat(pendingBalance?.replace(/[^\d.]/g, '') || '0')).toBeGreaterThan(0);

      const availableBalance = await page.locator('[data-testid="available-balance"]').textContent();
      expect(parseFloat(availableBalance?.replace(/[^\d.]/g, '') || '0')).toBe(0);
    });
  });

  test('should reject incorrect PIN for high-value orders', async ({ page }) => {
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

      // Pay
      await page.click('button:has-text("ادفع الآن")');
      await page.waitForURL(/\/payment/);
      await page.fill('[data-testid="card-number"]', '4242424242424242');
      await page.fill('[data-testid="card-expiry"]', '12/25');
      await page.fill('[data-testid="card-cvc"]', '123');
      await page.click('button:has-text("ادفع")');
      await expect(page.locator('text=تم الدفع بنجاح')).toBeVisible({ timeout: 10000 });
    });

    // Try incorrect PIN
    await test.step('Attempt delivery with wrong PIN', async () => {
      // Login as supplier
      await page.click('[data-testid="user-menu"]');
      await page.click('text=تسجيل الخروج');

      await page.goto('/admin/login');
      await page.fill('[name="email"]', process.env.TEST_SUPPLIER_EMAIL || 'supplier@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      await page.goto('/admin/orders');
      await page.click(`[data-testid="order-${orderNumber}"]`);

      // Enter wrong PIN
      await page.fill('[name="delivery-pin"]', '0000');
      await page.click('button:has-text("تأكيد التوصيل")');

      // Should see error
      await expect(page.locator('text=رقم التسليم غير صحيح')).toBeVisible();

      // Order should still be awaiting delivery
      await expect(page.locator('[data-testid="order-status"]')).not.toContainText(/تم التوصيل|Delivered/i);

      // Payment should still be in escrow
      await expect(page.locator('[data-testid="payment-status"]')).toContainText(/محجوز|Held/i);
    });
  });
});
