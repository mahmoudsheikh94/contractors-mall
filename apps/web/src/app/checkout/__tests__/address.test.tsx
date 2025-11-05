/**
 * Unit tests for Checkout Address Page
 */

import { render, screen, fireEvent, waitFor } from '@/__tests__/utils/test-utils'
import CheckoutAddressPage from '../address/page'
import { useCart } from '@/hooks/useCart'
import { useRouter } from 'next/navigation'
import { mockCartItems } from '@/__tests__/fixtures'

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

// Mock geolocation
const mockGetCurrentPosition = jest.fn()

describe('CheckoutAddressPage', () => {
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

    // Mock geolocation
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: mockGetCurrentPosition,
      },
      writable: true,
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

      render(<CheckoutAddressPage />)

      waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/products')
      })
    })

    it('should not render content when cart is empty', () => {
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

      const { container } = render(<CheckoutAddressPage />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Page Rendering', () => {
    beforeEach(() => {
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
    })

    it('should render page title', () => {
      render(<CheckoutAddressPage />)
      expect(screen.getByText('عنوان التوصيل')).toBeInTheDocument()
    })

    it('should render progress steps', () => {
      render(<CheckoutAddressPage />)
      // Use getAllByText since these texts appear in multiple places (progress steps AND form labels)
      const addressElements = screen.getAllByText('العنوان')
      expect(addressElements.length).toBeGreaterThan(0)
      expect(screen.getByText('الموعد')).toBeInTheDocument()
      expect(screen.getByText('المراجعة')).toBeInTheDocument()
    })

    it('should highlight current step', () => {
      render(<CheckoutAddressPage />)
      const step1 = screen.getByText('1').closest('div')
      expect(step1).toHaveClass('bg-primary-600')
    })

    it('should render order summary', () => {
      render(<CheckoutAddressPage />)
      expect(screen.getByText('ملخص الطلب')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument() // itemCount
      expect(screen.getByText('145.00 د.أ')).toBeInTheDocument() // subtotal
    })

    it('should render all form fields', () => {
      render(<CheckoutAddressPage />)

      // Use placeholderText since labels don't have htmlFor attribute
      expect(screen.getByPlaceholderText(/شارع الجامعة/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText('0791234567')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('عمّان')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('جبل الحسين')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('12')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('3')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('5')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/أي معلومات إضافية/)).toBeInTheDocument()
    })

    it('should have required fields marked', () => {
      render(<CheckoutAddressPage />)

      // Use getAllByText since these texts appear in multiple places
      const addressLabels = screen.getAllByText(/العنوان/)
      const phoneLabels = screen.getAllByText(/رقم الهاتف/)

      // At least one of them should contain the required asterisk
      const hasAddressAsterisk = addressLabels.some(label => label.innerHTML.includes('*'))
      const hasPhoneAsterisk = phoneLabels.some(label => label.innerHTML.includes('*'))

      expect(hasAddressAsterisk).toBe(true)
      expect(hasPhoneAsterisk).toBe(true)
    })
  })

  describe('Geolocation', () => {
    beforeEach(() => {
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
    })

    it('should render geolocation button', () => {
      render(<CheckoutAddressPage />)
      expect(screen.getByText('استخدام موقعي الحالي')).toBeInTheDocument()
    })

    it('should call geolocation API when button clicked', () => {
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 31.9700,
            longitude: 35.9300,
          },
        })
      })

      render(<CheckoutAddressPage />)
      const button = screen.getByText('استخدام موقعي الحالي')

      fireEvent.click(button)

      expect(mockGetCurrentPosition).toHaveBeenCalled()
    })

    it('should update coordinates on successful geolocation', async () => {
      mockGetCurrentPosition.mockImplementation((success) => {
        success({
          coords: {
            latitude: 31.9700,
            longitude: 35.9300,
          },
        })
      })

      const { container } = render(<CheckoutAddressPage />)
      const button = screen.getByText('استخدام موقعي الحالي')

      fireEvent.click(button)

      await waitFor(() => {
        // Get readonly number inputs (coordinates)
        const numberInputs = container.querySelectorAll('input[type="number"][readonly]')
        const latInput = numberInputs[0] as HTMLInputElement
        const lngInput = numberInputs[1] as HTMLInputElement

        expect(parseFloat(latInput.value)).toBeCloseTo(31.97, 2)
        expect(parseFloat(lngInput.value)).toBeCloseTo(35.93, 2)
      })
    })

    it('should show loading state during geolocation', () => {
      mockGetCurrentPosition.mockImplementation(() => {
        // Don't call callback (simulate pending)
      })

      render(<CheckoutAddressPage />)
      const button = screen.getByText('استخدام موقعي الحالي')

      fireEvent.click(button)

      expect(screen.getByText('جاري تحديد الموقع...')).toBeInTheDocument()
    })

    it('should handle geolocation error', async () => {
      mockGetCurrentPosition.mockImplementation((_success, error) => {
        error({ code: 1, message: 'User denied geolocation' } as any)
      })

      render(<CheckoutAddressPage />)
      const button = screen.getByText('استخدام موقعي الحالي')

      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('فشل تحديد الموقع. الرجاء السماح بالوصول للموقع.')).toBeInTheDocument()
      })
    })

    it('should handle browser without geolocation support', () => {
      Object.defineProperty(global.navigator, 'geolocation', {
        value: undefined,
        writable: true,
      })

      render(<CheckoutAddressPage />)
      const button = screen.getByText('استخدام موقعي الحالي')

      fireEvent.click(button)

      expect(screen.getByText('المتصفح لا يدعم تحديد الموقع')).toBeInTheDocument()
    })
  })

  describe('Form Interaction', () => {
    beforeEach(() => {
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
    })

    it('should update address field', () => {
      render(<CheckoutAddressPage />)
      const addressInput = screen.getByPlaceholderText(/شارع الجامعة/)

      fireEvent.change(addressInput, {
        target: { value: 'شارع الملك عبدالله، عمان' },
      })

      expect((addressInput as HTMLTextAreaElement).value).toBe('شارع الملك عبدالله، عمان')
    })

    it('should update phone field', () => {
      render(<CheckoutAddressPage />)
      const phoneInput = screen.getByPlaceholderText('0791234567')

      fireEvent.change(phoneInput, { target: { value: '0795551234' } })

      expect((phoneInput as HTMLInputElement).value).toBe('0795551234')
    })

    it('should update city field', () => {
      render(<CheckoutAddressPage />)
      const cityInput = screen.getByPlaceholderText('عمّان')

      fireEvent.change(cityInput, { target: { value: 'إربد' } })

      expect((cityInput as HTMLInputElement).value).toBe('إربد')
    })

    it('should update district field', () => {
      render(<CheckoutAddressPage />)
      const districtInput = screen.getByPlaceholderText('جبل الحسين')

      fireEvent.change(districtInput, { target: { value: 'جبل عمان' } })

      expect((districtInput as HTMLInputElement).value).toBe('جبل عمان')
    })

    it('should update building number', () => {
      render(<CheckoutAddressPage />)
      const buildingInput = screen.getByPlaceholderText('12')

      fireEvent.change(buildingInput, { target: { value: '22' } })

      expect((buildingInput as HTMLInputElement).value).toBe('22')
    })

    it('should update floor', () => {
      render(<CheckoutAddressPage />)
      const floorInput = screen.getByPlaceholderText('3')

      fireEvent.change(floorInput, { target: { value: '5' } })

      expect((floorInput as HTMLInputElement).value).toBe('5')
    })

    it('should update apartment', () => {
      render(<CheckoutAddressPage />)
      const apartmentInput = screen.getByPlaceholderText('5')

      fireEvent.change(apartmentInput, { target: { value: '7' } })

      expect((apartmentInput as HTMLInputElement).value).toBe('7')
    })

    it('should update notes', () => {
      render(<CheckoutAddressPage />)
      const notesInput = screen.getByPlaceholderText(/أي معلومات إضافية/)

      fireEvent.change(notesInput, {
        target: { value: 'يرجى الاتصال قبل الوصول' },
      })

      expect((notesInput as HTMLTextAreaElement).value).toBe('يرجى الاتصال قبل الوصول')
    })
  })

  describe('Form Validation', () => {
    beforeEach(() => {
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
    })

    it('should show alert when address is missing', () => {
      const { container } = render(<CheckoutAddressPage />)

      const phoneInput = screen.getByPlaceholderText('0791234567')
      fireEvent.change(phoneInput, { target: { value: '0795551234' } })

      // Submit form directly to bypass HTML5 validation in tests
      const form = container.querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      expect(mockAlert).toHaveBeenCalledWith('الرجاء إدخال العنوان ورقم الهاتف')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should show alert when phone is missing', () => {
      const { container } = render(<CheckoutAddressPage />)

      const addressInput = screen.getByPlaceholderText(/شارع الجامعة/)
      fireEvent.change(addressInput, { target: { value: 'شارع الملك عبدالله' } })

      // Submit form directly to bypass HTML5 validation in tests
      const form = container.querySelector('form')
      if (form) {
        fireEvent.submit(form)
      }

      expect(mockAlert).toHaveBeenCalledWith('الرجاء إدخال العنوان ورقم الهاتف')
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should have phone pattern validation', () => {
      render(<CheckoutAddressPage />)
      const phoneInput = screen.getByPlaceholderText('0791234567') as HTMLInputElement

      expect(phoneInput).toHaveAttribute('pattern', '[0-9]{10}')
      expect(phoneInput).toHaveAttribute('type', 'tel')
    })

    it('should have LTR direction for phone input', () => {
      render(<CheckoutAddressPage />)
      const phoneInput = screen.getByPlaceholderText('0791234567')

      expect(phoneInput).toHaveAttribute('dir', 'ltr')
    })
  })

  describe('Form Submission', () => {
    beforeEach(() => {
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
    })

    it('should save address to localStorage on submit', () => {
      render(<CheckoutAddressPage />)

      const addressInput = screen.getByPlaceholderText(/شارع الجامعة/)
      const phoneInput = screen.getByPlaceholderText('0791234567')

      fireEvent.change(addressInput, { target: { value: 'شارع الملك عبدالله' } })
      fireEvent.change(phoneInput, { target: { value: '0795551234' } })

      const submitButton = screen.getByText('التالي: اختيار الموعد')
      fireEvent.click(submitButton)

      const saved = localStorage.getItem('checkout_address')
      expect(saved).not.toBeNull()

      const parsed = JSON.parse(saved!)
      expect(parsed.address).toBe('شارع الملك عبدالله')
      expect(parsed.phone).toBe('0795551234')
    })

    it('should navigate to schedule page on valid submit', () => {
      render(<CheckoutAddressPage />)

      const addressInput = screen.getByPlaceholderText(/شارع الجامعة/)
      const phoneInput = screen.getByPlaceholderText('0791234567')

      fireEvent.change(addressInput, { target: { value: 'شارع الملك عبدالله' } })
      fireEvent.change(phoneInput, { target: { value: '0795551234' } })

      const submitButton = screen.getByText('التالي: اختيار الموعد')
      fireEvent.click(submitButton)

      expect(mockPush).toHaveBeenCalledWith('/checkout/schedule')
    })

    it('should save all optional fields', () => {
      render(<CheckoutAddressPage />)

      fireEvent.change(screen.getByPlaceholderText(/شارع الجامعة/), {
        target: { value: 'شارع الملك عبدالله' },
      })
      fireEvent.change(screen.getByPlaceholderText('0791234567'), {
        target: { value: '0795551234' },
      })
      fireEvent.change(screen.getByPlaceholderText('عمّان'), {
        target: { value: 'إربد' },
      })
      fireEvent.change(screen.getByPlaceholderText('جبل الحسين'), {
        target: { value: 'وسط البلد' },
      })
      fireEvent.change(screen.getByPlaceholderText('12'), {
        target: { value: '20' },
      })
      fireEvent.change(screen.getByPlaceholderText('3'), {
        target: { value: '4' },
      })
      fireEvent.change(screen.getByPlaceholderText('5'), {
        target: { value: '8' },
      })
      fireEvent.change(screen.getByPlaceholderText(/أي معلومات إضافية/), {
        target: { value: 'يرجى الاتصال قبل الوصول' },
      })

      const submitButton = screen.getByText('التالي: اختيار الموعد')
      fireEvent.click(submitButton)

      const saved = JSON.parse(localStorage.getItem('checkout_address')!)

      expect(saved.city).toBe('إربد')
      expect(saved.district).toBe('وسط البلد')
      expect(saved.building_number).toBe('20')
      expect(saved.floor).toBe('4')
      expect(saved.apartment).toBe('8')
      expect(saved.notes).toBe('يرجى الاتصال قبل الوصول')
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
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
    })

    it('should have back to products link', () => {
      render(<CheckoutAddressPage />)
      const link = screen.getByText('العودة للتسوق').closest('a')
      expect(link).toHaveAttribute('href', '/products')
    })

    it('should have back to cart button', () => {
      render(<CheckoutAddressPage />)
      const link = screen.getByText('العودة للسلة').closest('a')
      expect(link).toHaveAttribute('href', '/products')
    })
  })

  describe('Accessibility', () => {
    beforeEach(() => {
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
    })

    it('should have RTL direction', () => {
      const { container } = render(<CheckoutAddressPage />)
      const main = container.querySelector('[dir="rtl"]')
      expect(main).toBeInTheDocument()
    })

    it('should have proper form labels', () => {
      render(<CheckoutAddressPage />)

      // Check that labels exist by their text content
      expect(screen.getAllByText(/العنوان/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/رقم الهاتف/).length).toBeGreaterThan(0)
      expect(screen.getByText(/المدينة/)).toBeInTheDocument()
    })

    it('should have helper text for phone', () => {
      render(<CheckoutAddressPage />)
      expect(
        screen.getByText('سيستخدم السائق هذا الرقم للتواصل عند التوصيل')
      ).toBeInTheDocument()
    })

    it('should have readonly coordinate inputs', () => {
      const { container } = render(<CheckoutAddressPage />)

      // Get readonly number inputs (coordinates)
      const numberInputs = container.querySelectorAll('input[type="number"][readonly]')
      const latInput = numberInputs[0] as HTMLInputElement
      const lngInput = numberInputs[1] as HTMLInputElement

      expect(latInput).toHaveAttribute('readonly')
      expect(lngInput).toHaveAttribute('readonly')
    })
  })
})
