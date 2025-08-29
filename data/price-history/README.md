# MAG7 Price History Import

This directory is for importing your MAG7 stock price history text files.

## 📁 File Structure

Place your 7 text files in this directory with the following names:
```
data/price-history/
├── AAPL.txt
├── MSFT.txt
├── GOOGL.txt
├── AMZN.txt
├── TSLA.txt
├── NVDA.txt
└── META.txt
```

## 📄 Expected Text File Format

Your text files should be in CSV format with the following columns:

```csv
TICKER,PER,DATE,TIME,OPEN,HIGH,LOW,CLOSE,VOL,OPENINT
AAPL,D,20240102,0000,185.64,186.87,184.47,185.85,52464100,0
AAPL,D,20240103,0000,186.12,187.05,185.23,186.19,48412300,0
AAPL,D,20240104,0000,185.59,186.49,184.82,185.14,51234500,0
...
```

### Column Descriptions:
- **TICKER**: Stock symbol (e.g., AAPL, MSFT)
- **PER**: Period (D = Daily)
- **DATE**: Date in YYYYMMDD format
- **TIME**: Time (usually 0000 for daily data)
- **OPEN**: Opening price
- **HIGH**: Highest price of the day
- **LOW**: Lowest price of the day
- **CLOSE**: Closing price
- **VOL**: Trading volume
- **OPENINT**: Open interest (usually 0 for stocks)

### Data Filtering:
The import script will automatically filter for:
- Daily data only (PER = 'D')
- Data from 2018 onwards
- Valid price data (non-NaN values)

## 🚀 Import Process

1. **Place your text files** in this directory
2. **Run the import script**:
   ```bash
   node scripts/import-price-history.js
   ```
3. **Check the output** in `data/stock-price-history.ts`

## 🔧 Customizing the Import

If your text files have a different format, you can modify the `parsePriceHistoryFile` function in `scripts/import-price-history.js`.

### Common Format Variations:

#### Tab-separated values:
```javascript
const [date, open, high, low, close, volume, adjClose] = line.split('\t').map(s => s.trim());
```

#### Different column order:
```javascript
// If your format is: Date,Close,Volume,Open,High,Low,Adj Close
const [date, close, volume, open, high, low, adjClose] = line.split(',').map(s => s.trim());
```

#### Different date format:
```javascript
// If dates are in MM/DD/YYYY format
const [month, day, year] = date.split('/');
const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
```

## 📊 Data Usage

Once imported, the data will be available in your application:

```typescript
import { getStockPriceHistory, getStockPriceOnDate } from '@/data/stock-price-history'

// Get Apple's price on Jan 1, 2024
const applePrice = getStockPriceOnDate('AAPL', '2024-01-01')

// Get full price history for Microsoft
const msftHistory = getStockPriceHistory('MSFT')
```

## ✅ Verification

After running the import script, you should see output like:
```
Importing MAG7 Price History...

Processing AAPL...
  ✓ Loaded 1258 data points
Processing MSFT...
  ✓ Loaded 1258 data points
...

✓ Successfully generated: data/stock-price-history.ts
✓ Imported 7 stocks
  AAPL: 1258 data points (2019-01-02 to 2024-12-31)
  MSFT: 1258 data points (2019-01-02 to 2024-12-31)
  ...
```
