/**
 * Supplier Order Management Tests
 *
 * Tests for supplier order viewing, management, and status updates
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';
import OrdersPage from '../orders/page';
import '@testing-library/jest-dom';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
};
(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('Supplier Orders Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated supplier
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'supplier-123',
          email: 'supplier@test.com',
        },
      },
    });
  });

  it('should display list of supplier orders', async () => {
    // Mock orders data
    const mockOrders = [
      {
        id: 'order-1',
        order_number: 'ORD-001',
        status: 'pending',
        total_jod: 150.00,
        contractor: {
          full_name: 'John Contractor',
        },
        created_at: '2025-01-01T10:00:00Z',
      },
      {
        id: 'order-2',
        order_number: 'ORD-002',
        status: 'paid',
        total_jod: 250.00,
        contractor: {
          full_name: 'Jane Builder',
        },
        created_at: '2025-01-02T10:00:00Z',
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockOrders,
            error: null,
          }),
        }),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
    });

    // Should show order details
    expect(screen.getByText('John Contractor')).toBeInTheDocument();
    expect(screen.getByText('150.00 JOD')).toBeInTheDocument();
    expect(screen.getByText('Jane Builder')).toBeInTheDocument();
    expect(screen.getByText('250.00 JOD')).toBeInTheDocument();
  });

  it('should filter orders by status', async () => {
    const allOrders = [
      { id: '1', status: 'pending', order_number: 'ORD-001' },
      { id: '2', status: 'paid', order_number: 'ORD-002' },
      { id: '3', status: 'in_delivery', order_number: 'ORD-003' },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: allOrders,
            error: null,
          }),
        }),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Click pending filter
    const pendingFilter = screen.getByRole('button', { name: /معلق|Pending/i });
    fireEvent.click(pendingFilter);

    // Should only show pending orders
    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });
  });

  it('should display order details when clicked', async () => {
    const mockOrder = {
      id: 'order-1',
      order_number: 'ORD-001',
      status: 'paid',
      total_jod: 150.00,
      subtotal_jod: 145.00,
      delivery_fee_jod: 5.00,
      delivery_address: 'Test Address, Amman',
      delivery_zone: 'zone_a',
      contractor: {
        full_name: 'John Contractor',
        email: 'john@test.com',
      },
      order_items: [
        {
          id: 'item-1',
          product_name: 'Cement',
          quantity: 10,
          unit_price_jod: 14.50,
          total_price_jod: 145.00,
        },
      ],
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [mockOrder],
            error: null,
          }),
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
        }),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Click on order
    fireEvent.click(screen.getByText('ORD-001'));

    // Should show order details
    await waitFor(() => {
      expect(screen.getByText('Test Address, Amman')).toBeInTheDocument();
      expect(screen.getByText('Cement')).toBeInTheDocument();
      expect(screen.getByText(/10.*units/i)).toBeInTheDocument();
    });
  });

  it('should show delivery confirmation section for paid orders', async () => {
    const mockOrder = {
      id: 'order-1',
      order_number: 'ORD-001',
      status: 'paid',
      total_jod: 80.00, // <120 JOD = photo proof
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
          order: jest.fn().mockResolvedValue({
            data: [mockOrder],
            error: null,
          }),
        }),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Should show delivery confirmation section
    await waitFor(() => {
      expect(screen.getByText(/تأكيد التوصيل|Delivery Confirmation/i)).toBeInTheDocument();
      // For <120 JOD, should show photo upload
      expect(screen.getByText(/صورة إثبات|Photo proof/i)).toBeInTheDocument();
    });
  });

  it('should handle delivery confirmation with photo (<120 JOD)', async () => {
    const mockOrder = {
      id: 'order-1',
      order_number: 'ORD-001',
      status: 'paid',
      total_jod: 80.00,
    };

    const mockUpdate = jest.fn().mockResolvedValue({
      data: { ...mockOrder, status: 'delivered' },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
          order: jest.fn().mockResolvedValue({
            data: [mockOrder],
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockUpdate()),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Upload photo
    const fileInput = screen.getByLabelText(/upload.*photo/i);
    const file = new File(['test'], 'delivery-proof.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Submit confirmation
    const confirmButton = screen.getByRole('button', { name: /confirm.*delivery/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      expect(screen.getByText(/delivery confirmed/i)).toBeInTheDocument();
    });
  });

  it('should handle delivery confirmation with PIN (≥120 JOD)', async () => {
    const mockOrder = {
      id: 'order-1',
      order_number: 'ORD-001',
      status: 'paid',
      total_jod: 150.00, // ≥120 JOD = PIN required
      delivery_pin: '1234',
    };

    const mockUpdate = jest.fn().mockResolvedValue({
      data: { ...mockOrder, status: 'delivered' },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
          order: jest.fn().mockResolvedValue({
            data: [mockOrder],
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(mockUpdate()),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Should show PIN input
    await waitFor(() => {
      expect(screen.getByLabelText(/PIN|رقم التسليم/i)).toBeInTheDocument();
    });

    // Enter PIN
    const pinInput = screen.getByLabelText(/PIN|رقم التسليم/i);
    fireEvent.change(pinInput, { target: { value: '1234' } });

    // Submit
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  it('should reject incorrect PIN', async () => {
    const mockOrder = {
      id: 'order-1',
      order_number: 'ORD-001',
      status: 'paid',
      total_jod: 150.00,
      delivery_pin: '1234',
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockOrder,
            error: null,
          }),
          order: jest.fn().mockResolvedValue({
            data: [mockOrder],
            error: null,
          }),
        }),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Enter wrong PIN
    const pinInput = await screen.findByLabelText(/PIN|رقم التسليم/i);
    fireEvent.change(pinInput, { target: { value: '0000' } });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/incorrect.*PIN|رقم.*خاطئ/i)).toBeInTheDocument();
    });
  });

  it('should show empty state when no orders', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText(/no orders|لا توجد طلبات/i)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      }),
    });

    render(<OrdersPage searchParams={{}} />);

    await waitFor(() => {
      expect(screen.getByText(/error|خطأ/i)).toBeInTheDocument();
    });
  });
});
