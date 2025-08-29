"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Loader2, CheckCircle, XCircle, Copy, Clock, RotateCcw } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
// Simple replacements for missing key-store functions
const getGeminiKey = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gemini-api-key')
  }
  return null
}

const hasGeminiKey = (): boolean => {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('gemini-api-key')
  }
  return false
}
import { 
  generateAnalysis, 
  buildPrompt,
  checkOutOfScopeMentions,
  GeminiAPITests,
  GeminiAPIError,
  type GeminiModel, 
  type PortfolioSnapshot,
  type WhitelistEntry
} from "@/lib/gemini-client"

interface AnalysisResult {
  id: string
  ts: number
  model: string
  text: string
  ok: boolean
  error?: string
  outOfScopeTickers?: string[]
  continuations?: number
  diagnostics?: any
}

interface AiAnalysisPanelProps {
  getPortfolioSnapshot: () => PortfolioSnapshot
}

export function AiAnalysisContent({ getPortfolioSnapshot }: AiAnalysisPanelProps) {
  const searchParams = useSearchParams()
  
  // Dev mode detection
  const isDevMode = () => {
    // Check environment variable
    if (process.env.NEXT_PUBLIC_DEV_MODE === "1") return true
    // Check query parameter
    if (searchParams.get('dev') === "1") return true
    // Check localStorage
    if (typeof window !== 'undefined' && localStorage.getItem('dev-tools') === "on") return true
    return false
  }
  
  // Load user preferences from localStorage
  const [model, setModel] = useState<GeminiModel>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('ai-analysis-model') as GeminiModel) || "gemini-2.5-flash"
    }
    return "gemini-2.5-flash"
  })
  

  
  const [compactPrompt, setCompactPrompt] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-analysis-compact-prompt') !== 'false'
    }
    return true
  })
  
  const [shorterReport, setShorterReport] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai-analysis-shorter-report') === 'true'
    }
    return false
  })
  
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Save preferences to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-analysis-model', model)
    }
  }, [model])



  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-analysis-compact-prompt', compactPrompt.toString())
    }
  }, [compactPrompt])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-analysis-shorter-report', shorterReport.toString())
    }
  }, [shorterReport])

  const handleAnalyze = async () => {
    if (!hasGeminiKey()) {
      setError("Please enter your API key above.")
      return
    }

    const snapshot = getPortfolioSnapshot()
    if (snapshot.positions.length === 0) {
      setError("No portfolio holdings found. Please import portfolio data first.")
      return
    }

    setIsRunning(true)
    setError(null)

    console.log('🚀 Starting AI Analysis:', {
      model,
      hasApiKey: !!getGeminiKey(),
      portfolioSnapshot: {
        totalValue: snapshot.totalValue,
        positionsCount: snapshot.positions.length,
        totalReturnPercent: (snapshot as any).totalReturnPercent || (snapshot as any).totalReturnPct || 0
      }
    })

          try {
        const key = getGeminiKey()
        if (!key) {
          setError("API key not found. Please set your Gemini API key first.")
          setIsRunning(false)
          return
        }
        const { prompt, diagnostics: promptDiagnostics } = buildPrompt(snapshot, undefined, compactPrompt, shorterReport)
        
        console.log('📝 Generated Prompt Length:', prompt.length, 'characters')
        
        const resultId = `analysis-${Date.now()}`
        const startTime = Date.now()

        let analysisText: string
        let continuations: number = 0
        let diagnostics: any = {}
        let isOk = true
        let errorMessage: string | undefined

        try {
          console.log('🔗 Calling Gemini API...')
          const result = await generateAnalysis({
            model,
            key,
            snapshot
          })
          analysisText = result.text
          continuations = result.continuations
          diagnostics = { ...result.diagnostics, ...promptDiagnostics }
          console.log('✅ Gemini API call successful, response length:', analysisText.length, 'continuations:', continuations)
        } catch (err) {
          console.error('❌ Gemini API call failed:', err)
          
          // Handle specific Gemini API errors
          if (err instanceof GeminiAPIError) {
            console.error('🔍 Gemini API Error Details:', {
              code: err.code,
              status: err.status,
              details: err.details
            })
            throw err
          }
          
          // Convert other errors to GeminiAPIError for consistency
          if (err instanceof Error) {
            throw new GeminiAPIError(
              `Analysis failed: ${err.message}`,
              undefined,
              'ANALYSIS_ERROR',
              { originalError: err.message }
            )
          } else {
            throw new GeminiAPIError(
              `Unknown analysis error: ${String(err)}`,
              undefined,
              'UNKNOWN_ERROR',
              { originalError: String(err) }
            )
          }
        }

      // Check for out-of-scope mentions
      const whitelist: WhitelistEntry[] = snapshot.positions.map(pos => ({
        ticker: pos.ticker,
        name: pos.ticker,
        sector: pos.sector || 'Unknown',
        weight: pos.weight
      }))
      const outOfScopeTickers = checkOutOfScopeMentions(analysisText, whitelist)
      
      // Always log out-of-scope tickers to console
      if (outOfScopeTickers.length > 0) {
        console.log('🔍 Out-of-scope tickers detected:', outOfScopeTickers)
      }

      const newResult: AnalysisResult = {
        id: resultId,
        ts: startTime,
        model,
        text: analysisText,
        ok: isOk,
        error: errorMessage,
        outOfScopeTickers: outOfScopeTickers.length > 0 ? outOfScopeTickers : undefined,
        continuations,
        diagnostics
      }

      setResults(prev => [newResult, ...prev])
      
    } catch (err) {
      let errorMsg: string
      
      if (err instanceof GeminiAPIError) {
        // Provide user-friendly messages based on error code
        switch (err.code) {
          case 'AUTH_ERROR':
            errorMsg = "Invalid API key. Please check your Gemini API key and try again."
            break
          case 'RATE_LIMIT':
            errorMsg = "Rate limit exceeded. Please wait a moment and try again."
            break
          case 'SAFETY_BLOCK':
            errorMsg = "Content blocked by safety filters. Try rephrasing your request."
            break
          case 'TOKEN_LIMIT':
            errorMsg = "Response too large. Try enabling 'Compact Prompt' or 'Shorter Report' options."
            break
          case 'NO_CANDIDATES':
          case 'NO_TEXT_PARTS':
          case 'NO_TEXT':
            errorMsg = "No response generated. Please try again with different settings."
            break
          case 'SERVER_ERROR':
            errorMsg = "Gemini API server error. Please try again shortly."
            break
          case 'PARSE_ERROR':
            errorMsg = "Failed to parse API response. Please try again."
            break
          default:
            errorMsg = err.message || "An unexpected error occurred. Please try again."
        }
        
        console.error('🔍 Gemini API Error:', {
          code: err.code,
          status: err.status,
          message: err.message,
          details: err.details
        })
      } else {
        errorMsg = err instanceof Error ? err.message : "Unknown error occurred"
      }
      
      setError(errorMsg)
    } finally {
      setIsRunning(false)
    }
  }

  const copyToClipboard = async (text: string, resultId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(resultId)
      setTimeout(() => setCopiedId(null), 2000) // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }

  const handleReset = () => {
    // Clear component state
    setResults([])
    setError(null)
    setShowDiagnostics(false)
    setIsRunning(false)
  }

  const handleFullReset = () => {
    if (confirm("Reset AI setup? This clears your API key, imported portfolio, and analysis preferences.")) {
      // Clear localStorage
      localStorage.removeItem('GEMINI_API_KEY')
      localStorage.removeItem('ai-analysis-model')
      localStorage.removeItem('ai-analysis-type')
      localStorage.removeItem('ai-analysis-compact-prompt')
      localStorage.removeItem('ai-analysis-shorter-report')
      
      // Clear sessionStorage
      sessionStorage.removeItem('GEMINI_API_KEY')
      sessionStorage.removeItem('portfolio_csv')
      sessionStorage.removeItem('portfolio_snapshot')
      
      // Clear component state
      setResults([])
      setError(null)
      setShowDiagnostics(false)
      
      // Reset to defaults
      setModel("gemini-2.5-flash")
      setCompactPrompt(true)
      setShorterReport(false)
      
      // Reload page to clear all stores
      window.location.reload()
    }
  }

  const handleSampleOutput = async () => {
    setIsRunning(true)
    setError(null)

    // Create a sample portfolio snapshot for demonstration
    const sampleSnapshot: PortfolioSnapshot = {
      totalValue: 125000,
      totalReturnPercent: 15.5,
      positions: [
        { ticker: "AAPL", quantity: 50, marketValue: 8500, weight: 6.8 },
        { ticker: "MSFT", quantity: 30, marketValue: 12000, weight: 9.6 },
        { ticker: "NVDA", quantity: 20, marketValue: 18000, weight: 14.4 },
        { ticker: "AMZN", quantity: 40, marketValue: 6000, weight: 4.8 },
        { ticker: "META", quantity: 25, marketValue: 8000, weight: 6.4 },
        { ticker: "TSLA", quantity: 15, marketValue: 3000, weight: 2.4 },
        { ticker: "GOOGL", quantity: 35, marketValue: 5000, weight: 4.0 }
      ]
    }

    console.log('🎭 Generating Sample Analysis Output...')

    try {
      const resultId = `sample-${Date.now()}`
      const startTime = Date.now()

      // Generate sample analysis text
      const sampleAnalysisText = `Here is an assessment of your portfolio's risks:

📊 Overall Risk Summary

This portfolio exhibits an extremely high level of concentration, with only two holdings comprising 100% of the total value. The primary vulnerability stems from this lack of diversification, as both Apple (AAPL) and Tesla (TSLA) are large-cap technology and consumer-oriented companies, making the portfolio highly susceptible to sector-specific downturns, consumer spending fluctuations, and company-specific operational challenges. While both companies are market leaders, their individual risks are amplified by their outsized weights. Tesla, in particular, introduces significant volatility due to its growth-stock characteristics, competitive landscape, and reliance on future technological advancements. The portfolio lacks exposure to other sectors such as healthcare, financials, industrials, or utilities, which could offer different risk/reward profiles and potentially lower overall volatility.

Overall Risk Rating: 9/10

🎯 Stock-Specific Risks

Technology & Consumer Discretionary

    AAPL (63.90% weight)
        Execution Challenges: While Apple has a strong track record, maintaining its innovation pace and successfully launching new product categories (e.g., Vision Pro) is crucial. Dependence on the iPhone for a significant portion of revenue means any slowdown in upgrade cycles or competitive pressure could impact performance. Supply chain resilience, particularly given its heavy reliance on manufacturing in China, remains a persistent concern.
        Competitive Pressures: Apple faces intense competition across all its segments, from smartphones and tablets to services (streaming, app stores) and emerging technologies. Competitors are constantly innovating, and regulatory scrutiny over its App Store practices could force changes that impact its services revenue.
        Sentiment: Despite its strong brand loyalty, market sentiment can shift if growth decelerates or if new product initiatives fail to meet high expectations. Its premium valuation often prices in continued strong performance.
        Regulatory Exposure: Apple is under increasing antitrust scrutiny globally regarding its App Store policies, search engine deals, and other business practices. Potential adverse rulings or new regulations could impact its profitability and business model.
        Balance Sheet Strength: Apple possesses an exceptionally strong balance sheet with substantial cash flow, providing a buffer against economic downturns and funding for R&D and shareholder returns. This mitigates some financial risk but does not eliminate market or operational risks.
        Why it matters: As the largest holding, Apple's performance dictates the majority of the portfolio's returns. Any significant challenge to its market position, growth trajectory, or regulatory environment would have a profound impact.
        Stock-Specific Rating: 6/10

    TSLA (36.10% weight)
        Execution Challenges: Tesla faces ongoing challenges in scaling production efficiently, maintaining quality control, and delivering on ambitious technological promises like full self-driving (FSD). The successful rollout of new vehicles (e.g., Cybertruck) and expansion of its energy business are critical for future growth.
        Competitive Pressures: The electric vehicle (EV) market is rapidly becoming more crowded and competitive. Traditional automakers are investing heavily in EVs, and new entrants are emerging, leading to price wars and potential margin compression. Tesla's market share is under increasing pressure globally.
        Sentiment: Tesla's stock is highly volatile and heavily influenced by market sentiment, often reacting strongly to news, CEO statements, and quarterly delivery figures. Its valuation often reflects significant future growth expectations, making it susceptible to sharp corrections if those expectations are not met.
        Regulatory Exposure: Tesla faces regulatory scrutiny regarding the safety of its Autopilot and FSD systems, environmental compliance, and labor practices. Changes in EV subsidies or emissions standards in key markets could also impact demand and profitability.
        Balance Sheet Strength: Tesla generally maintains a healthy balance sheet, but its business is capital-intensive, requiring significant investment in manufacturing facilities and R&D. While cash flow has improved, sustained profitability is crucial amidst increasing competition.
        Why it matters: Tesla's high volatility and significant weight mean its price swings will have a disproportionate effect on the portfolio. Its future performance is tied to its ability to innovate, scale, and fend off intense competition in a rapidly evolving industry.
        Stock-Specific Rating: 8/10

Portfolio Stock-Specific Risk Score: 8/10

⚠️ Macro & Geopolitical Risks

    Interest Rates: Higher interest rates increase the cost of borrowing for consumers (impacting car loans, consumer electronics purchases) and for companies (affecting capital expenditures and debt servicing). Both Apple and Tesla, being consumer-facing and capital-intensive, are sensitive to these changes, as higher rates can dampen demand and increase operational costs.
    Inflation: Persistent inflation can erode consumer purchasing power, leading to reduced discretionary spending on high-ticket items like iPhones and Teslas. It also increases input costs for manufacturing, potentially squeezing profit margins if companies cannot fully pass these costs onto consumers.
    Consumer Demand: Both companies are highly dependent on robust consumer demand. Economic slowdowns, recessions, or a significant decline in consumer confidence would directly impact sales of their products and services, which are largely discretionary.
    Regulations: Beyond company-specific regulatory risks, broader governmental policies can impact the portfolio. This includes environmental regulations (affecting EV mandates and energy storage), data privacy laws (impacting Apple's services), and general business regulations that could increase compliance costs.
    Tariffs & Trade Restrictions: Both Apple and Tesla have extensive global supply chains and significant international sales. Escalating trade tensions, particularly between the U.S. and China, could lead to increased tariffs, supply chain disruptions, and restricted market access, impacting profitability and growth.
    Global Tensions: Geopolitical instability, such as regional conflicts or heightened international disputes, can disrupt global supply chains, increase commodity prices, and reduce overall economic certainty, negatively affecting both companies' operations and consumer sentiment worldwide.
    Why it matters: The portfolio's concentration in two globally exposed, consumer-dependent companies makes it highly susceptible to these macro and geopolitical headwinds. A significant downturn in global economic conditions or an escalation of trade conflicts could severely impact both holdings simultaneously.

Portfolio Macro & Geopolitical Risk Score: 8/10

💡 Valuation & Predictability Risks

    AAPL (63.90% weight)
        Valuation: Apple typically trades at a premium valuation (e.g., higher P/E multiples) compared to the broader market, justified by its strong brand, ecosystem, consistent profitability, and robust free cash flow generation. The risk lies in whether this premium can be sustained if growth rates decelerate or if new product categories fail to significantly expand its addressable market.
        Free Cash Flow Strength: Apple boasts exceptional free cash flow, which provides financial flexibility for R&D, acquisitions, and substantial shareholder returns (dividends and buybacks). This strength underpins its valuation but also means that any significant decline in FCF generation would be viewed negatively.
        Earnings Visibility: Apple generally has high earnings visibility due to its recurring services revenue, predictable product refresh cycles, and strong customer loyalty. However, the success of new ventures like the Vision Pro introduces an element of uncertainty that could affect future earnings predictability.
        Why it matters: A substantial portion of the portfolio is invested in a company with a premium valuation. If future growth or profitability expectations are not met, or if the market re-rates its growth prospects, there is a risk of valuation compression, even if the underlying business remains strong.

    TSLA (36.10% weight)
        Valuation: Tesla has historically traded at very high valuation multiples (e.g., P/E, P/S) that reflect significant future growth expectations in EVs, battery technology, FSD, and energy solutions. It is often valued more as a technology growth company than a traditional automotive manufacturer. This high valuation implies that a substantial amount of future success is already priced into the stock.
        Free Cash Flow Strength: While Tesla has achieved positive free cash flow, it can be volatile due to the capital-intensive nature of its manufacturing expansion and R&D investments. Sustained and growing free cash flow is crucial to justify its high valuation.
        Earnings Visibility: Tesla's earnings visibility is lower than Apple's due to the rapid evolution of the EV market, intense competition, price wars, and the uncertain timeline and adoption of its FSD technology. Any disappointment in delivery numbers, profit margins, or technological breakthroughs can lead to significant stock price volatility.
        Why it matters: The portfolio has significant exposure to a company with a highly speculative valuation. Any failure to meet aggressive growth targets, a slowdown in EV adoption, or increased competition could lead to a substantial re-evaluation of its stock price, resulting in significant losses for the portfolio.

Portfolio Valuation & Predictability Risk Score: 9/10

📈 Brief Conclusion

This portfolio is characterized by extreme concentration in just two large-cap technology and consumer discretionary stocks, Apple and Tesla. This lack of diversification is the paramount vulnerability, exposing the portfolio to amplified stock-specific risks, sector-specific downturns, and broad macro-economic headwinds. Both companies face significant competitive pressures and regulatory scrutiny, while Tesla adds a layer of high volatility due to its growth-stock characteristics and ambitious future-oriented projects. The premium valuations of both holdings, particularly Tesla, mean that substantial future growth is already priced in, leaving little room for error or disappointment.`

      const result: AnalysisResult = {
        id: resultId,
        ts: startTime,
        model: model,
        text: sampleAnalysisText,
        ok: true,
        continuations: 0,
        diagnostics: {
          responseTimeMs: Date.now() - startTime,
          totalResponseChars: sampleAnalysisText.length
        }
      }

      // Clear previous results and set only the new sample output
      setResults([result])
      console.log('✅ Sample analysis generated successfully')
    } catch (error) {
      console.error('❌ Error generating sample analysis:', error)
      setError('Failed to generate sample analysis')
    } finally {
      setIsRunning(false)
    }
  }

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString()
  }

  const snapshot = getPortfolioSnapshot()
  const hasHoldings = snapshot.positions.length > 0
  const isAnalyzeDisabled = !hasGeminiKey() || isRunning || !hasHoldings

  return (
    <>
      {/* AI Analysis Settings Card */}
      <div className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">AI Analysis Settings</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              disabled={isRunning}
              size="sm"
              variant="outline"
              className="text-sm font-medium"
              title="Reset analysis results"
            >
              Reset
            </Button>
            <Button
              onClick={handleSampleOutput}
              disabled={isRunning}
              size="sm"
              className="text-sm font-medium"
              title="Generate sample analysis output"
            >
              Sample Output
            </Button>
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Model Dropdown */}
            <div className="space-y-3">
              <Label className="text-base font-semibold block mb-2">Model</Label>
              <Select value={model} onValueChange={(value: GeminiModel) => setModel(value)}>
                <SelectTrigger className="h-12 text-base rounded-sm px-4 py-3 bg-background border border-input hover:bg-accent hover:text-accent-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2">
                  <SelectValue className="text-foreground font-medium" />
                </SelectTrigger>
                <SelectContent className="bg-background border border-input rounded-sm shadow-lg" side="bottom" align="start">
                  <SelectItem value="gemini-2.5-flash" className="text-base py-3 px-4 hover:bg-accent focus:bg-accent">Gemini 2.5 Flash (Fast)</SelectItem>
                  <SelectItem value="gemini-2.5-pro" className="text-base py-3 px-4 hover:bg-accent focus:bg-accent">Gemini 2.5 Pro (Advanced)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Analysis Type Dropdown */}

          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Advanced Options (select both options if you have 5+ holdings)</Label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-background border border-input rounded-sm hover:bg-accent hover:text-accent-foreground">
                <input
                  type="checkbox"
                  id="compact-prompt"
                  checked={compactPrompt}
                  onChange={(e) => setCompactPrompt(e.target.checked)}
                  className="rounded border-gray-300 h-5 w-5"
                />
                <Label htmlFor="compact-prompt" className="text-base font-medium cursor-pointer">
                  Compact Prompt 
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-background border border-input rounded-sm hover:bg-accent hover:text-accent-foreground">
                <input
                  type="checkbox"
                  id="shorter-report"
                  checked={shorterReport}
                  onChange={(e) => setShorterReport(e.target.checked)}
                  className="rounded border-gray-300 h-5 w-5"
                />
                <Label htmlFor="shorter-report" className="text-base font-medium cursor-pointer">
                  Shorter Report (3-4 sentences per section)
                </Label>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-5 w-5" />
              <AlertDescription className="text-lg">{error}</AlertDescription>
            </Alert>
          )}

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzeDisabled}
            className={`w-full h-12 text-base font-semibold rounded-md ${
              results.length > 0 && results[0].ok 
                ? 'bg-[#10b981] hover:bg-[#10b981]/90 text-white' 
                : error 
                ? 'bg-[#fc7580] hover:bg-[#fc7580]/90 text-white'
                : 'text-white'
            }`}
            title={isAnalyzeDisabled ? 
              (!hasGeminiKey() ? "Enter API key to enable" : 
               !hasHoldings ? "No portfolio holdings found" : 
               "Analysis in progress...") : 
              "Generate AI analysis"}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : results.length > 0 && results[0].ok ? (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Success!
              </>
            ) : error ? (
              <>
                <XCircle className="h-5 w-5 mr-2" />
                Error! Try Again in a Few Seconds...
              </>
            ) : (
              <>
                <Bot className="h-5 w-5 mr-2" />
                Analyze Portfolio
              </>
            )}
          </Button>
        </div>
      </div>



      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-6">
          {isDevMode() && <h3 className="text-2xl font-semibold">Analysis Results</h3>}
          {results.map((result) => (
            <div key={result.id} className="bg-[var(--bg-card)] border rounded-2xl p-6" style={{ borderColor: result.ok ? '#10b981' : '#a5c75b' }}>
              {/* Dev Mode Header - Only show in dev mode */}
              {isDevMode() && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {result.ok ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <Badge variant="outline">{result.model}</Badge>
                    {result.continuations && result.continuations > 0 && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Continuations: {result.continuations}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-base text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatTimestamp(result.ts)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      className="text-xs"
                    >
                      Debug
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(result.text, result.id)}
                    >
                      {copiedId === result.id ? (
                        <span className="text-xs">Copied!</span>
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFullReset}
                      title="Reset AI setup"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Dev Mode Alerts - Only show in dev mode */}
              {isDevMode() && result.error && (
                <Alert className="mb-3">
                  <AlertDescription className="text-base">
                    {result.error}
                    {result.error.includes("output limit") && (
                      <div className="mt-2 text-sm">
                        💡 Try enabling "Compact Prompt" or "Shorter Report" options above.
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {isDevMode() && result.continuations && result.continuations > 0 && (
                <Alert className="mb-3" variant="default">
                  <AlertDescription className="text-base">
                    📝 Large response—combined {result.continuations + 1} parts for complete analysis.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Check for incomplete responses */}
              {result.text && !result.text.includes('📈 Brief Conclusion') && (
                <Alert className="mb-3" variant="destructive">
                  <AlertDescription className="text-base">
                    ⚠️ Response appears incomplete - missing conclusion section. Try enabling "Compact Prompt" or "Shorter Report" options for more complete analysis.
                  </AlertDescription>
                </Alert>
              )}
              
              {isDevMode() && result.outOfScopeTickers && result.outOfScopeTickers.length > 0 && (
                <Alert className="mb-3" variant="destructive">
                  <AlertDescription className="text-base">
                    ⚠️ Heads up: the analysis referenced symbols not in your portfolio: {result.outOfScopeTickers.join(', ')} (may indicate the model drifted from scope).
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Enhanced Diagnostics Display - Only show in dev mode */}
              {isDevMode() && result.diagnostics && showDiagnostics && (
                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <div className="font-medium mb-2">📊 Diagnostics</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {result.diagnostics.usageMetadata && (
                      <>
                        <div>Tokens — In: {result.diagnostics.usageMetadata.promptTokenCount || 'N/A'}</div>
                        <div>Out: {result.diagnostics.usageMetadata.candidatesTokenCount || 'N/A'}</div>
                        <div>Total: {result.diagnostics.usageMetadata.totalTokenCount || 'N/A'}</div>
                      </>
                    )}
                    {result.diagnostics.finishReasons && result.diagnostics.finishReasons.length > 0 && (
                      <div>Finish: {result.diagnostics.finishReasons[result.diagnostics.finishReasons.length - 1]}</div>
                    )}
                    {result.diagnostics.totalResponseChars && (
                      <div>Chars: {result.diagnostics.totalResponseChars.toLocaleString()}</div>
                    )}
                    {result.diagnostics.responseTimeMs && (
                      <div>Time: {result.diagnostics.responseTimeMs}ms</div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="prose prose-base max-w-none dark:prose-invert leading-relaxed">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({children}) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
                    h2: ({children}) => <h2 className="text-xl font-semibold mb-3">{children}</h2>,
                    h3: ({children}) => <h3 className="text-lg font-medium mb-2">{children}</h3>,
                    p: ({children}) => <p className="mb-3 leading-relaxed">{children}</p>,
                    ul: ({children}) => <ul className="bullet-list mb-3 space-y-1">{children}</ul>,
                    ol: ({children}) => <ol className="numbered-list mb-3 space-y-1">{children}</ol>,
                    li: ({children}) => <li className="ml-4">{children}</li>,
                    strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                    em: ({children}) => <em className="italic">{children}</em>,
                    code: ({children}) => <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">{children}</code>,
                    pre: ({children}) => <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">{children}</pre>
                  }}
                >
                  {result.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// Keep the original function for backward compatibility
export function AiAnalysisPanel({ getPortfolioSnapshot }: AiAnalysisPanelProps) {
  return <AiAnalysisContent getPortfolioSnapshot={getPortfolioSnapshot} />
}
