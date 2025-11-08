/**
 * Admin Payment Management Tests
 *
 * Tests for payment oversight, escrow management, and manual interventions
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';
import PaymentsPage from '../payments/page';
import '@testing-library/jest-dom';

// Mock Supabase
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
  rpc: jest.fn(),
};
(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('Admin Payment Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock authenticated admin
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'admin-123',
          email: 'admin@test.com',
          user_metadata: {
            role: 'admin',
          },
        },
      },
    });
  });

  it('should display list of payments with escrow status', async () => {
    const mockPayments = [
      {
        id: 'payment-1',
        order_number: 'ORD-001',
        amount_jod: 150.00,
        status: 'escrow_held',
        created_at: '2025-01-01T10:00:00Z',
        contractor_name: 'John Contractor',
        supplier_name: 'ABC Supplies',
      },
      {
        id: 'payment-2',
        order_number: 'ORD-002',
        amount_jod: 250.00,
        status: 'released',
        created_at: '2025-01-02T10:00:00Z',
        contractor_name: 'Jane Builder',
        supplier_name: 'XYZ Materials',
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockPayments,
          error: null,
        }),
      }),
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
    });

    // Should show payment statuses
    expect(screen.getByText(/Held|محجوز/i)).toBeInTheDocument();
    expect(screen.getByText(/Released|تم الإفراج/i)).toBeInTheDocument();

    // Should show amounts
    expect(screen.getByText('150.00 JOD')).toBeInTheDocument();
    expect(screen.getByText('250.00 JOD')).toBeInTheDocument();
  });

  it('should filter payments by status', async () => {
    const allPayments = [
      { id: '1', status: 'escrow_held', order_number: 'ORD-001' },
      { id: '2', status: 'released', order_number: 'ORD-002' },
      { id: '3', status: 'refunded', order_number: 'ORD-003' },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: allPayments,
          error: null,
        }),
      }),
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Filter by held
    const heldFilter = screen.getByRole('button', { name: /held|محجوز/i });
    fireEvent.click(heldFilter);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });
  });

  it('should allow admin to manually release payment', async () => {
    const mockPayment = {
      id: 'payment-1',
      order_id: 'order-1',
      order_number: 'ORD-001',
      amount_jod: 150.00,
      status: 'escrow_held',
    };

    const mockRelease = jest.fn().mockResolvedValue({
      data: { success: true },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockPayment],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockPayment,
          error: null,
        }),
      }),
    });

    mockSupabase.rpc.mockResolvedValue(mockRelease());

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Click on payment
    fireEvent.click(screen.getByText('ORD-001'));

    // Click release button
    const releaseButton = screen.getByRole('button', { name: /release|إفراج/i });
    fireEvent.click(releaseButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText(/confirm.*release|تأكيد.*الإفراج/i)).toBeInTheDocument();
    });

    // Confirm
    const confirmButton = screen.getByRole('button', { name: /confirm|تأكيد/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockRelease).toHaveBeenCalled();
      expect(screen.getByText(/payment released|تم الإفراج/i)).toBeInTheDocument();
    });
  });

  it('should allow admin to manually refund payment', async () => {
    const mockPayment = {
      id: 'payment-1',
      order_id: 'order-1',
      order_number: 'ORD-001',
      amount_jod: 150.00,
      status: 'escrow_held',
    };

    const mockRefund = jest.fn().mockResolvedValue({
      data: { success: true },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockPayment],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockPayment,
          error: null,
        }),
      }),
    });

    mockSupabase.rpc.mockResolvedValue(mockRefund());

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Click refund button
    const refundButton = screen.getByRole('button', { name: /refund|استرجاع/i });
    fireEvent.click(refundButton);

    // Should require reason
    await waitFor(() => {
      expect(screen.getByLabelText(/reason|سبب/i)).toBeInTheDocument();
    });

    // Enter reason
    const reasonInput = screen.getByLabelText(/reason|سبب/i);
    fireEvent.change(reasonInput, { target: { value: 'Customer request' } });

    // Confirm
    const confirmButton = screen.getByRole('button', { name: /confirm.*refund|تأكيد.*الاسترجاع/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockRefund).toHaveBeenCalled();
      expect(screen.getByText(/refund.*processed|تم.*الاسترجاع/i)).toBeInTheDocument();
    });
  });

  it('should prevent release of frozen payment (dispute active)', async () => {
    const mockPayment = {
      id: 'payment-1',
      order_id: 'order-1',
      order_number: 'ORD-001',
      amount_jod: 150.00,
      status: 'escrow_held',
      has_active_dispute: true,
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockPayment],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockPayment,
          error: null,
        }),
      }),
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Release button should be disabled
    const releaseButton = screen.getByRole('button', { name: /release|إفراج/i });
    expect(releaseButton).toBeDisabled();

    // Should show warning
    expect(screen.getByText(/dispute.*active|نزاع.*نشط/i)).toBeInTheDocument();
  });

  it('should display payment timeline', async () => {
    const mockPayment = {
      id: 'payment-1',
      order_number: 'ORD-001',
      amount_jod: 150.00,
      status: 'released',
      payment_events: [
        {
          event: 'payment_created',
          timestamp: '2025-01-01T10:00:00Z',
          description: 'Payment initiated',
        },
        {
          event: 'escrow_held',
          timestamp: '2025-01-01T10:01:00Z',
          description: 'Payment held in escrow',
        },
        {
          event: 'delivery_confirmed',
          timestamp: '2025-01-02T14:00:00Z',
          description: 'Delivery confirmed',
        },
        {
          event: 'payment_released',
          timestamp: '2025-01-02T14:05:00Z',
          description: 'Payment released to supplier',
        },
      ],
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockPayment],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockPayment,
          error: null,
        }),
      }),
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Should show timeline
    await waitFor(() => {
      expect(screen.getByText('Payment initiated')).toBeInTheDocument();
      expect(screen.getByText('Payment held in escrow')).toBeInTheDocument();
      expect(screen.getByText('Delivery confirmed')).toBeInTheDocument();
      expect(screen.getByText('Payment released to supplier')).toBeInTheDocument();
    });
  });

  it('should show total escrow amount', async () => {
    const mockPayments = [
      { id: '1', status: 'escrow_held', amount_jod: 150.00 },
      { id: '2', status: 'escrow_held', amount_jod: 250.00 },
      { id: '3', status: 'released', amount_jod: 100.00 },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockPayments,
          error: null,
        }),
      }),
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      // Total held in escrow should be 400 JOD
      expect(screen.getByText(/total.*escrow.*400/i)).toBeInTheDocument();
    });
  });

  it('should export payment data to CSV', async () => {
    const mockPayments = [
      {
        id: '1',
        order_number: 'ORD-001',
        amount_jod: 150.00,
        status: 'escrow_held',
        created_at: '2025-01-01T10:00:00Z',
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockPayments,
          error: null,
        }),
      }),
    });

    // Mock download
    const mockDownload = jest.fn();
    global.URL.createObjectURL = jest.fn();
    global.URL.revokeObjectURL = jest.fn();

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export|تصدير/i });
    fireEvent.click(exportButton);

    // Should trigger download
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('should handle payment errors gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/error.*loading|خطأ.*التحميل/i)).toBeInTheDocument();
    });
  });

  it('should require admin role to access page', async () => {
    // Mock non-admin user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'user@test.com',
          user_metadata: {
            role: 'contractor',
          },
        },
      },
    });

    render(<PaymentsPage />);

    await waitFor(() => {
      expect(screen.getByText(/unauthorized|غير مصرح/i)).toBeInTheDocument();
    });
  });
});
