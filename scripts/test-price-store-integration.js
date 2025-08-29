// Simple integration test for PriceStore data
// This validates the data structure and basic functionality

console.log('🧪 Testing PriceStore Data Integration...\n')

// Test 1: Check if we can access the data
try {
  const { STOCK_PRICE_HISTORY } = require('../data/stock-price-history')
  
  console.log('1. Testing data structure:')
  const tickers = Object.keys(STOCK_PRICE_HISTORY)
  console.log(`   Available tickers: ${tickers.join(', ')}`)
  
  // Test 2: Latest prices
  console.log('\n2. Testing latest prices:')
  const aaplData = STOCK_PRICE_HISTORY.AAPL
  const aaplLatest = aaplData.priceHistory[aaplData.priceHistory.length - 1]?.adjustedClose
  const msftData = STOCK_PRICE_HISTORY.MSFT
  const msftLatest = msftData.priceHistory[msftData.priceHistory.length - 1]?.adjustedClose
  console.log(`   AAPL latest: $${aaplLatest}`)
  console.log(`   MSFT latest: $${msftLatest}`)
  
  // Test 3: Data range
  console.log('\n3. Testing data range:')
  const aaplHistory = aaplData.priceHistory
  const firstDate = aaplHistory[0]?.date
  const lastDate = aaplHistory[aaplHistory.length - 1]?.date
  console.log(`   AAPL date range: ${firstDate} to ${lastDate}`)
  console.log(`   Total data points: ${aaplHistory.length}`)
  
  // Test 4: Sample data structure
  console.log('\n4. Testing sample data structure:')
  const samplePoint = aaplHistory[0]
  console.log(`   Sample point:`, {
    date: samplePoint.date,
    close: samplePoint.close,
    adjustedClose: samplePoint.adjustedClose,
    volume: samplePoint.volume
  })
  
  // Test 5: Data consistency
  console.log('\n5. Testing data consistency:')
  const allStocks = Object.values(STOCK_PRICE_HISTORY)
  const consistentData = allStocks.every(stock => 
    stock.priceHistory.length > 0 && 
    stock.priceHistory.every(point => 
      point.date && 
      point.close > 0 && 
      point.adjustedClose > 0
    )
  )
  console.log(`   Data consistency: ${consistentData ? '✅ PASS' : '❌ FAIL'}`)
  
  // Test 6: Date format validation
  console.log('\n6. Testing date format:')
  const dateFormatValid = aaplHistory.every(point => 
    /^\d{4}-\d{2}-\d{2}$/.test(point.date)
  )
  console.log(`   Date format valid: ${dateFormatValid ? '✅ PASS' : '❌ FAIL'}`)
  
  // Test 7: Price validation
  console.log('\n7. Testing price validation:')
  const priceValid = aaplHistory.every(point => 
    point.close > 0 && 
    point.adjustedClose > 0 && 
    point.volume >= 0
  )
  console.log(`   Price validation: ${priceValid ? '✅ PASS' : '❌ FAIL'}`)
  
  console.log('\n✅ PriceStore integration test completed!')
  
} catch (error) {
  console.error('❌ PriceStore integration test failed:', error.message)
  console.error(error.stack)
}
