import { TestConfiguration, TestExecution } from '@/types/testing'
import { toast } from 'react-hot-toast'

export type ScheduleType = 'once' | 'recurring' | 'cron'

export interface ScheduleConfig {
  id: string
  name: string
  description?: string
  type: ScheduleType
  startTime: Date
  endTime?: Date // For recurring schedules
  interval?: number // Minutes for recurring schedules
  cronExpression?: string // For cron schedules
  timezone: string
  enabled: boolean
  maxRuns?: number
  runCount: number
  lastRun?: Date
  nextRun?: Date
  testConfiguration: TestConfiguration
}

export interface ScheduledExecution {
  scheduleId: string
  executionId: string
  startTime: Date
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  result?: TestExecution
  error?: string
}

class TestSchedulerService {
  private schedules: Map<string, ScheduleConfig> = new Map()
  private executions: Map<string, ScheduledExecution> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private isRunning = false

  constructor() {
    this.loadSchedules()
    this.start()
  }

  private loadSchedules() {
    try {
      const saved = localStorage.getItem('test-schedules')
      if (saved) {
        const schedules: ScheduleConfig[] = JSON.parse(saved)
        schedules.forEach(schedule => {
          // Convert date strings back to Date objects
          schedule.startTime = new Date(schedule.startTime)
          if (schedule.endTime) schedule.endTime = new Date(schedule.endTime)
          if (schedule.lastRun) schedule.lastRun = new Date(schedule.lastRun)
          if (schedule.nextRun) schedule.nextRun = new Date(schedule.nextRun)
          
          this.schedules.set(schedule.id, schedule)
        })
      }
    } catch (error) {
      console.warn('Failed to load saved schedules:', error)
    }
  }

  private saveSchedules() {
    try {
      const schedules = Array.from(this.schedules.values())
      localStorage.setItem('test-schedules', JSON.stringify(schedules))
    } catch (error) {
      console.warn('Failed to save schedules:', error)
    }
  }

  start() {
    if (this.isRunning) return
    this.isRunning = true
    this.scheduleNext()
    console.log('Test scheduler started')
  }

  stop() {
    this.isRunning = false
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
    console.log('Test scheduler stopped')
  }

  private scheduleNext() {
    if (!this.isRunning) return

    // Clear existing timers
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()

    // Schedule all enabled schedules
    this.schedules.forEach(schedule => {
      if (schedule.enabled) {
        this.scheduleExecution(schedule)
      }
    })

    // Check again in 1 minute
    setTimeout(() => this.scheduleNext(), 60000)
  }

  private scheduleExecution(schedule: ScheduleConfig) {
    const nextRun = this.calculateNextRun(schedule)
    if (!nextRun) return

    schedule.nextRun = nextRun
    this.saveSchedules()

    const delay = nextRun.getTime() - Date.now()
    if (delay <= 0) {
      // Execute immediately if time has passed
      this.executeSchedule(schedule)
      return
    }

    // Schedule execution
    const timer = setTimeout(() => {
      this.executeSchedule(schedule)
    }, delay)

    this.timers.set(schedule.id, timer)
  }

  private calculateNextRun(schedule: ScheduleConfig): Date | null {
    const now = new Date()

    switch (schedule.type) {
      case 'once':
        if (schedule.startTime > now && schedule.runCount === 0) {
          return schedule.startTime
        }
        return null // Already run or time passed

      case 'recurring':
        if (!schedule.interval || !schedule.endTime) return null
        
        let nextRun = schedule.lastRun 
          ? new Date(schedule.lastRun.getTime() + schedule.interval * 60000)
          : schedule.startTime

        // If next run is in the past, calculate the next valid run time
        while (nextRun <= now) {
          nextRun = new Date(nextRun.getTime() + schedule.interval * 60000)
        }

        // Check if within end time
        if (nextRun > schedule.endTime) return null

        // Check max runs
        if (schedule.maxRuns && schedule.runCount >= schedule.maxRuns) return null

        return nextRun

      case 'cron':
        // Simple cron implementation - in production, use a proper cron library
        if (!schedule.cronExpression) return null
        return this.parseNextCronRun(schedule.cronExpression, now)

      default:
        return null
    }
  }

  private parseNextCronRun(cronExpression: string, from: Date): Date | null {
    // This is a simplified cron parser. In production, use a proper library like 'node-cron'
    // Format: "minute hour day month dayOfWeek"
    // Example: "0 9 * * *" = 9:00 AM every day
    try {
      const parts = cronExpression.split(' ')
      if (parts.length !== 5) return null

      const [minute, hour, day, month, dayOfWeek] = parts.map(p => p === '*' ? -1 : parseInt(p))
      
      const next = new Date(from)
      next.setSeconds(0)
      next.setMilliseconds(0)

      // Simple logic for common patterns
      if (minute >= 0) next.setMinutes(minute)
      if (hour >= 0) next.setHours(hour)

      // If time has passed today, move to next day
      if (next <= from) {
        next.setDate(next.getDate() + 1)
      }

      return next
    } catch (error) {
      console.error('Invalid cron expression:', cronExpression, error)
      return null
    }
  }

  private async executeSchedule(schedule: ScheduleConfig) {
    try {
      const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      const execution: ScheduledExecution = {
        scheduleId: schedule.id,
        executionId,
        startTime: new Date(),
        status: 'pending'
      }

      this.executions.set(executionId, execution)

      // Update schedule
      schedule.runCount += 1
      schedule.lastRun = new Date()
      this.saveSchedules()

      // Emit event for execution (you can listen to this in your UI)
      this.emitScheduleEvent('execution-started', { schedule, execution })

      // Here you would integrate with your test executor
      // For now, we'll simulate the execution
      execution.status = 'running'
      
      // Simulate test execution - replace with actual test runner integration
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      execution.status = 'completed'
      
      this.emitScheduleEvent('execution-completed', { schedule, execution })
      toast.success(`Scheduled test "${schedule.name}" completed successfully`)

    } catch (error) {
      console.error('Failed to execute scheduled test:', error)
      const execution = Array.from(this.executions.values())
        .find(e => e.scheduleId === schedule.id && e.status === 'running')
      
      if (execution) {
        execution.status = 'failed'
        execution.error = error instanceof Error ? error.message : 'Unknown error'
      }

      this.emitScheduleEvent('execution-failed', { schedule, error })
      toast.error(`Scheduled test "${schedule.name}" failed: ${error}`)
    }
  }

  private emitScheduleEvent(type: string, data: any) {
    // Custom event system - you can listen to these events in your components
    window.dispatchEvent(new CustomEvent(`schedule:${type}`, { detail: data }))
  }

  createSchedule(config: Omit<ScheduleConfig, 'id' | 'runCount' | 'nextRun'>): ScheduleConfig {
    const schedule: ScheduleConfig = {
      ...config,
      id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      runCount: 0
    }

    this.schedules.set(schedule.id, schedule)
    this.saveSchedules()

    if (schedule.enabled) {
      this.scheduleExecution(schedule)
    }

    toast.success(`Schedule "${schedule.name}" created`)
    return schedule
  }

  updateSchedule(id: string, updates: Partial<ScheduleConfig>): boolean {
    const schedule = this.schedules.get(id)
    if (!schedule) return false

    // Clear existing timer
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }

    // Update schedule
    Object.assign(schedule, updates)
    this.saveSchedules()

    // Reschedule if enabled
    if (schedule.enabled) {
      this.scheduleExecution(schedule)
    }

    toast.success(`Schedule "${schedule.name}" updated`)
    return true
  }

  deleteSchedule(id: string): boolean {
    const schedule = this.schedules.get(id)
    if (!schedule) return false

    // Clear timer
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }

    // Remove schedule
    this.schedules.delete(id)
    this.saveSchedules()

    // Remove related executions
    Array.from(this.executions.keys()).forEach(key => {
      const execution = this.executions.get(key)
      if (execution?.scheduleId === id) {
        this.executions.delete(key)
      }
    })

    toast.success(`Schedule "${schedule.name}" deleted`)
    return true
  }

  getSchedule(id: string): ScheduleConfig | null {
    return this.schedules.get(id) || null
  }

  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    )
  }

  getActiveSchedules(): ScheduleConfig[] {
    return this.getAllSchedules().filter(s => s.enabled)
  }

  getScheduleExecutions(scheduleId: string): ScheduledExecution[] {
    return Array.from(this.executions.values())
      .filter(e => e.scheduleId === scheduleId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  getAllExecutions(): ScheduledExecution[] {
    return Array.from(this.executions.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  pauseSchedule(id: string): boolean {
    return this.updateSchedule(id, { enabled: false })
  }

  resumeSchedule(id: string): boolean {
    return this.updateSchedule(id, { enabled: true })
  }

  // Quick schedule helpers
  createOnceSchedule(name: string, testConfig: TestConfiguration, startTime: Date): ScheduleConfig {
    return this.createSchedule({
      name,
      type: 'once',
      startTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      enabled: true,
      testConfiguration: testConfig
    })
  }

  createRecurringSchedule(
    name: string, 
    testConfig: TestConfiguration, 
    startTime: Date,
    endTime: Date,
    intervalMinutes: number
  ): ScheduleConfig {
    return this.createSchedule({
      name,
      type: 'recurring',
      startTime,
      endTime,
      interval: intervalMinutes,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      enabled: true,
      testConfiguration: testConfig
    })
  }

  createDailySchedule(name: string, testConfig: TestConfiguration, hour: number, minute: number = 0): ScheduleConfig {
    return this.createSchedule({
      name,
      type: 'cron',
      startTime: new Date(),
      cronExpression: `${minute} ${hour} * * *`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      enabled: true,
      testConfiguration: testConfig
    })
  }
}

export const testSchedulerService = new TestSchedulerService()
export default testSchedulerService