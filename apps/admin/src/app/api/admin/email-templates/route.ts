import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { trackAPIError, trackEvent } from '@/lib/monitoring'

/**
 * GET /api/admin/email-templates
 *
 * List all email templates
 * Admin only
 */
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const isActive = url.searchParams.get('isActive')

    // Build query
    let query = supabase
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
      .order('created_at', { ascending: false })

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: templates, error: templatesError } = await query

    if (templatesError) {
      trackAPIError(
        new Error(templatesError.message),
        '/api/admin/email-templates',
        'GET',
        500,
        { filters: { category, isActive } }
      )
      return NextResponse.json(
        { error: 'Failed to fetch email templates' },
        { status: 500 }
      )
    }

    return NextResponse.json({ templates })
  } catch (error: any) {
    console.error('List email templates error:', error)
    trackAPIError(
      error,
      '/api/admin/email-templates',
      'GET',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to fetch email templates' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/email-templates
 *
 * Create a new email template
 * Admin only
 */
export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    if (!subjectAr || !subjectAr.trim() || !subjectEn || !subjectEn.trim()) {
      return NextResponse.json(
        { error: 'Subject in both Arabic and English is required' },
        { status: 400 }
      )
    }

    if (!bodyAr || !bodyAr.trim() || !bodyEn || !bodyEn.trim()) {
      return NextResponse.json(
        { error: 'Body in both Arabic and English is required' },
        { status: 400 }
      )
    }

    // Create template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        subject_ar: subjectAr.trim(),
        subject_en: subjectEn.trim(),
        body_ar: bodyAr.trim(),
        body_en: bodyEn.trim(),
        variables: variables || [],
        category: category || 'general',
        is_active: isActive !== false, // Default to true
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (templateError) {
      if (templateError.code === '23505') {
        // Unique violation
        return NextResponse.json(
          { error: 'A template with this name already exists' },
          { status: 409 }
        )
      }

      trackAPIError(
        new Error(templateError.message),
        '/api/admin/email-templates',
        'POST',
        500,
        { name }
      )
      return NextResponse.json(
        { error: 'Failed to create email template' },
        { status: 500 }
      )
    }

    // Track event
    trackEvent('Admin: Create Email Template', {
      admin_id: user.id,
      admin_name: profile.full_name,
      template_id: template.id,
      template_name: name,
      category,
    }, 'info')

    return NextResponse.json(
      {
        template,
        message: 'Email template created successfully'
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create email template error:', error)
    trackAPIError(
      error,
      '/api/admin/email-templates',
      'POST',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to create email template' },
      { status: 500 }
    )
  }
}
