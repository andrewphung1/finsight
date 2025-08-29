// Test script to validate PriceStore GOOG/GOOGL normalization and MAG7 validation
const fs = require('fs')
const path = require('path')

console.log('🧪 Testing PriceStore Validation...\n')

// Test 1: Check if GOOGL data exists
const priceHistoryPath = path.join(__dirname, '../data/stock-price-history.ts')
if (!fs.existsSync(priceHistoryPath)) {
  console.log('❌ Price history file not found!')
  process.exit(1)
}

const content = fs.readFileSync(priceHistoryPath, 'utf8')

// Test 1: Check for GOOGL data
console.log('1. Checking for GOOGL data:')
const hasGOOGL = content.includes('  GOOGL: {')
console.log(`   GOOGL data found: ${hasGOOGL ? '✅' : '❌'}`)

// Test 2: Check for GOOG data (should not exist in our import)
console.log('\n2. Checking for GOOG data:')
const hasGOOG = content.includes('  GOOG: {')
console.log(`   GOOG data found: ${hasGOOG ? '⚠️' : '✅'} (should not exist)`)

// Test 3: Check MAG7 tickers
console.log('\n3. Checking MAG7 tickers:')
const mag7Tickers = ['AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'GOOGL']
const foundTickers = []

mag7Tickers.forEach(ticker => {
  if (content.includes(`  ${ticker}: {`)) {
    foundTickers.push(ticker)
  }
})

console.log(`   Found MAG7 tickers: ${foundTickers.join(', ')}`)
console.log(`   Missing: ${mag7Tickers.filter(t => !foundTickers.includes(t)).join(', ')}`)

// Test 4: Check date consistency
console.log('\n4. Checking date consistency:')
const dateMatches = content.match(/"date": "(\d{4}-\d{2}-\d{2})"/g)
if (dateMatches) {
  const dates = dateMatches.map(match => match.match(/"date": "(\d{4}-\d{2}-\d{2})"/)[1])
  const sortedDates = dates.sort()
  
  console.log(`   Earliest date: ${sortedDates[0]}`)
  console.log(`   Latest date: ${sortedDates[sortedDates.length - 1]}`)
  console.log(`   Total data points: ${dates.length}`)
}

// Test 5: Check for ticker normalization patterns
console.log('\n5. Checking ticker normalization patterns:')
const tickerPatterns = [
  { pattern: 'AAPL.US', description: 'AAPL.US format' },
  { pattern: 'GOOGL.US', description: 'GOOGL.US format' },
  { pattern: 'GOOG.US', description: 'GOOG.US format' }
]

tickerPatterns.forEach(({ pattern, description }) => {
  const count = (content.match(new RegExp(pattern, 'g')) || []).length
  console.log(`   ${description}: ${count} occurrences`)
})

console.log('\n✅ PriceStore validation test completed!')

// Summary
console.log('\n📊 Summary:')
console.log(`   MAG7 Coverage: ${foundTickers.length}/7 tickers`)
console.log(`   GOOGL Available: ${hasGOOGL ? 'Yes' : 'No'}`)
console.log(`   GOOG Available: ${hasGOOG ? 'Yes (will be normalized)' : 'No'}`)

if (foundTickers.length === 7) {
  console.log('   ✅ All MAG7 tickers found')
} else {
  console.log(`   ⚠️ Missing ${7 - foundTickers.length} MAG7 tickers`)
}

