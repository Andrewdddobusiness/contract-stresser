import { TestConfiguration, TestExecution } from '@/types/testing'
import { toast } from 'react-hot-toast'

export interface ABTestConfiguration {
  id: string
  name: string
  description: string
  variantA: {
    name: string
    configuration: TestConfiguration
    color: string
  }
  variantB: {
    name: string
    configuration: TestConfiguration
    color: string
  }
  splitRatio: number // 0.5 = 50/50 split
  duration: number // minutes
  successMetrics: ABTestMetric[]
  status: 'draft' | 'running' | 'completed' | 'cancelled'
  startTime?: Date
  endTime?: Date
  results?: ABTestResults
}

export interface ABTestMetric {
  id: string
  name: string
  type: 'throughput' | 'latency' | 'success_rate' | 'gas_usage' | 'custom'
  target?: number
  weight: number // For overall scoring
  higherIsBetter: boolean
}

export interface ABTestResults {
  variantA: ABTestVariantResults
  variantB: ABTestVariantResults
  winner: 'A' | 'B' | 'tie' | 'inconclusive'
  confidence: number // Statistical confidence %
  summary: string
  recommendations: string[]
}

export interface ABTestVariantResults {
  name: string
  executions: TestExecution[]
  metrics: {
    [metricId: string]: {
      value: number
      standardDeviation: number
      samples: number
    }
  }
  overallScore: number
  advantages: string[]
  disadvantages: string[]
}

export interface ABTestProgress {
  variantA: {
    completedTests: number
    totalTests: number
    currentMetrics: { [metricId: string]: number }
  }
  variantB: {
    completedTests: number
    totalTests: number
    currentMetrics: { [metricId: string]: number }
  }
  timeRemaining: number // minutes
  confidence: number
}

class ABTestingService {
  private tests: Map<string, ABTestConfiguration> = new Map()
  private activeTest: ABTestConfiguration | null = null
  private testIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.loadTests()
  }

  private loadTests() {
    try {
      const saved = localStorage.getItem('ab-tests')
      if (saved) {
        const tests: ABTestConfiguration[] = JSON.parse(saved)
        tests.forEach(test => {
          // Convert date strings back to Date objects
          if (test.startTime) test.startTime = new Date(test.startTime)
          if (test.endTime) test.endTime = new Date(test.endTime)
          this.tests.set(test.id, test)
        })
      }
    } catch (error) {
      console.warn('Failed to load saved A/B tests:', error)
    }
  }

  private saveTests() {
    try {
      const tests = Array.from(this.tests.values())
      localStorage.setItem('ab-tests', JSON.stringify(tests))
    } catch (error) {
      console.warn('Failed to save A/B tests:', error)
    }
  }

  createABTest(config: Omit<ABTestConfiguration, 'id' | 'status'>): ABTestConfiguration {
    const test: ABTestConfiguration = {
      ...config,
      id: `ab-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'draft'
    }

    this.tests.set(test.id, test)
    this.saveTests()
    toast.success(`A/B test "${test.name}" created`)
    return test
  }

  updateABTest(id: string, updates: Partial<ABTestConfiguration>): boolean {
    const test = this.tests.get(id)
    if (!test) return false

    if (test.status === 'running') {
      toast.error('Cannot update running test')
      return false
    }

    Object.assign(test, updates)
    this.saveTests()
    toast.success(`A/B test "${test.name}" updated`)
    return true
  }

  deleteABTest(id: string): boolean {
    const test = this.tests.get(id)
    if (!test) return false

    if (test.status === 'running') {
      this.stopABTest(id)
    }

    this.tests.delete(id)
    this.saveTests()
    toast.success(`A/B test "${test.name}" deleted`)
    return true
  }

  async startABTest(id: string): Promise<boolean> {
    const test = this.tests.get(id)
    if (!test) return false

    if (test.status !== 'draft') {
      toast.error('Test is not in draft status')
      return false
    }

    if (this.activeTest) {
      toast.error('Another A/B test is already running')
      return false
    }

    try {
      test.status = 'running'
      test.startTime = new Date()
      test.endTime = new Date(Date.now() + test.duration * 60000)
      this.activeTest = test
      
      // Start the test execution
      this.executeABTest(test)
      
      this.saveTests()
      toast.success(`A/B test "${test.name}" started`)
      return true
    } catch (error) {
      test.status = 'draft'
      console.error('Failed to start A/B test:', error)
      toast.error('Failed to start A/B test')
      return false
    }
  }

  stopABTest(id: string): boolean {
    const test = this.tests.get(id)
    if (!test || test.status !== 'running') return false

    // Clear interval
    const interval = this.testIntervals.get(id)
    if (interval) {
      clearInterval(interval)
      this.testIntervals.delete(id)
    }

    test.status = 'cancelled'
    test.endTime = new Date()
    
    if (this.activeTest?.id === id) {
      this.activeTest = null
    }

    this.saveTests()
    toast.success(`A/B test "${test.name}" stopped`)
    return true
  }

  private async executeABTest(test: ABTestConfiguration) {
    const variantAExecutions: TestExecution[] = []
    const variantBExecutions: TestExecution[] = []
    
    const totalDuration = test.duration * 60000 // Convert to milliseconds
    const testInterval = 30000 // Run tests every 30 seconds
    const totalRuns = Math.floor(totalDuration / testInterval)
    
    let currentRun = 0
    
    const interval = setInterval(async () => {
      if (currentRun >= totalRuns || test.status !== 'running') {
        this.completeABTest(test, variantAExecutions, variantBExecutions)
        return
      }

      // Determine which variant to run based on split ratio
      const runVariantA = Math.random() < test.splitRatio
      
      try {
        if (runVariantA) {
          // Run variant A
          const execution = await this.simulateTestExecution(test.variantA.configuration)
          variantAExecutions.push(execution)
        } else {
          // Run variant B
          const execution = await this.simulateTestExecution(test.variantB.configuration)
          variantBExecutions.push(execution)
        }
      } catch (error) {
        console.error('Error during A/B test execution:', error)
      }

      currentRun++
      
      // Emit progress event
      this.emitProgressEvent(test, variantAExecutions, variantBExecutions, currentRun, totalRuns)
      
    }, testInterval)

    this.testIntervals.set(test.id, interval)
  }

  private async simulateTestExecution(config: TestConfiguration): Promise<TestExecution> {
    // This is a simulation - in a real implementation, you'd integrate with your actual test executor
    const execution: TestExecution = {
      id: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `AB Test - ${config.functionName}`,
      configuration: config,
      status: 'completed',
      startTime: new Date(),
      endTime: new Date(Date.now() + Math.random() * 10000 + 5000), // 5-15 seconds
      currentIteration: config.iterations,
      totalIterations: config.iterations,
      successCount: Math.floor(config.iterations * (0.8 + Math.random() * 0.2)), // 80-100% success
      failureCount: 0,
      transactions: [],
      performance: {
        averageLatency: Math.random() * 1000 + 200, // 200-1200ms
        maxLatency: Math.random() * 2000 + 1000,
        minLatency: Math.random() * 200 + 50,
        throughput: Math.random() * 50 + 10, // 10-60 TPS
        gasUsage: {
          total: BigInt(Math.floor(Math.random() * 1000000 + 500000)),
          average: BigInt(Math.floor(Math.random() * 50000 + 21000)),
          min: BigInt(21000),
          max: BigInt(Math.floor(Math.random() * 100000 + 50000))
        }
      },
      errors: []
    }

    execution.failureCount = config.iterations - execution.successCount

    return execution
  }

  private completeABTest(
    test: ABTestConfiguration, 
    variantAExecutions: TestExecution[], 
    variantBExecutions: TestExecution[]
  ) {
    // Clear interval
    const interval = this.testIntervals.get(test.id)
    if (interval) {
      clearInterval(interval)
      this.testIntervals.delete(test.id)
    }

    // Analyze results
    const results = this.analyzeResults(test, variantAExecutions, variantBExecutions)
    
    test.status = 'completed'
    test.endTime = new Date()
    test.results = results
    this.activeTest = null

    this.saveTests()
    toast.success(`A/B test "${test.name}" completed. Winner: ${results.winner === 'tie' ? 'Tie' : `Variant ${results.winner}`}`)
    
    // Emit completion event
    window.dispatchEvent(new CustomEvent('ab-test:completed', { 
      detail: { test, results } 
    }))
  }

  private analyzeResults(
    test: ABTestConfiguration,
    variantAExecutions: TestExecution[],
    variantBExecutions: TestExecution[]
  ): ABTestResults {
    const variantAResults = this.analyzeVariantResults(test.variantA.name, variantAExecutions, test.successMetrics)
    const variantBResults = this.analyzeVariantResults(test.variantB.name, variantBExecutions, test.successMetrics)

    // Determine winner based on overall scores
    let winner: 'A' | 'B' | 'tie' | 'inconclusive' = 'inconclusive'
    let confidence = 0

    if (variantAExecutions.length > 0 && variantBExecutions.length > 0) {
      const scoreDiff = Math.abs(variantAResults.overallScore - variantBResults.overallScore)
      confidence = Math.min(95, scoreDiff * 10) // Simple confidence calculation
      
      if (confidence > 80) {
        if (variantAResults.overallScore > variantBResults.overallScore) {
          winner = 'A'
        } else if (variantBResults.overallScore > variantAResults.overallScore) {
          winner = 'B'
        } else {
          winner = 'tie'
        }
      }
    }

    const summary = this.generateSummary(winner, confidence, variantAResults, variantBResults)
    const recommendations = this.generateRecommendations(winner, variantAResults, variantBResults)

    return {
      variantA: variantAResults,
      variantB: variantBResults,
      winner,
      confidence,
      summary,
      recommendations
    }
  }

  private analyzeVariantResults(
    name: string,
    executions: TestExecution[],
    metrics: ABTestMetric[]
  ): ABTestVariantResults {
    if (executions.length === 0) {
      return {
        name,
        executions: [],
        metrics: {},
        overallScore: 0,
        advantages: [],
        disadvantages: []
      }
    }

    const calculatedMetrics: { [metricId: string]: { value: number; standardDeviation: number; samples: number } } = {}
    let totalScore = 0
    let totalWeight = 0

    metrics.forEach(metric => {
      const values = executions.map(exec => this.extractMetricValue(exec, metric))
      const validValues = values.filter(v => v !== null) as number[]
      
      if (validValues.length > 0) {
        const mean = validValues.reduce((a, b) => a + b, 0) / validValues.length
        const variance = validValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validValues.length
        const stdDev = Math.sqrt(variance)

        calculatedMetrics[metric.id] = {
          value: mean,
          standardDeviation: stdDev,
          samples: validValues.length
        }

        // Normalize score based on metric type (simple normalization)
        let normalizedScore = mean
        if (metric.type === 'success_rate') {
          normalizedScore = mean // Already 0-100
        } else if (metric.type === 'latency') {
          normalizedScore = Math.max(0, 100 - mean / 10) // Lower latency is better
        } else if (metric.type === 'throughput') {
          normalizedScore = Math.min(100, mean) // Higher throughput is better
        }

        if (!metric.higherIsBetter) {
          normalizedScore = 100 - normalizedScore
        }

        totalScore += normalizedScore * metric.weight
        totalWeight += metric.weight
      }
    })

    const overallScore = totalWeight > 0 ? totalScore / totalWeight : 0

    return {
      name,
      executions,
      metrics: calculatedMetrics,
      overallScore,
      advantages: this.identifyAdvantages(calculatedMetrics, metrics),
      disadvantages: this.identifyDisadvantages(calculatedMetrics, metrics)
    }
  }

  private extractMetricValue(execution: TestExecution, metric: ABTestMetric): number | null {
    if (!execution.performance) return null

    switch (metric.type) {
      case 'throughput':
        return execution.performance.throughput
      case 'latency':
        return execution.performance.averageLatency
      case 'success_rate':
        return execution.totalIterations > 0 ? (execution.successCount / execution.totalIterations) * 100 : 0
      case 'gas_usage':
        return Number(execution.performance.gasUsage?.average || 0)
      default:
        return null
    }
  }

  private identifyAdvantages(metrics: any, metricDefs: ABTestMetric[]): string[] {
    const advantages: string[] = []
    // Simple advantage identification - in practice, you'd compare with the other variant
    Object.entries(metrics).forEach(([metricId, data]: [string, any]) => {
      const metricDef = metricDefs.find(m => m.id === metricId)
      if (metricDef && data.value > 50) { // Simple threshold
        advantages.push(`Good ${metricDef.name.toLowerCase()} performance`)
      }
    })
    return advantages
  }

  private identifyDisadvantages(metrics: any, metricDefs: ABTestMetric[]): string[] {
    const disadvantages: string[] = []
    // Simple disadvantage identification
    Object.entries(metrics).forEach(([metricId, data]: [string, any]) => {
      const metricDef = metricDefs.find(m => m.id === metricId)
      if (metricDef && data.value < 30) { // Simple threshold
        disadvantages.push(`Poor ${metricDef.name.toLowerCase()} performance`)
      }
    })
    return disadvantages
  }

  private generateSummary(winner: string, confidence: number, variantA: ABTestVariantResults, variantB: ABTestVariantResults): string {
    if (winner === 'inconclusive') {
      return 'Results are inconclusive due to insufficient data or minimal performance differences.'
    }
    if (winner === 'tie') {
      return `Both variants performed similarly with ${confidence.toFixed(1)}% confidence in the tie.`
    }
    return `Variant ${winner} outperformed the other with ${confidence.toFixed(1)}% confidence (Score: ${winner === 'A' ? variantA.overallScore.toFixed(1) : variantB.overallScore.toFixed(1)} vs ${winner === 'A' ? variantB.overallScore.toFixed(1) : variantA.overallScore.toFixed(1)}).`
  }

  private generateRecommendations(winner: string, variantA: ABTestVariantResults, variantB: ABTestVariantResults): string[] {
    const recommendations: string[] = []
    
    if (winner === 'A') {
      recommendations.push('Implement Variant A configuration for production use')
      recommendations.push(...variantA.advantages.map(adv => `Leverage ${adv.toLowerCase()}`))
    } else if (winner === 'B') {
      recommendations.push('Implement Variant B configuration for production use')
      recommendations.push(...variantB.advantages.map(adv => `Leverage ${adv.toLowerCase()}`))
    } else {
      recommendations.push('Consider running a longer test for more conclusive results')
      recommendations.push('Analyze specific use cases where each variant performs better')
    }

    recommendations.push('Monitor performance metrics in production')
    return recommendations
  }

  private emitProgressEvent(
    test: ABTestConfiguration,
    variantAExecutions: TestExecution[],
    variantBExecutions: TestExecution[],
    currentRun: number,
    totalRuns: number
  ) {
    const progress: ABTestProgress = {
      variantA: {
        completedTests: variantAExecutions.length,
        totalTests: Math.ceil(totalRuns * test.splitRatio),
        currentMetrics: this.calculateCurrentMetrics(variantAExecutions)
      },
      variantB: {
        completedTests: variantBExecutions.length,
        totalTests: Math.floor(totalRuns * (1 - test.splitRatio)),
        currentMetrics: this.calculateCurrentMetrics(variantBExecutions)
      },
      timeRemaining: Math.max(0, Math.ceil((totalRuns - currentRun) * 0.5)), // 30 second intervals
      confidence: variantAExecutions.length > 0 && variantBExecutions.length > 0 ? 
        Math.min(95, (currentRun / totalRuns) * 80) : 0
    }

    window.dispatchEvent(new CustomEvent('ab-test:progress', { 
      detail: { test, progress } 
    }))
  }

  private calculateCurrentMetrics(executions: TestExecution[]): { [key: string]: number } {
    if (executions.length === 0) return {}

    const latest = executions[executions.length - 1]
    return {
      throughput: latest.performance?.throughput || 0,
      latency: latest.performance?.averageLatency || 0,
      success_rate: latest.totalIterations > 0 ? (latest.successCount / latest.totalIterations) * 100 : 0,
      gas_usage: Number(latest.performance?.gasUsage?.average || 0)
    }
  }

  getABTest(id: string): ABTestConfiguration | null {
    return this.tests.get(id) || null
  }

  getAllABTests(): ABTestConfiguration[] {
    return Array.from(this.tests.values()).sort((a, b) => 
      (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0)
    )
  }

  getActiveABTest(): ABTestConfiguration | null {
    return this.activeTest
  }

  // Quick A/B test creation helpers
  createSimpleABTest(
    name: string,
    baseConfig: TestConfiguration,
    variantBChanges: Partial<TestConfiguration>
  ): ABTestConfiguration {
    const variantB = { ...baseConfig, ...variantBChanges }
    
    return this.createABTest({
      name,
      description: 'Simple A/B test comparing two configurations',
      variantA: {
        name: 'Variant A (Control)',
        configuration: baseConfig,
        color: '#3b82f6' // blue
      },
      variantB: {
        name: 'Variant B (Test)',
        configuration: variantB,
        color: '#ef4444' // red
      },
      splitRatio: 0.5,
      duration: 10, // 10 minutes
      successMetrics: [
        {
          id: 'success_rate',
          name: 'Success Rate',
          type: 'success_rate',
          weight: 1,
          higherIsBetter: true
        },
        {
          id: 'throughput',
          name: 'Throughput',
          type: 'throughput',
          weight: 1,
          higherIsBetter: true
        },
        {
          id: 'latency',
          name: 'Average Latency',
          type: 'latency',
          weight: 1,
          higherIsBetter: false
        }
      ]
    })
  }
}

export const abTestingService = new ABTestingService()
export default abTestingService