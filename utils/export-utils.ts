import Papa from "papaparse"
import jsPDF from "jspdf"
import "jspdf-autotable"
import type { TradingTransaction } from "@/types/trading"
import type { PortfolioAnalytics } from "@/types/portfolio"
import { format } from "date-fns"

// Extend jsPDF type to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export class ExportService {
  // Export transactions to CSV
  static exportTransactionsCSV(transactions: TradingTransaction[], filename?: string): void {
    const csvData = transactions.map((transaction) => ({
      Ticker: transaction.ticker,
      Date: transaction.date,
      Quantity: transaction.quantity,
      Price: transaction.price,
      Type: transaction.type,
      "Total Value": (transaction.quantity * transaction.price).toFixed(2),
    }))

    const csv = Papa.unparse(csvData)
    this.downloadFile(csv, filename || `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv")
  }

  // Export portfolio summary to CSV
  static exportPortfolioCSV(analytics: PortfolioAnalytics, filename?: string): void {
    const { metrics } = analytics

    const portfolioSummary = [
      {
        "Total Portfolio Value": metrics.totalValue.toFixed(2),
        "Total Cost Basis": metrics.totalCost.toFixed(2),
        "Total Gain/Loss": metrics.totalGain.toFixed(2),
        "Total Return %": metrics.totalGainPercent.toFixed(2),
        "Annualized Return %": analytics.annualizedReturn.toFixed(2),
        "Volatility %": analytics.volatility.toFixed(2),
        "Sharpe Ratio": analytics.sharpeRatio.toFixed(2),
        "Max Drawdown %": analytics.maxDrawdown.toFixed(2),
      },
    ]

    const holdingsData = metrics.positions.map((position) => ({
      Ticker: position.ticker,
      Quantity: position.quantity.toFixed(2),
      "Average Cost": position.averageCost.toFixed(2),
      "Current Price": position.currentPrice.toFixed(2),
      "Market Value": position.marketValue.toFixed(2),
      "Total Cost": position.totalCost.toFixed(2),
      "Unrealized Gain/Loss": position.unrealizedGain.toFixed(2),
      "Return %": position.unrealizedGainPercent.toFixed(2),
      "Weight %": position.weight.toFixed(2),
    }))

    // Combine summary and holdings
    const csvData = [
      "=== PORTFOLIO SUMMARY ===",
      ...Papa.unparse(portfolioSummary).split("\n"),
      "",
      "=== HOLDINGS DETAIL ===",
      ...Papa.unparse(holdingsData).split("\n"),
    ].join("\n")

    this.downloadFile(csvData, filename || `portfolio_${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv")
  }

  // Export portfolio report to PDF
  static exportPortfolioPDF(analytics: PortfolioAnalytics, userInfo: { name: string }, filename?: string): void {
    const doc = new jsPDF()
    const { metrics } = analytics

    // Header
    doc.setFontSize(20)
    doc.text("Portfolio Report", 20, 30)

    doc.setFontSize(12)
    doc.text(`Generated for: ${userInfo.name}`, 20, 45)
    doc.text(`Date: ${format(new Date(), "MMMM dd, yyyy")}`, 20, 55)

    // Portfolio Summary
    doc.setFontSize(16)
    doc.text("Portfolio Summary", 20, 75)

    const summaryData = [
      ["Total Portfolio Value", this.formatCurrency(metrics.totalValue)],
      ["Total Cost Basis", this.formatCurrency(metrics.totalCost)],
      ["Total Gain/Loss", this.formatCurrency(metrics.totalGain)],
      ["Total Return", this.formatPercent(metrics.totalGainPercent)],
      ["Annualized Return", this.formatPercent(analytics.annualizedReturn)],
      ["Volatility", this.formatPercent(analytics.volatility)],
      ["Sharpe Ratio", analytics.sharpeRatio.toFixed(2)],
      ["Max Drawdown", this.formatPercent(analytics.maxDrawdown)],
    ]

    doc.autoTable({
      startY: 85,
      head: [["Metric", "Value"]],
      body: summaryData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 },
    })

    // Holdings Table
    doc.setFontSize(16)
    doc.text("Current Holdings", 20, doc.lastAutoTable.finalY + 20)

    const holdingsHeaders = ["Ticker", "Quantity", "Avg Cost", "Current Price", "Market Value", "Return %", "Weight %"]
    const holdingsData = metrics.positions.map((position) => [
      position.ticker,
      position.quantity.toFixed(2),
      this.formatCurrency(position.averageCost),
      this.formatCurrency(position.currentPrice),
      this.formatCurrency(position.marketValue),
      this.formatPercent(position.unrealizedGainPercent),
      position.weight.toFixed(1) + "%",
    ])

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 30,
      head: [holdingsHeaders],
      body: holdingsData,
      theme: "grid",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 9 },
      columnStyles: {
        4: { halign: "right" }, // Market Value
        5: { halign: "right" }, // Return %
        6: { halign: "right" }, // Weight %
      },
    })

    // Performance Metrics
    if (analytics.performance.length > 0) {
      doc.addPage()
      doc.setFontSize(16)
      doc.text("Performance History", 20, 30)

      const performanceData = analytics.performance
        .slice(-12)
        .map((perf) => [
          format(new Date(perf.date), "MMM yyyy"),
          this.formatCurrency(perf.value),
          this.formatPercent(perf.cumulativeReturn),
        ])

      doc.autoTable({
        startY: 40,
        head: [["Date", "Portfolio Value", "Cumulative Return"]],
        body: performanceData,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 10 },
      })
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10)
      doc.text("Generated by Financial Portfolio Platform", 20, doc.internal.pageSize.height - 10)
    }

    // Save the PDF
    doc.save(filename || `portfolio_report_${format(new Date(), "yyyy-MM-dd")}.pdf`)
  }

  // Helper methods
  private static formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  private static formatPercent(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  private static downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }
}

export type ExportFormat = "csv-transactions" | "csv-portfolio" | "pdf-report"

export interface ExportOptions {
  format: ExportFormat
  filename?: string
}
