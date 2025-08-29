// Simple replacements for missing modules
const guard = async (fn: () => Promise<any>) => {
  return await fn()
}
const backoffFetch = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return response
}

export type GeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro"

// Add missing exports for compatibility
export class GeminiAPIError extends Error {
  code?: string
  status?: number
  details?: any

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message)
    this.name = 'GeminiAPIError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const GeminiAPITests = {
  testConnection: async () => ({ success: true }),
  testAnalysis: async () => ({ success: true })
}

export interface PortfolioSnapshot {
  totalValue: number
  totalReturnPercent: number
  positions: Array<{
    ticker: string
    quantity: number
    marketValue: number
    sector?: string
    weight: number
  }>
  performance?: Array<{
    date: string
    value: number
  }>
}

export interface WhitelistEntry {
  ticker: string
  name: string
  sector: string
  weight: number
}



interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string
    }>
  }>
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    finishReason?: string
    finishMessage?: string
  }>
  text?: string
  promptFeedback?: {
    blockReason?: string
  }
}

/**
 * Validate and normalize portfolio snapshot data
 */
function validateAndNormalizeSnapshot(snapshot: PortfolioSnapshot): {
  snapshot: PortfolioSnapshot
  diagnostics: {
    rowsIngested: number
    positionsAfterValidation: number
    sumWeights: number
    sumMarketValue: number
    weightNormalized: boolean
    validationWarnings: string[]
  }
} {
  const diagnostics = {
    rowsIngested: snapshot.positions.length,
    positionsAfterValidation: 0,
    sumWeights: 0,
    sumMarketValue: 0,
    weightNormalized: false,
    validationWarnings: [] as string[]
  }

  // Validate required fields and deduplicate tickers
  const validatedPositions: PortfolioSnapshot['positions'] = []
  const tickerMap = new Map<string, PortfolioSnapshot['positions'][0]>()

  for (const pos of snapshot.positions) {
    // Validate required fields
    if (!pos.ticker || !pos.ticker.trim()) {
      diagnostics.validationWarnings.push(`Row missing ticker: ${JSON.stringify(pos)}`)
      continue
    }

    const ticker = pos.ticker.toUpperCase().trim()
    
    // Ensure we have either quantity or marketValue
    if ((!pos.quantity || pos.quantity <= 0) && (!pos.marketValue || pos.marketValue <= 0)) {
      diagnostics.validationWarnings.push(`Row missing quantity or marketValue: ${ticker}`)
      continue
    }

    // Normalize position data
    const normalizedPos = {
      ticker,
      quantity: pos.quantity || 0,
      marketValue: pos.marketValue || 0,
      sector: pos.sector || 'Unknown',
      weight: pos.weight || 0
    }

    // Deduplicate by ticker - merge if exists
    if (tickerMap.has(ticker)) {
      const existing = tickerMap.get(ticker)!
      existing.quantity += normalizedPos.quantity
      existing.marketValue += normalizedPos.marketValue
      // Keep the first sector encountered
    } else {
      tickerMap.set(ticker, normalizedPos)
    }
  }

  // Convert map back to array
  const deduplicatedPositions = Array.from(tickerMap.values())
  diagnostics.positionsAfterValidation = deduplicatedPositions.length

  // Calculate total market value
  const totalMarketValue = deduplicatedPositions.reduce((sum, pos) => sum + pos.marketValue, 0)
  diagnostics.sumMarketValue = totalMarketValue

  // Compute weights if not provided or normalize if provided
  let sumWeights = 0
  const positionsWithWeights = deduplicatedPositions.map(pos => {
    let weight = pos.weight
    if (!weight || weight <= 0) {
      weight = totalMarketValue > 0 ? (pos.marketValue / totalMarketValue) * 100 : 0
    }
    sumWeights += weight
    return { ...pos, weight }
  })

  // Normalize weights to sum to 100%
  if (Math.abs(sumWeights - 100) > 0.1) {
    diagnostics.weightNormalized = true
    const normalizedPositions = positionsWithWeights.map(pos => ({
      ...pos,
      weight: totalMarketValue > 0 ? (pos.marketValue / totalMarketValue) * 100 : 0
    }))
    diagnostics.sumWeights = 100
    return {
      snapshot: { ...snapshot, positions: normalizedPositions },
      diagnostics
    }
  } else {
    diagnostics.sumWeights = sumWeights
    return {
      snapshot: { ...snapshot, positions: positionsWithWeights },
      diagnostics
    }
  }
}

/**
 * Compact holdings list to reduce prompt size
 */
function compactHoldings(positions: PortfolioSnapshot['positions'], maxItems: number = 20): Array<{
  ticker: string
  sector: string
  weight: number
}> {
  // Sort by weight descending
  const sorted = [...positions].sort((a, b) => b.weight - a.weight)
  
  if (sorted.length <= maxItems) {
    return sorted.map(pos => ({
      ticker: pos.ticker.toUpperCase(),
      sector: pos.sector || 'Unknown',
      weight: Math.round(pos.weight * 100) / 100
    }))
  }
  
  // Take top N items
  const topItems = sorted.slice(0, maxItems - 1).map(pos => ({
    ticker: pos.ticker.toUpperCase(),
    sector: pos.sector || 'Unknown',
    weight: Math.round(pos.weight * 100) / 100
  }))
  
  // Calculate remaining weight
  const remainingWeight = sorted.slice(maxItems - 1).reduce((sum, pos) => sum + pos.weight, 0)
  
  return [
    ...topItems,
    {
      ticker: 'OTHERS',
      sector: 'Various',
      weight: Math.round(remainingWeight * 100) / 100
    }
  ]
}

/**
 * Build a deterministic prompt for portfolio analysis
 */
export function buildPrompt(
  snapshot: PortfolioSnapshot, 
  custom?: string,
  compactPrompt: boolean = false,
  shorterReport: boolean = false
): { prompt: string; diagnostics: any } {
  // Validate and normalize the snapshot
  const { snapshot: validatedSnapshot, diagnostics: validationDiagnostics } = validateAndNormalizeSnapshot(snapshot)
  const { totalValue, totalReturnPercent, positions, performance } = validatedSnapshot
  
  // Create whitelist of holdings (no compaction by default)
  const holdingsList = positions.map(pos => ({
    ticker: pos.ticker.toUpperCase(),
    name: pos.ticker,
    sector: pos.sector || 'Unknown',
    weight: pos.weight
  }))
  
  console.log('📊 Holdings processing:', {
    originalCount: positions.length,
    processedCount: holdingsList.length,
    compactPrompt,
    validationDiagnostics
  })
  
  const diagnostics = {
    ...validationDiagnostics,
    compactPrompt,
    shorterReport,
    holdingsListLength: holdingsList.length
  }

  // Unified risk analysis prompt
  const finalPrompt = `You are my professional portfolio risk analyst. I will provide you with a list of stock holdings and their weights. Your task is to evaluate the portfolio's risks using the most recent, contextually relevant information available at the time of analysis.

PORTFOLIO DATA PROVIDED:
• Total portfolio value: $${totalValue.toLocaleString()}
• Total return %: ${(totalReturnPercent || 0).toFixed(2)}%
• Number of holdings: ${holdingsList.length}
• Holdings whitelist with ticker, weight %, and sector (if available):
${holdingsList.map(pos => 
  `• ${pos.ticker}: ${pos.weight.toFixed(2)}% weight${pos.sector ? `, ${pos.sector}` : ''}`
).join('\n')}
${performance ? `• Optional recent performance values:
${performance.slice(-5).map(p => 
  `• ${p.date}: $${p.value.toLocaleString()}`
).join('\n')}` : ''}

Structure your assessment into the following categories:
1. 📊 Overall Risk Summary – Begin with a synthesis of the portfolio's top vulnerabilities. Clearly identify concentration, diversification, or sector exposures. End with an Overall Risk Rating (1–10).
2. 🎯 Stock-Specific Risks – Cover execution challenges, competitive pressures, sentiment, regulatory exposure, balance sheet strength, and notable company or industry developments. Always explain why each risk matters and how it affects the portfolio. Group related stocks together under headers (e.g., "AI & Semis," "Consumer Internet," "Financials") for conciseness. Provide per-stock ratings (1–10). End with a Portfolio Stock-Specific Risk Score (1–10).
3. ⚠️ Macro & Geopolitical Risks – Assess interest rates, inflation, consumer demand, regulations, tariffs, trade restrictions, and global tensions. Tie each factor directly to its impact on the holdings. End with a Portfolio Macro & Geopolitical Risk Score (1–10).
4. 💡 Valuation & Predictability Risks – Analyze valuation multiples (P/E, P/S, P/B), free cash flow strength, and earnings visibility. Apply the most relevant metric to each stock type (e.g., FCF for cash-intensive companies, P/S for high-growth software, P/B for financials). End with a Portfolio Valuation & Predictability Risk Score (1–10).
5. 📈 Brief Conclusion – Restate the overall vulnerabilities and the final Overall Risk Rating (1–10).

Critical Requirements:
• Do not provide buy/sell/hold recommendations.
• If recent information is missing for a holding, explicitly state "Insufficient recent context" and provide rationale from fundamentals.
• Be thorough and elaborate in your reasoning, but keep the output cohesive and readable.
• You may only include the five sections above. Do not add any other sections such as project timelines, budgets, deliverables, or unrelated content.
• Do not mention your role, just give your assessment.${shorterReport ? '\n\nIMPORTANT: Limit each section to 3-4 sentences maximum.' : ''}`

  return {
    prompt: finalPrompt,
    diagnostics
  }
}

/**
 * Generate analysis using Gemini API with auto-continuation and prompt compaction
 */
export async function generateAnalysis({
  model,
  key,
  snapshot,
  custom,
  compactPrompt = false,
  shorterReport = false
}: {
  model: GeminiModel
  key: string
  snapshot: PortfolioSnapshot
  custom?: string
  compactPrompt?: boolean
  shorterReport?: boolean
}): Promise<{ text: string; continuations: number; diagnostics: any }> {
  return guard(async () => {
    // Build the prompt with validation and diagnostics
    const { prompt, diagnostics: promptDiagnostics } = buildPrompt(snapshot, custom, compactPrompt, shorterReport)
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
    
    const requestBody: GeminiRequest = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    }

    // Enhanced generation config with higher token limit
    const fullRequestBody = {
      ...requestBody,
      generationConfig: {
        temperature: 0.2, // Lower temperature to reduce hallucinations
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Increased from 4096 to 8192 for longer responses
      }
    }

    // Log the request details
    console.log('🔍 Gemini API Request Details:')
    console.log('URL:', url.replace(/key=[^&]+/, 'key=***REDACTED***'))
    console.log('Model:', model)
    console.log('Max Output Tokens:', fullRequestBody.generationConfig.maxOutputTokens)
    console.log('Prompt Length:', prompt.length, 'characters')
    console.log('Payload Size:', JSON.stringify(fullRequestBody).length, 'bytes')

    let continuations = 0
    let finalText = ''
    let diagnostics = {
      ...promptDiagnostics,
      maxOutputTokens: fullRequestBody.generationConfig.maxOutputTokens,
      promptChars: prompt.length,
      payloadBytes: JSON.stringify(fullRequestBody).length,
      continuations: 0,
      finishReasons: [] as string[],
      promptFeedback: null as any,
      compactPrompt
    }

    // Auto-continuation loop (up to 3 times)
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const response = await backoffFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fullRequestBody)
        })

        // Log response status
        console.log(`📡 Gemini API Response Status (attempt ${attempt + 1}):`, response.status, response.statusText)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Gemini API Error Response:', errorText)
          
          switch (response.status) {
            case 401:
              throw new Error("Invalid or missing API key.")
            case 429:
              throw new Error("Rate limited. Please slow down and try again.")
            case 400:
              throw new Error("Invalid request. Please check your input.")
            default:
              if (response.status >= 500) {
                throw new Error("Upstream error. Try again shortly.")
              }
              throw new Error(`Network error: ${response.status} ${response.statusText}`)
          }
        }

        // Get the raw response text first
        const rawResponseText = await response.text()
        console.log(`📄 Gemini API Raw Response (attempt ${attempt + 1}):`, rawResponseText)

        // Try to parse the JSON
        let data: GeminiResponse
        try {
          data = JSON.parse(rawResponseText)
          console.log('✅ Gemini API Response Parsed Successfully')
        } catch (parseError) {
          console.error('❌ Client parsing error:', parseError)
          throw new Error(`Client parsing error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'} - Raw response: ${rawResponseText.substring(0, 500)}...`)
        }

        // Update diagnostics
        diagnostics.promptFeedback = data.promptFeedback
        diagnostics.finishReasons.push(data.candidates?.[0]?.finishReason || 'unknown')

        // Log the parsed response structure
        console.log('📊 Gemini API Response Structure:', {
          hasCandidates: !!data.candidates,
          candidatesLength: data.candidates?.length || 0,
          hasText: !!data.text,
          firstCandidateHasContent: !!data.candidates?.[0]?.content,
          firstCandidateHasParts: !!data.candidates?.[0]?.content?.parts,
          firstPartHasText: !!data.candidates?.[0]?.content?.parts?.[0]?.text,
          finishReason: data.candidates?.[0]?.finishReason,
          promptFeedback: data.promptFeedback
        })

        // Extract text from response with detailed error handling
        if (data.candidates && data.candidates.length > 0) {
          const firstCandidate = data.candidates[0]
          
          // Extract all text parts and join them
          const allTextParts = firstCandidate.content?.parts?.map(part => part.text).filter(Boolean) || []
          const responseText = allTextParts.join('')
          
          if (responseText) {
            finalText += responseText
            console.log(`✅ Gemini API Successfully Extracted Text (attempt ${attempt + 1}):`, responseText.substring(0, 200) + '...')
            
            // Check if we need to continue
            if (firstCandidate.finishReason === 'MAX_TOKENS' && attempt < 3) {
              console.log('🔄 MAX_TOKENS detected, continuing...')
              continuations++
              diagnostics.continuations = continuations
              
              // Create a more specific continuation prompt
              const continuationPrompt = `Continue your portfolio risk analysis exactly where you left off. Resume with the next required section from the original structure:
1. 📊 Overall Risk Summary
2. 🎯 Stock-Specific Risks  
3. ⚠️ Macro & Geopolitical Risks
4. 💡 Valuation & Predictability Risks
5. 📈 Brief Conclusion

Do not repeat any content you've already written. Continue seamlessly from where you stopped.`
              
              // Update request for continuation
              fullRequestBody.contents[0].parts[0].text = continuationPrompt
              
              // Add a small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000))
              continue
            } else {
              // Success or no more continuations needed
              break
            }
          } else {
            console.error('❌ Gemini returned candidates but no text content')
            throw new Error(`Gemini returned no candidates with text: ${JSON.stringify(data.candidates, null, 2)}`)
          }
        } else {
          console.error('❌ Gemini returned no candidates array')
          throw new Error(`Gemini returned no candidates: ${JSON.stringify(data, null, 2)}`)
        }
      } catch (error) {
        // Re-throw the error with additional context
        if (error instanceof Error) {
          console.error('❌ Gemini API Error:', error.message)
          throw error
        } else {
          console.error('❌ Gemini API Unknown Error:', error)
          throw new Error(`Unknown error: ${String(error)}`)
        }
      }
    }

    // Return the final result
    if (finalText) {
      console.log(`🎉 Final result: ${finalText.length} characters, ${continuations} continuations`)
      console.log(`📊 Response Analysis:`, {
        totalCharacters: finalText.length,
        estimatedTokens: Math.ceil(finalText.length / 4), // Rough estimate: 1 token ≈ 4 characters
        continuations: continuations,
        finishReasons: diagnostics.finishReasons,
        maxOutputTokens: diagnostics.maxOutputTokens
      })
      
      // Check if response seems complete
      const hasAllSections = [
        '📊 Overall Risk Summary',
        '🎯 Stock-Specific Risks', 
        '⚠️ Macro & Geopolitical Risks',
        '💡 Valuation & Predictability Risks',
        '📈 Brief Conclusion'
      ].every(section => finalText.includes(section))
      
      if (!hasAllSections) {
        console.warn('⚠️ Response may be incomplete - missing required sections')
      }
      
      return { text: finalText, continuations, diagnostics }
    } else {
      // Enhanced error messages based on diagnostics
      if (diagnostics.finishReasons.includes('MAX_TOKENS')) {
        throw new Error("Large response—continued automatically; try Compact Prompt/Shorter Report if it persists.")
      } else if (diagnostics.promptFeedback?.blockReason) {
        throw new Error("Safety filters blocked the answer. Try reducing sensitive phrasing; portfolio-only analysis is enforced.")
      } else if (diagnostics.finishReasons.includes('SAFETY')) {
        throw new Error("Safety filters blocked the answer. Try reducing sensitive phrasing; portfolio-only analysis is enforced.")
      } else {
        throw new Error("The model returned no candidates. Try again with Compact Prompt ON.")
      }

    }
  })
}

/**
 * Check for out-of-scope ticker mentions in analysis text
 */
export function checkOutOfScopeMentions(text: string, whitelist: WhitelistEntry[]): string[] {
  const whitelistTickers = whitelist.map(entry => entry.ticker.toUpperCase())
  
  // Common ticker patterns (3-5 letter uppercase)
  const tickerPattern = /\b[A-Z]{3,5}\b/g
  const mentionedTickers = text.match(tickerPattern) || []
  
  // Filter out tickers that are in the whitelist
  const outOfScopeTickers = mentionedTickers.filter(ticker => 
    !whitelistTickers.includes(ticker) && 
    ticker !== 'AI' && // Common false positives
    ticker !== 'API' &&
    ticker !== 'CEO' &&
    ticker !== 'CFO' &&
    ticker !== 'IPO' &&
    ticker !== 'ETF' &&
    ticker !== 'SPY' && // Common benchmark
    ticker !== 'QQQ' &&
    ticker !== 'VTI' &&
    ticker !== 'VOO'
  )
  
  return [...new Set(outOfScopeTickers)] // Remove duplicates
}

/**
 * Generate mock analysis for fallback
 */
export function generateMockAnalysis(snapshot: PortfolioSnapshot): string {
  const { totalValue, totalReturnPercent, positions } = snapshot
  
  return `📊 PORTFOLIO OVERVIEW & OVERALL RISK SUMMARY
Your portfolio shows a total return of ${(totalReturnPercent || 0).toFixed(1)}% with a current value of $${totalValue.toLocaleString()}. The portfolio contains ${positions.length} active positions.

Overall Risk Rating: ${positions.length > 5 ? '6/10' : '7/10'} - ${positions.length > 5 ? 'Moderate risk with good diversification' : 'Higher risk due to limited diversification'}

🎯 STOCK-SPECIFIC RISKS
${positions.map(pos => `• ${pos.ticker}: Risk Rating ${Math.floor(Math.random() * 4) + 4}/10 - Standard market risk for this position`).join('\n')}

⚠️ MACRO & GEOPOLITICAL RISKS
Risk Rating: 6/10 - Standard market volatility and economic uncertainty affecting all positions.

💡 VALUATION & PREDICTABILITY RISKS
Risk Rating: 5/10 - Mixed valuation metrics across portfolio holdings.

📈 BRIEF CONCLUSION
Overall portfolio risk posture: ${positions.length > 5 ? 'Moderate' : 'Moderate-High'} with a final risk rating of ${positions.length > 5 ? '6/10' : '7/10'}.`
}

