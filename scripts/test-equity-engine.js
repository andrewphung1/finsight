// Test script to validate EquityEngine functionality
const fs = require('fs')
const path = require('path')

console.log('🧪 Testing EquityEngine...\n')

// Test 1: Check if PriceStore data is available
console.log('1. Checking PriceStore data availability:')
const priceHistoryPath = path.join(__dirname, '../data/stock-price-history.ts')
if (!fs.existsSync(priceHistoryPath)) {
  console.log('❌ Price history file not found!')
  process.exit(1)
}

const content = fs.readFileSync(priceHistoryPath, 'utf8')
const mag7Tickers = ['AAPL', 'MSFT', 'AMZN', 'NVDA', 'META', 'TSLA', 'GOOGL']
const foundTickers = mag7Tickers.filter(ticker => content.includes(`  ${ticker}: {`))

console.log(`   MAG7 tickers found: ${foundTickers.length}/7`)
console.log(`   Available: ${foundTickers.join(', ')}`)

// Test 2: Check data structure
console.log('\n2. Checking data structure:')
const hasPriceHistory = content.includes('priceHistory: [')
const hasDateField = content.includes('date: "')
const hasAdjustedCloseField = content.includes('adjustedClose: ')

console.log(`   Has priceHistory array: ${hasPriceHistory ? '✅' : '❌'}`)
console.log(`   Has date field: ${hasDateField ? '✅' : '❌'}`)
console.log(`   Has adjustedClose field: ${hasAdjustedCloseField ? '✅' : '❌'}`)

// Test 3: Check date range consistency
console.log('\n3. Checking date range consistency:')
const dateMatches = content.match(/date: "(\d{4}-\d{2}-\d{2})"/g)
if (dateMatches) {
  const dates = dateMatches.map(match => match.match(/date: "(\d{4}-\d{2}-\d{2})"/)[1])
  const sortedDates = dates.sort()
  
  console.log(`   Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`)
  console.log(`   Total data points: ${dates.length}`)
  
  // Check if all tickers have same date range
  const uniqueDates = [...new Set(dates)]
  console.log(`   Unique dates: ${uniqueDates.length}`)
  
  if (uniqueDates.length === dates.length / foundTickers.length) {
    console.log('   ✅ All tickers appear to have same date range')
  } else {
    console.log('   ⚠️ Tickers may have different date ranges')
  }
}

// Test 4: Check price data quality
console.log('\n4. Checking price data quality:')
const priceMatches = content.match(/adjustedClose: \d+\.\d+/g)
if (priceMatches) {
  const prices = priceMatches.map(match => parseFloat(match.match(/adjustedClose: (\d+\.\d+)/)[1]))
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length
  
  console.log(`   Price range: $${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`)
  console.log(`   Average price: $${avgPrice.toFixed(2)}`)
  console.log(`   Total price points: ${prices.length}`)
  
  // Check for reasonable prices (not 0 or negative)
  const validPrices = prices.filter(p => p > 0)
  console.log(`   Valid prices (>0): ${validPrices.length}/${prices.length}`)
}

console.log('\n✅ EquityEngine data validation completed!')

// Summary
console.log('\n📊 Summary:')
console.log(`   MAG7 Coverage: ${foundTickers.length}/7 tickers`)
console.log(`   Data Quality: ${dateMatches ? 'Good' : 'Poor'}`)
console.log(`   Price Quality: ${priceMatches ? 'Good' : 'Poor'}`)

if (foundTickers.length === 7) {
  console.log('   ✅ Ready for EquityEngine implementation')
} else {
  console.log(`   ⚠️ Missing ${7 - foundTickers.length} tickers`)
}
