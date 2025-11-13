/**
 * Email Template System
 * ====================
 * Manages email templates with multi-language support
 */

import { NotificationType } from '../types'

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export interface TemplateData {
  [key: string]: any
}

// Template renderer
export class TemplateRenderer {
  private templates: Map<string, EmailTemplate> = new Map()

  constructor() {
    this.loadTemplates()
  }

  private loadTemplates() {
    // Arabic templates
    this.templates.set('ar:order_confirmation', {
      subject: 'تأكيد الطلب #{{orderNumber}}',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>تم استلام طلبك بنجاح!</h2>
          <p>مرحباً {{customerName}}،</p>
          <p>نشكرك على طلبك. تم استلام الطلب رقم <strong>#{{orderNumber}}</strong> بنجاح.</p>

          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>تفاصيل الطلب:</h3>
            <ul>
              <li>المورد: {{supplierName}}</li>
              <li>المبلغ الإجمالي: {{totalAmount}} دينار أردني</li>
              <li>موعد التوصيل: {{deliveryDate}}</li>
              <li>عنوان التوصيل: {{deliveryAddress}}</li>
            </ul>
          </div>

          <div style="margin-top: 20px;">
            <h4>المنتجات:</h4>
            {{#each items}}
            <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
              <strong>{{name}}</strong><br>
              الكمية: {{quantity}} {{unit}}<br>
              السعر: {{price}} دينار
            </div>
            {{/each}}
          </div>

          <p style="margin-top: 30px;">
            <a href="{{orderUrl}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              عرض تفاصيل الطلب
            </a>
          </p>
        </div>
      `,
      text: `تم استلام طلبك #{{orderNumber}} بنجاح. المبلغ الإجمالي: {{totalAmount}} دينار. موعد التوصيل: {{deliveryDate}}.`
    })

    this.templates.set('en:order_confirmation', {
      subject: 'Order Confirmation #{{orderNumber}}',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>Your order has been received!</h2>
          <p>Hi {{customerName}},</p>
          <p>Thank you for your order. Order <strong>#{{orderNumber}}</strong> has been successfully received.</p>

          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Order Details:</h3>
            <ul>
              <li>Supplier: {{supplierName}}</li>
              <li>Total Amount: {{totalAmount}} JOD</li>
              <li>Delivery Date: {{deliveryDate}}</li>
              <li>Delivery Address: {{deliveryAddress}}</li>
            </ul>
          </div>

          <div style="margin-top: 20px;">
            <h4>Items:</h4>
            {{#each items}}
            <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
              <strong>{{name}}</strong><br>
              Quantity: {{quantity}} {{unit}}<br>
              Price: {{price}} JOD
            </div>
            {{/each}}
          </div>

          <p style="margin-top: 30px;">
            <a href="{{orderUrl}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Order Details
            </a>
          </p>
        </div>
      `,
      text: `Your order #{{orderNumber}} has been received. Total: {{totalAmount}} JOD. Delivery: {{deliveryDate}}.`
    })

    // Delivery PIN template
    this.templates.set('ar:delivery_pin', {
      subject: 'رمز تأكيد التوصيل - الطلب #{{orderNumber}}',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>رمز تأكيد التوصيل</h2>
          <p>مرحباً {{customerName}}،</p>
          <p>السائق في طريقه لتوصيل طلبك.</p>

          <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
            <h1 style="color: #d97706; margin: 0;">{{pin}}</h1>
            <p style="margin: 10px 0 0 0;">رمز التأكيد</p>
          </div>

          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4>معلومات السائق:</h4>
            <ul>
              <li>الاسم: {{driverName}}</li>
              <li>رقم الهاتف: {{driverPhone}}</li>
              <li>الوقت المتوقع للوصول: {{estimatedTime}}</li>
            </ul>
          </div>

          <p style="color: #dc2626;">
            <strong>تنبيه:</strong> لا تشارك هذا الرمز مع أي شخص غير السائق المعتمد.
          </p>
        </div>
      `,
      text: `رمز تأكيد التوصيل للطلب #{{orderNumber}}: {{pin}}. السائق: {{driverName}}, هاتف: {{driverPhone}}`
    })

    this.templates.set('en:delivery_pin', {
      subject: 'Delivery PIN - Order #{{orderNumber}}',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>Delivery Confirmation PIN</h2>
          <p>Hi {{customerName}},</p>
          <p>Your driver is on the way to deliver your order.</p>

          <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
            <h1 style="color: #d97706; margin: 0;">{{pin}}</h1>
            <p style="margin: 10px 0 0 0;">Confirmation PIN</p>
          </div>

          <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h4>Driver Information:</h4>
            <ul>
              <li>Name: {{driverName}}</li>
              <li>Phone: {{driverPhone}}</li>
              <li>Estimated Arrival: {{estimatedTime}}</li>
            </ul>
          </div>

          <p style="color: #dc2626;">
            <strong>Warning:</strong> Do not share this PIN with anyone except the authorized driver.
          </p>
        </div>
      `,
      text: `Delivery PIN for order #{{orderNumber}}: {{pin}}. Driver: {{driverName}}, Phone: {{driverPhone}}`
    })

    // Payment success template
    this.templates.set('ar:payment_success', {
      subject: 'تأكيد الدفع - الطلب #{{orderNumber}}',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>تم الدفع بنجاح!</h2>
          <p>مرحباً {{customerName}}،</p>
          <p>تم استلام دفعتك للطلب رقم <strong>#{{orderNumber}}</strong> بنجاح.</p>

          <div style="background: #dcfce7; border: 1px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>تفاصيل الدفع:</h3>
            <ul>
              <li>المبلغ: {{amount}} دينار أردني</li>
              <li>طريقة الدفع: {{paymentMethod}}</li>
              <li>رقم المعاملة: {{transactionId}}</li>
            </ul>
          </div>

          <p>سيتم الاحتفاظ بالمبلغ في حساب الضمان حتى تأكيد استلام الطلب.</p>

          <p style="margin-top: 30px;">
            <a href="{{receiptUrl}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              عرض الإيصال
            </a>
          </p>
        </div>
      `,
      text: `تم الدفع بنجاح للطلب #{{orderNumber}}. المبلغ: {{amount}} دينار. رقم المعاملة: {{transactionId}}`
    })

    this.templates.set('en:payment_success', {
      subject: 'Payment Confirmation - Order #{{orderNumber}}',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>Payment Successful!</h2>
          <p>Hi {{customerName}},</p>
          <p>Your payment for order <strong>#{{orderNumber}}</strong> has been successfully received.</p>

          <div style="background: #dcfce7; border: 1px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Payment Details:</h3>
            <ul>
              <li>Amount: {{amount}} JOD</li>
              <li>Payment Method: {{paymentMethod}}</li>
              <li>Transaction ID: {{transactionId}}</li>
            </ul>
          </div>

          <p>The amount will be held in escrow until delivery confirmation.</p>

          <p style="margin-top: 30px;">
            <a href="{{receiptUrl}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View Receipt
            </a>
          </p>
        </div>
      `,
      text: `Payment successful for order #{{orderNumber}}. Amount: {{amount}} JOD. Transaction: {{transactionId}}`
    })

    // Dispute created template
    this.templates.set('ar:dispute_created', {
      subject: 'تم فتح نزاع - الطلب #{{orderNumber}}',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>تم استلام بلاغ النزاع</h2>
          <p>مرحباً {{customerName}}،</p>
          <p>تم استلام بلاغك بخصوص الطلب رقم <strong>#{{orderNumber}}</strong>.</p>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>تفاصيل النزاع:</h3>
            <ul>
              <li>رقم النزاع: {{disputeId}}</li>
              <li>السبب: {{reason}}</li>
              <li>الحالة: قيد المراجعة</li>
            </ul>
          </div>

          <p>سيقوم فريق ضمان الجودة بمراجعة النزاع والتواصل معك خلال 24 ساعة.</p>
          <p>تم تجميد المبلغ المدفوع حتى حل النزاع.</p>

          <p style="margin-top: 30px;">
            <a href="{{disputeUrl}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              متابعة النزاع
            </a>
          </p>
        </div>
      `,
      text: `تم فتح نزاع للطلب #{{orderNumber}}. رقم النزاع: {{disputeId}}. السبب: {{reason}}`
    })

    this.templates.set('en:dispute_created', {
      subject: 'Dispute Opened - Order #{{orderNumber}}',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>Dispute Report Received</h2>
          <p>Hi {{customerName}},</p>
          <p>Your dispute for order <strong>#{{orderNumber}}</strong> has been received.</p>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Dispute Details:</h3>
            <ul>
              <li>Dispute ID: {{disputeId}}</li>
              <li>Reason: {{reason}}</li>
              <li>Status: Under Review</li>
            </ul>
          </div>

          <p>Our QC team will review the dispute and contact you within 24 hours.</p>
          <p>The payment has been frozen until the dispute is resolved.</p>

          <p style="margin-top: 30px;">
            <a href="{{disputeUrl}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Track Dispute
            </a>
          </p>
        </div>
      `,
      text: `Dispute opened for order #{{orderNumber}}. Dispute ID: {{disputeId}}. Reason: {{reason}}`
    })

    // New order for supplier
    this.templates.set('ar:new_order', {
      subject: 'طلب جديد #{{orderNumber}}',
      html: `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>لديك طلب جديد!</h2>
          <p>تم استلام طلب جديد من {{customerName}}.</p>

          <div style="background: #dcfce7; border: 1px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>تفاصيل الطلب:</h3>
            <ul>
              <li>رقم الطلب: #{{orderNumber}}</li>
              <li>العميل: {{customerName}}</li>
              <li>المبلغ الإجمالي: {{totalAmount}} دينار أردني</li>
              <li>عدد المنتجات: {{itemCount}}</li>
              <li>موعد التوصيل المطلوب: {{deliveryDate}}</li>
            </ul>
          </div>

          <p style="margin-top: 30px;">
            <a href="{{orderUrl}}" style="background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              عرض الطلب والموافقة
            </a>
          </p>
        </div>
      `,
      text: `طلب جديد #{{orderNumber}} من {{customerName}}. المبلغ: {{totalAmount}} دينار. التوصيل: {{deliveryDate}}`
    })

    this.templates.set('en:new_order', {
      subject: 'New Order #{{orderNumber}}',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <h2>You have a new order!</h2>
          <p>New order received from {{customerName}}.</p>

          <div style="background: #dcfce7; border: 1px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 5px;">
            <h3>Order Details:</h3>
            <ul>
              <li>Order Number: #{{orderNumber}}</li>
              <li>Customer: {{customerName}}</li>
              <li>Total Amount: {{totalAmount}} JOD</li>
              <li>Items: {{itemCount}}</li>
              <li>Delivery Date: {{deliveryDate}}</li>
            </ul>
          </div>

          <p style="margin-top: 30px;">
            <a href="{{orderUrl}}" style="background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              View & Accept Order
            </a>
          </p>
        </div>
      `,
      text: `New order #{{orderNumber}} from {{customerName}}. Amount: {{totalAmount}} JOD. Delivery: {{deliveryDate}}`
    })
  }

  render(
    type: NotificationType,
    language: 'ar' | 'en',
    data: TemplateData
  ): EmailTemplate {
    const key = `${language}:${type}`
    const template = this.templates.get(key)

    if (!template) {
      throw new Error(`Template not found: ${key}`)
    }

    return {
      subject: this.interpolate(template.subject, data),
      html: this.interpolate(template.html, data),
      text: template.text ? this.interpolate(template.text, data) : undefined
    }
  }

  private interpolate(template: string, data: TemplateData): string {
    // Simple template interpolation
    let result = template

    // Replace simple variables: {{variable}}
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key.trim())
      return value !== undefined ? String(value) : match
    })

    // Handle conditional blocks: {{#if condition}}...{{/if}}
    result = result.replace(
      /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (match, condition, content) => {
        const value = this.getNestedValue(data, condition.trim())
        return value ? content : ''
      }
    )

    // Handle each loops: {{#each items}}...{{/each}}
    result = result.replace(
      /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
      (match, arrayKey, template) => {
        const array = this.getNestedValue(data, arrayKey.trim())
        if (!Array.isArray(array)) return ''

        return array
          .map(item => {
            let itemResult = template
            // Replace item properties
            itemResult = itemResult.replace(/\{\{([^}]+)\}\}/g, (m, key) => {
              const value = this.getNestedValue(item, key.trim())
              return value !== undefined ? String(value) : m
            })
            return itemResult
          })
          .join('')
      }
    )

    return result
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.')
    let current = obj

    for (const key of keys) {
      if (current === null || current === undefined) return undefined
      current = current[key]
    }

    return current
  }
}

// SMS template renderer
export class SMSTemplateRenderer {
  private templates: Map<string, string> = new Map()

  constructor() {
    this.loadTemplates()
  }

  private loadTemplates() {
    // Arabic SMS templates (keep them short for SMS)
    this.templates.set('ar:order_confirmation',
      'تم استلام طلبك #{{orderNumber}}. المبلغ: {{totalAmount}} دينار. التوصيل: {{deliveryDate}}'
    )

    this.templates.set('ar:delivery_pin',
      'رمز التوصيل للطلب #{{orderNumber}}: {{pin}}. لا تشاركه مع أحد غير السائق.'
    )

    this.templates.set('ar:delivery_started',
      'بدأ توصيل طلبك #{{orderNumber}}. السائق: {{driverName}} {{driverPhone}}'
    )

    this.templates.set('ar:payment_success',
      'تم الدفع بنجاح للطلب #{{orderNumber}}. المبلغ: {{amount}} دينار.'
    )

    // English SMS templates
    this.templates.set('en:order_confirmation',
      'Order #{{orderNumber}} received. Total: {{totalAmount}} JOD. Delivery: {{deliveryDate}}'
    )

    this.templates.set('en:delivery_pin',
      'Delivery PIN for order #{{orderNumber}}: {{pin}}. Share only with driver.'
    )

    this.templates.set('en:delivery_started',
      'Delivery started for order #{{orderNumber}}. Driver: {{driverName}} {{driverPhone}}'
    )

    this.templates.set('en:payment_success',
      'Payment successful for order #{{orderNumber}}. Amount: {{amount}} JOD.'
    )
  }

  render(
    type: NotificationType,
    language: 'ar' | 'en',
    data: TemplateData
  ): string {
    const key = `${language}:${type}`
    const template = this.templates.get(key)

    if (!template) {
      throw new Error(`SMS template not found: ${key}`)
    }

    return this.interpolate(template, data)
  }

  private interpolate(template: string, data: TemplateData): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = data[key.trim()]
      return value !== undefined ? String(value) : match
    })
  }
}