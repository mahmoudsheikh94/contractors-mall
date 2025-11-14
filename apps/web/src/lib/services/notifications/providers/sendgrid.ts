/**
 * SendGrid Email Provider
 * =======================
 * Implements email sending functionality using SendGrid API
 */

import sgMail from '@sendgrid/mail'
import {
  EmailNotification,
  NotificationError,
  NotificationErrorCode,
  NotificationStatus,
  DeliveryReport
} from '../types'

export class SendGridProvider {
  private apiKey: string
  private fromEmail: string
  private fromName: string
  private sandboxMode: boolean

  constructor(config: {
    apiKey: string
    fromEmail: string
    fromName: string
    sandboxMode?: boolean
  }) {
    this.apiKey = config.apiKey
    this.fromEmail = config.fromEmail
    this.fromName = config.fromName
    this.sandboxMode = config.sandboxMode || false

    // Initialize SendGrid
    sgMail.setApiKey(this.apiKey)
  }

  async send(notification: EmailNotification): Promise<DeliveryReport> {
    try {
      const msg = {
        to: notification.recipient.email!,
        from: {
          email: notification.from?.email || this.fromEmail,
          name: notification.from?.name || this.fromName
        },
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
        cc: notification.cc,
        bcc: notification.bcc,
        replyTo: notification.replyTo,
        attachments: notification.attachments?.map(att => ({
          content: att.content?.toString('base64') || '',
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment'
        })),
        mailSettings: {
          sandboxMode: {
            enable: this.sandboxMode
          }
        },
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true
          },
          openTracking: {
            enable: true
          }
        },
        customArgs: {
          notificationId: notification.id || '',
          notificationType: notification.type
        }
      }

      const [response] = await sgMail.send(msg as any)

      return {
        notificationId: notification.id!,
        channel: notification.channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date(),
        providerMessageId: response.headers['x-message-id'] as string
      }
    } catch (error: any) {
      console.error('SendGrid error:', error)

      // Parse SendGrid error
      let errorCode = NotificationErrorCode.PROVIDER_ERROR
      let errorMessage = error.message

      if (error.code === 400) {
        errorCode = NotificationErrorCode.INVALID_EMAIL_ADDRESS
      } else if (error.code === 429) {
        errorCode = NotificationErrorCode.RATE_LIMIT_EXCEEDED
      } else if (error.code === 413) {
        errorCode = NotificationErrorCode.QUOTA_EXCEEDED
      }

      throw new NotificationError(
        errorMessage,
        errorCode,
        error.code || 500,
        error.response?.body
      )
    }
  }

  async sendBatch(notifications: EmailNotification[]): Promise<DeliveryReport[]> {
    const results: DeliveryReport[] = []

    // SendGrid supports batch sending up to 1000 recipients
    const batches = this.chunkArray(notifications, 1000)

    for (const batch of batches) {
      const messages = batch.map(notification => ({
        to: notification.recipient.email!,
        from: {
          email: notification.from?.email || this.fromEmail,
          name: notification.from?.name || this.fromName
        },
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
        cc: notification.cc,
        bcc: notification.bcc,
        replyTo: notification.replyTo,
        attachments: notification.attachments?.map(att => ({
          content: att.content?.toString('base64') || '',
          filename: att.filename,
          type: att.contentType,
          disposition: 'attachment'
        })),
        mailSettings: {
          sandboxMode: {
            enable: this.sandboxMode
          }
        },
        customArgs: {
          notificationId: notification.id || '',
          notificationType: notification.type
        }
      }))

      try {
        const [response] = await sgMail.send(messages as any)

        batch.forEach(notification => {
          results.push({
            notificationId: notification.id!,
            channel: notification.channel,
            status: NotificationStatus.SENT,
            deliveredAt: new Date(),
            providerMessageId: response.headers['x-message-id'] as string
          })
        })
      } catch (error: any) {
        // On batch error, mark all as failed
        batch.forEach(notification => {
          results.push({
            notificationId: notification.id!,
            channel: notification.channel,
            status: NotificationStatus.FAILED,
            errorCode: NotificationErrorCode.PROVIDER_ERROR,
            errorMessage: error.message
          })
        })
      }
    }

    return results
  }

  async validateEmail(email: string): Promise<boolean> {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  async handleWebhook(payload: any): Promise<void> {
    // Process SendGrid webhook events
    const events = Array.isArray(payload) ? payload : [payload]

    for (const event of events) {
      const notificationId = event.unique_args?.notificationId

      if (!notificationId) continue

      switch (event.event) {
        case 'delivered':
          // Update notification status to delivered
          console.log(`Email ${notificationId} delivered`)
          break

        case 'open':
          // Track email open
          console.log(`Email ${notificationId} opened`)
          break

        case 'click':
          // Track link click
          console.log(`Email ${notificationId} link clicked:`, event.url)
          break

        case 'bounce':
          // Handle bounce
          console.log(`Email ${notificationId} bounced:`, event.reason)
          break

        case 'unsubscribe':
          // Handle unsubscribe
          console.log(`Email ${notificationId} recipient unsubscribed`)
          break

        case 'spam_report':
          // Handle spam report
          console.log(`Email ${notificationId} marked as spam`)
          break
      }
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// Alternative: Resend Provider (simpler alternative to SendGrid)
export class ResendProvider {
  private apiKey: string
  private fromEmail: string
  private fromName: string

  constructor(config: {
    apiKey: string
    fromEmail: string
    fromName: string
  }) {
    this.apiKey = config.apiKey
    this.fromEmail = config.fromEmail
    this.fromName = config.fromName
  }

  async send(notification: EmailNotification): Promise<DeliveryReport> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: `${notification.from?.name || this.fromName} <${notification.from?.email || this.fromEmail}>`,
          to: notification.recipient.email,
          subject: notification.subject,
          html: notification.html,
          text: notification.text,
          cc: notification.cc,
          bcc: notification.bcc,
          reply_to: notification.replyTo,
          attachments: notification.attachments?.map(att => ({
            filename: att.filename,
            content: att.content?.toString('base64')
          })),
          tags: {
            notification_id: notification.id,
            notification_type: notification.type
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new NotificationError(
          error.message || 'Failed to send email',
          NotificationErrorCode.PROVIDER_ERROR,
          response.status,
          error
        )
      }

      const data = await response.json()

      return {
        notificationId: notification.id!,
        channel: notification.channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date(),
        providerMessageId: data.id
      }
    } catch (error: any) {
      if (error instanceof NotificationError) throw error

      throw new NotificationError(
        'Failed to send email via Resend',
        NotificationErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  async sendBatch(notifications: EmailNotification[]): Promise<DeliveryReport[]> {
    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(
          notifications.map(notification => ({
            from: `${notification.from?.name || this.fromName} <${notification.from?.email || this.fromEmail}>`,
            to: notification.recipient.email,
            subject: notification.subject,
            html: notification.html,
            text: notification.text,
            cc: notification.cc,
            bcc: notification.bcc,
            reply_to: notification.replyTo,
            tags: {
              notification_id: notification.id,
              notification_type: notification.type
            }
          }))
        )
      })

      if (!response.ok) {
        const error = await response.json()
        throw new NotificationError(
          error.message || 'Failed to send batch emails',
          NotificationErrorCode.PROVIDER_ERROR,
          response.status,
          error
        )
      }

      const data = await response.json()

      return notifications.map((notification, index) => ({
        notificationId: notification.id!,
        channel: notification.channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date(),
        providerMessageId: data.data[index].id
      }))
    } catch (error: any) {
      if (error instanceof NotificationError) throw error

      throw new NotificationError(
        'Failed to send batch emails via Resend',
        NotificationErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }
}