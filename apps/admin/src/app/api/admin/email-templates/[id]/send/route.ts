import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { trackAPIError, trackEvent } from '@/lib/monitoring'

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * POST /api/admin/email-templates/[id]/send
 *
 * Send an email using a template
 * Admin only
 */
export async function POST(
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
    const { recipientEmail, recipientName, language, variables } = body

    // Validate required fields
    if (!recipientEmail || !recipientEmail.trim()) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      )
    }

    if (!language || !['ar', 'en'].includes(language)) {
      return NextResponse.json(
        { error: 'Language must be either "ar" or "en"' },
        { status: 400 }
      )
    }

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single()

    if (templateError) {
      if (templateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Template not found or inactive' },
          { status: 404 }
        )
      }

      trackAPIError(
        new Error(templateError.message),
        `/api/admin/email-templates/${templateId}/send`,
        'POST',
        500,
        { templateId }
      )
      return NextResponse.json(
        { error: 'Failed to fetch email template' },
        { status: 500 }
      )
    }

    // Get subject and body based on language
    const subject = language === 'ar' ? template.subject_ar : template.subject_en
    let body_text = language === 'ar' ? template.body_ar : template.body_en

    // Replace variables in subject and body
    const templateVariables = variables || {}

    // Add default variables
    templateVariables.recipient_name = recipientName || recipientEmail
    templateVariables.platform_name = 'Contractors Mall'
    templateVariables.platform_name_ar = 'المقاول مول'
    templateVariables.support_email = process.env.SUPPORT_EMAIL || 'support@contractorsmall.com'
    templateVariables.current_year = new Date().getFullYear().toString()

    // Replace all variables in the format {{variable_name}}
    let processedSubject = subject
    let processedBody = body_text

    Object.entries(templateVariables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      processedSubject = processedSubject.replace(new RegExp(placeholder, 'g'), String(value))
      processedBody = processedBody.replace(new RegExp(placeholder, 'g'), String(value))
    })

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, email not sent')

      // Return success but log that email wasn't actually sent
      trackEvent('Admin: Email Send (Simulated)', {
        admin_id: user.id,
        admin_name: profile.full_name,
        template_id: templateId,
        template_name: template.name,
        recipient: recipientEmail,
        language,
      }, 'info')

      return NextResponse.json({
        success: true,
        message: 'Email simulated (RESEND_API_KEY not configured)',
        simulation: {
          to: recipientEmail,
          subject: processedSubject,
          preview: processedBody.substring(0, 100) + '...',
        }
      })
    }

    // Send email using Resend
    const { data, error: sendError } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@contractorsmall.com',
      to: recipientEmail,
      subject: processedSubject,
      html: convertTextToHtml(processedBody, language === 'ar'),
    })

    if (sendError) {
      trackAPIError(
        new Error(sendError.message),
        `/api/admin/email-templates/${templateId}/send`,
        'POST',
        500,
        { templateId, recipientEmail, sendError }
      )
      return NextResponse.json(
        { error: 'Failed to send email: ' + sendError.message },
        { status: 500 }
      )
    }

    // Track successful send
    trackEvent('Admin: Email Sent', {
      admin_id: user.id,
      admin_name: profile.full_name,
      template_id: templateId,
      template_name: template.name,
      recipient: recipientEmail,
      language,
      email_id: data?.id,
    }, 'info')

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      emailId: data?.id,
    })
  } catch (error: any) {
    console.error('Send email error:', error)
    trackAPIError(
      error,
      `/api/admin/email-templates/${params.id}/send`,
      'POST',
      500
    )
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

/**
 * Convert plain text to simple HTML with basic formatting
 * Preserves line breaks and adds RTL support for Arabic
 */
function convertTextToHtml(text: string, isRtl: boolean): string {
  // Convert line breaks to <br> tags
  const htmlContent = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<p>${line}</p>`)
    .join('')

  // Wrap in basic HTML template
  return `
<!DOCTYPE html>
<html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: ${isRtl ? 'Arial, sans-serif' : 'system-ui, -apple-system, sans-serif'};
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    p {
      margin: 0 0 15px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 12px;
      color: #666;
      text-align: ${isRtl ? 'right' : 'left'};
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlContent}
    <div class="footer">
      <p>${isRtl ? 'المقاول مول' : 'Contractors Mall'}</p>
      <p>${isRtl ? 'هذا البريد الإلكتروني تم إرساله تلقائياً، يرجى عدم الرد عليه.' : 'This email was sent automatically, please do not reply.'}</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}
