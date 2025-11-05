/**
 * Unit tests for CartButton component
 */

import { render, screen, fireEvent } from '@/__tests__/utils/test-utils'
import { CartButton } from '../CartButton'
import { useCart } from '@/hooks/useCart'

// Mock useCart hook
jest.mock('@/hooks/useCart')
const mockUseCart = useCart as jest.MockedFunction<typeof useCart>

describe('CartButton', () => {
  const mockSetIsOpen = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Empty Cart', () => {
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
        isOpen: false,
        setIsOpen: mockSetIsOpen,
        clearCart: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should render cart icon', () => {
      render(<CartButton />)
      const button = screen.getByLabelText('سلة التسوق')
      expect(button).toBeInTheDocument()
    })

    it('should not display badge when cart is empty', () => {
      render(<CartButton />)
      const badge = screen.queryByText('0')
      expect(badge).not.toBeInTheDocument()
    })

    it('should open cart drawer when clicked', () => {
      render(<CartButton />)
      const button = screen.getByLabelText('سلة التسوق')
      fireEvent.click(button)

      expect(mockSetIsOpen).toHaveBeenCalledWith(true)
    })
  })

  describe('Cart with Items', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: [{} as any, {} as any, {} as any] },
        totals: {
          subtotal: 150.0,
          itemCount: 5,
          totalWeight: 250,
          totalVolume: 0.5,
          maxLength: 0,
          requiresOpenBed: false,
        },
        isOpen: false,
        setIsOpen: mockSetIsOpen,
        clearCart: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should display badge with item count', () => {
      render(<CartButton />)
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should have correct badge styling', () => {
      render(<CartButton />)
      const badge = screen.getByText('5')

      expect(badge).toHaveClass('bg-primary-600')
      expect(badge).toHaveClass('text-white')
      expect(badge).toHaveClass('rounded-full')
    })

    it('should open cart drawer when clicked', () => {
      render(<CartButton />)
      const button = screen.getByLabelText('سلة التسوق')
      fireEvent.click(button)

      expect(mockSetIsOpen).toHaveBeenCalledWith(true)
      expect(mockSetIsOpen).toHaveBeenCalledTimes(1)
    })
  })

  describe('Large Item Count', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: [] },
        totals: {
          subtotal: 1000.0,
          itemCount: 99,
          totalWeight: 5000,
          totalVolume: 10,
          maxLength: 12,
          requiresOpenBed: true,
        },
        isOpen: false,
        setIsOpen: mockSetIsOpen,
        clearCart: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should display double-digit item count', () => {
      render(<CartButton />)
      expect(screen.getByText('99')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseCart.mockReturnValue({
        cart: { items: [] },
        totals: {
          subtotal: 0,
          itemCount: 3,
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        isOpen: false,
        setIsOpen: mockSetIsOpen,
        clearCart: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })
    })

    it('should have aria-label', () => {
      render(<CartButton />)
      const button = screen.getByLabelText('سلة التسوق')
      expect(button).toBeInTheDocument()
    })

    it('should be keyboard accessible', () => {
      render(<CartButton />)
      const button = screen.getByLabelText('سلة التسوق')

      button.focus()
      expect(button).toHaveFocus()
    })

    it('should show hover state', () => {
      render(<CartButton />)
      const button = screen.getByLabelText('سلة التسوق')

      expect(button).toHaveClass('hover:text-primary-600')
    })
  })

  describe('Visual States', () => {
    it('should show cart icon SVG', () => {
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
        clearCart: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })

      render(<CartButton />)
      const svg = document.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('should position badge correctly', () => {
      mockUseCart.mockReturnValue({
        cart: { items: [] },
        totals: {
          subtotal: 0,
          itemCount: 1,
          totalWeight: 0,
          totalVolume: 0,
          maxLength: 0,
          requiresOpenBed: false,
        },
        isOpen: false,
        setIsOpen: mockSetIsOpen,
        clearCart: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })

      render(<CartButton />)
      const badge = screen.getByText('1')

      expect(badge).toHaveClass('absolute')
      expect(badge).toHaveClass('-top-1')
      expect(badge).toHaveClass('-right-1')
    })
  })
})
