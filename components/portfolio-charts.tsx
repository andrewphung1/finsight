"use client"

import { PortfolioPerformanceChart } from "./charts/portfolio-performance-chart"
import { AssetAllocationChart } from "./charts/asset-allocation-chart"
import { HoldingsPerformanceChart } from "./charts/holdings-performance-chart"
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics"

export function PortfolioCharts() {
  const { analytics, loading, hasData } = usePortfolioAnalytics()

  if (!hasData) {
    return (
      <div className="space-y-6">
        <PortfolioPerformanceChart data={[]} loading={false} />
        <div className="grid gap-6 md:grid-cols-2">
          <AssetAllocationChart data={[]} loading={false} />
          <HoldingsPerformanceChart transactions={[]} loading={false} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PortfolioPerformanceChart data={analytics?.performance || []} loading={loading} />

      <div className="grid gap-6 md:grid-cols-2">
        <AssetAllocationChart data={analytics?.metrics.assetAllocation || []} loading={loading} />
        <HoldingsPerformanceChart transactions={[]} loading={loading} />
      </div>
    </div>
  )
}
