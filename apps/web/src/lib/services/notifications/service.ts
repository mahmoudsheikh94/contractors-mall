/**
 * Notification Service
 * ===================
 * Main service that orchestrates all notification operations
 */

import {
  Notification,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  NotificationPreferences,
  EmailNotification,
  SMSNotification,
  NotificationError,
  NotificationErrorCode
} from './types'
import { notificationQueue } from './queue'
import { TemplateRenderer, SMSTemplateRenderer } from './templates'
import { createClient } from '@/lib/supabase/server'

export class NotificationService {
  private emailTemplates: TemplateRenderer
  private smsTemplates: SMSTemplateRenderer
  private static instance: NotificationService

  private constructor() {
    this.emailTemplates = new TemplateRenderer()
    this.smsTemplates = new SMSTemplateRenderer()
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService()
    }
    return NotificationService.instance
  }

  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(params: {
    orderId: string
    orderNumber: string
    customerId: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    supplierName: string
    totalAmount: number
    deliveryDate: string
    deliveryAddress: string
    items: Array<{
      name: string
      quantity: number
      unit: string
      price: number
    }>
  }) {
    const preferences = await this.getUserPreferences(params.customerId)
    const notifications: Notification[] = []

    // Prepare template data
    const templateData = {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      supplierName: params.supplierName,
      totalAmount: params.totalAmount.toFixed(2),
      deliveryDate: params.deliveryDate,
      deliveryAddress: params.deliveryAddress,
      items: params.items,
      orderUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${params.orderId}`
    }

    // Email notification
    if (preferences.email.enabled && preferences.email.types.includes(NotificationType.ORDER_CONFIRMATION)) {
      const emailTemplate = this.emailTemplates.render(
        NotificationType.ORDER_CONFIRMATION,
        preferences.language,
        templateData
      )

      notifications.push({
        id: `email-order-${params.orderId}-${Date.now()}`,
        type: NotificationType.ORDER_CONFIRMATION,
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.HIGH,
        recipient: {
          id: params.customerId,
          email: params.customerEmail,
          name: params.customerName,
          language: preferences.language
        },
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        data: templateData
      } as EmailNotification)
    }

    // SMS notification
    if (params.customerPhone && preferences.sms.enabled &&
        preferences.sms.types.includes(NotificationType.ORDER_CONFIRMATION)) {
      const smsMessage = this.smsTemplates.render(
        NotificationType.ORDER_CONFIRMATION,
        preferences.language,
        templateData
      )

      notifications.push({
        id: `sms-order-${params.orderId}-${Date.now()}`,
        type: NotificationType.ORDER_CONFIRMATION,
        channel: NotificationChannel.SMS,
        priority: NotificationPriority.HIGH,
        recipient: {
          id: params.customerId,
          phone: params.customerPhone,
          name: params.customerName,
          language: preferences.language
        },
        message: smsMessage,
        data: templateData
      } as SMSNotification)
    }

    // Send notifications
    return this.sendBatch(notifications)
  }

  /**
   * Send delivery PIN notification
   */
  async sendDeliveryPIN(params: {
    orderId: string
    orderNumber: string
    customerId: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    pin: string
    driverName: string
    driverPhone: string
    estimatedTime: string
  }) {
    const preferences = await this.getUserPreferences(params.customerId)
    const notifications: Notification[] = []

    const templateData = {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      pin: params.pin,
      driverName: params.driverName,
      driverPhone: params.driverPhone,
      estimatedTime: params.estimatedTime
    }

    // Email notification (optional for PIN)
    if (preferences.email.enabled && preferences.email.types.includes(NotificationType.DELIVERY_PIN)) {
      const emailTemplate = this.emailTemplates.render(
        NotificationType.DELIVERY_PIN,
        preferences.language,
        templateData
      )

      notifications.push({
        id: `email-pin-${params.orderId}-${Date.now()}`,
        type: NotificationType.DELIVERY_PIN,
        channel: NotificationChannel.EMAIL,
        priority: NotificationPriority.CRITICAL,
        recipient: {
          id: params.customerId,
          email: params.customerEmail,
          name: params.customerName,
          language: preferences.language
        },
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        data: templateData
      } as EmailNotification)
    }

    // SMS notification (critical for PIN)
    if (params.customerPhone) {
      const smsMessage = this.smsTemplates.render(
        NotificationType.DELIVERY_PIN,
        preferences.language,
        templateData
      )

      notifications.push({
        id: `sms-pin-${params.orderId}-${Date.now()}`,
        type: NotificationType.DELIVERY_PIN,
        channel: NotificationChannel.SMS,
        priority: NotificationPriority.CRITICAL, // Always send PIN via SMS regardless of preferences
        recipient: {
          id: params.customerId,
          phone: params.customerPhone,
          name: params.customerName,
          language: preferences.language
        },
        message: smsMessage,
        data: templateData
      } as SMSNotification)
    }

    return this.sendBatch(notifications)
  }

  /**
   * Send payment success notification
   */
  async sendPaymentSuccess(params: {
    orderId: string
    orderNumber: string
    customerId: string
    customerName: string
    customerEmail: string
    amount: number
    paymentMethod: string
    transactionId: string
  }) {
    const preferences = await this.getUserPreferences(params.customerId)

    const templateData = {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      amount: params.amount.toFixed(2),
      paymentMethod: params.paymentMethod,
      transactionId: params.transactionId,
      receiptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${params.orderId}/receipt`
    }

    const emailTemplate = this.emailTemplates.render(
      NotificationType.PAYMENT_SUCCESS,
      preferences.language,
      templateData
    )

    const notification: EmailNotification = {
      id: `payment-${params.orderId}-${Date.now()}`,
      type: NotificationType.PAYMENT_SUCCESS,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.HIGH,
      recipient: {
        id: params.customerId,
        email: params.customerEmail,
        name: params.customerName,
        language: preferences.language
      },
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      data: templateData
    }

    return this.send(notification)
  }

  /**
   * Send dispute created notification
   */
  async sendDisputeCreated(params: {
    orderId: string
    orderNumber: string
    disputeId: string
    customerId: string
    customerName: string
    customerEmail: string
    reason: string
  }) {
    const preferences = await this.getUserPreferences(params.customerId)

    const templateData = {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      disputeId: params.disputeId,
      reason: params.reason,
      disputeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/disputes/${params.disputeId}`
    }

    const emailTemplate = this.emailTemplates.render(
      NotificationType.DISPUTE_CREATED,
      preferences.language,
      templateData
    )

    const notification: EmailNotification = {
      id: `dispute-${params.disputeId}-${Date.now()}`,
      type: NotificationType.DISPUTE_CREATED,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.HIGH,
      recipient: {
        id: params.customerId,
        email: params.customerEmail,
        name: params.customerName,
        language: preferences.language
      },
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      data: templateData
    }

    return this.send(notification)
  }

  /**
   * Send new order notification to supplier
   */
  async sendNewOrderToSupplier(params: {
    orderId: string
    orderNumber: string
    supplierId: string
    supplierEmail: string
    supplierName: string
    customerName: string
    totalAmount: number
    itemCount: number
    deliveryDate: string
  }) {
    const preferences = await this.getSupplierPreferences(params.supplierId)

    const templateData = {
      orderNumber: params.orderNumber,
      customerName: params.customerName,
      totalAmount: params.totalAmount.toFixed(2),
      itemCount: params.itemCount,
      deliveryDate: params.deliveryDate,
      orderUrl: `${process.env.NEXT_PUBLIC_ADMIN_URL}/supplier/orders/${params.orderId}`
    }

    const emailTemplate = this.emailTemplates.render(
      NotificationType.NEW_ORDER,
      preferences.language,
      templateData
    )

    const notification: EmailNotification = {
      id: `new-order-${params.orderId}-${Date.now()}`,
      type: NotificationType.NEW_ORDER,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.HIGH,
      recipient: {
        id: params.supplierId,
        email: params.supplierEmail,
        name: params.supplierName,
        language: preferences.language
      },
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      data: templateData
    }

    return this.send(notification)
  }

  /**
   * Send a single notification
   */
  async send(notification: Notification): Promise<string> {
    try {
      // Validate notification
      this.validateNotification(notification)

      // Store notification in database
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('notifications')
        .insert({
          id: notification.id,
          type: notification.type,
          channel: notification.channel,
          priority: notification.priority,
          recipient_id: notification.recipient.id,
          recipient_email: notification.recipient.email,
          recipient_phone: notification.recipient.phone,
          data: notification.data,
          scheduled_for: notification.scheduledFor,
          expires_at: notification.expiresAt,
          metadata: notification.metadata,
          status: 'pending'
        })
        .select('id')
        .single()

      if (error) throw error

      // Add to queue
      const jobId = await notificationQueue.enqueue(notification)

      return jobId
    } catch (error: any) {
      console.error('Failed to send notification:', error)
      throw new NotificationError(
        'Failed to send notification',
        NotificationErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  /**
   * Send multiple notifications
   */
  async sendBatch(notifications: Notification[]): Promise<string[]> {
    const jobIds: string[] = []

    for (const notification of notifications) {
      try {
        const jobId = await this.send(notification)
        jobIds.push(jobId)
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    return jobIds
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const supabase = await createClient()

    const { data } = await (supabase as any)
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Return default preferences if none found
    return (data as any) || {
      userId,
      email: {
        enabled: true,
        types: Object.values(NotificationType) as NotificationType[],
        frequency: 'instant'
      },
      sms: {
        enabled: true,
        types: [
          NotificationType.DELIVERY_PIN,
          NotificationType.DELIVERY_STARTED,
          NotificationType.ORDER_CONFIRMATION
        ],
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      },
      push: {
        enabled: false,
        types: []
      },
      language: 'ar',
      timezone: 'Asia/Amman'
    }
  }

  /**
   * Get supplier notification preferences
   */
  private async getSupplierPreferences(supplierId: string): Promise<NotificationPreferences> {
    const supabase = await createClient()

    const { data } = await (supabase as any)
      .from('supplier_notification_preferences')
      .select('*')
      .eq('supplier_id', supplierId)
      .single()

    // Return default preferences if none found
    return (data as any) || {
      userId: supplierId,
      email: {
        enabled: true,
        types: Object.values(NotificationType) as NotificationType[],
        frequency: 'instant'
      },
      sms: {
        enabled: true,
        types: [
          NotificationType.NEW_ORDER,
          NotificationType.DISPUTE_CREATED
        ]
      },
      push: {
        enabled: false,
        types: []
      },
      language: 'ar',
      timezone: 'Asia/Amman'
    }
  }

  /**
   * Validate notification
   */
  private validateNotification(notification: Notification) {
    if (!notification.recipient.email && !notification.recipient.phone) {
      throw new NotificationError(
        'Recipient must have either email or phone',
        NotificationErrorCode.INVALID_RECIPIENT,
        400
      )
    }

    if (notification.channel === NotificationChannel.EMAIL && !notification.recipient.email) {
      throw new NotificationError(
        'Email recipient required for email notifications',
        NotificationErrorCode.INVALID_EMAIL_ADDRESS,
        400
      )
    }

    if (notification.channel === NotificationChannel.SMS && !notification.recipient.phone) {
      throw new NotificationError(
        'Phone number required for SMS notifications',
        NotificationErrorCode.INVALID_PHONE_NUMBER,
        400
      )
    }
  }

  /**
   * Start notification queue processing
   */
  async startQueue() {
    await notificationQueue.start()
  }

  /**
   * Stop notification queue processing
   */
  async stopQueue() {
    await notificationQueue.stop()
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return notificationQueue.getStats()
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance()