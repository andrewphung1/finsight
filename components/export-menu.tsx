"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileText, FileSpreadsheet, FileImage, Loader2 } from "lucide-react"
import { ExportService, type ExportFormat } from "@/utils/export-utils"
import { useTradingData } from "@/hooks/use-trading-data"
import { usePortfolioAnalytics } from "@/hooks/use-portfolio-analytics"
import { useAuth } from "@/contexts/auth-context"

export function ExportMenu() {
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const { transactions } = useTradingData()
  const { analytics } = usePortfolioAnalytics()
  const { user } = useAuth()

  const handleExport = async (format: ExportFormat) => {
    if (!user) return

    setExporting(format)

    try {
      switch (format) {
        case "csv-transactions":
          if (transactions.length === 0) {
            alert("No transaction data to export. Please import your trading history first.")
            return
          }
          ExportService.exportTransactionsCSV(transactions)
          break

        case "csv-portfolio":
          if (!analytics) {
            alert("No portfolio data to export. Please import your trading history first.")
            return
          }
          ExportService.exportPortfolioCSV(analytics)
          break

        case "pdf-report":
          if (!analytics) {
            alert("No portfolio data to export. Please import your trading history first.")
            return
          }
          ExportService.exportPortfolioPDF(analytics, { name: user.name })
          break
      }
    } catch (error) {
      console.error("Export failed:", error)
      alert("Export failed. Please try again.")
    } finally {
      setExporting(null)
    }
  }

  const hasData = transactions.length > 0
  const hasAnalytics = !!analytics

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={!hasData}>
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Export Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Options</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleExport("csv-transactions")}
          disabled={!hasData || exporting === "csv-transactions"}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>Transaction History (CSV)</span>
            <span className="text-xs text-muted-foreground">All trading transactions</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => handleExport("csv-portfolio")}
          disabled={!hasAnalytics || exporting === "csv-portfolio"}
          className="cursor-pointer"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>Portfolio Summary (CSV)</span>
            <span className="text-xs text-muted-foreground">Holdings and performance data</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => handleExport("pdf-report")}
          disabled={!hasAnalytics || exporting === "pdf-report"}
          className="cursor-pointer"
        >
          <FileImage className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>Full Report (PDF)</span>
            <span className="text-xs text-muted-foreground">Complete portfolio analysis</span>
          </div>
        </DropdownMenuItem>

        {!hasData && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs text-muted-foreground">Import trading data to enable exports</div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
