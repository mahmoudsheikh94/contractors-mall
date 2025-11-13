/**
 * Resend Email Service
 * ====================
 * Centralized email sending service using Resend
 */

import { Resend } from 'resend'

// Initialize Resend client (only if API key is available)
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(options: EmailOptions) {
  if (!resend) {
    console.warn('⚠️ Resend not configured - email not sent:', options.subject)
    return null
  }

  try {
    const { data, error } = await resend.emails.send({
      from: options.from || process.env.RESEND_FROM_EMAIL || 'Contractors Mall <noreply@contractorsmall.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error('Error sending email:', error)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log('✅ Email sent successfully:', data?.id)
    return data
  } catch (error) {
    console.error('Error in sendEmail:', error)
    throw error
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(email: string, name: string) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; padding: 12px 30px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏗️ أهلاً بك في المقاول مول!</h1>
        </div>
        <div class="content">
          <h2>مرحباً ${name}،</h2>
          <p>شكراً لانضمامك إلى منصة المقاول مول - السوق الرائد لمواد البناء في الأردن.</p>

          <p><strong>ما يمكنك فعله الآن:</strong></p>
          <ul>
            <li>تصفح آلاف المنتجات من موردين موثوقين</li>
            <li>احصل على عروض أسعار فورية مع رسوم التوصيل</li>
            <li>اختر المركبة المناسبة تلقائياً</li>
            <li>تتبع طلباتك بسهولة</li>
            <li>نظام دفع آمن مع ضمان الجودة</li>
          </ul>

          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/products" class="button">
              ابدأ التسوق الآن
            </a>
          </div>

          <p>إذا كان لديك أي أسئلة، فريق الدعم جاهز لمساعدتك.</p>

          <p>أطيب التحيات،<br>فريق المقاول مول</p>
        </div>
        <div class="footer">
          <p>© 2025 المقاول مول. جميع الحقوق محفوظة.</p>
          <p>عمان، الأردن | support@contractorsmall.com</p>
        </div>
      </div>
    </body>
    </html>
  `

  return sendEmail({
    to: email,
    subject: 'مرحباً بك في المقاول مول! 🏗️',
    html,
  })
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  email: string,
  orderNumber: string,
  orderTotal: number,
  orderDetails: {
    items: Array<{ name: string; quantity: number; price: number }>
    deliveryFee: number
    vehicle: string
  }
) {
  const itemsHtml = orderDetails.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: left;">${item.price.toFixed(2)} د.أ</td>
      </tr>
    `
    )
    .join('')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .total-row { background: #f3f4f6; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ تم تأكيد طلبك!</h1>
          <p style="font-size: 18px; margin: 10px 0;">رقم الطلب: ${orderNumber}</p>
        </div>
        <div class="content">
          <h2>شكراً لطلبك!</h2>
          <p>تم استلام طلبك بنجاح وجاري المعالجة.</p>

          <h3>تفاصيل الطلب:</h3>
          <table>
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px; text-align: right;">المنتج</th>
                <th style="padding: 10px; text-align: center;">الكمية</th>
                <th style="padding: 10px; text-align: left;">السعر</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right;">رسوم التوصيل (${orderDetails.vehicle})</td>
                <td style="padding: 10px; text-align: left;">${orderDetails.deliveryFee.toFixed(2)} د.أ</td>
              </tr>
              <tr class="total-row">
                <td colspan="2" style="padding: 15px; text-align: right;">الإجمالي</td>
                <td style="padding: 15px; text-align: left; font-size: 18px; color: #10B981;">${orderTotal.toFixed(2)} د.أ</td>
              </tr>
            </tbody>
          </table>

          <div style="background: #EFF6FF; padding: 15px; border-radius: 8px; border-right: 4px solid #3B82F6;">
            <p style="margin: 0;"><strong>ℹ️ ملاحظة:</strong> سيتم التواصل معك قريباً من قبل المورد لتأكيد موعد التوصيل.</p>
          </div>

          <p style="margin-top: 20px;">يمكنك متابعة حالة طلبك من خلال لوحة التحكم الخاصة بك.</p>
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
    subject: `تأكيد الطلب ${orderNumber} - المقاول مول`,
    html,
  })
}

/**
 * Send order status update email
 */
export async function sendOrderStatusEmail(
  email: string,
  orderNumber: string,
  status: string,
  statusMessage: string
) {
  const statusColors: Record<string, string> = {
    confirmed: '#10B981',
    in_delivery: '#3B82F6',
    delivered: '#10B981',
    completed: '#10B981',
    cancelled: '#EF4444',
  }

  const color = statusColors[status] || '#6B7280'

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; padding: 12px 30px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📦 تحديث حالة الطلب</h1>
          <p style="font-size: 18px;">رقم الطلب: ${orderNumber}</p>
        </div>
        <div class="content">
          <h2>${statusMessage}</h2>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/orders" class="button">
              عرض تفاصيل الطلب
            </a>
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
    subject: `تحديث الطلب ${orderNumber} - ${statusMessage}`,
    html,
  })
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
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #EF4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; padding: 12px 30px; background: #EF4444; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 إعادة تعيين كلمة المرور</h1>
        </div>
        <div class="content">
          <h2>طلب إعادة تعيين كلمة المرور</h2>

          <p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك.</p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="button">
              إعادة تعيين كلمة المرور
            </a>
          </div>

          <p><strong>ملاحظات مهمة:</strong></p>
          <ul>
            <li>هذا الرابط صالح لمدة 24 ساعة فقط</li>
            <li>إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد</li>
            <li>لن يتم تغيير كلمة المرور حتى تقوم بإنشاء كلمة مرور جديدة</li>
          </ul>

          <div style="background: #FEE2E2; padding: 15px; border-radius: 8px; border-right: 4px solid #EF4444; margin-top: 20px;">
            <p style="margin: 0;"><strong>⚠️ تحذير أمني:</strong> لا تشارك هذا الرابط مع أي شخص. إذا لم تطلب هذا التغيير، يرجى تجاهل هذا البريد.</p>
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
    subject: 'إعادة تعيين كلمة المرور - المقاول مول',
    html,
  })
}

/**
 * Send email verification
 */
export async function sendEmailVerification(
  email: string,
  verificationLink: string
) {
  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
        .button { display: inline-block; padding: 12px 30px; background: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ تأكيد البريد الإلكتروني</h1>
        </div>
        <div class="content">
          <h2>مرحباً!</h2>

          <p>شكراً لتسجيلك في المقاول مول. لإكمال عملية التسجيل، يرجى تأكيد بريدك الإلكتروني.</p>

          <div style="text-align: center;">
            <a href="${verificationLink}" class="button">
              تأكيد البريد الإلكتروني
            </a>
          </div>

          <p>أو يمكنك نسخ الرابط التالي ولصقه في المتصفح:</p>
          <p style="word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 5px; font-size: 12px;">
            ${verificationLink}
          </p>

          <p><strong>هذا الرابط صالح لمدة 24 ساعة.</strong></p>
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
    subject: 'تأكيد البريد الإلكتروني - المقاول مول',
    html,
  })
}
