import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { setupValidationService, type ValidationSummary, type ValidationCheck, type ContractInfo } from '@/services/validation/setupValidator'
import { toast } from 'react-hot-toast'

export interface UseSetupValidationOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  onValidationComplete?: (summary: ValidationSummary) => void
}

export function useSetupValidation(
  contracts: ContractInfo[],
  options: UseSetupValidationOptions = {}
) {
  const { address } = useAccount()
  const { autoRefresh = false, refreshInterval = 30000, onValidationComplete } = options

  const [summary, setSummary] = useState<ValidationSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const runValidation = useCallback(async () => {
    if (!contracts.length) return
    
    setIsLoading(true)
    setError(null)

    try {
      const validationSummary = await setupValidationService.validateContractEcosystem(contracts)
      setSummary(validationSummary)
      setLastUpdated(new Date())
      
      if (onValidationComplete) {
        onValidationComplete(validationSummary)
      }

      // Show toast based on validation results
      if (validationSummary.canProceed) {
        if (validationSummary.completionPercentage === 100) {
          toast.success('All validation checks passed!')
        } else {
          toast.success('Critical checks passed - ready to proceed')
        }
      } else {
        toast.error(`${validationSummary.failedChecks} critical checks failed`)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed'
      setError(errorMessage)
      toast.error(`Validation error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [contracts, onValidationComplete])

  const refresh = useCallback(() => {
    runValidation()
  }, [runValidation])

  const autoFix = useCallback(async (checkId: string) => {
    if (!summary) return

    const check = summary.results.find(c => c.id === checkId)
    if (!check?.autoFix) {
      toast.error('Auto-fix not available for this check')
      return
    }

    try {
      setIsLoading(true)
      await check.autoFix()
      toast.success('Auto-fix applied successfully')
      
      // Re-run validation after auto-fix
      await runValidation()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Auto-fix failed'
      toast.error(`Auto-fix error: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [summary, runValidation])

  // Initial validation run
  useEffect(() => {
    if (contracts.length > 0) {
      runValidation()
    }
  }, [contracts, runValidation])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !contracts.length) return

    const interval = setInterval(() => {
      runValidation()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, contracts, runValidation])

  return {
    summary,
    checks: summary?.results || [],
    isLoading,
    error,
    lastUpdated,
    completionPercentage: summary?.completionPercentage || 0,
    canProceed: summary?.canProceed || false,
    refresh,
    autoFix
  }
}