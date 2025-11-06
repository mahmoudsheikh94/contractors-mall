import { NextRequest, NextResponse } from 'next/server'

/**
 * Vercel Deployment Webhook Handler (Admin App)
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
    const payload: VercelDeploymentPayload = await request.json()

    // Log deployment event
    console.log('📦 Vercel Deployment Event (Admin):', {
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
        console.log('🚀 Admin deployment started')
        break

      case 'deployment.succeeded':
        console.log('✅ Admin deployment succeeded:', payload.payload.deployment.url)
        break

      case 'deployment.failed':
      case 'deployment.error':
        console.error('❌ Admin deployment failed')
        break
    }

    return NextResponse.json({
      received: true,
      app: 'admin',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing Vercel webhook (Admin):', error)
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
    app: 'admin',
    endpoint: 'vercel-webhook',
    timestamp: new Date().toISOString(),
  })
}
