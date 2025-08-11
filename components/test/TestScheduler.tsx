'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Play, Pause, Trash2, Plus, Settings, Activity, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, formatDistanceToNow } from 'date-fns'
import { testSchedulerService, ScheduleConfig, ScheduledExecution, ScheduleType } from '@/services/testing/scheduler'
import { TestConfiguration } from '@/types/testing'
import { LoadingSpinner } from '@/components/ui/loading'

const scheduleFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['once', 'recurring', 'cron'] as const),
  startDate: z.string().min(1, 'Start date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  interval: z.number().min(1, 'Interval must be at least 1 minute').optional(),
  cronExpression: z.string().optional(),
  maxRuns: z.number().min(1).optional(),
  enabled: z.boolean()
})

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>

interface TestSchedulerProps {
  testConfiguration?: TestConfiguration
  onScheduleCreate?: (schedule: ScheduleConfig) => void
}

export function TestScheduler({ testConfiguration, onScheduleCreate }: TestSchedulerProps) {
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([])
  const [executions, setExecutions] = useState<ScheduledExecution[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleConfig | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'once',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      startTime: format(new Date(), 'HH:mm'),
      enabled: true
    }
  })

  const watchedType = form.watch('type')

  useEffect(() => {
    refreshData()
    
    // Listen to schedule events
    const handleScheduleEvent = (event: CustomEvent) => {
      refreshData()
    }

    window.addEventListener('schedule:execution-started', handleScheduleEvent as EventListener)
    window.addEventListener('schedule:execution-completed', handleScheduleEvent as EventListener)
    window.addEventListener('schedule:execution-failed', handleScheduleEvent as EventListener)

    return () => {
      window.removeEventListener('schedule:execution-started', handleScheduleEvent as EventListener)
      window.removeEventListener('schedule:execution-completed', handleScheduleEvent as EventListener)
      window.removeEventListener('schedule:execution-failed', handleScheduleEvent as EventListener)
    }
  }, [])

  const refreshData = () => {
    setSchedules(testSchedulerService.getAllSchedules())
    setExecutions(testSchedulerService.getAllExecutions())
  }

  const handleCreateSchedule = (data: ScheduleFormValues) => {
    if (!testConfiguration) {
      // Handle error - no test configuration provided
      return
    }

    const startDateTime = new Date(`${data.startDate}T${data.startTime}`)
    let endDateTime: Date | undefined
    
    if (data.endDate && data.endTime) {
      endDateTime = new Date(`${data.endDate}T${data.endTime}`)
    }

    const schedule = testSchedulerService.createSchedule({
      name: data.name,
      description: data.description,
      type: data.type,
      startTime: startDateTime,
      endTime: endDateTime,
      interval: data.interval,
      cronExpression: data.cronExpression,
      maxRuns: data.maxRuns,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      enabled: data.enabled,
      testConfiguration
    })

    if (onScheduleCreate) {
      onScheduleCreate(schedule)
    }

    refreshData()
    setIsDialogOpen(false)
    form.reset()
  }

  const handleToggleSchedule = (schedule: ScheduleConfig) => {
    if (schedule.enabled) {
      testSchedulerService.pauseSchedule(schedule.id)
    } else {
      testSchedulerService.resumeSchedule(schedule.id)
    }
    refreshData()
  }

  const handleDeleteSchedule = (schedule: ScheduleConfig) => {
    testSchedulerService.deleteSchedule(schedule.id)
    refreshData()
  }

  const getStatusColor = (status: ScheduledExecution['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'running': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-500'
      default: return 'bg-yellow-500'
    }
  }

  const getScheduleTypeDescription = (schedule: ScheduleConfig) => {
    switch (schedule.type) {
      case 'once':
        return `Run once at ${format(schedule.startTime, 'MMM dd, yyyy HH:mm')}`
      case 'recurring':
        return `Every ${schedule.interval} minutes from ${format(schedule.startTime, 'MMM dd, HH:mm')} to ${
          schedule.endTime ? format(schedule.endTime, 'MMM dd, HH:mm') : 'indefinitely'
        }`
      case 'cron':
        return `Cron: ${schedule.cronExpression}`
      default:
        return 'Unknown schedule type'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Test Scheduler
              </CardTitle>
              <CardDescription>
                Schedule tests to run automatically at specific times
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!testConfiguration}>
                  <Plus className="w-4 h-4 mr-2" />
                  Schedule Test
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Schedule a Test</DialogTitle>
                  <DialogDescription>
                    Configure when and how often to run your test
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreateSchedule)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Daily stress test" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="once">Run Once</SelectItem>
                                <SelectItem value="recurring">Recurring</SelectItem>
                                <SelectItem value="cron">Cron Expression</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Automated stress test for peak hours" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {watchedType === 'recurring' && (
                      <>
                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="interval"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Interval (minutes)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="60"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="endTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>End Time</FormLabel>
                                <FormControl>
                                  <Input type="time" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="maxRuns"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Runs (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="Leave empty for unlimited"
                                  {...field}
                                  onChange={e => field.onChange(parseInt(e.target.value) || undefined)}
                                />
                              </FormControl>
                              <FormDescription>
                                Maximum number of times to run this test
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {watchedType === 'cron' && (
                      <FormField
                        control={form.control}
                        name="cronExpression"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cron Expression</FormLabel>
                            <FormControl>
                              <Input placeholder="0 9 * * *" {...field} />
                            </FormControl>
                            <FormDescription>
                              Format: "minute hour day month dayOfWeek" (e.g., "0 9 * * *" = 9:00 AM daily)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Enable schedule immediately</FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create Schedule</Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {!testConfiguration && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configure a test first before scheduling. Go to the test configuration tab to set up your test parameters.
              </AlertDescription>
            </Alert>
          )}

          {schedules.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Scheduled Tests</h3>
              <p className="text-muted-foreground mb-4">
                Schedule tests to run automatically at specific times
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map(schedule => {
                const scheduleExecutions = executions.filter(e => e.scheduleId === schedule.id)
                const lastExecution = scheduleExecutions[0]
                
                return (
                  <Card key={schedule.id} className="transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{schedule.name}</h4>
                            <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                              {schedule.enabled ? 'Active' : 'Paused'}
                            </Badge>
                            <Badge variant="outline">
                              {schedule.runCount} runs
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            {getScheduleTypeDescription(schedule)}
                          </div>
                          
                          {schedule.description && (
                            <div className="text-sm text-muted-foreground mb-2">
                              {schedule.description}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {schedule.nextRun && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Next: {formatDistanceToNow(schedule.nextRun, { addSuffix: true })}
                              </div>
                            )}
                            {schedule.lastRun && (
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                Last: {formatDistanceToNow(schedule.lastRun, { addSuffix: true })}
                              </div>
                            )}
                            {lastExecution && (
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(lastExecution.status)}`} />
                                {lastExecution.status}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleSchedule(schedule)}
                          >
                            {schedule.enabled ? (
                              <Pause className="w-4 h-4 mr-1" />
                            ) : (
                              <Play className="w-4 h-4 mr-1" />
                            )}
                            {schedule.enabled ? 'Pause' : 'Resume'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedSchedule(schedule)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteSchedule(schedule)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Executions */}
      {executions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>
              History of scheduled test executions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executions.slice(0, 10).map(execution => {
                const schedule = schedules.find(s => s.id === execution.scheduleId)
                
                return (
                  <div key={execution.executionId} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(execution.status)}`} />
                      <div>
                        <div className="font-medium">{schedule?.name || 'Unknown Schedule'}</div>
                        <div className="text-sm text-muted-foreground">
                          {format(execution.startTime, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {execution.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}