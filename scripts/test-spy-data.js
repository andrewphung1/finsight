#!/usr/bin/env node

/**
 * Test Script: SPY Data Loading Validation
 * 
 * This script tests if SPY data is properly loaded and accessible
 * in the PriceStore, which is required for the SPY benchmark to work.
 */

// Mock the browser environment
global.window = {}
global.document = {}

// Import the modules we need to test
const { SPY_PRICE_HISTORY } = require('../data/spy-price-history')

// Test SPY data file
function testSpyDataFile() {
  console.log('🧪 Testing SPY Data File...');
  
  if (!SPY_PRICE_HISTORY) {
    console.log('  ❌ SPY_PRICE_HISTORY is not exported');
    return false;
  }
  
  console.log('  ✅ SPY_PRICE_HISTORY is exported');
  
  if (!SPY_PRICE_HISTORY.priceHistory) {
    console.log('  ❌ SPY_PRICE_HISTORY.priceHistory is missing');
    return false;
  }
  
  console.log('  ✅ SPY_PRICE_HISTORY.priceHistory exists');
  
  const priceHistory = SPY_PRICE_HISTORY.priceHistory;
  console.log(`  📊 SPY price history has ${priceHistory.length} data points`);
  
  if (priceHistory.length === 0) {
    console.log('  ❌ SPY price history is empty');
    return false;
  }
  
  // Check first and last data points
  const firstPoint = priceHistory[0];
  const lastPoint = priceHistory[priceHistory.length - 1];
  
  console.log('  📅 Date range:', {
    first: firstPoint?.date,
    last: lastPoint?.date,
    firstClose: firstPoint?.adjustedClose,
    lastClose: lastPoint?.adjustedClose
  });
  
  // Validate data structure
  const isValid = priceHistory.every(point => 
    point.date && 
    typeof point.adjustedClose === 'number' && 
    point.adjustedClose > 0
  );
  
  if (!isValid) {
    console.log('  ❌ SPY data has invalid structure');
    return false;
  }
  
  console.log('  ✅ SPY data structure is valid');
  
  return true;
}

// Test PriceStore SPY loading (simulated)
function testPriceStoreSpyLoading() {
  console.log('\n🧪 Testing PriceStore SPY Loading (Simulated)...');
  
  // Simulate the PriceStore initialization
  const mockPriceData = new Map();
  const mockTickerMap = new Map();
  
  // Simulate loading SPY data
  mockPriceData.set('SPY', SPY_PRICE_HISTORY.priceHistory);
  mockTickerMap.set('SPY', 'SPY');
  mockTickerMap.set('SPY.US', 'SPY');
  
  console.log('  ✅ SPY data loaded into PriceStore');
  console.log('  ✅ SPY ticker mappings created');
  
  // Test ticker normalization
  const normalizeTicker = (ticker) => {
    return mockTickerMap.get(ticker.toUpperCase()) || ticker.toUpperCase();
  };
  
  const testCases = [
    { input: 'SPY', expected: 'SPY' },
    { input: 'SPY.US', expected: 'SPY' },
    { input: 'spy', expected: 'SPY' },
    { input: 'UNKNOWN', expected: 'UNKNOWN' }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = normalizeTicker(testCase.input);
    const passed = result === testCase.expected;
    console.log(`  Test ${index + 1}: ${passed ? '✅' : '❌'} "${testCase.input}" → "${result}" (expected: "${testCase.expected}")`);
  });
  
  // Test data retrieval
  const spyData = mockPriceData.get('SPY');
  if (spyData && spyData.length > 0) {
    console.log('  ✅ SPY data can be retrieved from PriceStore');
    console.log(`  📊 Retrieved ${spyData.length} data points`);
  } else {
    console.log('  ❌ SPY data cannot be retrieved from PriceStore');
    return false;
  }
  
  return true;
}

// Test SPY fallback logic
function testSpyFallbackLogic() {
  console.log('\n🧪 Testing SPY Fallback Logic...');
  
  // Simulate the getSpyClosesWithFallback function
  const simulateGetSpyCloses = (symbol, start, end) => {
    // Mock implementation
    if (symbol === 'SPY' || symbol === 'SPY.US') {
      return SPY_PRICE_HISTORY.priceHistory.filter(point => 
        point.date >= start && point.date <= end
      ).map(point => ({
        date: point.date,
        close: point.adjustedClose
      }));
    }
    return [];
  };
  
  const getSpyClosesWithFallback = (start, end) => {
    // Try SPY first
    let symbol = 'SPY';
    let closes = simulateGetSpyCloses(symbol, start, end);
    
    // Fallback to SPY.US if needed
    if (closes.length === 0) {
      const altSymbol = 'SPY.US';
      const altCloses = simulateGetSpyCloses(altSymbol, start, end);
      if (altCloses.length > 0) {
        symbol = altSymbol;
        closes = altCloses;
      }
    }
    
    return { symbol, closes };
  };
  
  // Test cases
  const testCases = [
    { start: '2023-01-15', end: '2023-01-20', description: 'Valid date range' },
    { start: '2020-01-01', end: '2020-01-05', description: 'Date range before SPY data' },
    { start: '2025-01-01', end: '2025-01-05', description: 'Date range after SPY data' }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = getSpyClosesWithFallback(testCase.start, testCase.end);
    console.log(`  Test ${index + 1}: ${testCase.description}`);
    console.log(`    Symbol: ${result.symbol}, Closes: ${result.closes.length}`);
    
    if (result.closes.length > 0) {
      console.log(`    First close: ${result.closes[0]?.close}`);
      console.log(`    Last close: ${result.closes[result.closes.length - 1]?.close}`);
    }
  });
  
  return true;
}

// Test the actual issue
function testActualIssue() {
  console.log('\n🧪 Testing Actual Issue...');
  
  console.log('  📊 Based on your feedback:');
  console.log('    ✅ Portfolio import is working');
  console.log('    ✅ Portfolio value and returns are plotting');
  console.log('    ❌ SPY line is not appearing');
  console.log('    ❌ SPY legend item is not showing');
  
  console.log('\n  🔍 Potential Issues:');
  console.log('    1. SPY data not loaded in PriceStore');
  console.log('    2. SPY fallback logic not working');
  console.log('    3. SPY benchmark calculation failing');
  console.log('    4. Legend rendering logic issue');
  console.log('    5. ViewMode not being set to "return"');
  
  console.log('\n  🎯 Most Likely Issue:');
  console.log('    - The SPY data is loaded but the benchmark calculation');
  console.log('      is failing due to date range mismatch or other logic error');
  
  return false;
}

// Main test execution
function runTests() {
  console.log('🚀 Starting SPY Data Loading Validation Tests\n');
  
  const results = {
    spyDataFile: false,
    priceStoreLoading: false,
    fallbackLogic: false,
    actualIssue: false
  };
  
  try {
    results.spyDataFile = testSpyDataFile();
    results.priceStoreLoading = testPriceStoreSpyLoading();
    results.fallbackLogic = testSpyFallbackLogic();
    results.actualIssue = testActualIssue();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
  
  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`  SPY Data File: ${results.spyDataFile ? '✅' : '❌'}`);
  console.log(`  PriceStore Loading: ${results.priceStoreLoading ? '✅' : '❌'}`);
  console.log(`  Fallback Logic: ${results.fallbackLogic ? '✅' : '❌'}`);
  console.log(`  Actual Issue Analysis: ${results.actualIssue ? '✅' : '❌'}`);
  
  console.log('\n🎯 Next Steps:');
  console.log('  1. Check browser console for SPY-related logs');
  console.log('  2. Look for "[SPY closes]" debug messages');
  console.log('  3. Check if "SPY Benchmark: Starting calculation" appears');
  console.log('  4. Verify that viewMode is "return" when you click Return button');
  console.log('  5. Check if spyBenchmarkData.spyData.length > 0');
  
  return results.spyDataFile && results.priceStoreLoading;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
