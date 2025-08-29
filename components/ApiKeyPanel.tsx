"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Save, Trash2, Loader2, Wifi, CheckCircle, XCircle } from "lucide-react"
import { getGeminiKey, setGeminiKey, clearGeminiKey, hasGeminiKey } from "@/lib/key-store"
import { generateAnalysis } from "@/lib/gemini-client"

interface ApiKeyPanelProps {
  onSaved?: () => void
}

export function ApiKeyStatus() {
  const isSaved = hasGeminiKey()
  
  if (!isSaved) return null
  
  return (
    <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800 px-5 py-2.5 text-lg font-semibold rounded-sm">
      Key loaded (session)
    </Badge>
  )
}

export function ApiKeyContent({ onSaved }: ApiKeyPanelProps = {}) {
  const [apiKey, setApiKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [isSaved, setIsSaved] = useState(hasGeminiKey())
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSave = () => {
    if (apiKey.trim()) {
      setGeminiKey(apiKey)
      setIsSaved(true)
      setApiKey("")
      onSaved?.()
    }
  }

  const handleClear = () => {
    clearGeminiKey()
    setIsSaved(false)
    onSaved?.()
  }

  const handleKeyChange = (value: string) => {
    setApiKey(value)
  }

  const handleTestConnection = async () => {
    if (!hasGeminiKey()) {
      setTestResult({
        success: false,
        message: "No API key found. Please enter your Gemini API key first."
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const key = getGeminiKey()
      
      if (!key) {
        throw new Error("No API key found")
      }
      
      // Create a minimal snapshot for testing
      const testSnapshot: any = {
        totalValue: 1000,
        totalReturnPercent: 0,
        positions: [{ ticker: "TEST", quantity: 1, marketValue: 1000, weight: 100 }]
      }
      
      await generateAnalysis({
        model: "gemini-2.5-flash",
        key,
        snapshot: testSnapshot
      })

      setTestResult({
        success: true,
        message: "Connection successful! Your Gemini API key is working."
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      setTestResult({
        success: false,
        message: `Connection Failed or Invalid API Key: ${errorMessage}`
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="bg-[var(--bg-card)] border-[var(--border-subtle)] rounded-2xl p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">Gemini API Key Setup</h2>
      
      {isSaved ? (
        <div className="space-y-4">
          <Alert>
            <AlertDescription className="text-base">
              Your API key is stored in session storage and will be cleared when you close the browser.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <Button
              onClick={handleTestConnection}
              disabled={isTesting || !hasGeminiKey()}
              variant="outline"
              className="w-full h-12 text-base font-semibold rounded-md"
              title={!hasGeminiKey() ? "Enter API key to test connection" : "Test Gemini API connectivity"}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="h-5 w-5 mr-2" />
                  Test Gemini Connection
                </>
              )}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription className="text-base">{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>
          
          <Button 
            variant="outline" 
            onClick={handleClear}
            className="w-full h-12 text-base font-semibold rounded-md"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Clear API Key
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="relative">
              <Input
                id="api-key"
                data-testid="api-key-input"
                type={showKey ? "text" : "password"}
                placeholder="Enter Your Key Here..."
                value={apiKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                className="pr-10 h-12 text-lg rounded-md"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="my-6 p-4 bg-muted rounded-lg border">
            <div className="text-base text-[var(--text-primary)] leading-relaxed space-y-2">
              <p><strong>Reminder:</strong></p>
              <p>• Enter your Gemini API key to enable AI analysis. Demo version currently only supports Gemini API.</p>
              <p>• Get a free key at{" "}
                <a 
                  href="https://ai.google.dev/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:no-underline text-blue-600 dark:text-blue-400"
                >
                  Google AI Studio
                </a>
                .
              </p>
              <p>• Your key is stored locally and never sent to our servers.</p>
              <p>• If you do not have API key, click on <span className="underline">Sample Output</span> in the AI Portfolio Analysis section to see what a potential output would look like.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              data-testid="save-api-key-button"
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="w-full h-12 text-base font-semibold rounded-md"
            >
              <Save className="h-5 w-5 mr-2" />
              Save API Key
            </Button>

            <Button
              onClick={handleTestConnection}
              disabled={!hasGeminiKey()}
              variant="outline"
              className="w-full h-12 text-base font-semibold rounded-md"
              title={!hasGeminiKey() ? "Enter API key to test connection" : "Test Gemini API connectivity"}
            >
              <Wifi className="h-5 w-5 mr-2" />
              Test Gemini Connection
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Keep the original function for backward compatibility
export function ApiKeyPanel({ onSaved }: ApiKeyPanelProps) {
  return <ApiKeyContent onSaved={onSaved} />
}
