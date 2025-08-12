import { db } from '@/lib/db'
import { DeploymentPlan, ContractConfig } from '@/services/contracts/multiDeployment'

export interface CreatePlanRequest {
  userAddress: string
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

export interface GetPlansRequest {
  userAddress: string
  status?: string
  chainId?: number
  limit: number
  offset: number
}

export interface UpdatePlanRequest {
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

class DeploymentPlanService {
  async createPlan(request: CreatePlanRequest): Promise<DeploymentPlan> {
    return await db.transaction(async (tx) => {
      // Get or create user
      let user = await tx.query(`
        SELECT id FROM users WHERE address = $1
      `, [request.userAddress])

      if (!user.rows[0]) {
        user = await tx.query(`
          INSERT INTO users (address) VALUES ($1) RETURNING id
        `, [request.userAddress])
      }

      const userId = user.rows[0].id

      // Create deployment plan
      const planResult = await tx.query(`
        INSERT INTO deployment_plans (
          user_id, name, description, chain_id, parameters
        ) VALUES ($1, $2, $3, $4, $5) 
        RETURNING id, created_at, updated_at
      `, [
        userId,
        request.name,
        request.description,
        request.chainId,
        JSON.stringify(request.parameters)
      ])

      const planId = planResult.rows[0].id

      // Create contract configurations
      const contractConfigs = []
      const contractIdMap = new Map<string, string>() // temp id -> real id

      for (let i = 0; i < request.contracts.length; i++) {
        const contract = request.contracts[i]
        
        const contractResult = await tx.query(`
          INSERT INTO contract_configs (
            deployment_plan_id, name, contract_type, constructor_args,
            post_deploy_actions, metadata, order_index
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          planId,
          contract.name,
          contract.type,
          JSON.stringify(contract.constructorArgs || []),
          JSON.stringify(contract.postDeployActions || []),
          JSON.stringify(contract.metadata || {}),
          i
        ])

        const contractId = contractResult.rows[0].id
        contractIdMap.set(contract.name, contractId) // Using name as temp key
        
        contractConfigs.push({
          id: contractId,
          ...contract
        })
      }

      // Create dependencies
      for (const contract of request.contracts) {
        if (contract.dependencies && contract.dependencies.length > 0) {
          const contractId = contractIdMap.get(contract.name)
          
          for (const depName of contract.dependencies) {
            const dependsOnId = contractIdMap.get(depName)
            if (dependsOnId) {
              await tx.query(`
                INSERT INTO contract_dependencies (contract_id, depends_on_id)
                VALUES ($1, $2)
              `, [contractId, dependsOnId])
            }
          }
        }
      }

      // Build dependency map
      const dependencyMap: Record<string, string[]> = {}
      for (const config of contractConfigs) {
        dependencyMap[config.id] = config.dependencies || []
      }

      return {
        id: planId,
        name: request.name,
        description: request.description || '',
        contracts: contractConfigs,
        dependencies: dependencyMap,
        parameters: {
          chainId: request.chainId,
          gasPrice: request.parameters.gasPrice ? BigInt(request.parameters.gasPrice) : undefined,
          gasLimit: request.parameters.gasLimit ? BigInt(request.parameters.gasLimit) : undefined,
          confirmations: request.parameters.confirmations,
          timeoutMs: request.parameters.timeoutMs
        },
        status: 'draft',
        createdAt: planResult.rows[0].created_at,
        updatedAt: planResult.rows[0].updated_at
      }
    })
  }

  async getPlans(request: GetPlansRequest): Promise<DeploymentPlan[]> {
    let query = `
      SELECT 
        dp.id, dp.name, dp.description, dp.chain_id, dp.status, 
        dp.parameters, dp.created_at, dp.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', cc.id,
              'name', cc.name,
              'type', cc.contract_type,
              'constructorArgs', cc.constructor_args,
              'postDeployActions', cc.post_deploy_actions,
              'metadata', cc.metadata,
              'dependencies', COALESCE(dep_array.dependencies, '[]'::json)
            ) ORDER BY cc.order_index
          ) FILTER (WHERE cc.id IS NOT NULL), 
          '[]'::json
        ) as contracts
      FROM deployment_plans dp
      JOIN users u ON dp.user_id = u.id
      LEFT JOIN contract_configs cc ON dp.id = cc.deployment_plan_id
      LEFT JOIN (
        SELECT 
          cd.contract_id,
          JSON_AGG(cc_dep.name) as dependencies
        FROM contract_dependencies cd
        JOIN contract_configs cc_dep ON cd.depends_on_id = cc_dep.id
        GROUP BY cd.contract_id
      ) dep_array ON cc.id = dep_array.contract_id
      WHERE u.address = $1
    `

    const params: any[] = [request.userAddress]
    let paramIndex = 2

    if (request.status) {
      query += ` AND dp.status = $${paramIndex}`
      params.push(request.status)
      paramIndex++
    }

    if (request.chainId) {
      query += ` AND dp.chain_id = $${paramIndex}`
      params.push(request.chainId)
      paramIndex++
    }

    query += ` 
      GROUP BY dp.id, dp.name, dp.description, dp.chain_id, dp.status, 
               dp.parameters, dp.created_at, dp.updated_at
      ORDER BY dp.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    params.push(request.limit, request.offset)

    const result = await db.query(query, params)

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      contracts: row.contracts,
      dependencies: this.buildDependencyMap(row.contracts),
      parameters: {
        chainId: row.chain_id,
        gasPrice: row.parameters.gasPrice ? BigInt(row.parameters.gasPrice) : undefined,
        gasLimit: row.parameters.gasLimit ? BigInt(row.parameters.gasLimit) : undefined,
        confirmations: row.parameters.confirmations,
        timeoutMs: row.parameters.timeoutMs
      },
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  async getPlan(planId: string, userAddress: string): Promise<DeploymentPlan | null> {
    const result = await db.query(`
      SELECT 
        dp.id, dp.name, dp.description, dp.chain_id, dp.status, 
        dp.parameters, dp.created_at, dp.updated_at,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', cc.id,
              'name', cc.name,
              'type', cc.contract_type,
              'constructorArgs', cc.constructor_args,
              'postDeployActions', cc.post_deploy_actions,
              'metadata', cc.metadata,
              'dependencies', COALESCE(dep_array.dependencies, '[]'::json)
            ) ORDER BY cc.order_index
          ) FILTER (WHERE cc.id IS NOT NULL), 
          '[]'::json
        ) as contracts
      FROM deployment_plans dp
      JOIN users u ON dp.user_id = u.id
      LEFT JOIN contract_configs cc ON dp.id = cc.deployment_plan_id
      LEFT JOIN (
        SELECT 
          cd.contract_id,
          JSON_AGG(cc_dep.name) as dependencies
        FROM contract_dependencies cd
        JOIN contract_configs cc_dep ON cd.depends_on_id = cc_dep.id
        GROUP BY cd.contract_id
      ) dep_array ON cc.id = dep_array.contract_id
      WHERE dp.id = $1 AND u.address = $2
      GROUP BY dp.id, dp.name, dp.description, dp.chain_id, dp.status, 
               dp.parameters, dp.created_at, dp.updated_at
    `, [planId, userAddress])

    if (!result.rows[0]) {
      return null
    }

    const row = result.rows[0]
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      contracts: row.contracts,
      dependencies: this.buildDependencyMap(row.contracts),
      parameters: {
        chainId: row.chain_id,
        gasPrice: row.parameters.gasPrice ? BigInt(row.parameters.gasPrice) : undefined,
        gasLimit: row.parameters.gasLimit ? BigInt(row.parameters.gasLimit) : undefined,
        confirmations: row.parameters.confirmations,
        timeoutMs: row.parameters.timeoutMs
      },
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  async updatePlan(
    planId: string, 
    updates: UpdatePlanRequest, 
    userAddress: string
  ): Promise<DeploymentPlan | null> {
    // First verify ownership
    const existing = await this.getPlan(planId, userAddress)
    if (!existing) {
      return null
    }

    const updateFields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`)
      params.push(updates.name)
      paramIndex++
    }

    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex}`)
      params.push(updates.description)
      paramIndex++
    }

    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`)
      params.push(updates.status)
      paramIndex++
    }

    if (updates.parameters !== undefined) {
      updateFields.push(`parameters = $${paramIndex}`)
      params.push(JSON.stringify(updates.parameters))
      paramIndex++
    }

    if (updateFields.length === 0) {
      return existing
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(planId) // for WHERE clause

    await db.query(`
      UPDATE deployment_plans 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, params)

    return await this.getPlan(planId, userAddress)
  }

  async deletePlan(planId: string, userAddress: string): Promise<boolean> {
    const result = await db.query(`
      DELETE FROM deployment_plans 
      WHERE id = $1 AND user_id = (
        SELECT id FROM users WHERE address = $2
      )
    `, [planId, userAddress])

    return result.rowCount > 0
  }

  private buildDependencyMap(contracts: any[]): Record<string, string[]> {
    const dependencyMap: Record<string, string[]> = {}
    for (const contract of contracts) {
      dependencyMap[contract.id] = contract.dependencies || []
    }
    return dependencyMap
  }
}

export const deploymentPlanService = new DeploymentPlanService()