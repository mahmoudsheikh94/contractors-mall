import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * Vercel Deployment Webhook Handler
 *
 * This endpoint receives deployment status updates from Vercel.
 * Configure at: https://vercel.com/[team]/[project]/settings/git
 *
 * Webhook Events:
 * - deployment.created
 * - deployment.succeeded
 * - deployment.failed
 * - deployment.error
 *
 * Security: Uses HMAC-SHA256 signature verification
 */

interface VercelDeploymentPayload {
  id: string
  type: 'deployment.created' | 'deployment.succeeded' | 'deployment.failed' | 'deployment.error'
  createdAt: number
  payload: {
    deployment: {
      id: string
      name: string
      url: string
      meta: {
        githubCommitRef?: string
        githubCommitSha?: string
        githubCommitMessage?: string
        githubCommitAuthorLogin?: string
      }
    }
    project: {
      name: string
    }
    team?: {
      name: string
    }
  }
}

/**
 * Verify Vercel webhook signature
 * Vercel signs webhooks using HMAC-SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) return false

  try {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Constant time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(hash)
    )
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()

    // SECURITY: Verify webhook signature if secret is configured
    if (process.env.VERCEL_WEBHOOK_SECRET) {
      const signature = request.headers.get('x-vercel-signature')

      if (!verifyWebhookSignature(rawBody, signature, process.env.VERCEL_WEBHOOK_SECRET)) {
        console.warn('⚠️ Invalid webhook signature received')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }
    } else if (process.env.NODE_ENV === 'production') {
      // Warn if running in production without webhook verification
      console.warn('⚠️ Vercel webhook running without signature verification in production!')
    }

    const payload: VercelDeploymentPayload = JSON.parse(rawBody)

    // Log deployment event
    console.log('📦 Vercel Deployment Event:', {
      type: payload.type,
      project: payload.payload.project.name,
      url: payload.payload.deployment.url,
      commit: payload.payload.deployment.meta.githubCommitSha?.slice(0, 7),
      branch: payload.payload.deployment.meta.githubCommitRef,
      message: payload.payload.deployment.meta.githubCommitMessage,
    })

    // Handle different event types
    switch (payload.type) {
      case 'deployment.created':
        console.log('🚀 Deployment started')
        // You could send notifications here (Slack, Discord, email, etc.)
        break

      case 'deployment.succeeded':
        console.log('✅ Deployment succeeded:', payload.payload.deployment.url)
        // Notify team of successful deployment
        // Run smoke tests
        // Update status page
        break

      case 'deployment.failed':
      case 'deployment.error':
        console.error('❌ Deployment failed')
        // Alert team of deployment failure
        // Create GitHub issue
        // Send urgent notifications
        break
    }

    return NextResponse.json({
      received: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing Vercel webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'vercel-webhook',
    timestamp: new Date().toISOString(),
  })
}
