import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    // TODO: Verify webhook signature (optional but recommended)
    // In production, implement signature verification:
    // const signature = request.headers.get('x-vercel-signature')
    // const isValid = verifySignature(signature, await request.text())
    // if (!isValid) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    // }

    const payload: VercelDeploymentPayload = await request.json()

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
