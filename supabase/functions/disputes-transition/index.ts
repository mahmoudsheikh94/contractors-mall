import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type DisputeStatus = 'opened' | 'investigating' | 'resolved' | 'escalated'

interface TransitionDisputeRequest {
  disputeId: string
  newStatus: DisputeStatus
  qcNotes?: string
  qcAction?: string
  resolution?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify admin role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Only admins can transition disputes')
    }

    const { disputeId, newStatus, qcNotes, qcAction, resolution } = await req.json() as TransitionDisputeRequest

    // Get current dispute state
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select('*, orders!inner(id, total_jod)')
      .eq('id', disputeId)
      .single()

    if (disputeError || !dispute) {
      throw new Error('Dispute not found')
    }

    // Validate state transition
    const validTransitions: Record<DisputeStatus, DisputeStatus[]> = {
      'opened': ['investigating', 'resolved'],
      'investigating': ['resolved', 'escalated'],
      'resolved': [],
      'escalated': ['resolved']
    }

    if (!validTransitions[dispute.status].includes(newStatus)) {
      throw new Error(`Invalid transition from ${dispute.status} to ${newStatus}`)
    }

    // Check site visit requirement for escalation
    if (newStatus === 'escalated') {
      const { data: siteVisitRequired } = await supabase
        .rpc('check_site_visit_requirement', { p_order_id: dispute.order_id })

      const updateData: any = {
        status: newStatus,
        qc_notes: qcNotes,
        qc_action: qcAction,
        site_visit_required: siteVisitRequired
      }

      await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', disputeId)
    } else if (newStatus === 'resolved') {
      // For resolution
      const updateData: any = {
        status: newStatus,
        qc_notes: qcNotes,
        qc_action: qcAction,
        resolution: resolution,
        resolved_at: new Date().toISOString(),
        site_visit_completed: dispute.site_visit_required || false
      }

      await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', disputeId)

      // If resolved in favor of contractor, might need to process refund
      if (qcAction === 'refund_full' || qcAction === 'refund_partial') {
        // Trigger refund process
        await supabase
          .from('payment_events')
          .insert({
            payment_id: dispute.order_id, // This should link to actual payment
            event_type: 'refund_initiated',
            event_data: {
              dispute_id: disputeId,
              refund_type: qcAction,
              initiated_by: user.id
            }
          })
      }
    } else {
      // Standard update
      await supabase
        .from('disputes')
        .update({
          status: newStatus,
          qc_notes: qcNotes,
          qc_action: qcAction
        })
        .eq('id', disputeId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Dispute transitioned to ${newStatus}`,
        dispute_id: disputeId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})