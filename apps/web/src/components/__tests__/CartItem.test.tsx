/**
 * Unit tests for CartItem component
 */

import { render, screen, fireEvent } from '@/__tests__/utils/test-utils'
import { CartItem } from '../CartItem'
import { useCart } from '@/hooks/useCart'
import { CartItem as CartItemType } from '@/types/cart'

// Mock useCart hook
jest.mock('@/hooks/useCart')
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>

const mockUpdateQuantity = jest.fn()
const mockRemoveItem = jest.fn()

// Mock cart item data
const mockItem: CartItemType = {
  productId: 'prod-001',
  name_ar: 'أسمنت مقاوم',
  name_en: 'Resistant Cement',
  unit_ar: 'كيس',
  unit_en: 'bag',
  price_per_unit: 4.5,
  quantity: 10,
  min_order_quantity: 10,
  weight_kg_per_unit: 50,
  volume_m3_per_unit: 0.04,
  length_m_per_unit: undefined,
  requires_open_bed: false,
  supplier: {
    id: 'supp-001',
    business_name: 'مورد الأسمنت',
    business_name_en: 'Cement Supplier',
  },
}

const mockItemNoSpecs: CartItemType = {
  ...mockItem,
  weight_kg_per_unit: undefined,
  volume_m3_per_unit: undefined,
}

const mockItemMinQty1: CartItemType = {
  ...mockItem,
  productId: 'prod-002',
  quantity: 1,
  min_order_quantity: 1,
}

describe('CartItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()

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
      setIsOpen: jest.fn(),
      clearCart: jest.fn(),
      addItem: jest.fn(),
      removeItem: mockRemoveItem,
      updateQuantity: mockUpdateQuantity,
    })
  })

  describe('Display', () => {
    it('should render product name in Arabic', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('أسمنت مقاوم')).toBeInTheDocument()
    })

    it('should render product name in English', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('Resistant Cement')).toBeInTheDocument()
    })

    it('should display price per unit', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('4.50 د.أ')).toBeInTheDocument()
    })

    it('should display unit in Arabic', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('/ كيس')).toBeInTheDocument()
    })

    it('should display quantity', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('10')).toBeInTheDocument()
    })

    it('should calculate and display item total', () => {
      render(<CartItem item={mockItem} />)
      // 4.5 * 10 = 45.00
      expect(screen.getByText('45.00 د.أ')).toBeInTheDocument()
    })

    it('should display weight when available', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('50 كجم')).toBeInTheDocument()
    })

    it('should display volume when available', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('0.04 م³')).toBeInTheDocument()
    })

    it('should not display specs when not available', () => {
      render(<CartItem item={mockItemNoSpecs} />)
      expect(screen.queryByText(/كجم/)).not.toBeInTheDocument()
      expect(screen.queryByText(/م³/)).not.toBeInTheDocument()
    })

    it('should display minimum order quantity notice', () => {
      render(<CartItem item={mockItem} />)
      expect(screen.getByText('الحد الأدنى: 10')).toBeInTheDocument()
    })

    it('should not display minimum notice when min is 1', () => {
      render(<CartItem item={mockItemMinQty1} />)
      expect(screen.queryByText(/الحد الأدنى/)).not.toBeInTheDocument()
    })
  })

  describe('Quantity Controls', () => {
    it('should have increase button', () => {
      render(<CartItem item={mockItem} />)
      const increaseButton = screen.getByLabelText('زيادة الكمية')
      expect(increaseButton).toBeInTheDocument()
    })

    it('should have decrease button', () => {
      render(<CartItem item={mockItem} />)
      const decreaseButton = screen.getByLabelText('تقليل الكمية')
      expect(decreaseButton).toBeInTheDocument()
    })

    it('should increase quantity when plus button clicked', () => {
      render(<CartItem item={mockItem} />)
      const increaseButton = screen.getByLabelText('زيادة الكمية')

      fireEvent.click(increaseButton)

      expect(mockUpdateQuantity).toHaveBeenCalledWith('prod-001', 11)
      expect(mockUpdateQuantity).toHaveBeenCalledTimes(1)
    })

    it('should decrease quantity when minus button clicked', () => {
      const itemWithHigherQty = { ...mockItem, quantity: 20 }
      render(<CartItem item={itemWithHigherQty} />)
      const decreaseButton = screen.getByLabelText('تقليل الكمية')

      fireEvent.click(decreaseButton)

      expect(mockUpdateQuantity).toHaveBeenCalledWith('prod-001', 19)
      expect(mockUpdateQuantity).toHaveBeenCalledTimes(1)
    })

    it('should remove item when quantity would go below minimum', () => {
      render(<CartItem item={mockItem} />)
      const decreaseButton = screen.getByLabelText('تقليل الكمية')

      fireEvent.click(decreaseButton)

      expect(mockRemoveItem).toHaveBeenCalledWith('prod-001')
      expect(mockUpdateQuantity).not.toHaveBeenCalled()
    })

    it('should show trash icon when at minimum quantity', () => {
      render(<CartItem item={mockItem} />)
      const decreaseButton = screen.getByLabelText('تقليل الكمية')

      // Check if trash icon (has path with M19 7l-.867...)
      const svg = decreaseButton.querySelector('svg')
      const path = svg?.querySelector('path')

      expect(path).toHaveAttribute('d', expect.stringContaining('M19 7l'))
    })

    it('should show minus icon when above minimum quantity', () => {
      const itemAboveMin = { ...mockItem, quantity: 15 }
      render(<CartItem item={itemAboveMin} />)
      const decreaseButton = screen.getByLabelText('تقليل الكمية')

      const svg = decreaseButton.querySelector('svg')
      const path = svg?.querySelector('path')

      expect(path).toHaveAttribute('d', expect.stringContaining('M20 12H4'))
    })
  })

  describe('Edge Cases', () => {
    it('should handle item with min_order_quantity of 1', () => {
      render(<CartItem item={mockItemMinQty1} />)
      const decreaseButton = screen.getByLabelText('تقليل الكمية')

      fireEvent.click(decreaseButton)

      // Should remove item when quantity is 1 and min is 1
      expect(mockRemoveItem).toHaveBeenCalledWith('prod-002')
    })

    it('should handle large quantities', () => {
      const largeQtyItem = { ...mockItem, quantity: 999 }
      render(<CartItem item={largeQtyItem} />)

      expect(screen.getByText('999')).toBeInTheDocument()
      // 4.5 * 999 = 4495.50
      expect(screen.getByText('4495.50 د.أ')).toBeInTheDocument()
    })

    it('should handle decimal prices correctly', () => {
      const decimalPriceItem = { ...mockItem, price_per_unit: 12.99, quantity: 3 }
      render(<CartItem item={decimalPriceItem} />)

      expect(screen.getByText('12.99 د.أ')).toBeInTheDocument()
      // 12.99 * 3 = 38.97
      expect(screen.getByText('38.97 د.أ')).toBeInTheDocument()
    })

    it('should handle items with no weight or volume', () => {
      const noSpecsItem: CartItemType = {
        ...mockItem,
        weight_kg_per_unit: undefined,
        volume_m3_per_unit: undefined,
      }

      render(<CartItem item={noSpecsItem} />)

      // Should not crash and should still display other info
      expect(screen.getByText('أسمنت مقاوم')).toBeInTheDocument()
      expect(screen.getByText('4.50 د.أ')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible increase button', () => {
      render(<CartItem item={mockItem} />)
      const button = screen.getByLabelText('زيادة الكمية')
      expect(button).toBeInTheDocument()
    })

    it('should have accessible decrease button', () => {
      render(<CartItem item={mockItem} />)
      const button = screen.getByLabelText('تقليل الكمية')
      expect(button).toBeInTheDocument()
    })

    it('should have keyboard accessible buttons', () => {
      render(<CartItem item={mockItem} />)
      const increaseButton = screen.getByLabelText('زيادة الكمية')
      const decreaseButton = screen.getByLabelText('تقليل الكمية')

      increaseButton.focus()
      expect(increaseButton).toHaveFocus()

      decreaseButton.focus()
      expect(decreaseButton).toHaveFocus()
    })
  })

  describe('Visual States', () => {
    it('should have hover state on increase button', () => {
      render(<CartItem item={mockItem} />)
      const button = screen.getByLabelText('زيادة الكمية')
      expect(button).toHaveClass('hover:text-primary-600')
    })

    it('should have hover state on decrease button', () => {
      render(<CartItem item={mockItem} />)
      const button = screen.getByLabelText('تقليل الكمية')
      expect(button).toHaveClass('hover:text-red-600')
    })

    it('should have proper layout structure', () => {
      const { container } = render(<CartItem item={mockItem} />)
      const mainDiv = container.firstChild as HTMLElement

      expect(mainDiv).toHaveClass('flex')
      expect(mainDiv).toHaveClass('items-start')
      expect(mainDiv).toHaveClass('gap-4')
    })
  })
})
