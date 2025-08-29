const fs = require('fs');
const path = require('path');

/**
 * Import MAG7 Price History from Text Files
 * 
 * Place your 7 text files in the data/price-history/ directory with names like:
 * - AAPL.txt
 * - MSFT.txt
 * - GOOGL.txt
 * - AMZN.txt
 * - TSLA.txt
 * - NVDA.txt
 * - META.txt
 */

const PRICE_HISTORY_DIR = path.join(__dirname, '../data/price-history/mag7 price');
const OUTPUT_FILE = path.join(__dirname, '../data/stock-price-history.ts');

// Expected text file format:
// TICKER,PER,DATE,TIME,OPEN,HIGH,LOW,CLOSE,VOL,OPENINT
// AAPL,D,20240102,0000,185.64,186.87,184.47,185.85,52464100,0
// AAPL,D,20240103,0000,186.12,187.05,185.23,186.19,48412300,0

function parsePriceHistoryFile(filePath, symbol) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    
    // Skip header line if it exists (handle both formats: TICKER and <TICKER>)
    const dataLines = lines[0].includes('TICKER') || lines[0].includes('<TICKER>') ? lines.slice(1) : lines;
    
    const priceHistory = dataLines.map(line => {
      const [ticker, per, date, time, open, high, low, close, vol, openint] = line.split(',').map(s => s.trim());
      
      // Convert date from YYYYMMDD to YYYY-MM-DD format
      const formattedDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`;
      const year = parseInt(date.substring(0, 4));
      
      // Extract base ticker (remove .US suffix) and filter conditions
      const baseTicker = ticker.replace('.US', '');
      if (baseTicker !== symbol || per !== 'D' || year < 2018) {
        return null;
      }
      
      return {
        date: formattedDate,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseInt(vol),
        adjustedClose: parseFloat(close) // Use close price as adjusted close
      };
    }).filter(point => 
      point !== null && !isNaN(point.adjustedClose)
    ); // Filter out invalid data
    
    return priceHistory;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return [];
  }
}

function generateStockPriceHistory() {
  const stocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  const stockData = {};
  
  stocks.forEach(symbol => {
    // Handle special case for NVDA (nvda.us.txt)
    let fileName = `${symbol}.txt`;
    if (symbol === 'NVDA') {
      fileName = 'nvda.us.txt';
    }
    
    const filePath = path.join(PRICE_HISTORY_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      console.log(`Processing ${symbol}...`);
      const priceHistory = parsePriceHistoryFile(filePath, symbol);
      
      if (priceHistory.length > 0) {
        stockData[symbol] = {
          symbol,
          name: getStockName(symbol),
          sector: getStockSector(symbol),
          industry: getStockIndustry(symbol),
          lastUpdated: priceHistory[priceHistory.length - 1]?.date || '2024-12-31',
          priceHistory
        };
        console.log(`  ✓ Loaded ${priceHistory.length} data points`);
      } else {
        console.log(`  ✗ No valid data found for ${symbol}`);
      }
    } else {
      console.log(`  ✗ File not found: ${filePath}`);
    }
  });
  
  return stockData;
}

function getStockName(symbol) {
  const names = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms Inc.'
  };
  return names[symbol] || symbol;
}

function getStockSector(symbol) {
  const sectors = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Consumer Cyclical',
    'TSLA': 'Consumer Cyclical',
    'NVDA': 'Technology',
    'META': 'Technology'
  };
  return sectors[symbol] || 'Unknown';
}

function getStockIndustry(symbol) {
  const industries = {
    'AAPL': 'Consumer Electronics',
    'MSFT': 'Software',
    'GOOGL': 'Internet Content & Information',
    'AMZN': 'Internet Retail',
    'TSLA': 'Auto Manufacturers',
    'NVDA': 'Semiconductors',
    'META': 'Internet Content & Information'
  };
  return industries[symbol] || 'Unknown';
}

function generateTypeScriptFile(stockData) {
  const template = `/**
 * Stock Price History Data
 * 
 * This file contains comprehensive historical daily price data for major stocks.
 * Used for portfolio calculations, charting, and historical analysis.
 * 
 * Generated from text files on ${new Date().toISOString()}
 */

export interface PriceHistoryPoint {
  date: string // ISO YYYY-MM-DD format
  open: number
  high: number
  low: number
  close: number
  volume: number
  adjustedClose: number
}

export interface StockPriceHistory {
  symbol: string
  name: string
  sector: string
  industry: string
  priceHistory: PriceHistoryPoint[]
  lastUpdated: string
}

// MAG7 Stocks Price History
export const STOCK_PRICE_HISTORY: Record<string, StockPriceHistory> = ${JSON.stringify(stockData, null, 2).replace(/"([^"]+)":/g, '$1:')};

/**
 * Get price history for a specific stock
 */
export function getStockPriceHistory(symbol: string): StockPriceHistory | null {
  return STOCK_PRICE_HISTORY[symbol.toUpperCase()] || null
}

/**
 * Get price for a specific stock on a specific date
 */
export function getStockPriceOnDate(symbol: string, date: string): number | null {
  const history = getStockPriceHistory(symbol)
  if (!history) return null
  
  const pricePoint = history.priceHistory.find(point => point.date === date)
  return pricePoint ? pricePoint.adjustedClose : null
}

/**
 * Get latest price for a specific stock
 */
export function getLatestStockPrice(symbol: string): number | null {
  const history = getStockPriceHistory(symbol)
  if (!history || history.priceHistory.length === 0) return null
  
  return history.priceHistory[history.priceHistory.length - 1].adjustedClose
}

/**
 * Get price range for a stock over a date range
 */
export function getStockPriceRange(symbol: string, startDate: string, endDate: string): PriceHistoryPoint[] {
  const history = getStockPriceHistory(symbol)
  if (!history) return []
  
  return history.priceHistory.filter(point => 
    point.date >= startDate && point.date <= endDate
  )
}

/**
 * Get all available stock symbols
 */
export function getAvailableStockSymbols(): string[] {
  return Object.keys(STOCK_PRICE_HISTORY)
}
`;

  return template;
}

function main() {
  console.log('Importing MAG7 Price History...\n');
  
  // Check if directory exists
  if (!fs.existsSync(PRICE_HISTORY_DIR)) {
    console.error(`Directory not found: ${PRICE_HISTORY_DIR}`);
    console.log('Please create the directory and place your text files there.');
    return;
  }
  
  // Generate stock data
  const stockData = generateStockPriceHistory();
  
  if (Object.keys(stockData).length === 0) {
    console.log('\nNo valid data found. Please check your text files.');
    return;
  }
  
  // Generate TypeScript file
  const tsContent = generateTypeScriptFile(stockData);
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, tsContent);
  
  console.log(`\n✓ Successfully generated: ${OUTPUT_FILE}`);
  console.log(`✓ Imported ${Object.keys(stockData).length} stocks`);
  
  // Show summary
  Object.entries(stockData).forEach(([symbol, data]) => {
    console.log(`  ${symbol}: ${data.priceHistory.length} data points (${data.priceHistory[0]?.date} to ${data.priceHistory[data.priceHistory.length - 1]?.date})`);
  });
}

if (require.main === module) {
  main();
}

module.exports = { parsePriceHistoryFile, generateStockPriceHistory };
