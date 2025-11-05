import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/supplier/notifications/preferences
 *
 * Get notification preferences for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create notification preferences
    let { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // If no preferences exist, create default ones
    if (!preferences) {
      const { data: newPreferences, error: insertError } = await (supabase
        .from('notification_preferences')
        .insert as any)({
        user_id: user.id,
        // All notifications enabled by default
        email_new_order: true,
        email_status_updates: true,
        email_daily_summary: true,
        email_weekly_report: true,
        email_low_stock: true,
        email_messages: true,
        app_new_order: true,
        app_status_updates: true,
        app_messages: true,
        app_low_stock: true,
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null
      })
      .select()
      .single()

      if (insertError) {
        console.error('Preferences insert error:', insertError)
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        )
      }

      preferences = newPreferences
    }

    return NextResponse.json({ preferences })
  } catch (error: any) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/supplier/notifications/preferences
 *
 * Update notification preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    // Build update object with only provided fields
    const updateData: any = { updated_at: new Date().toISOString() }

    // Email preferences
    if (body.email_new_order !== undefined) updateData.email_new_order = body.email_new_order
    if (body.email_status_updates !== undefined) updateData.email_status_updates = body.email_status_updates
    if (body.email_daily_summary !== undefined) updateData.email_daily_summary = body.email_daily_summary
    if (body.email_weekly_report !== undefined) updateData.email_weekly_report = body.email_weekly_report
    if (body.email_low_stock !== undefined) updateData.email_low_stock = body.email_low_stock
    if (body.email_messages !== undefined) updateData.email_messages = body.email_messages

    // In-app preferences
    if (body.app_new_order !== undefined) updateData.app_new_order = body.app_new_order
    if (body.app_status_updates !== undefined) updateData.app_status_updates = body.app_status_updates
    if (body.app_messages !== undefined) updateData.app_messages = body.app_messages
    if (body.app_low_stock !== undefined) updateData.app_low_stock = body.app_low_stock

    // Quiet hours
    if (body.quiet_hours_enabled !== undefined) updateData.quiet_hours_enabled = body.quiet_hours_enabled
    if (body.quiet_hours_start !== undefined) updateData.quiet_hours_start = body.quiet_hours_start
    if (body.quiet_hours_end !== undefined) updateData.quiet_hours_end = body.quiet_hours_end

    let preferences

    if (existing) {
      // Update existing preferences
      const { data: updated, error: updateError } = await supabase
        .from('notification_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Preferences update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update preferences' },
          { status: 500 }
        )
      }

      preferences = updated
    } else {
      // Create new preferences
      const { data: created, error: createError } = await (supabase
        .from('notification_preferences')
        .insert as any)({
        user_id: user.id,
        ...updateData
      })
      .select()
      .single()

      if (createError) {
        console.error('Preferences create error:', createError)
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        )
      }

      preferences = created
    }

    return NextResponse.json({
      success: true,
      preferences,
      message: 'تم تحديث تفضيلات الإشعارات بنجاح'
    })
  } catch (error: any) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' },
      { status: 500 }
    )
  }
}