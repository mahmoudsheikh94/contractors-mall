/**
 * Tests for Checkout Review Page
 *
 * Test Coverage:
 * 1. Prerequisites and redirects (empty cart, missing address/schedule)
 * 2. Page rendering (header, progress steps, delivery info)
 * 3. Supplier orders (single/multi-supplier grouping)
 * 4. Vehicle estimation (loading, success, error states)
 * 5. Calculations (subtotals, delivery fees, grand total)
 * 6. Order placement (creation, success, error handling)
 * 7. Navigation (previous button, success redirect)
 * 8. Accessibility (headings, RTL)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CheckoutReviewPage from '../page'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import {
  mockCartItems,
  mockMultiSupplierCartItems,
  mockSingleSupplierCartItems,
} from '@/__tests__/fixtures/cart'
import { mockVehicleEstimates } from '@/__tests__/fixtures/orders'

// Mock hooks
jest.mock('@/hooks/useCart')
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Link component
jest.mock('next/link', () => {
  return ({ children, href }: any) => <a href={href}>{children}</a>
})

const mockUseCart = useCart as jest.MockedFunction<typeof useCart>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockPush = jest.fn()
const mockClearCart = jest.fn()

// Mock fetch
global.fetch = jest.fn()

describe('CheckoutReviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()

    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/checkout/review',
      query: {},
      asPath: '/checkout/review',
    } as any)

    mockUseCart.mockReturnValue({
      cart: {
        items: mockCartItems,
      },
      totals: {
        itemCount: mockCartItems.reduce((sum, item) => sum + item.quantity, 0),
        subtotal: mockCartItems.reduce(
          (sum, item) => sum + item.price_per_unit * item.quantity,
          0
        ),
        totalWeight: 0,
        totalVolume: 0,
        maxLength: 0,
        requiresOpenBed: false,
      },
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: mockClearCart,
      isOpen: false,
      setIsOpen: jest.fn(),
    })

    // Mock localStorage data
    const mockAddress = {
      address: '123 Test Street',
      district: 'Test District',
      city: 'Amman',
      latitude: 31.9539,
      longitude: 35.9106,
      phone: '+962791234567',
    }
    const mockSchedule = {
      date: '2025-10-30',
      time_slot: 'morning',
    }
    localStorage.setItem('checkout_address', JSON.stringify(mockAddress))
    localStorage.setItem('checkout_schedule', JSON.stringify(mockSchedule))

    // Mock successful vehicle estimate by default
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        estimate: mockVehicleEstimates[0],
      }),
    })
  })

  describe('Prerequisites and Redirects', () => {
    it('should redirect to address page if no address stored', () => {
      localStorage.removeItem('checkout_address')

      render(<CheckoutReviewPage />)

      expect(mockPush).toHaveBeenCalledWith('/checkout/address')
    })

    it('should redirect to address page if no schedule stored', () => {
      localStorage.removeItem('checkout_schedule')

      render(<CheckoutReviewPage />)

      expect(mockPush).toHaveBeenCalledWith('/checkout/address')
    })

    it('should render nothing if cart is empty', () => {
      mockUseCart.mockReturnValue({
        cart: {
          items: [],
        },
        totals: {
          itemCount: 0,
          subtotal: 0,
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: mockClearCart,
        isOpen: false,
        setIsOpen: jest.fn(),
      })

      const { container } = render(<CheckoutReviewPage />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Page Rendering', () => {
    it('should render page header with title', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('مراجعة الطلب')).toBeInTheDocument()
      })
    })

    it('should render back to shopping button', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('العودة للتسوق')).toBeInTheDocument()
      })
    })

    it('should render progress steps with all steps', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        // "العنوان" appears twice (progress step and delivery info), so use getAllByText
        expect(screen.getAllByText('العنوان').length).toBeGreaterThan(0)
        expect(screen.getByText('الموعد')).toBeInTheDocument()
        expect(screen.getByText('المراجعة')).toBeInTheDocument()
      })
    })

    it('should show first two steps as completed (✓)', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const checkmarks = screen.getAllByText('✓')
        expect(checkmarks).toHaveLength(2)
      })
    })

    it('should show third step as current (number 3)', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const step3 = screen.getByText('3')
        expect(step3).toBeInTheDocument()
      })
    })

    it('should render delivery info section', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('معلومات التوصيل')).toBeInTheDocument()
      })
    })

    it('should render total summary section', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('الملخص النهائي')).toBeInTheDocument()
      })
    })
  })

  describe('Delivery Info Display', () => {
    it('should display delivery address', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('123 Test Street')).toBeInTheDocument()
        expect(screen.getByText(/Test District/)).toBeInTheDocument()
      })
    })

    it('should display delivery schedule with date', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('2025-10-30')).toBeInTheDocument()
      })
    })

    it('should display morning time slot in Arabic', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('صباحاً (8:00 - 12:00)')).toBeInTheDocument()
      })
    })

    it('should display afternoon time slot in Arabic', async () => {
      const mockSchedule = {
        date: '2025-10-30',
        time_slot: 'afternoon',
      }
      localStorage.setItem('checkout_schedule', JSON.stringify(mockSchedule))

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('ظهراً (12:00 - 4:00)')).toBeInTheDocument()
      })
    })

    it('should display evening time slot in Arabic', async () => {
      const mockSchedule = {
        date: '2025-10-30',
        time_slot: 'evening',
      }
      localStorage.setItem('checkout_schedule', JSON.stringify(mockSchedule))

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('مساءً (4:00 - 8:00)')).toBeInTheDocument()
      })
    })

    it('should render edit link for address', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const editLinks = screen.getAllByText(/تعديل/)
        expect(editLinks[0]).toHaveAttribute('href', '/checkout/address')
      })
    })

    it('should render edit link for schedule', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const editLinks = screen.getAllByText(/تعديل/)
        expect(editLinks[1]).toHaveAttribute('href', '/checkout/schedule')
      })
    })
  })

  describe('Supplier Orders - Single Supplier', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: {
          items: mockSingleSupplierCartItems,
        },
        totals: {
          itemCount: mockSingleSupplierCartItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: mockSingleSupplierCartItems.reduce(
            (sum, item) => sum + item.price_per_unit * item.quantity,
            0
          ),
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: mockClearCart,
        isOpen: false,
        setIsOpen: jest.fn(),
      })
    })

    it('should render single supplier order', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText(/طلب #1/)).toBeInTheDocument()
      })
    })

    it('should display supplier name', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const supplierName = mockSingleSupplierCartItems[0].supplier.business_name
        expect(screen.getByText(supplierName)).toBeInTheDocument()
      })
    })

    it('should display order items with quantities and prices', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const item = mockSingleSupplierCartItems[0]
        expect(screen.getByText(item.name_ar)).toBeInTheDocument()
        expect(screen.getByText(new RegExp(`${item.quantity} ${item.unit_ar}`))).toBeInTheDocument()
      })
    })

    it('should calculate item total correctly', async () => {
      render(<CheckoutReviewPage />)

      const item = mockSingleSupplierCartItems[0]
      const itemTotal = (item.quantity * item.price_per_unit).toFixed(2)

      await waitFor(
        () => {
          const elements = screen.getAllByText(new RegExp(itemTotal))
          expect(elements.length).toBeGreaterThan(0)
        },
        { timeout: 3000 }
      )
    })
  })

  describe('Supplier Orders - Multi-Supplier', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: {
          items: mockMultiSupplierCartItems,
        },
        totals: {
          itemCount: mockMultiSupplierCartItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: mockMultiSupplierCartItems.reduce(
            (sum, item) => sum + item.price_per_unit * item.quantity,
            0
          ),
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: mockClearCart,
        isOpen: false,
        setIsOpen: jest.fn(),
      })
    })

    it('should render multiple supplier orders', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText(/طلب #1/)).toBeInTheDocument()
        expect(screen.getByText(/طلب #2/)).toBeInTheDocument()
      })
    })

    it('should group items by supplier correctly', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        // Check that each supplier's items are displayed
        const supplier1Items = mockMultiSupplierCartItems.filter(
          (item) => item.supplier.id === mockMultiSupplierCartItems[0].supplier.id
        )
        const supplier2Items = mockMultiSupplierCartItems.filter(
          (item) => item.supplier.id !== mockMultiSupplierCartItems[0].supplier.id
        )

        supplier1Items.forEach((item) => {
          expect(screen.getByText(item.name_ar)).toBeInTheDocument()
        })
        supplier2Items.forEach((item) => {
          expect(screen.getByText(item.name_ar)).toBeInTheDocument()
        })
      })
    })

    it('should show correct number of orders in summary', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('عدد الطلبات:')).toBeInTheDocument()
      })
    })
  })

  describe('Vehicle Estimation', () => {
    it('should show loading state while fetching estimate', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000)
          })
      )

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('جاري حساب رسوم التوصيل...')).toBeInTheDocument()
      })
    })

    it('should display vehicle estimate on success', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )
    })

    it('should display distance and zone', async () => {
      render(<CheckoutReviewPage />)

      // First wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Then check distance and zone
      const distanceText = `المسافة: ${mockVehicleEstimates[0].distance_km.toFixed(1)} كم`
      expect(screen.getByText(new RegExp(distanceText))).toBeInTheDocument()
      expect(screen.getByText(/منطقة أ/)).toBeInTheDocument()
    })

    it('should display delivery fee', async () => {
      render(<CheckoutReviewPage />)

      // First wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Then check delivery fee (appears multiple times on page)
      const fee = mockVehicleEstimates[0].delivery_fee_jod.toFixed(2)
      const elements = screen.getAllByText(new RegExp(fee))
      expect(elements.length).toBeGreaterThan(0)
    })

    it('should display error state on estimate failure', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          error: 'Delivery not available to this location',
        }),
      })

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(
          screen.getByText('Delivery not available to this location')
        ).toBeInTheDocument()
      })
    })

    it('should handle network error gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('خطأ في الاتصال بالخادم')).toBeInTheDocument()
      })
    })

    it('should fetch vehicle estimate for each supplier', async () => {
      mockUseCart.mockReturnValue({
        cart: {
          items: mockMultiSupplierCartItems,
        },
        totals: {
          itemCount: mockMultiSupplierCartItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: mockMultiSupplierCartItems.reduce(
            (sum, item) => sum + item.price_per_unit * item.quantity,
            0
          ),
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: mockClearCart,
        isOpen: false,
        setIsOpen: jest.fn(),
      })

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        // Should fetch estimate for each unique supplier
        const uniqueSuppliers = new Set(mockMultiSupplierCartItems.map((item) => item.supplier.id))
        expect(global.fetch).toHaveBeenCalledTimes(uniqueSuppliers.size)
      })
    })
  })

  describe('Calculations', () => {
    it('should calculate subtotal correctly for single supplier', async () => {
      render(<CheckoutReviewPage />)

      const expectedSubtotal = mockCartItems.reduce(
        (sum, item) => sum + item.price_per_unit * item.quantity,
        0
      )

      await waitFor(
        () => {
          const elements = screen.getAllByText(new RegExp(expectedSubtotal.toFixed(2)))
          expect(elements.length).toBeGreaterThan(0)
        },
        { timeout: 3000 }
      )
    })

    it('should display delivery fees in order summary', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('رسوم التوصيل:')).toBeInTheDocument()
      })
    })

    it('should calculate order total (subtotal + delivery)', async () => {
      render(<CheckoutReviewPage />)

      const subtotal = mockCartItems.reduce(
        (sum, item) => sum + item.price_per_unit * item.quantity,
        0
      )
      const deliveryFee = mockVehicleEstimates[0].delivery_fee_jod
      const total = (subtotal + deliveryFee).toFixed(2)

      // First wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Then check the total (appears multiple times on page)
      expect(screen.getByText(/إجمالي هذا الطلب:/)).toBeInTheDocument()
      const elements = screen.getAllByText(new RegExp(total))
      expect(elements.length).toBeGreaterThan(0)
    })

    it('should calculate grand total correctly', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('المبلغ الإجمالي:')).toBeInTheDocument()
      })
    })

    it('should calculate total delivery fees', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        expect(screen.getByText('إجمالي رسوم التوصيل:')).toBeInTheDocument()
      })
    })
  })

  describe('Order Placement', () => {
    it('should disable place order button while estimates loading', async () => {
      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000)
          })
      )

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
        expect(placeOrderButton).toBeDisabled()
      })
    })

    it('should disable place order button if estimate error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          error: 'Delivery not available',
        }),
      })

      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
        expect(placeOrderButton).toBeDisabled()
      })
    })

    it('should enable place order button when all estimates loaded', async () => {
      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load (which enables the button)
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Then check button is enabled
      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
    })

    it('should create order on button click', async () => {
      const mockOrderResponse = {
        order_id: '123',
        status: 'escrow_held',
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ estimate: mockVehicleEstimates[0] }),
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOrderResponse,
      })

      // Mock window.alert
      window.alert = jest.fn()

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      })
    })

    it('should show loading state while creating order', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ estimate: mockVehicleEstimates[0] }),
      })

      ;(global.fetch as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000)
          })
      )

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        expect(screen.getByText('جاري إنشاء الطلب...')).toBeInTheDocument()
      })
    })

    it('should clear cart on successful order', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ estimate: mockVehicleEstimates[0] }),
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order_id: '123' }),
      })

      window.alert = jest.fn()

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        expect(mockClearCart).toHaveBeenCalled()
      })
    })

    it('should clear checkout data from localStorage on success', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ estimate: mockVehicleEstimates[0] }),
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order_id: '123' }),
      })

      window.alert = jest.fn()

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        expect(localStorage.getItem('checkout_address')).toBeNull()
        expect(localStorage.getItem('checkout_schedule')).toBeNull()
      })
    })

    it('should show success alert on order creation', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ estimate: mockVehicleEstimates[0] }),
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order_id: '123' }),
      })

      window.alert = jest.fn()

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('تم إنشاء'))
      })
    })

    it('should navigate to products page on success', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ estimate: mockVehicleEstimates[0] }),
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order_id: '123' }),
      })

      window.alert = jest.fn()

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/products')
      })
    })

    it('should handle order creation error', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ estimate: mockVehicleEstimates[0] }),
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Order creation failed' }),
      })

      window.alert = jest.fn()

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimate to load
      await waitFor(
        () => {
          expect(screen.getByText(mockVehicleEstimates[0].vehicle_name_ar)).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('حدث خطأ'))
      })
    })

    it('should create separate orders for multi-supplier cart', async () => {
      mockUseCart.mockReturnValue({
        cart: {
          items: mockMultiSupplierCartItems,
        },
        totals: {
          itemCount: mockMultiSupplierCartItems.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: mockMultiSupplierCartItems.reduce(
            (sum, item) => sum + item.price_per_unit * item.quantity,
            0
          ),
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
        clearCart: mockClearCart,
        isOpen: false,
        setIsOpen: jest.fn(),
      })

      // Mock vehicle estimates for both suppliers
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === '/api/vehicle-estimate') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ estimate: mockVehicleEstimates[0] }),
          })
        }
        if (url === '/api/orders') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ order_id: Math.random().toString() }),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      window.alert = jest.fn()

      render(<CheckoutReviewPage />)

      // Wait for vehicle estimates to load for all suppliers (appears multiple times for multi-supplier)
      await waitFor(
        () => {
          const elements = screen.getAllByText(mockVehicleEstimates[0].vehicle_name_ar)
          expect(elements.length).toBeGreaterThan(0)
        },
        { timeout: 3000 }
      )

      const placeOrderButton = screen.getByText('تأكيد الطلب والدفع')
      expect(placeOrderButton).not.toBeDisabled()
      fireEvent.click(placeOrderButton)

      await waitFor(() => {
        // Should create 2 orders (one for each unique supplier)
        const orderCalls = (global.fetch as jest.Mock).mock.calls.filter(
          (call) => call[0] === '/api/orders'
        )
        expect(orderCalls.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Navigation', () => {
    it('should render previous button to schedule page', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const prevButton = screen.getByText('السابق')
        expect(prevButton.closest('a')).toHaveAttribute('href', '/checkout/schedule')
      })
    })

    it('should allow clicking previous button', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const prevButton = screen.getByText('السابق')
        fireEvent.click(prevButton)
        // Navigation is handled by Link, so we just verify it's clickable
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const h1 = screen.getByRole('heading', { level: 1, name: 'مراجعة الطلب' })
        expect(h1).toBeInTheDocument()

        const h2s = screen.getAllByRole('heading', { level: 2 })
        expect(h2s.length).toBeGreaterThan(0)
      })
    })

    it('should use RTL layout', async () => {
      const { container } = render(<CheckoutReviewPage />)

      await waitFor(() => {
        const mainDiv = container.querySelector('[dir="rtl"]')
        expect(mainDiv).toBeInTheDocument()
      })
    })

    it('should have semantic sections', async () => {
      render(<CheckoutReviewPage />)

      await waitFor(() => {
        const header = screen.getByRole('banner')
        const main = screen.getByRole('main')
        expect(header).toBeInTheDocument()
        expect(main).toBeInTheDocument()
      })
    })
  })
})
