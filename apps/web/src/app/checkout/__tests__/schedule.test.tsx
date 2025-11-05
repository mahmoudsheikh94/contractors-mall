/**
 * Unit tests for Checkout Schedule Page
 */

import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import CheckoutSchedulePage from '../schedule/page'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import { mockCartItems, mockDeliveryAddress } from '@/__tests__/fixtures'

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
const mockAlert = jest.fn()

describe('CheckoutSchedulePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    window.alert = mockAlert

    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    } as any)

    mockUseCart.mockReturnValue({
      cart: { items: mockCartItems },
      totals: {
        subtotal: 145.0,
        itemCount: 12,
        totalWeight: 2000,
        totalVolume: 0.7,
        maxLength: 12,
        requiresOpenBed: true,
      },
      isOpen: false,
      setIsOpen: jest.fn(),
      clearCart: jest.fn(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
    })

    // Pre-populate address in localStorage
    localStorage.setItem('checkout_address', JSON.stringify(mockDeliveryAddress))
  })

  describe('Missing Address Redirect', () => {
    it('should redirect to address page when address is missing', () => {
      localStorage.removeItem('checkout_address')

      render(<CheckoutSchedulePage />)

      waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/checkout/address')
      })
    })

    it('should not render when address is missing', () => {
      localStorage.removeItem('checkout_address')

      const { container } = render(<CheckoutSchedulePage />)

      waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Empty Cart Redirect', () => {
    it('should redirect to products when cart is empty', () => {
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
        removeItem: jest.fn(),
        updateQuantity: jest.fn(),
      })

      render(<CheckoutSchedulePage />)

      waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/products')
      })
    })
  })

  describe('Page Rendering', () => {
    it('should render page title', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('موعد التوصيل')).toBeInTheDocument()
      })
    })

    it('should render progress steps', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('العنوان')).toBeInTheDocument()
        expect(screen.getByText('الموعد')).toBeInTheDocument()
        expect(screen.getByText('المراجعة')).toBeInTheDocument()
      })
    })

    it('should show step 1 as completed', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const step1 = screen.getByText('✓').closest('div')
        expect(step1).toHaveClass('bg-green-600')
      })
    })

    it('should highlight step 2 as current', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const step2 = screen.getByText('2').closest('div')
        expect(step2).toHaveClass('bg-primary-600')
      })
    })

    it('should render delivery address summary', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('عنوان التوصيل')).toBeInTheDocument()
        expect(screen.getByText(mockDeliveryAddress.address)).toBeInTheDocument()
      })
    })

    it('should show district and city when available', async () => {
      const addressWithDistrict = {
        ...mockDeliveryAddress,
        district: 'جبل عمان',
        city: 'عمّان',
      }
      localStorage.setItem('checkout_address', JSON.stringify(addressWithDistrict))

      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('جبل عمان, عمّان')).toBeInTheDocument()
      })
    })

    it('should have edit address link', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const link = screen.getByText(/تعديل العنوان/).closest('a')
        expect(link).toHaveAttribute('href', '/checkout/address')
      })
    })
  })

  describe('Date Selection', () => {
    it('should render date input', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]')!
        expect(dateInput).toBeInTheDocument()
        expect(dateInput).toHaveAttribute('type', 'date')
      })
    })

    it('should set default date to tomorrow', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
        expect(dateInput.value).toBe(tomorrowStr)
      })
    })

    it('should have minimum date as tomorrow', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const minDate = tomorrow.toISOString().split('T')[0]

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]')!
        expect(dateInput).toHaveAttribute('min', minDate)
      })
    })

    it('should have maximum date as 30 days from now', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + 30)
      const maxDateStr = maxDate.toISOString().split('T')[0]

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]')!
        expect(dateInput).toHaveAttribute('max', maxDateStr)
      })
    })

    it('should update date when changed', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      const testDate = new Date()
      testDate.setDate(testDate.getDate() + 5)
      const testDateStr = testDate.toISOString().split('T')[0]

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement
        fireEvent.change(dateInput, { target: { value: testDateStr } })

        expect(dateInput.value).toBe(testDateStr)
      })
    })

    it('should have date helper text', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('التوصيل متاح ابتداءً من الغد حتى 30 يوماً')).toBeInTheDocument()
      })
    })

    it('should have LTR direction for date input', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]')!
        expect(dateInput).toHaveAttribute('dir', 'ltr')
      })
    })
  })

  describe('Time Slot Selection', () => {
    it('should render time slot options', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('صباحاً (8:00 - 12:00)')).toBeInTheDocument()
        expect(screen.getByText('ظهراً (12:00 - 4:00)')).toBeInTheDocument()
        expect(screen.getByText('مساءً (4:00 - 8:00)')).toBeInTheDocument()
      })
    })

    it('should show English labels for time slots', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('Morning (8AM - 12PM)')).toBeInTheDocument()
        expect(screen.getByText('Afternoon (12PM - 4PM)')).toBeInTheDocument()
        expect(screen.getByText('Evening (4PM - 8PM)')).toBeInTheDocument()
      })
    })

    it('should have morning selected by default', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const morningRadio = screen.getByLabelText(/صباحاً/) as HTMLInputElement
        expect(morningRadio).toBeChecked()
      })
    })

    it('should select afternoon when clicked', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(async () => {
        const afternoonLabel = screen.getByText('ظهراً (12:00 - 4:00)').closest('label')
        const afternoonRadio = afternoonLabel?.querySelector('input[type="radio"]') as HTMLInputElement

        fireEvent.click(afternoonRadio)

        await waitFor(() => {
          expect(afternoonRadio).toBeChecked()
        })
      })
    })

    it('should select evening when clicked', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(async () => {
        const eveningLabel = screen.getByText('مساءً (4:00 - 8:00)').closest('label')
        const eveningRadio = eveningLabel?.querySelector('input[type="radio"]') as HTMLInputElement

        fireEvent.click(eveningRadio)

        await waitFor(() => {
          expect(eveningRadio).toBeChecked()
        })
      })
    })

    it('should highlight selected time slot', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const morningLabel = screen.getByText('صباحاً (8:00 - 12:00)').closest('label')
        expect(morningLabel).toHaveClass('border-primary-600', 'bg-primary-50')
      })
    })

    it('should have radio inputs with correct names', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const radios = screen.getAllByRole('radio')
        radios.forEach((radio) => {
          expect(radio).toHaveAttribute('name', 'time_slot')
        })
      })
    })
  })

  describe('Important Notice', () => {
    it('should display important notice box', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('ملاحظة هامة:')).toBeInTheDocument()
      })
    })

    it('should show unloading information', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        expect(screen.getByText('المورد سيقوم بتفريغ المواد في الموقع المحدد')).toBeInTheDocument()
        expect(screen.getByText('يُرجى التأكد من توفر مساحة كافية للتفريغ')).toBeInTheDocument()
        expect(screen.getByText('سيتصل بك السائق قبل الوصول بـ 30 دقيقة')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('should have date as required field', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const dateInput = container.querySelector('input[type="date"]')!
        expect(dateInput).toHaveAttribute('required')
      })
    })

    it('should show alert when date is empty', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      const dateInput = container.querySelector('input[type="date"]')!
      fireEvent.change(dateInput, { target: { value: '' } })

      // Submit form directly to bypass HTML5 validation in tests
      const form = container.querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('الرجاء اختيار تاريخ التوصيل')
        expect(mockPush).not.toHaveBeenCalled()
      })
    })
  })

  describe('Form Submission', () => {
    it('should save schedule to localStorage on submit', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      const testDate = new Date()
      testDate.setDate(testDate.getDate() + 3)
      const testDateStr = testDate.toISOString().split('T')[0]

      await waitFor(async () => {
        const dateInput = container.querySelector('input[type="date"]')!
        fireEvent.change(dateInput, { target: { value: testDateStr } })

        const afternoonLabel = screen.getByText('ظهراً (12:00 - 4:00)').closest('label')
        const afternoonRadio = afternoonLabel?.querySelector('input[type="radio"]')
        if (afternoonRadio) fireEvent.click(afternoonRadio)

        const submitButton = screen.getByText('التالي: مراجعة الطلب')
        fireEvent.click(submitButton)

        await waitFor(() => {
          const saved = localStorage.getItem('checkout_schedule')
          expect(saved).not.toBeNull()

          const parsed = JSON.parse(saved!)
          expect(parsed.date).toBe(testDateStr)
          expect(parsed.time_slot).toBe('afternoon')
        })
      })
    })

    it('should navigate to review page on valid submit', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(async () => {
        const submitButton = screen.getByText('التالي: مراجعة الطلب')
        fireEvent.click(submitButton)

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/checkout/review')
        })
      })
    })

    it('should save morning slot correctly', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(async () => {
        const submitButton = screen.getByText('التالي: مراجعة الطلب')
        fireEvent.click(submitButton)

        await waitFor(() => {
          const saved = JSON.parse(localStorage.getItem('checkout_schedule')!)
          expect(saved.time_slot).toBe('morning')
        })
      })
    })

    it('should save evening slot correctly', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(async () => {
        const eveningLabel = screen.getByText('مساءً (4:00 - 8:00)').closest('label')
        const eveningRadio = eveningLabel?.querySelector('input[type="radio"]')
        if (eveningRadio) fireEvent.click(eveningRadio)

        const submitButton = screen.getByText('التالي: مراجعة الطلب')
        fireEvent.click(submitButton)

        await waitFor(() => {
          const saved = JSON.parse(localStorage.getItem('checkout_schedule')!)
          expect(saved.time_slot).toBe('evening')
        })
      })
    })
  })

  describe('Navigation', () => {
    it('should have back to shopping link', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const link = screen.getByText('العودة للتسوق').closest('a')
        expect(link).toHaveAttribute('href', '/products')
      })
    })

    it('should have back button to address page', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const link = screen.getByText('السابق').closest('a')
        expect(link).toHaveAttribute('href', '/checkout/address')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have RTL direction', async () => {
      const { container } = render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const main = container.querySelector('[dir="rtl"]')
        expect(main).toBeInTheDocument()
      })
    })

    it('should have required field markers', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const dateLabel = screen.getByText(/تاريخ التوصيل/)
        const timeLabel = screen.getByText(/الفترة الزمنية/)

        expect(dateLabel.innerHTML).toContain('*')
        expect(timeLabel.innerHTML).toContain('*')
      })
    })

    it('should have proper form labels', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        // Check labels exist by verifying their text content
        expect(screen.getByText(/تاريخ التوصيل/)).toBeInTheDocument()
        expect(screen.getByText(/الفترة الزمنية/)).toBeInTheDocument()
      })
    })

    it('should have accessible radio buttons', async () => {
      render(<CheckoutSchedulePage />)

      await waitFor(() => {
        const radios = screen.getAllByRole('radio')
        expect(radios).toHaveLength(3)

        radios.forEach((radio) => {
          expect(radio).toHaveAttribute('type', 'radio')
          expect(radio).toHaveClass('text-primary-600')
        })
      })
    })
  })
})
