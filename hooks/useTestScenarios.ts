'use client'

import { useState, useCallback, useMemo } from 'react'
import { type Address } from 'viem'
import { 
  testScenariosService,
  type ScenarioTemplate,
  type ScenarioResult
} from '@/services/testing/scenarios'
import { useTestExecutor } from './useTestExecutor'
import type { TestConfiguration, TestExecution, TestTransaction, TestError } from '@/types/testing'

interface UseTestScenariosOptions {
  contractAddress?: Address
  autoAnalyze?: boolean
}

interface UseTestScenariosReturn {
  // Scenario data
  allScenarios: ScenarioTemplate[]
  recommendedScenarios: ScenarioTemplate[]
  advancedScenarios: ScenarioTemplate[]
  categorizedScenarios: Record<string, ScenarioTemplate[]>
  
  // Current scenario state
  selectedScenario: ScenarioTemplate | null
  scenarioConfig: TestConfiguration | null
  scenarioResult: ScenarioResult | null
  
  // Test execution (from useTestExecutor)
  execution: TestExecution | null
  isRunning: boolean
  isPaused: boolean
  transactions: TestTransaction[]
  errors: TestError[]
  
  // Actions
  selectScenario: (scenarioId: string, customParams?: any) => void
  runScenario: (scenarioId: string, customParams?: any) => Promise<TestExecution>
  runSelectedScenario: () => Promise<TestExecution>
  analyzeResults: () => ScenarioResult | null
  
  // Test controls
  pauseTest: () => void
  resumeTest: () => void
  stopTest: () => void
  retryTest: () => Promise<TestExecution>
  
  // Utilities
  getScenario: (id: string) => ScenarioTemplate | null
  getScenariosByCategory: (category: ScenarioTemplate['category']) => ScenarioTemplate[]
  exportResults: () => void
}

/**
 * React hook for managing test scenarios and execution
 */
export function useTestScenarios(options: UseTestScenariosOptions = {}): UseTestScenariosReturn {
  const {
    contractAddress,
    autoAnalyze = true
  } = options

  const [selectedScenario, setSelectedScenario] = useState<ScenarioTemplate | null>(null)
  const [scenarioConfig, setScenarioConfig] = useState<TestConfiguration | null>(null)
  const [scenarioResult, setScenarioResult] = useState<ScenarioResult | null>(null)
  const [customParams, setCustomParams] = useState<any>(null)

  // Test executor integration
  const testExecutor = useTestExecutor({
    onComplete: (execution) => {
      if (autoAnalyze && selectedScenario) {
        analyzeCompletedTest(execution)
      }
    }
  })

  // Scenario data
  const allScenarios = useMemo(() => testScenariosService.getAllScenarios(), [])
  const recommendedScenarios = useMemo(() => testScenariosService.getRecommendedScenarios(), [])
  const advancedScenarios = useMemo(() => testScenariosService.getAdvancedScenarios(), [])
  
  const categorizedScenarios = useMemo(() => {
    const categories = ['throughput', 'concurrency', 'gas', 'stress', 'custom'] as const
    return categories.reduce((acc, category) => {
      acc[category] = testScenariosService.getScenariosByCategory(category)
      return acc
    }, {} as Record<string, ScenarioTemplate[]>)
  }, [])

  // Analyze completed test results
  const analyzeCompletedTest = useCallback((execution: TestExecution): ScenarioResult | null => {
    if (!selectedScenario) return null

    const totalTransactions = execution.successCount + execution.failureCount
    const avgGasUsed = execution.avgGasUsed ? Number(execution.avgGasUsed) : 0
    const duration = execution.startTime && execution.endTime 
      ? (execution.endTime.getTime() - execution.startTime.getTime()) / 1000
      : 0

    const result = testScenariosService.analyzeResults(
      selectedScenario.id,
      totalTransactions,
      execution.successCount,
      execution.failureCount,
      avgGasUsed,
      execution.transactionsPerSecond || 0,
      duration
    )

    setScenarioResult(result)
    return result
  }, [selectedScenario])

  // Select a scenario and generate its configuration
  const selectScenario = useCallback((scenarioId: string, params?: any) => {
    const scenario = testScenariosService.getScenario(scenarioId)
    if (!scenario || !contractAddress) return

    const config = testScenariosService.createConfigFromScenario(
      scenarioId,
      contractAddress,
      params
    )

    if (config) {
      setSelectedScenario(scenario)
      setScenarioConfig(config)
      setCustomParams(params)
      setScenarioResult(null) // Clear previous results
    }
  }, [contractAddress])

  // Run a specific scenario
  const runScenario = useCallback(async (scenarioId: string, params?: any): Promise<TestExecution> => {
    if (!contractAddress) {
      throw new Error('Contract address is required to run scenarios')
    }

    const scenario = testScenariosService.getScenario(scenarioId)
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`)
    }

    const config = testScenariosService.createConfigFromScenario(
      scenarioId,
      contractAddress,
      params
    )

    if (!config) {
      throw new Error('Failed to generate scenario configuration')
    }

    // Update state
    setSelectedScenario(scenario)
    setScenarioConfig(config)
    setCustomParams(params)
    setScenarioResult(null)

    // Start test execution
    return testExecutor.startTest(config)
  }, [contractAddress, testExecutor])

  // Run the currently selected scenario
  const runSelectedScenario = useCallback(async (): Promise<TestExecution> => {
    if (!selectedScenario || !scenarioConfig) {
      throw new Error('No scenario selected')
    }

    return testExecutor.startTest(scenarioConfig)
  }, [selectedScenario, scenarioConfig, testExecutor])

  // Analyze current results manually
  const analyzeResults = useCallback((): ScenarioResult | null => {
    if (!selectedScenario || !testExecutor.execution) return null

    return analyzeCompletedTest(testExecutor.execution)
  }, [selectedScenario, testExecutor.execution, analyzeCompletedTest])

  // Export test results
  const exportResults = useCallback(() => {
    if (!testExecutor.execution || !selectedScenario) return

    const exportData = {
      scenario: {
        id: selectedScenario.id,
        name: selectedScenario.name,
        category: selectedScenario.category,
        difficulty: selectedScenario.difficulty
      },
      execution: testExecutor.execution,
      transactions: testExecutor.transactions,
      errors: testExecutor.errors,
      analysis: scenarioResult,
      exportedAt: new Date().toISOString(),
      customParams
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scenario-results-${selectedScenario.id}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [testExecutor.execution, testExecutor.transactions, testExecutor.errors, selectedScenario, scenarioResult, customParams])

  // Utility functions
  const getScenario = useCallback((id: string) => {
    return testScenariosService.getScenario(id)
  }, [])

  const getScenariosByCategory = useCallback((category: ScenarioTemplate['category']) => {
    return testScenariosService.getScenariosByCategory(category)
  }, [])

  return {
    // Scenario data
    allScenarios,
    recommendedScenarios,
    advancedScenarios,
    categorizedScenarios,
    
    // Current scenario state
    selectedScenario,
    scenarioConfig,
    scenarioResult,
    
    // Test execution (from useTestExecutor)
    execution: testExecutor.execution,
    isRunning: testExecutor.isRunning,
    isPaused: testExecutor.isPaused,
    transactions: testExecutor.transactions,
    errors: testExecutor.errors,
    
    // Actions
    selectScenario,
    runScenario,
    runSelectedScenario,
    analyzeResults,
    
    // Test controls
    pauseTest: testExecutor.pauseTest,
    resumeTest: testExecutor.resumeTest,
    stopTest: testExecutor.stopTest,
    retryTest: testExecutor.retryTest,
    
    // Utilities
    getScenario,
    getScenariosByCategory,
    exportResults
  }
}

/**
 * Hook for running a quick scenario test
 */
export function useQuickScenario(contractAddress?: Address) {
  const scenarios = useTestScenarios({ contractAddress })
  
  const runQuickTest = useCallback(async (
    scenarioId: string = 'rapid-transfer-light',
    customParams?: any
  ) => {
    if (!contractAddress) {
      throw new Error('Contract address required for quick test')
    }
    
    return scenarios.runScenario(scenarioId, customParams)
  }, [contractAddress, scenarios])
  
  return {
    ...scenarios,
    runQuickTest
  }
}

/**
 * Hook for scenario statistics and analytics
 */
export function useScenarioStats() {
  const [testHistory, setTestHistory] = useState<ScenarioResult[]>([])
  
  const allScenarios = testScenariosService.getAllScenarios()
  const categories = testScenariosService.getScenarioCategories()
  
  const addResult = useCallback((result: ScenarioResult) => {
    setTestHistory(prev => [...prev, result])
  }, [])
  
  const clearHistory = useCallback(() => {
    setTestHistory([])
  }, [])
  
  const getStatsByCategory = useCallback((category: string) => {
    return testHistory.filter(result => {
      const scenario = testScenariosService.getScenario(result.scenarioId)
      return scenario?.category === category
    })
  }, [testHistory])
  
  const getPerformanceDistribution = useCallback(() => {
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 }
    testHistory.forEach(result => {
      distribution[result.performance]++
    })
    return distribution
  }, [testHistory])
  
  return {
    allScenarios,
    categories,
    testHistory,
    addResult,
    clearHistory,
    getStatsByCategory,
    getPerformanceDistribution,
    totalTests: testHistory.length,
    averageSuccessRate: testHistory.reduce((sum, r) => sum + r.metrics.successRate, 0) / Math.max(testHistory.length, 1)
  }
}