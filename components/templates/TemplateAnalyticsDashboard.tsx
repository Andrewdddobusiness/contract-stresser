'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  Download, 
  Star, 
  Users, 
  Calendar,
  GitFork,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react'
import { FlowTemplate, flowTemplateService } from '@/services/templates/templateEngine'

interface TemplateAnalytics {
  totalTemplates: number
  totalDownloads: number
  averageRating: number
  totalUsers: number
  topTemplates: Array<{
    template: FlowTemplate
    downloads: number
    rating: number
  }>
  categoryDistribution: Array<{
    name: string
    value: number
    color: string
  }>
  downloadTrend: Array<{
    date: string
    downloads: number
    templates: number
  }>
  difficultyDistribution: Array<{
    difficulty: string
    count: number
    percentage: number
  }>
  recentActivity: Array<{
    id: string
    type: 'download' | 'rating' | 'fork' | 'create'
    templateName: string
    user: string
    timestamp: Date
  }>
}

interface TemplateAnalyticsDashboardProps {
  className?: string
}

export function TemplateAnalyticsDashboard({ className }: TemplateAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<TemplateAnalytics | null>(null)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const COLORS = {
    DeFi: '#3b82f6',
    NFT: '#f59e0b', 
    Governance: '#10b981',
    Gaming: '#8b5cf6',
    Utility: '#6b7280',
    Advanced: '#ef4444'
  }

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      // Simulate API call - in real implementation, this would fetch from backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const templates = flowTemplateService.getAllTemplates()
      
      const mockAnalytics: TemplateAnalytics = {
        totalTemplates: templates.length,
        totalDownloads: templates.reduce((sum, t) => sum + t.usage.downloads, 0),
        averageRating: templates.reduce((sum, t) => sum + t.usage.averageRating, 0) / templates.length,
        totalUsers: 1247, // Mock data
        topTemplates: templates
          .sort((a, b) => b.usage.downloads - a.usage.downloads)
          .slice(0, 5)
          .map(template => ({
            template,
            downloads: template.usage.downloads,
            rating: template.usage.averageRating
          })),
        categoryDistribution: Object.entries(
          templates.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        ).map(([name, value]) => ({
          name,
          value,
          color: COLORS[name as keyof typeof COLORS] || '#6b7280'
        })),
        downloadTrend: generateMockTrendData(timeRange),
        difficultyDistribution: Object.entries(
          templates.reduce((acc, t) => {
            acc[t.difficulty] = (acc[t.difficulty] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        ).map(([difficulty, count]) => ({
          difficulty,
          count,
          percentage: (count / templates.length) * 100
        })),
        recentActivity: generateMockActivity()
      }
      
      setAnalytics(mockAnalytics)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockTrendData = (range: string) => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
    const data = []
    
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      data.push({
        date: date.toISOString().split('T')[0],
        downloads: Math.floor(Math.random() * 100) + 20,
        templates: Math.floor(Math.random() * 5) + 1
      })
    }
    
    return data
  }

  const generateMockActivity = () => {
    const activities = []
    const types = ['download', 'rating', 'fork', 'create'] as const
    
    for (let i = 0; i < 10; i++) {
      const date = new Date()
      date.setHours(date.getHours() - Math.floor(Math.random() * 48))
      
      activities.push({
        id: `activity-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        templateName: `Template ${i + 1}`,
        user: `0x${Math.random().toString(16).slice(2, 8)}`,
        timestamp: date
      })
    }
    
    return activities
  }

  if (isLoading || !analytics) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Template Analytics</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Template Analytics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalTemplates}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalDownloads.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600 mt-1">
              <Download className="w-3 h-3 mr-1" />
              +8% from last period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</div>
            <div className="flex items-center text-xs text-yellow-600 mt-1">
              <Star className="w-3 h-3 mr-1" />
              Based on all ratings
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-blue-600 mt-1">
              <Users className="w-3 h-3 mr-1" />
              +5% from last period
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Download Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Download Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.downloadTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [value, name === 'downloads' ? 'Downloads' : 'New Templates']}
                />
                <Area
                  type="monotone"
                  dataKey="downloads"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="w-5 h-5" />
              <span>Category Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Templates */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5" />
              <span>Top Templates</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.topTemplates.map((item, index) => (
              <div key={item.template.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{item.template.name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-xs">{item.template.category}</Badge>
                      <span>•</span>
                      <span>{item.template.difficulty}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 text-sm">
                    <Download className="w-4 h-4" />
                    <span>{item.downloads}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.recentActivity.map(activity => {
              const getActivityIcon = (type: string) => {
                switch (type) {
                  case 'download': return <Download className="w-4 h-4 text-blue-600" />
                  case 'rating': return <Star className="w-4 h-4 text-yellow-600" />
                  case 'fork': return <GitFork className="w-4 h-4 text-green-600" />
                  case 'create': return <Eye className="w-4 h-4 text-purple-600" />
                  default: return <Eye className="w-4 h-4" />
                }
              }

              const getActivityText = (type: string) => {
                switch (type) {
                  case 'download': return 'downloaded'
                  case 'rating': return 'rated'
                  case 'fork': return 'forked'
                  case 'create': return 'created'
                  default: return 'interacted with'
                }
              }

              return (
                <div key={activity.id} className="flex items-start space-x-3 text-sm">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p>
                      <span className="font-medium">
                        {activity.user.slice(0, 6)}...{activity.user.slice(-4)}
                      </span>
                      {' '}{getActivityText(activity.type)}{' '}
                      <span className="font-medium">{activity.templateName}</span>
                    </p>
                    <p className="text-muted-foreground">
                      {activity.timestamp.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}