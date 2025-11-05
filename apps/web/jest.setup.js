// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Setup MSW server for API mocking
// Note: Commented out for unit tests. Import explicitly in integration tests that need it.
// import './src/__tests__/mocks/server'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock geolocation
const geolocationMock = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}
global.navigator.geolocation = geolocationMock

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
