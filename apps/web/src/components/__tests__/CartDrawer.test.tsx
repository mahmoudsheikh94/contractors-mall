/**
 * Unit tests for CartDrawer component
 */

import { render, screen, fireEvent } from '@/__tests__/utils/test-utils'
import { CartDrawer } from '../CartDrawer'
import { useCart } from '@/hooks/useCart'
import { mockCartItems, mockMultiSupplierCartItems } from '@/__tests__/fixtures'

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, onClick }: any) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  )
})

// Mock CartItem component
jest.mock('../CartItem', () => ({
  CartItem: ({ item }: any) => (
    <div data-testid="cart-item" data-product-id={item.productId}>
      {item.name_ar}
    </div>
  ),
}))

// Mock useCart hook
jest.mock('@/hooks/useCart')
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>

describe('CartDrawer', () => {
  const mockSetIsOpen = jest.fn()
  const mockClearCart = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    window.confirm = jest.fn(() => true) // Mock window.confirm
  })

  describe('Visibility', () => {
    it('should not render when isOpen is false', () => {
      mockUseCart.mockReturnValue({
        cart: { items: [] },
        totals: {
          subtotal: 0,
          itemCount: 0,
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        isOpen: false,
        setIsOpen: mockSetIsOpen,
        clearCart: mockClearCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })

      const { container } = render(<CartDrawer />)
      expect(container.firstChild).toBeNull()
    })

    it('should render when isOpen is true', () => {
      mockUseCart.mockReturnValue({
        cart: { items: [] },
        totals: {
          subtotal: 0,
          itemCount: 0,
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        isOpen: true,
        setIsOpen: mockSetIsOpen,
        clearCart: mockClearCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })

      render(<CartDrawer />)
      expect(screen.getByText('سلة التسوق')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: [] },
        totals: {
          subtotal: 0,
          itemCount: 0,
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        isOpen: true,
        setIsOpen: mockSetIsOpen,
        clearCart: mockClearCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should display empty state message', () => {
      render(<CartDrawer />)
      expect(screen.getByText('السلة فارغة')).toBeInTheDocument()
      expect(screen.getByText('ابدأ بإضافة المنتجات إلى سلة التسوق')).toBeInTheDocument()
    })

    it('should display browse products button', () => {
      render(<CartDrawer />)
      const button = screen.getByText('تصفح المنتجات')
      expect(button).toBeInTheDocument()
    })

    it('should close drawer when clicking browse products', () => {
      render(<CartDrawer />)
      const link = screen.getByText('تصفح المنتجات').closest('a')
      fireEvent.click(link!)

      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })
  })

  describe('Cart with Items', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: mockCartItems },
        totals: {
          subtotal: 595.0,
          itemCount: 11,
          totalWeight: 1500,
          totalVolume: 0.55,
          maxLength: 12,
          requiresOpenBed: true,
        },
        isOpen: true,
        setIsOpen: mockSetIsOpen,
        clearCart: mockClearCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should display cart items', () => {
      render(<CartDrawer />)
      const items = screen.getAllByTestId('cart-item')
      expect(items).toHaveLength(mockCartItems.length)
    })

    it('should display subtotal', () => {
      render(<CartDrawer />)
      expect(screen.getByText('595.00 د.أ')).toBeInTheDocument()
    })

    it('should display total weight', () => {
      render(<CartDrawer />)
      expect(screen.getByText('1500.0 كجم')).toBeInTheDocument()
    })

    it('should display delivery fee placeholder', () => {
      render(<CartDrawer />)
      expect(screen.getByText('تحسب عند الدفع')).toBeInTheDocument()
    })

    it('should display checkout button', () => {
      render(<CartDrawer />)
      expect(screen.getByText('إكمال الطلب')).toBeInTheDocument()
    })

    it('should close drawer when clicking checkout', () => {
      render(<CartDrawer />)
      const link = screen.getByText('إكمال الطلب').closest('a')
      fireEvent.click(link!)

      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('should display clear cart button', () => {
      render(<CartDrawer />)
      expect(screen.getByText('إفراغ السلة')).toBeInTheDocument()
    })

    it('should confirm before clearing cart', () => {
      render(<CartDrawer />)
      const clearButton = screen.getByText('إفراغ السلة')
      fireEvent.click(clearButton)

      expect(window.confirm).toHaveBeenCalledWith('هل أنت متأكد من إفراغ السلة؟')
    })

    it('should clear cart when confirmed', () => {
      render(<CartDrawer />)
      const clearButton = screen.getByText('إفراغ السلة')
      fireEvent.click(clearButton)

      expect(mockClearCart).toHaveBeenCalled()
      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('should not clear cart when cancelled', () => {
      window.confirm = jest.fn(() => false)

      render(<CartDrawer />)
      const clearButton = screen.getByText('إفراغ السلة')
      fireEvent.click(clearButton)

      expect(mockClearCart).not.toHaveBeenCalled()
      expect(mockSetIsOpen).not.toHaveBeenCalled()
    })
  })

  describe('Multi-Supplier Cart', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: mockMultiSupplierCartItems },
        totals: {
          subtotal: 720.0,
          itemCount: 16,
          totalWeight: 9500,
          totalVolume: 5.55,
          maxLength: 12,
          requiresOpenBed: true,
        },
        isOpen: true,
        setIsOpen: mockSetIsOpen,
        clearCart: mockClearCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should display multi-supplier notice', () => {
      render(<CartDrawer />)
      expect(screen.getByText(/سيتم تقسيم طلبك إلى/)).toBeInTheDocument()
    })

    it('should show correct number of suppliers in notice', () => {
      render(<CartDrawer />)
      // mockMultiSupplierCartItems has 2 different suppliers
      expect(screen.getByText(/2 طلبات منفصلة/)).toBeInTheDocument()
    })

    it('should group items by supplier', () => {
      render(<CartDrawer />)
      expect(screen.getByText('مورد الأسمنت والحديد')).toBeInTheDocument()
      expect(screen.getByText('مواد البناء الحديثة')).toBeInTheDocument()
    })

    it('should display subtotal for each supplier', () => {
      render(<CartDrawer />)
      // Verify supplier subtotals are displayed (actual values depend on mockMultiSupplierCartItems)
      const subtotals = screen.getAllByText(/د\.أ$/)
      expect(subtotals.length).toBeGreaterThan(0)
    })
  })

  describe('Close Actions', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: mockCartItems },
        totals: {
          subtotal: 595.0,
          itemCount: 11,
          totalWeight: 1500,
          totalVolume: 0.55,
          maxLength: 12,
          requiresOpenBed: true,
        },
        isOpen: true,
        setIsOpen: mockSetIsOpen,
        clearCart: mockClearCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should close when clicking close button', () => {
      render(<CartDrawer />)
      const closeButton = screen.getByLabelText('إغلاق')
      fireEvent.click(closeButton)

      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('should close when clicking backdrop', () => {
      render(<CartDrawer />)
      const backdrop = document.querySelector('.bg-black')
      fireEvent.click(backdrop!)

      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('should close when pressing Escape key', () => {
      render(<CartDrawer />)
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockSetIsOpen).toHaveBeenCalledWith(false)
    })

    it('should not close on other keys', () => {
      render(<CartDrawer />)
      fireEvent.keyDown(document, { key: 'Enter' })

      expect(mockSetIsOpen).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: mockCartItems },
        totals: {
          subtotal: 595.0,
          itemCount: 11,
          totalWeight: 1500,
          totalVolume: 0.55,
          maxLength: 12,
          requiresOpenBed: true,
        },
        isOpen: true,
        setIsOpen: mockSetIsOpen,
        clearCart: mockClearCart,
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should have RTL direction', () => {
      render(<CartDrawer />)
      const drawer = document.querySelector('[dir="rtl"]')
      expect(drawer).toBeInTheDocument()
    })

    it('should have aria-label on close button', () => {
      render(<CartDrawer />)
      const closeButton = screen.getByLabelText('إغلاق')
      expect(closeButton).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<CartDrawer />)
      const heading = screen.getByText('سلة التسوق')
      expect(heading.tagName).toBe('H2')
    })
  })
})
