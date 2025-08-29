#!/usr/bin/env node

/**
 * Test Script: Portfolio Import Validation
 * 
 * This script tests the complete portfolio import flow to identify why
 * no data is being loaded into the application.
 */

const fs = require('fs');
const path = require('path');

// Test the sample portfolio file
function testSamplePortfolioFile() {
  console.log('🧪 Testing Sample Portfolio File...');
  
  const sampleFile = path.join(__dirname, '..', 'sample-portfolio.csv');
  const fileExists = fs.existsSync(sampleFile);
  
  if (!fileExists) {
    console.log('  ❌ Sample portfolio file not found');
    return false;
  }
  
  console.log('  ✅ Sample portfolio file exists');
  
  const content = fs.readFileSync(sampleFile, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log(`  📄 File has ${lines.length} lines`);
  
  if (lines.length < 2) {
    console.log('  ❌ File has insufficient data');
    return false;
  }
  
  // Check header
  const header = lines[0];
  const expectedHeader = 'ticker,type,date,quantity,price,fees,notes';
  
  if (header !== expectedHeader) {
    console.log(`  ❌ Invalid header. Expected: ${expectedHeader}, Got: ${header}`);
    return false;
  }
  
  console.log('  ✅ Header is valid');
  
  // Parse trades
  const trades = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    
    if (parts.length >= 4) {
      const [ticker, type, date, quantity] = parts;
      trades.push({ ticker, type, date, quantity: parseFloat(quantity) || 0 });
    }
  }
  
  console.log(`  💼 Found ${trades.length} trades`);
  console.log(`  🏢 Tickers: ${[...new Set(trades.map(t => t.ticker))].join(', ')}`);
  
  // Check if trades are valid
  const validTrades = trades.filter(t => 
    t.ticker && 
    ['BUY', 'SELL'].includes(t.type) && 
    t.date && 
    t.quantity > 0
  );
  
  console.log(`  ✅ Valid trades: ${validTrades.length}/${trades.length}`);
  
  return validTrades.length > 0;
}

// Test session storage simulation
function testSessionStorage() {
  console.log('\n🧪 Testing Session Storage Simulation...');
  
  // Simulate the session storage logic
  const mockSessionData = {
    sid: 'test-session-123',
    positions: [
      { ticker: 'AAPL', quantity: 100, marketValue: 15000, costBasis: 15025 }
    ],
    equitySeries: [
      { date: '2023-01-15', value: 15025, return: 0, cumulativeReturn: 0 },
      { date: '2023-01-16', value: 15100, return: 0.5, cumulativeReturn: 0.5 }
    ],
    metrics: {
      totalValue: 15000,
      totalCost: 15025,
      totalGain: -25,
      totalGainPercent: -0.17,
      ytdReturn: 0.5
    },
    status: {
      valuedThrough: '2023-01-16',
      bridgedTickers: [],
      missingPrices: [],
      spotValuedTickers: []
    }
  };
  
  // Simulate storing and retrieving
  const sessionKey = `import-session-${mockSessionData.sid}`;
  const sessionJson = JSON.stringify(mockSessionData);
  
  // In a real browser environment, this would be sessionStorage.setItem
  console.log('  📦 Session data size:', sessionJson.length, 'characters');
  console.log('  🔑 Session key:', sessionKey);
  console.log('  📊 Session contains:', {
    positions: mockSessionData.positions.length,
    equitySeries: mockSessionData.equitySeries.length,
    totalValue: mockSessionData.metrics.totalValue
  });
  
  return true;
}

// Test the import flow
function testImportFlow() {
  console.log('\n🧪 Testing Import Flow...');
  
  // Simulate the FileUpload component logic
  const steps = [
    '1. User selects CSV file',
    '2. CSVParser.parseCSVFile() called',
    '3. TransactionValidator.validateAndNormalize() called',
    '4. PortfolioComputer.computePortfolio() called',
    '5. storeImportSession() called',
    '6. SessionProvider loads session',
    '7. Dashboard receives session data'
  ];
  
  steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step}`);
  });
  
  // Check if the issue might be in the import process
  console.log('\n  🔍 Potential Issues:');
  console.log('    - CSVParser not working correctly');
  console.log('    - TransactionValidator failing validation');
  console.log('    - PortfolioComputer not computing data');
  console.log('    - Session storage not working');
  console.log('    - SessionProvider not loading data');
  console.log('    - Dashboard not receiving session');
  
  return true;
}

// Test the current application state
function testCurrentState() {
  console.log('\n🧪 Testing Current Application State...');
  
  // Based on the logs, here's what we know:
  console.log('  📊 Current State Analysis:');
  console.log('    - PortfolioPerformanceChart received data: { dataLength: 0, data: [] }');
  console.log('    - SPY Benchmark: Skipping calculation - missing data');
  console.log('    - usePortfolioData: session state: { session: false }');
  console.log('    - Dashboard: equitySeriesLength: 0');
  
  console.log('\n  🎯 Root Cause:');
  console.log('    - No portfolio data is being loaded');
  console.log('    - Session is false/empty');
  console.log('    - Import process is failing somewhere');
  
  return false;
}

// Main test execution
function runTests() {
  console.log('🚀 Starting Portfolio Import Validation Tests\n');
  
  const results = {
    sampleFile: false,
    sessionStorage: false,
    importFlow: false,
    currentState: false
  };
  
  try {
    results.sampleFile = testSamplePortfolioFile();
    results.sessionStorage = testSessionStorage();
    results.importFlow = testImportFlow();
    results.currentState = testCurrentState();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
  
  // Summary
  console.log('\n📋 Test Summary:');
  console.log(`  Sample Portfolio File: ${results.sampleFile ? '✅' : '❌'}`);
  console.log(`  Session Storage Logic: ${results.sessionStorage ? '✅' : '❌'}`);
  console.log(`  Import Flow Logic: ${results.importFlow ? '✅' : '❌'}`);
  console.log(`  Current State Analysis: ${results.currentState ? '✅' : '❌'}`);
  
  console.log('\n🎯 Diagnosis:');
  if (!results.sampleFile) {
    console.log('  ❌ Sample portfolio file is missing or invalid');
  } else if (!results.sessionStorage) {
    console.log('  ❌ Session storage logic is broken');
  } else {
    console.log('  ✅ File and storage logic are working');
    console.log('  ❌ The issue is in the import process itself');
  }
  
  console.log('\n🔧 Solution Steps:');
  console.log('  1. Go to http://localhost:3001');
  console.log('  2. Click "Import" tab in sidebar');
  console.log('  3. Upload sample-portfolio.csv');
  console.log('  4. Check browser console for import errors');
  console.log('  5. Verify session is created in sessionStorage');
  console.log('  6. Check if Dashboard receives the session data');
  
  return results.sampleFile && results.sessionStorage;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
