# Test Infrastructure

This directory contains test fixtures, mocks, and utilities for testing the Contractors Mall application.

## Directory Structure

```
__tests__/
├── fixtures/          # Mock data for testing
│   ├── users.ts       # Mock users and sessions
│   ├── suppliers.ts   # Mock suppliers and distance data
│   ├── products.ts    # Mock products
│   ├── cart.ts        # Mock cart items and state
│   ├── orders.ts      # Mock orders, deliveries, vehicles
│   └── index.ts       # Central export
├── mocks/             # MSW handlers for API mocking
│   ├── handlers.ts    # API endpoint mocks
│   └── server.ts      # MSW server setup (Node)
└── utils/             # Test utilities and helpers
    └── test-utils.tsx # Custom render, helpers
```

## Using Fixtures

Import fixtures from the central export:

```typescript
import { mockUser, mockSuppliers, mockProducts, mockCartItems } from '@/__tests__/fixtures'

// Use in tests
test('displays supplier name', () => {
  render(<SupplierCard supplier={mockSuppliers[0]} />)
  expect(screen.getByText('مورد الأسمنت والحديد')).toBeInTheDocument()
})
```

## Available Fixtures

### Users (`users.ts`)
- `mockUser` - Contractor user
- `mockSupplierUser` - Supplier admin user
- `mockAdminUser` - Admin user
- `mockSession` - Mock Supabase session

### Suppliers (`suppliers.ts`)
- `mockSuppliers` - Array of 4 suppliers (3 active, 1 inactive)
- `mockSupplier` - Single supplier
- `mockDistanceData` - Distance/zone test data

### Products (`products.ts`)
- `mockProducts` - Array of 6 products (5 available, 1 out of stock)
- `mockProduct` - Standard product
- `mockLongProduct` - Product with length (12m rebar)
- `mockOpenBedProduct` - Product requiring open bed

### Cart (`cart.ts`)
- `mockCartItems` - Single-supplier cart (2 items)
- `mockMultiSupplierCartItems` - Multi-supplier cart (3 items)
- `mockSingleSupplierCartItems` - Single item cart
- `mockEmptyCart` - Empty cart
- `calculateCartTotal()` - Helper function

### Orders (`orders.ts`)
- `mockVehicleEstimate` - Small vehicle (وانيت 1 طن)
- `mockVehicleEstimateLarge` - Large vehicle (شاحنة 3.5 طن)
- `mockDeliveryAddress` - Sample delivery location
- `mockDeliverySchedule` - Sample schedule
- `mockOrder` - Complete order
- `mockOrderWithPIN` - Order ≥120 JOD (requires PIN)
- `mockOrderPhotoOnly` - Order <120 JOD (photo only)
- `mockCompleteOrder` - Order with items, delivery, payment

## Using MSW for API Mocking

MSW is automatically configured in `jest.setup.js`. All API calls in tests will be intercepted.

### Available API Mocks

```typescript
// Automatically mocked endpoints:
GET  /api/suppliers           → mockSuppliers (active & verified only)
GET  /api/suppliers/:id       → Single supplier
GET  /api/products            → mockProducts (available only)
GET  /api/products/:id        → Single product
POST /api/vehicle-estimate    → Vehicle estimation based on weight
POST /api/orders              → Order creation
GET  /api/orders              → List orders
GET  /api/orders/:id          → Single order
```

### Customizing API Responses

Override handlers in specific tests:

```typescript
import { server } from '@/__tests__/mocks/server'
import { http, HttpResponse } from 'msw'

test('handles API error', async () => {
  // Override for this test only
  server.use(
    http.get('/api/suppliers', () => {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    })
  )

  // Your test code...
})
```

## Using Test Utilities

Import custom render and helpers:

```typescript
import { render, screen, waitFor } from '@/__tests__/utils/test-utils'
import { mockGeolocation, mockLocalStorage } from '@/__tests__/utils/test-utils'

test('uses geolocation', () => {
  const getCurrentPositionMock = mockGeolocation(31.9700, 35.9300)

  // Test component that uses geolocation...

  expect(getCurrentPositionMock).toHaveBeenCalled()
})
```

### Available Helpers

- `render()` - Custom render with CartProvider
- `waitForLoadingToFinish()` - Wait for async operations
- `mockLocalStorage()` - Mock localStorage with getItem/setItem
- `mockGeolocation(lat, lng)` - Mock geolocation API
- `mockRouterPush` - Mock Next.js router push
- `resetAllMocks()` - Clear all mocks between tests

## Example Unit Test

```typescript
import { render, screen } from '@/__tests__/utils/test-utils'
import { mockProduct } from '@/__tests__/fixtures'
import ProductCard from '@/components/ProductCard'

describe('ProductCard', () => {
  it('displays product name in Arabic', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('أسمنت مقاوم')).toBeInTheDocument()
  })

  it('displays product price', () => {
    render(<ProductCard product={mockProduct} />)
    expect(screen.getByText('4.50 JOD')).toBeInTheDocument()
  })
})
```

## Example API Integration Test

```typescript
import { render, screen, waitFor } from '@/__tests__/utils/test-utils'
import { mockSuppliers } from '@/__tests__/fixtures'
import SuppliersList from '@/app/suppliers/SuppliersList'

describe('SuppliersList', () => {
  it('fetches and displays suppliers', async () => {
    render(<SuppliersList />)

    // Wait for API call to complete
    await waitFor(() => {
      expect(screen.getByText('مورد الأسمنت والحديد')).toBeInTheDocument()
    })

    // Verify all active suppliers are shown
    expect(screen.getAllByTestId('supplier-card')).toHaveLength(3)
  })
})
```

## Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Unit tests only
pnpm test:unit

# E2E tests
pnpm test:e2e

# E2E with UI
pnpm test:e2e:ui

# All tests
pnpm test:all
```

## Test Coverage

Coverage thresholds are set to 70% for:
- Branches
- Functions
- Lines
- Statements

See `jest.config.js` for configuration.

## Best Practices

1. **Use Fixtures**: Always use fixtures instead of inline test data
2. **Reset Mocks**: Call `resetAllMocks()` in `afterEach` if needed
3. **Test User Behavior**: Focus on what users see/do, not implementation
4. **Accessibility**: Use `getByRole`, `getByLabelText` over `getByTestId`
5. **Async Testing**: Always use `waitFor` for async operations
6. **Isolation**: Each test should be independent
7. **Descriptive Names**: Use clear, descriptive test names

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/docs/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
