/**
 * MSW server setup for Node environment (Jest tests)
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// Create server with handlers
export const server = setupServer(...handlers)

// Start server before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers()
})

// Close server after all tests
afterAll(() => {
  server.close()
})
