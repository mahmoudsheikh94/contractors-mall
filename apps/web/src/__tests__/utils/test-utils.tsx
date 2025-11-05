/**
 * Test utilities and custom render functions
 */

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { CartProvider } from '@/contexts/CartContext'

// Custom render function that includes providers
interface AllTheProvidersProps {
  children: React.ReactNode
}

function AllTheProviders({ children }: AllTheProvidersProps) {
  return <CartProvider>{children}</CartProvider>
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllTheProviders, ...options })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Helper to wait for loading states to complete
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Helper to mock localStorage
export const mockLocalStorage = () => {
  const store: Record<string, string> = {}

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key]
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key])
    }),
    get store() {
      return { ...store }
    },
  }
}

// Helper to mock geolocation
export const mockGeolocation = (latitude = 31.9700, longitude = 35.9300) => {
  const getCurrentPositionMock = jest.fn((success) =>
    success({
      coords: {
        latitude,
        longitude,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    })
  )

  Object.defineProperty(global.navigator, 'geolocation', {
    value: {
      getCurrentPosition: getCurrentPositionMock,
      watchPosition: jest.fn(),
      clearWatch: jest.fn(),
    },
    writable: true,
  })

  return getCurrentPositionMock
}

// Helper to create mock router push
export const mockRouterPush = jest.fn()

// Helper to reset all mocks
export const resetAllMocks = () => {
  jest.clearAllMocks()
  localStorage.clear()
  mockRouterPush.mockClear()
}
