import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UpdateSettingsRequest {
  key: string
  value: any
  description?: string
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
      throw new Error('Only admins can update settings')
    }

    const { key, value, description } = await req.json() as UpdateSettingsRequest

    // Validate settings keys
    const validSettingsKeys = [
      'delivery_settings',
      'commission_settings',
      'dispute_settings',
      'platform_settings'
    ]

    if (!validSettingsKeys.includes(key)) {
      throw new Error(`Invalid settings key: ${key}`)
    }

    // Validate settings values based on key
    if (key === 'delivery_settings') {
      if (!value.photo_threshold_jod || !value.pin_threshold_jod || !value.safety_margin_percent) {
        throw new Error('Delivery settings must include photo_threshold_jod, pin_threshold_jod, and safety_margin_percent')
      }
    } else if (key === 'commission_settings') {
      if (!value.commission_percent || !value.free_period_days) {
        throw new Error('Commission settings must include commission_percent and free_period_days')
      }
    } else if (key === 'dispute_settings') {
      if (!value.site_visit_threshold_jod) {
        throw new Error('Dispute settings must include site_visit_threshold_jod')
      }
    }

    // Upsert the settings
    const { error: upsertError } = await supabase
      .from('settings')
      .upsert({
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('key', key)

    if (upsertError) {
      throw upsertError
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Settings updated for key: ${key}`,
        settings: { key, value }
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