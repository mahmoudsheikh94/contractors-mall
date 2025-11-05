import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateIntentRequest {
  orderId: string
  amount: number
  returnUrl: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const hyperPayEntityId = Deno.env.get('HYPERPAY_ENTITY_ID')!
    const hyperPayToken = Deno.env.get('HYPERPAY_ACCESS_TOKEN')!
    const hyperPayBaseUrl = Deno.env.get('HYPERPAY_TEST_MODE') === 'true'
      ? 'https://test.oppwa.com/v1'
      : 'https://oppwa.com/v1'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the JWT from the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { orderId, amount, returnUrl } = await req.json() as CreateIntentRequest

    // Verify the order belongs to the user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, contractor_id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Order not found')
    }

    if (order.contractor_id !== user.id) {
      throw new Error('Unauthorized access to order')
    }

    // Create HyperPay checkout
    const checkoutData = new URLSearchParams({
      'entityId': hyperPayEntityId,
      'amount': amount.toFixed(2),
      'currency': 'JOD',
      'paymentType': 'DB',
      'merchantTransactionId': orderId,
      'customer.email': user.email || '',
      'customParameters[order_id]': orderId,
      'shopperResultUrl': returnUrl,
      'billing.street1': order.delivery_address,
      'billing.city': 'Amman',
      'billing.state': 'Amman',
      'billing.country': 'JO',
      'billing.postcode': '11183'
    })

    const checkoutResponse = await fetch(`${hyperPayBaseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hyperPayToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: checkoutData
    })

    const checkoutResult = await checkoutResponse.json()

    if (checkoutResult.result.code !== '000.200.100') {
      throw new Error(`Payment provider error: ${checkoutResult.result.description}`)
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        payment_intent_id: checkoutResult.id,
        amount_jod: amount,
        status: 'pending',
        metadata: {
          hyperpay_checkout_id: checkoutResult.id,
          created_by: user.id
        }
      })

    if (paymentError) {
      throw paymentError
    }

    // Log payment event
    await supabase
      .from('payment_events')
      .insert({
        payment_id: checkoutResult.id,
        event_type: 'checkout_created',
        event_data: checkoutResult
      })

    return new Response(
      JSON.stringify({
        checkoutId: checkoutResult.id,
        paymentUrl: `${hyperPayBaseUrl}/paymentWidgets.js?checkoutId=${checkoutResult.id}`
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