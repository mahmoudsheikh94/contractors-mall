/**
 * Email Integration with Resend
 * ==============================
 *
 * This module handles transactional emails via Resend API.
 *
 * Email Categories:
 * - Invoice notifications (invoice ready for download)
 *
 * Note: Auth emails (verification, password reset) are handled by Supabase SMTP.
 */

import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

// Default sender email (configured in Resend)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@contractorsmall.com'

/**
 * Base email sending function
 * Handles Resend API calls with error handling
 */
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️  RESEND_API_KEY not configured. Email would have been sent to:', to)
      console.warn('Subject:', subject)
      return { success: false, error: 'Email service not configured' }
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('❌ Resend API error:', error)
      return { success: false, error }
    }

    console.log('✅ Email sent successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Failed to send email:', error)
    return { success: false, error }
  }
}

/**
 * Send invoice ready notification
 */
export async function sendInvoiceReadyEmail(
  email: string,
  orderNumber: string,
  invoiceNumber: string,
  invoiceUrl: string
) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #8B5CF6; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; padding: 12px 30px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📄 الفاتورة الضريبية جاهزة!</h1>
        </div>
        <div class="content">
          <h2>فاتورتك الضريبية جاهزة للتحميل</h2>

          <p>تم إصدار الفاتورة الضريبية للطلب رقم <strong>${orderNumber}</strong></p>
          <p>رقم الفاتورة: <strong>${invoiceNumber}</strong></p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${invoiceUrl}" class="button">
              📥 تحميل الفاتورة PDF
            </a>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders" class="button" style="background: #6B7280;">
              عرض الطلب
            </a>
          </div>

          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; border-right: 4px solid #F59E0B;">
            <p style="margin: 0;"><strong>💡 ملاحظة:</strong> هذه فاتورة ضريبية معتمدة من دائرة ضريبة الدخل والمبيعات الأردنية.</p>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 المقاول مول. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: `الفاتورة الضريبية جاهزة - ${invoiceNumber}`,
    html,
  })
}

/**
 * Send order status change email (placeholder)
 * TODO: Implement email templates for order status changes
 */
export async function sendOrderStatusEmail(
  email: string,
  orderNumber: string,
  status: string,
  statusMessage: string
) {
  // Placeholder implementation
  console.log(`Order status email would be sent to ${email} for order ${orderNumber} with status ${status}: ${statusMessage}`)
  return { success: true }
}
