/**
 * Twilio SMS Provider
 * ===================
 * Implements SMS sending functionality using Twilio API
 */

import twilio from 'twilio'
import {
  SMSNotification,
  NotificationError,
  NotificationErrorCode,
  NotificationStatus,
  DeliveryReport
} from '../types'

export class TwilioProvider {
  private client: twilio.Twilio
  private fromNumber: string
  private sandboxMode: boolean

  constructor(config: {
    accountSid: string
    authToken: string
    fromNumber: string
    sandboxMode?: boolean
  }) {
    this.client = twilio(config.accountSid, config.authToken)
    this.fromNumber = config.fromNumber
    this.sandboxMode = config.sandboxMode || false
  }

  async send(notification: SMSNotification): Promise<DeliveryReport> {
    try {
      // Validate phone number format
      const phone = this.formatPhoneNumber(notification.recipient.phone!)

      if (!this.isValidPhoneNumber(phone)) {
        throw new NotificationError(
          'Invalid phone number format',
          NotificationErrorCode.INVALID_PHONE_NUMBER,
          400
        )
      }

      // Handle sandbox mode
      if (this.sandboxMode) {
        console.log(`[SANDBOX] SMS to ${phone}: ${notification.message}`)
        return {
          notificationId: notification.id!,
          channel: notification.channel,
          status: NotificationStatus.SENT,
          deliveredAt: new Date(),
          providerMessageId: `sandbox-${Date.now()}`
        }
      }

      // Send SMS via Twilio
      const message = await this.client.messages.create({
        body: notification.message,
        from: notification.sender || this.fromNumber,
        to: phone,
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL // For delivery reports
      })

      return {
        notificationId: notification.id!,
        channel: notification.channel,
        status: this.mapTwilioStatus(message.status),
        deliveredAt: message.status === 'delivered' ? new Date() : undefined,
        providerMessageId: message.sid
      }
    } catch (error: any) {
      console.error('Twilio error:', error)

      // Parse Twilio error codes
      let errorCode = NotificationErrorCode.PROVIDER_ERROR
      let errorMessage = error.message

      if (error.code === 21211) {
        errorCode = NotificationErrorCode.INVALID_PHONE_NUMBER
        errorMessage = 'Invalid phone number'
      } else if (error.code === 21608) {
        errorCode = NotificationErrorCode.UNSUBSCRIBED
        errorMessage = 'Phone number has opted out'
      } else if (error.code === 21610) {
        errorCode = NotificationErrorCode.BLOCKED
        errorMessage = 'Phone number is blocked'
      } else if (error.code === 20429) {
        errorCode = NotificationErrorCode.RATE_LIMIT_EXCEEDED
        errorMessage = 'Too many requests'
      }

      throw new NotificationError(
        errorMessage,
        errorCode,
        error.status || 500,
        { twilioCode: error.code }
      )
    }
  }

  async sendBatch(notifications: SMSNotification[]): Promise<DeliveryReport[]> {
    const results: DeliveryReport[] = []

    // Twilio doesn't support true batch sending, so we send sequentially
    // with rate limiting to avoid hitting API limits
    for (const notification of notifications) {
      try {
        const result = await this.send(notification)
        results.push(result)

        // Add small delay to respect rate limits (1 message per second)
        await this.delay(1000)
      } catch (error: any) {
        results.push({
          notificationId: notification.id!,
          channel: notification.channel,
          status: NotificationStatus.FAILED,
          errorCode: error.code || NotificationErrorCode.PROVIDER_ERROR,
          errorMessage: error.message
        })
      }
    }

    return results
  }

  async validatePhoneNumber(phone: string): Promise<{
    valid: boolean
    carrier?: string
    type?: string
    countryCode?: string
  }> {
    try {
      const phoneNumber = await this.client.lookups.v2
        .phoneNumbers(phone)
        .fetch({ fields: 'line_type_intelligence' })

      return {
        valid: true,
        carrier: phoneNumber.carrier?.name,
        type: phoneNumber.carrier?.type,
        countryCode: phoneNumber.countryCode
      }
    } catch (error) {
      return { valid: false }
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    // Validate webhook signature
    const authToken = process.env.TWILIO_AUTH_TOKEN!
    const url = process.env.TWILIO_WEBHOOK_URL!

    const isValid = twilio.validateRequest(
      authToken,
      signature,
      url,
      payload
    )

    if (!isValid) {
      throw new NotificationError(
        'Invalid webhook signature',
        NotificationErrorCode.PROVIDER_ERROR,
        401
      )
    }

    // Process status update
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload

    console.log(`SMS ${MessageSid} status: ${MessageStatus}`)

    if (ErrorCode) {
      console.error(`SMS ${MessageSid} error: ${ErrorCode} - ${ErrorMessage}`)
    }

    // Update notification status in database
    // This would be handled by the notification service
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // Add Jordan country code if not present
    if (!cleaned.startsWith('962') && cleaned.length === 9) {
      cleaned = '962' + cleaned
    }

    // Add + prefix if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }

    return cleaned
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic validation for Jordan phone numbers
    // Format: +962XXXXXXXXX (12 digits total)
    const jordanPhoneRegex = /^\+962[0-9]{9}$/
    return jordanPhoneRegex.test(phone)
  }

  private mapTwilioStatus(status: string): NotificationStatus {
    const statusMap: Record<string, NotificationStatus> = {
      'queued': NotificationStatus.QUEUED,
      'sending': NotificationStatus.SENDING,
      'sent': NotificationStatus.SENT,
      'delivered': NotificationStatus.DELIVERED,
      'failed': NotificationStatus.FAILED,
      'undelivered': NotificationStatus.FAILED
    }

    return statusMap[status] || NotificationStatus.PENDING
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Alternative: Vonage (Nexmo) Provider
export class VonageProvider {
  private apiKey: string
  private apiSecret: string
  private fromNumber: string

  constructor(config: {
    apiKey: string
    apiSecret: string
    fromNumber: string
  }) {
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.fromNumber = config.fromNumber
  }

  async send(notification: SMSNotification): Promise<DeliveryReport> {
    try {
      const phone = this.formatPhoneNumber(notification.recipient.phone!)

      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          api_key: this.apiKey,
          api_secret: this.apiSecret,
          to: phone,
          from: notification.sender || this.fromNumber,
          text: notification.message,
          type: notification.unicode ? 'unicode' : 'text'
        })
      })

      if (!response.ok) {
        throw new NotificationError(
          'Failed to send SMS via Vonage',
          NotificationErrorCode.PROVIDER_ERROR,
          response.status
        )
      }

      const data = await response.json()
      const message = data.messages[0]

      if (message.status !== '0') {
        throw new NotificationError(
          message['error-text'] || 'Failed to send SMS',
          this.mapVonageErrorCode(message.status),
          400,
          { vonageStatus: message.status }
        )
      }

      return {
        notificationId: notification.id!,
        channel: notification.channel,
        status: NotificationStatus.SENT,
        deliveredAt: new Date(),
        providerMessageId: message['message-id']
      }
    } catch (error: any) {
      if (error instanceof NotificationError) throw error

      throw new NotificationError(
        'Failed to send SMS via Vonage',
        NotificationErrorCode.PROVIDER_ERROR,
        500,
        error
      )
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '')

    // Add Jordan country code if not present
    if (!cleaned.startsWith('962') && cleaned.length === 9) {
      cleaned = '962' + cleaned
    }

    return cleaned
  }

  private mapVonageErrorCode(status: string): NotificationErrorCode {
    const errorMap: Record<string, NotificationErrorCode> = {
      '1': NotificationErrorCode.RATE_LIMIT_EXCEEDED,
      '3': NotificationErrorCode.INVALID_PHONE_NUMBER,
      '4': NotificationErrorCode.INVALID_PHONE_NUMBER,
      '5': NotificationErrorCode.PROVIDER_ERROR,
      '6': NotificationErrorCode.PROVIDER_ERROR,
      '7': NotificationErrorCode.BLOCKED,
      '8': NotificationErrorCode.QUOTA_EXCEEDED,
      '9': NotificationErrorCode.QUOTA_EXCEEDED,
      '10': NotificationErrorCode.INVALID_PHONE_NUMBER,
      '29': NotificationErrorCode.UNSUBSCRIBED
    }

    return errorMap[status] || NotificationErrorCode.PROVIDER_ERROR
  }
}