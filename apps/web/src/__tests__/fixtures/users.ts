/**
 * Mock user data for testing
 */

export const mockUser = {
  id: 'user-123',
  email: 'contractor@example.com',
  user_metadata: {
    name: 'أحمد محمد',
    phone: '0795551234',
  },
  app_metadata: {
    role: 'contractor',
  },
}

export const mockSupplierUser = {
  id: 'user-456',
  email: 'supplier@example.com',
  user_metadata: {
    name: 'مورد الأسمنت',
    phone: '0795555678',
  },
  app_metadata: {
    role: 'supplier_admin',
  },
}

export const mockAdminUser = {
  id: 'user-789',
  email: 'admin@contractorsmall.com',
  user_metadata: {
    name: 'Admin User',
    phone: '0795559999',
  },
  app_metadata: {
    role: 'admin',
  },
}

export const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600 * 1000,
  token_type: 'bearer',
  user: mockUser,
}
