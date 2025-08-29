// Note: This is a manual test script
// In a real TypeScript environment, you would import like:
// import { PriceStore } from '../lib/price-store'

// For now, let's test the functionality by checking the generated data file
const fs = require('fs')
const path = require('path')

console.log('🧪 Testing PriceStore data...\n')

// Check if the price history file exists
const priceHistoryPath = path.join(__dirname, '../data/stock-price-history.ts')
if (!fs.existsSync(priceHistoryPath)) {
  console.log('❌ Price history file not found!')
  process.exit(1)
}

// Read the first few lines to check structure
const content = fs.readFileSync(priceHistoryPath, 'utf8')
const lines = content.split('\n')

console.log('1. Checking price history file structure:')
console.log(`   File size: ${(content.length / 1024 / 1024).toFixed(2)} MB`)
console.log(`   Lines: ${lines.length}`)

// Check for MAG7 stocks
const mag7Stocks = ['AAPL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'META']
const foundStocks = []

mag7Stocks.forEach(stock => {
  if (content.includes(`  ${stock}: {`)) {
    foundStocks.push(stock)
  }
})

console.log(`\n2. Found MAG7 stocks: ${foundStocks.join(', ')}`)
console.log(`   Missing: ${mag7Stocks.filter(s => !foundStocks.includes(s)).join(', ')}`)

// Check data range
const dateMatches = content.match(/"date": "(\d{4}-\d{2}-\d{2})"/g)
if (dateMatches) {
  const dates = dateMatches.map(match => match.match(/"date": "(\d{4}-\d{2}-\d{2})"/)[1])
  const sortedDates = dates.sort()
  
  console.log(`\n3. Date range in data:`)
  console.log(`   Earliest: ${sortedDates[0]}`)
  console.log(`   Latest: ${sortedDates[sortedDates.length - 1]}`)
  console.log(`   Total data points: ${dates.length}`)
}

// Check for price data structure
const priceMatches = content.match(/"close": \d+\.\d+/g)
if (priceMatches) {
  console.log(`\n4. Price data found: ${priceMatches.length} close prices`)
}

console.log('\n✅ PriceStore data validation completed!')
