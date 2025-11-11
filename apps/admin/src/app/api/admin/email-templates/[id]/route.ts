import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError, trackEvent } from '@/lib/monitoring'

/**
 * GET /api/admin/email-templates/[id]
 *
 * Get a single email template
 * Admin only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const templateId = params.id

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select(`
        *,
        created_by_profile:created_by (
          full_name
        ),
        updated_by_profile:updated_by (
          full_name
        )
      `)
      .eq('id', templateId)
      .single()

    if (templateError) {
      if (templateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      trackAPIError(
        new Error(templateError.message),
        `/api/admin/email-templates/${templateId}`,
        'GET',
        500,
        { templateId }
      )
      return NextResponse.json(
        { error: 'Failed to fetch email template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ template })
  } catch (error: any) {
    console.error('Get email template error:', error)
    trackAPIError(
      error,
      `/api/admin/email-templates/${params.id}`,
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to fetch email template' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/email-templates/[id]
 *
 * Update an email template
 * Admin only
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const templateId = params.id

    // Parse request body
    const body = await request.json()
    const {
      name,
      description,
      subjectAr,
      subjectEn,
      bodyAr,
      bodyEn,
      variables,
      category,
      isActive,
    } = body

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    if (name !== undefined && name.trim()) {
      updates.name = name.trim()
    }

    if (description !== undefined) {
      updates.description = description?.trim() || null
    }

    if (subjectAr !== undefined && subjectAr.trim()) {
      updates.subject_ar = subjectAr.trim()
    }

    if (subjectEn !== undefined && subjectEn.trim()) {
      updates.subject_en = subjectEn.trim()
    }

    if (bodyAr !== undefined && bodyAr.trim()) {
      updates.body_ar = bodyAr.trim()
    }

    if (bodyEn !== undefined && bodyEn.trim()) {
      updates.body_en = bodyEn.trim()
    }

    if (variables !== undefined) {
      updates.variables = variables
    }

    if (category !== undefined) {
      updates.category = category
    }

    if (isActive !== undefined) {
      updates.is_active = isActive
    }

    // Update template
    const { data: template, error: updateError } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', templateId)
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      if (updateError.code === '23505') {
        // Unique violation
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 409 }
        )
      }

      trackAPIError(
        new Error(updateError.message),
        `/api/admin/email-templates/${templateId}`,
        'PATCH',
        500,
        { templateId, updates }
      )
      return NextResponse.json(
        { error: 'Failed to update email template' },
        { status: 500 }
      )
    }

    // Track event
    trackEvent('Admin: Update Email Template', {
      admin_id: user.id,
      admin_name: profile.full_name,
      template_id: templateId,
      template_name: template.name,
    }, 'info')

    return NextResponse.json({
      template,
      message: 'Email template updated successfully'
    })
  } catch (error: any) {
    console.error('Update email template error:', error)
    trackAPIError(
      error,
      `/api/admin/email-templates/${params.id}`,
      'PATCH',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to update email template' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/email-templates/[id]
 *
 * Delete an email template
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    // Get current user and verify authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const templateId = params.id

    // Get template name before deletion for tracking
    const { data: template } = await supabase
      .from('email_templates')
      .select('name')
      .eq('id', templateId)
      .single()

    // Delete template
    const { error: deleteError } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', templateId)

    if (deleteError) {
      trackAPIError(
        new Error(deleteError.message),
        `/api/admin/email-templates/${templateId}`,
        'DELETE',
        500,
        { templateId }
      )
      return NextResponse.json(
        { error: 'Failed to delete email template' },
        { status: 500 }
      )
    }

    // Track event
    trackEvent('Admin: Delete Email Template', {
      admin_id: user.id,
      admin_name: profile.full_name,
      template_id: templateId,
      template_name: template?.name,
    }, 'warning')

    return NextResponse.json({
      message: 'Email template deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete email template error:', error)
    trackAPIError(
      error,
      `/api/admin/email-templates/${params.id}`,
      'DELETE',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to delete email template' },
      { status: 500 }
    )
  }
}
