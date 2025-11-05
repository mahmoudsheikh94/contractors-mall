/**
 * E2E Test: Single Supplier Checkout Flow
 *
 * Tests the complete user journey from browsing products to completing an order.
 *
 * Prerequisites:
 * - App running on http://localhost:3000
 * - Test database seeded with suppliers and products
 * - Supabase configured for testing
 */

import { test, expect } from '@playwright/test'

test.describe('Single Supplier Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start at the products page
    await page.goto('/')

    // Wait for products to load
    await page.waitForLoadState('networkidle')
  })

  test('complete checkout flow with single supplier', async ({ page }) => {
    // ========================================
    // 1. BROWSE & ADD TO CART
    // ========================================

    // Verify products are displayed
    await expect(page.getByRole('heading', { name: /المنتجات/i })).toBeVisible()

    // Find first product card and add to cart
    const firstProduct = page.locator('[data-testid="product-card"]').first()
    await expect(firstProduct).toBeVisible()

    // Click "Add to Cart" button
    await firstProduct.getByRole('button', { name: /أضف للسلة/ }).click()

    // Verify cart button shows item count
    const cartButton = page.getByRole('button', { name: /السلة/ })
    await expect(cartButton).toContainText('1')

    // Add a second product from the same supplier
    const secondProduct = page.locator('[data-testid="product-card"]').nth(1)
    await secondProduct.getByRole('button', { name: /أضف للسلة/ }).click()

    // Cart should now show 2 items
    await expect(cartButton).toContainText('2')

    // ========================================
    // 2. OPEN CART & REVIEW
    // ========================================

    // Open cart drawer
    await cartButton.click()

    // Verify cart drawer is open
    await expect(page.getByRole('heading', { name: /سلة التسوق/ })).toBeVisible()

    // Verify cart items are displayed
    const cartItems = page.locator('[data-testid="cart-item"]')
    await expect(cartItems).toHaveCount(2)

    // Verify subtotal is displayed
    await expect(page.getByText(/المجموع الفرعي/)).toBeVisible()

    // Verify total weight is displayed
    await expect(page.getByText(/الوزن الكلي/)).toBeVisible()

    // ========================================
    // 3. PROCEED TO CHECKOUT
    // ========================================

    // Click "Proceed to Checkout" button
    await page.getByRole('button', { name: /إتمام الطلب/ }).click()

    // Should navigate to address page
    await expect(page).toHaveURL(/\/checkout\/address/)
    await expect(page.getByRole('heading', { name: /عنوان التوصيل/ })).toBeVisible()

    // ========================================
    // 4. ENTER DELIVERY ADDRESS
    // ========================================

    // Verify progress indicator shows step 1 active
    await expect(page.getByText('العنوان').first()).toHaveClass(/bg-primary/)

    // Use current location button (mocked in test)
    await page.getByRole('button', { name: /استخدام موقعي الحالي/ }).click()

    // Wait for coordinates to be populated
    await page.waitForTimeout(500)

    // Fill in address details
    await page.getByPlaceholder(/شارع الجامعة/).fill('شارع الملك عبدالله، عمان')
    await page.getByPlaceholder('0791234567').fill('0791234567')
    await page.getByPlaceholder('عمّان').fill('عمان')
    await page.getByPlaceholder('جبل الحسين').fill('جبل الحسين')
    await page.getByPlaceholder('12').fill('15')
    await page.getByPlaceholder('3').fill('3')
    await page.getByPlaceholder('5').fill('5')

    // Click "Next: Select Schedule"
    await page.getByRole('button', { name: /التالي: اختيار الموعد/ }).click()

    // ========================================
    // 5. SELECT DELIVERY SCHEDULE
    // ========================================

    // Should navigate to schedule page
    await expect(page).toHaveURL(/\/checkout\/schedule/)
    await expect(page.getByRole('heading', { name: /موعد التوصيل/ })).toBeVisible()

    // Verify progress shows step 2 active
    await expect(page.getByText('الموعد').first()).toHaveClass(/bg-primary/)

    // Select delivery date (tomorrow by default)
    const dateInput = page.locator('input[type="date"]')
    await expect(dateInput).toBeVisible()

    // Select time slot (Morning)
    await page.getByText('صباحاً (8:00 - 12:00)').click()

    // Verify delivery expectations are shown
    await expect(page.getByText(/المورد سيقوم بتفريغ المواد/)).toBeVisible()

    // Click "Next: Review Order"
    await page.getByRole('button', { name: /التالي: مراجعة الطلب/ }).click()

    // ========================================
    // 6. REVIEW ORDER
    // ========================================

    // Should navigate to review page
    await expect(page).toHaveURL(/\/checkout\/review/)
    await expect(page.getByRole('heading', { name: /مراجعة الطلب/ })).toBeVisible()

    // Verify progress shows step 3 active
    await expect(page.getByText('المراجعة').first()).toHaveClass(/bg-primary/)

    // Verify delivery info is displayed
    await expect(page.getByText('شارع الملك عبدالله')).toBeVisible()
    await expect(page.getByText('جبل الحسين')).toBeVisible()
    await expect(page.getByText(/صباحاً/)).toBeVisible()

    // Verify order items are displayed
    await expect(cartItems).toHaveCount(2)

    // Wait for vehicle estimation to load
    await page.waitForSelector('[data-testid="vehicle-estimation"]', { timeout: 5000 })

    // Verify vehicle and delivery fee are shown
    await expect(page.getByText(/وانيت|شاحنة/)).toBeVisible() // Vehicle name
    await expect(page.getByText(/رسوم التوصيل/)).toBeVisible()

    // Verify total is calculated
    await expect(page.getByText(/المجموع الكلي/)).toBeVisible()

    // Verify escrow notice is shown
    await expect(page.getByText(/سيتم حجز المبلغ/)).toBeVisible()

    // ========================================
    // 7. PLACE ORDER
    // ========================================

    // Click "Place Order" button
    const placeOrderButton = page.getByRole('button', { name: /تأكيد وإتمام الطلب/ })
    await expect(placeOrderButton).toBeEnabled()
    await placeOrderButton.click()

    // ========================================
    // 8. VERIFY SUCCESS
    // ========================================

    // Should show success message or navigate to success page
    await expect(page.getByText(/تم إنشاء طلبك بنجاح/)).toBeVisible({ timeout: 10000 })

    // Verify cart is cleared
    await expect(cartButton).not.toContainText(/\d+/)

    // Verify localStorage is cleared
    const checkoutAddress = await page.evaluate(() => localStorage.getItem('checkout_address'))
    const checkoutSchedule = await page.evaluate(() => localStorage.getItem('checkout_schedule'))
    expect(checkoutAddress).toBeNull()
    expect(checkoutSchedule).toBeNull()
  })

  test('should handle validation errors gracefully', async ({ page }) => {
    // Add item to cart
    await page.locator('[data-testid="product-card"]').first()
      .getByRole('button', { name: /أضف للسلة/ }).click()

    // Open cart and proceed to checkout
    await page.getByRole('button', { name: /السلة/ }).click()
    await page.getByRole('button', { name: /إتمام الطلب/ }).click()

    // Try to proceed without filling address
    await page.getByRole('button', { name: /التالي: اختيار الموعد/ }).click()

    // Should show validation alert
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('الرجاء إدخال العنوان')
      await dialog.accept()
    })

    // Should stay on address page
    await expect(page).toHaveURL(/\/checkout\/address/)
  })

  test('should allow cart modification during checkout', async ({ page }) => {
    // Add items and go to checkout
    await page.locator('[data-testid="product-card"]').first()
      .getByRole('button', { name: /أضف للسلة/ }).click()

    const cartButton = page.getByRole('button', { name: /السلة/ })
    await cartButton.click()
    await page.getByRole('button', { name: /إتمام الطلب/ }).click()

    // On checkout page, click back to cart
    await page.getByRole('link', { name: /العودة للسلة/ }).click()

    // Should navigate back to products
    await expect(page).toHaveURL('/')

    // Cart should still have items
    await expect(cartButton).toContainText('1')
  })
})

test.describe('Cart Functionality', () => {
  test('should update quantities in cart', async ({ page }) => {
    await page.goto('/')

    // Add item to cart
    await page.locator('[data-testid="product-card"]').first()
      .getByRole('button', { name: /أضف للسلة/ }).click()

    // Open cart
    await page.getByRole('button', { name: /السلة/ }).click()

    // Increase quantity
    const increaseButton = page.getByRole('button', { name: '+' })
    await increaseButton.click()

    // Verify quantity increased
    const quantityDisplay = page.locator('[data-testid="item-quantity"]')
    await expect(quantityDisplay).not.toContainText('10') // Assuming min order was 10

    // Decrease quantity
    const decreaseButton = page.getByRole('button', { name: '-' })
    await decreaseButton.click()

    // Should enforce minimum order quantity
    await expect(quantityDisplay).toContainText('10')
  })

  test('should remove items from cart', async ({ page }) => {
    await page.goto('/')

    // Add item to cart
    await page.locator('[data-testid="product-card"]').first()
      .getByRole('button', { name: /أضف للسلة/ }).click()

    // Open cart
    await page.getByRole('button', { name: /السلة/ }).click()

    // Remove item
    await page.getByRole('button', { name: /حذف|إزالة/ }).first().click()

    // Should show empty cart message
    await expect(page.getByText(/سلتك فارغة/)).toBeVisible()
  })
})
