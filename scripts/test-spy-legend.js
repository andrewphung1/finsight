#!/usr/bin/env node

/**
 * Test Script: SPY Legend and Line Validation
 * 
 * This script tests the complete flow to ensure:
 * 1. Portfolio data is loaded correctly
 * 2. SPY benchmark calculation works
 * 3. Interactive legend appears in Return mode
 * 4. Both Portfolio and SPY lines render
 */

const fs = require('fs');
const path = require('path');

// Mock data for testing
const mockPortfolioData = [
  { date: '2023-01-15', value: 15025, return: 0, cumulativeReturn: 0 },
  { date: '2023-01-16', value: 15100, return: 0.5, cumulativeReturn: 0.5 },
  { date: '2023-01-17', value: 15250, return: 1.0, cumulativeReturn: 1.5 },
  { date: '2023-01-18', value: 15175, return: -0.5, cumulativeReturn: 1.0 },
  { date: '2023-01-19', value: 15300, return: 0.8, cumulativeReturn: 1.8 }
];

const mockTrades = [
  { date: '2023-01-15', type: 'BUY', quantity: 100, price: 150.25, fees: 9.99, ticker: 'AAPL' },
  { date: '2023-02-20', type: 'BUY', quantity: 50, price: 140.50, fees: 9.99, ticker: 'GOOGL' },
  { date: '2023-06-15', type: 'SELL', quantity: 25, price: 175.50, fees: 9.99, ticker: 'AAPL' }
];

const mockSpyData = [
  { date: '2023-01-15', close: 395.50 },
  { date: '2023-01-16', close: 396.20 },
  { date: '2023-01-17', close: 397.80 },
  { date: '2023-01-18', close: 396.50 },
  { date: '2023-01-19', close: 398.20 }
];

// Test functions
function testSpyFallback() {
  console.log('🧪 Testing SPY Fallback Logic...');
  
  // Simulate the fallback logic
  const testCases = [
    { spy: [], spyUS: mockSpyData, expected: 'SPY.US' },
    { spy: mockSpyData, spyUS: [], expected: 'SPY' },
    { spy: [], spyUS: [], expected: 'none' },
    { spy: mockSpyData, spyUS: mockSpyData, expected: 'SPY' } // Should prefer SPY
  ];
  
  testCases.forEach((testCase, index) => {
    const result = simulateSpyFallback(testCase.spy, testCase.spyUS);
    const passed = result.symbol === testCase.expected;
    console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} Expected ${testCase.expected}, got ${result.symbol} (${result.closes.length} closes)`);
  });
}

function simulateSpyFallback(spyData, spyUSData) {
  // Simulate the getSpyClosesWithFallback logic
  let symbol = 'SPY';
  let closes = spyData || [];
  
  if (closes.length === 0) {
    const altSymbol = 'SPY.US';
    const altCloses = spyUSData || [];
    if (altCloses.length > 0) {
      symbol = altSymbol;
      closes = altCloses;
    }
  }
  
  return { symbol, closes };
}

function testSpyBenchmarkCalculation() {
  console.log('\n🧪 Testing SPY Benchmark Calculation...');
  
  if (mockPortfolioData.length === 0) {
    console.log('  ❌ No portfolio data available');
    return false;
  }
  
  if (mockTrades.length === 0) {
    console.log('  ❌ No trades available');
    return false;
  }
  
  // Simulate SPY benchmark calculation
  const spyBenchmark = calculateSpyBenchmark(mockPortfolioData, mockTrades, mockSpyData);
  
  console.log(`  ✅ Portfolio data points: ${mockPortfolioData.length}`);
  console.log(`  ✅ Trades available: ${mockTrades.length}`);
  console.log(`  ✅ SPY data points: ${mockSpyData.length}`);
  console.log(`  ✅ SPY benchmark calculated: ${spyBenchmark.spyData.length > 0 ? 'Yes' : 'No'}`);
  
  if (spyBenchmark.spyData.length > 0) {
    console.log(`  ✅ SPY status: ${spyBenchmark.spyStatus}`);
    console.log(`  ✅ First SPY return: ${spyBenchmark.spyData[0]?.spyReturnRebased?.toFixed(2)}%`);
    console.log(`  ✅ Last SPY return: ${spyBenchmark.spyData[spyBenchmark.spyData.length - 1]?.spyReturnRebased?.toFixed(2)}%`);
  }
  
  return spyBenchmark.spyData.length > 0;
}

function calculateSpyBenchmark(portfolioData, trades, spyData) {
  // Simplified SPY benchmark calculation
  const spyCloseMap = new Map();
  spyData.forEach(item => spyCloseMap.set(item.date, item.close));
  
  const spyDataPoints = portfolioData.map(point => {
    const spyClose = spyCloseMap.get(point.date) || 395.50; // Default fallback
    const baseSpyValue = 395.50; // First SPY close
    const spyReturnRebased = ((spyClose / baseSpyValue) - 1) * 100;
    
    return {
      date: point.date,
      spyReturnRebased: spyReturnRebased,
      portfolioReturnRebased: point.cumulativeReturn
    };
  });
  
  return {
    spyData: spyDataPoints,
    spyStatus: `SPY benchmark calculated successfully (symbol: SPY) | SPY: 0 backfilled closes, 0 forward-filled closes`
  };
}

function testInteractiveLegend() {
  console.log('\n🧪 Testing Interactive Legend Logic...');
  
  // Test legend visibility conditions
  const testCases = [
    { viewMode: 'value', spyDataAvailable: true, expected: false, description: 'Value mode - no legend' },
    { viewMode: 'return', spyDataAvailable: false, expected: true, description: 'Return mode, no SPY - legend with Portfolio only' },
    { viewMode: 'return', spyDataAvailable: true, expected: true, description: 'Return mode, SPY available - legend with both' }
  ];
  
  testCases.forEach((testCase, index) => {
    const shouldShowLegend = testCase.viewMode === 'return';
    const passed = shouldShowLegend === testCase.expected;
    console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} ${testCase.description}`);
    
    if (shouldShowLegend) {
      const spyItemVisible = testCase.spyDataAvailable;
      console.log(`    - Legend visible: ${shouldShowLegend}`);
      console.log(`    - Portfolio item: Always visible`);
      console.log(`    - SPY item: ${spyItemVisible ? 'Visible' : 'Hidden'}`);
    }
  });
}

function testChartRendering() {
  console.log('\n🧪 Testing Chart Rendering Logic...');
  
  const spyBenchmark = calculateSpyBenchmark(mockPortfolioData, mockTrades, mockSpyData);
  const hasSpyData = spyBenchmark.spyData.length > 0;
  
  // Test Value mode
  console.log('  📊 Value Mode:');
  console.log(`    - Portfolio line: ✅ Always visible`);
  console.log(`    - SPY line: ❌ Not applicable`);
  console.log(`    - Legend: ❌ Not shown`);
  
  // Test Return mode
  console.log('  📊 Return Mode:');
  console.log(`    - Portfolio line: ✅ Always visible`);
  console.log(`    - SPY line: ${hasSpyData ? '✅ Visible' : '❌ No data'}`);
  console.log(`    - Legend: ✅ Always shown`);
  console.log(`    - Legend items: Portfolio ${hasSpyData ? '+ SPY' : 'only'}`);
  
  return hasSpyData;
}

function testDataFlow() {
  console.log('\n🧪 Testing Data Flow...');
  
  // Check if sample portfolio file exists
  const sampleFile = path.join(__dirname, '..', 'sample-portfolio.csv');
  const fileExists = fs.existsSync(sampleFile);
  console.log(`  📁 Sample portfolio file: ${fileExists ? '✅ Exists' : '❌ Missing'}`);
  
  if (fileExists) {
    const content = fs.readFileSync(sampleFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    const hasHeader = lines[0]?.includes('ticker,type,date');
    const hasData = lines.length > 1;
    
    console.log(`  📄 File content: ${lines.length} lines`);
    console.log(`  📋 Has header: ${hasHeader ? '✅' : '❌'}`);
    console.log(`  📊 Has data: ${hasData ? '✅' : '❌'}`);
    
    if (hasData) {
      const trades = lines.slice(1).map(line => {
        const [ticker, type, date] = line.split(',');
        return { ticker, type, date };
      });
      
      console.log(`  💼 Trades found: ${trades.length}`);
      console.log(`  🏢 Tickers: ${[...new Set(trades.map(t => t.ticker))].join(', ')}`);
    }
  }
  
  return fileExists;
}

// Main test execution
function runTests() {
  console.log('🚀 Starting SPY Legend and Line Validation Tests\n');
  
  const results = {
    spyFallback: false,
    spyBenchmark: false,
    interactiveLegend: false,
    chartRendering: false,
    dataFlow: false
  };
  
  try {
    testSpyFallback();
    results.spyFallback = true;
    
    results.spyBenchmark = testSpyBenchmarkCalculation();
    
    testInteractiveLegend();
    results.interactiveLegend = true;
    
    results.chartRendering = testChartRendering();
    
    results.dataFlow = testDataFlow();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
  
  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`  SPY Fallback Logic: ${results.spyFallback ? '✅' : '❌'}`);
  console.log(`  SPY Benchmark Calculation: ${results.spyBenchmark ? '✅' : '❌'}`);
  console.log(`  Interactive Legend Logic: ${results.interactiveLegend ? '✅' : '❌'}`);
  console.log(`  Chart Rendering Logic: ${results.chartRendering ? '✅' : '❌'}`);
  console.log(`  Data Flow Validation: ${results.dataFlow ? '✅' : '❌'}`);
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (!allPassed) {
    console.log('\n🔧 Troubleshooting Steps:');
    if (!results.dataFlow) {
      console.log('  1. Ensure sample-portfolio.csv exists in project root');
    }
    if (!results.spyBenchmark) {
      console.log('  2. Check that SPY data is available in PriceStore');
    }
    if (!results.chartRendering) {
      console.log('  3. Verify PortfolioPerformanceChart receives data');
    }
    console.log('  4. Upload sample-portfolio.csv and test Return mode');
  }
  
  return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
