import { NextRequest, NextResponse } from 'next/server'
import { deploymentPlanService } from '@/services/backend/deploymentPlanService'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const updatePlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['draft', 'validating', 'deploying', 'completed', 'failed', 'rolled_back']).optional(),
  contracts: z.array(z.any()).optional(), // Could be more specific
  parameters: z.object({
    gasPrice: z.string().optional(),
    gasLimit: z.string().optional(),
    confirmations: z.number().int().positive().optional(),
    timeoutMs: z.number().int().positive().optional()
  }).optional()
})

// GET /api/deployment/plans/[id] - Get specific deployment plan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const plan = await deploymentPlanService.getPlan(
      params.id,
      session.user.address
    )

    if (!plan) {
      return NextResponse.json(
        { error: 'Deployment plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Failed to fetch deployment plan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deployment plan' },
      { status: 500 }
    )
  }
}

// PUT /api/deployment/plans/[id] - Update deployment plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updatePlanSchema.parse(body)

    const plan = await deploymentPlanService.updatePlan(
      params.id,
      validatedData,
      session.user.address
    )

    if (!plan) {
      return NextResponse.json(
        { error: 'Deployment plan not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ plan })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to update deployment plan:', error)
    return NextResponse.json(
      { error: 'Failed to update deployment plan' },
      { status: 500 }
    )
  }
}

// DELETE /api/deployment/plans/[id] - Delete deployment plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const success = await deploymentPlanService.deletePlan(
      params.id,
      session.user.address
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Deployment plan not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete deployment plan:', error)
    return NextResponse.json(
      { error: 'Failed to delete deployment plan' },
      { status: 500 }
    )
  }
}