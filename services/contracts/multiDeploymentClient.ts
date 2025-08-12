import { DeploymentPlan, DeploymentResult, ValidationResult, RollbackResult, ContractConfig } from './multiDeployment'

interface CreatePlanRequest {
  name: string
  description?: string
  chainId: number
  contracts: Omit<ContractConfig, 'id'>[]
  parameters: {
    gasPrice?: string
    gasLimit?: string
    confirmations: number
    timeoutMs: number
  }
}

interface UpdatePlanRequest {
  name?: string
  description?: string
  status?: string
  contracts?: any[]
  parameters?: {
    gasPrice?: string
    gasLimit?: string
    confirmations?: number
    timeoutMs?: number
  }
}

interface GetPlansOptions {
  status?: string
  chainId?: number
  limit?: number
  offset?: number
}

class MultiDeploymentClient {
  private baseUrl = '/api/deployment'

  async createPlan(request: CreatePlanRequest): Promise<DeploymentPlan> {
    const response = await fetch(`${this.baseUrl}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create deployment plan')
    }

    const { plan } = await response.json()
    return plan
  }

  async getPlans(options: GetPlansOptions = {}): Promise<DeploymentPlan[]> {
    const searchParams = new URLSearchParams()
    
    if (options.status) searchParams.set('status', options.status)
    if (options.chainId) searchParams.set('chainId', options.chainId.toString())
    if (options.limit) searchParams.set('limit', options.limit.toString())
    if (options.offset) searchParams.set('offset', options.offset.toString())

    const response = await fetch(`${this.baseUrl}/plans?${searchParams}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch deployment plans')
    }

    const { plans } = await response.json()
    return plans
  }

  async getPlan(planId: string): Promise<DeploymentPlan> {
    const response = await fetch(`${this.baseUrl}/plans/${planId}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch deployment plan')
    }

    const { plan } = await response.json()
    return plan
  }

  async updatePlan(planId: string, updates: UpdatePlanRequest): Promise<DeploymentPlan> {
    const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update deployment plan')
    }

    const { plan } = await response.json()
    return plan
  }

  async deletePlan(planId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/plans/${planId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete deployment plan')
    }
  }

  async validatePlan(planId: string): Promise<ValidationResult> {
    const response = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        dryRun: true
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to validate deployment plan')
    }

    const { validation } = await response.json()
    return validation
  }

  async executePlan(planId: string): Promise<DeploymentResult> {
    const response = await fetch(`${this.baseUrl}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        dryRun: false
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to execute deployment plan')
    }

    const { execution } = await response.json()
    return execution
  }

  async rollbackDeployment(executionId: string): Promise<RollbackResult> {
    const response = await fetch(`${this.baseUrl}/rollback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        executionId
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to rollback deployment')
    }

    const { rollback } = await response.json()
    return rollback
  }

  // Real-time execution status (could use WebSocket or polling)
  async getExecutionStatus(planId: string): Promise<{ status: string; progress?: number }> {
    // This could be implemented with WebSocket for real-time updates
    // For now, return basic status
    const plan = await this.getPlan(planId)
    return {
      status: plan.status,
      progress: plan.status === 'deploying' ? undefined : 100
    }
  }

  // Stream execution updates (for real-time UI updates)
  watchExecution(planId: string, callback: (update: any) => void): () => void {
    // This could be implemented with WebSocket or Server-Sent Events
    // For now, use polling as a fallback
    const interval = setInterval(async () => {
      try {
        const status = await this.getExecutionStatus(planId)
        callback(status)
        
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval)
        }
      } catch (error) {
        console.error('Error watching execution:', error)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }
}

export const multiDeploymentClient = new MultiDeploymentClient()
export default multiDeploymentClient