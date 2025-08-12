import { NextRequest, NextResponse } from 'next/server'
import { deploymentPlanService } from '@/services/backend/deploymentPlanService'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Request validation schemas
const createPlanSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  chainId: z.number().int().positive(),
  contracts: z.array(z.object({
    name: z.string().min(1).max(255),
    type: z.enum(['ERC20', 'ERC1155', 'Settlement', 'AccessControl', 'Registry']),
    constructorArgs: z.array(z.object({
      name: z.string(),
      type: z.string(),
      value: z.any(),
      isDependency: z.boolean().optional(),
      dependsOn: z.string().optional()
    })),
    dependencies: z.array(z.string()).optional(),
    postDeployActions: z.array(z.object({
      type: z.enum(['function_call', 'permission_grant', 'token_mint']),
      target: z.string(),
      function: z.string(),
      args: z.array(z.any()),
      description: z.string()
    })).optional(),
    metadata: z.object({
      description: z.string().optional(),
      version: z.string().optional(),
      tags: z.array(z.string()).optional()
    }).optional()
  })),
  parameters: z.object({
    gasPrice: z.string().optional(), // bigint as string
    gasLimit: z.string().optional(),
    confirmations: z.number().int().positive().default(1),
    timeoutMs: z.number().int().positive().default(300000)
  })
})

// GET /api/deployment/plans - List deployment plans
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.address) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const chainId = searchParams.get('chainId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const plans = await deploymentPlanService.getPlans({
      userAddress: session.user.address,
      status: status as any,
      chainId: chainId ? parseInt(chainId) : undefined,
      limit,
      offset
    })

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('Failed to fetch deployment plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deployment plans' },
      { status: 500 }
    )
  }
}

// POST /api/deployment/plans - Create new deployment plan
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
    const validatedData = createPlanSchema.parse(body)

    const plan = await deploymentPlanService.createPlan({
      ...validatedData,
      userAddress: session.user.address
    })

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Failed to create deployment plan:', error)
    return NextResponse.json(
      { error: 'Failed to create deployment plan' },
      { status: 500 }
    )
  }
}