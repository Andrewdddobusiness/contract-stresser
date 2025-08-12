import { NextRequest, NextResponse } from 'next/server'
import { deploymentExecutionService } from '@/services/backend/deploymentExecutionService'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const executeSchema = z.object({
  planId: z.string().uuid(),
  dryRun: z.boolean().optional().default(false)
})

const rollbackSchema = z.object({
  executionId: z.string().uuid()
})

// POST /api/deployment/execute - Execute deployment plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = executeSchema.parse(body)

    // Check if user has access to this plan
    const hasAccess = await deploymentExecutionService.validateUserAccess(
      validatedData.planId,
      session.user.address
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied or plan not found' },
        { status: 403 }
      )
    }

    if (validatedData.dryRun) {
      // Perform validation and simulation without actual deployment
      const validation = await deploymentExecutionService.validatePlan(
        validatedData.planId
      )
      
      return NextResponse.json({ 
        validation,
        message: 'Dry run completed - no contracts were deployed'
      })
    }

    // Execute actual deployment
    const execution = await deploymentExecutionService.executePlan(
      validatedData.planId,
      session.user.address
    )

    return NextResponse.json({ execution }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to execute deployment:', error)
    return NextResponse.json(
      { error: 'Failed to execute deployment' },
      { status: 500 }
    )
  }
}

// POST /api/deployment/rollback - Rollback deployment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = rollbackSchema.parse(body)

    // Check if user has access to this execution
    const hasAccess = await deploymentExecutionService.validateUserAccessToExecution(
      validatedData.executionId,
      session.user.address
    )

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied or execution not found' },
        { status: 403 }
      )
    }

    const rollback = await deploymentExecutionService.rollbackExecution(
      validatedData.executionId,
      session.user.address
    )

    return NextResponse.json({ rollback }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to rollback deployment:', error)
    return NextResponse.json(
      { error: 'Failed to rollback deployment' },
      { status: 500 }
    )
  }
}