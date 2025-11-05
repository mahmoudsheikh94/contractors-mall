import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ReleasePaymentRequest {
  orderId: string
  paymentId: string
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

    // Check if user is admin or system
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'supplier_admin')) {
      throw new Error('Insufficient permissions')
    }

    const { orderId, paymentId } = await req.json() as ReleasePaymentRequest

    // Verify order is delivered and payment is held
    const { data: order } = await supabase
      .from('orders')
      .select('status, supplier_id')
      .eq('id', orderId)
      .single()

    if (!order || order.status !== 'delivered') {
      throw new Error('Order must be delivered to release payment')
    }

    // Check for active disputes
    const { data: disputes } = await supabase
      .from('disputes')
      .select('id')
      .eq('order_id', orderId)
      .in('status', ['opened', 'investigating'])

    if (disputes && disputes.length > 0) {
      throw new Error('Cannot release payment while dispute is active')
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: 'released',
        released_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .eq('status', 'held')

    if (updateError) {
      throw updateError
    }

    // Update supplier wallet balance
    const { data: payment } = await supabase
      .from('payments')
      .select('amount_jod')
      .eq('id', paymentId)
      .single()

    if (payment) {
      // Get commission rate from settings
      const { data: settings } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'commission_settings')
        .single()

      const commissionRate = settings?.value?.commission_percent || 10
      const netAmount = payment.amount_jod * (1 - commissionRate / 100)

      await supabase.rpc('increment_wallet_balance', {
        p_supplier_id: order.supplier_id,
        p_amount: netAmount
      })
    }

    // Log payment event
    await supabase
      .from('payment_events')
      .insert({
        payment_id: paymentId,
        event_type: 'payment_released',
        event_data: {
          order_id: orderId,
          released_by: user.id,
          timestamp: new Date().toISOString()
        }
      })

    return new Response(
      JSON.stringify({ success: true, message: 'Payment released successfully' }),
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