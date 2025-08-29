const { GoogleSheetStore } = require('../lib/google-sheet-store.ts')

async function testGoogleSheetStore() {
  console.log('Testing GoogleSheetStore integration...')
  
  try {
    const store = new GoogleSheetStore()
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log(`Data size: ${store.getDataSize()}`)
    console.log(`Last fetch time: ${new Date(store.getLastFetchTime()).toISOString()}`)
    
    // Test getting a specific company
    const aapl = await store.getCompanySnapshot('AAPL')
    if (aapl) {
      console.log('AAPL data:', aapl)
    } else {
      console.log('AAPL not found in Google Sheet')
    }
    
    // Test search
    const searchResults = await store.searchCompanies('AAPL')
    console.log('Search results for AAPL:', searchResults.length)
    
    // Test getting all companies
    const allCompanies = await store.getAllCompanies()
    console.log(`Total companies loaded: ${allCompanies.length}`)
    
    // Test ticker normalization
    const normalized = store.normalizeTicker('AAPL.US')
    console.log('Normalized AAPL.US:', normalized)
    
    console.log('✅ GoogleSheetStore test completed successfully')
    
  } catch (error) {
    console.error('❌ GoogleSheetStore test failed:', error)
  }
}

testGoogleSheetStore()
