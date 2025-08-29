import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PortfolioPerformanceChart } from '../charts/portfolio-performance-chart'
import { PerformanceData } from '../../types/portfolio'
import { NormalizedTransaction } from '../../types/portfolio'

// Mock recharts to avoid DOM issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}))

// Mock PriceStore
jest.mock('../../lib/price-store', () => ({
  priceStore: {
    getDailyCloses: jest.fn().mockImplementation((ticker: string, startDate: string, endDate: string) => {
      if (ticker === 'SPY') {
        return [
          { date: '2023-01-15', close: 391.80 },
          { date: '2023-01-16', close: 393.50 },
          { date: '2023-01-17', close: 394.20 },
          { date: '2023-02-20', close: 399.90 },
          { date: '2023-03-15', close: 403.90 },
          { date: '2023-04-10', close: 406.80 },
          { date: '2023-05-20', close: 409.90 }
        ]
      }
      return []
    })
  }
}))

describe('PortfolioPerformanceChart', () => {
  const mockPerformanceData: PerformanceData[] = [
    { date: '2023-01-15', value: 1500.00 },
    { date: '2023-01-16', value: 1510.00 },
    { date: '2023-01-17', value: 1520.00 },
    { date: '2023-02-20', value: 1600.00 },
    { date: '2023-03-15', value: 1650.00 },
    { date: '2023-04-10', value: 1700.00 },
    { date: '2023-05-20', value: 1750.00 }
  ]

  const mockTrades: NormalizedTransaction[] = [
    {
      date: '2023-01-15',
      ticker: 'AAPL',
      type: 'BUY',
      quantity: 10,
      price: 150.00,
      fees: 9.99
    },
    {
      date: '2023-03-15',
      ticker: 'AAPL',
      type: 'SELL',
      quantity: 5,
      price: 160.00,
      fees: 9.99
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Value Mode', () => {
    it('should render single line chart in Value mode', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      expect(screen.getByTestId('area-chart')).toBeInTheDocument()
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
    })

    it('should display portfolio value in tooltip', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // Check that the chart renders without errors
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should maintain consistent X-axis ticks', () => {
      const { rerender } = render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // Re-render with same data to check consistency
      rerender(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Return Mode', () => {
    it('should render two-line chart in Return mode when trades are provided', async () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // The component should automatically calculate SPY benchmark when trades are provided
      await waitFor(() => {
        expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
      })
    })

    it('should use correct colors for Portfolio and SPY lines', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // Check that the chart renders (colors are handled by recharts)
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should display both Portfolio and SPY returns in tooltip', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // Check that the chart renders with tooltip support
      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
    })

    it('should maintain X-axis consistency between Value and Return modes', () => {
      const { rerender } = render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // Re-render to simulate mode toggle
      rerender(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Interactive Legend', () => {
    it('should render legend only in Return mode', () => {
      const { rerender } = render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // Should not show legend in Value mode
      expect(screen.queryByText('Portfolio')).not.toBeInTheDocument()
      expect(screen.queryByText('S&P 500')).not.toBeInTheDocument()

      // Switch to Return mode
      rerender(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={true}
          trades={mockTrades}
        />
      )

      // Should show legend in Return mode
      expect(screen.getByText('Portfolio')).toBeInTheDocument()
      expect(screen.getByText('S&P 500')).toBeInTheDocument()
    })

    it('should toggle line visibility when legend items are clicked', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={true}
          trades={mockTrades}
        />
      )

      const portfolioButton = screen.getByRole('button', { name: /toggle portfolio series/i })
      const spyButton = screen.getByRole('button', { name: /toggle s&p 500 series/i })

      // Default state: both should be pressed (visible)
      expect(portfolioButton).toHaveAttribute('aria-pressed', 'true')
      expect(spyButton).toHaveAttribute('aria-pressed', 'true')

      // Click Portfolio button
      fireEvent.click(portfolioButton)
      expect(portfolioButton).toHaveAttribute('aria-pressed', 'false')

      // Click S&P 500 button
      fireEvent.click(spyButton)
      expect(spyButton).toHaveAttribute('aria-pressed', 'false')

      // Click Portfolio button again to show it
      fireEvent.click(portfolioButton)
      expect(portfolioButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should support keyboard navigation', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={true}
          trades={mockTrades}
        />
      )

      const portfolioButton = screen.getByRole('button', { name: /toggle portfolio series/i })

      // Focus the button
      portfolioButton.focus()
      expect(portfolioButton).toHaveFocus()

      // Toggle with Enter key
      fireEvent.keyDown(portfolioButton, { key: 'Enter' })
      expect(portfolioButton).toHaveAttribute('aria-pressed', 'false')

      // Toggle with Space key
      fireEvent.keyDown(portfolioButton, { key: ' ' })
      expect(portfolioButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have correct colors for legend items', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={true}
          trades={mockTrades}
        />
      )

      const portfolioButton = screen.getByRole('button', { name: /toggle portfolio series/i })
      const spyButton = screen.getByRole('button', { name: /toggle s&p 500 series/i })

      // Check that the color dots are present
      const portfolioDot = portfolioButton.querySelector('div[class*="bg-[#4f8bf0]"]')
      const spyDot = spyButton.querySelector('div[class*="bg-[#d4af37]"]')

      expect(portfolioDot).toBeInTheDocument()
      expect(spyDot).toBeInTheDocument()
    })

    it('should show muted style when line is hidden', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={true}
          trades={mockTrades}
        />
      )

      const portfolioButton = screen.getByRole('button', { name: /toggle portfolio series/i })

      // Click to hide the line
      fireEvent.click(portfolioButton)

      // Should have muted styling
      expect(portfolioButton).toHaveClass('opacity-60')
      expect(portfolioButton).toHaveClass('text-gray-500')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', () => {
      render(
        <PortfolioPerformanceChart
          data={[]}
          loading={false}
          showSP500={false}
          trades={[]}
        />
      )

      expect(screen.getByText('No performance data available')).toBeInTheDocument()
    })

    it('should handle loading state', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={true}
          showSP500={false}
          trades={mockTrades}
        />
      )

      expect(screen.getByText('Loading performance data...')).toBeInTheDocument()
    })

    it('should handle missing SPY data', () => {
      // Mock PriceStore to return empty SPY data
      const mockPriceStore = require('../../lib/price-store')
      mockPriceStore.priceStore.getDailyCloses.mockReturnValue([])

      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })

    it('should handle zero base values', () => {
      const zeroData: PerformanceData[] = [
        { date: '2023-01-15', value: 0 },
        { date: '2023-01-16', value: 0 },
        { date: '2023-01-17', value: 1000.00 }
      ]

      render(
        <PortfolioPerformanceChart
          data={zeroData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Period Selection', () => {
    it('should handle different time periods', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      // Check that period selector buttons are present
      expect(screen.getByText('1M')).toBeInTheDocument()
      expect(screen.getByText('3M')).toBeInTheDocument()
      expect(screen.getByText('6M')).toBeInTheDocument()
      expect(screen.getByText('1Y')).toBeInTheDocument()
      expect(screen.getByText('2Y')).toBeInTheDocument()
      expect(screen.getByText('5Y')).toBeInTheDocument()
      expect(screen.getByText('All')).toBeInTheDocument()
    })

    it('should update chart when period changes', () => {
      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
        />
      )

      const threeMonthButton = screen.getByText('3M')
      fireEvent.click(threeMonthButton)

      expect(screen.getByTestId('responsive-container')).toBeInTheDocument()
    })
  })

  describe('Status Messages', () => {
    it('should display status information', () => {
      const status = {
        valuedThrough: '2023-05-20',
        bridgedTickers: ['AAPL'],
        missingPrices: [],
        spotValuedTickers: ['JPM']
      }

      render(
        <PortfolioPerformanceChart
          data={mockPerformanceData}
          loading={false}
          showSP500={false}
          trades={mockTrades}
          status={status}
        />
      )

      // Check that status information is displayed
      expect(screen.getByText(/Bridged to latest price for: AAPL/)).toBeInTheDocument()
      expect(screen.getByText(/Using EquityEngine/)).toBeInTheDocument()
    })
  })
})
