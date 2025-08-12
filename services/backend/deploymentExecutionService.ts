import { db } from '@/lib/db'
import { multiDeploymentService, ValidationResult, DeploymentResult, RollbackResult } from '@/services/contracts/multiDeployment'
import { deploymentPlanService } from './deploymentPlanService'

export interface DeploymentExecution {
  id: string
  planId: string
  status: 'success' | 'partial' | 'failed'
  totalGasUsed: bigint
  totalCost: bigint
  duration: number
  errorMessage?: string
  startedAt: Date
  completedAt: Date
  deployedContracts: Array<{
    id: string
    name: string
    type: string
    address: string
    transactionHash: string
    blockNumber: bigint
    gasUsed: bigint
    deployedAt: Date
  }>
  failedContracts: Array<{
    id: string
    name: string
    error: string
    gasUsed?: bigint
    attemptedAt: Date
  }>
}

class DeploymentExecutionService {
  async validateUserAccess(planId: string, userAddress: string): Promise<boolean> {
    const result = await db.query(`
      SELECT 1 FROM deployment_plans dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.id = $1 AND u.address = $2
    `, [planId, userAddress])

    return result.rows.length > 0
  }

  async validateUserAccessToExecution(executionId: string, userAddress: string): Promise<boolean> {
    const result = await db.query(`
      SELECT 1 FROM deployment_executions de
      JOIN deployment_plans dp ON de.deployment_plan_id = dp.id
      JOIN users u ON dp.user_id = u.id
      WHERE de.id = $1 AND u.address = $2
    `, [executionId, userAddress])

    return result.rows.length > 0
  }

  async validatePlan(planId: string): Promise<ValidationResult> {
    // Use the existing validation from multiDeploymentService
    return await multiDeploymentService.validateDeploymentPlan(planId)
  }

  async executePlan(planId: string, userAddress: string): Promise<DeploymentExecution> {
    // First validate access
    const hasAccess = await this.validateUserAccess(planId, userAddress)
    if (!hasAccess) {
      throw new Error('Access denied or plan not found')
    }

    const startTime = new Date()

    try {
      // Execute the deployment using the existing service
      const result = await multiDeploymentService.executeDeploymentPlan(planId)
      
      const executionId = await this.saveExecutionResult(planId, result, startTime)
      
      return await this.getExecution(executionId)
    } catch (error) {
      // Save failed execution
      const executionId = await this.saveFailedExecution(
        planId, 
        startTime, 
        error instanceof Error ? error.message : 'Unknown error'
      )
      
      return await this.getExecution(executionId)
    }
  }

  private async saveExecutionResult(
    planId: string, 
    result: DeploymentResult, 
    startTime: Date
  ): Promise<string> {
    return await db.transaction(async (tx) => {
      // Create execution record
      const executionResult = await tx.query(`
        INSERT INTO deployment_executions (
          deployment_plan_id, status, total_gas_used, total_cost, 
          duration_ms, error_message, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        planId,
        result.status,
        result.gasUsed.toString(),
        result.totalCost.toString(),
        result.duration,
        result.error,
        startTime,
        new Date()
      ])

      const executionId = executionResult.rows[0].id

      // Save deployed contracts
      for (const contract of result.deployedContracts) {
        await tx.query(`
          INSERT INTO deployed_contracts (
            execution_id, contract_config_id, name, contract_type, 
            address, transaction_hash, block_number, gas_used, deployed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          executionId,
          contract.id, // This should match the contract_config_id
          contract.name,
          contract.type,
          contract.address,
          contract.transactionHash,
          contract.blockNumber.toString(),
          contract.gasUsed.toString(),
          contract.deployedAt
        ])
      }

      // Save failed contracts
      for (const contract of result.failedContracts) {
        await tx.query(`
          INSERT INTO failed_deployments (
            execution_id, contract_config_id, name, error_message, 
            gas_used, attempted_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          executionId,
          contract.id,
          contract.name,
          contract.error,
          contract.gasUsed?.toString(),
          contract.attemptedAt
        ])
      }

      // Update plan status
      await tx.query(`
        UPDATE deployment_plans 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [result.status === 'success' ? 'completed' : 'failed', planId])

      return executionId
    })
  }

  private async saveFailedExecution(
    planId: string, 
    startTime: Date, 
    errorMessage: string
  ): Promise<string> {
    const result = await db.query(`
      INSERT INTO deployment_executions (
        deployment_plan_id, status, total_gas_used, total_cost, 
        duration_ms, error_message, started_at, completed_at
      ) VALUES ($1, 'failed', 0, 0, $2, $3, $4, $5)
      RETURNING id
    `, [
      planId,
      Date.now() - startTime.getTime(),
      errorMessage,
      startTime,
      new Date()
    ])

    // Update plan status
    await db.query(`
      UPDATE deployment_plans 
      SET status = 'failed', updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [planId])

    return result.rows[0].id
  }

  async getExecution(executionId: string): Promise<DeploymentExecution> {
    const result = await db.query(`
      SELECT 
        de.id, de.deployment_plan_id as plan_id, de.status, 
        de.total_gas_used, de.total_cost, de.duration_ms, de.error_message,
        de.started_at, de.completed_at,
        
        -- Deployed contracts
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', dc.id,
              'name', dc.name,
              'type', dc.contract_type,
              'address', dc.address,
              'transactionHash', dc.transaction_hash,
              'blockNumber', dc.block_number,
              'gasUsed', dc.gas_used,
              'deployedAt', dc.deployed_at
            )
          ) FILTER (WHERE dc.id IS NOT NULL), 
          '[]'::json
        ) as deployed_contracts,
        
        -- Failed contracts
        COALESCE(
          (SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', fd.id,
              'name', fd.name,
              'error', fd.error_message,
              'gasUsed', fd.gas_used,
              'attemptedAt', fd.attempted_at
            )
          ) FROM failed_deployments fd WHERE fd.execution_id = de.id),
          '[]'::json
        ) as failed_contracts
        
      FROM deployment_executions de
      LEFT JOIN deployed_contracts dc ON de.id = dc.execution_id
      WHERE de.id = $1
      GROUP BY de.id, de.deployment_plan_id, de.status, de.total_gas_used, 
               de.total_cost, de.duration_ms, de.error_message, 
               de.started_at, de.completed_at
    `, [executionId])

    if (!result.rows[0]) {
      throw new Error('Execution not found')
    }

    const row = result.rows[0]
    return {
      id: row.id,
      planId: row.plan_id,
      status: row.status,
      totalGasUsed: BigInt(row.total_gas_used),
      totalCost: BigInt(row.total_cost),
      duration: row.duration_ms,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      deployedContracts: row.deployed_contracts.map((c: any) => ({
        ...c,
        blockNumber: BigInt(c.blockNumber),
        gasUsed: BigInt(c.gasUsed),
        deployedAt: new Date(c.deployedAt)
      })),
      failedContracts: row.failed_contracts.map((c: any) => ({
        ...c,
        gasUsed: c.gasUsed ? BigInt(c.gasUsed) : undefined,
        attemptedAt: new Date(c.attemptedAt)
      }))
    }
  }

  async rollbackExecution(executionId: string, userAddress: string): Promise<RollbackExecution> {
    // First validate access
    const hasAccess = await this.validateUserAccessToExecution(executionId, userAddress)
    if (!hasAccess) {
      throw new Error('Access denied or execution not found')
    }

    const execution = await this.getExecution(executionId)
    if (execution.status === 'failed') {
      throw new Error('Cannot rollback a failed deployment')
    }

    const startTime = new Date()

    try {
      // Use the existing rollback service
      const result = await multiDeploymentService.rollbackDeployment(execution.planId)
      
      return await this.saveRollbackResult(executionId, result, startTime)
    } catch (error) {
      throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async saveRollbackResult(
    executionId: string,
    result: RollbackResult,
    startTime: Date
  ): Promise<RollbackExecution> {
    return await db.transaction(async (tx) => {
      // Create rollback execution record
      const rollbackResult = await tx.query(`
        INSERT INTO rollback_executions (
          deployment_execution_id, status, total_gas_used, 
          duration_ms, started_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        executionId,
        result.status,
        result.totalGasUsed.toString(),
        result.duration,
        startTime,
        new Date()
      ])

      const rollbackId = rollbackResult.rows[0].id

      // Save rollback actions
      for (const action of result.rollbackActions) {
        await tx.query(`
          INSERT INTO rollback_actions (
            rollback_execution_id, deployed_contract_id, actions,
            gas_used, transaction_hashes, executed_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          rollbackId,
          action.contractId,
          JSON.stringify(action.actions),
          action.gasUsed.toString(),
          JSON.stringify(action.transactionHashes),
          action.timestamp
        ])
      }

      // Save rollback errors
      for (const error of result.errors) {
        await tx.query(`
          INSERT INTO rollback_errors (
            rollback_execution_id, deployed_contract_id, 
            error_message, occurred_at
          ) VALUES ($1, $2, $3, $4)
        `, [
          rollbackId,
          error.contractId,
          error.error,
          error.timestamp
        ])
      }

      // Update plan status to rolled_back
      await tx.query(`
        UPDATE deployment_plans 
        SET status = 'rolled_back', updated_at = CURRENT_TIMESTAMP 
        WHERE id = (
          SELECT deployment_plan_id FROM deployment_executions WHERE id = $1
        )
      `, [executionId])

      return {
        id: rollbackId,
        executionId,
        status: result.status,
        totalGasUsed: result.totalGasUsed,
        duration: result.duration,
        startedAt: startTime,
        completedAt: new Date(),
        actions: result.rollbackActions,
        errors: result.errors
      }
    })
  }
}

export interface RollbackExecution {
  id: string
  executionId: string
  status: 'success' | 'partial' | 'failed'
  totalGasUsed: bigint
  duration: number
  startedAt: Date
  completedAt: Date
  actions: Array<{
    contractId: string
    contractName: string
    contractAddress: string
    actions: string[]
    gasUsed: bigint
    timestamp: Date
    transactionHashes: string[]
  }>
  errors: Array<{
    contractId: string
    contractName: string
    error: string
    timestamp: Date
  }>
}

export const deploymentExecutionService = new DeploymentExecutionService()