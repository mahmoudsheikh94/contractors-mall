import { test, expect } from '@playwright/test';

/**
 * E2E Test: Complete Order Creation Flow
 *
 * This test verifies the entire order creation process from
 * browsing products to placing an order.
 *
 * Critical Path:
 * 1. Login as contractor
 * 2. Browse products by supplier
 * 3. Add items to cart
 * 4. View cart
 * 5. Proceed to checkout
 * 6. Enter delivery address
 * 7. Select delivery schedule
 * 8. Review order (verify vehicle and delivery fee)
 * 9. Submit order
 * 10. Verify order created in database
 */

test.describe('Order Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
  });

  test('should complete full order creation flow', async ({ page }) => {
    // Step 1: Login as contractor
    await test.step('Login as contractor', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');

      // Wait for redirect to home
      await page.waitForURL('/');
      await expect(page).toHaveURL('/');
    });

    // Step 2: Browse products
    await test.step('Browse products by supplier', async () => {
      // Should see supplier listings
      await expect(page.locator('text=الموردين')).toBeVisible();

      // Click on first supplier
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await expect(firstSupplier).toBeVisible();
      await firstSupplier.click();

      // Should navigate to supplier products page
      await page.waitForURL(/\/suppliers\/.+/);
    });

    // Step 3: Add items to cart
    await test.step('Add products to cart', async () => {
      // Wait for products to load
      await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();

      // Add first product
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      const addButton = firstProduct.locator('button:has-text("أضف إلى السلة")');

      // Set quantity to 5
      const quantityInput = firstProduct.locator('input[type="number"]');
      await quantityInput.fill('5');

      // Click add to cart
      await addButton.click();

      // Should see success message
      await expect(page.locator('text=تمت الإضافة إلى السلة')).toBeVisible();

      // Cart badge should show 1 item
      await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');

      // Add second product
      const secondProduct = page.locator('[data-testid="product-card"]').nth(1);
      await secondProduct.locator('input[type="number"]').fill('3');
      await secondProduct.locator('button:has-text("أضف إلى السلة")').click();

      // Cart badge should show 2 items
      await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('2');
    });

    // Step 4: View cart
    await test.step('View cart', async () => {
      await page.click('[data-testid="cart-button"]');

      // Cart drawer should open
      await expect(page.locator('[data-testid="cart-drawer"]')).toBeVisible();

      // Should see 2 items
      const cartItems = page.locator('[data-testid="cart-item"]');
      await expect(cartItems).toHaveCount(2);

      // Should see total amount
      await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
    });

    // Step 5: Proceed to checkout
    await test.step('Proceed to checkout', async () => {
      await page.click('button:has-text("متابعة الشراء")');

      // Should navigate to checkout
      await page.waitForURL('/checkout');
      await expect(page).toHaveURL('/checkout');
    });

    // Step 6: Enter delivery address
    await test.step('Enter delivery address', async () => {
      // Fill address form
      await page.fill('[name="address"]', 'شارع الجامعة، عمان، الأردن');

      // Wait for geocoding and map to load
      await page.waitForTimeout(2000);

      // Verify coordinates are set
      const latInput = page.locator('[name="latitude"]');
      const lngInput = page.locator('[name="longitude"]');

      await expect(latInput).not.toHaveValue('');
      await expect(lngInput).not.toHaveValue('');

      // Click next
      await page.click('button:has-text("التالي")');
    });

    // Step 7: Select delivery schedule
    await test.step('Select delivery schedule', async () => {
      // Should be on schedule step
      await expect(page.locator('text=اختر موعد التوصيل')).toBeVisible();

      // Select tomorrow
      const tomorrowOption = page.locator('[data-testid="schedule-option-tomorrow"]');
      await tomorrowOption.click();

      // Click next
      await page.click('button:has-text("التالي")');
    });

    // Step 8: Review order
    let orderTotal: string;
    await test.step('Review order and verify calculations', async () => {
      // Should be on review step
      await expect(page.locator('text=مراجعة الطلب')).toBeVisible();

      // Verify order items are displayed
      const reviewItems = page.locator('[data-testid="review-item"]');
      await expect(reviewItems).toHaveCount(2);

      // Verify vehicle type is shown
      await expect(page.locator('[data-testid="vehicle-type"]')).toBeVisible();

      // Verify delivery fee is shown
      const deliveryFee = page.locator('[data-testid="delivery-fee"]');
      await expect(deliveryFee).toBeVisible();

      // Verify zone is displayed (Zone A or Zone B)
      await expect(page.locator('[data-testid="delivery-zone"]')).toContainText(/Zone [AB]/i);

      // Verify total
      const total = page.locator('[data-testid="order-total"]');
      await expect(total).toBeVisible();

      // Store total for verification
      orderTotal = await total.textContent() || '';
    });

    // Step 9: Submit order
    let orderNumber: string;
    await test.step('Submit order', async () => {
      // Click submit order
      await page.click('button:has-text("تأكيد الطلب")');

      // Wait for order creation
      await page.waitForURL(/\/orders\/.+/);

      // Should see success message
      await expect(page.locator('text=تم إنشاء طلبك بنجاح')).toBeVisible();

      // Get order number
      const orderNumberElement = page.locator('[data-testid="order-number"]');
      await expect(orderNumberElement).toBeVisible();
      orderNumber = await orderNumberElement.textContent() || '';

      expect(orderNumber).toMatch(/^ORD-\d+$/);
    });

    // Step 10: Verify order in database
    await test.step('Verify order was created correctly', async () => {
      // Navigate to orders page
      await page.goto('/orders');

      // Should see the order
      const orderCard = page.locator(`[data-testid="order-${orderNumber}"]`);
      await expect(orderCard).toBeVisible();

      // Verify order status is pending
      await expect(orderCard.locator('[data-testid="order-status"]')).toHaveText(/معلق|Pending/i);

      // Verify order total matches
      const displayedTotal = await orderCard.locator('[data-testid="order-total"]').textContent();
      expect(displayedTotal).toContain(orderTotal.replace(/[^\d.]/g, ''));
    });
  });

  test('should prevent multi-supplier cart (MVP constraint)', async ({ page }) => {
    await test.step('Login as contractor', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    });

    await test.step('Add product from first supplier', async () => {
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();

      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.locator('button:has-text("أضف إلى السلة")').click();

      await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
    });

    await test.step('Try to add product from different supplier', async () => {
      await page.goto('/');

      const secondSupplier = page.locator('[data-testid="supplier-card"]').nth(1);
      await secondSupplier.click();

      const productFromDifferentSupplier = page.locator('[data-testid="product-card"]').first();
      await productFromDifferentSupplier.locator('button:has-text("أضف إلى السلة")').click();

      // Should see warning about single supplier
      await expect(page.locator('text=يجب أن تكون جميع المنتجات من مورد واحد')).toBeVisible();

      // Cart should still have 1 item
      await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
    });
  });

  test('should calculate delivery fee based on zone', async ({ page }) => {
    await test.step('Login and add products', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      // Add a product
      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();
      await page.locator('[data-testid="product-card"]').first().locator('button:has-text("أضف إلى السلة")').click();
    });

    await test.step('Enter Zone A address and verify fee', async () => {
      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      // Enter address in Zone A (close to supplier)
      await page.fill('[name="address"]', 'Amman, Jordan');
      await page.waitForTimeout(2000);

      await page.click('button:has-text("التالي")');

      // Select tomorrow
      await page.locator('[data-testid="schedule-option-tomorrow"]').click();
      await page.click('button:has-text("التالي")');

      // Should show Zone A and its fee
      await expect(page.locator('[data-testid="delivery-zone"]')).toContainText('Zone A');

      const zoneAFee = await page.locator('[data-testid="delivery-fee"]').textContent();
      expect(zoneAFee).toBeTruthy();
    });
  });

  test('should handle out-of-zone delivery gracefully', async ({ page }) => {
    await test.step('Login and add products', async () => {
      await page.goto('/login');
      await page.fill('[name="email"]', process.env.TEST_CONTRACTOR_EMAIL || 'contractor@test.com');
      await page.fill('[name="password"]', process.env.TEST_PASSWORD || 'Test123456!');
      await page.click('button[type="submit"]');
      await page.waitForURL('/');

      const firstSupplier = page.locator('[data-testid="supplier-card"]').first();
      await firstSupplier.click();
      await page.locator('[data-testid="product-card"]').first().locator('button:has-text("أضف إلى السلة")').click();
    });

    await test.step('Enter address outside service area', async () => {
      await page.click('[data-testid="cart-button"]');
      await page.click('button:has-text("متابعة الشراء")');

      // Enter far address (e.g., Aqaba when supplier is in Amman)
      await page.fill('[name="address"]', 'Aqaba, Jordan');
      await page.waitForTimeout(2000);

      await page.click('button:has-text("التالي")');

      // Should show error about out of zone
      await expect(page.locator('text=خارج منطقة التوصيل')).toBeVisible();

      // Should not be able to proceed
      const nextButton = page.locator('button:has-text("التالي")');
      await expect(nextButton).toBeDisabled();
    });
  });
});
