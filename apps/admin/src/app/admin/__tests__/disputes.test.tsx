/**
 * Admin Dispute Management Tests
 *
 * Tests for dispute handling, QC workflow, and site visit scheduling
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { createClient } from '@supabase/supabase-js';
import DisputesPage from '../disputes/page';
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

describe('Admin Dispute Management', () => {
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

  it('should display list of active disputes', async () => {
    const mockDisputes = [
      {
        id: 'dispute-1',
        order_number: 'ORD-001',
        reason: 'damaged_goods',
        status: 'pending_review',
        order_total_jod: 150.00,
        created_at: '2025-01-01T10:00:00Z',
        contractor_name: 'John Contractor',
        supplier_name: 'ABC Supplies',
      },
      {
        id: 'dispute-2',
        order_number: 'ORD-002',
        reason: 'wrong_items',
        status: 'under_investigation',
        order_total_jod: 400.00,
        created_at: '2025-01-02T10:00:00Z',
        contractor_name: 'Jane Builder',
        supplier_name: 'XYZ Materials',
      },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockDisputes,
          error: null,
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.getByText('ORD-002')).toBeInTheDocument();
    });

    // Should show dispute reasons
    expect(screen.getByText(/damaged.*goods/i)).toBeInTheDocument();
    expect(screen.getByText(/wrong.*items/i)).toBeInTheDocument();

    // Should show statuses
    expect(screen.getByText(/pending.*review/i)).toBeInTheDocument();
    expect(screen.getByText(/under.*investigation/i)).toBeInTheDocument();
  });

  it('should filter disputes by status', async () => {
    const allDisputes = [
      { id: '1', status: 'pending_review', order_number: 'ORD-001' },
      { id: '2', status: 'resolved', order_number: 'ORD-002' },
      { id: '3', status: 'escalated', order_number: 'ORD-003' },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: allDisputes,
          error: null,
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Filter by pending
    const pendingFilter = screen.getByRole('button', { name: /pending/i });
    fireEvent.click(pendingFilter);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
      expect(screen.queryByText('ORD-002')).not.toBeInTheDocument();
      expect(screen.queryByText('ORD-003')).not.toBeInTheDocument();
    });
  });

  it('should display dispute details with evidence', async () => {
    const mockDispute = {
      id: 'dispute-1',
      order_number: 'ORD-001',
      reason: 'damaged_goods',
      description: 'Items were damaged upon delivery',
      status: 'pending_review',
      order_total_jod: 150.00,
      evidence_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      created_at: '2025-01-01T10:00:00Z',
      contractor_name: 'John Contractor',
      supplier_name: 'ABC Supplies',
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockDispute],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockDispute,
          error: null,
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    // Click on dispute
    fireEvent.click(screen.getByText('ORD-001'));

    // Should show details
    await waitFor(() => {
      expect(screen.getByText('Items were damaged upon delivery')).toBeInTheDocument();
      expect(screen.getAllByRole('img')).toHaveLength(2); // 2 evidence photos
    });
  });

  it('should allow admin to approve refund', async () => {
    const mockDispute = {
      id: 'dispute-1',
      order_id: 'order-1',
      order_number: 'ORD-001',
      reason: 'damaged_goods',
      status: 'pending_review',
      order_total_jod: 150.00,
    };

    const mockApprove = jest.fn().mockResolvedValue({
      data: { success: true },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockDispute],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockDispute,
          error: null,
        }),
      }),
    });

    mockSupabase.rpc.mockResolvedValue(mockApprove());

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Click approve refund button
    const approveButton = screen.getByRole('button', { name: /approve.*refund/i });
    fireEvent.click(approveButton);

    // Should show confirmation
    await waitFor(() => {
      expect(screen.getByText(/confirm.*refund/i)).toBeInTheDocument();
    });

    // Add resolution note
    const noteInput = screen.getByLabelText(/resolution.*note/i);
    fireEvent.change(noteInput, { target: { value: 'Items confirmed damaged' } });

    // Confirm
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalled();
      expect(screen.getByText(/refund approved/i)).toBeInTheDocument();
    });
  });

  it('should allow admin to reject dispute', async () => {
    const mockDispute = {
      id: 'dispute-1',
      order_id: 'order-1',
      order_number: 'ORD-001',
      reason: 'wrong_items',
      status: 'pending_review',
      order_total_jod: 150.00,
    };

    const mockReject = jest.fn().mockResolvedValue({
      data: { success: true },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockDispute],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockDispute,
          error: null,
        }),
      }),
    });

    mockSupabase.rpc.mockResolvedValue(mockReject());

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Click reject button
    const rejectButton = screen.getByRole('button', { name: /reject.*dispute/i });
    fireEvent.click(rejectButton);

    // Should require reason
    await waitFor(() => {
      expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    });

    const reasonInput = screen.getByLabelText(/reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Evidence insufficient' } });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalled();
      expect(screen.getByText(/dispute rejected/i)).toBeInTheDocument();
    });
  });

  it('should trigger site visit for high-value disputes (≥350 JOD)', async () => {
    const mockDispute = {
      id: 'dispute-1',
      order_id: 'order-1',
      order_number: 'ORD-001',
      reason: 'damaged_goods',
      status: 'pending_review',
      order_total_jod: 400.00, // ≥350 JOD threshold
      requires_site_visit: true,
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockDispute],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockDispute,
          error: null,
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Should show site visit requirement
    await waitFor(() => {
      expect(screen.getByText(/site.*visit.*required/i)).toBeInTheDocument();
    });

    // Should have schedule visit button
    expect(screen.getByRole('button', { name: /schedule.*visit/i })).toBeInTheDocument();
  });

  it('should schedule site visit for high-value dispute', async () => {
    const mockDispute = {
      id: 'dispute-1',
      order_id: 'order-1',
      order_number: 'ORD-001',
      order_total_jod: 400.00,
      requires_site_visit: true,
      delivery_address: 'Test Address, Amman',
    };

    const mockSchedule = jest.fn().mockResolvedValue({
      data: { success: true },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockDispute],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockDispute,
          error: null,
        }),
      }),
    });

    mockSupabase.rpc.mockResolvedValue(mockSchedule());

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Click schedule visit
    const scheduleButton = screen.getByRole('button', { name: /schedule.*visit/i });
    fireEvent.click(scheduleButton);

    // Should show date picker
    await waitFor(() => {
      expect(screen.getByLabelText(/visit.*date/i)).toBeInTheDocument();
    });

    // Select tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateInput = screen.getByLabelText(/visit.*date/i);
    fireEvent.change(dateInput, { target: { value: tomorrow.toISOString().split('T')[0] } });

    // Select time
    const timeInput = screen.getByLabelText(/time/i);
    fireEvent.change(timeInput, { target: { value: '10:00' } });

    // Assign inspector
    const inspectorInput = screen.getByLabelText(/inspector/i);
    fireEvent.change(inspectorInput, { target: { value: 'Inspector Ahmed' } });

    // Confirm
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockSchedule).toHaveBeenCalled();
      expect(screen.getByText(/visit scheduled/i)).toBeInTheDocument();
    });
  });

  it('should show dispute timeline', async () => {
    const mockDispute = {
      id: 'dispute-1',
      order_number: 'ORD-001',
      status: 'resolved',
      dispute_events: [
        {
          event: 'dispute_created',
          timestamp: '2025-01-01T10:00:00Z',
          description: 'Dispute created by contractor',
        },
        {
          event: 'under_review',
          timestamp: '2025-01-01T11:00:00Z',
          description: 'Admin started review',
        },
        {
          event: 'site_visit_scheduled',
          timestamp: '2025-01-02T09:00:00Z',
          description: 'Site visit scheduled for Jan 3',
        },
        {
          event: 'resolved',
          timestamp: '2025-01-03T14:00:00Z',
          description: 'Dispute resolved - refund approved',
        },
      ],
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockDispute],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockDispute,
          error: null,
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Should show full timeline
    await waitFor(() => {
      expect(screen.getByText('Dispute created by contractor')).toBeInTheDocument();
      expect(screen.getByText('Admin started review')).toBeInTheDocument();
      expect(screen.getByText(/Site visit scheduled/i)).toBeInTheDocument();
      expect(screen.getByText(/Dispute resolved/i)).toBeInTheDocument();
    });
  });

  it('should show resolution statistics', async () => {
    const mockDisputes = [
      { id: '1', status: 'resolved', resolution: 'refund_approved' },
      { id: '2', status: 'resolved', resolution: 'refund_approved' },
      { id: '3', status: 'resolved', resolution: 'dispute_rejected' },
      { id: '4', status: 'pending_review' },
    ];

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: mockDisputes,
          error: null,
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      // Should show statistics
      expect(screen.getByText(/total.*disputes.*4/i)).toBeInTheDocument();
      expect(screen.getByText(/resolved.*3/i)).toBeInTheDocument();
      expect(screen.getByText(/pending.*1/i)).toBeInTheDocument();
      // Resolution rate: 3/4 = 75%
      expect(screen.getByText(/resolution.*rate.*75%/i)).toBeInTheDocument();
    });
  });

  it('should prevent duplicate resolution actions', async () => {
    const mockDispute = {
      id: 'dispute-1',
      order_number: 'ORD-001',
      status: 'resolved',
      resolution: 'refund_approved',
    };

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: [mockDispute],
          error: null,
        }),
        single: jest.fn().mockResolvedValue({
          data: mockDispute,
          error: null,
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ORD-001'));

    // Action buttons should not be available for resolved disputes
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();

      // Should show resolution status
      expect(screen.getByText(/already resolved/i)).toBeInTheDocument();
    });
  });

  it('should handle errors gracefully', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }),
    });

    render(<DisputesPage />);

    await waitFor(() => {
      expect(screen.getByText(/error.*loading/i)).toBeInTheDocument();
    });
  });
});
