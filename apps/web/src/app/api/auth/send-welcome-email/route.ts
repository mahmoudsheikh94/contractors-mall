/**
 * POST /api/auth/send-welcome-email
 * ==================================
 * Sends a welcome email to newly registered users
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendWelcomeEmail } from '@/lib/email/resend'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    await sendWelcomeEmail(email, name)

    return NextResponse.json({
      success: true,
      message: 'Welcome email sent successfully',
    })
  } catch (error: any) {
    console.error('Error sending welcome email:', error)

    return NextResponse.json(
      { error: error.message || 'Failed to send welcome email' },
      { status: 500 }
    )
  }
}
