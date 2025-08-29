import { useMemo } from 'react'
import type { FinancialDataPoint } from '@/data/mag7-stocks'

export function useFreeCashFlow(data: FinancialDataPoint[], timePeriod: 'quarterly' | 'ttm' | 'annual' = 'quarterly') {
  const { value, isEstimated } = useMemo(() => {
    if (!data || data.length === 0) {
      return { value: null, isEstimated: true }
    }

    // Get the most recent data point
    const latestData = data[0]
    
    // Try to get FCF from the data
    let fcf = latestData.freeCashFlow
    
    // If FCF is not available, estimate it
    if (!fcf || fcf === 0) {
      // Estimate FCF as Operating Cash Flow - Capital Expenditures
      const operatingCashFlow = latestData.operatingCashFlow || 0
      const capitalExpenditures = latestData.capitalExpenditures || 0
      fcf = operatingCashFlow - capitalExpenditures
      
      // If still no FCF, use net income as a rough estimate
      if (!fcf || fcf === 0) {
        fcf = latestData.netIncome || 0
      }
      
      return { value: fcf, isEstimated: true }
    }
    
    return { value: fcf, isEstimated: false }
  }, [data, timePeriod])

  return { value, isEstimated }
}
