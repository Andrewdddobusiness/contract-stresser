import Link from 'next/link'
import { ArrowRight, Upload, FlaskConical, BarChart3, Zap, Shield, Gauge } from 'lucide-react'
import { cn } from '@/utils/cn'

const features = [
  {
    name: 'Deploy Contracts',
    description: 'Deploy ERC-20 contracts with custom parameters to local or testnet environments.',
    href: '/deploy',
    icon: Upload,
    color: 'text-blue-600',
  },
  {
    name: 'Stress Testing',
    description: 'Execute high-volume transaction tests with configurable parameters and scenarios.',
    href: '/test',
    icon: FlaskConical,
    color: 'text-green-600',
  },
  {
    name: 'Analytics & Metrics',
    description: 'Real-time performance monitoring with gas usage, TPS, and latency analysis.',
    href: '/dashboard',
    icon: BarChart3,
    color: 'text-purple-600',
  },
]

const benefits = [
  {
    name: 'High Performance',
    description: 'Test up to 500+ transactions with concurrent execution support',
    icon: Zap,
  },
  {
    name: 'Secure Testing',
    description: 'Safe local environment with Anvil and testnet support',
    icon: Shield,
  },
  {
    name: 'Real-time Monitoring',
    description: 'Live performance metrics and transaction tracking',
    icon: Gauge,
  },
]

export default function HomePage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="pb-80 pt-16 sm:pb-40 sm:pt-24 lg:pb-48 lg:pt-40">
          <div className="relative mx-auto max-w-7xl px-4 sm:static sm:px-6 lg:px-8">
            <div className="sm:max-w-lg">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
                Smart Contract
                <span className="text-primary"> Stress Testing</span>
              </h1>
              <p className="mt-4 text-xl text-muted-foreground">
                Test, analyze, and optimize your Ethereum smart contracts with high-volume transaction scenarios. 
                Built for developers who need reliable performance insights.
              </p>
            </div>
            <div className="mt-10">
              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/deploy"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-background px-8 py-3 text-base font-medium text-foreground shadow-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  View Demo
                </Link>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">500+</div>
                <div className="text-sm text-muted-foreground">Transactions per test</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">Real-time</div>
                <div className="text-sm text-muted-foreground">Performance monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">Multi-chain</div>
                <div className="text-sm text-muted-foreground">Local & testnet support</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-muted/50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to test smart contracts
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Comprehensive testing suite with deployment, execution, and analytics capabilities
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Link
                  key={feature.name}
                  href={feature.href}
                  className="group relative rounded-lg border border-border bg-background p-6 hover:shadow-md transition-all"
                >
                  <div>
                    <span className={cn(
                      'inline-flex rounded-lg p-3',
                      'bg-primary/10 text-primary'
                    )}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary">
                      {feature.name}
                      <span className="absolute inset-0" aria-hidden="true" />
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <span
                    className="pointer-events-none absolute right-6 top-6 text-muted-foreground group-hover:text-primary"
                    aria-hidden="true"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for Performance
            </h2>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.name} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">
                    {benefit.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            <span className="block">Ready to test your contracts?</span>
            <span className="block text-primary-foreground/80">Start stress testing today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                href="/deploy"
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-primary-foreground px-5 py-3 text-base font-medium text-primary hover:bg-primary-foreground/90"
              >
                Deploy Contract
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                href="/test"
                className="inline-flex items-center justify-center rounded-md border border-primary-foreground bg-transparent px-5 py-3 text-base font-medium text-primary-foreground hover:bg-primary-foreground/10"
              >
                Run Tests
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}